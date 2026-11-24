import assert from "node:assert/strict";
import { parse } from "@babel/parser";
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
  ["src/app/api/assets/reference/upload-tickets/route.ts", new Set(["GET"])],
  ["src/app/api/media/uploads/upload-tickets/route.ts", new Set(["GET"])],
]);
const previewRelayAllowlist = new Set([
  "src/app/api/preview-account/profile/route.ts",
  "src/app/api/preview-account/profile/avatar/route.ts",
]);
const privilegedNamespaces = [
  ["src/app/api/account/", "getFreshCurrentRenderLabAuthentication"],
  ["src/app/api/admin/", "authorizeRenderLabAdminApi"],
  ["src/app/api/internal/", "isAuthorizedInternalBearer"],
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

// Explicit cross-file delegation: verify the shared helper itself, not merely its name.
const profileHelperPath = "src/server/account/account-profile-request.ts";
const profileDelegates = new Set([
  "src/app/api/account/profile/route.ts",
  "src/app/api/account/profile/avatar/route.ts",
]);
const methods = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
function parseModule(source) {
  return parse(source, { sourceType: "module", plugins: ["typescript"] }).program.body;
}
function collectCalls(node, calls = new Set()) {
  if (!node || typeof node !== "object") return calls;
  // A nested callback or function declaration is not an executed handler body.
  if (["FunctionDeclaration","FunctionExpression","ArrowFunctionExpression","ObjectMethod","ClassMethod"].includes(node.type)) return calls;
  if (node.type === "CallExpression" && node.callee.type === "Identifier") calls.add(node.callee.name);
  for (const [key, value] of Object.entries(node)) {
    if (["loc","start","end","leadingComments","trailingComments"].includes(key)) continue;
    if (Array.isArray(value)) for (const child of value) collectCalls(child, calls);
    else if (value && typeof value === "object") collectCalls(value, calls);
  }
  return calls;
}
function gateRegistry(source) {
  const program = parseModule(source);
  const imports = new Map();
  const functions = new Map();
  const handlers = new Map();
  for (const node of program) {
    if (node.type === "ImportDeclaration") {
      for (const spec of node.specifiers) if (spec.type === "ImportSpecifier" && spec.imported.type === "Identifier")
        imports.set(spec.local.name, { name: spec.imported.name, from: node.source.value });
    }
    const declaration = node.type === "ExportNamedDeclaration" ? node.declaration : node;
    if (declaration?.type === "FunctionDeclaration" && declaration.id) {
      functions.set(declaration.id.name, declaration.body);
      if (node.type === "ExportNamedDeclaration" && methods.has(declaration.id.name)) handlers.set(declaration.id.name, declaration.body);
    }
    // Fail closed on unsupported method export forms, including aliases/arrow functions.
    if (node.type === "ExportNamedDeclaration") {
      if (declaration?.type === "VariableDeclaration") {
        for (const d of declaration.declarations) if (d.id.type === "Identifier" && methods.has(d.id.name))
          throw new Error("Unsupported handler export: " + d.id.name);
      }
      for (const spec of node.specifiers) if (methods.has(spec.exported?.name ?? spec.exported?.value))
        throw new Error("Unsupported handler re-export: " + (spec.exported?.name ?? spec.exported?.value));
    }
  }
  return { imports, functions, handlers };
}
const canonicalImports = {
  getFreshCurrentRenderLabAuthentication: "@/lib/supabase/server",
  getCurrentRenderLabAccount: "@/lib/supabase/server",
  authorizeRenderLabAdminApi: "@/app/api/admin/admin-api-authorization",
  isAuthorizedInternalBearer: "@/server/security/internal-bearer-secret",
};
function callsGate(registry, body, gate, delegated = false, seen = new Set()) {
  for (const call of collectCalls(body)) {
    const binding = registry.imports.get(call);
    if (binding?.name === gate && binding.from === canonicalImports[gate]) return true;
    if (delegated && gate === "getFreshCurrentRenderLabAuthentication" &&
        binding?.name === "getRenderLabProfileRequestOwner" &&
        binding.from === "@/server/account/account-profile-request") return true;
    if (!seen.has(call) && registry.functions.has(call)) {
      seen.add(call);
      if (callsGate(registry, registry.functions.get(call), gate, delegated, seen)) return true;
    }
  }
  return false;
}

test("R4 registry rejects sibling-only, wrong-namespace, commented and uncalled helper gates", () => {
  const source = `import { authorizeRenderLabAdminApi } from "@/app/api/admin/admin-api-authorization";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
async function unused() { await authorizeRenderLabAdminApi(); }
export async function GET() { await authorizeRenderLabAdminApi(); }
export async function POST() { /* authorizeRenderLabAdminApi() */ await getCurrentRenderLabAccount(); }
export async function DELETE() { return "unused"; }`;
  const registry = gateRegistry(source);
  assert.equal(callsGate(registry, registry.handlers.get("GET"), "authorizeRenderLabAdminApi"), true);
  for (const method of ["POST","DELETE"])
    assert.equal(callsGate(registry, registry.handlers.get(method), "authorizeRenderLabAdminApi"), false);
  assert.throws(() => gateRegistry("export const GET = async () => null"), /Unsupported handler/);
});

test("R4 registry exhaustively classifies every handler and enforces the namespace-specific gate", async () => {
  const files = await routePaths();
  assert(files.length >= 40, "Unexpected API route inventory shrink; re-review exemptions.");
  const profile = gateRegistry(await readFile(path.join(root, profileHelperPath), "utf8"));
  assert(callsGate(profile, profile.functions.get("getRenderLabProfileRequestOwner"),
    "getFreshCurrentRenderLabAuthentication"), "Profile delegate must call canonical fresh authentication");
  for (const route of files) {
    const source = await readFile(path.join(root, route), "utf8");
    const registry = gateRegistry(source);
    if (publicRouteAllowlist.has(route)) {
      assert(!source.includes("getCurrentRenderLabIdentity"), route + " must not add weak private auth");
      continue;
    }
    if (previewRelayAllowlist.has(route)) continue;
    const privileged = privilegedNamespaces.find(([prefix]) => route.startsWith(prefix));
    assert(privileged || memberNamespaces.some(prefix => route.startsWith(prefix)),
      "Unclassified API route; register explicit access policy: " + route);
    assert(!/\bgetCurrentRenderLabIdentity\b|\bgetFreshCurrentRenderLabIdentity\b/.test(source),
      "Route uses weaker identity-only authorization: " + route);
    assert(registry.handlers.size > 0, "Missing exported HTTP handler: " + route);
    const gate = privileged?.[1] ?? "getCurrentRenderLabAccount";
    for (const [method, body] of registry.handlers) {
      if (publicHandlerAllowlist.get(route)?.has(method)) continue;
      assert(callsGate(registry, body, gate, profileDelegates.has(route)),
        `${route} ${method} must call canonical ${gate} (directly or through an invoked helper)`);
    }
    for (const method of publicHandlerAllowlist.get(route) ?? []) assert(registry.handlers.has(method), "Stale public method exception: " + route);
  }
  for (const allowlisted of [...publicRouteAllowlist, ...previewRelayAllowlist, ...publicHandlerAllowlist.keys()]) {
    assert(files.includes(allowlisted), "Stale public/preview exception: " + allowlisted);
  }
});
