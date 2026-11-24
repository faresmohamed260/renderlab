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
// Deliberately recognize the repository's narrow guard idiom, not arbitrary dataflow.
function unwrap(node) {
  while (node?.type === "AwaitExpression" || node?.type === "TSAsExpression" || node?.type === "TSNonNullExpression") node = node.argument ?? node.expression;
  return node;
}
function rootIdentifier(node) {
  node = unwrap(node);
  while (node?.type === "MemberExpression" || node?.type === "OptionalMemberExpression") node = node.object;
  return node?.type === "Identifier" ? node.name : null;
}
function immediatelyReturns(node) {
  if (node?.type === "ReturnStatement") return true;
  if (node?.type !== "BlockStatement") return false;
  // Permit the existing submission metrics assignment before denial, not
  // arbitrary control flow or an assignment to the authorization binding.
  const statements = node.body;
  return statements.at(-1)?.type === "ReturnStatement" && statements.slice(0, -1).every(
    statement => statement.type === "ExpressionStatement" &&
      statement.expression.type === "AssignmentExpression" && statement.expression.operator === "=" &&
      statement.expression.left.type === "Identifier" && statement.expression.left.name === "metricOutcome" &&
      statement.expression.right.type === "StringLiteral"
  );
}
function gateValue(registry, node, gate, delegated, seen) {
  node = unwrap(node);
  if (node?.type !== "CallExpression" || node.callee.type !== "Identifier") return false;
  const call = node.callee.name;
  const binding = registry.imports.get(call);
  if (binding?.name === gate && binding.from === canonicalImports[gate]) return true;
  if (delegated && gate === "getFreshCurrentRenderLabAuthentication" &&
      binding?.name === "getRenderLabProfileRequestOwner" &&
      binding.from === "@/server/account/account-profile-request") return true;
  if (seen.has(call) || !registry.functions.has(call)) return false;
  const body = registry.functions.get(call);
  const next = new Set([...seen, call]);
  // Boolean bearer wrappers must return the gate itself, not an unrelated value.
  if (gate === "isAuthorizedInternalBearer") {
    return body.body.length === 1 && body.body[0].type === "ReturnStatement" &&
      gateValue(registry, body.body[0].argument, gate, delegated, next);
  }
  // Structured owner delegates must themselves enforce the guard.
  return callsGate(registry, body, gate, delegated, next);
}
function callsGate(registry, body, gate, delegated = false, seen = new Set()) {
  const statements = body?.body ?? [];
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    // Only a top-level, unconditional negative guard with an immediate denial return.
    if (statement.type === "ReturnStatement") {
      // Handler may return the entire response from a local, independently
      // guarded delegate (e.g. favorite PUT/DELETE). An ignored call is not
      // delegation; only a returned local call with a proven guard counts.
      const returned = unwrap(statement.argument);
      if (returned?.type === "CallExpression" && returned.callee.type === "Identifier" &&
          registry.functions.has(returned.callee.name) &&
          gateValue(registry, returned, gate, delegated, seen)) return true;
      break;
    }
    // The submission route wraps its entire body in a try/catch/rethrow/finally
    // for duration metrics. Do not accept guards in catch/finally or conditional
    // subtrees; only the unconditionally entered try block.
    if (statement.type === "TryStatement" && statement.handler?.body.body.at(-1)?.type === "ThrowStatement" &&
        callsGate(registry, statement.block, gate, delegated, seen)) return true;
    if (statement.type !== "IfStatement" || !immediatelyReturns(statement.consequent) ||
        statement.test.type !== "UnaryExpression" || statement.test.operator !== "!") continue;
    const value = statement.test.argument;
    if (gateValue(registry, value, gate, delegated, seen)) return true;
    // Require adjacent const binding: no reassignment or intervening side effect can
    // substitute an unrelated value between the gate and denial.
    const previous = statements[i - 1];
    if (previous?.type !== "VariableDeclaration" || previous.kind !== "const" ||
        previous.declarations.length !== 1) continue;
    const declaration = previous.declarations[0];
    if (declaration.id.type === "Identifier" && rootIdentifier(value) === declaration.id.name &&
        gateValue(registry, declaration.init, gate, delegated, seen)) return true;
  }
  return false;
}

