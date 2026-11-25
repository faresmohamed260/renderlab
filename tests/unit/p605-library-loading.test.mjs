import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL("../../" + path, import.meta.url), "utf8");

test("Library streams its shared fallback after account and storage admission", async () => {
  const page = await read("src/app/(app)/library/page.tsx");
  const shared = await read("src/components/shell/route-loading.tsx");
  assert.match(page, /await Promise\.all\(\[searchParams, getCurrentRenderLabAccount\(\)\]\)/);
  assert.match(page, /if \(!account \|\| !available\) return LibraryContent\(props\);[\s\S]*?<Suspense fallback=\{\s*<RouteLoading\s+surface="library"/);
  assert.match(page, /async function LibraryContent[\s\S]*?settleOwnerGenerationWithinResponse\(account\.id, "library"\)[\s\S]*?listMediaAssets\(/);
  assert.match(shared, /surface === "library" && <LibraryLoading/);
});

test("Library placeholders inherit shared shimmer and use semantic material", async () => {
  const loading = await read("src/features/library/library-loading.tsx");
  const css = await read("src/features/library/library-loading.module.css");
  assert.match(loading, /import \{ Skeleton \} from "@\/components\/ui\/skeleton"/);
  assert.match(loading, /aria-hidden="true"/);
  assert.doesNotMatch(loading, /<\s*(?:button|input|select|textarea|a|nav|header)\b|progressbar/);
  assert.match(css, /var\(--rl-surface-panel-layered\)/);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(|animation\s*:/i);
});
