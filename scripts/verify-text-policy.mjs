import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";

const policyPath = ".gitattributes";
const policy = await readFile(policyPath, "utf8");

if (!/^\* text=auto eol=lf$/m.test(policy)) {
  throw new Error(`${policyPath} must keep the canonical '* text=auto eol=lf' repository text policy.`);
}

const result = spawnSync("git", ["ls-files", "--eol", "-z"], {
  encoding: "utf8",
  windowsHide: true,
});

if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`git ls-files --eol failed: ${(result.stderr || "unknown git error").trim()}`);
}

const violations = [];
let checkedTextFiles = 0;

for (const record of result.stdout.split("\0")) {
  if (!record) continue;
  const tab = record.indexOf("\t");
  if (tab < 0) {
    violations.push(`unparseable git EOL record: ${record}`);
    continue;
  }

  const metadata = record.slice(0, tab).trim().replace(/\s+/g, " ");
  const file = record.slice(tab + 1);
  if (metadata.includes("i/-text")) continue;

  checkedTextFiles += 1;
  if (!metadata.includes("i/lf")) violations.push(`${file}: index is not LF (${metadata})`);
  if (!metadata.includes("w/lf")) violations.push(`${file}: working tree is not LF (${metadata})`);
  if (!metadata.includes("eol=lf")) violations.push(`${file}: canonical eol=lf attribute is missing (${metadata})`);
}

if (violations.length > 0) {
  throw new Error(
    `Repository text policy verification failed:\n- ${violations.slice(0, 30).join("\n- ")}${violations.length > 30 ? `\n- ... ${violations.length - 30} more` : ""}\nUse a fresh checkout after .gitattributes is present; do not mass-edit file contents to hide checkout-policy drift.`,
  );
}

console.log(`Repository text policy passed for ${checkedTextFiles} tracked text files (LF index + working tree).`);
