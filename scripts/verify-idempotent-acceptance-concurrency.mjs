#!/usr/bin/env node
/** R8 PR A: actual advisory-lock and 20-process replay proof on local disposable PG. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";

const { PGHOST:host="127.0.0.1", PGPORT:port="5432",
  PGUSER:user="postgres", PGDATABASE:database="", PGPASSWORD:password } = process.env;
assert.ok(["127.0.0.1","localhost","::1"].includes(host)
  && database==="renderlab_conformance" && user==="postgres" && password
  && /^\d{1,5}$/.test(port),
"Never run R8 concurrency proof outside local disposable renderlab_conformance.");
const env={...process.env};
delete env.PGSERVICE;
delete env.PGHOSTADDR;
const opts=["-X","-w","-v","ON_ERROR_STOP=1","-h",host,"-p",port,"-U",user,"-d",database,"-t","-A"];
const execFileAsync=promisify(execFile);
function sql(query) {
  return execFileSync("psql",[...opts,"-c",query],{
    env,encoding:"utf8",maxBuffer:1024*1024,timeout:15000
  }).trim();
}
const owner=randomUUID(), key="r8-race-"+randomUUID(), digest="e".repeat(64);
const firstAttempt=randomUUID();
const id=(s)=>"'"+s+"'";
const rpc="public.renderlab_accept_generation_dispatch_idempotent";
function accept(attempt) {
  return "SELECT 'ACCEPT:'||outcome||'|'||job_id||'|'||attempt_id||'|'||reservation_id FROM "+rpc+"("
    +[id(key),id(digest),id(attempt),id(owner),
      "'create-image'","'image'","'synthetic fixture'","'fixture'","'fibo2-edit-turbo'","'fibo'",
      "'[]'::jsonb","'{}'::jsonb","'fibo'","'fibo-2.0-turbo'","'bria-fibo-2.0-turbo'",
      "'{}'::jsonb","now()+interval '10 minutes'"].join(",")+")";
}
function lookup() {
  return "SELECT 'LOOKUP:'||outcome FROM public.renderlab_lookup_generation_request_acceptance("
    +[id(owner),id(key),id(digest)].join(",")+")";
}
function session() {
  const child=spawn("psql",opts,{env,stdio:["pipe","pipe","pipe"]});
  const state={child,stdout:"",stderr:"",listeners:new Set()};
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data",part=>{state.stdout+=part;for(const fn of state.listeners)fn();});
  child.stderr.on("data",part=>{state.stderr+=part;});
  state.done=new Promise((resolve,reject)=>child.on("close",code=>
    code===0?resolve(state.stdout):reject(new Error("SQL session failed: "+state.stderr.slice(-600)))
  ));
  return state;
}
function until(s,marker,ms=10000) {
  if(s.stdout.includes(marker))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{s.listeners.delete(check);s.child.off("close",closed);
      reject(new Error("SQL session marker missing: "+marker));},ms);
    function check(){
      if(!s.stdout.includes(marker))return;
      clearTimeout(timer);s.listeners.delete(check);s.child.off("close",closed);resolve();
    }
    function closed(){clearTimeout(timer);s.listeners.delete(check);reject(Error("SQL session exited before "+marker));}
    s.listeners.add(check);s.child.once("close",closed);check();
  });
}
async function waitForBlockedAccept() {
  for(let n=0;n<100;n++){
    if(Number(sql("SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() "
      +"AND wait_event_type='Lock' AND query LIKE '%renderlab_accept_generation_dispatch_idempotent%'"))>=1)return;
    await new Promise(resolve=>setTimeout(resolve,35));
  }
  throw Error("Concurrent same-key accept failed to wait for transaction advisory lock");
}

sql("INSERT INTO auth.users(id,email) VALUES ("+id(owner)+",'r8.race@example.invalid');"
  +"INSERT INTO public.renderlab_account_access(user_id) VALUES ("+id(owner)+");");
const a=session(), b=session();
try {
  // First writer accepts but leaves transaction uncommitted with key lock held.
  a.child.stdin.write("BEGIN;\n"+accept(firstAttempt)+";\n\\echo FIRST_ACCEPT_LOCK_HELD\n");
  await until(a,"FIRST_ACCEPT_LOCK_HELD");

  // In-flight lookup reports uncertainty; second accept then waits, not duplicates.
  b.child.stdin.end("BEGIN;\n"+lookup()+";\n\\echo IN_FLIGHT_READ_DONE\n"
    +accept(randomUUID())+";\nCOMMIT;\n");
  await until(b,"IN_FLIGHT_READ_DONE");
  assert.match(b.stdout,/LOOKUP:in_flight/);
  await waitForBlockedAccept();

  a.child.stdin.end("COMMIT;\n");
  const [first,second]=await Promise.all([a.done,b.done]);
  const p=/ACCEPT:(\w+)\|([0-9a-f-]+)\|([0-9a-f-]+)\|([0-9a-f-]+)/;
  const firstResult=p.exec(first), secondResult=p.exec(second);
  assert.ok(firstResult&&secondResult,"Both SQL sessions must return identity");
  assert.equal(firstResult[1],"accepted");
  assert.equal(secondResult[1],"replayed");
  assert.deepEqual(secondResult.slice(2),firstResult.slice(2),
    "Concurrent duplicate must preserve job, attempt and reservation IDs");

  // Twenty independent psql processes race a committed replay with new proposed
  // attempts; none may consume a quota grant or create another outbox record.
  const stress=await Promise.all(Array.from({length:20},async()=>{
    const result=await execFileAsync("psql",[...opts,"-c",accept(randomUUID())],{
      env,encoding:"utf8",timeout:15000,maxBuffer:1024*1024
    });
    const row=p.exec(result.stdout);
    assert.ok(row,"Missing replay response");
    assert.equal(row[1],"replayed");
    assert.deepEqual(row.slice(2),firstResult.slice(2));
  }));
  assert.equal(stress.length,20);
  for(const [table,label] of [
    ["public.generation_jobs","job"],["public.generation_dispatch_outbox","outbox"],
    ["public.generation_admission_reservations","admission"],
    ["public.renderlab_generation_request_keys","request-key"],
  ]){
    assert.equal(Number(sql("SELECT count(*) FROM "+table+" WHERE owner_id="+id(owner))),1,
      "R8 concurrency produced a duplicate "+label);
  }
  console.log("PASS R8 two-connection lock/lookup and 20-process replay: one job, one attempt, one reservation");
} finally {
  for(const s of [a,b])if(s.child.exitCode===null){s.child.stdin.end();s.child.kill();}
  // Fixtures are additionally discarded with the entire disposable service.
  sql("DELETE FROM public.renderlab_generation_request_keys WHERE owner_id="+id(owner)+";"
    +"DELETE FROM public.generation_dispatch_outbox WHERE owner_id="+id(owner)+";"
    +"DELETE FROM public.generation_admission_reservations WHERE owner_id="+id(owner)+";"
    +"DELETE FROM public.generation_jobs WHERE owner_id="+id(owner)+";"
    +"DELETE FROM public.renderlab_account_access WHERE user_id="+id(owner)+";"
    +"DELETE FROM auth.users WHERE id="+id(owner)+";");
}
