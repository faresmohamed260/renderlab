# Batch B production release evidence — 24 November 2026

Cutover verified; repository synchronization and one authorized hosted fixture remain pending.

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

Production Documentation Sync and exactly one authorized hosted text-to-image fixture remain pending. Do not claim batch closure until sync, smoke, single atomic-call delta, stable Library reload and independent zero-residue verification pass.
