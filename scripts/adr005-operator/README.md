# ADR-005 local process-exit operator

Follow the [production release runbook](../../docs/operations/PRODUCTION_RELEASE_RUNBOOK.md#adr-005-process-exit-operator) for authorization, production checks and the two-call / 600 A10-second boundary.

Use Node 24 and Python 3.11 or later with Modal SDK `1.6.4` in an isolated environment. Provide the existing operator profile via `RENDERLAB_ADR005_MODAL_PROFILE`. The watcher calls the repository ownership helper for `modal-01` before opening a Modal client, then verifies the authenticated workspace and binds the exact app, call and container. The relay reads only the approved Supabase project through the [read-only Management API](https://supabase.com/docs/reference/api/v1-read-only-query). Provide an already authorized Management API token in `SUPABASE_ACCESS_TOKEN` with read access to the fixture and queue tables. Keep these values in the operator environment and out of the inbox, logs and repository.

## Verify without provider work

Run from the repository root. The commands use POSIX shell syntax. On PowerShell use the equivalent paths and `Tee-Object` with UTF-8 output. Both watcher and relay must be in visible, separate terminals.

```sh
python -m unittest discover -s scripts/adr005-operator -p test_watcher.py -v
mkdir inbox-rehearsal-adr005
python scripts/adr005-operator/rehearse_watcher.py inbox-rehearsal-adr005 1100 6000 --detection-ms 7198
```

Calibrate the rehearsal with the current soak's detection p95 and measured Modal binding and transport latencies. It simulates the provider and child signal locally.

Create a fresh soak inbox. Choose an unused numeric run ID outside any current Actions run, such as `45999999864` if it is still unused. Start the watcher first and then the relay in the second terminal.

```sh
python scripts/adr005-operator/watch_adr005.py --inbox "$soak_inbox" --observe-only
node scripts/adr005-operator/relay.mjs --project-ref rashyleshocuvpgcooxy --inbox "$soak_inbox" --run-id "$unused_run_id" --observe-only
```

Require both `RELAY_COMPLETE` with zero query or publish errors and `OBSERVE_COMPLETE` with at least 600 seconds of fresh observations and p95 detection bound at or under 10 seconds. The rehearsal must complete in under 25 seconds.

## Arm an approved live run

Use fresh, separate directories for `$preflight_inbox` and `$live_inbox`, a fresh UTF-8 `$watcher_log`, and an unused numeric preflight run ID. Keep the watcher and its log visible. In the watcher terminal:

```sh
set -o pipefail
python scripts/adr005-operator/start_warmed_watcher.py "$preflight_inbox" "$live_inbox" --preflight-id "$unused_run_id" 2>&1 | tee "$watcher_log"
```

As soon as the watcher starts, run the relay in another terminal:

```sh
node scripts/adr005-operator/relay.mjs --project-ref rashyleshocuvpgcooxy --inbox "$preflight_inbox" --run-id "$unused_run_id" --preflight --watcher-log "$watcher_log"
```

Wait for `PREFLIGHT_READY` and `WATCHING` with signal enabled. Dispatch only under the separately granted production authorization. Immediately use the exact returned Actions run ID for the live relay:

```sh
node scripts/adr005-operator/relay.mjs --project-ref rashyleshocuvpgcooxy --inbox "$live_inbox" --run-id "$actions_run_id" --watcher-log "$watcher_log"
```

The relay publishes advancing read-only snapshots. The watcher stops on stale evidence or unsafe identity and allows only one guarded signal inside the 30-second window from Job A's execution start. A matching `SIGKILL_SENT` and successful remote exit are required for `SIGNAL_CONFIRMED`. Preserve the watcher and relay logs, and allow the workflow to complete its cleanup. If the workflow ends before Job A appears, stop the local relay and retain the evidence from that attempt.
