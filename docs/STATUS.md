# RenderLab Status

This page is the concise public status summary. `PROJECT.md` remains the detailed internal handoff/history document.

Lifecycle/status terminology follows `docs/INDEX.md`. Enterprise workstream status statements below preserve their original closure-time repository/deployment provenance unless explicitly labeled as current; they do not override the exact current-production block.

## Production

- Public product: https://renderlab.faresuniform.uk
- Access model: closed beta / invitation only
- Default branch: `main`
- Exact production application source: `d7571a230b3f1c5719552628db020823adb4da73`
- READY Vercel deployment: `dpl_5LZbW2kA6bFZpYvy2p8bFXzZ2ABF` (`https://renderlab-de7i5y37u-faresmohamed260-6733s-projects.vercel.app`)
- Release qualification: Deployment Readiness `37930497565` and Release Candidate Matrix `37934750620` attempt 1 passed on the exact production SHA; the matrix accepted 23/23 configured children.
- All completed application/runtime changes through exact production application source `d7571a230b3f1c5719552628db020823adb4da73` are `PRODUCTION-LIVE` in this cumulative release, including the UI-082 application changes and `sharp@0.35.5`. Repository `main` may be newer because documentation, verification, CI/tooling, and other non-deployed commits do not automatically change production. Historical phase-level `NOT DEPLOYED` statements below retain their closure-time meaning; unfinished draft/research work is excluded.
- The immediately previous verified live rollback anchor is `dpl_4E38yZarWfooA4wfEuW5USmPnNsN` at source `bcb2de305b15f4be15ed42674d22998c30b8c811`.
- Automatic Git -> Vercel deployment remains disabled; production releases are qualified and cut over explicitly against exact commit SHAs.

## Production capabilities

- Image generation
- Reference-backed image editing
- Image animation and video generation
- Activity/job lifecycle tracking
- Durable uploads and generated-media persistence
- Media Viewer continuation actions
- Library search, favorites, collections, rename, download, and deletion
- Authentication, profile/preferences, sessions, MFA, export, and account deletion
- Administrative closed-beta operations

## Engineering controls

- Static analysis, TypeScript checks, and JavaScript/TypeScript CodeQL scanning
- Unit and Playwright/browser validation
- Feature-specific integration and lifecycle workflows
- Deterministic GitHub Actions dependency installation from the checked-in lockfile
- Immutable SHA-pinned external GitHub Actions with Dependabot maintenance
- Server-owned job reconciliation, retry, cancellation, and persistence
- Exact-commit production qualification and cleanup evidence

## Enterprise hardening baseline

ENT-001 strengthens application boundaries without changing RenderLab's product flows or shared infrastructure topology:

- Newly completed PNG/JPEG/WebP uploads are read and decoded server-side before they can become durable Library media or ready generation sources. Actual decoded format must match the signed ticket MIME type, animated/multi-page inputs are rejected, and decoded geometry is bounded to 8,192 px per edge and 33,554,432 pixels.
- Width and height for newly completed uploads are derived from decoded bytes on the server; client-submitted geometry remains compatibility input only and is non-authoritative.
- Generation prompt and negative-prompt inputs are bounded to 8,000 characters at the server request contract before persistence or provider dispatch.
- The Next.js application disables `X-Powered-By` and defines CSP, anti-framing, MIME-sniffing, referrer, and permissions-policy headers.
- ENT-001 changes no Supabase schema/Auth policy, Cloudflare R2 resource configuration, provider/worker routing, secrets, scheduler, or production deployment. Production remains whatever exact source is recorded in the authoritative production blocks.

ENT-002 strengthens repository CI and software-supply-chain controls without changing application runtime behavior:

