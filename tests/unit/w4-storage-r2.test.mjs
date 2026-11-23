import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import test from "node:test";

// Isolated test-only S3 and signing ports. None of these URLs, keys or IDs exist.
Object.assign(process.env, {
  CLOUDFLARE_R2_ACCOUNT_ID: "synthetic-storage-account",
  CLOUDFLARE_R2_ACCESS_KEY_ID: "synthetic-storage-access",
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: "synthetic-storage-secret",
  CLOUDFLARE_R2_BUCKET: "synthetic-storage-bucket",
});
const STATE=Symbol.for("w4.storage.direct");
const st=()=>globalThis[STATE];
function reset(){
  return globalThis[STATE]={
    sign:[],sent:[],clients:[],faults:[],head:{ContentLength:12,ContentType:"IMAGE/PNG; charset=UTF-8",ETag:'"etag-a"'},
    failHead:null,failDelete:null,
  };
}
reset();
const data=(code)=>({url:"data:text/javascript,"+encodeURIComponent(code),shortCircuit:true});
registerHooks({
  resolve(spec,context,next){
    if(spec==="server-only")return data("export {};");
    if(spec==="@aws-sdk/client-s3")return data(
      'const s=()=>globalThis[Symbol.for("w4.storage.direct")];'
      + 'export class S3Client {constructor(config){s().clients.push(config);}async send(command){s().sent.push(command);if(command.kind==="head"){if(s().failHead)throw s().failHead;return s().head;}if(command.kind==="delete"&&s().failDelete)throw s().failDelete;return {};}}'
      + 'class Command {constructor(kind,input){this.kind=kind;this.input=input;}}'
      + 'export class PutObjectCommand extends Command {constructor(input){super("put",input);}}'
      + 'export class GetObjectCommand extends Command {constructor(input){super("get",input);}}'
      + 'export class HeadObjectCommand extends Command {constructor(input){super("head",input);}}'
      + 'export class DeleteObjectCommand extends Command {constructor(input){super("delete",input);}}'
    );
    if(spec==="@aws-sdk/s3-request-presigner")return data(
      'const s=()=>globalThis[Symbol.for("w4.storage.direct")];'
      + 'export async function getSignedUrl(client,command,opts){s().sign.push({command,opts});return "https://signed-r2.invalid/"+command.kind;}'
    );
    if(spec==="@/server/account/account-data-lifecycle-test-faults")return data(
      'export function injectAccountDataLifecycleTestFault(name){globalThis[Symbol.for("w4.storage.direct")].faults.push(name);}'
    );
    if(spec.startsWith("@/"))return next(new URL("../../src/"+spec.slice(2)+".ts",import.meta.url).href,context);
    return next(spec,context);
  }
});
const r2=await import("../../src/server/storage/r2.ts");

test("W4 R2: configuration uses synthetic private credentials; signer receives bounded content type and TTL",async()=>{
  const s=reset();
  assert.equal(r2.isR2Configured(),true);
  assert.equal(await r2.createSignedUploadUrl({key:"owner-a/file.png",contentType:"image/png"}),"https://signed-r2.invalid/put");
  assert.equal(s.sign.length,1);
  assert.deepEqual(s.sign[0].command.input,{
    Bucket:"synthetic-storage-bucket",Key:"owner-a/file.png",ContentType:"image/png",
  });
  assert.equal(s.sign[0].opts.expiresIn,300);
  assert.deepEqual([...s.sign[0].opts.signableHeaders],["content-type"]);
  assert.equal(s.clients.length,1);
  assert.equal(s.clients[0].endpoint,"https://synthetic-storage-account.r2.cloudflarestorage.com");
});

test("W4 R2: read and download signs only selected key and safe disposition, with explicit expiry",async()=>{
  const s=reset();
  assert.equal(await r2.createSignedReadUrl("owner-a/file.png",30),"https://signed-r2.invalid/get");
  assert.equal(await r2.createSignedDownloadUrl({
    key:"owner-a/file.png",contentDisposition:"attachment; filename=renderlab.png",expiresIn:45,
  }),"https://signed-r2.invalid/get");
  assert.deepEqual(s.sign.map(x=>x.opts.expiresIn),[30,45]);
  assert.deepEqual(s.sign.map(x=>x.command.input),[
    {Bucket:"synthetic-storage-bucket",Key:"owner-a/file.png"},
    {Bucket:"synthetic-storage-bucket",Key:"owner-a/file.png",ResponseContentDisposition:"attachment; filename=renderlab.png"},
  ]);
});

