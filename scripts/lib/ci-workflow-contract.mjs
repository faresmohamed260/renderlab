const SETUP_ACTION_PATH = ".github/actions/setup-node-project/action.yml";
const SETUP_ACTION_REF = "./.github/actions/setup-node-project";
const START_HELPER_PATH = "scripts/start-ci-app.mjs";
const SETUP_NODE_REF = "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020";

const cohort = {
  "create-lifecycle-visual.yml": {
    timeoutMinutes: 20,
    healthUrl: "http://127.0.0.1:3000/",
    verifier: "node scripts/verify-create-lifecycle.mjs",
    cleanup: "node scripts/verify-create-lifecycle.mjs --cleanup-only",
    artifactName: "renderlab-create-lifecycle-screenshots",
    artifactPath: "artifacts/create-lifecycle-*.png",
    secrets: [
      "SUPABASE_SERVICE_ROLE_KEY",
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
    ],
  },
  "activity-visual.yml": {
    timeoutMinutes: 15,
    healthUrl: "http://127.0.0.1:3000/activity",
    verifier: "node scripts/verify-activity.mjs",
    cleanup: "node scripts/verify-activity.mjs --cleanup-only",
    artifactName: "renderlab-activity-screenshots",
    artifactPath: "artifacts/activity-*.png",
    secrets: ["SUPABASE_SERVICE_ROLE_KEY"],
    concurrency: {
      group: "renderlab-activity-${{ github.ref }}",
      cancelInProgress: false,
    },
  },
  "library-lifecycle-visual.yml": {
    timeoutMinutes: 15,
    healthUrl: "http://127.0.0.1:3000/library",
    verifier: "node scripts/verify-library-lifecycle.mjs",
    cleanup: "node scripts/verify-library-lifecycle.mjs --cleanup-only",
    artifactName: "renderlab-library-lifecycle-screenshots",
    artifactPath: "artifacts/library-lifecycle-*.png",
    secrets: [
      "SUPABASE_SERVICE_ROLE_KEY",
      "R2_ACCOUNT_ID",
      "R2_ACCESS_KEY_ID",
      "R2_SECRET_ACCESS_KEY",
      "R2_BUCKET_NAME",
      "CLOUDFLARE_API_TOKEN",
      "CF_API_TOKEN",
      "CLOUDFLARE_TOKEN",
      "CF_TOKEN",
      "CLOUDFLARE_R2_ADMIN_TOKEN",
    ],
    concurrency: {
      group: "renderlab-library-lifecycle-shared",
      cancelInProgress: false,
    },
  },
  "account-identity-visual.yml": {
    timeoutMinutes: 15,
    healthUrl: "http://127.0.0.1:3000/settings",
    verifier: "node scripts/verify-account-identity.mjs",
    cleanup: "node scripts/verify-account-identity.mjs --cleanup-only",
    artifactName: "renderlab-account-identity-screenshots",
    artifactPath: "artifacts/account-identity-*.png",
    secrets: ["SUPABASE_SERVICE_ROLE_KEY"],
  },
};

