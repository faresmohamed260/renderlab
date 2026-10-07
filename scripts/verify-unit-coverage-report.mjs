import { spawnSync } from "node:child_process";
import { appendFile, readFile, writeFile } from "node:fs/promises";

import {
  assessUnitCoverageReport,
  eligibleUnitCoverageSources,
  isEligibleUnitCoverageSource,
  repositoryRelativeCoveragePath,
  unitCoverageMetricNames,
} from "./lib/unit-coverage-report.mjs";

const coverageSummaryPath = "coverage/coverage-summary.json";
const lcovPath = "coverage/lcov.info";
const allSourceProofFile = "src/app/page.tsx";
const repositoryRoot = process.cwd();

const git = spawnSync("git", ["ls-files", "-z", "src"], {
  encoding: "utf8",
  windowsHide: true,
});
if (git.error) throw git.error;
if (git.status !== 0) {
  throw new Error(`git ls-files failed: ${(git.stderr || "unknown git error").trim()}`);
}

const eligibleSources = eligibleUnitCoverageSources(git.stdout);
if (eligibleSources.length === 0) {
  throw new Error("No eligible src/**/*.ts(x) files were found for unit coverage.");
}

const [summaryText, lcovText] = await Promise.all([
  readFile(coverageSummaryPath, "utf8"),
  readFile(lcovPath, "utf8"),
]);

let rawSummary;
try {
  rawSummary = JSON.parse(summaryText);
} catch (error) {
  throw new Error(`${coverageSummaryPath} is not valid JSON: ${error.message}`);
}

if (!rawSummary || typeof rawSummary !== "object" || Array.isArray(rawSummary)) {
  throw new Error(`${coverageSummaryPath} must contain a JSON object.`);
}

const normalizedSummary = { total: rawSummary.total };
for (const [rawPath, entry] of Object.entries(rawSummary)) {
  if (rawPath === "total") continue;
  const normalizedPath = repositoryRelativeCoveragePath(rawPath, repositoryRoot);
  if (!normalizedPath || !isEligibleUnitCoverageSource(normalizedPath)) {
    throw new Error(`Unsafe or out-of-scope coverage summary path: ${rawPath}`);
  }
  if (Object.prototype.hasOwnProperty.call(normalizedSummary, normalizedPath)) {
    throw new Error(`Duplicate coverage summary path after normalization: ${normalizedPath}`);
  }
  normalizedSummary[normalizedPath] = entry;
}

const assessment = assessUnitCoverageReport({
  summary: normalizedSummary,
  eligibleSources,
  repositoryRoot,
  proofSource: allSourceProofFile,
});
if (!assessment.ok) {
  throw new Error(`Unit coverage report integrity failed:\n- ${assessment.problems.join("\n- ")}`);
}

const normalizedLcovLines = [];
let lcovSourceCount = 0;
for (const line of lcovText.replaceAll("\r\n", "\n").split("\n")) {
  if (!line.startsWith("SF:")) {
    normalizedLcovLines.push(line);
    continue;
  }

  const rawPath = line.slice(3);
  const normalizedPath = repositoryRelativeCoveragePath(rawPath, repositoryRoot);
  if (!normalizedPath || !isEligibleUnitCoverageSource(normalizedPath)) {
    throw new Error(`Unsafe or out-of-scope LCOV source path: ${rawPath}`);
  }
  normalizedLcovLines.push(`SF:${normalizedPath}`);
  lcovSourceCount += 1;
}
if (lcovSourceCount === 0) {
  throw new Error(`${lcovPath} contains no source-file records.`);
}

await Promise.all([
  writeFile(coverageSummaryPath, `${JSON.stringify(normalizedSummary, null, 2)}\n`, "utf8"),
  writeFile(lcovPath, `${normalizedLcovLines.join("\n").replace(/\n+$/, "")}\n`, "utf8"),
]);

const zeroLineCoveredSources = assessment.reportedSources.filter(
  (source) => normalizedSummary[source]?.lines?.total > 0 && normalizedSummary[source]?.lines?.covered === 0,
);
const totals = assessment.totals;

console.log(
  `Unit coverage integrity passed for ${assessment.reportedSources.length} tracked source files; ${zeroLineCoveredSources.length} currently have zero line coverage.`,
);
console.log(
  unitCoverageMetricNames
    .map((metricName) => `${metricName}=${totals[metricName]}%`)
    .join(" "),
);

if (process.argv.includes("--github-summary")) {
  const summaryTarget = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryTarget) {
    throw new Error("--github-summary requires GITHUB_STEP_SUMMARY to be set by GitHub Actions.");
  }

  const rows = unitCoverageMetricNames
    .map((metricName) => `| ${metricName[0].toUpperCase()}${metricName.slice(1)} | ${totals[metricName]}% |`)
    .join("\n");
  const markdown = [
    "## Unit coverage",
    "",
    "All eligible tracked `src/**/*.ts` and `src/**/*.tsx` product source is in the denominator; declaration-only `.d.ts` files are excluded.",
    "",
    "| Metric | Coverage |",
    "| --- | ---: |",
    rows,
    "",
    `Reported source files: **${assessment.reportedSources.length}**`,
    "",
    `Files currently at zero line coverage: **${zeroLineCoveredSources.length}**`,
    "",
    "This is Node unit coverage only; configured browser, shared-resource, provider-backed, and production acceptance remain separate verification layers.",
    "",
  ].join("\n");
  await appendFile(summaryTarget, markdown, "utf8");
}
