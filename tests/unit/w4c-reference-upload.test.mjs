import assert from "node:assert/strict";
import test from "node:test";
import {A,B,SOURCE,OTHER,reset,state,source} from "../helpers/w4c-reference-runtime.mjs";
const ref=await import("../../src/server/media/reference-uploads.ts");
test("C reference: owner, source ID and ready state scoped before image access",async()=>{
 reset({db:async()=>[source()]});assert.equal((await ref.getReadyReferenceSource(A,SOURCE)).id,SOURCE);
 const q=state.calls[0].query;assert.equal(q.get("owner_id"),"eq."+A);
 assert.equal(q.get("id"),"eq."+SOURCE);assert.equal(q.get("status"),"eq.ready");
 reset();assert.equal(await ref.getReadyReferenceSource(A,OTHER),null);
 assert.equal(state.signedRead.length,0);
});
test("C reference: masks cannot masquerade as ordinary creative references",async()=>{
 reset({db:async()=>[source({metadata:{usage:"fibo-mask"}})]});
 assert.equal(await ref.getReadyReferenceSource(A,SOURCE),null);
 assert.equal((await ref.getReadyFiboMaskSource(A,SOURCE)).id,SOURCE);
 reset({db:async()=>[source({metadata:{usage:"fibo-mask"},mime_type:"image/jpeg"})]});
 assert.equal(await ref.getReadyFiboMaskSource(A,SOURCE),null);
 reset({db:async()=>[source({metadata:{usage:"fibo-mask"},size_bytes:0})]});
 assert.equal(await ref.getReadyFiboMaskSource(A,SOURCE),null);
 reset({db:async()=>[source({metadata:{usage:"fibo-mask"},size_bytes:8*1024*1024+1})]});
 assert.equal(await ref.getReadyFiboMaskSource(A,SOURCE),null);
});
test("C reference: approved source signs one private read for 300 seconds",async()=>{
 reset();const url=await ref.getReferenceSourceContentUrl(source());
 assert.equal(url,"https://signed.invalid/read");
 assert.deepEqual(state.signedRead,[["sources/owner-a.png",300]]);
});
test("C reference ticket: reservation bind, owner-only insert, sanitized filename and release",async()=>{
 reset({db:async(c)=>c.method==="POST"?[source({...c.body})]:[]});
 const ticket=await ref.createReferenceUploadTicket(A,{filename:"../../face ? edit.png",mimeType:"image/png",sizeBytes:10});
 assert.equal(ticket.method,"PUT");assert.equal(ticket.expiresInSeconds,300);
 assert.equal(ticket.maxBytes,25*1024*1024);
 assert.deepEqual(state.reserved,[[A,"reference"]]);assert.equal(state.bound[0][0],A);
 assert.deepEqual(state.released,[[A,"reservation-a"]]);
 const insert=state.calls.find(c=>c.method==="POST");assert.equal(insert.body.owner_id,A);
 assert.equal(insert.body.status,"pending");assert(!insert.body.filename.includes("/"));
 assert.equal(state.signedUpload[0].expiresIn,300);
 assert.equal(state.signedUpload[0].key,insert.body.storage_key);
});
test("C reference mask ticket: 8 MB max, owner-bound 'fibo-mask' metadata",async()=>{
 reset({db:async(c)=>c.method==="POST"?[source({...c.body})]:[]});
 const ticket=await ref.createReferenceUploadTicket(A,{filename:"mask.png",mimeType:"image/png",sizeBytes:10,usage:"fibo-mask"});
 assert.equal(ticket.maxBytes,8*1024*1024);
 assert.deepEqual(state.calls.find(c=>c.method==="POST").body.metadata,{usage:"fibo-mask"});
});
test("C reference ticket: rejected bind never persists ticket and still releases lease",async()=>{
 reset({bindOk:false});
 await assert.rejects(()=>ref.createReferenceUploadTicket(A,{filename:"a.png",mimeType:"image/png",sizeBytes:10}),/admission could not be finalized/);
 assert.equal(state.calls.length,0);assert.deepEqual(state.released,[[A,"reservation-a"]]);
});
test("C reference ticket: failed signing marks source failed, removes object and releases",async()=>{
 reset({signError:true,db:async(c)=>c.method==="POST"?[source({...c.body})]:null});
 await assert.rejects(()=>ref.createReferenceUploadTicket(A,{filename:"a.png",mimeType:"image/png",sizeBytes:10}),/SECRET_PROVIDER_KEY/);
 const failed=state.calls.find(c=>c.method==="PATCH");assert.equal(failed.query.get("owner_id"),"eq."+A);
 assert.equal(failed.body.status,"failed");
 assert(!JSON.stringify(failed.body).includes("SECRET_PROVIDER_KEY"));
 assert.equal(state.deleted.length,1);assert.equal(state.released.length,1);
});
test("C reference completion: foreign/missing source cannot touch storage",async()=>{
 reset();assert.equal(await ref.completeReferenceUpload(A,{sourceId:OTHER}),null);
 assert.equal(state.calls[0].query.get("owner_id"),"eq."+A);
 assert.deepEqual(state.headKeys,[]);
});
test("C reference completion: ready replay is immutable, failed cannot retry",async()=>{
 reset({db:async()=>[source()]});
 const replay=await ref.completeReferenceUpload(A,{sourceId:SOURCE});
 assert.deepEqual({id:replay.id,status:replay.status},{id:SOURCE,status:"ready"});
 assert.equal(state.headKeys.length,0);assert.equal(state.calls.some(c=>c.method==="PATCH"),false);
 reset({db:async()=>[source({status:"failed"})]});
 await assert.rejects(()=>ref.completeReferenceUpload(A,{sourceId:SOURCE}),/no longer be completed/);
 assert.equal(state.headKeys.length,0);
});
test("C reference completion: size mismatch fails and cleans only owner source",async()=>{
 reset({object:{sizeBytes:9,contentType:"image/png",etag:"etag-a"},db:async(c)=>c.method==="GET"?[source({status:"pending"})]:null});
 await assert.rejects(()=>ref.completeReferenceUpload(A,{sourceId:SOURCE}),/did not match/);
 assert.deepEqual(state.deleted,["sources/owner-a.png"]);
 const patch=state.calls.find(c=>c.method==="PATCH");assert.equal(patch.query.get("owner_id"),"eq."+A);
 assert.equal(patch.body.status,"failed");assert.equal(state.readKeys.length,0);
});
test("C reference completion: fully verified pixels must precede owner-scoped ready PATCH",async()=>{
 reset({db:async(c)=>{
  if(c.method==="GET")return [source({status:"pending"})];
  if(c.method==="PATCH")return [source({status:"ready",...c.body})];
  return [];
 }});
 const ready=await ref.completeReferenceUpload(A,{sourceId:SOURCE,width:999,height:999});
 assert.equal(ready.status,"ready");assert.equal(ready.width,128);assert.equal(ready.height,128);
 assert.deepEqual(state.validated,[[10,"image/png"]]);assert.equal(state.readKeys.length,1);
 const update=state.calls.find(c=>c.method==="PATCH");assert.equal(update.query.get("owner_id"),"eq."+A);
 assert.deepEqual({width:update.body.width,height:update.body.height,status:update.body.status},{width:128,height:128,status:"ready"});
 assert.equal(update.body.metadata.etag,"etag-a");
});
test("C reference mask: empty or invalid selection fails without ready transition",async()=>{
 reset({maskError:true,db:async(c)=>c.method==="GET"?[source({status:"pending",metadata:{usage:"fibo-mask"}})]:null});
 await assert.rejects(()=>ref.completeReferenceUpload(A,{sourceId:SOURCE}),/mask is empty or invalid/);
 assert.equal(state.calls.some(c=>c.method==="PATCH"&&c.body.status==="ready"),false);
 assert.equal(state.calls.find(c=>c.method==="PATCH").body.status,"failed");
 assert.deepEqual(state.deleted,["sources/owner-a.png"]);
});
test("C reference mask: excessive decoded geometry is rejected before mask selection",async()=>{
 reset({verified:{mimeType:"image/png",sizeBytes:10,width:4097,height:128},
  db:async(c)=>c.method==="GET"?[source({status:"pending",metadata:{usage:"fibo-mask"}})]:null});
 await assert.rejects(()=>ref.completeReferenceUpload(A,{sourceId:SOURCE}),/mask is empty or invalid/);
 assert.equal(state.masks.length,0);
 assert.equal(state.calls.find(c=>c.method==="PATCH").body.status,"failed");
});
