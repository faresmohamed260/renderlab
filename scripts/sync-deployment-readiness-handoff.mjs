import fs from "node:fs";

const path = "docs/architecture/INFRASTRUCTURE.md";
const marker = "Deployment readiness rule: do not apply corrected `0005` merely because GitHub `main` is owner-aware. First explicitly deploy the verified owner-aware runtime, verify the serving deployment and private account flows, then re-audit shared Supabase for unowned rows before applying/validating `0005`.";
const addition = "\n\n`.github/workflows/deployment-readiness.yml` is the permanent non-deploying configuration gate. On changes to Vercel/build configuration it asserts `framework: nextjs`, asserts automatic Git deployment remains disabled, rejects a forced `outputDirectory`, installs dependencies and runs the production `next build`. It performs no Vercel deployment and no Supabase/R2 writes.";
const text = fs.readFileSync(path, "utf8");
if (text.indexOf(marker) === -1 || text.indexOf(marker) !== text.lastIndexOf(marker)) {
  throw new Error("INFRASTRUCTURE.md: expected exactly one deployment readiness marker");
}
if (text.includes(".github/workflows/deployment-readiness.yml")) {
  throw new Error("INFRASTRUCTURE.md: deployment readiness workflow is already documented");
}
fs.writeFileSync(path, text.replace(marker, marker + addition));
console.log("Documented permanent deployment readiness gate.");
