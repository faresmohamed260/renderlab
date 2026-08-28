import fs from "node:fs";

function replaceOnce(path, from, to) {
  const text = fs.readFileSync(path, "utf8");
  const first = text.indexOf(from);
  const last = text.lastIndexOf(from);
  if (first === -1 || first !== last) {
    throw new Error(`${path}: expected exactly one match for:\n${from}`);
  }
  fs.writeFileSync(path, text.slice(0, first) + to + text.slice(first + from.length));
}

function insertBeforeOnce(path, marker, textToInsert) {
  replaceOnce(path, marker, `${textToInsert}${marker}`);
}

const project = "PROJECT.md";
replaceOnce(
  project,
  "- Core Account Ownership v0.1 / UI-030 is **IN PROGRESS** on PR #17. The owner-aware implementation and configured verification are green; merge/live rollout and strict database enforcement remain separate steps.",
  "- Core Account Ownership v0.1 / UI-030 is **IN PROGRESS** after PR #17 merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`. GitHub `main` is owner-aware and verified; the remaining rollout is an explicit production deployment followed by corrected `0005` enforcement."
);
replaceOnce(
  project,
  "- The repository is now public. This resolved the previous private-repository hosted Actions capacity failure; exact-head runners execute normally again. No Vercel preview/deployment is required for mid-development validation.",
  "- The repository is public, which resolved the previous private-repository hosted Actions capacity failure. Mid-development validation remains GitHub-first. Repository `vercel.json` disables automatic Git deployments and pins `framework: nextjs`; the earlier automatic merge attempt failed before becoming live because Vercel's project preset was `vite` and expected `dist`. Production deployment is therefore explicit only."
);
replaceOnce(
  project,
  "**Core Account Ownership v0.1 status: `IN PROGRESS`; PR #17 implementation is exact-head verified, while merge/live rollout and corrected `0005` enforcement remain outstanding.**",
  "**Core Account Ownership v0.1 status: `IN PROGRESS`; PR #17 is merged and GitHub `main` is verified owner-aware. Production rollout and corrected `0005` enforcement remain outstanding.**"
);
replaceOnce(
  project,
  "- merge PR #17 after final documentation-head validation;",
  "- deploy the verified owner-aware `main` only through a separately authorized production rollout;"
);
insertBeforeOnce(
  project,
  "- The staged `0005_core_account_ownership_enforce.sql` was corrected after rollback-only semantic testing found an invalid shared trigger-field reference.",
  "- Final PR documentation head `d7f856913847ff22fa2594d060dbe21b6ea9373a` passed all 14 configured gates again before merge. PR #17 then merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`; push-triggered `main` UI Shell `33135862296`, Reference Upload `33135862307`, Generation Integration `33135862297`, and Video Generation `33135862337` all passed.\n"
);

const migration = "docs/ui/UI_MIGRATION.md";
replaceOnce(migration, "### Core account ownership v0.1 — PR #17 / UI-030", "### Core account ownership v0.1 — merged PR #17 / UI-030");
replaceOnce(
  migration,
  "- [ ] Merge owner-aware application code after this final documentation head is validated.",
  "- [x] Final documentation head `d7f856913847ff22fa2594d060dbe21b6ea9373a` passed all 14 configured gates; merge PR #17 as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`; merged `main` UI Shell `33135862296`, Reference Upload `33135862307`, Generation Integration `33135862297`, and Video Generation `33135862337` passed."
);
replaceOnce(
  migration,
  "**Core account ownership v0.1 status: `IN PROGRESS`; PR #17 implementation is exact-head verified, while merge/live rollout and corrected `0005` enforcement remain unapplied/outstanding.**",
  "**Core account ownership v0.1 status: `IN PROGRESS`; PR #17 is merged and `main` is verified owner-aware. Production rollout and corrected `0005` enforcement remain unapplied/outstanding.**"
);
replaceOnce(
  migration,
  "- [ ] Merge PR #17 after final documentation-head validation; do not deploy merely because GitHub `main` advances.",
  "- [x] PR #17 merged after final documentation-head validation; the merge did not authorize or complete a production rollout."
);
replaceOnce(
  migration,
  "**Current product slice:** Core account ownership v0.1 / UI-030 on PR #17. Exact implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed all 14 configured gates, responsive artifact review and clean shared-resource audit.  ",
  "**Current product slice:** Core account ownership v0.1 / UI-030 rollout. PR #17 merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`; exact implementation and final documentation heads passed the complete configured suite, and merged `main` push checks are green.  "
);
replaceOnce(
  migration,
  "**Current gate:** validate this documentation head and merge PR #17. UI-030 remains incomplete after merge until the owner-aware runtime is separately made live and corrected `0005` is applied/verified against a no-unowned-row audit.  ",
  "**Current gate:** production-readiness configuration and explicit owner-aware runtime rollout. Automatic Vercel Git deployments are disabled; `vercel.json` pins Next.js. UI-030 remains incomplete until the runtime is separately made live and corrected `0005` is applied/verified after a no-unowned-row audit.  "
);

