import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import path from "node:path";
import { readFileSync, readdirSync } from "node:fs";
import { get as httpGet } from "node:http";

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
  }
}

const next = path.resolve("node_modules/next/dist/bin/next");
const env = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: "production", NEXT_TELEMETRY_DISABLED: "1", CI: "true" };
const server = spawn(process.execPath, [next, "start", "--hostname", "127.0.0.1", "--port", "4184"], { env, stdio: "inherit" });
const exited = once(server, "exit");
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
  await reportProductionGraph();
} finally {
  server.kill("SIGTERM");
  if (server.exitCode === null) {
    await Promise.race([exited, delay(5000)]);
    if (server.exitCode === null && server.signalCode === null) server.kill("SIGKILL");
  }
}
