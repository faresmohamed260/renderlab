import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const sourceId = "12345678-1234-4234-8234-123456789abc";
const recipeId = "23456789-1234-4234-8234-123456789abc";
const owner = "owner-a";
const asset = { id: sourceId, kind: "image", mimeType: "image/png", originalFilename: "source.png" };
const reference = { alias: "image7", source: { type: "media-asset", id: sourceId }, label: "source.png", previewUrl: "/ignored" };
const recipe = {
  jobId: recipeId,
  request: { model: "fibo2-edit-turbo", prompt: "Edit @image7", inputs: [{ alias: "image7", source: reference.source, role: "primary-image" }],
    output: { kind: "image", aspectRatio: "4:3" }, advanced: { seed: 1234, steps: 7, negativePrompt: "blur" },
    vgl: '{"scene":"@image7"}' },
  references: [reference],
};
async function load() {
  return import("../../src/features/create/create-continuation.ts");
}
test("production route forwards continuation to the actual FIBO workspace", async () => {
  const page = await readFile(new URL("../../src/app/(app)/create/page.tsx", import.meta.url), "utf8");
  const workspace = await readFile(new URL("../../src/features/create/create-preview-workspace.tsx", import.meta.url), "utf8");
  assert.match(page, /<ProductionCreatePage params=\{params\}/);
  assert.match(page, /resolveCreateContinuation\(\s*params,\s*account\?\.id/);
  assert.match(page, /initialContinuation=\{continuation\.plan\}/);
  assert.match(workspace, /loadContinuationFiles\(initialContinuation,/);
  assert.match(workspace, /setFiles\(loaded\.map/);
  assert.match(workspace, /updateDraft\(initialContinuation\.mode,/);
  assert.match(workspace, /setSteps\(initialContinuation\.steps\)/);
});
test("source continuation is looked up for the acting owner and attaches the original asset", async () => {
  const { resolveCreateContinuation, loadContinuationFiles } = await load();
  const calls = [];
  const deps = { loadAsset: async (o, id) => { calls.push([o, id]); return o === owner ? asset : null; }, loadRecipe: async () => null };
  const { plan, error } = await resolveCreateContinuation({ source: sourceId, action: "edit-image" }, owner, true, deps);
  assert.equal(error, null);
  assert.deepEqual(calls, [[owner, sourceId]]);
  assert.equal(plan.mode, "edit");
  const attached = await loadContinuationFiles(plan, new AbortController().signal, async (reference) => {
    assert.deepEqual(reference.source, { type: "media-asset", id: sourceId });
    return new File([1], "source.png", { type: "image/png" });
  });
  assert.equal(attached[0].file.name, "source.png");
  assert.equal(attached[0].source.id, sourceId);
  const other = await resolveCreateContinuation({ source: sourceId, action: "edit-image" }, "owner-b", true, deps);
  assert.equal(other.plan, null);
  assert.match(other.error, /no longer available/);
});
test("recipe preserves supported draft, ordered references and geometry without replaying a job", async () => {
  const { resolveCreateContinuation } = await load();
  const deps = { loadAsset: async () => null, loadRecipe: async (o, id) => { assert.equal(o, owner); assert.equal(id, recipeId); return recipe; } };
  const { plan, error } = await resolveCreateContinuation({ recipe: recipeId }, owner, true, deps);
  assert.equal(error, null);
  assert.equal(plan.mode, "edit");
  assert.equal(plan.aspectRatio, "4:3");
  assert.equal(plan.prompt, "Edit @image1");
  assert.equal(plan.seed, "1234");
  assert.equal(plan.randomize, false);
  assert.equal(plan.steps, 7);
  assert.equal(plan.negativePrompt, "blur");
  assert.deepEqual(JSON.parse(plan.vgl), { scene: "<image_1>" });
  assert.equal(plan.references[0].source.id, sourceId);
});
test("stale, unsupported, mixed and unsigned continuations fail visibly without partial replay", async () => {
  const { resolveCreateContinuation } = await load();
  let reads = 0;
  const deps = { loadAsset: async () => { reads++; return null; }, loadRecipe: async () => { reads++; return null; } };
  const stale = await resolveCreateContinuation({ recipe: recipeId }, owner, true, deps);
  assert.equal(stale.plan, null);
  assert.match(stale.error, /can’t be reused/);
  const masked = await resolveCreateContinuation({ recipe: recipeId }, owner, true, { ...deps, loadRecipe: async () => ({ ...recipe, request: { ...recipe.request, mask: { type: "temporary-source", id: sourceId } } }) });
  assert.equal(masked.plan, null);
  assert.match(masked.error, /can’t be reused/);
  const mixed = await resolveCreateContinuation({ recipe: recipeId, source: sourceId, action: "edit-image" }, owner, true, deps);
  assert.match(mixed.error, /mixes/);
  const unsigned = await resolveCreateContinuation({ source: sourceId, action: "edit-image" }, undefined, true, deps);
  assert.match(unsigned.error, /Sign in/);
  assert.equal(reads, 1);
});