const infra = "docs/architecture/INFRASTRUCTURE.md";
replaceOnce(
  infra,
  "`0005_core_account_ownership_enforce.sql` is committed on PR #17 but is **not applied**.",
  "`0005_core_account_ownership_enforce.sql` is committed and merged through PR #17 but is **not applied**."
);
replaceOnce(
  infra,
  "Service-role access remains server-only. UI-029 added public Supabase Auth client configuration only. UI-030 / PR #17 threads the verified account principal through server product routes and persistence while keeping the raw core tables server-owned; its implementation is exact-head verified, but rollout remains incomplete until merge/live deployment and corrected 0005 enforcement are completed in that order.",
  "Service-role access remains server-only. UI-029 added public Supabase Auth client configuration only. UI-030 / PR #17 threads the verified account principal through server product routes and persistence while keeping the raw core tables server-owned; PR #17 is merged and `main` is verified, but rollout remains incomplete until the owner-aware runtime is explicitly deployed and corrected 0005 enforcement is completed afterward."
);
replaceOnce(
  infra,
  "### Core account ownership boundary — UI-030 / PR #17 (implementation verified; rollout in progress)",
  "### Core account ownership boundary — UI-030 / PR #17 (merged; live rollout pending)"
);
insertBeforeOnce(
  infra,
  "Supabase advisor result after exact-head CI:",
  "Merge verification: final documentation head `d7f856913847ff22fa2594d060dbe21b6ea9373a` passed all 14 configured PR gates before PR #17 merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`. Push-triggered merged-`main` UI Shell `33135862296`, Reference Upload `33135862307`, Generation Integration `33135862297`, and Video Generation `33135862337` all passed. Post-run cleanup again left all four core tables empty and no RenderLab fixture Auth users.\n\n"
);
insertBeforeOnce(
  infra,
  "## Cloudflare R2",
  "## Vercel deployment boundary\nVercel is the production deployment target, but Git pushes are **not** deployment authorization. Repository `vercel.json` sets `git.deploymentEnabled=false`, so GitHub development/merge activity does not automatically create Vercel deployments. An explicit deployment action is required.\n\nThe RenderLab repository is Next.js (`npm run build` -> `next build`). The Vercel project had a stale `vite` framework preset: automatic production attempt `dpl_26Di1DVD3fpAdb2HjiskT9kTtpqz` for merge `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1` successfully completed the Next.js production build, then failed with `STATIC_BUILD_NO_OUT_DIR` because the Vite preset expected `dist`. It never became live. Repository `vercel.json` now pins `framework: nextjs`, which overrides the stale project preset for future explicit builds while automatic Git deployments remain disabled.\n\nDeployment readiness rule: do not apply corrected `0005` merely because GitHub `main` is owner-aware. First explicitly deploy the verified owner-aware runtime, verify the serving deployment and private account flows, then re-audit shared Supabase for unowned rows before applying/validating `0005`.\n\n"
);

const frontend = "docs/architecture/FRONTEND_ARCHITECTURE.md";
replaceOnce(
  frontend,
  "Core Account Ownership/UI-030 is the active in-progress slice on PR #17: exact implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed the complete 14-gate configured suite, while merge/live rollout and corrected `0005` enforcement remain outstanding.",
  "Core Account Ownership/UI-030 remains the active rollout slice after PR #17 merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`: exact implementation and final documentation heads passed the complete configured suite, and merged `main` push checks are green. Production rollout and corrected `0005` enforcement remain outstanding."
);
insertBeforeOnce(
  frontend,
  "## Maintained Primitive Boundary — UI-026",
  "Deployment configuration: repository `vercel.json` pins the Vercel framework to `nextjs` and disables automatic Git-triggered deployments. GitHub remains the development/validation path; production deployment is an explicit operation.\n\n"
);

const screens = "docs/ui/SCREEN_REGISTRY.md";
replaceOnce(
  screens,
  "**Still intentionally open:** UI-030 owner scoping is implemented and exact-head verified, but its rollout remains incomplete until PR #17 is merged, owner-aware code is actually live and corrected `0005` is applied/verified after a no-unowned-row audit. Favorites/Collections remain blocked until that enforcement is complete. Delete/batch management remains separately blocked until database/R2/reference-history cleanup and recovery/tombstone semantics are explicit.",
  "**Still intentionally open:** UI-030 owner scoping is implemented, merged through PR #17 and verified on `main`, but its rollout remains incomplete until owner-aware code is actually live and corrected `0005` is applied/verified after a no-unowned-row audit. Favorites/Collections remain blocked until that enforcement is complete. Delete/batch management remains separately blocked until database/R2/reference-history cleanup and recovery/tombstone semantics are explicit."
);

for (const path of [project, migration, infra, frontend, screens]) {
  const text = fs.readFileSync(path, "utf8");
  if (/PR #17 implementation is exact-head verified, while merge|Merge PR #17 after final documentation-head validation|on PR #17\. The owner-aware implementation/.test(text)) {
    throw new Error(`${path}: stale PR #17 pre-merge wording remains`);
  }
}

console.log("Deployment-readiness documentation synchronized.");
