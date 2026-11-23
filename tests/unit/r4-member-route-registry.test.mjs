import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const apiRoot = path.join(root, "src", "app", "api");

// Exact public exemptions are reviewable. A new route is never implicitly public.
const publicRouteAllowlist = new Set([
  "src/app/api/health/route.ts",
  "src/app/api/media/assets/[assetId]/upscale/route.ts", // Always returns 410; no private asset lookup.
]);
const publicHandlerAllowlist = new Map([
  ["src/app/api/generation/jobs/route.ts", new Set(["GET"])], // Capability flags only.
]);
const previewRelayAllowlist = new Set([
  "src/app/api/preview-account/profile/route.ts",
  "src/app/api/preview-account/profile/avatar/route.ts",
]);
const privilegedNamespaces = [
  ["src/app/api/account/", "account-policy"],
  ["src/app/api/admin/", "admin-policy"],
  ["src/app/api/internal/", "internal-secret"],
];
const memberNamespaces = [
  "src/app/api/assets/",
  "src/app/api/generation/",
  "src/app/api/media/",
];

async function routePaths(dir = apiRoot) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await routePaths(full));
    if (entry.isFile() && entry.name === "route.ts") files.push(path.relative(root, full).split(path.sep).join("/"));
  }
  return files;
}

test("R4 registry exhaustively classifies every API route; member routes cannot use identity-only authorization", async () => {
  const files = await routePaths();
  assert(files.length >= 40, "Unexpected API route inventory shrink; re-review exemptions.");
  for (const route of files) {
    const source = await readFile(path.join(root, route), "utf8");
    const exported = [...source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\s*\(/g)].map(m => m[1]);
    if (publicRouteAllowlist.has(route)) {
      assert(!source.includes("getCurrentRenderLabIdentity"), route + " must not add weak private auth");
      continue;
    }
    if (previewRelayAllowlist.has(route)) continue;
    const privileged = privilegedNamespaces.find(([prefix]) => route.startsWith(prefix));
    if (privileged) {
      assert(!/\bgetCurrentRenderLabIdentity\b|\bgetFreshCurrentRenderLabIdentity\b/.test(source),
        route + " cannot use the identity-only helper for " + privileged[1]);
      continue;
    }
    assert(memberNamespaces.some(prefix => route.startsWith(prefix)),
      "Unclassified API route; register explicit access policy: " + route);
    assert(!/\bgetCurrentRenderLabIdentity\b|\bgetFreshCurrentRenderLabIdentity\b/.test(source),
      "Member route uses weaker identity-only authorization: " + route);
    const privateHandlers = exported.filter(method => !publicHandlerAllowlist.get(route)?.has(method));
    assert(privateHandlers.length > 0 || publicHandlerAllowlist.has(route),
      "Missing protected handler or approved public handler: " + route);
    if (privateHandlers.length > 0) {
      assert(/\bgetCurrentRenderLabAccount\s*\(/.test(source),
        "Member route lacks active-account/MFA guard: " + route);
      assert(source.includes('from "@/lib/supabase/server"'),
        "Member route must import the canonical account helper: " + route);
    }
  }
  for (const allowlisted of [...publicRouteAllowlist, ...previewRelayAllowlist, ...publicHandlerAllowlist.keys()]) {
    assert(files.includes(allowlisted), "Stale public/preview exception: " + allowlisted);
  }
});
