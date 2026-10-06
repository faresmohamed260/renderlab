import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parse } from "@babel/parser";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const serverRoot = path.join(sourceRoot, "server");
const privilegedSupabaseClient = path.join(sourceRoot, "lib", "supabase", "server.ts");

const privilegedModules = [
  "src/lib/supabase/server.ts",
  "src/server/data/supabase-rest.ts",
  "src/server/storage/r2.ts",
  "src/server/account/account-data-lifecycle.ts",
  "src/server/account/account-deletion-notification.ts",
  "src/server/account/account-sessions.ts",
  "src/server/account/recovery-flow.ts",
  "src/server/admin/admin-operations.ts",
  "src/server/generation/poll-generation.ts",
  "src/server/generation/submit-generation.ts",
  "src/server/observability/operational-alert-notification.ts",
];

const exactCredentialNames = new Set([
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "RENDERLAB_GENERATION_BACKEND_TOKEN",
]);
const credentialPrefixes = ["CLOUDFLARE_R2_", "R2_"];

function normalize(filePath) {
  return path.relative(root, filePath).split(path.sep).join("/");
}

function parseModule(source, filePath) {
  return parse(source, {
    sourceType: "module",
    plugins: filePath.endsWith(".tsx") ? ["typescript", "jsx"] : ["typescript"],
    createImportExpressions: true,
  });
}

function isHighRiskCredential(name) {
  return exactCredentialNames.has(name) || credentialPrefixes.some((prefix) => name.startsWith(prefix));
}

function isProtectedSpecifier(value) {
  return value === "@/lib/supabase/server" || value.startsWith("@/server/");
}

function isStringLiteral(node) {
  return node?.type === "StringLiteral";
}

function isTypeOnlyImport(node) {
  if (node.importKind === "type") return true;
  if (node.specifiers.length === 0) return false;
  return node.specifiers.every(
    (specifier) => specifier.type === "ImportSpecifier" && specifier.importKind === "type",
  );
}

function hasUseClientDirective(ast) {
  return ast.program.directives.some((directive) => directive.value.value === "use client");
}

function hasServerOnlyImport(ast) {
  return ast.program.body.some(
    (node) =>
      node.type === "ImportDeclaration" &&
      node.specifiers.length === 0 &&
      isStringLiteral(node.source) &&
      node.source.value === "server-only",
  );
}

function walk(node, visitor) {
  if (!node || typeof node !== "object") return;
  if (typeof node.type === "string") visitor(node);

  for (const [key, value] of Object.entries(node)) {
    if (key === "loc" || key === "start" || key === "end" || key === "extra") continue;
    if (Array.isArray(value)) {
      for (const child of value) walk(child, visitor);
    } else if (value && typeof value === "object") {
      walk(value, visitor);
    }
  }
}

function memberPropertyName(node) {
  if (node.computed && node.property?.type === "StringLiteral") return node.property.value;
  if (!node.computed && node.property?.type === "Identifier") return node.property.name;
  return null;
}

function isProcessEnv(node) {
  if (node?.type !== "MemberExpression") return false;
  if (node.object?.type !== "Identifier" || node.object.name !== "process") return false;
  return memberPropertyName(node) === "env";
}

function directCredentialReads(ast) {
  const reads = new Set();

  walk(ast.program, (node) => {
    if (node.type === "MemberExpression" && isProcessEnv(node.object)) {
      const name = memberPropertyName(node);
      if (name && isHighRiskCredential(name)) reads.add(name);
      return;
    }

    if (node.type !== "VariableDeclarator" || node.id?.type !== "ObjectPattern" || !isProcessEnv(node.init)) {
      return;
    }

    for (const property of node.id.properties) {
      if (property.type !== "ObjectProperty") continue;
      let name = null;
      if (property.key.type === "Identifier" && !property.computed) name = property.key.name;
      else if (property.key.type === "StringLiteral") name = property.key.value;
      if (name && isHighRiskCredential(name)) reads.add(name);
    }
  });

  return [...reads].sort();
}

function clientRuntimeViolations(ast) {
  if (!hasUseClientDirective(ast)) return [];

  const violations = [];
  for (const node of ast.program.body) {
    if (node.type !== "ImportDeclaration" || !isStringLiteral(node.source)) continue;
    if (!isProtectedSpecifier(node.source.value) || isTypeOnlyImport(node)) continue;
    violations.push(`runtime static import ${JSON.stringify(node.source.value)}`);
  }

  walk(ast.program, (node) => {
    if (node.type === "ImportExpression" && isStringLiteral(node.source) && isProtectedSpecifier(node.source.value)) {
      violations.push(`runtime dynamic import ${JSON.stringify(node.source.value)}`);
      return;
    }

    if (
      node.type === "CallExpression" &&
      node.callee?.type === "Import" &&
      node.arguments.length === 1 &&
      isStringLiteral(node.arguments[0]) &&
      isProtectedSpecifier(node.arguments[0].value)
    ) {
      violations.push(`runtime dynamic import ${JSON.stringify(node.arguments[0].value)}`);
    }
  });

  return violations;
}