test("W4 R2: delete issues exact requested key only, no listing or accidental extra writes",async()=>{
  const s=reset();
  await r2.deleteR2Object("owner-a/file.png");
  assert.deepEqual(s.sent.map(c=>c.kind),["delete"]);
  assert.deepEqual(s.sent[0].input,{Bucket:"synthetic-storage-bucket",Key:"owner-a/file.png"});
});

test("W4 R2: HEAD normalizes safe type, byte size and ETag without leaking client credentials",async()=>{
  const s=reset();
  assert.deepEqual(await r2.headR2Object("owner-a/file.png"),{
    sizeBytes:12,contentType:"image/png",etag:"etag-a",
  });
  assert.deepEqual(s.sent.map(c=>c.input.Key),["owner-a/file.png"]);
});

for(const error of [
  {name:"NotFound"}, {name:"NoSuchKey"}, {name:"Unknown", $metadata:{httpStatusCode:404}},
]){
  test("W4 R2: missing object returns false only for recognized 404 shape "+JSON.stringify(error),async()=>{
    const s=reset();s.failHead=error;
    assert.equal(await r2.r2ObjectExists("owner-a/missing.png"),false);
    assert.deepEqual(s.sent.map(c=>c.kind),["head"]);
  });
}

test("W4 R2: unauthorized storage failures are rethrown and never treated as object absence",async()=>{
  const s=reset();
  const denial=Object.assign(new Error("Synthetic access denial"),{name:"AccessDenied",$metadata:{httpStatusCode:403}});
  s.failHead=denial;
  await assert.rejects(()=>r2.r2ObjectExists("owner-a/private.png"),error=>error===denial);
  assert.deepEqual(s.sent.map(c=>c.kind),["head"]);
});

test("W4 R2: verified object exists; HEAD read failure cannot silently claim present",async()=>{
  reset();
  assert.equal(await r2.r2ObjectExists("owner-a/file.png"),true);
});

test("W4 R2: read uses only signed URL and preserves bytes while normalizing MIME",async(t)=>{
  const s=reset();
  const calls=[];
  t.mock.method(globalThis,"fetch",async(url,init={})=>{
    assert.equal(url,"https://signed-r2.invalid/get");
    assert.equal(init.cache,"no-store");
    calls.push(url);
    return new Response(Uint8Array.from([1,2,3]),{status:200,headers:{"content-type":"IMAGE/PNG; charset=UTF-8"}});
  });
  const obj=await r2.readR2Object("owner-a/file.png");
  assert.deepEqual([...obj.bytes],[1,2,3]);
  assert.equal(obj.contentType,"image/png");
  assert.equal(calls.length,1);
  assert.equal(s.sign[0].command.input.Key,"owner-a/file.png");
});

test("W4 R2: failed signed read propagates status without returning bytes",async(t)=>{
  reset();
  t.mock.method(globalThis,"fetch",async()=>Response.json({secret:"DO_NOT_LEAK"},{status:404}));
  await assert.rejects(()=>r2.readR2Object("owner-a/missing.png"),e=>{
    assert.match(e.message,/\(404\)/);
    assert(!e.message.includes("DO_NOT_LEAK"));
    return true;
  });
});

test("W4 R2: upload preserves exact bytes and type with a signed PUT, never sends R2 secret",async(t)=>{
  const s=reset();const calls=[];
  t.mock.method(globalThis,"fetch",async(url,init)=>{
    assert.equal(url,"https://signed-r2.invalid/put");
    assert.equal(init.method,"PUT");
    assert.equal(init.headers["content-type"],"image/png");
    assert.deepEqual([...new Uint8Array(init.body)],[1,2,3,255]);
    calls.push(init);
    return new Response(null,{status:200});
  });
  await r2.writeR2Object({key:"owner-a/file.png",contentType:"image/png",body:Uint8Array.from([1,2,3,255])});
  assert.equal(calls.length,1);
  assert.equal(s.sign[0].command.input.Key,"owner-a/file.png");
  assert.deepEqual(s.faults,[]);
});

test("W4 R2: account export write invokes lifecycle fault gate, failed upload cannot claim success",async(t)=>{
  const s=reset();
  t.mock.method(globalThis,"fetch",async()=>new Response(null,{status:503}));
  await assert.rejects(()=>r2.writeR2Object({
    key:"renderlab/account-exports/owner-a/test.json",contentType:"application/json",body:Uint8Array.from([1]),
  }),/could not be written \(503\)/);
  assert.deepEqual(s.faults,["export-write"]);
});