function countOccurrences(value, needle) {
  if (!needle) return 0;
  let count = 0;
  let offset = 0;
  while ((offset = value.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

function hasAlwaysCleanup(workflow, cleanupCommand) {
  const lines = workflow.split(/\r?\n/);
  const commandIndex = lines.findIndex((line) => line.includes(cleanupCommand));
  if (commandIndex < 0) return false;
  return lines
    .slice(Math.max(0, commandIndex - 3), commandIndex)
    .some((line) => /^\s*if:\s*always\(\)\s*$/.test(line));
}

function hasProtectedConcurrency(workflow, expected) {
  const lines = workflow.split(/\r?\n/);
  const groupIndex = lines.findIndex((line) => line.trim() === `group: ${expected.group}`);
  if (groupIndex < 0) return false;
  return lines
    .slice(groupIndex + 1, groupIndex + 4)
    .some((line) => line.trim() === `cancel-in-progress: ${String(expected.cancelInProgress)}`);
}

export function findImmutableActionRefProblems(files) {
  const problems = [];

  for (const file of files) {
    const lines = file.content.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      const usesMatch = line.match(/\buses:\s*([^\s#]+)/);
      if (!usesMatch) continue;

      const actionRef = usesMatch[1];
      if (actionRef.startsWith("./") || actionRef.startsWith("docker://")) continue;

      const atIndex = actionRef.lastIndexOf("@");
      const revision = atIndex >= 0 ? actionRef.slice(atIndex + 1) : "";
      if (!/^[0-9a-f]{40}$/i.test(revision)) {
        problems.push(`${file.path}:${index + 1} uses a non-immutable external action ref: ${actionRef}`);
      }
    }
  }

  return problems;
}

export function assessCiWorkflowContract({ setupAction, workflows }) {
  const problems = [];

  if (typeof setupAction !== "string" || setupAction.length === 0) {
    return { ok: false, problems: [`${SETUP_ACTION_PATH} is missing`] };
  }

  if (/\$\{\{\s*secrets\./.test(setupAction)) {
    problems.push(`${SETUP_ACTION_PATH} must remain secret-free`);
  }
  if (countOccurrences(setupAction, `uses: ${SETUP_NODE_REF}`) !== 1) {
    problems.push(`${SETUP_ACTION_PATH} must use the approved immutable actions/setup-node ref exactly once`);
  }
  if (!/\bnode-version:\s*24\b/.test(setupAction)) {
    problems.push(`${SETUP_ACTION_PATH} must select Node 24`);
  }
  if (!/\bcache:\s*npm\b/.test(setupAction) || !/\bcache-dependency-path:\s*package\.json\b/.test(setupAction)) {
    problems.push(`${SETUP_ACTION_PATH} must preserve the npm cache contract for package.json`);
  }

  const setupRuns = [...setupAction.matchAll(/^\s*run:\s*(.+?)\s*$/gm)].map((match) => match[1]);
  if (setupRuns.length !== 1 || setupRuns[0] !== "npm ci --no-audit --no-fund") {
    problems.push(`${SETUP_ACTION_PATH} may run only deterministic npm ci dependency installation`);
  }
  if (/npm run build|playwright|chromium|npm run start|upload-artifact|cleanup|supabase|r2_/i.test(setupAction)) {
    problems.push(`${SETUP_ACTION_PATH} contains responsibilities outside toolchain setup and dependency installation`);
  }

  for (const [filename, expected] of Object.entries(cohort)) {
    const workflow = workflows?.[filename];
    if (typeof workflow !== "string" || workflow.length === 0) {
      problems.push(`${filename} is missing from the ENT-010 cohort`);
      continue;
    }

    if (!workflow.includes(`"${SETUP_ACTION_PATH}"`) && !workflow.includes(`'${SETUP_ACTION_PATH}'`)) {
      problems.push(`${filename} pull_request paths must include ${SETUP_ACTION_PATH}`);
    }
    if (!workflow.includes(`"${START_HELPER_PATH}"`) && !workflow.includes(`'${START_HELPER_PATH}'`)) {
      problems.push(`${filename} pull_request paths must include ${START_HELPER_PATH}`);
    }
    if (!/^permissions:\s*\r?\n\s+contents:\s*read\s*$/m.test(workflow)) {
      problems.push(`${filename} must preserve contents: read permissions`);
    }
    if (!new RegExp(`timeout-minutes:\\s*${expected.timeoutMinutes}\\b`).test(workflow)) {
      problems.push(`${filename} must preserve timeout-minutes: ${expected.timeoutMinutes}`);
    }

    const checkoutIndex = workflow.indexOf("uses: actions/checkout@");
    const setupIndex = workflow.indexOf(`uses: ${SETUP_ACTION_REF}`);
    if (checkoutIndex < 0 || setupIndex < 0 || setupIndex < checkoutIndex) {
      problems.push(`${filename} must use the approved local setup action after checkout`);
    }
    if (countOccurrences(workflow, `uses: ${SETUP_ACTION_REF}`) !== 1) {
      problems.push(`${filename} must use the approved local setup action exactly once`);
    }
    if (workflow.includes("uses: actions/setup-node@")) {
      problems.push(`${filename} must not bypass the local setup action with direct actions/setup-node usage`);
    }
    if (/^\s*run:\s*npm ci\b/m.test(workflow)) {
      problems.push(`${filename} must not duplicate npm ci outside the local setup action`);
    }

    const buildIndex = workflow.indexOf("run: npm run build");
    const chromiumIndex = workflow.indexOf("run: npx playwright install --with-deps chromium");
    const startupIndex = workflow.indexOf(`node ${START_HELPER_PATH}`);
    if (buildIndex < 0 || chromiumIndex < 0 || startupIndex < 0 || !(buildIndex < chromiumIndex && chromiumIndex < startupIndex)) {
      problems.push(`${filename} must preserve build -> Chromium -> configured-app startup ordering`);
    }

    for (const requiredStartupText of [
      `--health-url ${expected.healthUrl}`,
      "--port 3000",
      "--timeout-ms 60000",
      "--log-file \"$RUNNER_TEMP/renderlab-next.log\"",
      "--pid-file \"$RUNNER_TEMP/renderlab-next.pid\"",
    ]) {
      if (!workflow.includes(requiredStartupText)) {
        problems.push(`${filename} startup helper must preserve ${requiredStartupText}`);
      }
    }

    if (!workflow.includes(expected.verifier)) {
      problems.push(`${filename} must preserve verifier command ${expected.verifier}`);
    }
    if (!workflow.includes(expected.cleanup)) {
      problems.push(`${filename} must preserve cleanup command ${expected.cleanup}`);
    } else if (!hasAlwaysCleanup(workflow, expected.cleanup)) {
      problems.push(`${filename} cleanup must remain guarded by if: always()`);
    }

    if (!workflow.includes(`name: ${expected.artifactName}`) || !workflow.includes(`path: ${expected.artifactPath}`)) {
      problems.push(`${filename} must preserve its artifact name and path contract`);
    }
    if (!workflow.includes("if-no-files-found: warn") || !workflow.includes("retention-days: 14")) {
      problems.push(`${filename} must preserve artifact missing-file and retention behavior`);
    }

    for (const secretName of expected.secrets) {
      if (!workflow.includes(`secrets.${secretName}`)) {
        problems.push(`${filename} must preserve secret reference ${secretName}`);
      }
    }

    if (expected.concurrency && !hasProtectedConcurrency(workflow, expected.concurrency)) {
      problems.push(
        `${filename} must preserve concurrency group ${expected.concurrency.group} with cancel-in-progress: ${expected.concurrency.cancelInProgress}`,
      );
    }
  }

  return { ok: problems.length === 0, problems };
}

export const ciWorkflowContractPaths = {
  setupActionPath: SETUP_ACTION_PATH,
  startHelperPath: START_HELPER_PATH,
  cohortFiles: Object.keys(cohort),
};
