import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export const ARCHIVE_DIRECTORY = "docs/archive";
export const ARCHIVE_CATALOG_PATH = `${ARCHIVE_DIRECTORY}/README.md`;

function normalizeRepoPath(value) {
  return value.split(path.sep).join("/");
}

export function findArchiveCatalogProblems({ archivePaths, catalogBody }) {
  const problems = [];
  const normalizedPaths = archivePaths
    .map((value) => normalizeRepoPath(value))
    .filter(
      (value) =>
        value.startsWith(`${ARCHIVE_DIRECTORY}/`) &&
        path.posix.dirname(value) === ARCHIVE_DIRECTORY &&
        value.endsWith(".md") &&
        value !== ARCHIVE_CATALOG_PATH,
    )
    .sort();
  const requiredNames = normalizedPaths.map((value) => path.posix.basename(value));
  const requiredSet = new Set(requiredNames);
  const listedNames = [...catalogBody.matchAll(/^\s*-\s+`([^`]+\.md)`\s+[—-]/gm)].map((match) => match[1]);
  const listedSet = new Set(listedNames);

  for (const name of requiredNames) {
    if (!listedSet.has(name)) {
      problems.push(`${ARCHIVE_CATALOG_PATH}: missing root archive entry ${name}`);
    }
  }

  for (const name of listedNames) {
    if (!requiredSet.has(name)) {
      problems.push(`${ARCHIVE_CATALOG_PATH}: catalogs unknown root archive entry ${name}`);
    }
  }

  if (listedSet.size !== listedNames.length) {
    problems.push(`${ARCHIVE_CATALOG_PATH}: duplicate root archive catalog entry`);
  }

  return problems;
}

export async function verifyArchiveCatalog({ rootDir = process.cwd() } = {}) {
  const directoryPath = path.join(rootDir, ARCHIVE_DIRECTORY);
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const archivePaths = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => `${ARCHIVE_DIRECTORY}/${entry.name}`);
  const catalogBody = await readFile(path.join(rootDir, ARCHIVE_CATALOG_PATH), "utf8");
  const problems = findArchiveCatalogProblems({ archivePaths, catalogBody });

  if (problems.length > 0) {
    throw new Error(`Historical archive catalog verification failed:\n- ${problems.join("\n- ")}`);
  }

  return { catalogedArchives: archivePaths.filter((value) => value !== ARCHIVE_CATALOG_PATH).length };
}
