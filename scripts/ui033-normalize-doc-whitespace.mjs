import fs from "node:fs";
import path from "node:path";

const root = process.argv[2];
if (!root) throw new Error("Target checkout path is required.");
const rel = "docs/ui/COMPONENT_CATALOG.md";
const target = path.join(root, rel);
const lines = fs.readFileSync(target, "utf8").split("\n");
let inAlertDialog = false;
const next = lines.map((line) => {
  if (line === "### AlertDialog") inAlertDialog = true;
  if (line === "### AppShell") inAlertDialog = false;
  if (inAlertDialog || line.startsWith("**Current primitives:** Alert, AlertDialog")) {
    return line.replace(/[ \t]+$/, "");
  }
  return line;
});
fs.writeFileSync(target, next.join("\n"), "utf8");
