import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = name => readFile(new URL("../../" + name, import.meta.url), "utf8");
test("signed-out Landing skips the heavy shell while workspace and signed-in Landing keep its SSR boundary", async () => {
  const root = await read("src/app/layout.tsx");
  const fixture = await read("tests/component-app/app/layout.tsx");
  for (const source of [root, fixture]) {
    assert.doesNotMatch(source, /from ["']@\/components\/shell\/preview-navigation-shell["']/);
    assert.match(source, /<PreviewNavigationBoundary\b/);
  }
  const boundary = await read("src/components/shell/preview-navigation-boundary.tsx");
  assert.match(boundary, /dynamic\(\s*\(\) => import\("\.\/preview-navigation-shell"\)/);
  assert.doesNotMatch(boundary, /ssr:\s*false/);
  assert.match(boundary, /if \(pathname === "\/" && !props\.accountId\) return <>{props\.children}<\/>;/);
  assert.match(boundary, /return <DeferredNavigationShell \{\.\.\.props\} \/>;/);
});
