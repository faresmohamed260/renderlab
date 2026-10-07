export const supportedNodeMajor = 24;
export const supportedNpmMajor = 11;

function majorOf(version) {
  const match = /^(?:v)?(\d+)(?:\.|$)/.exec(version ?? "");
  return match ? Number(match[1]) : null;
}

export function npmVersionFromUserAgent(userAgent) {
  const match = /(?:^|\s)npm\/([^\s]+)/.exec(userAgent ?? "");
  return match?.[1] ?? null;
}

export function assessDeveloperToolchain({ nodeVersion, npmVersion }) {
  const problems = [];
  const nodeMajor = majorOf(nodeVersion);
  const npmMajor = majorOf(npmVersion);

  if (nodeMajor !== supportedNodeMajor) {
    problems.push(`Node ${nodeVersion || "unknown"} is unsupported; RenderLab requires Node ${supportedNodeMajor}.x.`);
  }
  if (npmMajor !== supportedNpmMajor) {
    problems.push(`npm ${npmVersion || "unknown"} is unsupported; RenderLab requires npm ${supportedNpmMajor}.x.`);
  }

  return {
    ok: problems.length === 0,
    nodeVersion: nodeVersion || "unknown",
    npmVersion: npmVersion || "unknown",
    problems,
  };
}
