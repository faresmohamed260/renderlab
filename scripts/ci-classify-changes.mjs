#!/usr/bin/env node
/**
 * CI P1-04: run after checkout/setup-node in required, always-triggered jobs.
 * Conservative: errors, stale event SHAs, unreadable ancestry, uncommon file
 * modes, and source/test references all cause FULL validation. No shell interp.
 */
import { appendFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { classifyCiChangePaths, validCiCommitSha } from "./lib/ci-change-scope.mjs";

const cwd = process.cwd();
const git = (args, options = {}) => execFileSync("git", args, {
  cwd, encoding: "utf8", timeout: 15_000, maxBuffer: 4 * 1024 * 1024,
  stdio: ["ignore", "pipe", "pipe"], ...options,
});
const base = process.env.CI_BASE_SHA;
const head = process.env.CI_HEAD_SHA;
const event = process.env.CI_EVENT_NAME;

function classify() {
  if (event !== "pull_request" && event !== "push")
    return { docsOnly: false, reason: "non-change-event" };
  if (!validCiCommitSha(base) || !validCiCommitSha(head) || base === head)
    return { docsOnly: false, reason: "invalid-or-empty-range" };
  if (git(["rev-parse", "HEAD"]).trim() !== head)
    return { docsOnly: false, reason: "checkout-head-mismatch" };

  try {
    git(["cat-file", "-e", base + "^{commit}"]);
  } catch {
    // Fetch just the event-identified commit, not an untrusted branch ref.
    git(["fetch", "--no-tags", "--depth=1", "origin", base]);
    git(["cat-file", "-e", base + "^{commit}"]);
  }

  const buffer = git(["diff", "--name-only", "-z", "--no-renames", base, head, "--"], {
    encoding: "buffer",
  });
  if (!buffer.length || buffer[buffer.length - 1] !== 0)
    return { docsOnly: false, reason: "unreadable-diff" };
  const paths = buffer.toString("utf8").slice(0, -1).split("\0");
  return classifyCiChangePaths(paths, {
    isRegularFile: (path) => {
      const entry = git(["ls-tree", "-z", "HEAD", "--", path]);
      return entry === `100644 blob ${entry.slice(12, 52)}\t${path}\0`
        && /^[0-9a-f]{40}$/.test(entry.slice(12, 52));
    },
    isReferenced: (path) => {
      const grep = spawnSync("git", [
        "grep", "-q", "-F", "-e", path, "HEAD", "--",
        ".github", "src", "scripts", "tests",
      ], { cwd, timeout: 15_000, encoding: "utf8" });
      if (grep.error || grep.signal || (grep.status !== 0 && grep.status !== 1))
        return true;
      return grep.status === 0;
    },
  });
}

let result;
try { result = classify(); }
catch { result = { docsOnly: false, reason: "classification-failed-closed" }; }
const mode = result.docsOnly ? "docs-only" : "full";
const output = process.env.GITHUB_OUTPUT;
if (output) appendFileSync(output, `docs_only=${result.docsOnly}\nmode=${mode}\n`, "utf8");
console.log(`CI change scope: ${mode} (${result.reason}); always-run required contexts remain present.`);
