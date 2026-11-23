import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { generationRequestCorpus } from "../helpers/generation-contract-corpus.mjs";
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(new URL("../../src/" + specifier.slice(2) + ".ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const before = await import("../fixtures/generation-contract-legacy.ts");
const after = await import("../../src/lib/api/generation-contract.ts");
const { generationApiSchemas, matchesGenerationApiSchema,
  generationErrorEnvelopeSchema, generationApiContractSource } =
  await import("../../src/lib/api/generation-api-schemas.ts");
const { generationJobStatuses } = await import("../../src/lib/capabilities/generation-job-state-machine.ts");

test("1,128 baseline inputs match legacy parser exactly (acceptance, normalization, error code AND message)", () => {
  assert.equal(generationRequestCorpus.length, 1128);
  for (const { name, input } of generationRequestCorpus) {
    const oldResult = before.parseGenerationRequest(input);
    const newResult = after.parseGenerationRequest(input);
    assert.deepEqual(newResult, oldResult, "regression input: " + name);
    assert.deepEqual(generationApiSchemas.request.parse(input), oldResult,
      "route-facing executable schema: " + name);
    if (newResult.ok && input !== undefined) {
      // Test precisely what a JSON/HTTP client can send (not JS-only undefined).
      const jsonValue = JSON.parse(JSON.stringify(input));
      assert.equal(matchesGenerationApiSchema(jsonValue, generationApiSchemas.request.schema),
        true, "accepted JSON input must not be contradicted by exported structural schema: " + name);
    }
  }
});

test("response envelope schemas execute and error taxonomy remains one source", () => {
  const source = generationApiContractSource;
  assert.deepEqual([...source.schemas.GenerationJob.properties.status.enum], [...generationJobStatuses]);
  const job = {
    id:"10000000-0000-4000-8000-000000000001",status:"succeeded",
    operation:"create-image",createdAt:"2026-11-23T12:00:00Z",
    updatedAt:"2026-11-23T12:01:00Z",outputAssetIds:[],
  };
  assert.equal(matchesGenerationApiSchema({ok:true,job},generationApiSchemas.response.success),true);
  assert.equal(matchesGenerationApiSchema({ok:true,job:{...job,status:"unknown"}},
    generationApiSchemas.response.success),false);
  for (const [operation,codes] of Object.entries(source.domainErrors)) {
    const schema = generationErrorEnvelopeSchema(codes);
    for (const code of codes) {
      assert.equal(matchesGenerationApiSchema({ok:false,error:{code,message:"sanitized"}},schema),
        true,operation + ":" + code);
    }
    assert.equal(matchesGenerationApiSchema({ok:false,error:{code:"unlisted_failure",message:"no"}},schema),
      false,operation);
  }
  const capabilities = source.schemas.GenerationCapabilities;
  assert.equal(matchesGenerationApiSchema({available:false},capabilities),true);
  assert.equal(matchesGenerationApiSchema({available:true,fiboAvailable:true},capabilities),true);
  assert.equal(matchesGenerationApiSchema({available:true,fiboAvailable:false},capabilities),false);
});
