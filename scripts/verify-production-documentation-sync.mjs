import { verifyProductionDocumentationSync } from "./lib/production-documentation-sync.mjs";

const expectedSha =
  process.env.RENDERLAB_EXPECTED_PRODUCTION_SHA?.trim() ||
  process.argv.find((value) => /^[0-9a-f]{40}$/i.test(value)) ||
  "";

try {
  const results = await verifyProductionDocumentationSync({ expectedSha });
  for (const result of results) {
    console.log(`PRODUCTION_DOC_SYNC ${result.path} ${result.sha} [${result.heading}]`);
  }
  console.log(`Production documentation sync passed for ${expectedSha.toLowerCase()}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
