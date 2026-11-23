# P0-07 production atomic terminalization — release-backed single-fixture acceptance

**Date:** 2026-11-23 (all timeline below UTC). **Disposition: PASS.** One and only one newly authorized FIBO generation was executed. No provider retry, second fixture, new secret, worker/Modal edit, Supabase schema change beyond the separately approved and already-applied 0031, S.A.G.A. or resume edit.

## Immutable production release and qualification

| Evidence | Exact value |
| --- | --- |
| Production alias | `renderlab.faresuniform.uk` |
| Deployment, ready and re-promoted | `dpl_2J4BXM3Y4xF9JWo1cdj38Da5CWJR`, source `b548fe40ac274bb4d5bc6d2674ce7bfac556bfcf` |
| Canonical assigned alias `cutoverAt` | **`2026-11-23T20:00:50.248Z`**, from authenticated team Vercel alias API HTTP 200 read-back |
| Rollback | `dpl_DPm2p2XMTiR7GrMasYPbeAYkvMhJ`, source `696ca784759eb94457005381fc34b0509d00e920` |
| Release readiness | [Deployment Readiness #45252066830](https://github.com/faresmohamed260/renderlab/actions/runs/45252066830) passed exact deployed SHA at **19:45:23Z** |
| Effective `qualifiedAt` | **19:45:57Z** — latest of six exact-source required CI contexts; `javascript-typescript` completed at 19:45:57Z; before cutover |
| Release record | [PR #586](https://github.com/faresmohamed260/renderlab/pull/586), merged `784aa099e408fccd8b65c11a59232e7f2fc057eb`, canonical manifest + five mirrors |
| Timestamp correction | [PR #587](https://github.com/faresmohamed260/renderlab/pull/587), merged `caf1e01c0314a39023c10c67e9a18449edde631e`; corrected `qualifiedAt` from readiness end to last required check |
| Record provider sync | [Production Documentation Sync #45258466364](https://github.com/faresmohamed260/renderlab/actions/runs/45258466364) **SUCCESS**, including independent Vercel/GitHub live-state comparison |
| Application changes | [PR #580](https://github.com/faresmohamed260/renderlab/pull/580) atomic terminalization and [PR #584](https://github.com/faresmohamed260/renderlab/pull/584) Admin UTC hydration-safe formatter only; no other runtime or worker delta |
| Production migration | `0031_atomic_generation_terminalize_release.sql` applied via connected Supabase executor as **`20261123193049`**, approximately **19:30:49Z**, prior to app deployment. Service-only function is `SECURITY DEFINER` with empty `search_path`; `EXECUTE` restricted to `postgres` and `service_role`; verified no-op result `not_found` |

The first promotion of this *same immutable deployment* was conservatively rolled back to the previous app on a historical Admin #418 observation (rollback alias assigned `19:54:34.735Z`). The owner clarified #418 is informational, not a lifecycle release gate, and authorized **re-promotion without rebuild** at `20:00:50.248Z`. No second app binary or migration execution occurred.

## One approved live provider attempt — actual evidence

- [Production FIBO Smoke #45259301091](https://github.com/faresmohamed260/renderlab/actions/runs/45259301091) manually dispatched **once** at **20:25:57Z** from protected `main` harness `c424899c1d121b9fa64d520bdf18809ccc356e6d`. Inputs: `scenario=text-to-image`, `expected_production_sha=b548fe40ac274bb4d5bc6d2674ce7bfac556bfcf`, `confirm_bounded_fixture_provider_work=true`, **no Modal cutover override**. The workflow's built-in release documentation and live identity preflight succeeded **before** fixture account setup.
- [PR #588](https://github.com/faresmohamed260/renderlab/pull/588) merged the read-only fixture durability and second-Library-load assertions after six required CI checks + CodeQL; it changed **only** `scripts/verify-production-complete-user-journey.mjs` and its unit contract test. No production runtime, workflow, provider or migration code was modified. The workflow retains pre-cleanup, exactly-one-generation, always-cleanup and proof-artifact steps.
- Exactly **one** disposable fixture owner and **one** job (`ede22e4d-4fa4-41ba-b8a3-22427e4aff51`) were observed. At **20:26:50Z**, the browser API returned **202 Accepted** with that job ID. Activity progressed `queued → running → succeeded`; the test recorded `running` at **20:27:10Z** and `succeeded` at **20:27:45Z**.
- The artifact `manifest.json` records **`providerGenerationCount=1`**, **`generationJobCount=1`**, `passed=true`, `smokeDurableProof.status=succeeded`, `outputAssetIds.length=1`, `assetIds.length=1`, and **`stableAfterSecondLibraryLoad=true`**. The output is indexed in the durable job and linked to exactly one live `media_assets` row.
- The same proof records nonempty `completedAt` and `reservationReleasedAt`: **`2026-11-23T22:27:43.488011+02:00`** (equivalent to **20:27:43.488011Z UTC**). The reservation was bound to the job. On the **second** `/library` visit, both the UI result and the read-only job/asset/reservation snapshots were **identical**. A second Library visit did **not** terminalize again, create another asset, or re-hold admission.
- **Atomic route, one call:** before the run, read-only `pg_stat_statements` had **no PostgREST `renderlab_terminalize_generation_and_release` query row** (only the previous one-off SQL sentinel test and migration DDL). After the run a distinct normalized PostgREST invocation appears with query ID **`-2583045759348788091`**, **`calls=1` and `rows=1`**; its query includes the exact 9-argument RPC. A repeat read at **20:30:42Z** still shows **1/1**. Together with the durable job terminalization and released reservation witness, this is direct release-backed evidence of **one atomic RPC application for this fixture**. This is a bounded comparison of Postgres statement statistics, not a claim of permanently enabled per-job tracing or a global metric series.
- **Cleanup:** in-step finally cleanup and the independent final cleanup step both succeeded. The artifact reports `cleanup.verified=true`, **0 contracted DB/Auth residue** and **3 tracked R2 objects independently checked absent**. The artifact contains **9 evidence screenshots/files** alongside the manifest, retained by the existing workflow for 30 days. GH run status **SUCCESS** and the final artifact manifest `passed=true`. No second generation or retry was dispatched.

## Independent SQL and site checks after cleanup

Read-only Supabase confirmation at **20:28:57Z** found: **0 active generation jobs**, **0 unreleased reservations**, **0 outbox rows**, and **0 run-owned job, reservation and media-asset rows**. A repeat at **20:30:42Z** again showed **0/0/0**, and unchanged **1 PostgREST atomic function call / 1 result**.

Read-only HTTP on `https://renderlab.faresuniform.uk` after the fixture: root **200**, `/api/health` **200 `{"status":"ok"}`**, `/api/generation/jobs` **200** with `available=true`, `fiboAvailable=true`, `fiboMaskAvailable=true`, and signed-out `/api/admin/health` **403 `admin_access_required`**. No live behavior warranted rollback; the new deployment remains current and migration 0031 remains installed.

## Admin hydration noise — separate, informational

Historical regular Brave Admin console screenshots under both old and first new app promotion showed **minified React #418** with URL arguments `args[]=text&args[]=`; this did **not** constitute a failed generation or atomic settlement. After re-promotion, two fresh authenticated Admin reloads with DevTools logging showed **no #418**. A *clean unauthenticated Brave Private window* requesting `/admin` received the expected **404**, without #418; this is **not** an authenticated comparison. The prior minified JavaScript stack (no React component stack exposed) and this distinction were posted to [PR #584](https://github.com/faresmohamed260/renderlab/pull/584). Separate Vercel dashboard React #418 in the same regular Brave profile is only a browser-context observation, **not** a proven cause. Owner instructed that hydration noise is **not** a release gate.

## Exit disposition

**Release-backed P0-07 acceptance: PASS for the one approved FIBO text-to-image path.** Scope of proof is the single actual provider journey, exact-source CI and readiness, exact alias cutover, atomic SQL RPC invocation observed once, one durable asset, released reservation, repeat Library read idempotence, and independent zero-residue cleanup. It **does not** claim blanket SQL state-transition enforcement, scheduled settlement for never-returning owners, another provider, or additional generated samples. The **one-generation authorization is consumed**. The canonical production record remains the source of truth; do not run another smoke without new owner authorization.
