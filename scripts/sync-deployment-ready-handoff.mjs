import { readFile, writeFile } from "node:fs/promises";

function replaceExactlyOnce(text, from, to, path) {
  const parts = text.split(from);
  if (parts.length !== 2) {
    throw new Error(`${path}: expected exactly one match, found ${parts.length - 1}`);
  }
  return `${parts[0]}${to}${parts[1]}`;
}

async function edit(path, replacements) {
  let text = await readFile(path, "utf8");
  for (const [from, to] of replacements) {
    text = replaceExactlyOnce(text, from, to, path);
  }
  await writeFile(path, text, "utf8");
}

await edit("PROJECT.md", [[
  "- The repository is public, which resolved the previous private-repository hosted Actions capacity failure. Mid-development validation remains GitHub-first. Repository `vercel.json` disables automatic Git deployments and pins `framework: nextjs`; `scripts/verify-vercel-env.mjs` runs as a Vercel-only prebuild guard for required Supabase/R2 configuration. The earlier automatic merge attempt failed before becoming live because Vercel's project preset was `vite` and expected `dist`. Production deployment is therefore explicit only.\n",
  "- The repository is public, which resolved the previous private-repository hosted Actions capacity failure. Mid-development validation remains GitHub-first. Repository `vercel.json` disables automatic Git deployments and pins `framework: nextjs`; `scripts/verify-vercel-env.mjs` runs as a Vercel-only prebuild guard for required Supabase/R2 configuration. The earlier automatic merge attempt failed before becoming live because Vercel's project preset was `vite` and expected `dist`. Production deployment is therefore explicit only.\n- Deployment Readiness v0.1 merged through PR #18 as `2b8a5170df0675a691deb8d5a7031f1dc14d803b`. Exact candidate `da7f9c23224f5a03ba0832fe8fcd773d1586e0c2` passed all 15 configured gates; merged `main` Deployment Readiness `33137972011`, UI Shell `33137972042`, Reference Upload `33137972130`, Generation Integration `33137972033`, and Video Generation `33137972021` all passed. Vercel created no deployment for the PR #18 merge, and its documented `vercel.json` framework override makes the repository Next.js preset authoritative over the stale dashboard `vite` label. Final post-merge Supabase audit found 0 core rows, 0 null owners, 0 RenderLab fixture users, 0 browser core-table grants, four still-nullable owner columns, 0 enforcement triggers, and migration history still ending at applied `0004`.\n"
]]);

await edit("docs/ui/UI_MIGRATION.md", [
  [
    "- [x] Final documentation head `d7f856913847ff22fa2594d060dbe21b6ea9373a` passed all 14 configured gates; merge PR #17 as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`; merged `main` UI Shell `33135862296`, Reference Upload `33135862307`, Generation Integration `33135862297`, and Video Generation `33135862337` passed.\n- [ ] After owner-aware code is safely live through a separately authorized rollout, recheck for unowned rows, apply corrected `0005_core_account_ownership_enforce.sql`, then verify `NOT NULL`, owner immutability and table-specific same-owner link triggers.\n",
    "- [x] Final documentation head `d7f856913847ff22fa2594d060dbe21b6ea9373a` passed all 14 configured gates; merge PR #17 as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`; merged `main` UI Shell `33135862296`, Reference Upload `33135862307`, Generation Integration `33135862297`, and Video Generation `33135862337` passed.\n- [x] Merge Deployment Readiness PR #18 as `2b8a5170df0675a691deb8d5a7031f1dc14d803b`. Exact candidate `da7f9c23224f5a03ba0832fe8fcd773d1586e0c2` passed 15/15 configured gates, including the permanent non-deploying readiness build and the run-scoped fixture-isolation regression; merged `main` Deployment Readiness `33137972011`, UI Shell `33137972042`, Reference Upload `33137972130`, Generation Integration `33137972033`, and Video Generation `33137972021` all passed. No Vercel deployment was created by the merge, and the final shared-Supabase audit was clean with corrected `0005` still unapplied.\n- [ ] After owner-aware code is safely live through a separately authorized rollout, recheck for unowned rows, apply corrected `0005_core_account_ownership_enforce.sql`, then verify `NOT NULL`, owner immutability and table-specific same-owner link triggers.\n"
  ],
  [
    "**Core account ownership v0.1 status: `IN PROGRESS`; PR #17 is merged and `main` is verified owner-aware. Production rollout and corrected `0005` enforcement remain unapplied/outstanding.**",
    "**Core account ownership v0.1 status: `IN PROGRESS`; PR #17 and deployment-readiness PR #18 are merged, `main` is verified owner-aware and deployment-ready, and automatic Vercel Git deployment is disabled. Production rollout and corrected `0005` enforcement remain unapplied/outstanding.**"
  ],
  [
    "**Current gate:** production-readiness configuration and explicit owner-aware runtime rollout. Automatic Vercel Git deployments are disabled; `vercel.json` pins Next.js; Vercel builds preflight the required Supabase/R2 environment contract. UI-030 remains incomplete until the runtime is separately made live and corrected `0005` is applied/verified after a no-unowned-row audit.",
    "**Current gate:** explicit owner-aware production rollout. Deployment Readiness PR #18 is merged and green; automatic Vercel Git deployments are disabled, `vercel.json` pins Next.js, and Vercel builds preflight the required Supabase/R2 environment contract. UI-030 remains incomplete until the runtime is separately made live and corrected `0005` is applied/verified after a no-unowned-row audit."
  ]
]);

