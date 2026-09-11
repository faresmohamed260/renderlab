import { readFileSync, writeFileSync } from "node:fs";

const path = "scripts/apply-create-v05-fidelity-correction.mjs";
let source = readFileSync(path, "utf8");
const from = '\\`${references.length} reference${references.length === 1 ? "" : "s"}\\`';
const to = 'String(references.length) + " reference" + (references.length === 1 ? "" : "s")';
if (!source.includes(from)) throw new Error("Expected escaped result-source template was not found");
source = source.replace(from, to);
writeFileSync(path, source);
console.log("Repaired fidelity materializer escaping.");
