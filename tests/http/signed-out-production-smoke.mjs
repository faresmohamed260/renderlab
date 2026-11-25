import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { get as httpGet } from "node:http";
import { createHash } from "node:crypto";
import { attributeSharedChunks, verifiedChunkAliases } from "./shared-chunk-attribution.mjs";

const origin = "http://127.0.0.1:4184";

// Diagnostic only: actual production build, not the mounted fixture.
// HTTP entity bytes (compressed if negotiated), NOT browser ResourceTiming
// transferSize; HTML-emitted script/preload entries, NOT post-hydration imports.
async function readWire(url) {
  return new Promise((resolve, reject) => {
    const request = httpGet(url, {headers: {"accept-encoding":"gzip, br"}}, response => {
      let bytes=0;
      response.on("data", chunk => { bytes += chunk.length; });
      response.on("error", reject);
      response.on("end", () => resolve({status:response.statusCode,encoding:response.headers["content-encoding"]??"identity",bytes}));
    });
    request.setTimeout(15000,()=>request.destroy(Error("asset timeout")));
    request.on("error",reject);
  });
}
function emittedAssets(html) {
  const assets = new Map();
  for (const match of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const tag=match[0], attrs=new Map();
    for(const attr of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs.set(attr[1].toLowerCase(),attr[2]??attr[3]);
    const url=attrs.get(match[1].toLowerCase()==="script"?"src":"href");
    if(!url||!url.startsWith("/_next/static/"))continue;
    const pathname=new URL(url,origin).pathname;
    if(!/\.(?:js|mjs|css|woff2)$/.test(pathname))continue;
    const types=assets.get(pathname)??new Set();
    types.add(match[1].toLowerCase()==="script"?"script":(attrs.get("rel")??"link")+" "+(attrs.get("as")??""));
    assets.set(pathname,types);
  }
  return assets;
}
function routeManifests() {
  const root=path.resolve(".next/server/app");
  const results={};
  const walk=directory=>{
    for(const entry of readdirSync(directory,{withFileTypes:true})){
      const full=path.join(directory,entry.name);
      if(entry.isDirectory())walk(full);
      else if(entry.name.endsWith("_client-reference-manifest.js")){
        const source=readFileSync(full,"utf8");
        const start=source.indexOf('{"moduleLoading"');
        if(start<0)continue;
        const route=path.relative(root,full).replace(/_client-reference-manifest\.js$/,"");
        try{
          const manifest=JSON.parse(source.slice(start).trim().replace(/;$/,""));
          results[route]=Object.entries(manifest.clientModules??{}).map(([key,value])=>({
            module:key.split("[project]/").at(-1),
            chunks:(value.chunks??[]).filter(x=>typeof x==="string"&&x.endsWith(".js")).map(x=>path.basename(x)),
          })).filter(entry=>/src[\\/](?:features|components)[\\/]/.test(entry.module));
        }catch(error){console.log("PRODUCTION_GRAPH_MANIFEST_PARSE",JSON.stringify({route,error:String(error)}));}
      }
    }
  };
  walk(root);
  return results;
}
async function reportProductionGraph() {
  const manifests=routeManifests();
  const assets=[];
  const markerList=["Create with FIBO","Loading mask editor","Edit source mask","Invalid batch size.","Manage collections","Collection name","Creative image workspace","Make it.","Open navigation","Account options"];
  for(const route of ["/","/create","/library"]){
    const response=await fetch(origin+route,{headers:{accept:"text/html"},redirect:"manual",signal:AbortSignal.timeout(15000)});
    assert.equal(response.status,200,route+" graph HTML response");
    const html=await response.text();
    const entries=emittedAssets(html);
    const manifestKey=Object.keys(manifests).find(key=>route==="/"?key==="page":key.replace(/\([^)]*\)\//g,"")===(route.slice(1)+"/page"));
    const refs=manifests[manifestKey]??[];
    const resources=[];
    for(const [pathname,types] of entries){
      const file=path.resolve(".next",pathname.slice("/_next/".length));
      const raw=readFileSync(file);
      const wire=await readWire(origin+pathname);
      assert.equal(wire.status,200,pathname+" build asset HTTP");
      const script=/\.(?:js|mjs)$/.test(pathname);
      resources.push({path:pathname,types:[...types],rawBytes:raw.length,...wire,
        markers:script?markerList.filter(marker=>raw.includes(marker)):[],
        manifestModules:script?refs.filter(x=>x.chunks.includes(path.basename(pathname))).map(x=>x.module):[]});
    }
    assert.ok(resources.some(x=>x.types.includes("script")),route+" must have actual emitted scripts");
    const totals={};
    for(const kind of ["js","css","woff2"]){
      const rows=resources.filter(x=>x.path.endsWith("."+kind));
      totals[kind]={count:rows.length,wire:rows.reduce((n,x)=>n+x.bytes,0),raw:rows.reduce((n,x)=>n+x.rawBytes,0)};
    }
    console.log("PRODUCTION_ROUTE_GRAPH "+JSON.stringify({route,manifestKey:manifestKey??null,manifestModules:refs.length,totals,resources}));
    assets.push({route,resources});
  }
  return assets;
}

const next = path.resolve("node_modules/next/dist/bin/next");
const env = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", CI: "true" };
const server = spawn(process.execPath, [next, "start", "--hostname", "127.0.0.1", "--port", "4184"], { env, stdio: "inherit" });
const exited = once(server, "exit");
let emitted;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw Error("Production Next server exited before readiness");
    try {
      const response = await fetch(origin + "/", { redirect: "manual", signal: AbortSignal.timeout(2000) });
      await response.body?.cancel();
      ready = true;
      break;
    } catch { await delay(500); }
  }
  assert.ok(ready, "Production Next server ready");
  // Current product intentionally exposes signed-out private-state pages, not
  // login redirects. Admin is concealed as not-found. Pin status AND Location.
  const cases = [
    { route: "/create", status: 200, location: null, marker: /Sign in with an account that has Create access|Sign in to upload/ },
    { route: "/activity", status: 200, location: null, marker: /Sign in to view Activity/ },
    { route: "/library", status: 200, location: null, marker: /Sign in to use Library/ },
    { route: "/admin", status: 404, location: null, marker: null },
  ];
  const failures = [];
  for (const c of cases) {
    try {
    const response = await fetch(origin + c.route, { redirect: "manual", signal: AbortSignal.timeout(15000), headers: { accept: "text/html" } });
    const location = response.headers.get("location");
    const html = await response.text();
    console.log("SIGNED_OUT_HTTP " + JSON.stringify({ route: c.route, status: response.status, location, contentType: response.headers.get("content-type") }));
    assert.equal(response.status, c.status, c.route + " HTTP status");
    assert.equal(location, c.location, c.route + " Location");
    assert.match(response.headers.get("content-type") ?? "", /text\/html/i);
    if (c.marker) assert.match(html, c.marker, c.route + " signed-out private-state content");
    } catch (error) { failures.push(c.route + ": " + String(error)); }
  }
  assert.deepEqual(failures, [], "All signed-out routes must preserve the same public contract");
  emitted = await reportProductionGraph();
} finally {
  server.kill("SIGTERM");
  if (server.exitCode === null) {
    await Promise.race([exited, delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) server.kill("SIGKILL");
  }
}

 
// One diagnostic capture in the candidate checkout only, after the measured
// production server exits. The baseline is not rebuilt for analysis. Use the
// already locked Next binary and existing network-isolated CI environment.
if (path.resolve(import.meta.dirname,"../..") === process.cwd()) {
  const run = args => {
    const result=spawnSync(process.execPath,[next,...args],{
      env,encoding:"utf8",timeout:240000,maxBuffer:128*1024*1024,
    });
    if(result.error || result.status!==0) throw new Error("Analyzer command failed: "+String(result.error??result.status)+" "+(result.stderr??"").slice(-2000));
    return result.stdout;
  };
  // Build-integrated analysis, unlike standalone analyze, describes emitted assets.
  const before=attributeSharedChunks(emitted,[]).shared.map(asset=>({
    path:asset.path, code:readFileSync(path.resolve(".next",asset.path.slice("/_next/".length)),"utf8"),
    hash:createHash("sha256").update(readFileSync(path.resolve(".next",asset.path.slice("/_next/".length)))).digest("hex")
  }));
  assert.equal(before.length,2,"Need two measured shared chunks before analyzed build");
  run(["build","--analyze"]);
  for(const asset of before){
    const hash=createHash("sha256").update(readFileSync(path.resolve(".next",asset.path.slice("/_next/".length)))).digest("hex");
    assert.equal(hash,asset.hash,"Analyzed build must preserve measured chunk identity: "+asset.path);
  }
  const records=[];
  for(const route of emitted.map(row=>row.route)){
    const exported=run(["analyze","export","--route",route]);
    const rows=exported.trim().split("\n").filter(Boolean).map(line=>JSON.parse(line));
    assert.equal(rows[0]?.schema_version,1,"Analyzer export schema");
    assert.ok(rows.some(row=>row.type==="route"&&row.route===route),"Analyzer route data");
    console.log("ANALYZER_OUTPUT_PATHS "+JSON.stringify({route,paths:rows.filter(row=>row.type==="output").map(row=>row.filename)}));
    const outputs=[...new Set(rows.filter(row=>row.type==="output").map(row=>row.filename))]
      .filter(filename=>/^\[client-fs\]\/_next\/static\/chunks\/[a-zA-Z0-9_.-]+\.js$/.test(filename))
      .map(filename=>({filename,file:path.resolve(".next",filename.slice("[client-fs]/_next/".length))}));
    const available=outputs.filter(output=>existsSync(output.file)).map(output=>({filename:output.filename,code:readFileSync(output.file,"utf8")}));
    const aliases=verifiedChunkAliases(before,available);
    console.log("ANALYZER_VERIFIED_ALIASES "+JSON.stringify({route,aliases:[...aliases],available:available.map(row=>row.filename),missing:outputs.filter(row=>!existsSync(row.file)).map(row=>row.filename)}));
    // A renamed graph output is accepted only when its emitted executable code
    // uniquely equals the original measured chunk; the original byte count stays.
    records.push(...rows.map(row=>({ ...row,
      ...(typeof row.filename==="string"?{filename:aliases.get(row.filename)??row.filename}:{}),
      ...(Array.isArray(row.outputs)?{outputs:row.outputs.map(filename=>aliases.get(filename)??filename)}:{})
    })));
  }
  const attribution=attributeSharedChunks(emitted,records);
  assert.equal(attribution.shared.length,2,"Need two common initial JS chunks");
  console.log("SHARED_CHUNK_ACTUAL_BYTES "+JSON.stringify(attribution.shared));
  for(const route of attribution.routes)for(const chunk of route.chunks){
    console.log("SHARED_CHUNK_MODULES "+JSON.stringify({route:route.route,syncClosure:route.syncClosure,...chunk}));
  }
  assert.ok(attribution.routes.every(route=>route.chunks.every(chunk=>chunk.coverage==="exact"&&chunk.modules.length>0)),
    "Analyzer output must match actual emitted chunk filenames with exact membership; no inferred ownership");
}