await edit("docs/architecture/INFRASTRUCTURE.md", [
  [
    "- configured helper accounts use deterministic owner-scoped identities so a superseding/fresh run can reconstruct its own cleanup without deleting another workflow's fixtures;",
    "- configured helper accounts use deterministic `GITHUB_RUN_ID`-scoped owner identities (or an explicit test-scope override): reruns of the same workflow can reconstruct their own cleanup, while separate workflow runs cannot delete each other's Auth owner or owned rows;"
  ],
  [
    "`.github/workflows/deployment-readiness.yml` is the permanent non-deploying configuration gate. On changes to Vercel/build configuration it asserts `framework: nextjs`, asserts automatic Git deployment remains disabled, rejects a forced `outputDirectory`, exercises the Vercel environment preflight with non-secret fixture values, installs dependencies and runs the production `next build`. `scripts/verify-vercel-env.mjs` is also wired as `prebuild`, but only enforces the real environment contract when `VERCEL=1`. The gate performs no Vercel deployment and no Supabase/R2 writes.\n",
    "`.github/workflows/deployment-readiness.yml` is the permanent non-deploying configuration gate. On changes to Vercel/build configuration it asserts `framework: nextjs`, asserts automatic Git deployment remains disabled, rejects a forced `outputDirectory`, exercises the Vercel environment preflight with non-secret fixture values, installs dependencies and runs the production `next build`. `scripts/verify-vercel-env.mjs` is also wired as `prebuild`, but only enforces the real environment contract when `VERCEL=1`. The gate performs no Vercel deployment and no Supabase/R2 writes.\n\nDeployment Readiness PR #18 merged as `2b8a5170df0675a691deb8d5a7031f1dc14d803b`. Exact candidate `da7f9c23224f5a03ba0832fe8fcd773d1586e0c2` passed all 15 configured PR gates after fixing a concurrent fixture race: configured account identity now scopes by `GITHUB_RUN_ID`, so an older superseded run cannot delete a newer run's Auth owner. Merged `main` Deployment Readiness `33137972011`, UI Shell `33137972042`, Reference Upload `33137972130`, Generation Integration `33137972033`, and Video Generation `33137972021` all passed. Vercel recorded zero deployments after the PR #18 merge. The dashboard-level project preset still reports `vite`, but Vercel's documented `vercel.json` `framework` property overrides the project preset, so repository `framework: nextjs` is authoritative for the next explicit build. Final post-merge Supabase audit found zero core rows/fixture users/browser grants, four nullable owner columns, zero enforcement triggers, and migration history still ending at applied `0004`.\n"
  ]
]);

console.log("Deployment-ready handoff synchronized.");
