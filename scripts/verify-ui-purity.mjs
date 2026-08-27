import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const roots = ["src/features", "src/components/shell"];
const forbiddenTags = ["button", "select", "textarea"];
const allowedNativeInputTypes = new Set(["file", "hidden"]);

async function collectTsxFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectTsxFiles(entryPath));
    else if (entry.isFile() && entry.name.endsWith(".tsx")) files.push(entryPath);
  }

  return files;
}

function lineNumber(content, index) {
  return content.slice(0, index).split("\n").length;
}

function rawInputType(tag) {
  const match = tag.match(/\btype\s*=\s*["']([^"']+)["']/i);
  return match?.[1]?.toLowerCase() ?? null;
}

const files = (await Promise.all(roots.map(collectTsxFiles))).flat();
const violations = [];

for (const file of files) {
  const content = await readFile(file, "utf8");

  for (const tagName of forbiddenTags) {
    const expression = new RegExp(`<${tagName}\\b`, "gi");
    for (const match of content.matchAll(expression)) {
      violations.push(`${file}:${lineNumber(content, match.index)} raw <${tagName}>; use an approved shared UI primitive`);
    }
  }

  const inputExpression = /<input\b[\s\S]*?>/gi;
  for (const match of content.matchAll(inputExpression)) {
    const type = rawInputType(match[0]);
    if (!type || !allowedNativeInputTypes.has(type)) {
      violations.push(`${file}:${lineNumber(content, match.index)} raw visible <input>; use Input or another approved shared UI primitive`);
    }
  }
}

if (violations.length) {
  console.error("UI purity verification failed:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  console.error("\nVisible conventional controls in feature/shell code must use approved maintained primitives. Native file/hidden inputs are allowed as browser plumbing.");
  process.exit(1);
}

console.log(`UI purity verified across ${files.length} feature/shell TSX files.`);
