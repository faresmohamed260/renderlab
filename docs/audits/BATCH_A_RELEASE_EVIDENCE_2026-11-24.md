# Batch A production release evidence — 24 November 2026

**State: production cutover completed and canonical release record prepared; authenticated provider documentation sync and one approved hosted fixture remain pending until verified.** The release record is closed separately from hosted lifecycle acceptance; do not claim fixture success before the one-call run and independent read-back.

## Exact boundaries

- Released Git SHA: `e28b41922728e1052f9021b36bef67a84684f979` (clean checkout). Baseline: `b548fe40ac274bb4d5bc6d2674ce7bfac556bfcf`.
- Worker tree: `614ad3132a27b60dee17017462886fae0dec24c7`; renderer-specific dependency `native_graph.py` changed. `FiboInputRejected` extends `ValueError`.
- New Production Vercel deployment: `dpl_HSCgbGPfxTpkGRzuLPEhicaATwX6`, `https://renderlab-qbu4lqk2v-faresmohamedsalah10-1681.vercel.app`, READY and marked Current for `renderlab.faresuniform.uk`. Deployment was staged before promotion with automatic custom-domain assignment disabled.
- Previous known-good Vercel deployment and rollback anchor: `dpl_2J4BXM3Y4xF9JWo1cdj38Da5CWJR`, SHA `b548fe40ac274bb4d5bc6d2674ce7bfac556bfcf`.
- **Verified cutover read-back (team account):** Vercel alias `updatedAt` = `2026-11-23T23:25:33.592Z`; exact custom domain `renderlab.faresuniform.uk`, deployment `dpl_HSCgbGPfxTpkGRzuLPEhicaATwX6`, project `prj_APU35jTnge27D2MAFjuc7GP0Dd6I`.

## Additive migrations and credentials

- Vercel Production `RENDERLAB_GENERATION_RECONCILER_SECRET` rotated to an independently RNG-generated 64-character write-only value at approximately `2026-11-23T23:14:45Z`. `CRON_SECRET` rotated likewise at approximately `2026-11-23T23:16:42Z`. No secret values were recorded or exported. Manual verification scripts must receive these credentials at invocation time.
- `0032_verified_email_invitation_claim.sql` applied `2026-11-23T23:17:37Z`, Supabase ledger `20261123231737`; signature and verified-email guard present, service-role EXECUTE true, anon/authenticated false, null-input no-op returned no rows. Existing single admin access remained `admin/active` across the migration.
- `0033_generation_reconciliation_fairness.sql` applied `2026-11-23T23:18:13Z`, ledger `20261123231813`; last-reconciled column, both indexes and atomic claim-function update present, grants restricted to service role, null claim returned false.

## Qualification and application cutover

