import assert from "node:assert/strict";
import test from "node:test";
import { attributeSharedChunks } from "../http/shared-chunk-attribution.mjs";

const assets = [
  {route:"/", resources:[{path:"/_next/static/chunks/a.js",bytes:71681,rawBytes:229052},{path:"/_next/static/chunks/b.js",bytes:44294,rawBytes:160168},{path:"/_next/static/chunks/only.js",bytes:50000,rawBytes:100000}]},
  {route:"/create", resources:[{path:"/_next/static/chunks/a.js",bytes:71681,rawBytes:229052},{path:"/_next/static/chunks/b.js",bytes:44294,rawBytes:160168}]},
  {route:"/library", resources:[{path:"/_next/static/chunks/a.js",bytes:71681,rawBytes:229052},{path:"/_next/static/chunks/b.js",bytes:44294,rawBytes:160168}]},
];
const modules = [
  {type:"module",ident:"boot",path:"next/bootstrap",dependencies:{sync:["react"],async:[],traced:[]}},
  {type:"module",ident:"react",path:"react/client",dependencies:{sync:[],async:[],traced:[]}},
  {type:"module",ident:"landing",path:"src/landing",dependencies:{sync:["react"],async:["later"],traced:[]}},
  {type:"module",ident:"later",path:"src/deferred",dependencies:{sync:[],async:[],traced:[]}},
  {type:"module",ident:"create",path:"src/create",dependencies:{sync:["later"],async:[],traced:[]}},
];
const route = (name, root) => [
  {type:"route",route:name,coverage:{entries:"exact",groups:"exact"},entries:[{module_ident:"boot",entry_kind:"client_bootstrap"},{module_ident:"server",entry_kind:"server",client_references:[{module_ident:root,reference_kind:"ecmascript"}]}]},
  {type:"output",route:name,filename:"static/chunks/a.js",coverage:"exact",modules:["boot","react"],async_loaders:[]},
  {type:"output",route:name,filename:"static/chunks/b.js",coverage:"exact",modules:["later"],async_loaders:["later"]},
  {type:"part",route:name,filename:"static/chunks/b.js",source_path:"src/deferred",size:160000,compressed_size:44000},
  {type:"group",route:name,id:1,kind:"async",trigger_module_ident:"later",outputs:["static/chunks/b.js"]},
];
test("shared chunk attribution joins exact emitted paths, not route manifest associations", () => {
  const out = attributeSharedChunks(assets,[...modules,...route("/","landing"),...route("/create","create"),...route("/library","create")]);
  assert.deepEqual(out.shared.map(x=>x.path),["/_next/static/chunks/a.js","/_next/static/chunks/b.js"]);
  assert.equal(out.shared.reduce((n,x)=>n+x.bytes,0),115975);
  const landing=out.routes.find(x=>x.route==="/");
  const create=out.routes.find(x=>x.route==="/create");
  assert.equal(landing.chunks[1].coverage,"exact");
  assert.equal(landing.chunks[1].modules[0].path,"src/deferred");
  assert.equal(landing.chunks[1].modules[0].syncReachable,false);
  assert.equal(create.chunks[1].modules[0].syncReachable,true);
  assert.deepEqual(landing.chunks[1].parts,[{path:"src/deferred",raw:160000,estimatedCompressed:44000}]);
  assert.equal(landing.chunks[1].groups[0].trigger,"src/deferred");
});
test("unsupported output coverage, missing root and nonmatching filename cannot be attributed",()=>{
  const rows=[...modules,...route("/","missing")];
  const b=rows.find(x=>x.type==="output"&&x.filename.endsWith("/b.js"));
  b.filename="static/chunks/other.js";
  const a=rows.find(x=>x.type==="output"&&x.filename.endsWith("/a.js"));
  a.coverage="unsupported";
  const result=attributeSharedChunks(assets,rows).routes[0];
  assert.equal(result.syncClosure,"unknown");
  assert.equal(result.chunks[0].coverage,"unsupported");
  assert.deepEqual(result.chunks[0].modules,[]);
  assert.equal(result.chunks[1].coverage,"unmatched");
  assert.deepEqual(result.chunks[1].modules,[]);
});
