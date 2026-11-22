# ADR-005 production process-exit recovery verification

Date: 2026-11-22 (UTC)

## Release and boundary

The [production lifecycle run #45079695192](https://github.com/faresmohamed260/renderlab/actions/runs/45079695192) passed `process-exit-recovery` on application SHA `2db59d904bd02b8fc6e6d4690d4417f4ba55d176`, Vercel deployment `dpl_DRDegFSonnfW88rhdHhmPJoTsQq5`. The active Modal renderer was v9 and the gateway was v10, each tagged `decd2f6`. [Production Documentation Sync #45079953564](https://github.com/faresmohamed260/renderlab/actions/runs/45079953564) subsequently verified the same live release. The [workflow artifact](https://github.com/faresmohamed260/renderlab/actions/runs/45079695192/artifacts/14776552074) contains the exact release, outcomes, and fixture cleanup evidence.

The owner approved one eight-step render and one four-step recovery render, at most two disposable FIBO calls and 600 aggregate A10 seconds. The operator signaled only Job A's identified ComfyUI child. The checkpoint changed no deployments, containers, credentials, routes, schemas, or owner data.

## Live timeline

| UTC | Evidence |
| --- | --- |
| 22:47:37.282 | Watcher ready after three fresh empty-queue snapshots. |
| 22:47:51.318 | Watcher armed to the exact workflow run. |
| 22:48:26.600 | Job A submit returned HTTP 202. Vercel measured 3.2 seconds to response completion and 7.28 seconds of function execution. |
| 22:48:41.131 | Job A recorded as running and provider-bound. |
| 22:48:41.584 | Workflow printed `ADR005_PROCESS_EXIT_READY` for Job A `ca1f4990-58c6-4a79-9628-d4e95d82cb9d`. |
| 22:48:49.764 | Watcher detected Job A from fresh database evidence. |
| 22:48:57.934 | `SIGKILL_SENT` to the verified ComfyUI child, **16.35 seconds after the marker**. Remote command exit status 0, stderr empty. |
| 22:49:03.088 | Database recorded Job A failed with no output asset. The workflow observed the failed status at 22:49:04.123. |
| 22:49:06.203 | Job B submit returned HTTP 202 in 1.2 seconds. |
| 22:49:58.920 | Job B succeeded. Saved PNG `5f0e727c-d072-57c9-8f09-7d287da113a5` was reopened through private Library access. |
| 22:50:05.039 | Harness recorded pass and exact cleanup. Independent read-back found zero active jobs, zero pending dispatches and zero run-scoped fixtures. |

Both jobs had one dispatch delivery each and distinct provider calls. The PNG was a disposable fixture and was removed by cleanup. The Vercel runtime window showed the expected `generation_failed` reconciliation warning for Job A and successful finalization for Job B. There were no 401s, `provider-unconfirmed` entries, or `dispatcher_wake` warnings. One initial warm-up expired before dispatch. The live watcher discarded a stale snapshot and recovered before signaling.

## What blocked earlier verification

1. Stale Vercel-to-Modal proxy credentials produced upstream HTTP 401 after the account migration. The production credential replacement restored authenticated status polling.
2. [PR #519](https://github.com/faresmohamed260/renderlab/pull/519) guarded ambiguous provider responses so an unconfirmed HTTP response could no longer terminate a job as failed.
3. [PR #522](https://github.com/faresmohamed260/renderlab/pull/522) made verified child exit a structured terminal result. The gateway maps it to HTTP 409 with `FIBO_PROCESS_EXITED`, and reconciliation fails that exact job.
4. The [previous attempt #45068595765](https://github.com/faresmohamed260/renderlab/actions/runs/45068595765) reached the 10-second Vercel submit limit after queuing a job. [PR #526](https://github.com/faresmohamed260/renderlab/pull/526) gives the route 60 seconds and moves the bounded dispatcher wake after the response, with the durable outbox committed and reservation bound first.

## Operator qualification

The WANDA read-only soak observed 211 snapshots over 614.316 seconds with zero relay errors. The 209 measured detection bounds gave p95 7.198 seconds and maximum 8.695 seconds. The synthetic rehearsal took 15.479 seconds from the simulated ready event to the simulated signal and fired no real signal. The [production runbook](../operations/PRODUCTION_RELEASE_RUNBOOK.md#adr-005-process-exit-operator) keeps the soak and rehearsal gates for the portable operator.