test("R4 registry rejects sibling-only, wrong-namespace, commented and uncalled helper gates", () => {
  const source = `import { authorizeRenderLabAdminApi } from "@/app/api/admin/admin-api-authorization";
import { getCurrentRenderLabAccount } from "@/lib/supabase/server";
async function unused() { await authorizeRenderLabAdminApi(); }
export async function GET() { const authorization = await authorizeRenderLabAdminApi(); if (!authorization.ok) return authorization.response; }
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
    "getFreshCurrentRenderLabAuthentication"), "Profile delegate must guard the result of canonical fresh authentication");
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
        `${route} ${method} must guard the result of canonical ${gate} (directly or through an invoked helper)`);
    }
    for (const method of publicHandlerAllowlist.get(route) ?? []) assert(registry.handlers.has(method), "Stale public method exception: " + route);
  }
  for (const allowlisted of [...publicRouteAllowlist, ...previewRelayAllowlist, ...publicHandlerAllowlist.keys()]) {
    assert(files.includes(allowlisted), "Stale public/preview exception: " + allowlisted);
  }
});

test("F8 rejects ignored, overwritten, non-returning and nested-only gate results", () => {
  const prefix = 'import { getCurrentRenderLabAccount } from "@/lib/supabase/server";';
  for (const body of [
    "await getCurrentRenderLabAccount(); return data;",
    "const account = await getCurrentRenderLabAccount(); return data;",
    "let account = await getCurrentRenderLabAccount(); account = {}; if (!account) return denied;",
    "const account = await getCurrentRenderLabAccount(); if (!account) log(); return data;",
    "if (false) { const account = await getCurrentRenderLabAccount(); if (!account) return denied; } return data;",
    "const account = await getCurrentRenderLabAccount(); if (!other) return denied; return data;",
    "const account = await getCurrentRenderLabAccount(); if (!account || true) return denied;",
    "const account = await getCurrentRenderLabAccount(); if (account) return denied; return data;",
    "const account = await getCurrentRenderLabAccount(); if (!account) { if (false) return denied; } return data;",
    "try { await getCurrentRenderLabAccount(); } catch { throw error; } return data;",
  ]) {
    const registry = gateRegistry(prefix + "export async function GET() {" + body + "}");
    assert.equal(callsGate(registry, registry.handlers.get("GET"), "getCurrentRenderLabAccount"), false, body);
  }
  const valid = gateRegistry(prefix + "export async function GET() { const account = await getCurrentRenderLabAccount(); if (!account) return denied; return data; }");
  assert(callsGate(valid, valid.handlers.get("GET"), "getCurrentRenderLabAccount"));
});

test("F8 helper authorization must return its result and caller must guard it", () => {
  const prefix = 'import { isAuthorizedInternalBearer as bearer } from "@/server/security/internal-bearer-secret";';
  for (const [helper, body, expected] of [
    ["return bearer(header, secret);", "if (!authorized()) return denied; return data;", true],
    ["bearer(header, secret); return true;", "if (!authorized()) return denied; return data;", false],
    ["return bearer(header, secret);", "authorized(); return data;", false],
    ["return bearer(header, secret);", "const allowed = authorized(); if (!allowed) return denied; return data;", true],
  ]) {
    const registry = gateRegistry(prefix + "function authorized() {" + helper + "} export function GET() {" + body + "}");
    assert.equal(callsGate(registry, registry.handlers.get("GET"), "isAuthorizedInternalBearer"), expected);
  }
});

test("F8 returned response delegate must itself enforce the gate", () => {
  const prefix = 'import { getCurrentRenderLabAccount } from "@/lib/supabase/server";';
  for (const [helper, body, expected] of [
    ["const account = await getCurrentRenderLabAccount(); if (!account) return denied; return data;", "return update();", true],
    ["const account = await getCurrentRenderLabAccount(); if (!account) return denied; return data;", "await update(); return data;", false],
    ["await getCurrentRenderLabAccount(); return data;", "return update();", false],
  ]) {
    const registry = gateRegistry(prefix + "async function update() {" + helper + "} export async function PUT() {" + body + "}");
    assert.equal(callsGate(registry, registry.handlers.get("PUT"), "getCurrentRenderLabAccount"), expected);
  }
});