async function collectSourceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(fullPath)));
    else if (
      entry.isFile() &&
      (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

async function inspectFile(filePath) {
  const source = await readFile(filePath, "utf8");
  return { source, ast: parseModule(source, filePath) };
}

async function verifyRepository() {
  const violations = [];

  for (const relativePath of privilegedModules) {
    const filePath = path.join(root, relativePath);
    const { ast } = await inspectFile(filePath);
    if (!hasServerOnlyImport(ast)) violations.push(`${relativePath}: missing import \"server-only\";`);
  }

  const serverFiles = await collectSourceFiles(serverRoot);
  for (const filePath of [...serverFiles, privilegedSupabaseClient]) {
    const relativePath = normalize(filePath);
    const { ast } = await inspectFile(filePath);
    const reads = directCredentialReads(ast);
    if (reads.length > 0 && !hasServerOnlyImport(ast)) {
      violations.push(`${relativePath}: direct high-risk credential read without server-only marker (${reads.join(", ")})`);
    }

  }

  const allSourceFiles = await collectSourceFiles(sourceRoot);
  for (const filePath of allSourceFiles) {
    const relativePath = normalize(filePath);
    const { ast } = await inspectFile(filePath);
    for (const violation of clientRuntimeViolations(ast)) violations.push(`${relativePath}: ${violation}`);
  }

  if (violations.length > 0) {
    throw new Error(`Server-only boundary verification failed:\n${violations.map((item) => `- ${item}`).join("\n")}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`Server-only verifier self-test failed: ${message}`);
}

function analyzeFixture(source, fileName = "fixture.tsx") {
  return parseModule(source, fileName);
}

async function runSelfTests() {
  const typeOnly = analyzeFixture('"use client";\nimport type { Foo } from "@/server/example";\n');
  assert(clientRuntimeViolations(typeOnly).length === 0, "whole import type must be accepted");

  const specifierOnly = analyzeFixture('"use client";\nimport { type Foo } from "@/server/example";\n');
  assert(clientRuntimeViolations(specifierOnly).length === 0, "named type-only import must be accepted");

  const mixed = analyzeFixture('"use client";\nimport { type Foo, bar } from "@/server/example";\n');
  assert(clientRuntimeViolations(mixed).length === 1, "mixed type/runtime import must be rejected");

  const staticRuntime = analyzeFixture('"use client";\nimport { bar } from "@/server/example";\n');
  assert(clientRuntimeViolations(staticRuntime).length === 1, "runtime static import must be rejected");

  const dynamicRuntime = analyzeFixture('"use client";\nconst load = () => import("@/lib/supabase/server");\n');
  assert(clientRuntimeViolations(dynamicRuntime).length === 1, "runtime dynamic import must be rejected");

  const markerPresent = analyzeFixture('import "server-only";\nexport const ok = true;\n', "fixture.ts");
  const markerMissing = analyzeFixture('import { thing } from "server-only";\n', "fixture.ts");
  assert(hasServerOnlyImport(markerPresent), "exact side-effect marker must be accepted");
  assert(!hasServerOnlyImport(markerMissing), "non-side-effect server-only import must not satisfy marker");

  const dotCredential = analyzeFixture('const key = process.env.SUPABASE_SERVICE_ROLE_KEY;\n', "fixture.ts");
  assert(directCredentialReads(dotCredential).includes("SUPABASE_SERVICE_ROLE_KEY"), "dot credential read must be detected");

  const bracketCredential = analyzeFixture('const key = process.env["RESEND_API_KEY"];\n', "fixture.ts");
  assert(directCredentialReads(bracketCredential).includes("RESEND_API_KEY"), "bracket credential read must be detected");

  const destructuredCredential = analyzeFixture('const { CLOUDFLARE_R2_ACCESS_KEY_ID: key } = process.env;\n', "fixture.ts");
  assert(
    directCredentialReads(destructuredCredential).includes("CLOUDFLARE_R2_ACCESS_KEY_ID"),
    "destructured credential read must be detected",
  );

  const fixtureDirectory = await mkdtemp(path.join(tmpdir(), "renderlab-ent006-"));
  try {
    const fixturePath = path.join(fixtureDirectory, "client.tsx");
    await writeFile(fixturePath, '"use client";\nimport { type Foo } from "@/server/example";\n', "utf8");
    const { ast } = await inspectFile(fixturePath);
    assert(clientRuntimeViolations(ast).length === 0, "filesystem fixture must parse through the Babel boundary");
  } finally {
    await rm(fixtureDirectory, { recursive: true, force: true });
  }
}

await runSelfTests();
await verifyRepository();
console.log("Server-only boundary verification passed.");
