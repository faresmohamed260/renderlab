import { isAbsolute, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const unitCoverageMetricNames = ["statements", "lines", "functions", "branches"];

function normalizeSlashes(value) {
  return value.replaceAll("\\", "/");
}

function normalizeRepositoryPath(value) {
  return normalizeSlashes(value).replace(/^\.\//, "");
}

export function isEligibleUnitCoverageSource(file) {
  const normalized = normalizeRepositoryPath(file);
  return (
    normalized.startsWith("src/") &&
    (normalized.endsWith(".ts") || normalized.endsWith(".tsx")) &&
    !normalized.endsWith(".d.ts")
  );
}

export function eligibleUnitCoverageSources(gitLsFilesOutput) {
  return [...new Set(
    gitLsFilesOutput
      .split("\0")
      .map((file) => normalizeRepositoryPath(file))
      .filter(Boolean)
      .filter(isEligibleUnitCoverageSource),
  )].sort();
}

export function repositoryRelativeCoveragePath(reportPath, repositoryRoot) {
  if (typeof reportPath !== "string" || reportPath.length === 0 || reportPath.includes("\0")) return null;

  let filesystemPath = reportPath;
  if (reportPath.startsWith("file:")) {
    try {
      filesystemPath = fileURLToPath(reportPath);
    } catch {
      return null;
    }
  }

  const candidate = isAbsolute(filesystemPath)
    ? relative(repositoryRoot, filesystemPath)
    : filesystemPath;
  const normalized = normalizeRepositoryPath(candidate);

  if (
    normalized.length === 0 ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    return null;
  }

  return normalized;
}

function validateMetric(metric, label, problems) {
  if (!metric || typeof metric !== "object" || Array.isArray(metric)) {
    problems.push(`${label} is missing or invalid.`);
    return;
  }

  for (const key of ["total", "covered", "skipped"]) {
    if (!Number.isInteger(metric[key]) || metric[key] < 0) {
      problems.push(`${label}.${key} must be a non-negative integer.`);
    }
  }

  if (Number.isInteger(metric.total) && Number.isInteger(metric.covered) && metric.covered > metric.total) {
    problems.push(`${label}.covered cannot exceed ${label}.total.`);
  }

  if (!Number.isFinite(metric.pct) || metric.pct < 0 || metric.pct > 100) {
    problems.push(`${label}.pct must be a finite percentage between 0 and 100.`);
  }
}

function validateCoverageEntry(entry, label, problems) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    problems.push(`${label} is missing or invalid.`);
    return;
  }

  for (const metricName of unitCoverageMetricNames) {
    validateMetric(entry[metricName], `${label}.${metricName}`, problems);
  }
}

export function assessUnitCoverageReport({
  summary,
  eligibleSources,
  repositoryRoot,
  proofSource = null,
}) {
  const problems = [];
  const expectedSources = [...new Set(eligibleSources.map(normalizeRepositoryPath))]
    .filter(isEligibleUnitCoverageSource)
    .sort();
  const expected = new Set(expectedSources);

  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    return {
      ok: false,
      problems: ["coverage-summary.json must contain a JSON object."],
      totals: null,
      reportedSources: [],
    };
  }

  validateCoverageEntry(summary.total, "total", problems);

  const reportedSources = [];
  const reported = new Map();
  for (const [rawPath, entry] of Object.entries(summary)) {
    if (rawPath === "total") continue;

    const normalizedPath = repositoryRelativeCoveragePath(rawPath, repositoryRoot);
    if (!normalizedPath) {
      problems.push(`Coverage report path is outside the repository or invalid: ${rawPath}`);
      continue;
    }
    if (!isEligibleUnitCoverageSource(normalizedPath)) {
      problems.push(`Coverage report contains an out-of-scope source path: ${normalizedPath}`);
      continue;
    }
    if (reported.has(normalizedPath)) {
      problems.push(`Coverage report contains duplicate source entries for ${normalizedPath}.`);
      continue;
    }

    validateCoverageEntry(entry, normalizedPath, problems);
    reported.set(normalizedPath, entry);
    reportedSources.push(normalizedPath);
  }
  reportedSources.sort();

  if (reportedSources.length === 0) {
    problems.push("coverage-summary.json contains no per-file source entries.");
  }

  for (const source of expectedSources) {
    if (!reported.has(source)) problems.push(`Eligible source is missing from unit coverage: ${source}`);
  }
  for (const source of reportedSources) {
    if (!expected.has(source)) problems.push(`Unit coverage contains unexpected source: ${source}`);
  }

  if (reportedSources.length !== expectedSources.length) {
    problems.push(
      `Unit coverage denominator mismatch: expected ${expectedSources.length} eligible source files, reported ${reportedSources.length}.`,
    );
  }

  if (proofSource) {
    const normalizedProofSource = normalizeRepositoryPath(proofSource);
    if (!expected.has(normalizedProofSource)) {
      problems.push(`Configured all-source proof file is no longer eligible: ${normalizedProofSource}`);
    } else if (!reported.has(normalizedProofSource)) {
      problems.push(`All-source proof file is missing from the report: ${normalizedProofSource}`);
    }
  }

  if (summary.total && typeof summary.total === "object") {
    for (const metricName of unitCoverageMetricNames) {
      const totalMetric = summary.total[metricName];
      if (!totalMetric || typeof totalMetric !== "object") continue;

      let summedTotal = 0;
      let summedCovered = 0;
      let summedSkipped = 0;
      let canCompare = true;

      for (const entry of reported.values()) {
        const metric = entry?.[metricName];
        if (
          !metric ||
          !Number.isInteger(metric.total) ||
          !Number.isInteger(metric.covered) ||
          !Number.isInteger(metric.skipped)
        ) {
          canCompare = false;
          break;
        }
        summedTotal += metric.total;
        summedCovered += metric.covered;
        summedSkipped += metric.skipped;
      }

      if (
        canCompare &&
        Number.isInteger(totalMetric.total) &&
        Number.isInteger(totalMetric.covered) &&
        Number.isInteger(totalMetric.skipped) &&
        (summedTotal !== totalMetric.total ||
          summedCovered !== totalMetric.covered ||
          summedSkipped !== totalMetric.skipped)
      ) {
        problems.push(
          `total.${metricName} does not match the sum of per-file coverage entries.`,
        );
      }
    }
  }

  const totals = summary.total
    ? Object.fromEntries(
        unitCoverageMetricNames.map((metricName) => [metricName, summary.total?.[metricName]?.pct]),
      )
    : null;

  return {
    ok: problems.length === 0,
    problems,
    totals,
    reportedSources,
  };
}