- Applicable workflows install root dependencies with `npm ci --no-audit --no-fund` from the checked-in lockfile.
- All current external GitHub Action references under `.github/workflows` are pinned to immutable 40-character commit SHAs, with Dependabot's monthly `github-actions` maintenance retained.
- JavaScript/TypeScript CodeQL runs on pull requests and protected-main pushes with least-privilege publication permissions.
- Engineering Quality rejects executable workflow `npm install`, non-immutable external action references, loss of Dependabot GitHub Actions maintenance, and CodeQL language/permission drift.
- PR #330 merged as `99a8db8c8038262114d5b5da535cf2e7dea56ad1`; all 68 exact-head workflow runs passed, followed by merged-main Engineering Quality `37289968963` and CodeQL `37289968955`.
- The authoritative enterprise reassessment is now **8.2/10**, up from 8.1 after ENT-001 and 7.8 at the original audit baseline. ENT-002 was not deployed and required no application/shared-infrastructure mutation.

ENT-003 restores the current framework security baseline without changing application behavior:

- Next.js is pinned to **16.3.8**, the patched September 2026 Active-LTS security release, with no other direct or development dependency version change.
- PR #333 merged as `2546978ab19a00bc6c76f6273d66d995d4fdc2e8` after all 24 attached PR workflows and the dedicated exact-SHA release-candidate matrix passed; merged-main Engineering Quality `37300494262` and CodeQL `37300494398` also passed.
- The enterprise score remains **8.2/10** because ENT-003 restores required dependency-security currency rather than changing architecture or broader enterprise maturity.
- ENT-003 was not deployed. Production remains whatever exact source is recorded in the authoritative production blocks.

ENT-004 hardens request and upload-admission boundaries without changing provider routing or the signed direct-R2 upload model:

- Persistent Library uploads and temporary generation-reference uploads share one server-owned per-account admission budget: at most 8 unresolved/provisional tickets and 30 ticket grants per rolling 60 minutes, serialized by owner in PostgreSQL with 10-minute provisional leases.
- Stable 429 contracts distinguish active-cap and rolling-rate rejection, and failed signing/preparation paths release provisional capacity while retaining recent admission history.
- Browser-facing state-changing API routes use one same-origin policy based on explicit `Sec-Fetch-Site` / `Origin` metadata; metadata-less server, CLI and CI callers remain compatible, and server-secret internal maintenance/reconciliation routes keep explicit exemptions.
- Engineering Quality statically checks mutation-route guard coverage, while a dedicated configured integration workflow exercises concurrency, shared Library/reference accounting, stale leases, rate history, signing failure, origin rejection and cross-account isolation.
- Shared migrations `20261005113026 renderlab_upload_admission`, `20261005113423 renderlab_upload_admission_account_lifecycle`, `20261005150908 renderlab_upload_admission_concurrency_fix`, and `20261005150930 renderlab_upload_admission_account_finalizer_fix` are applied to the approved Supabase project. The server-owned reservation table is RLS-enabled/browser-revoked; the corrective forward migrations close the staging/bind accounting race and restore profile/preferences cleanup in the latest account-deletion finalizer.
- PR #336 merged as `fd146a0e411519992f6570bcc6764c2b44e24222` after all 40 exact-head PR workflows reached success. Merged-main Engineering Quality, CodeQL, Upload Admission, Account Data Lifecycle, Account Profile Credential and the broader affected matrix passed on that exact merge SHA. Provider-backed Video Generation Integration run `37336469427` hit one transient status-poll 503 on attempt 1 after two successful real generations; unchanged attempt 2 passed on the same merge SHA, bringing all 19 affected push workflows to accepted success.
- The authoritative post-ENT-004 enterprise reassessment is **8.3/10**, up from 8.2 after ENT-003. The remaining enterprise ceiling is concentrated in durable observability, operations/DR, developer portability, conventional coverage visibility, workflow/module maintainability, and explicit server-only boundaries.
- ENT-004 application behavior is not production-deployed. Production remains the separately recorded exact release; repository merge and shared backward-compatible migrations do not authorize or imply a Vercel rollout.

ENT-005 durable observability and operations hardening — **Closure-time status:** Execution=`COMPLETE`; Repository=`MERGED`; Verification=`MERGED-MAIN VERIFIED`; Deployment=`NOT DEPLOYED` at workstream closure. Present application deployment truth is the Production block above:

