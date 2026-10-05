# ENT-003 — Next.js security patch contract

Date: 2026-10-05
Status: execution contract

## Goal
Move RenderLab from Next.js 16.3.6 to the current patched 16.3 Active-LTS security release, 16.3.8, before continuing broader request-admission hardening.

## Why this phase moved ahead of request-boundary work
During post-ENT-002 current-state verification, the official Next.js September 30, 2026 security release was found to require Next.js 16.3.8 for the 16.3 Active-LTS line. RenderLab is currently pinned to 16.3.6.

Official source: [Next.js — September 2026 Security Release](https://nextjs.org/blog/september-2026-security-release).

The advisory reports fixes for one High, five Medium, and one Low issue. Current RenderLab configuration reduces exposure to several listed cases: `next.config.ts` does not configure `images.remotePatterns`, production is Vercel-hosted rather than self-hosted, and the application uses the App Router. Those applicability details do not justify remaining below the vendor's patched Active-LTS baseline.

## Verified starting state
- Authoritative repository head: `8f3ea3b3b50741d75856dd47105a3836d8c3c28e`.
- ENT-002 is complete and repository-closed at an enterprise score of 8.2/10.
- `package.json` pins `next` exactly to `16.3.6`.
- RenderLab uses Next.js App Router, React 19.2.8, TypeScript 7.0.2, and Vercel as the production deployment target.
- `next.config.ts` does not configure `images.remotePatterns`.
- Automatic Git → Vercel deployment remains disabled; no deployment is authorized by this contract.

## In scope

1. **Patch Next.js within the existing 16.3 line**
   - Update the direct `next` dependency from exactly `16.3.6` to exactly `16.3.8`.
   - Refresh `package-lock.json` using the repository's declared npm 11 toolchain.
   - Accept only transitive lockfile changes required by that patch update.
   - Keep React, React DOM, TypeScript, Tailwind, Supabase, AWS SDK, Motion, Radix and other direct dependency versions unchanged unless npm proves a lockfile-only transitive adjustment is required by Next.js 16.3.8.

2. **Preserve application contracts**
   - No route, UI, API, authentication, authorization, generation, storage, media, worker, provider, or data-model behavior change is intended.
   - Preserve the ENT-001 browser security headers and ENT-002 CI/supply-chain controls.
   - Do not introduce new Next.js experimental features, Cache Components, image remote patterns, proxy/middleware behavior, or configuration changes as part of this patch phase.

3. **Verify compatibility broadly**
   - Confirm package/lockfile consistency with `npm ci`.
   - Run lint, typecheck, unit tests, production build, and Engineering Quality.
   - Run exact-head CodeQL.
   - Run the existing release-candidate matrix at the exact implementation SHA so framework-level regressions are exercised across configured application lifecycles.
   - Review any failures as compatibility evidence rather than automatically weakening the existing gates.

4. **Record verified dependency state**
   - Update the current enterprise hardening assessment/status only after the patch is merged and verified.
   - Do not increase the enterprise score merely because a dependency version changed; the purpose of this phase is to restore the patched dependency-security baseline and avoid score regression.

## Explicitly out of scope
- Upload-ticket rate limiting, pending-session caps, retained-storage quotas, or upload UX changes.
- Origin / `Sec-Fetch-Site` mutation defense.
- `server-only` boundary expansion.
- Coverage collection/gates, observability backend work, DR/runbooks, EOL normalization, workflow consolidation, module decomposition, or CSS refactoring.
- Supabase schema/RLS/Auth changes, Cloudflare R2 changes, Modal/provider/worker changes, secret changes, scheduler changes, or production deployment.
- Any redesign or product feature work.

Those remain follow-on enterprise-hardening work. The next planned phase after ENT-003 is request-boundary hardening for upload admission and same-origin mutations, subject to a fresh post-patch repository audit.

## Security constraints
- Stay on the stable Next.js 16.3 Active-LTS line; do not move to canary, prerelease, or a different major/minor line.
- Preserve exact dependency pinning in `package.json`.
- Do not suppress npm integrity or lockfile checks.
- Do not disable CodeQL, Engineering Quality, CSP/security headers, or any existing exact-head validation to make the patch pass.
- No production deployment is authorized.

## Validation matrix
Before implementation closure:
- `npm ci --no-audit --no-fund`
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run build`
- `npm run verify:engineering-quality`
- exact-head Engineering Quality
- exact-head CodeQL JavaScript/TypeScript
- exact-head Release Candidate Matrix and all required child workflows
- merged-main Engineering Quality and CodeQL after implementation merge

Static verification must prove:
- `package.json` pins `next` exactly to `16.3.8`;
- the lockfile resolves the root Next.js package to 16.3.8;
- no unrelated direct dependency version changed;
- ENT-002 workflow guards still report no executable workflow `npm install` and no unpinned external Actions.

## Documentation outputs
On verified implementation:
- mark this contract complete / verified / merged / not deployed;
- update `docs/STATUS.md` with the patched Next.js baseline;
- update `ENT_002_CI_SUPPLY_CHAIN_HARDENING_ASSESSMENT.md` or a successor current assessment so the dependency-security narrative no longer implies 16.3.6 is current;
- preserve the existing 8.2 score unless the full scorecard supports a different rounded result.

## Exit criteria
ENT-003 is complete only when:
1. Next.js is exactly 16.3.8 in `package.json` and the lockfile;
2. no unrelated direct dependency was upgraded;
3. local quality/build verification passes;
4. exact-head Engineering Quality, CodeQL and Release Candidate Matrix pass;
5. merged-main Engineering Quality and CodeQL pass;
6. authoritative documentation reflects the verified patched dependency state; and
7. no deployment, application behavior change, shared-resource mutation, or unrelated refactor occurred.
