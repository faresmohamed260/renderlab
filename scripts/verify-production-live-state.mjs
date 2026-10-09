import { readProductionManifest } from "./lib/production-documentation-sync.mjs";
import { verifyProductionLiveState } from "./lib/production-live-state.mjs";

try {
  const manifest = await readProductionManifest();
  const result = await verifyProductionLiveState({
    manifest,
    vercelToken: process.env.VERCEL_TOKEN?.trim(),
    githubToken: process.env.GITHUB_TOKEN?.trim(),
    vercelTeamId: process.env.RENDERLAB_VERCEL_TEAM_ID?.trim(),
    vercelProjectId: process.env.RENDERLAB_VERCEL_PROJECT_ID?.trim(),
    githubRepository: process.env.GITHUB_REPOSITORY?.trim(),
  });
  console.log(
    `PRODUCTION_LIVE_STATE ${result.applicationSha} ${result.deploymentId} ${result.domain} rollback=${result.rollbackDeploymentId} matrix=${result.releaseMatrixRunId} cutover=${result.cutoverAt}`,
  );
  console.log("Read-only production verification passed against GitHub and Vercel.");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