- Protected-main exact-head required check run IDs: quality `138061953720`; governance `138061952455`; unit coverage `138061953393`; javascript-typescript `138061953311`; Ubuntu clean-room `138061953290`; Windows clean-room `138061953776`; all passed.
- Deployment Readiness: [run 45287742956](https://github.com/faresmohamed260/renderlab/actions/runs/45287742956), completed green `2026-11-23T23:19:40Z` for exact released SHA; latest of all six protected-check completions and readiness was `2026-11-23T23:19:40.000Z` **before** the verified cutover at `2026-11-23T23:25:33.592Z` (5m 53.592s margin).
- Modal renderer `renderlab-image-generation` app `ap-wS5WKruuipwssNGHf7Eo6k`: v10, deployed `2026-11-23T23:29:59Z`, tag `e28b419`; rollback renderer v9 tagged `decd2f6`.
- Modal gateway plus dispatcher `renderlab-generation-gateway` app `ap-UfrkwIijsdz6xiGiQwtMlB`: v11, deployed `2026-11-23T23:30:29Z`, tag `e28b419`; rollback gateway v10 tagged `decd2f6`.
- Both Modal apps matched expected IDs in environment `main`; no other Modal deployment was performed.

## Live no-GPU checks

- `/` 200, `/api/health` 200 with `status=ok`, `GET /api/generation/jobs` 200 with `available=true`, `fiboAvailable=true`, `fiboMaskAvailable=true`.
- Invalid same-origin generation POST returned sanitized HTTP 400 `invalid_request`; signed-out Admin Health returned sanitized HTTP 403 `admin_access_required`.
- Privileged read-only Admin/dispatch RPCs reported **0 active jobs, 0 unresolved dispatches, 0 expired claims, 0 held active reservations**, and a healthy scheduled heartbeat (18 seconds old when measured). This is not a substitute for a signed-in browser Admin Health session.
- **Not yet proven:** authenticated gateway invalid-status poll, the one approved FIBO generation, one atomic terminalization call, unchanged second Library load, fixture cleanup and zero residue, and the canonical documentation sync.

## Canonical record and mirrors

- Canonical `docs/production/current.json` and the five human-readable mirrors were advanced to `e28b419` with the exact Vercel alias cutover, six protected check IDs, readiness completion, migrations 0032/0033, worker versions, and rollback anchors. GitHub merge, production documentation sync, and the hosted fixture each require their own later proof; this statement does not assert they have passed.

## Batch A acceptance closeout — 2026-11-24 UTC

- Record [PR #634](https://github.com/faresmohamed260/renderlab/pull/634) merged as `94fe89906e5d81f2f9c3bb8ba81fd4f80f96ccb5` after all six required checks and CodeQL passed. Vercel's unrelated PR integration reported account blocked, not a protected-main required check.
- [Production Documentation Sync #45293729989](https://github.com/faresmohamed260/renderlab/actions/runs/45293729989): **SUCCESS**, independently compared manifest and five mirrors to exact production SHA `e28b41922728e1052f9021b36bef67a84684f979`, Vercel alias `updatedAt=2026-11-23T23:25:33.592Z`, GitHub qualification and rollback. Latest qualification `2026-11-23T23:19:40.000Z` preceded cutover.
- [Production FIBO Smoke #45294385227](https://github.com/faresmohamed260/renderlab/actions/runs/45294385227): **SUCCESS**, exactly one `text-to-image` generation, protected-main harness `94fe899`, expected production SHA `e28b419`, no cutover override; release preflight passed before fixture work. **Standing one-generation allowance consumed; do not retry or dispatch another.**
- Downloaded artifact `production-fibo-smoke-45294385227-1/manifest.json`: `passed=true`, `providerGenerationCount=1`, `smokeDurableProof.status=succeeded`, exactly one output asset and Library asset, `completedAt` and `reservationReleasedAt` both `2026-11-24T02:10:22.35998+02:00`, `stableAfterSecondLibraryLoad=true`. Browser harness asserts accepted HTTP 202 submission, succeeded activity and stable Library revisit; screenshots retained in workflow artifact.
- Independent Supabase `pg_stat_statements` normalized atomic RPC query ID `-2583045759348788091`: calls **1 before**, **2 after**, exactly one additional atomic terminalization. This is a bounded counter observation, not permanent per-job tracing.
- Cleanup in workflow and final independent `--cleanup-only` both passed. Artifact `cleanup.verified=true`, `contractedDbAuthResidue=0`, `trackedR2ObjectsChecked=3`; independent production SQL: **0 active jobs, 0 unreleased reservations, 0 outbox rows**.
- Read-only `modal app history --env main`: renderer `renderlab-image-generation` **v10** and gateway/dispatcher `renderlab-generation-gateway` **v11**, both tagged `e28b419`. Rollback pair renderer v9, gateway v10 tagged `decd2f6`. These are deployed-version read-backs, not per-request distributed traces.
- **Disposition: PASS, batch A closed.** App `e28b419` remains live, migrations 0032/0033 remain applied, no rollback required. Batch B may merge only through required gates and must **not release** without a separate head-engineer order.

## Release stop state

No further merges or unrelated PRs are included. **Batch B and TLS canary remain blocked pending the production documentation sync and verified hosted acceptance.** On a real runtime/auth/data/dispatch regression, stop without repeating provider work, roll back the web deployment and restore the previous renderer then gateway versions; installed additive migrations remain.
