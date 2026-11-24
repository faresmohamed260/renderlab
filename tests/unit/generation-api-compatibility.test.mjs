import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  buildGenerationOpenApi, buildGenerationCompatibility,
} from "../../scripts/lib/generation-openapi.mjs";
const { generationApiContractSource: source } =
  await import("../../src/lib/api/generation-api-source.ts");

async function committed(path) {
  return JSON.parse(await readFile(new URL("../../" + path, import.meta.url), "utf8"));
}
test("OpenAPI 3.1 source regeneration and compatibility snapshot are exact", async () => {
  assert.deepEqual(await committed("docs/api/openapi.v1.json"),buildGenerationOpenApi(source));
  assert.deepEqual(await committed("docs/api/generation-compatibility.v1.json"),
    buildGenerationCompatibility(source));
  const contract = buildGenerationOpenApi(source);
  assert.equal(contract.openapi,"3.1.0");
  assert.equal(contract.info.version,"1.1.0");
  assert.equal(Object.keys(contract.paths).length,5);
  assert.equal(source.endpoints.length,6);
  assert.deepEqual(contract.components.schemas.GenerationRequest.properties.model,
    {const:"fibo2-edit-turbo"});
  assert.deepEqual(contract.components.schemas.GenerationRequest.properties.output.properties.kind,
    {const:"image"});
  assert.equal(contract.components.schemas.GenerationRequest["x-renderlab-semantic-rules"].length,10);
  assert.ok(contract["x-renderlab-idempotency"].request.includes("Optional Idempotency-Key"));
  assert.equal(contract.paths["/api/generation/jobs"].post.parameters[0].name,"Idempotency-Key");
});

test("contract enumerates every existing route status envelope and preserves idempotency boundaries", () => {
  const endpoints = source.endpoints;
  const unique = new Set(endpoints.map(x=>x.method+" "+x.path));
  assert.equal(unique.size,6);
  const expected = {
    "get /api/generation/jobs":"200",
    "post /api/generation/jobs":"202,400,401,403,409,429,502,503",
    "get /api/generation/jobs/{jobId}":"200,400,401,404,503",
    "post /api/generation/jobs/{jobId}/cancel":"200,202,400,401,403,404,409,503",
    "post /api/generation/jobs/{jobId}/retry":"202,400,401,403,404,409,429,502,503",
    "post /api/generation/jobs/{jobId}/run-again":"202,400,401,403,404,409,429,502,503",
  };
  for (const endpoint of endpoints) {
    const key = endpoint.method+" "+endpoint.path;
    const actual = [...Object.keys(endpoint.success),...Object.keys(endpoint.errors)]
      .map(Number).sort((a,b)=>a-b).join(",");
    assert.equal(actual,expected[key],key);
    for (const errors of Object.values(endpoint.errors)) {
      for (const code of errors) assert.equal(typeof code,"string");
    }
  }
  assert.ok(source.idempotency.dispatch.includes("outbox"));
  assert.ok(source.idempotency.finalization.includes("Unique output index"));
  assert.ok(source.versioning.policy.includes("Major"));
});

test("source fingerprint snapshot fails when a route or validator changes without review", async () => {
  const snapshot = await committed("docs/api/generation-runtime-fingerprints.v1.json");
  assert.equal(snapshot.schemaVersion, 1);
  assert.equal(snapshot.algorithm, "git-blob-sha1");
  assert.equal(Object.keys(snapshot.files).length, 11);
  for (const [path, expected] of Object.entries(snapshot.files)) {
    const bytes = await readFile(new URL("../../" + path, import.meta.url));
    const actual = createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");
    assert.equal(actual, expected, "changed runtime API source needs deliberate regeneration: " + path);
  }
});

test("F4: generated OpenAPI explicitly rejects an Idempotency-Key on non-FIBO requests", () => {
  const contract = buildGenerationOpenApi(source);
  const post = contract.paths["/api/generation/jobs"].post;
  assert.match(post.parameters[0].description, /non-FIBO.*400/i);
  assert.match(post.description, /non-FIBO.*400/i);
  assert.match(contract["x-renderlab-idempotency"].request, /non-FIBO.*400/i);
  assert.deepEqual(post.responses["400"].content["application/json"].schema.properties.error.properties.code.enum, ["invalid_request"]);
});
