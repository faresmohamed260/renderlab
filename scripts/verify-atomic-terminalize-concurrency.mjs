#!/usr/bin/env node
/** Two real PostgreSQL sessions racing an owner-scoped terminalization row lock. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";

const { PGHOST:host="127.0.0.1", PGPORT:port="5432",
  PGUSER:user="postgres", PGDATABASE:database="", PGPASSWORD:password } = process.env;
assert.ok(["127.0.0.1","localhost","::1"].includes(host)
  && database==="renderlab_conformance" && user==="postgres" && password
  && /^\d{1,5}$/.test(port),
"Never run SQL concurrency fixtures outside local disposable renderlab_conformance.");
const env={...process.env};
delete env.PGSERVICE;
delete env.PGHOSTADDR;
const opts=["-X","-w","-v","ON_ERROR_STOP=1","-h",host,"-p",port,"-U",user,"-d",database,"-t","-A"];
function sql(query) {
  return execFileSync("psql",[...opts,"-c",query],{env,encoding:"utf8",maxBuffer:4*1024*1024}).trim();
}
function waitFor(session,marker,timeout=5000) {
  if (session.stdout.includes(marker)) return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{session.child.off("close",close);session.listeners.delete(check);reject(new Error("No "+marker+" from psql session; stdout="+session.stdout+" stderr="+session.stderr));},timeout);
    function check() {
      if (!session.stdout.includes(marker)) return;
      clearTimeout(timer);
      session.child.off("close",close);
      session.listeners.delete(check);
      resolve();
    }
    function close() {clearTimeout(timer);session.listeners.delete(check);reject(new Error("psql exited before "+marker+": "+session.stderr));}
    session.listeners.add(check);
    session.child.once("close",close);
    check();
  });
}
function startSession() {
  const child=spawn("psql",opts,{env,stdio:["pipe","pipe","pipe"]});
  const out={child,stdout:"",stderr:"",listeners:new Set()};
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data",chunk=>{out.stdout+=chunk;for(const f of out.listeners)f();});
  child.stderr.on("data",chunk=>{out.stderr+=chunk;});
  out.done=new Promise((resolve,reject)=>child.on("close",code=>
    code===0?resolve(out.stdout):reject(new Error("psql exited "+code+": "+out.stderr))
  ));
  return out;
}
async function awaitLockWait() {
  for(let i=0;i<75;i++){
    const n=Number(sql("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() "+
      "AND wait_event_type='Lock' AND query LIKE '%renderlab_terminalize_generation_and_release%'"));
    if(n>=1)return;
    await new Promise(resolve=>setTimeout(resolve,35));
  }
  throw Error("Competing connection did not block on a PostgreSQL row lock");
}
const signature="public.renderlab_terminalize_generation_and_release";
function invoke(owner,job,from,to,asset=null) {
  return "SELECT 'RACE_OUTCOME:' || outcome FROM "+signature+"("
    +["'"+owner+"'","'"+job+"'","'"+from+"'","'"+to+"'",
       to==="succeeded"?"'"+asset+"'":"NULL",
       to==="failed"?"'generation_failed'":"NULL",
       to==="failed"?"'Sanitized fixture failure.'":"NULL"].join(",") + ")";
}
const auditInit=[
"CREATE TABLE conformance.atomic_release_audit (job_id uuid NOT NULL, released_at timestamptz NOT NULL);",
"CREATE FUNCTION conformance.audit_atomic_release() RETURNS trigger LANGUAGE plpgsql",
"SET search_path='' AS $audit$",
"BEGIN",
"  INSERT INTO conformance.atomic_release_audit(job_id,released_at) VALUES(NEW.job_id,NEW.released_at);",
"  RETURN NEW;",
"END",
"$audit$;",
"CREATE TRIGGER conformance_atomic_release_audit",
"AFTER UPDATE OF released_at ON public.generation_admission_reservations",
"FOR EACH ROW WHEN (OLD.released_at IS NULL AND NEW.released_at IS NOT NULL)",
"EXECUTE FUNCTION conformance.audit_atomic_release();"
].join("\n");
sql(auditInit);
const owners=[];
async function race({name,from,first,second}) {
  const owner=randomUUID(),job=randomUUID(),asset=randomUUID();
  owners.push(owner);
  const seed="INSERT INTO auth.users(id,email) VALUES ('"+owner+"','fixture."+owner+"@example.invalid');"
    +"INSERT INTO public.renderlab_account_access(user_id) VALUES ('"+owner+"');"
    +"INSERT INTO public.generation_jobs(id,owner_id,status,operation,output_kind,prompt,workflow_id,model,ecosystem)"
    +" VALUES ('"+job+"','"+owner+"','"+from+"','create-image','image','fixture','fixture','fibo2-edit-turbo','fibo');"
    +"INSERT INTO public.generation_admission_reservations(owner_id,job_id,expires_at)"
    +" VALUES ('"+owner+"','"+job+"',now()+interval '1 hour');"
    +(from==="persisting"
      ?"INSERT INTO public.media_assets(id,owner_id,generation_job_id,generation_output_index,kind,mime_type,storage_key)"
      +" VALUES ('"+asset+"','"+owner+"','"+job+"',0,'image','image/png','test/atomic/"+job+"');":"");
  sql(seed);
  const a=startSession(),b=startSession();
  try{
    a.child.stdin.write("BEGIN;\n"+invoke(owner,job,from,first,asset)+";\n\\echo FIRST_HAS_ROW_LOCK\n");
    await waitFor(a,"FIRST_HAS_ROW_LOCK");
    b.child.stdin.end("BEGIN;\n\\echo SECOND_STARTED\n"+invoke(owner,job,from,second,asset)+";\nCOMMIT;\n");
    await waitFor(b,"SECOND_STARTED");
    await awaitLockWait();
    a.child.stdin.end("COMMIT;\n");
    const [aOut,bOut]=await Promise.all([a.done,b.done]);
    const resultA=/RACE_OUTCOME:(\w+)/.exec(aOut)?.[1];
    const resultB=/RACE_OUTCOME:(\w+)/.exec(bOut)?.[1];
    // 0036: an indexed output makes a failed edge illegal even if that
    // contender gets the job lock first. Success still wins the serial race.
    const guardedFailure=from==="persisting"&&first==="failed"&&second==="succeeded";
    const winner=guardedFailure?second:first;
    assert.equal(resultA,guardedFailure?"conflict":"applied",name+": first connection holds lock before contender");
    assert.equal(resultB,guardedFailure?"applied":first===second?"already_terminal":"conflict",
      name+": second must observe serially committed terminal or recover protected output");
    const state=sql("SELECT status||'|'||cardinality(output_asset_ids) "+
      "FROM public.generation_jobs WHERE id='"+job+"'");
    assert.equal(state,winner+"|"+(winner==="succeeded"?1:0),name+": terminal row");
    assert.equal(Number(sql("SELECT count(*) FROM public.generation_admission_reservations "+
      "WHERE job_id='"+job+"' AND released_at IS NOT NULL")),1,name+": released slot");
    assert.equal(Number(sql("SELECT count(*) FROM conformance.atomic_release_audit WHERE job_id='"+job+"'")),1,
      name+": release happens exactly once even with two writers");
    const replay=sql(invoke(owner,job,from,winner,asset));
    assert.ok(replay.includes("RACE_OUTCOME:already_terminal"),name+": replay after lost response");
    assert.equal(Number(sql("SELECT count(*) FROM conformance.atomic_release_audit WHERE job_id='"+job+"'")),1,
      name+": replay must not release twice");
    console.log("PASS P0-07 two-connection "+name+": "+resultA+"/"+resultB+", one release, replay idempotent");
  }finally{
    if(a.child.exitCode===null){a.child.stdin.end();a.child.kill();}
    if(b.child.exitCode===null){b.child.stdin.end();b.child.kill();}
  }
}
try{
  await race({name:"failed-vs-succeeded",from:"persisting",first:"failed",second:"succeeded"});
  await race({name:"succeeded-vs-failed",from:"persisting",first:"succeeded",second:"failed"});
  await race({name:"duplicate-succeeded",from:"persisting",first:"succeeded",second:"succeeded"});
  await race({name:"cancel-vs-complete",from:"cancelling",first:"cancelled",second:"succeeded"});
}finally{
  for(const owner of owners){
    sql("DELETE FROM public.generation_admission_reservations WHERE owner_id='"+owner+"';"
      +"DELETE FROM public.media_assets WHERE owner_id='"+owner+"';"
      +"DELETE FROM public.generation_jobs WHERE owner_id='"+owner+"';"
      +"DELETE FROM public.renderlab_account_access WHERE user_id='"+owner+"';"
      +"DELETE FROM auth.users WHERE id='"+owner+"';");
  }
  sql("DROP TRIGGER conformance_atomic_release_audit ON public.generation_admission_reservations;"
    +"DROP FUNCTION conformance.audit_atomic_release();"
    +"DROP TABLE conformance.atomic_release_audit;");
}
