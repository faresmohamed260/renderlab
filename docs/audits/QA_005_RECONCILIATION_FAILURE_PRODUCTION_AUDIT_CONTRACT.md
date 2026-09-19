# QA-005 Production Reconciliation / Failure Presentation Audit Contract

**Status:** COMPLETE / PRODUCTION-VERIFIED / HUMAN-REVIEWED  
**Tracker:** #278  
**Planning baseline:** repository `main` `d87a627661370ab7d039db62cdab1622f156080d`  
**Production application source:** `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8` at READY deployment `dpl_Cssdq7grVd6eGkN4Y1xqdWPqV8bz`  
**Purpose:** close the final whole-product audit gap by proving bounded generation/reconciliation failures become truthful, actionable terminal Activity states on production without real-user mutation or real provider spend.

## Goal and user value

Prove that an accepted generation cannot remain indefinitely presented as active merely because orchestration or provider-status recovery fails. RenderLab must converge bounded failure fixtures to terminal `failed` state, stop Activity's live refresh treatment, expose safe recovery guidance, and avoid leaking worker/provider diagnostics.

QA-005 is production acceptance work. It is not a redesign, worker/provider resilience rewrite, new error taxonomy, scheduler change, deployment authorization, or permission to exercise real-user jobs.

## Verified starting state

- QA-001 through QA-004 are complete and production-verified. #278 remains open only for QA-005.
- Production remains exact source `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8` at READY deployment `dpl_Cssdq7grVd6eGkN4Y1xqdWPqV8bz`.
- The deployed generation/reconciliation and Activity presentation files are byte-identical to current `main` at planning time:
  - `src/server/generation/reconcile-generation.ts`
  - `src/server/generation/native-generation.ts`
  - `src/server/generation/generation-activity.ts`
  - `src/features/activity/activity-view.tsx`
  - `src/features/activity/activity-auto-refresh.tsx`
- Existing configured Generation Reconciliation coverage already proves the server contracts against isolated fixtures:
  - stale incomplete dispatch older than 15 minutes converges to `failed / generation_orchestration_stalled`;
  - invalid/missing worker identity is bounded and can converge to `failed / generation_worker_unavailable`;
  - retryable provider unavailability older than two hours converges to `failed / generation_provider_stalled`;
  - provider diagnostics remain server-owned while product errors are sanitized;
  - terminalization releases admission capacity.
- Activity already maps failed server detail to product-safe copy and exposes Retry, while `hasActive=false` disables the live auto-refresh indicator/timer.
- The production internal reconciliation endpoint scans active candidates globally unless its process is explicitly test-owner-scoped. QA-005 must **not** invoke the deployed production reconciler against an unscoped candidate set.

## Audit design

QA-005 uses two deliberately separated execution planes.

### 1. Exact deployed reconciliation code, isolated local process

The workflow checks out the operator-supplied exact production SHA into a separate directory and starts that exact source locally in GitHub Actions. The local process:

- points at the approved shared production Supabase/R2 resources;
- enables the repository's existing test-only reconciler owner scope for exactly one run-owned fixture account;
- uses a run-owned localhost mock worker for the provider-failure seam;
- uses a run-local reconciler secret;
- cannot scan or reconcile another account's generation jobs;
- never mutates Vercel deployment/environment state.

This is not a substitute implementation. It executes the exact deployed reconciliation source while constraining candidate selection and provider interaction to the run-owned audit fixture.

### 2. Real production Activity presentation

After the run-owned fixture jobs have terminalized, the workflow opens `https://renderlab.faresuniform.uk/activity` using the fixture's real production account authorization. The real deployed UI must present the terminal failures truthfully and safely.

No production internal-reconcile endpoint is called by the audit.

## Required failure fixtures

### A. Prolonged provider-status outage

- Submit exactly one Image generation through the locally running exact-production application.
- Routing is overridden only in that local process to the run-owned localhost mock worker; **zero real provider-backed generation is dispatched**.
- Put the mock provider job into its explicit unavailable state.
- Backdate only that run-owned job beyond the production two-hour retryable-provider bound.
- Invoke the locally running exact-production internal reconciler under exact owner scope.
- Require terminal:
  - status `failed`;
  - error code `generation_provider_stalled`;
  - sanitized product error message;
  - admission reservation released;
  - no durable media output.
- Require the mock provider's internal diagnostic marker to be retained only in server-owned diagnostic/failover history and absent from product-visible error fields.

### B. Stale incomplete orchestration

- Seed exactly one additional run-owned queued Image job with no worker/provider dispatch identity and a timestamp older than the production 15-minute incomplete-dispatch grace.
- Invoke the same exact-source owner-scoped reconciler.
- Require terminal:
  - status `failed`;
  - error code `generation_orchestration_stalled`;
  - sanitized error message;
  - no durable media output.
