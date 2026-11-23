/**
 * CI P1-04 conservative fast path. Only immutable narrative/evidence Markdown
 * under audited, historical or archived documentation is eligible.
 *
 * This pure gate never trusts GitHub event labels or a caller-supplied "docs"
 * flag: the runner must verify both Git object IDs, diff and file modes.
 * All other changes, errors and ambiguity default to full validation.
 */
const evidenceMarkdown = /^docs\/(?:audits|history|archive)\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9][A-Za-z0-9_.-]*\.md$/;

export function isEvidenceOnlyMarkdownPath(path) {
  return typeof path === "string"
    && !path.split("/").some((part) => part === "." || part === "..")
    && evidenceMarkdown.test(path);
}

export function classifyCiChangePaths(paths, { isRegularFile = () => true, isReferenced = () => false } = {}) {
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > 1000) {
    return { docsOnly: false, reason: "missing-or-unbounded-diff" };
  }
  const seen = new Set();
  for (const path of paths) {
    if (typeof path !== "string" || seen.has(path) || !isEvidenceOnlyMarkdownPath(path)) {
      return { docsOnly: false, reason: "non-evidence-change" };
    }
    seen.add(path);
    if (!isRegularFile(path) || isReferenced(path)) {
      return { docsOnly: false, reason: "mode-or-consumer-uncertain" };
    }
  }
  return { docsOnly: true, reason: "evidence-only-markdown" };
}

export function validCiCommitSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value) && !/^0{40}$/.test(value);
}
