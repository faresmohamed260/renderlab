import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const PRODUCTION_MANIFEST_PATH = "docs/production/current.json";
export const PRODUCTION_DOCUMENTATION_AUTHORITIES = Object.freeze([
  "PROJECT.md",
  "docs/ui/UI_MIGRATION.md",
  "docs/ui/SCREEN_REGISTRY.md",
  "docs/architecture/INFRASTRUCTURE.md",
]);
export const PRODUCTION_STATUS_SUMMARY = "docs/STATUS.md";

export const PRODUCTION_SHA_MARKER_TOKEN = "RENDERLAB_CURRENT_PRODUCTION_SHA:";
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const DEPLOYMENT_ID_PATTERN = /^dpl_[A-Za-z0-9]+$/;
const MARKER_PATTERN = /<!--\s*RENDERLAB_CURRENT_PRODUCTION_SHA:\s*([0-9a-f]{40})\s*-->/gi;

function assertExactSha(value, label) {
  if (!SHA_PATTERN.test(value || "")) {
    throw new Error(`${label} must be an exact 40-character Git SHA.`);
  }
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function assertIsoTimestamp(value, label) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    throw new Error(`${label} must be an exact ISO-8601 UTC timestamp.`);
  }
}

export function validateProductionManifest(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("production manifest must be a JSON object.");
  }
  if (manifest.schemaVersion !== 1) {
    throw new Error("production manifest schemaVersion must be 1.");
  }

  assertExactSha(manifest.applicationSha, "production manifest applicationSha");
  assertExactSha(manifest.rollbackApplicationSha, "production manifest rollbackApplicationSha");

  if (!DEPLOYMENT_ID_PATTERN.test(manifest.deploymentId || "")) {
    throw new Error("production manifest deploymentId must be a Vercel deployment ID.");
  }
  if (!DEPLOYMENT_ID_PATTERN.test(manifest.rollbackDeploymentId || "")) {
    throw new Error("production manifest rollbackDeploymentId must be a Vercel deployment ID.");
  }

  let deploymentUrl;
  try {
    deploymentUrl = new URL(manifest.deploymentUrl);
  } catch {
    throw new Error("production manifest deploymentUrl must be a valid URL.");
  }
  if (deploymentUrl.protocol !== "https:" || deploymentUrl.pathname !== "/") {
    throw new Error("production manifest deploymentUrl must be an HTTPS deployment origin.");
  }
  if (typeof manifest.domain !== "string" || !manifest.domain || manifest.domain.includes("://") || manifest.domain.includes("/")) {
    throw new Error("production manifest domain must be a bare hostname.");
  }

  const qualification = manifest.releaseQualification;
  if (!qualification || typeof qualification !== "object" || Array.isArray(qualification)) {
    throw new Error("production manifest releaseQualification must be an object.");
  }
  assertPositiveInteger(qualification.deploymentReadinessRunId, "releaseQualification.deploymentReadinessRunId");
  assertPositiveInteger(qualification.releaseMatrixRunId, "releaseQualification.releaseMatrixRunId");
  assertPositiveInteger(qualification.releaseMatrixAttempt, "releaseQualification.releaseMatrixAttempt");
  assertPositiveInteger(qualification.acceptedChildren, "releaseQualification.acceptedChildren");
  assertPositiveInteger(qualification.expectedChildren, "releaseQualification.expectedChildren");
  if (qualification.acceptedChildren > qualification.expectedChildren) {
    throw new Error("releaseQualification.acceptedChildren cannot exceed expectedChildren.");
  }
  assertIsoTimestamp(qualification.qualifiedAt, "releaseQualification.qualifiedAt");
  assertIsoTimestamp(manifest.cutoverAt, "production manifest cutoverAt");
  if (Date.parse(qualification.qualifiedAt) > Date.parse(manifest.cutoverAt)) {
    throw new Error("production manifest cutoverAt cannot precede release qualification.");
  }

  return manifest;
}

