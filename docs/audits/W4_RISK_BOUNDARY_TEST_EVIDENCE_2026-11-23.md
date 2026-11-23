# W4 — risk-weighted non-lifecycle behavioral test evidence

**Date:** 2026-11-23 · **Scope:** tests, test-only CI and dated audit. No edits to application source (`src/`), Supabase, workers, migrations, release records or mirrors. No releases, secrets, external APIs, real storage or generations.

## Decision and coverage sources

Chosen from the [P0-03 owner-isolation privileged-call-site registry](../architecture/P0_03_TRUST_BOUNDARIES_AND_OWNER_ISOLATION_CONTRACT.md) and [Unit 5 deterministic harness standard](P0_05_DETERMINISTIC_CRITICAL_PATH_TEST_MAP_2026-11-23.md). Original starting `main`: [587beec4](https://github.com/faresmohamed260/renderlab/commit/587beec4cbac38828a89b0093c3b27a72de719b3). Original all-source unit baseline at [45237391028](https://github.com/faresmohamed260/renderlab/actions/runs/45237391028): 29% global lines, 132/216 source modules unexecuted. Selection weights ability to leak cross-owner data, authorize privileged changes, consume upload capacity, delete/export data, or mislead operators — **not global percentage**.

Other surveyed modules: `account/account-preferences.ts` (167/201 lines = 83.08%; 29/35 branches = 82.85%) and `observability/operational-alert-notification.ts` (100/102 lines = 98.03%; 8/14 branches = 57.14%). Both already have meaningful existing tests; they were **excluded** from the 11-module low-coverage shortlist. The `storage/r2.ts` target was declared before its new dedicated unit suite.

### Explicit risk, behavior and predeclared per-module line target

| Module | Regression prevented | Target |
| --- | --- | ---: |
| `account/account-access.ts` | blank/unknown invite rejection; normalized email and actor-bound invitation claim | ≥75% |
| `media/upload-admission.ts` | independent active/rate limit denials, owner-bound reservation bind and release | ≥85% |
| `admin/admin-settings.ts` | integer limit boundaries, admin-only RPC actor and safe failures | ≥90% |
| `media/media-assets.ts` | soft-delete/purge and replay, safe downloads, owner-scoped collection pagination | ≥50% |
| `media/media-collections.ts` | cross-owner membership rejection, idempotent same-owner insert and duplicate name conflict | ≥65% |
| `observability/diagnostic-store.ts` | redacted projection, bounded operator queries and no raw gateway 401 body | ≥50% |
| `account/account-profile.ts` | deleting account mutation prohibition, avatar purge ordering and source sanitation | ≥45% |
| `media/media-uploads.ts` | foreign ticket denial, completed upload replay, mismatch rejection before asset write | ≥45% |
| `admin/admin-operations.ts` | last-admin/self-lockout safe mapping, actor/target separation and invitation uniqueness | ≥45% |
| `observability/oldest-active-job-store.ts` | index-bounded four-status queries, isolated test owner and warning boundary | ≥80% |
| `storage/r2.ts` | signed GET/PUT TTL and headers, metadata sanitization, 404 vs 403, write failure | ≥85% |

### Per-module comparison — covered/total (percent)

**Before:** test-only baseline reporter [45238750278](https://github.com/faresmohamed260/renderlab/actions/runs/45238750278), which preceded the new W4 behavior suites. R2 baseline is [45241265015](https://github.com/faresmohamed260/renderlab/actions/runs/45241265015), captured before the dedicated R2 suite; its preceding new suites used only a stub R2 import. **After:** tests + reporter [45241435617](https://github.com/faresmohamed260/renderlab/actions/runs/45241435617), head `43b597a`. Counts are all-source c8/V8 **unit** coverage; branches have a changing total as previously unexecuted modules are imported, hence display both fractions.

| Source module | Before lines | Before branches | After lines | After branches | Line target |
| --- | ---: | ---: | ---: | ---: | ---: |
| `src/server/account/account-access.ts` | 0/78 (0.00%) | 0/1 (0.00%) | 76/78 (97.43%) | 11/13 (84.61%) | ≥75% ✓ |
| `src/server/media/upload-admission.ts` | 31/106 (29.24%) | 1/1 (100%) | 106/106 (100%) | 20/21 (95.23%) | ≥85% ✓ |
| `src/server/admin/admin-settings.ts` | 0/98 (0.00%) | 0/1 (0.00%) | 98/98 (100%) | 27/29 (93.10%) | ≥90% ✓ |
| `src/server/media/media-assets.ts` | 232/399 (58.14%) | 17/39 (43.58%) | 334/399 (83.70%) | 45/79 (56.96%) | ≥50% ✓ |
| `src/server/media/media-collections.ts` | 91/202 (45.04%) | 6/12 (50.00%) | 143/202 (70.79%) | 22/29 (75.86%) | ≥65% ✓ |
| `src/server/observability/diagnostic-store.ts` | 193/301 (64.11%) | 9/27 (33.33%) | 268/301 (89.03%) | 42/57 (73.68%) | ≥50% ✓ |
| `src/server/account/account-profile.ts` | 87/310 (28.06%) | 1/1 (100%) | 191/310 (61.61%) | 29/40 (72.50%) | ≥45% ✓ |
| `src/server/media/media-uploads.ts` | 160/285 (56.14%) | 8/28 (28.57%) | 195/285 (68.42%) | 21/41 (51.21%) | ≥45% ✓ |
| `src/server/admin/admin-operations.ts` | 0/449 (0.00%) | 0/1 (0.00%) | 231/449 (51.44%) | 36/45 (80.00%) | ≥45% ✓ |
| `src/server/observability/oldest-active-job-store.ts` | 0/23 (0.00%) | 0/1 (0.00%) | 23/23 (100%) | 5/5 (100%) | ≥80% ✓ |
| `src/server/storage/r2.ts` | 62/113 (54.86%) | 14/17 (82.35%) | 113/113 (100%) | 31/37 (83.78%) | ≥85% ✓ |

**Outcome:** all 11 predeclared selected module line targets met; do not infer that unmeasured branches are safe or that all routes are integration-tested. V8 branch denominators may change when modules become instrumented.

## Determinism and CI

Test-only `tests/helpers/w4-fixture.mjs` uses synthetic owners and credentials, in-memory fake PostgREST/storage, fixed clock, and a loader that transforms existing TypeScript parameters without editing source. Direct R2 tests replace the SDK signer/client, and fail on unexpected network access. No production service is contacted.

- [W4 CI #45241435617](https://github.com/faresmohamed260/renderlab/actions/runs/45241435617): `npm run test:unit:coverage` **537 passed, 0 failed**; `W4_DETERMINISM_PASS` **20 independent Node processes × 70 W4 test cases = 1,400 passing executions, 0 failures, 0 skips**.
- New tests assert real outcomes: cross-owner rejection before storage, idempotent deletion and replay, safe exception classifications, admin role/limit boundaries, attachment metadata and no diagnostic secrets; no test solely checks source text.
- Earlier failing W4 CI was a **test-fixture loader/state initialization issue**, fixed within test-only helpers; the passing run did not require weakening any behavioral assertion. No application defect was established.
- Exact rebased head must pass Engineering Quality (`npm run test:unit`, `npm run build`), Developer Portability, Unit Coverage, Documentation Governance (`npm run verify:docs-governance`), explicit `npm run verify:ui-purity`, W4 20-run gate, and CodeQL. Non-required Vercel preview account block is not a merge blocker. **No release.**
