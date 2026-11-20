import { verifyModalCutoverSmokeRelease } from "./lib/production-live-state.mjs";

try {
  const result = await verifyModalCutoverSmokeRelease({
    expectedSha: process.env.RENDERLAB_EXPECTED_PRODUCTION_SHA?.trim(),
    deploymentId: process.env.RENDERLAB_CUTOVER_DEPLOYMENT_ID?.trim(),
    scenario: process.env.RENDERLAB_FIBO_SMOKE_SCENARIO,
    vercelToken: process.env.VERCEL_TOKEN?.trim(),
  });
  console.log(`CUTOVER_SMOKE_RELEASE ${result.sha} ${result.deploymentId} ${result.domain}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