- No provider request occurs for this fixture.

## Production Activity acceptance

For both terminal failures, the real production Activity surface must:

- render `Failed` and `Needs action`;
- show product copy equivalent to `Generation did not complete. Retry when you’re ready.`;
- expose the existing Retry action without clicking it;
- mark the rows non-active;
- omit the `LIVE / refreshing active work` indicator;
- remain failed/non-live after waiting longer than one normal Activity refresh interval;
- expose no provider job ID, worker ID, internal diagnostic marker, internal error code, storage key, signed URL, access token or service credential.

Retry is presentation-only in QA-005. The audit must not click Retry because that would authorize a new generation attempt and could spend real provider work through the live production route.

## Responsive / accessibility evidence

Capture and human-review:

- desktop Activity with both failed fixtures;
- desktop visible keyboard focus on one Retry control;
- desktop state after more than one ordinary Activity refresh interval;
- 390px Activity with `prefers-reduced-motion: reduce`;
- no horizontal overflow at 390px.

The evidence must contain only run-owned fixture prompts/state and no credential/token/provider internals.

## Workflow contract

Permanent workflow:

`.github/workflows/production-qa005-reconciliation-failure.yml`

Permanent verifier:

`scripts/verify-production-qa005-reconciliation-failure.mjs`

Required manual inputs:

- `expected_production_sha` — exact 40-character SHA independently verified as production-live;
- `confirm_fixture_only_failure_work` — explicit acknowledgement that Auth/DB mutations are limited to the exact run-owned QA-005 fixture;
- `confirm_zero_real_provider_work` — explicit acknowledgement that provider failure is simulated only through the run-local mock worker and no real provider-backed generation is authorized.

The workflow must:

- be `workflow_dispatch` only;
- use `contents: read`;
- keep `cancel-in-progress: false`;
- checkout the audit harness and separately checkout the exact supplied production source;
- validate the supplied SHA and both acknowledgements before fixture creation;
- validate shared Supabase/R2 secrets;
- install/build the exact production source;
- start only the run-local mock worker and exact-production local app;
- resolve and set the exact QA-005 fixture owner scope before the local app starts;
- pre-clean the deterministic run-owned fixture;
- run the audit;
- run cleanup again under `if: always()`;
- upload one evidence artifact under `if: always()`.

The workflow must never push, deploy, change aliases, mutate Vercel environment variables, change hosted Auth policy, change Supabase schema/RLS, alter R2 bucket configuration, reset workers, or modify provider routing outside the local test-process override.

## Provenance guard

The manifest must record:

- audit `QA-005`;
- GitHub run ID/attempt;
- production domain;
- expected production SHA;
- harness SHA;
- local exact-production checkout SHA;
- fixture-only acknowledgement;
- zero-real-provider acknowledgement;
- `providerBackedGenerationDispatched: false`;
- `runOwnedMockWorkerUsed: true`;
- the two fixture job IDs and only their product-safe terminal codes/statuses;
- Activity evidence file list;
- cleanup result;
- completion timestamp.

Do not record provider job IDs, worker IDs, mock internal diagnostics, passwords, access/refresh tokens, service credentials, signed URLs, raw storage keys, or real-user data.

## Cleanup / non-interference

- Use one deterministic run-owned configured member account scoped by GitHub run ID.
- Pre-clean the exact namespace before setup.
- Track only run-owned fixture state.
- After assertions, delete the fixture through the established configured-account cleanup path.
- Independently require zero remaining run-owned rows at minimum in:
  - `generation_admission_reservations`;
  - `generation_jobs`;
  - `generation_sources`;
  - `media_upload_sessions`;
  - `media_assets`;
  - `renderlab_account_access`;
  - profile/preferences rows if materialized;
  - Auth user.
- Require no run-owned R2 generation output object. The provider-stalled mock job and stale-orchestration job must produce no durable output.
- Cleanup runs unconditionally and cleanup failure fails the audit.
- Do not query, update or delete any real-user job by guessed or broad criteria.

## Explicitly out of scope

- Real provider-backed Image/Video/Edit/Animate/Upscale generation.
- Real-user jobs, prompts, media, accounts, sessions or history.
- Calling the deployed production `/api/internal/generation/reconcile` endpoint.
- Clicking live Retry / Run Again / Cancel.
- Provider/worker reset, redeploy, routing mutation or credential rotation.
- Production deployment or Vercel alias/environment mutation.
- Supabase migration/schema/RLS/Auth-policy changes.
- R2 bucket/CORS/lifecycle changes.
- Global Admin mutation.
- New UI styling, error taxonomy or recovery behavior unless a reproduced product defect requires a narrowly scoped fix.
- Artificially shortening production failure thresholds in application code.

