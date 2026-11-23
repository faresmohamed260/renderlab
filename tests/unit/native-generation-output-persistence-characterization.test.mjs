import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import "../helpers/generation-critical-path-runtime.mjs";

// Load the real implementation after the deterministic critical-path harness
// has installed only offline DB/R2/provider fixtures.
const facade = await import("../../src/server/generation/native-generation.ts");
const output = await import("../../src/server/generation/native-generation-output-persistence.ts");

test("output persistence has a direct stable facade seam without wrappers or duplicate writes", () => {
  assert.equal(facade.persistResult, output.persistResult);
  assert.equal(facade.recoverPersistingResult, output.recoverPersistingResult);
  for (const key of ["persistResult", "recoverPersistingResult"]) {
    assert.equal(typeof output[key], "function", key);
  }
});

test("R2 primary, thumbnail, media and CAS order stays explicit in the moved module", () => {
  const source = readFileSync(
    new URL("../../src/server/generation/native-generation-output-persistence.ts", import.meta.url),
    "utf8",
  );
  const persist = source.slice(source.indexOf("export async function persistResult("));
  assert.match(persist, /const existing = await getGeneratedOutput\(row, outputIndex\)/);
  assert.match(persist, /const assetId = deterministicGenerationAssetId\(row.id, outputIndex\)/);
  assert.match(persist, /injectGenerationFinalizationFault\("before-primary-write"\)/);
  assert.match(persist, /await writeR2Object\(\{ key: storageKey, contentType, body: bytes \}\)/);
  assert.match(persist, /injectGenerationFinalizationFault\("after-primary-write"\)/);
  assert.match(persist, /return persistGeneratedMedia\(\{/);
  assert.ok(persist.indexOf('injectGenerationFinalizationFault("before-primary-write")')
    < persist.indexOf('await writeR2Object({ key: storageKey, contentType, body: bytes })'));
  assert.ok(persist.indexOf('await writeR2Object({ key: storageKey, contentType, body: bytes })')
    < persist.indexOf('injectGenerationFinalizationFault("after-primary-write")'));

  const recovery = source.slice(source.indexOf("export async function recoverPersistingResult("),
    source.indexOf("export async function persistResult("));
  assert.match(recovery, /const existing = await getGeneratedOutput\(row, outputIndex\)/);
  assert.match(recovery, /const primary = await findDurableObject\(/);
  assert.match(recovery, /return persistGeneratedMedia\(\{/);

  // The pre-existing Unit 5 real-module harness proves recovery on R2
  // write failures, duplicate output convergence, and replay idempotency.
  assert.match(source, /await supabaseRest\("media_assets", \{/);
  assert.match(source, /return completeJobWithAsset\(row, raced.id\)/);
});