- Shared migrations `20261005181527 renderlab_operational_observability` and forward hardening `20261005202352 renderlab_operational_observability_privilege_hardening` add privacy-bounded 30-day diagnostic retention plus deduplicated operational-alert state. Both tables are RLS-enabled/browser-revoked. Live effective-privilege audit after `0028` found Supabase default grants broader than intended, so `0029` narrows `service_role` to diagnostic `SELECT, INSERT`, diagnostic-sequence `USAGE`, and alert `SELECT`; prune/alert mutation and exact `test.<namespace>.` cleanup are service-role-only `SECURITY DEFINER` RPCs. Live role inspection and run-owned insert → alert → cleanup smoke passed with zero residue.
- The merged implementation preserves immediate structured logging and schedules durable persistence as best-effort Next.js `after()` work. Product correctness does not depend on diagnostic storage or Resend notification success.
- Initial alert families are repeated generation/provider degradation, maintenance failure, and third-retry account deletion stuck. Ordinary input/admission/rate-limit rejection does not alert. Notification fanout reuses active Admin emails and existing Resend infrastructure with sanitized content only.
- Existing `/admin` Health remains the only operator UI and the UI-079 three-row hierarchy is unchanged. ENT-005 adds bounded retained-diagnostic filters and compact operational-alert state inside Health; diagnostic `job_id` remains server-only.
- At ENT-005 closure, `docs/operations/INCIDENT_RESPONSE_AND_RECOVERY.md` recorded incident handling and truthful recovery-objective limits while destructive-loss recovery was still unestablished. ENT-007 supersedes that historical recovery state below with verified retained logical database/Auth + R2 restore evidence.
- PR #339 exact head `9a52c51339cfbe33b39f2f668e0132e527bd235e` passed all 20 attached PR workflows, and Account/Admin artifact `11371566032` was human-reviewed clean across desktop, 390px and reduced motion. The implementation squash-merged as `895910e0bb1f683202113592f0c03429b87bdde5`; all 14 affected merged-main push workflows reached accepted success, including unchanged retries after one shared provider-availability window. Final run-owned observability/Auth cleanup is zero-residue. The authoritative post-ENT-005 enterprise score is **8.5/10**.
- ENT-005 does not authorize a production Vercel deployment, paid-plan change, new scheduler, database-backup credential/path, R2 replication resource, telemetry vendor, provider-routing change, or broad refactor.

### ENT-006 — explicit server-only module boundaries

- **Closure-time status:** Execution=`COMPLETE`; Repository=`MERGED`; Verification=`MERGED-MAIN VERIFIED`; Deployment=`NOT DEPLOYED` at workstream closure. Present application deployment truth is the Production block above. Merge SHA `6c80535737fb67a0239ac8cc05a2feaf014d49bf` from PR #342.
- Canonical privileged leaf modules are explicitly marked `server-only`; Engineering Quality rejects Client Component runtime imports from server-owned namespaces and unmarked direct reads of covered high-risk credentials while permitting erased type-only imports.
- Exact-head Engineering Quality `37490780105` and CodeQL `37490780138` passed; merged-main Engineering Quality `37494017112` and CodeQL `37494017131` also passed.
- Dev-only `@babel/parser@7.29.9` is the verifier parser. TypeScript remains exactly `7.0.2` and retains normal compiler ownership.
- At ENT-006 closure the enterprise score remained **8.5/10** and destructive-loss recovery was the largest unresolved gap. ENT-007 supersedes that historical recovery status below; developer portability, coverage visibility and maintainability debt remain material.
- No production deployment or shared-runtime mutation was authorized or performed.

### ENT-007 — destructive-loss recovery

