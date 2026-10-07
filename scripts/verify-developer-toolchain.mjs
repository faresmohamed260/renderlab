import {
  assessDeveloperToolchain,
  npmVersionFromUserAgent,
  supportedNodeMajor,
  supportedNpmMajor,
} from "./lib/developer-toolchain.mjs";

const npmVersion = npmVersionFromUserAgent(process.env.npm_config_user_agent);

if (!npmVersion) {
  console.error(
    `RenderLab could not determine the active npm version. Run this check through \`npm run doctor\` with Node ${supportedNodeMajor}.x and npm ${supportedNpmMajor}.x.`,
  );
  process.exit(1);
}

const assessment = assessDeveloperToolchain({
  nodeVersion: process.versions.node,
  npmVersion,
});

if (!assessment.ok) {
  console.error("RenderLab developer toolchain check failed:");
  for (const problem of assessment.problems) console.error(`- ${problem}`);
  console.error(`Use Node ${supportedNodeMajor}.x with npm ${supportedNpmMajor}.x, then rerun \`npm run doctor\`.`);
  process.exit(1);
}

console.log(`RenderLab developer toolchain OK: Node ${assessment.nodeVersion}, npm ${assessment.npmVersion}.`);