export async function readProductionManifest({ rootDir = process.cwd() } = {}) {
  const raw = await readFile(resolve(rootDir, PRODUCTION_MANIFEST_PATH), "utf8");
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${PRODUCTION_MANIFEST_PATH}: invalid JSON (${error instanceof Error ? error.message : String(error)}).`);
  }
  return validateProductionManifest(manifest);
}

function currentH2Section(lines, markerLineIndex, path) {
  let start = -1;
  for (let index = markerLineIndex - 1; index >= 0; index -= 1) {
    if (lines[index].startsWith("## ")) {
      start = index;
      break;
    }
  }
  if (start < 0) throw new Error(`${path}: production marker is not inside an H2 current-production section.`);

  let end = lines.length;
  for (let index = markerLineIndex + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("## ")) {
      end = index;
      break;
    }
  }
  return { start, end };
}

function h2SectionByHeading(lines, heading, path) {
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start < 0) throw new Error(`${path}: expected H2 section "${heading}".`);
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (lines[index].startsWith("## ")) {
      end = index;
      break;
    }
  }
  return { start, end };
}

function requiredManifestValues(manifest) {
  return [
    PRODUCTION_MANIFEST_PATH,
    manifest.applicationSha,
    manifest.deploymentId,
    manifest.deploymentUrl,
    manifest.domain,
    manifest.rollbackDeploymentId,
    manifest.rollbackApplicationSha,
    String(manifest.releaseQualification.deploymentReadinessRunId),
    String(manifest.releaseQualification.releaseMatrixRunId),
    manifest.releaseQualification.qualifiedAt,
    manifest.cutoverAt,
  ];
}

function assertSectionMirrorsManifest({ body, section, path, manifest }) {
  const sectionBody = body.split(/\r?\n/).slice(section.start, section.end).join("\n");
  for (const value of requiredManifestValues(manifest)) {
    if (!sectionBody.includes(value)) {
      throw new Error(`${path}: current-production section does not mirror ${PRODUCTION_MANIFEST_PATH} value ${value}.`);
    }
  }
}

export async function verifyProductionDocumentationSync({
  expectedSha,
  rootDir = process.cwd(),
  authorities = PRODUCTION_DOCUMENTATION_AUTHORITIES,
  statusSummary = PRODUCTION_STATUS_SUMMARY,
} = {}) {
  const manifest = await readProductionManifest({ rootDir });
  assertExactSha(expectedSha, "expected production SHA");
  const normalizedExpected = expectedSha.toLowerCase();
  if (manifest.applicationSha.toLowerCase() !== normalizedExpected) {
    throw new Error(
      `${PRODUCTION_MANIFEST_PATH}: applicationSha ${manifest.applicationSha} does not match expected production SHA ${normalizedExpected}.`,
    );
  }

  const results = [];
  for (const path of authorities) {
    const body = await readFile(resolve(rootDir, path), "utf8");
    const tokenCount = (body.match(/RENDERLAB_CURRENT_PRODUCTION_SHA:/g) || []).length;
    if (tokenCount !== 1) {
      throw new Error(`${path}: expected exactly one production SHA marker token, found ${tokenCount}.`);
    }

    const markers = [...body.matchAll(MARKER_PATTERN)];
    if (markers.length !== 1) {
      throw new Error(`${path}: production SHA marker is malformed or duplicated.`);
    }

    const markerSha = markers[0][1].toLowerCase();
    assertExactSha(markerSha, `${path} production marker SHA`);
    if (markerSha !== normalizedExpected) {
      throw new Error(`${path}: marker ${markerSha} does not match expected production SHA ${normalizedExpected}.`);
    }

    const lines = body.split(/\r?\n/);
    const markerLineIndex = lines.findIndex((line) => line.includes(PRODUCTION_SHA_MARKER_TOKEN));
    if (markerLineIndex < 0) throw new Error(`${path}: marker line could not be located.`);
    const section = currentH2Section(lines, markerLineIndex, path);
    assertSectionMirrorsManifest({ body, section, path, manifest });

    results.push({
      path,
      sha: markerSha,
      heading: lines[section.start].slice(3).trim(),
    });
  }

  const statusBody = await readFile(resolve(rootDir, statusSummary), "utf8");
  const statusLines = statusBody.split(/\r?\n/);
  const statusSection = h2SectionByHeading(statusLines, "Production", statusSummary);
  assertSectionMirrorsManifest({ body: statusBody, section: statusSection, path: statusSummary, manifest });
  results.push({ path: statusSummary, sha: manifest.applicationSha, heading: "Production" });

  return { manifest, results };
}
