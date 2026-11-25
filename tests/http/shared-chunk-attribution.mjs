// Next 16.4.5 analyze export schema v1. This is a diagnostic graph, not a
// browser coverage trace and not an additive compressed-byte accounting.
const chunkPath = (value) => typeof value === "string"
  ? value.replaceAll("\\", "/").match(/(?:^|\/)(static\/chunks\/[^/]+\.js)$/)?.[1] ?? null
  : null;

function synchronousClosure(route, modules) {
  if (route?.coverage?.entries !== "exact" || !Array.isArray(route.entries)) return null;
  const roots = new Set();
  for (const entry of route.entries) {
    if (entry.entry_kind === "client_bootstrap") roots.add(entry.module_ident);
    for (const ref of entry.client_references ?? []) {
      if (ref.reference_kind === "ecmascript") roots.add(ref.module_ident);
    }
  }
  if (!roots.size) return null;
  const visited = new Set(), pending = [...roots];
  while (pending.length) {
    const id = pending.pop();
    if (visited.has(id)) continue;
    const module = modules.get(id);
    if (!module || !Array.isArray(module.dependencies?.sync)) return null;
    visited.add(id);
    pending.push(...module.dependencies.sync);
  }
  return visited;
}

export function attributeSharedChunks(assets, records) {
  if (!assets.length) return {shared:[],routes:[]};
  const shared = assets[0].resources.filter(row => chunkPath(row.path) && assets.every(route =>
    route.resources.some(other => other.path === row.path && other.bytes === row.bytes && other.rawBytes === row.rawBytes)))
    .sort((a,b)=>b.bytes-a.bytes).slice(0,2)
    .map(({path,bytes,rawBytes})=>({path,bytes,rawBytes}));
  const modules = new Map(records.filter(row=>row.type==="module").map(row=>[row.ident,row]));
  const routes = assets.map(asset => {
    const rows = records.filter(row=>row.route===asset.route);
    const route = rows.find(row=>row.type==="route");
    const sync = synchronousClosure(route,modules);
    const chunks = shared.map(sharedAsset => {
      const outputs = rows.filter(row=>row.type==="output" && chunkPath(row.filename)===chunkPath(sharedAsset.path));
      const output=outputs.length===1?outputs[0]:null;
      const coverage=outputs.length>1?"ambiguous":output?.coverage??"unmatched";
      if (coverage!=="exact" || !Array.isArray(output?.modules)) return {path:sharedAsset.path,coverage,modules:[],parts:[],groups:[]};
      const names=output.modules.map(id=>({ident:id,path:modules.get(id)?.path??null,syncReachable:sync===null?null:sync.has(id)}));
      const parts=rows.filter(row=>row.type==="part"&&row.filename===output.filename)
        .map(row=>({path:row.source_path,raw:row.size,estimatedCompressed:row.compressed_size}))
        .sort((a,b)=>b.raw-a.raw);
      const groups=rows.filter(row=>row.type==="group"&&row.outputs?.includes(output.filename))
        .map(row=>({kind:row.kind,trigger:modules.get(row.trigger_module_ident)?.path??null}));
      return {path:sharedAsset.path,coverage,modules:names,parts,groups};
    });
    return {route:asset.route,syncClosure:sync===null?"unknown":"static-client-reference-closure",chunks};
  });
  return {shared,routes};
}