- **Closure-time status:** Execution=`COMPLETE`; Repository=`MERGED`; Verification=`MERGED-MAIN VERIFIED`; Deployment=`NOT DEPLOYED` at workstream closure. This recovery/tooling scope has separately live verified recovery resources; application deployment truth remains the Production block above. Implementation PR #352 exact head `b6decaa6d895e616436861446cd8bfaaaef7e846` passed Engineering Quality `37632681295`, CodeQL `37632681300`, Account Data Lifecycle `37632910417`, Library Lifecycle Visual `37632916211`, and Media Delete Visual `37632921771`. PR #352 squash-merged as `7f7a95a21f403e99095a19b94db39255311cf4d3`; merged-main Engineering Quality `37642455946` and CodeQL `37642455870` passed.
- Cloudflare run `37623562234` configured/read back whole-bucket 7-day lock on private `renderlab-dr-backup`; run `37629604734` re-verified the lock and configured/read back 8-day lifecycle expiry for `ent007/`. The protected Cloudflare credential is an active account token, not the previously inferred DNS-only token.
- Backup run `37630201440` created steady-state retained generation `20261007133932-9f1aa3bd` after verifying both provider policies and minting a one-hour bucket-scoped temporary R2 Object Read & Write credential. It retained 1 durable object / 39,974 bytes plus the encrypted logical database/Auth snapshot and wrote completion last.
- Restore run `37630554797` restored that generation into isolated PostgreSQL 17 and a run-owned R2 prefix: 10 contracted tables, 1 bounded Auth user/identity, 1 object, zero restored sessions, zero missing RLS/browser-grant violations, zero tested orphans, coherent cross-store reference, successful primary-delete simulation and cleanup. Observed backup age was 177 s; DB verification 2,437 ms; R2 verification 1,682 ms; combined verification 5,253 ms. These are drill observations, not SLAs.
- Completed account deletion still removes active primary state; encrypted pre-deletion backup state may remain until the `ent007/` 8-day lifecycle threshold and provider cleanup complete. Disaster cutover requires deletion/reconciliation review before restored state is served.
- Supabase stays on Free; logical recovery is not managed physical backup/PITR and does not preserve active sessions/MFA continuity. The authoritative post-ENT-007 enterprise score is **8.7/10** (8.68 arithmetic mean).

### ENT-008 — developer portability and clean-room reproducibility

- **Closure-time status:** Execution=`COMPLETE`; Repository=`MERGED`; Verification=`MERGED-MAIN VERIFIED`; Deployment=`NOT APPLICABLE` to a standalone application release. PR #356 exact head `82bcf35d7d5ce3f5d3b8309f12457fae9a582d15` passed all 27 attached checks; Developer Portability `37654689761` passed both Node-24 Ubuntu and Windows clean-room jobs, Engineering Quality `37654689460` passed, and CodeQL `37654689450` passed.
- The supported engineering boundary is now Node 24.x + npm 11.x. `npm run doctor` fails closed on incompatible majors; `.gitattributes` + `npm run verify:text-policy` make tracked text LF independent of global Git defaults; workflow-contract assertions normalize CRLF before semantic line checks; Engineering Quality invokes Oxlint/TypeScript through Node package entrypoints rather than Windows `.cmd` shims.
- PR #356 squash-merged as `e6ea8210c47a2d49531daaa0cd80f7267ff488f4`. Merged-main Engineering Quality `37655904404`, CodeQL `37655904054`, and Developer Portability `37655903920` all passed, with both clean-room OS jobs green again.
- The authoritative post-ENT-008 enterprise score is **8.8/10** (8.80 arithmetic mean). Coverage visibility, workflow/module maintainability, performance evidence, and higher-maturity DR remain separate follow-ons. No product/runtime/shared-resource mutation or deployment occurred.

### ENT-009 - conventional unit coverage visibility

