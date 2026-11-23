import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import {
  generationRequestCorpus, explicitCaseCount, generatedCaseCount,
} from "../helpers/generation-contract-corpus.mjs";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL("../../src/" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { parseGenerationRequest } = await import("../../src/lib/api/generation-contract.ts");

test("generated request corpus characterizes existing FIBO parser before refactor", () => {
  assert.equal(explicitCaseCount, 104, "deliberate cases are reviewable");
  assert.equal(generatedCaseCount, 1024, "generated cases use a fixed PRNG seed");
  assert.equal(generationRequestCorpus.length, 1128);
  let accepted = 0;
  let rejected = 0;
  const seen = new Set();
  for (const {name, input, accepted: expected} of generationRequestCorpus) {
    assert.ok(!seen.has(name), "duplicate corpus name: " + name);
    seen.add(name);
    const outcome = parseGenerationRequest(input);
    if (expected !== undefined) {
      assert.equal(outcome.ok, expected, "named characterization: " + name);
    }
    if (outcome.ok) {
      accepted++;
      assert.equal(outcome.request.output.kind, "image", name);
      assert.equal(outcome.request.model, "fibo2-edit-turbo", name);
      assert.ok(Array.isArray(outcome.request.inputs), name);
    } else {
      rejected++;
      assert.equal(outcome.error.code, "invalid_request", name);
      assert.equal(typeof outcome.error.message, "string", name);
    }
  }
  assert.ok(accepted > 255, "corpus must include substantial admitted input coverage");
  assert.ok(rejected > 300, "corpus must include substantial rejection coverage");
});

test("old validator normalizes fields; baseline examples are frozen before migration", () => {
  const accepted = parseGenerationRequest({
    prompt: "  Morning  ", model: "fibo2-edit-turbo",
    output: { kind: "image", aspectRatio: "original" },
    inputs: [{
      role: "primary-image", source: { type: "media-asset", id: "  source-id  " },
    }],
  });
  assert.deepEqual(accepted, { ok: true, request: {
    model: "fibo2-edit-turbo", prompt: "Morning",
    output: {kind:"image",aspectRatio:"original"},
    inputs:[{alias:"image1",role:"primary-image",source:{type:"media-asset",id:"source-id"}}],
  } });
  const rejected = parseGenerationRequest({
    prompt:"hello",inputs:[],model:"flux2-klein-9b",
    output:{kind:"image",aspectRatio:"1:1"},
  });
  assert.deepEqual(rejected, {ok:false,error:{
    code:"invalid_request", message:"Unsupported model for the selected output type.",
  }});
});
