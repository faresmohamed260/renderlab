import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const PRODUCTION_DOCUMENTATION_AUTHORITIES = Object.freeze([
  "PROJECT.md",
  "docs/ui/UI_MIGRATION.md",
  "docs/ui/SCREEN_REGISTRY.md",
  "docs/architecture/INFRASTRUCTURE.md",
]);

export const PRODUCTION_SHA_MARKER_TOKEN = "RENDERLAB_CURRENT_PRODUCTION_SHA:";
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const MARKER_PATTERN = /<!--\s*RENDERLAB_CURRENT_PRODUCTION_SHA:\s*([0-9a-f]{40})\s*-->/gi;

function assertExactSha(value, label) {
  if (!SHA_PATTERN.test(value || "")) {
    throw new Error(`${label} must be an exact 40-character Git SHA.`);
  }
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

export async function verifyProductionDocumentationSync({
  expectedSha,
  rootDir = process.cwd(),
  authorities = PRODUCTION_DOCUMENTATION_AUTHORITIES,
} = {}) {
  assertExactSha(expectedSha, "expected production SHA");
  const normalizedExpected = expectedSha.toLowerCase();
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
    const prose = lines
      .slice(section.start, section.end)
      .filter((_, localIndex) => section.start + localIndex !== markerLineIndex)
      .join("\n");
    if (!prose.toLowerCase().includes(normalizedExpected)) {
      throw new Error(`${path}: current-production prose does not contain expected SHA ${normalizedExpected}.`);
    }

    results.push({
      path,
      sha: markerSha,
      heading: lines[section.start].slice(3).trim(),
    });
  }

  return results;
}
