import { execFileSync } from "node:child_process";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const project = "design/rd/p6-02a-create/";
const system = "design/system/v2/";
const leak = /(?:design[\\/]system[\\/]v2|p6-02a-create|--rlv2-|data-p602a-isolated|P6-02a isolated foundation)/i;
const textual = /\.(?:[cm]?[jt]sx?|css|json|html|map|rsc|txt|svg|xml|webmanifest)$/i;
const slash = (value) => value.replaceAll("\\", "/");

export function productionLeak(file, content) {
  return leak.test(slash(file)) || leak.test(content);
}

// Only this exact declarative packaging exclusion is allowed in production config.
export function productionSourceLeak(file, content) {
  if (slash(file) === "next.config.ts") {
    content = content.replace("  outputFileTracingExcludes: { \"/**\": [\"./design/rd/p6-02a-create/**/*\", \"./design/system/v2/**/*\"] },\n", "");
  }
  return productionLeak(file, content);
}

export function prototypeProblems(file, content) {
  const problems = [];
  if (/(?:^|\/)(?:api|proxy|middleware)(?:\/|\.|$)|\/route\.[jt]sx?$/.test(file)) problems.push("backend route or middleware");
  if (!/\.(?:[cm]?[jt]sx?|css)$/.test(file)) return problems;
  if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|localStorage|sessionStorage|indexedDB|sendBeacon|Worker)\b|\bprocess\.env\b|https?:\/\//.test(content)) problems.push("network, persistence or environment reference");
  if (file.startsWith(project) && /--rlv2-[\w-]+\s*:/.test(content)) problems.push("duplicate canonical token declaration");
  for (const match of content.matchAll(/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*|@import\s*)["']([^"']+)["']/g)) {
    const target = match[1];
    if (target.startsWith(".")) {
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), target));
      if (!resolved.startsWith(project) && !resolved.startsWith(system)) problems.push("import outside design boundary: " + target);
    } else if (!/^(?:react(?:\/[\w-]+)?|react-dom(?:\/[\w-]+)?|@react-spring\/web|radix-ui|next(?:\/[\w-]+)?)$/.test(target)) {
      problems.push("unreviewed package or alias: " + target);
    }
  }
  return problems;
}

async function assertSourceBoundary() {
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const production = tracked.filter((file) => /^(?:src|app|pages|public)\//.test(file) || /^(?:next|postcss|tailwind|vercel|middleware|proxy)\.[^/]+$/.test(file));
  const prototype = tracked.filter((file) => file.startsWith(project) || file.startsWith(system));
  const routes = production.filter((file) => /^src\/app\/.*(?:page|route)\.[jt]sx?$/.test(file));
  if (!routes.length || !prototype.length) throw new Error("Missing source inventory.");
  const problems = [];
  for (const file of production) {
    if (productionLeak(file, "")) problems.push(file + ": prototype path in production");
    else if (textual.test(file) && productionSourceLeak(file, await readFile(path.join(root, file), "utf8"))) problems.push(file + ": prototype reference in production");
  }
  for (const file of prototype) {
    if (!(await lstat(path.join(root, file))).isFile()) problems.push(file + ": non-regular source");
    for (const problem of prototypeProblems(file, await readFile(path.join(root, file), "utf8"))) problems.push(file + ": " + problem);
  }
  if (problems.length) throw new Error("P6-02a isolation violations:\n" + problems.join("\n"));
  console.log("P6-02a source isolation:", routes.length, "production route/page files;", prototype.length, "design files.");
}

async function assertBuildBoundary() {
  const build = path.join(root, ".next");
  const appPaths = JSON.parse(await readFile(path.join(build, "server", "app-paths-manifest.json"), "utf8"));
  if (!Object.keys(appPaths).length) throw new Error("Production app route manifest empty.");
  const problems = [];
  let scanned = 0;
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = slash(path.relative(build, full));
      if (productionLeak(rel, "")) problems.push(rel);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && textual.test(rel)) {
        scanned++;
        const body = await readFile(full, "utf8");
        if (productionLeak(rel, body)) {
          if (rel.endsWith(".nft.json")) {
            const trace = JSON.parse(body);
            const entries = Array.isArray(trace.files) ? trace.files.filter((entry) => typeof entry === "string" && productionLeak(entry, "")) : [];
            problems.push(rel + ": " + (entries.length ? entries.join(", ") : "marker outside file entries"));
          } else problems.push(rel);
        }
      }
    }
  }
  await walk(path.join(build, "server"));
  await walk(path.join(build, "static"));
  for (const entry of await readdir(build, { withFileTypes: true })) {
    if (entry.isFile() && textual.test(entry.name)) {
      scanned++;
      if (productionLeak(entry.name, await readFile(path.join(build, entry.name), "utf8"))) problems.push(entry.name);
    }
  }
  if (!scanned || problems.length) throw new Error("Prototype found in production build or missing output: " + problems.join(", "));
  console.log("P6-02a build isolation:", Object.keys(appPaths).length, "app manifest entries;", scanned, "server/static/manifest files checked.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  if (process.argv.length > 3 || (mode && mode !== "--build")) throw new Error("Usage: node scripts/verify-p602a-isolation.mjs [--build]");
  await assertSourceBoundary();
  if (mode === "--build") await assertBuildBoundary();
}
