import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = path => readFile(new URL("../../" + path, import.meta.url), "utf8");

test("route loading boundaries are content-only shared Skeletons", async () => {
  const shared = await read("src/components/shell/route-loading.tsx");
  assert.match(shared, /import \{ Skeleton \} from "@\/components\/ui\/skeleton"/);
  assert.match(shared, /role="status"/);
  assert.match(shared, /Loading content/);
  assert.match(shared, /aria-hidden="true"/);
  assert.doesNotMatch(shared, /<\s*(?:button|input|select|textarea|nav|header)\b|progressbar|fetch\(|setInterval\(|useState\(/);
  for (const route of ["create", "activity", "library", "settings", "admin"]) {
    await assert.rejects(access(new URL("../../src/app/(app)/" + route + "/loading.tsx", import.meta.url)), { code: "ENOENT" });
  }
  const create = await read("src/app/(app)/create/page.tsx");
  const activity = await read("src/app/(app)/activity/route.ts");
  const history = await read("src/features/create/history/create-history-panel.tsx");
  assert.match(create, /async function ProductionCreatePage[\s\S]*?await getCurrentRenderLabAccount\(\)[\s\S]*?if \(!account\) return Create\(\{ params, account \}\);[\s\S]*?<Suspense fallback=\{<RouteLoading surface="create"/);
  assert.match(create, /const owner = await getCreatePreviewOwner\(\)\.catch\(\(\) => null\);[\s\S]*?if \(!owner\) return CreatePreviewCreate\(\{ owner, hostedOnly \}\);[\s\S]*?<Suspense fallback=\{<RouteLoading surface="create"/);
  assert.match(activity, /return activityRedirect\(request\)/);
  assert.doesNotMatch(activity, /getCurrentRenderLabAccount|settleOwnerGeneration|Suspense/);
  assert.match(history, /!state.accountAvailable \? <PrivateHistory/);
  assert.match(history, /!state.jobs && state.jobsPending\) return <Loading/);
});

test("loading decoration uses the shared token owner and static reduced motion", async () => {
  const css = await read("src/components/shell/route-loading.module.css");
  const globals = await read("src/app/globals.css");
  const skeleton = await read("src/components/ui/skeleton.tsx");
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(|animation\s*:/i);
  assert.match(skeleton, /aria-hidden="true"/);
  assert.match(globals, /@media \(prefers-reduced-motion: no-preference\)\s*\{\s*\.rl-skeleton::after/);
  assert.match(globals, /animation: rl-skeleton-shimmer[^;]* 3;/);
});
