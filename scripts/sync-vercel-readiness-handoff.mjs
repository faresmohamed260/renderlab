import fs from "node:fs";

function replaceOnce(path, from, to) {
  const text = fs.readFileSync(path, "utf8");
  const first = text.indexOf(from);
  const last = text.lastIndexOf(from);
  if (first === -1 || first !== last) throw new Error(`${path}: expected exactly one match for ${from}`);
  fs.writeFileSync(path, text.slice(0, first) + to + text.slice(first + from.length));
}

function insertAfterOnce(path, marker, addition) {
  replaceOnce(path, marker, marker + addition);
}

const infra = "docs/architecture/INFRASTRUCTURE.md";
replaceOnce(infra, "## Required Server / CI Environment Variables", "## Required Server / CI / Production Environment Variables");
insertAfterOnce(infra, "## Required Server / CI / Production Environment Variables", "\nFor an explicit Vercel deployment, every non-optional variable below must be configured in the target Vercel environment. `npm run build` invokes `scripts/verify-vercel-env.mjs`; when Vercel exposes `VERCEL=1`, the prebuild fails before compilation if required Supabase/R2 variables are missing, if the public/private Supabase URLs do not target the approved shared project, or if only one half of the optional external-backend URL/token pair is configured. GitHub builds remain secret-free because the preflight is Vercel-only.");
replaceOnce(infra, "- UI-030 implementation is exact-head verified, but the ownership rollout is not complete until PR #17 is merged, owner-aware code is actually live, a final no-unowned-row audit passes, and corrected `0005` is applied/verified. Do not approve Favorites/Collections or other personal organization before that rollout completes.", "- UI-030 is merged and GitHub-verified, but the ownership rollout is not complete until owner-aware code is actually live, a final no-unowned-row audit passes, and corrected `0005` is applied/verified. Do not approve Favorites/Collections or other personal organization before that rollout completes.");
replaceOnce(infra, "`.github/workflows/deployment-readiness.yml` is the permanent non-deploying configuration gate. On changes to Vercel/build configuration it asserts `framework: nextjs`, asserts automatic Git deployment remains disabled, rejects a forced `outputDirectory`, installs dependencies and runs the production `next build`. It performs no Vercel deployment and no Supabase/R2 writes.", "`.github/workflows/deployment-readiness.yml` is the permanent non-deploying configuration gate. On changes to Vercel/build configuration it asserts `framework: nextjs`, asserts automatic Git deployment remains disabled, rejects a forced `outputDirectory`, exercises the Vercel environment preflight with non-secret fixture values, installs dependencies and runs the production `next build`. `scripts/verify-vercel-env.mjs` is also wired as `prebuild`, but only enforces the real environment contract when `VERCEL=1`. The gate performs no Vercel deployment and no Supabase/R2 writes.");
insertAfterOnce(infra, "- `verify-video-generation.mjs` + `video-generation-integration.yml` — owner-bound Create Video/Animate Image plus temporary reference ownership", "\n- `verify-vercel-env.mjs` + `deployment-readiness.yml` — non-deploying Next.js/Vercel configuration, Vercel-only environment preflight and production-build gate");
replaceOnce(infra, "1. Validate the final documentation head for UI-030 / PR #17 and merge the owner-aware application code when green. This repository merge is not permission to apply corrected `0005` or to perform an explicit deployment action.", "1. Keep GitHub validation and Vercel deployment separate: deployment-readiness changes must be exact-head green on GitHub before any explicit rollout, and repository merges are never permission to apply corrected `0005`.");

const project = "PROJECT.md";
replaceOnce(project, "- The repository is public, which resolved the previous private-repository hosted Actions capacity failure. Mid-development validation remains GitHub-first. Repository `vercel.json` disables automatic Git deployments and pins `framework: nextjs`; the earlier automatic merge attempt failed before becoming live because Vercel's project preset was `vite` and expected `dist`. Production deployment is therefore explicit only.", "- The repository is public, which resolved the previous private-repository hosted Actions capacity failure. Mid-development validation remains GitHub-first. Repository `vercel.json` disables automatic Git deployments and pins `framework: nextjs`; `scripts/verify-vercel-env.mjs` runs as a Vercel-only prebuild guard for required Supabase/R2 configuration. The earlier automatic merge attempt failed before becoming live because Vercel's project preset was `vite` and expected `dist`. Production deployment is therefore explicit only.");

const migration = "docs/ui/UI_MIGRATION.md";
replaceOnce(migration, "**Current gate:** production-readiness configuration and explicit owner-aware runtime rollout. Automatic Vercel Git deployments are disabled; `vercel.json` pins Next.js. UI-030 remains incomplete until the runtime is separately made live and corrected `0005` is applied/verified after a no-unowned-row audit.", "**Current gate:** production-readiness configuration and explicit owner-aware runtime rollout. Automatic Vercel Git deployments are disabled; `vercel.json` pins Next.js; Vercel builds preflight the required Supabase/R2 environment contract. UI-030 remains incomplete until the runtime is separately made live and corrected `0005` is applied/verified after a no-unowned-row audit.");

const frontend = "docs/architecture/FRONTEND_ARCHITECTURE.md";
replaceOnce(frontend, "Deployment configuration: repository `vercel.json` pins the Vercel framework to `nextjs` and disables automatic Git-triggered deployments. GitHub remains the development/validation path; production deployment is an explicit operation.", "Deployment configuration: repository `vercel.json` pins the Vercel framework to `nextjs` and disables automatic Git-triggered deployments. `scripts/verify-vercel-env.mjs` runs as a Vercel-only prebuild guard for required Supabase/R2 configuration and the approved shared Supabase URL. GitHub remains the development/validation path; production deployment is an explicit operation.");

console.log("Synchronized Vercel environment readiness handoff.");
