// Local operator relay. It sends only fixed, run-scoped read-only SQL and writes local snapshots.
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const projectRef = "rashyleshocuvpgcooxy";
const runIdPattern = /^[1-9]\d{7,14}$/;
const watcherPath = fileURLToPath(new URL("./watch_adr005.py", import.meta.url));

async function atomicSnapshot(inbox, name, value) {
  const target = join(inbox, name);
  const temporary = target + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temporary, JSON.stringify(value), { encoding: "utf8", mode: 0o600 });
    const deadline = Date.now() + 2_000;
    while (true) {
      try {
        await rename(temporary, target);
        return;
      } catch (error) {
        if (!["EACCES", "EPERM", "EBUSY"].includes(error.code) || Date.now() >= deadline) throw error;
        await sleep(50);
      }
    }
  } finally {
    await rm(temporary, { force: true });
  }
}

function buildQuery(python, runId) {
  const env = { ...process.env };
  delete env.SUPABASE_ACCESS_TOKEN;
  const result = spawnSync(python, [watcherPath, "--sql", runId], { encoding: "utf8", env, timeout: 5_000 });
  if (result.status !== 0 || !result.stdout.startsWith("WITH fixture AS (")) {
    throw new Error("Could not build the fixed watcher query");
  }
  return result.stdout;
}

