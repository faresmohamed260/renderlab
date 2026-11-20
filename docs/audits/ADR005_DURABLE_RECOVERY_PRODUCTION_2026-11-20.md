# ADR-005 durable recovery production evidence

Date: 2026-11-20

## Scope and target

This CPU/database-only exercise verified the remaining durable-dispatch recovery and replay requirements against the existing production release. It did not deploy code, create an environment or app, mutate a secret, invoke the FIBO worker, allocate a GPU, or touch owner Library data.

- Application source: `a450a95996329a4508883ab77996016cd27fbd86`
- Vercel deployment: `dpl_BGgjGSbpX87LhkYY7w6HXt6hvw5D`
- Modal workspace/environment: `faresmohamed260` / `main`
- Gateway app: `renderlab-generation-gateway` (`ap-UfrkwIijsdz6xiGiQwtMlB`)
- Database project: `rashyleshocuvpgcooxy`

Preflight returned zero active generation jobs, zero incomplete dispatches, zero due age, zero expired claims, zero unresolved attempts, a current scheduled heartbeat and no Supabase health advisories.

## Missed wake and lost response

A run-owned dispatch record was committed in the ambiguous-send state with one delivery, a send reservation and a worker-recorded Modal call identity. The immediate post-commit wake was deliberately omitted. The call identity was a non-executing fixture identity that matched the production call-ID contract; no provider function existed for it and no render could start.

At 22:38:06 Cairo time, the next real scheduled `dispatch_tick` reported `claimed=1`, `dispatched=1`, and zero retry, failure or unresolved outcomes. Database read-back showed delivery count two, the original call identity preserved, a signed handle bound to that identity, and the job moved to the truthful running/generating projection. This proves the schedule recovers a missed wake and the deployed Modal backend reattaches the accepted attempt instead of submitting a second provider call.

## Overlapping dispatchers

A second run-owned ambiguous-send record was held until a due time between scheduled boundaries. At 22:51:40 Cairo time, two manual `dispatch_tick` calls were spawned together against the deployed gateway. Their complete summaries were:

- `claimed=1`, `dispatched=1`, all other outcomes zero;
- `claimed=0`, `dispatched=0`, all other outcomes zero.

The durable record advanced from delivery count one to two exactly once and retained the original call identity. The following scheduled pass found zero work. No provider submission or GPU work occurred.

## Retention and rollback replay

A terminal run-owned attempt was moved under a controlled clock to a fixed retention boundary. The current `renderlab_begin_generation_call` entry point and rollback-compatible `renderlab_begin_generation_attempt` entry point both rejected the stale delivery while its row was retained. Cleanup then produced:

- zero deletions one millisecond before the boundary, with the row still present;
- exactly one deletion at the boundary, with the row absent afterward;
- continued rejection from both entry points after removal;
- successful admission of a distinct fresh attempt.

The test did not alter the production cleanup function or retention policy. Its timestamps and rows belonged only to the disposable fixture account.

## Cleanup and final health

Cleanup removed the disposable dispatch rows, generation jobs and Auth identity in dependency order. Final production read-back returned:

- zero fixture Auth rows, generation jobs, dispatch rows and media assets;
- zero active generation jobs;
- zero pending, claimed, retrying or unresolved dispatches;
- zero due age, expired claims and unresolved attempts;
- `scheduledHeartbeatMissing=false` with a current scheduled heartbeat.

The temporary Modal client environment on WANDA was also removed. The production application, five Modal app identities, gateway schedule, database schema, secrets, routes, model volume, owner data and rollback release are unchanged.

## Gate result

Hosted missed-wake recovery, lost-response reattachment, overlapping-dispatch exclusion and replay rejection across retention and rollback are production-verified and closed. Open ADR-005 evidence is limited to injected timeout/process-exit cleanup and the separately authorized owner provider-spend alert.
