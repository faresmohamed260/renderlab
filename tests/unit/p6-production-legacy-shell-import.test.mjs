import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

test("production route does not eagerly import the non-production AppShell", async () => {
  const source = await readFile(new URL("../../src/app/(app)/layout.tsx", import.meta.url), "utf8");
  const parsed = ts.createSourceFile("route.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports = parsed.statements.filter(ts.isImportDeclaration).map(node => node.moduleSpecifier.text);
  assert.ok(!imports.includes("@/components/shell/app-shell"), "Legacy client reference must not be an eager route import");
  const guarded = source.indexOf("if (envString(\"NODE_ENV\") === \"production\" || await isCreatePreview()) return <main>{children}</main>;");
  const deferred = source.indexOf("await import(\"@/components/shell/app-shell\")");
  assert.ok(guarded >= 0 && deferred > guarded, "Preserve the existing production early return before the lazy development reference");
  assert.match(source, /<AppShell\b/, "Preserve the existing non-production UI");
});
