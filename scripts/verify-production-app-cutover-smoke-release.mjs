import { verifyProductionAppCutoverSmoke } from "./lib/production-app-cutover-smoke.mjs";

try {
  const readback = await verifyProductionAppCutoverSmoke({
    expectedSha: process.env.RENDERLAB_EXPECTED_PRODUCTION_SHA?.trim(),
    deploymentId: process.env.RENDERLAB_APP_CUTOVER_DEPLOYMENT_ID?.trim(),
    readinessRunId: process.env.RENDERLAB_APP_CUTOVER_READINESS_RUN_ID?.trim(),
    vercelToken: process.env.VERCEL_TOKEN?.trim(),
    githubToken: process.env.GITHUB_TOKEN?.trim(),
  });
  // Exact provider-qualified read-back, with no credential values or fixture identifiers.
  console.log("APP_CUTOVER_SMOKE_RELEASE " + JSON.stringify(readback));
} catch (error) {
  console.error(error instanceof Error ? error.message : "App cutover smoke preflight failed.");
  process.exitCode = 1;
}
