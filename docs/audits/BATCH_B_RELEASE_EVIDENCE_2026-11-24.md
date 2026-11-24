# Batch B production release evidence — 24 November 2026

Cutover, repository synchronization and one authorized hosted fixture verified.

## Scope and qualification

- Exact released application SHA: `564d0ed0ac677fce301aa94d64f9358e3f9d31ca`; previous live SHA: `e28b41922728e1052f9021b36bef67a84684f979`. [Full delta](https://github.com/faresmohamed260/renderlab/compare/e28b41922728e1052f9021b36bef67a84684f979...564d0ed0ac677fce301aa94d64f9358e3f9d31ca).
- Expected application runtime delta only: provider-only FIBO port/submit/status/cancel (#626/#627/#630); fail-open bounded metrics and Admin Health aggregates (#629); owner-scoped request idempotency and API/callsite contracts (#633). Additive SQL #628, CI #631, evidence pack #632 and batch A documentation. No worker files changed.
- #630 merged as `04e8a6b343778d9cacaa9cb2a39ca4524efa33c6`; #633 rebased exact head `e5e0188e286a77fd030aa6ee82101e36062a1825` passed required checks, CodeQL and disposable Postgres before squash.
- TLS canary #625, qualified HEAD `b1197875faaa31ec64ddc5d969beea45ea20192d`, environment main: started 2026-11-24T01:03:08.1274928Z, ended 01:03:11.5602782Z, exit 1, no retained PASS/FAIL marker. No retry. #603/#625 held unmerged; no TLS hardening, ComfyUI environment scrub or Modal origin pinning included. Raw output was not retained; no TLS cause asserted. [Worker 4 handoff](https://github.com/faresmohamed260/renderlab/pull/625#issuecomment-7119024373).
- Six required exact-source check IDs: quality 138136182053, governance 138136181064, unit-coverage 138136180466, javascript-typescript 138136229714, Ubuntu clean-room 138136181121, Windows clean-room 138136181507; disposable Postgres 138136180732. [Deployment Readiness #45302357807](https://github.com/faresmohamed260/renderlab/actions/runs/45302357807) passed; latest qualification 2026-11-24T01:06:09.000Z.

## Migration and cutover

- Production additive migration `0034_generation_request_idempotency.sql` applied once; ledger `20261124010505:generation_request_idempotency_0034`, 2026-11-24T01:05:05Z. Before/after: zero active generation jobs, unreleased reservations, and dispatch outbox rows. Legacy acceptance RPC retained.
- Verified exact function identity signatures: `renderlab_accept_generation_dispatch_idempotent(text,text,uuid,uuid,text,text,text,text,text,text,jsonb,jsonb,text,text,text,jsonb,timestamptz)` and `renderlab_lookup_generation_request_acceptance(uuid,text,text)`. Both security definer, empty search_path, execute restricted to postgres and service_role (PUBLIC/anon/authenticated false). Key table RLS enabled, direct grants restricted to postgres. Synthetic read-only lookup returned not_found and null job/attempt/reservation; zero key rows. Migration remains installed on app rollback.
- Vercel team `faresmohamedsalah10-1681`, project `prj_APU35jTnge27D2MAFjuc7GP0Dd6I`; deployment `dpl_A7eduj9tRV6k2Lvq5DC2Ly1qUGZP`, `https://renderlab-hdb9susbu-faresmohamedsalah10-1681.vercel.app`. Created 2026-11-24T01:07:55.223Z, READY 2026-11-24T01:08:23.912Z, staged then explicitly promoted from dashboard. Independent team-account read-back: alias `renderlab.faresuniform.uk` assigned 2026-11-24T01:08:44.311Z, after qualification. Rollback anchor `dpl_HSCgbGPfxTpkGRzuLPEhicaATwX6` at `e28b41922728e1052f9021b36bef67a84684f979`.
- No Modal redeploy: both source trees hash `614ad3132a27b60dee17017462886fae0dec24c7`. Read-back: renderer `ap-wS5WKruuipwssNGHf7Eo6k` v10, 2026-11-23T23:29:59Z; gateway/dispatcher `ap-UfrkwIijsdz6xiGiQwtMlB` v11, 2026-11-23T23:30:29Z; both tagged e28b419, environment main. Same versions are the rollback pair. No secrets changed.

## No-GPU post-cutover checks

- Site and health 200; capabilities available, FIBO available, mask available. Invalid body 400; signed-out Admin Health 403. Signed-in Admin Health rendered on WANDA; console showed no hydration errors before intentional 400 request. Admin Health API 200, generationObservability.available=true, dispatchLatency and terminalHeld objects present; new aggregate fields are not rendered in the UI.
- Signed-in malformed Idempotency-Key returned sanitized 400 invalid_request, with unchanged total job count (70) and latest creation timestamp; zero key, outbox, active job or unreleased reservation rows.
- Dispatcher main heartbeat 37 seconds old, last completed 2026-11-24T01:09:00.951576Z; zero failed/unresolved, active jobs and unreleased reservations.
- Same-key production replay skipped: existing smoke harness does not exercise it. Disposable Postgres replay proof is separate from hosted evidence.

## Closure gates

- [Production record PR #636](https://github.com/faresmohamed260/renderlab/pull/636) squash-merged as `fa6524f1e6bf65727112cccabefbcbc2833eb422` after all six required checks and CodeQL passed on exact head `ae3ffb5c331803b29bb877ee03ea307930bbc548`. Non-required Vercel PR integration reported account blocked; actual dashboard production release and read-back succeeded.
- [Production Documentation Sync #45304819290](https://github.com/faresmohamed260/renderlab/actions/runs/45304819290): SUCCESS, canonical manifest and five mirrors checked against live Vercel/GitHub.
- [Production FIBO Smoke #45304901061](https://github.com/faresmohamed260/renderlab/actions/runs/45304901061): SUCCESS, protected-main harness `fa6524f1`, exact expected production SHA, no cutover override. All steps including final fixture cleanup passed. Standing one-generation allowance consumed; no further dispatch or retry.
- Artifact `production-fibo-smoke-45304901061-1/manifest.json`: passed=true, providerGenerationCount=1, text-to-image, succeeded, exactly one output asset and one Library asset, completedAt and reservationReleasedAt both 2026-11-24T03:27:16.945283+02:00, stableAfterSecondLibraryLoad=true. The unchanged harness asserts HTTP 202 on acceptance.
- Independent production SQL: atomic RPC normalized query ID -2583045759348788091 calls 2 before, 3 after. All active jobs, unreleased reservations, outbox rows and idempotency key rows zero before/after. Artifact cleanup.verified=true, contractedDbAuthResidue=0, trackedR2ObjectsChecked=3; separate cleanup-only workflow step passed.
- Same-key replay not executed (unkeyed smoke harness); disposable Postgres evidence retained. No additional provider generation, migration, Modal deploy or secret change.
- Disposition: live hosted acceptance PASS. App remains `564d0ed0ac677fce301aa94d64f9358e3f9d31ca`; migration 0034 remains installed; renderer v10 and gateway v11 unchanged. No rollback required. TLS PRs #603/#625 remain excluded and held.