async function fetchSnapshot(token, query, signal) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query/read-only`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ query }),
    redirect: "error",
    signal,
  });
  if (!response.ok) throw new Error(`Supabase read-only snapshot failed with HTTP ${response.status}`);
  const rows = await response.json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error("Unexpected snapshot row count");
  return rows[0].snapshot;
}

async function relay({ runId, write, readSnapshot, soak, preflight, watcherDone }) {
  const cadenceMs=500;
  const unusableMs=10000;
  const heartbeatMs=1500;
  const slowMs=1000;
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const warn=(reason,fields={})=>{
    const event={event:"RELAY_WARNING",reason,at:new Date().toISOString(),...fields};
    warnings.push(event);
    console.warn(JSON.stringify(event));
  };
  const summaries=values=>{
    const sorted=[...values].sort((a,b)=>a-b);
    const percentile=p=>sorted[Math.ceil(sorted.length*p)-1]??null;
    return {count:sorted.length,p50:percentile(.5),p95:percentile(.95),max:sorted.at(-1)??null};
  };
  const latency=[],gaps=[],publishLatency=[],warnings=[];
  let attempts=0,queryErrors=0,publishErrors=0,slowReplies=0,missedPolls=0,errors=0;
  let pending=null,writer=null,lastShape=null,lastEnqueue=0,lastStart=0,lastPublish=0,lastResponse=0;
  let previousCapture=null,droppedWrites=0,healthyWrites=0,publishFailed=false;
  let firstCapture=null,lastCapture=null;

  await write("arm.json",{run_id:runId});
  const started=Date.now();
  const end = soak ? started + 615_000 : Infinity;
  lastResponse=lastPublish=started;
  function kickWriter(){
    if(writer||!pending)return;
    writer=(async()=>{
      while(pending){
        const value=pending;
        pending=null;
        const at=Date.now();
        try{
          await write("snapshot.json",value);
          const elapsed=Date.now()-at;
          publishLatency.push(elapsed);
          healthyWrites++;
          publishFailed=false;
          lastPublish=Date.now();
          if(elapsed>3*slowMs)warn("slow_publish",{elapsed_ms:elapsed});
        }catch(error){
          publishErrors++;
          publishFailed=true;
          warn("publish_failed",{detail:String(error)});
        }
      }
    })().finally(()=>{writer=null;});
  }
  function deadlineRemaining(){
    const now=Date.now();
    return Math.min(lastResponse+unusableMs+1,lastPublish+unusableMs+1)-now;
  }
  class RelayTimeout extends Error {}
  function watchdog(promise,ms){
    let timer;
    const timeout=new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new RelayTimeout("Database relay unavailable for more than 10 seconds")),Math.max(1,ms));
    });
    return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
  }
  function accept(value,measurement){
    if(value?.run_id!==runId||!Array.isArray(value.rows)||!Number.isInteger(value.active_jobs)||!Number.isInteger(value.pending_dispatches)||
        typeof value.captured_at!=="string"||!Number.isFinite(Date.parse(value.captured_at)))
      throw new Error("Malformed or wrong-run snapshot response");
    if(previousCapture && Date.parse(value.captured_at)<=Date.parse(previousCapture))
      throw new Error("Database snapshot timestamp did not advance");
    if(!firstCapture)firstCapture=value.captured_at;
    lastCapture=value.captured_at;
    const sample={...value,relay_sample:{...measurement,previous_capture_at:previousCapture}};
    previousCapture=value.captured_at;
    const shape=JSON.stringify([value.active_jobs,value.rows.map(r=>[r.job,r.status,r.backend_call_id,r.delivery_count])]);
    const changed=shape!==lastShape;
    if(changed||publishFailed||Date.now()-lastEnqueue>=heartbeatMs){
      if(pending)droppedWrites++;
      pending=sample;
      lastEnqueue=Date.now();
      lastShape=shape;
      kickWriter();
    }
    if (changed) console.log(JSON.stringify({ event: "RELAY_STATE", captured_at: value.captured_at,
      active_jobs: value.active_jobs, rows: value.rows.map(({ job, status }) => ({ job, status })) }));
    return value;
  }
  function stats(){
    return {attempts,reads:latency.length,cadenceMs,durationMs:Date.now()-started,
      captureSpanMs:firstCapture?Date.parse(lastCapture)-Date.parse(firstCapture):0,
      queryLatencyMs:summaries(latency),pollStartGapMs:summaries(gaps),publishLatencyMs:summaries(publishLatency),
      queryErrors,publishErrors,slowReplies,missedPolls,errors,healthyWrites,droppedWrites,warnings};
  }

  try{
    while(true){
      if(deadlineRemaining()<=0)throw new Error("Database relay unavailable for more than 10 seconds");
      if(lastStart)await pause(Math.max(0,lastStart+cadenceMs-Date.now()));
      const pollStart=Date.now();
      const gap=lastStart?pollStart-lastStart:null;
      lastStart=pollStart;
      attempts++;
      if(gap!==null){
        gaps.push(gap);
        if(gap>2*cadenceMs){missedPolls++;warn("poll_gap",{poll:attempts,gap_ms:gap});}
      }
      let value;
      try{
        const remaining = deadlineRemaining();
        const answer = await watchdog(readSnapshot(AbortSignal.timeout(Math.max(1, remaining))), remaining);
        const elapsed=Date.now()-pollStart;
        value=accept(answer,{sequence:attempts,query_ms:elapsed,gap_ms:gap});
        latency.push(elapsed);
        lastResponse=Date.now();
        if(elapsed>slowMs){slowReplies++;warn("slow_poll",{poll:attempts,elapsed_ms:elapsed});}
      }catch(error){
        queryErrors++;
        warn("poll_failed",{poll:attempts,detail:String(error)});
        if(error instanceof RelayTimeout||deadlineRemaining()<=0)throw error;
        continue;
      }
      if ((soak || preflight) && (value.active_jobs !== 0 || value.pending_dispatches !== 0 || value.rows.length !== 0)) {
        throw new Error("Read-only preflight or soak saw nonempty production work");
      }
      if (await watcherDone() || Date.now() >= end) break;
    }
    if(soak){
      // Flush a final heartbeat even when the regular heartbeat is not due.
      pending={...readLastSnapshot(),relay_sample:{sequence:attempts,query_ms:latency.at(-1),
        gap_ms:gaps.at(-1),previous_capture_at:null}};
      kickWriter();
    }
    while(writer)await writer;
    if(deadlineRemaining()<=0)throw new Error("Database relay unavailable for more than 10 seconds");
    const summary=stats();
    if(soak)await write("observe-done.json",{run_id:runId,capture_span_ms:summary.captureSpanMs});
    return summary;
  }catch(error){
    errors++;
    pending=null;
    if(writer)await writer;
    try{await write("snapshot.json",{error:error.message});}
    catch(writeError){warn("relay_error_notification_failed",{detail:String(writeError)});}
    error.relayStats=stats();
    throw error;
  }

  function readLastSnapshot(){
    return { run_id: runId, active_jobs: 0, pending_dispatches: 0, rows: [], captured_at: lastCapture };
  }
}

async function main() {
  const { values } = parseArgs({ options: {
    inbox: { type: "string" },
    "run-id": { type: "string" },
    "project-ref": { type: "string" },
    python: { type: "string", default: "python" },
    "observe-only": { type: "boolean" },
    preflight: { type: "boolean" },
    "watcher-log": { type: "string" },
  } });
  const { inbox, python, "run-id": runId, "observe-only": soak, preflight, "watcher-log": watcherLog } = values;
  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (values["project-ref"] !== projectRef || !inbox || !runIdPattern.test(runId ?? "") || !token
      || (soak && preflight) || (!soak && !watcherLog)) {
    throw new Error("Supply --project-ref, --inbox, --run-id, SUPABASE_ACCESS_TOKEN and a watcher log for live or preflight. Choose at most one verification mode.");
  }
  if (!(await stat(inbox)).isDirectory()) throw new Error("Use an existing one-use inbox directory");
  for (const file of ["arm.json", "snapshot.json", "observe-done.json"]) {
    try {
      await stat(join(inbox, file));
      throw new Error("Refusing to reuse an armed or populated inbox");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const query = buildQuery(python, runId);
  const done = async () => {
    if (!watcherLog) return false;
    try {
      const log = await readFile(watcherLog, "utf8");
      if (log.includes('"event": "WATCHER_STOP"')) throw new Error("The watcher stopped without completing the requested phase");
      const expected = preflight ? "PREFLIGHT_READY" : "SIGNAL_CONFIRMED";
      return log.includes(`"event": "${expected}"`);
    } catch (error) {
      if (error.code === "ENOENT") return false;
      throw error;
    }
  };
  const result = await relay({
    runId,
    write: (name, snapshot) => atomicSnapshot(inbox, name, snapshot),
    readSnapshot: (signal) => fetchSnapshot(token, query, signal),
    soak,
    preflight,
    watcherDone: done,
  });
  console.log(JSON.stringify({ event: "RELAY_COMPLETE", ...result }));
  if (soak && (result.queryErrors || result.publishErrors)) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
