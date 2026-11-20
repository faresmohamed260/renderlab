# ADR-005 dispatch-health owner alert production evidence

Date: 2026-11-20

## Exact release

- PR #503 merged to protected `main` as `a450a95996329a4508883ab77996016cd27fbd86`.
- Deployment Readiness run `44767876962` passed on that SHA.
- Required protected-main job IDs: Ubuntu portability `136397291512`, unit coverage `136397291772`, CodeQL JavaScript/TypeScript `136397292617`, engineering quality `136397292551`, Windows portability `136397292299`, and documentation governance `136397291909`.
- Vercel deployment `dpl_BGgjGSbpX87LhkYY7w6HXt6hvw5D` reached READY with the exact Git SHA at `https://renderlab-r3r4ky55h-faresmohamed260-6733s-projects.vercel.app`.
- `renderlab.faresuniform.uk` moved to that deployment at `2026-11-20T15:59:40.628Z`.
- Immediate application rollback is deployment `dpl_GNAGLCFnynWUdMEtiYDgX9oXeNrb`, source `d9f9bd4e12103e3524b02e6d4d188ddf9b3ba882`.

## Hosted changes

- Supabase migration `generation_dispatch_alert_resolution` applied as version `20261120155628` to project `rashyleshocuvpgcooxy`.
- Vercel received one sensitive production-only `RENDERLAB_GENERATION_RECONCILER_SECRET` value. Modal `main` received the matching value and fixed production health URL in secret `renderlab-generation-monitor`. No value was printed or committed.
- Existing Modal gateway app `renderlab-generation-gateway` (`ap-UfrkwIijsdz6xiGiQwtMlB`) was redeployed from the exact merged source. Its functions are `dispatch_tick`, `monitor_tick`, and private proxy-authenticated `web`.
- The five-app production topology did not change. No environment, app, GPU worker, model, volume, route, browser credential or provider identity was added.

## Alert and recovery proof

Preflight found zero active generation jobs and zero incomplete or expired dispatches. The monitor then completed the following CPU/database-only proof:

1. Scheduled healthy monitor entries appeared at one-minute cadence with zero due, expired or unresolved work.
2. The `main` heartbeat timestamps were moved to four minutes old immediately after a normal scheduled completion. No generation job or outbox row was changed.
3. The monitor observed `scheduledHeartbeatMissing=true` and age `245` seconds. Notification counts were `attempted=1`, `accepted=1`, `failed=0`.
4. A zero-work dispatcher completion restored the scheduled heartbeat. The monitor then observed a healthy result at age one second.
5. Database read-back showed the `generation-dispatch-health` alert `resolved`, occurrence count one, notification and recovery timestamps recorded, and last code `generation_orchestration_stalled`.
6. Final dispatch health showed zero due, expired or unresolved work; generation/outbox read-back showed zero active jobs and zero incomplete dispatches.

The alert-resolution RPC is executable by `service_role` and not executable by `anon` or `authenticated`. Post-migration Supabase health advisors were empty. Security advisors remained limited to the expected server-owned RLS/no-policy informational notices and the pre-existing leaked-password-protection warning. Vercel returned no error or fatal runtime logs for the release deployment during the verification window.

## Result

Heartbeat/outbox owner-alert delivery is production-verified and closed. Open ADR-005 evidence remains hosted timeout/process-exit cleanup, missed-wake/lost-response/overlapping-dispatch recovery, replay across retention/rollback, and the separately authorized owner provider-spend alert.
