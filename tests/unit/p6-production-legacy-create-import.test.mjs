import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

test("production route does not eagerly import the non-production CreateWorkspace", async () => {
  const source = await readFile(new URL("../../src/app/(app)/create/page.tsx", import.meta.url), "utf8");
  const parsed = ts.createSourceFile("route.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports = parsed.statements.filter(ts.isImportDeclaration).map(node => node.moduleSpecifier.text);
  assert.ok(!imports.includes("@/features/create/create-workspace"), "Legacy client reference must not be an eager route import");
  const guarded = source.indexOf("if (envString(\"NODE_ENV\") === \"production\") {");
  const deferred = source.indexOf("await import(\"@/features/create/create-workspace\")");
  assert.ok(guarded >= 0 && deferred > guarded, "Preserve the existing production early return before the lazy development reference");
  assert.match(source, /<CreateWorkspace\b/, "Preserve the existing non-production UI");
});
