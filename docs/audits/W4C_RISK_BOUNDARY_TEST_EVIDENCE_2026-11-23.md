# W4 Task C — second-batch backend risk tests: evidence

**Date:** 2026-11-23. **Initial branch baseline:** [main at `c7895797`](https://github.com/faresmohamed260/renderlab/commit/c7895797e0be12b9ddc7b75dcd3a1386c55ea968). **Scope:** test-only CI, deterministic unit suites and this dated audit. No `src/**`, `supabase/**`, `workers/**`, production record or mirrors, deployments, external services or secrets. [PR #583](https://github.com/faresmohamed260/renderlab/pull/583).

## Risk-weighted selection and targets (fixed before new W4C suites)

Chosen from the [P0-03 privileged call-site/owner registry](../architecture/P0_03_TRUST_BOUNDARIES_AND_OWNER_ISOLATION_CONTRACT.md), [Unit 5 harness convention](P0_05_DETERMINISTIC_CRITICAL_PATH_TEST_MAP_2026-11-23.md), and latest completed main [Unit Coverage #45242192259](https://github.com/faresmohamed260/renderlab/actions/runs/45242192259). Batch B excluded except `admin-operations.ts`, explicitly renewed from 51.44%. Per-module **line** goals were declared in the initial W4C PR before test implementation; branch counts are reported too, but no vanity global target was set.

| Module (all paths under `src/`) | Behavior that must break on regression |
| --- | --- |
| `admin/admin-operations.ts` | admin actor vs target, invitation revocation/idempotency, account projection and authorized bounded global Health |
| `account/account-data-lifecycle.ts` | owner-only export, deletion quiescence, CAS renewal, R2 residue before Auth deletion, safe retry |
| `account/account-sessions.ts` | fresh session ownership, malformed projection denial, exactly-one current session and sorting |
| `account/account-profile-request.ts` | anonymous/MFA/admission gating before privileged profile read |
| `media/reference-uploads.ts` | reference/mask distinction, owner binding, upload admission and byte/geometry verification before ready |
| `account/account-deletion-notification.ts` | no-key, rejected/malformed delivery response and safe synthetic recipient/template |
| `observability/diagnostics.ts` | bounded counters, canonical gateway auth 401/403 tuple, stable correlation and secret omission |
| `app/api/media/assets/batch-delete/route.ts` | mixed-owner IDs, UUID/batch cap, deduplication and partial deletion outcome sanitization |
| `app/api/media/assets/[assetId]/download/route.ts` | foreign asset 404, no R2 signature, private/no-store redirect |
| `app/api/media/uploads/upload-tickets/route.ts` | same-origin, auth, size limits and independent admission 429 |
| `app/api/media/uploads/upload-completions/route.ts` | owner-bound foreign ticket 404 and verification 409 |
| `app/api/account/data-export/download/route.ts` | fresh auth/MFA first, owner-bound short-lived signed export URL |

First baseline-only reporter [#45246532776](https://github.com/faresmohamed260/renderlab/actions/runs/45246532776) showed `media/image-upload-validation.ts` already at 100/106 lines (94.33%), 22/31 branches (70.96%), and `observability/operational-alerts.ts` at 121/121 lines (100%), 23/24 branches (95.83%). Both were **removed before adding tests**, not claimed as improvements; replaced by account-deletion notification and batch-delete route. Second baseline-only reporter [#45246826021](https://github.com/faresmohamed260/renderlab/actions/runs/45246826021) established their pre-W4C coverage and fixed both 95% goals.

## Measured per-module unit line and branch coverage

**Before:** baseline-only W4C runs [45246532776](https://github.com/faresmohamed260/renderlab/actions/runs/45246532776) and [45246826021](https://github.com/faresmohamed260/renderlab/actions/runs/45246826021). **After:** [W4C exact-head CI #45248922796](https://github.com/faresmohamed260/renderlab/actions/runs/45248922796) at `88da89f` before a docs-only rebase. Coverage is c8 all-source **unit**, shown as covered / measured total (percent). Branch denominators grow when newly imported code is instrumented; percentages alone are insufficient without their totals.

| Module | Before lines | Before branches | After lines | After branches | Predeclared line target |
| --- | ---: | ---: | ---: | ---: | ---: |
| `src/server/admin/admin-operations.ts` | 231/449 (51.44%) | 36/45 (80.00%) | 430/449 (95.76%) | 75/85 (88.23%) | ≥65% — met |
| `src/server/account/account-data-lifecycle.ts` | 161/764 (21.07%) | 5/9 (55.55%) | 478/764 (62.56%) | 76/106 (71.69%) | ≥45% — met |
| `src/server/account/account-sessions.ts` | 0/103 (0%) | 0/1 (0%) | 102/103 (99.02%) | 34/40 (85.00%) | ≥85% — met |
| `src/server/account/account-profile-request.ts` | 0/23 (0%) | 0/1 (0%) | 23/23 (100%) | 8/8 (100%) | ≥90% — met |
| `src/server/media/reference-uploads.ts` | 106/275 (38.54%) | 5/22 (22.72%) | 265/275 (96.36%) | 58/71 (81.69%) | ≥65% — met |
| `src/server/account/account-deletion-notification.ts` | 13/53 (24.52%) | 1/1 (100%) | 53/53 (100%) | 13/13 (100%) | ≥95% — met |
| `src/server/observability/diagnostics.ts` | 299/315 (94.92%) | 71/85 (83.52%) | 309/315 (98.09%) | 86/94 (91.48%) | ≥90% — met |
| `src/app/api/media/assets/batch-delete/route.ts` | 0/97 (0%) | 0/1 (0%) | 95/97 (97.93%) | 28/29 (96.55%) | ≥95% — met |
| `src/app/api/media/assets/[assetId]/download/route.ts` | 21/26 (80.76%) | 2/4 (50%) | 26/26 (100%) | 9/9 (100%) | ≥95% — met |
| `src/app/api/media/uploads/upload-tickets/route.ts` | 0/64 (0%) | 0/1 (0%) | 64/64 (100%) | 15/15 (100%) | ≥95% — met |
| `src/app/api/media/uploads/upload-completions/route.ts` | 0/66 (0%) | 0/1 (0%) | 66/66 (100%) | 12/12 (100%) | ≥95% — met |
| `src/app/api/account/data-export/download/route.ts` | 0/24 (0%) | 0/1 (0%) | 24/24 (100%) | 8/8 (100%) | ≥95% — met |

**Outcome:** **12 of 12** risk-weighted module line targets met. This does not establish that every integration or branch is tested. No real application defect was confirmed; the first red run resulted from isolated test-fixture service-key, RPC-path and redirect semantics, repaired **only inside tests**, without changing a production source or weakening negative assertions.

## Determinism and reproducibility

- [CI #45248922796](https://github.com/faresmohamed260/renderlab/actions/runs/45248922796): `npm run test:unit:coverage` green; explicit `npm run verify:ui-purity` and `npm run verify:docs-governance` green.
- **20 independent Node processes × 80 new W4C cases = 1,600 passing test executions**, zero failures and zero skipped tests; `W4C_DETERMINISM_PASS` reports SHA-256 test-set fingerprint `6bf70255e03f47e0cbffdd95246bc847e6c5964fa69202b84387d49aa46486d0`. The process count and fingerprint are checked on every iteration. Cases focus on owner mismatch, deny-before-side-effects, finite limits, idempotency and typed error mapping — not merely line execution.
- Mocks: two synthetic owners, deterministic fake Auth/PostgREST/R2 signers, fixed clock/UUID where used, no network, no real emails, no generation, no Modal. Mail tests intercept `fetch` and use an explicit synthetic key. All signing/DB interaction is in-memory.
- Final merge requires a **fresh exact rebased head** with Engineering Quality (includes `npm run build` and unit tests), Unit Coverage, Developer Portability (Ubuntu + Windows), Documentation Governance, CodeQL and W4C 20-repeat CI green. Non-required Vercel preview account block remains unrelated. Tests/docs have no release.
