import fs from "node:fs";
import path from "node:path";

const root = process.argv[2];
if (!root) throw new Error("Target checkout path is required.");

function normalize(rel, predicate) {
  const target = path.join(root, rel);
  const lines = fs.readFileSync(target, "utf8").split("\n");
  let active = false;
  const next = lines.map((line) => {
    if (predicate.start?.(line)) active = true;
    if (predicate.stop?.(line)) active = false;
    if (active || predicate.line?.(line)) return line.replace(/[ \t]+$/, "");
    return line;
  });
  fs.writeFileSync(target, next.join("\n"), "utf8");
}

normalize("docs/ui/UI_DECISIONS.md", {
  start: (line) => line === "### UI-034 — Library batch Delete is page-scoped and best-effort",
});

normalize("docs/ui/SCREEN_REGISTRY.md", {
  line: (line) => line.startsWith("**Batch selection:**"),
});