- **Closure-time status:** Execution=`COMPLETE`; Repository=`MERGED`; Verification=`MERGED-MAIN VERIFIED`; Deployment=`NOT APPLICABLE` to a standalone application release. Implementation PR #360 final exact head `657522dfcd9dfcbdc92d710ec082a62d9fca040e` passed every attached check and squash-merged as `6a4e91973aa0870dfa75b840b28d6860a60825a5`.
- Merged-main Unit Coverage `37673099294`, Engineering Quality `37673099400`, CodeQL `37673099281`, and Developer Portability `37673099239` passed on the exact merge SHA; the portability run passed both Ubuntu and Windows clean-room jobs.
- The accepted Node-24 unit baseline reproduced after merge: **184 eligible tracked source files**, **172 at zero line coverage**, **5.54% statements/lines (1,295/23,357), 24.16% functions (58/240), and 56.31% branches (290/515)**. Zero-line distribution is `src/app` 57/57, `src/components` 18/18, `src/features` 37/37, `src/lib` 18/22, and `src/server` 42/50.
- Merged-main artifact `11504874549` retains normalized `coverage-summary.json` + `lcov.info` for 14 days (19,253 bytes; SHA-256 `8b8b6d4f999ce6d581c0cefe42b9fb5eb8aff063a9d1a56d3418d7c434e3b0e4`). Dev-only `c8@12.0.0`, the all-source config, and fail-closed report-integrity verifier remain the repository-owned measurement boundary.
- No arbitrary percentage threshold or browser/provider synthetic coverage percentage was introduced. The authoritative same-rubric enterprise score remains **8.8/10** (8.81 arithmetic mean): evidence quality improved, while low unit-test breadth is now explicit. No product/runtime/shared-resource mutation or deployment occurred.
### ENT-010 - CI workflow maintainability

- **Execution:** `COMPLETE`. **Repository:** `MERGED`. **Verification:** `MERGED-MAIN VERIFIED`; the later cumulative 2026-10-09 release provides `PRODUCTION-VERIFIED` evidence for the release-safety boundary. **Deployment:** `NOT APPLICABLE` to ENT-010 as a standalone application release. Tracking issue #362; implementation PR #364 exact head `cfbffdb3725f2dd1d862e1a12bccda13d7124b4c` passed all eight attached workflows and squash-merged as `4b38c0d17ff2e03683f5bb160ba5ded2b6d81588`.
- Merged-main Engineering Quality `37857367143`, Unit Coverage `37857367162`, Developer Portability `37857367142`, and CodeQL `37857367144` passed on the exact merge SHA. Explicit exact-main Create `37857410281`, Activity `37857413881`, Account Identity `37857420956`, and Library `37857417090` configured runs also passed with cleanup; Library passed unchanged on attempt 2 after a first-attempt status-toast timeout that still completed cleanup.
- `.github/actions/setup-node-project/action.yml` now owns only immutable Node-24 setup/npm cache/deterministic install. `scripts/start-ci-app.mjs` owns only fixed-command loopback startup/readiness/log/PID plumbing. Permissions, secrets, build/Chromium ordering, fixtures, verifiers, cleanup, artifacts and concurrency remain workflow-owned.
- Engineering Quality scans immutable external action references in workflows and local actions and enforces fail-closed ENT-010 cohort invariants. Focused startup/negative tests are included in the now-109-test Node unit suite.
- The authoritative same-rubric enterprise score remains **8.8/10** (**8.82** arithmetic mean) after the cumulative production rollout. Code quality/maintainability remains 9.0 and dependency/supply-chain 9.4; deployment validated existing release-safety, operations and reliability controls but added no new rubric control. The module/performance/unit-breadth/DR ceilings are unchanged.

## Known boundaries

- The workspace is not publicly self-service; access requires authorization.
- Provider-backed generation depends on configured production worker/provider availability.
- Some workflows and model routes remain capability-gated until their ownership and production readiness are verified.
- There is no supported public API or community plugin contract at this time.
- The repository is source-visible for evaluation but is not an open-source community project.
- ENT-008 has closed cross-platform dev/test parity with verified Windows + Linux clean-room evidence. ENT-009 now owns conventional all-source unit coverage visibility. ENT-010 now owns a bounded CI-workflow-maintainability slice; large-module decomposition, performance evidence, targeted Node-unit breadth, and higher-maturity DR remain separate follow-ons. Published recovery objectives still require repeated scheduled evidence rather than being inferred from one drill.

## Current direction

Current work focuses on expanding creative workflows, improving continuation between media operations, strengthening organization/project workflows, and preserving production reliability as provider capability grows.

For detailed implementation history, current phase notes, and operational handoff information, see [`PROJECT.md`](../PROJECT.md).
