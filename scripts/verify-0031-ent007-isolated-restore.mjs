#!/usr/bin/env node
/**
 * P1-05: synthetic ENT-007 encrypted retained-backup restore into a second,
 * run-owned local PostgreSQL 17 database. Never connects to R2/Supabase.
 * The production retained generation is deliberately not accessed.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { copyFile, mkdtemp, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ENT007_PUBLIC_TABLES, ENT007_SNAPSHOT_FORMAT, ENT007_SNAPSHOT_VERSION,
  ENT007_EXCLUDED_PUBLIC_TABLES, ENT007_OMITTED_AUTH_STATE,
  buildSafeManifest, encryptSnapshot,
} from "./lib/ent007-recovery.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { PGHOST:host="127.0.0.1", PGPORT:port="5432",
  PGUSER:user="postgres", PGDATABASE:database="", PGPASSWORD:password } = process.env;
assert.ok(["127.0.0.1","localhost","::1"].includes(host)
  && port!=="5433" && database==="renderlab_conformance" && user==="postgres" && password
  && /^\d{1,5}$/.test(port),
"Refusing P1-05 restore outside disposable local PostgreSQL conformance service");
for (const name of Object.keys(process.env)) {
  assert.ok(!(name.startsWith("ENT007_BACKUP_R2_") || name.startsWith("ENT007_PRIMARY_R2_")),
    "P1-05 restore refuses cloud R2 configuration in the test process");
}
const restoredDb="renderlab_conformance_restore_0031";
const restorePort="5433"; // separate PostgreSQL service/cluster; roles are cluster-global
const owner="c1111111-1111-4111-8111-111111111111";
const job="c2222222-2222-4222-8222-222222222222";
const asset="c3333333-3333-4333-8333-333333333333";
const storageKey="test/p105/retained.png";
const env={...process.env};
delete env.PGSERVICE;
delete env.PGHOSTADDR;
const common=["-X","-w","-v","ON_ERROR_STOP=1","-h",host,"-p",port,"-U",user];
function psql(query, db=database, targetPort=port) {
  return execFileSync("psql",[...common.filter((_,i,a)=>i!==a.indexOf("-p") && i!==a.indexOf("-p")+1),"-p",targetPort,"-d",db,"-t","-A","-c",query],
    {cwd:root,env,encoding:"utf8",maxBuffer:8*1024*1024}).trim();
}
const literal=(s)=>"'"+s.replaceAll("'","''")+"'";
const hash=(b)=>createHash("sha256").update(b).digest("hex");
const temp=await mkdtemp(join(tmpdir(),"renderlab-p105-ent007-"));
let createdDb=false,createdSource=false;
let primaryPath,retainedPath;
const cleanupErrors=[];
try {
  // The independent PG17 service contains a fresh, explicitly named database
  // and no cluster-global roles from the primary conformance service.
  assert.equal(psql("select count(*) from pg_roles where rolname='anon'",restoredDb,restorePort),"0",
    "P1-05 isolated restore PostgreSQL cluster is not fresh");
  createdDb=true;

  psql(
    "INSERT INTO auth.users(id,email) VALUES ("+literal(owner)+",'p105.retained@example.invalid');"
    +"INSERT INTO public.renderlab_account_access(user_id) VALUES ("+literal(owner)+");"
    +"INSERT INTO public.generation_jobs(id,owner_id,status,operation,output_kind,prompt,workflow_id,model,ecosystem)"
    +" VALUES ("+literal(job)+","+literal(owner)+",'persisting','create-image','image','fixture','fixture','fibo','fibo');"
    +"INSERT INTO public.media_assets(id,owner_id,generation_job_id,generation_output_index,kind,mime_type,storage_key)"
    +" VALUES ("+literal(asset)+","+literal(owner)+","+literal(job)+",0,'image','image/png',"+literal(storageKey)+");"
  );
  createdSource=true;
  const tables={};
  for (const {name} of ENT007_PUBLIC_TABLES) {
    tables[name]=JSON.parse(psql(
      "select coalesce(jsonb_agg(to_jsonb(row)), '[]'::jsonb) from public."+name+" row"
    ));
  }
  const users=JSON.parse(psql("select coalesce(jsonb_agg(to_jsonb(u)), '[]'::jsonb) from auth.users u where id="+literal(owner)));
  assert.equal(users.length,1);
  assert.equal(tables.generation_jobs.length,1);
  assert.equal(tables.media_assets.length,1);
  const migrationFiles=(await readdir(join(root,"supabase","migrations")))
    .filter(name=>/^\d+_[a-z0-9_]+\.sql$/i.test(name)).sort();
  assert.ok(migrationFiles.length>=33);
  const migrationHead=basename(migrationFiles.at(-1),".sql").replace(/^\d+_/,"");
  const snapshot={
    format:ENT007_SNAPSHOT_FORMAT,version:ENT007_SNAPSHOT_VERSION,
    generatedAt:new Date().toISOString(),sourceProjectRef:"p105-disposable-synthetic",
    migrations:[{name:migrationHead,version:"fixture-only"}],
    tables,auth:{users,identities:[]},
    omitted:{
      publicTables:ENT007_EXCLUDED_PUBLIC_TABLES,
      authState:ENT007_OMITTED_AUTH_STATE,
      sessionContinuity:false,mfaContinuity:false,
    },
  };
  const key=randomBytes(32);
  const plain=Buffer.from(JSON.stringify(snapshot));
  const envelope=encryptSnapshot(plain,key);
  const manifest=buildSafeManifest({
    snapshot,plaintext:plain,encryptedEnvelope:envelope,generationId:"p105-synthetic-retained",
  });
  await writeFile(join(temp,"p105.snapshot.enc.json"),JSON.stringify(envelope));
  await writeFile(join(temp,"p105.manifest.json"),JSON.stringify(manifest));

  // Entire restore uses the production ENT-007 verifier on synthetic local data.
  const restoreEnv={
    ...env,ENT007_RESTORE_DATABASE_URL:
      "postgresql://"+user+":"+encodeURIComponent(password)+"@"+host+":"+restorePort+"/"+restoredDb,
    ENT007_OUTPUT_DIR:temp,ENT007_BACKUP_ENCRYPTION_KEY:key.toString("base64"),
  };
  const restored=execFileSync(process.execPath,
    [join(root,"scripts","verify-ent007-restore-drill.mjs")],
    {cwd:root,env:restoreEnv,encoding:"utf8",maxBuffer:8*1024*1024,timeout:120000});
  const evidenceLine=restored.split(/\r?\n/).find(line=>line.startsWith('{"format":"renderlab-ent007-restore-evidence"'));
  assert.ok(evidenceLine,"ENT-007 restore verifier did not report evidence");
  const evidence=JSON.parse(evidenceLine);
  assert.equal(evidence.restoredSessionCount,0);
  assert.equal(evidence.orphanMediaReferenceCount,0);
  assert.equal(evidence.ownerOrphanCount,0);
  assert.equal(evidence.authUserCount,1);

  // Retained R2 bytes are represented by an isolated on-disk fixture rather
  // than calling R2 or using any real retained generation credentials.
  const bytes=Buffer.concat([Buffer.from("89504e470d0a1a0a","hex"),Buffer.from("P1-05 local retained object")]);
  retainedPath=join(temp,"retained-image.png");
  primaryPath=join(temp,"primary-image.png");
  await writeFile(retainedPath,bytes);
  await copyFile(retainedPath,primaryPath);
  await unlink(primaryPath); // isolated primary-delete simulation
  assert.equal(hash(await readFile(retainedPath)),hash(bytes),"retained object must survive deletion");
  await copyFile(retainedPath,primaryPath);
  assert.equal(hash(await readFile(primaryPath)),hash(bytes),"R2 fixture recovery bytes must match");
  assert.equal(psql("select storage_key from public.media_assets where id="+literal(asset),restoredDb,restorePort),storageKey);
  assert.equal(psql("select count(*) from auth.sessions",restoredDb,restorePort),"0",
    "logical ENT-007 backup must not restore active Auth sessions");
  assert.equal(psql("select count(*) from public.generation_admission_reservations",restoredDb,restorePort),"0",
    "ephemeral admission reservations are intentionally excluded from retained backup");

  psql("INSERT INTO public.generation_admission_reservations(owner_id,job_id,expires_at)"
    +" VALUES("+literal(owner)+","+literal(job)+",now()+interval '1 hour')",restoredDb,restorePort);
  const call="public.renderlab_terminalize_generation_and_release("+
    [owner,job].map(literal).join(",")+
    ",'persisting','succeeded',"+literal(asset)+")";
  const first=psql("select outcome||'|'||reservation_released from "+call,restoredDb,restorePort);
  const replay=psql("select outcome||'|'||reservation_released from "+call,restoredDb,restorePort);
  assert.equal(first,"applied|true");
  assert.equal(replay,"already_terminal|false");
  assert.equal(psql("select status||'|'||output_asset_ids[1] from public.generation_jobs where id="+literal(job),restoredDb,restorePort),
    "succeeded|"+asset);
  assert.equal(psql("select count(*) from public.generation_admission_reservations where job_id="+literal(job)+" and released_at is not null",restoredDb,restorePort),"1");
  console.log("PASS P1-05: synthetic encrypted ENT-007 retained snapshot restored into isolated PostgreSQL 17; 0031 RPC applied/replayed, one reservation release, owner/media/Auth integrity, local durable bytes delete survival; no external R2 or production access");
} finally {
  if (createdDb) {
    try { psql("DROP DATABASE "+restoredDb+" WITH (FORCE)","postgres",restorePort); }
    catch (error) { cleanupErrors.push("isolated database: "+String(error)); }
  }
  if (createdSource) {
    try {
      psql(
        "DELETE FROM public.media_assets WHERE owner_id="+literal(owner)+";"
        +"DELETE FROM public.generation_admission_reservations WHERE owner_id="+literal(owner)+";"
        +"DELETE FROM public.generation_jobs WHERE owner_id="+literal(owner)+";"
        +"DELETE FROM public.renderlab_account_preferences WHERE owner_id="+literal(owner)+";"
        +"DELETE FROM public.renderlab_account_profiles WHERE owner_id="+literal(owner)+";"
        +"DELETE FROM public.renderlab_account_lifecycle WHERE user_id="+literal(owner)+";"
        +"DELETE FROM public.renderlab_account_access WHERE user_id="+literal(owner)+";"
        +"DELETE FROM auth.users WHERE id="+literal(owner)+";"
      );
      assert.equal(psql("select count(*) from public.generation_jobs where owner_id="+literal(owner)),"0");
      assert.equal(psql("select count(*) from auth.users where id="+literal(owner)),"0");
      console.log("PASS P1-05: zero disposable fixture residue");
    } catch(error) { cleanupErrors.push("source fixture rows: "+String(error)); }
  }
  try { await rm(temp,{recursive:true,force:true}); }
  catch(error) { cleanupErrors.push("temporary backup files: "+String(error)); }
  if(cleanupErrors.length)throw new Error("P1-05 cleanup failed: "+cleanupErrors.join("; "));
}