## Defect handling

- If exact deployed reconciliation code fails one of the contracted fixture transitions, classify and reproduce before changing product code.
- If reconciliation succeeds but real production Activity stays active, keeps LIVE refresh, omits safe recovery, or leaks internals, create a dedicated P0–P3 defect issue with exact source/run/artifact evidence.
- Harness/setup failures are not product defects. Correct only the harness and rerun after exact cleanup.
- No automatic rerun may broaden provider work; real-provider budget remains zero.

## Exit criteria

QA-005 is complete when:

- this execution contract is merged before implementation;
- the permanent manual-only workflow/verifier are merged and exact-head verified;
- a manual production audit runs against independently verified source `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8`;
- both failure fixtures terminalize through the exact deployed reconciliation implementation without real provider spend;
- real production Activity presents both as stable, non-live, actionable failures without internal leakage;
- desktop, focused, post-refresh-interval and 390px/reduced-motion screenshots are human-reviewed;
- exact cleanup/non-interference passes;
- bounded Vercel runtime-error inspection is recorded;
- #278 and repository audit docs match verified reality.

When these conditions pass, QA-005 closes the remaining #278 whole-product audit roadmap item. This does not mean every hypothetical provider outage or future capability has been exhaustively tested; it establishes the bounded production failure contract represented by the current product.


## Implementation evidence

- Permanent workflow: `.github/workflows/production-qa005-reconciliation-failure.yml`.
- Permanent verifier: `scripts/verify-production-qa005-reconciliation-failure.mjs`.
- Unit boundary guard: `tests/unit/production-qa005-audit-contract.test.mjs`.
- The implementation separately checks out the operator-supplied exact production source, starts that source only on loopback, owner-scopes its reconciler to the deterministic QA-005 fixture, and routes the only generated fixture through the run-local mock worker.
- The verifier independently proves DB/Auth absence and reconstructs deterministic generation-output keys from any leftover run-owned jobs before cleanup so the unconditional cleanup process can verify R2 absence after an interrupted audit.
- Real production Activity is presentation-only: the verifier inspects both failed rows, Retry availability, non-active state, post-refresh stability, visible focus, 390px reduced-motion geometry and secret-safe rendering without clicking Retry.
- Production execution and human evidence review remain required before QA-005 can close.


## Production evidence

- Contract PR #301 merged as `69eba224b4f3e6e939f288609828c2a8d3d4b5c2`.
- Permanent harness PR #302 exact head `b065e3af18394c300f979ae569263d11b21765b1` passed Engineering Quality `35453629899` and merged as `8930638f47219482b9b7a4fd8063c36197335e50`; merged-main Engineering Quality `35453684388` passed.
- Manual production audit run `35453752650` executed as a genuine `workflow_dispatch` from merged `main`, supplied exact production source `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8`, and acknowledged both fixture-only failure work and zero real provider work.
- The exact deployed source ran only on loopback with owner-scoped reconciliation. The provider-status fixture terminalized as `failed / generation_provider_stalled`; the stale incomplete-dispatch fixture terminalized as `failed / generation_orchestration_stalled`. No real provider-backed generation was dispatched.
- Real production Activity rendered both failures as stable non-active `Failed / Needs action` rows with safe Retry guidance, no LIVE refresh indicator and no provider/worker/internal-code leakage. Retry was never clicked.
- Artifact `10587349110` (`production-qa005-reconciliation-failure-35453752650-1`) has digest `sha256:941c7786707616a1b811e38f2d54da5b2deec3b4d391a176ae249e6eef343b8e`. The downloaded ZIP matched that digest exactly.
- The artifact contains four screenshots plus `manifest.json`. Human review accepted desktop failure state, visible Retry focus, post-refresh-interval stability, and 390px reduced-motion evidence with no horizontal-overflow blocker or sensitive/provider-internal exposure.
- The manifest records `providerBackedGenerationDispatched=false`, `runOwnedMockWorkerUsed=true`, cleanup `verified=true`, zero contracted DB/Auth residue and two deterministic R2 output objects checked.
- The unconditional post-audit cleanup step passed independently. The temporary dispatcher branch was reset back to merged `main` immediately after dispatch.
- Vercel runtime inspection for `2026-09-19T16:04:30Z`–`16:07:00Z` found no grouped runtime errors and no production error/fatal log entries.
- Production deployment remained unchanged: latest READY production deployment is `dpl_Cssdq7grVd6eGkN4Y1xqdWPqV8bz` at exact Git source `2fc64231f8aa0e5a2df8b2698824319a25c4e9f8`.

QA-005 therefore closes the bounded provider/reconciliation failure-presentation acceptance item. This remains a bounded contract, not a claim that every future provider failure mode has been exhaustively exercised.
