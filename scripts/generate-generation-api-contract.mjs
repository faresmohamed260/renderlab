import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { buildGenerationOpenApi, buildGenerationCompatibility } from "./lib/generation-openapi.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const { generationApiContractSource } = await import("../src/lib/api/generation-api-source.ts");
const outputs = [
  ["docs/api/openapi.v1.json", buildGenerationOpenApi(generationApiContractSource)],
  ["docs/api/generation-compatibility.v1.json", buildGenerationCompatibility(generationApiContractSource)],
];
const fingerprintPaths = [
  "src/app/api/generation/jobs/route.ts",
  "src/app/api/generation/jobs/[jobId]/route.ts",
  "src/app/api/generation/jobs/[jobId]/cancel/route.ts",
  "src/app/api/generation/jobs/[jobId]/retry/route.ts",
  "src/app/api/generation/jobs/[jobId]/run-again/route.ts",
  "src/lib/api/generation-contract.ts",
  "src/lib/api/generation-cancel-contract.ts",
  "src/lib/api/generation-retry-contract.ts",
  "src/lib/api/generation-run-again-contract.ts",
  "src/lib/capabilities/generation.ts",
  "src/lib/capabilities/generation-job-state-machine.ts"
];
const runtimeHashes = Object.fromEntries(await Promise.all(fingerprintPaths.map(async (path) => {
  const bytes = await readFile(join(root, path));
  const sha = createHash("sha1").update("blob " + bytes.length + "\0").update(bytes).digest("hex");
  return [path, sha];
})));
outputs.push(["docs/api/generation-runtime-fingerprints.v1.json", {
  schemaVersion: 1,
  algorithm: "git-blob-sha1",
  purpose: "Review sentinel: changes to these runtime validators, type boundaries or API route handlers require intentional contract regeneration and compatibility review.",
  files: runtimeHashes,
}]);
const args = process.argv.slice(2);
const check = args.includes("--check");
if (args.some((arg) => arg !== "--check")) throw Error("Usage: node scripts/generate-generation-api-contract.mjs [--check]");
for (const [path, object] of outputs) {
  const full = join(root, path);
  const expected = JSON.stringify(object, null, 2) + "\n";
  if (check) {
    const found = await readFile(full, "utf8").catch(() => "");
    if (found !== expected) throw Error(path + " is stale: run npm run generate:api-contract, review the diff, and update the compatibility snapshot deliberately.");
  } else {
    await writeFile(full, expected, "utf8");
    process.stdout.write("Generated " + path + "\n");
  }
}
if (check) process.stdout.write("Generation OpenAPI 3.1 and compatibility snapshot: exact source match.\n");
