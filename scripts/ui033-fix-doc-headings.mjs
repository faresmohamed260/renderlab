import fs from "node:fs";
import path from "node:path";

const root = process.argv[2];
if (!root) throw new Error("Target checkout path is required.");

function fix(rel, from, to) {
  const target = path.join(root, rel);
  const text = fs.readFileSync(target, "utf8");
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`Expected exactly one ${from} in ${rel}; found ${count}.`);
  fs.writeFileSync(target, text.replace(from, to), "utf8");
}

fix(
  "PROJECT.md",
  "### Latest completed product slice### Latest completed product slice",
  "### Latest completed product slice",
);
fix(
  "docs/ui/UI_MIGRATION.md",
  "## Session Handoff Rule## Session Handoff Rule",
  "## Session Handoff Rule",
);

console.log("UI-033 duplicate headings corrected.");
