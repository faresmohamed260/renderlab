import path from "node:path";

export const PUBLIC_DOCUMENTATION_PATHS = Object.freeze([
  "README.md",
  "docs/STATUS.md",
]);

export const INTERNAL_ENTRY_POINT_PATHS = Object.freeze([
  "AGENTS.md",
  "PROJECT.md",
]);

export const STATUS_SUMMARY_MAX_LINES = 80;

function normalizeRepoPath(value) {
  return value.split(path.sep).join("/").replace(/^\.\//, "");
}

function resolveMarkdownTarget(documentPath, rawTarget) {
  let target = rawTarget.trim();
  if (!target || /^(?:https?:|mailto:|data:|#)/i.test(target)) return null;
  if (target.startsWith("<") && target.includes(">")) target = target.slice(1, target.indexOf(">"));
  else target = target.split(/\s+/)[0];
  target = target.split("#")[0].split("?")[0];
  if (!target || target.startsWith("/") || /[*?{}<>]/.test(target)) return null;
  try {
    target = decodeURIComponent(target);
  } catch {
    return null;
  }
  return normalizeRepoPath(path.posix.normalize(path.posix.join(path.posix.dirname(documentPath), target)));
}

export function findPublicDocumentationBoundaryProblems(documents) {
  const publicPaths = new Set(PUBLIC_DOCUMENTATION_PATHS);
  const internalPaths = new Set(INTERNAL_ENTRY_POINT_PATHS);
  const byPath = new Map(documents.map((document) => [document.path, document]));
  const problems = [];

  for (const document of documents) {
    if (!publicPaths.has(document.path)) continue;
    for (const [lineIndex, line] of document.body.split(/\r?\n/).entries()) {
      for (const match of line.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
        const target = resolveMarkdownTarget(document.path, match[1]);
        if (target && internalPaths.has(target)) {
          problems.push(
            `${document.path}:${lineIndex + 1}: public documentation must not route readers to internal entry point ${target}`,
          );
        }
      }
    }
  }

  const status = byPath.get("docs/STATUS.md");
  if (status) {
    const lines = status.body.replace(/\s+$/, "").split(/\r?\n/);
    if (lines.length > STATUS_SUMMARY_MAX_LINES) {
      problems.push(
        `docs/STATUS.md: public current-status summary is ${lines.length} lines; keep it at or below ${STATUS_SUMMARY_MAX_LINES} lines and move chronology to historical evidence`,
      );
    }
    for (const [lineIndex, line] of lines.entries()) {
      if (/^#{2,6}\s+(?:ENT-\d+\b|Checkpoint\b|Phase\s+\d+\b|PR\s+#?\d+\b|Run\s+\d+\b)/i.test(line)) {
        problems.push(
          `docs/STATUS.md:${lineIndex + 1}: execution-journal headings do not belong in the public current-status summary`,
        );
      }
    }
  }

  const readme = byPath.get("README.md");
  if (readme && /PROJECT\.md[^\n]*(?:implementation|execution)[^\n]*history|(?:implementation|execution)[^\n]*history[^\n]*PROJECT\.md/i.test(readme.body)) {
    problems.push("README.md: PROJECT.md is the compact internal handoff, not detailed implementation/execution history");
  }

  return problems;
}
