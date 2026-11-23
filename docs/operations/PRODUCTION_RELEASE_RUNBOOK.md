# Production release runbook

This procedure covers the RenderLab web application and production FIBO worker pair. Authority to merge, change production, or spend on a live test comes from [GOVERNANCE.md](../../GOVERNANCE.md#production-and-deployment-authority).

## Release targets

| Component | Target | Deployment authority |
| --- | --- | --- |
| Vercel web app | Team `faresmohamedsalah10-1681` (`team_RwVJPL0rvE91GapkloHiSTXt`), project `renderlab` (`prj_APU35jTnge27D2MAFjuc7GP0Dd6I`), custom domain `renderlab.faresuniform.uk` | Authorized operator using an explicitly scoped Vercel CLI. GitHub Actions uses `VERCEL_TOKEN` for release verification. |
| Modal FIBO | Workspace `faresmohamed260` (`ac-88wJ5dCXYBOywnXXaGmUoV`, `modal-01`), Modal environment `main` | [Deploy FIBO Production Worker](../../.github/workflows/fibo-production-deploy.yml) from GitHub `main`, using the GitHub `production` environment's `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET`. |
| Modal operator access | Renderer `ap-wS5WKruuipwssNGHf7Eo6k`, gateway `ap-UfrkwIijsdz6xiGiQwtMlB` | Separate approved operator profile for inspection, rollback, and the bounded external process-exit action. The lifecycle workflow receives no Modal management credential. |

The Vercel automatic Git deployment setting is disabled by [vercel.json](../../vercel.json). A build from a manually selected Git ref can still carry Git provenance. Use the CLI release path below for routine releases. [ADR-004 and ADR-006](../architecture/ARCHITECTURE_DECISIONS.md)

The active FIBO workspace is one label in the existing reciprocal Modal allocation. Keep the workspace ID check and the RenderLab/S.A.G.A. ownership guard. [Ownership contract](../architecture/MODAL_PROJECT_ISOLATION_CONTRACT.md)

<!-- EXTERNAL_FACT: modal-direct-cutover-baseline -->

## Production environment preflight

Before a release or account migration, compare the Vercel Production variable names against the required names in [the build preflight](../../scripts/verify-vercel-env.mjs) and the active [FIBO connection contract](../architecture/INFRASTRUCTURE.md). The [typed runtime environment contract](../architecture/RUNTIME_ENV_CONFIGURATION.md) and [16-name dashboard inventory](PRODUCTION_ENV_REQUIRED_NAMES.json) are the single schema/approved-inventory pair; CI exercises the same validator with synthetic credentials, and the staged Production build validates actual masked values without printing them. Check the team, project, and Production scope. Record names only and keep credential values out of logs and release notes.

Production also requires `RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED=true` for invitation-only access and `RENDERLAB_FIBO_MASK_ENABLED=true` for masked editing. Confirm both are present in Production and verify effective behavior after cutover with an admitted and a non-admitted fixture and the live capabilities response.

## Qualify and release

1. **Qualify the exact release source.** Check the six required GitHub Actions contexts and Deployment Readiness on the exact deployed application SHA. Record the six check-run IDs, the Readiness workflow-run ID, and the latest completion time as `qualifiedAt` in canonical UTC. Readiness may require an explicit run because its automatic triggers are path-filtered. See [protected main policy](../governance/github-protection.json) and the [live-state verifier](../../scripts/lib/production-live-state.mjs). Record any required isolated hosted qualification and its evidence or a current owner-approved exception. The [November 20 cutover](MODAL_DIRECT_PRODUCTION_CUTOVER.md) was a one-time exception.
2. **Confirm the authorization and rollback pair.** Record exact component SHAs and expected apps, temporary compatibility during the transition, intended domains, a same-project READY Vercel rollback release, and exact known-good versions and source for both Modal apps. Verify authenticated access and an empty generation queue with no unresolved dispatches. When the old and new contracts cannot coexist, drain work and use the approved outage order.
3. **Stage Vercel.** Use a reviewed CLI version and the explicitly linked production team and project. Verify the checkout is clean and at the exact qualified SHA. Stage with `vercel deploy --prod --skip-domain --scope faresmohamedsalah10-1681`. Read back READY, the production target, immutable deployment ID and URL, and exact Git SHA. Keep the current alias in place while staging.
4. **Publish Modal if the release changes the worker pair.** Dispatch Deploy FIBO Production Worker from protected `main`, with `production_sha` equal to that checkout's full SHA. The workflow validates the workspace, deploys renderer then gateway, and records both app IDs and new history entries. Read back versions, time, source evidence, and expected gateway functions and schedules. If only one publish succeeds, stop the cutover and confirm compatibility or restore the captured pair before proceeding. A docs-only merge does not require republishing an already verified pair.
5. **Assign the Vercel alias.** Confirm which custom domains will move and explicitly promote the staged production deployment with `vercel promote <deployment-id> --scope faresmohamedsalah10-1681`. Independently read back the exact target, project and alias `updatedAt` from Vercel, verify the rollback deployment, and check service reachability. Use `updatedAt` for `cutoverAt`. The qualification time must be no later than cutover.
6. **Close the production record.** Update [current.json](../production/current.json) and its five mirrors together following [AGENTS.md](../../AGENTS.md#production-release-documentation-closure). Give each current block one canonical deployment and rollback statement. Keep historical rollout evidence in [docs/audits](../audits). Run `npm run verify:docs-governance`, merge through the required checks and run **Production Documentation Sync** with the exact deployed SHA. Its provider read-back verifies the record. A later docs-only commit on `main` can differ from the deployed SHA.
**Same-sitting documentation gate:** The production record PR must follow cutover in the same operator sitting; Production Documentation Sync must pass before the next phase unit starts.
7. **Run approved hosted validation.** After the record agrees with the live release, run only the separately approved smoke or lifecycle scenario and record its evidence and cleanup outcome. A green release record and a passed live lifecycle test are distinct results.

## Rollback

- **Vercel.** Restore the preverified same-project production deployment with `vercel rollback <known-good-deployment-id> --scope faresmohamedsalah10-1681`. Re-read the alias and exact new assignment time, verify source and health, and synchronize the manifest and mirrors.
- **Modal.** Restore the captured compatible versions of the exact app IDs in `main` with provider app rollback. If the version cannot be restored, use a separately authorized local redeploy from the exact known-good clean checkout with its original resources. Record the full SHA, the worker tree from `git rev-parse HEAD:workers/fibo-studio`, both deploy windows, versions, app IDs, and a SHA tag when supported. Local history can omit the Commit field. Verify the actual new history records and their compatibility with the Vercel release.

## ADR-005 process-exit operator

Before dispatch, verify the exact live Vercel and Modal release, an empty queue, the execution window, the operator's approved Modal access, and the authorized spend. Dispatch the [lifecycle workflow](../../.github/workflows/production-adr005-worker-lifecycle.yml) from protected `main` with the exact live application SHA and both explicit confirmations. The existing bounded scenario permits one eight-step render and one four-step recovery render, with no more than two disposable calls and 600 aggregate A10 seconds.

When CI prints `ADR005_PROCESS_EXIT_READY job=<uuid>`, the operator binds Job A to its persisted provider call and the exact active renderer container. Verify a single run-owned ComfyUI child with working directory `/opt/ComfyUI` and exact command arguments `main.py`, `--listen 127.0.0.1`, `--port 8188`, and `--disable-all-custom-nodes`. The child starts with a relative script argument, so an absolute-script-path match is incorrect. Ensure no competing production job is active. Terminate only that child. Stop if identity is ambiguous or the job has already terminalized. The harness polls for at most four minutes from the marker, while the child can finish sooner. Stopping the Modal container can reschedule the input and exercises a different failure mode.

Record the marker and signal timestamps and correlated job, provider call and container evidence. Confirm Job A failed with no output or media row, Job B saved and reopened one PNG through Library using a distinct provider call, each was delivered once, and fixture cleanup and queue drain completed. Look for the confirmed `FIBO_PROCESS_EXITED` outcome and review ambiguous-response logs if the harness fails. Treat a transient response alone as incomplete evidence of process-exit handling. Stop after a failed attempt and retain the exact logs and bounded cleanup evidence.


### Arm the watcher before dispatch

Use [the local operator](../../scripts/adr005-operator/README.md) from the reviewed release checkout. Confirm the approved Modal operator profile and use fresh, separate inboxes for preflight and live evidence.

1. Run the 15 watcher unit tests. Run the observe-only watcher and its relay against the approved production project for at least 10 minutes. Require zero relay errors, p95 detection bound at or under 10 seconds, and a synthetic marker-to-signal rehearsal under 25 seconds. The verified soak and rehearsal measurements are in the [ADR-005 audit](../audits/ADR005_PROCESS_EXIT_RECOVERY_VERIFIED_2026-11-22.md).
2. Start the signal-capable watcher in a visible terminal and feed it the preflight relay's read-only snapshots. Wait for `PREFLIGHT_READY` with three fresh snapshots and `WATCHING` with `signal_enabled=true`. A stale or failed preflight blocks dispatch.
3. Dispatch once under the existing authorization. Start the live relay immediately with the returned Actions run ID and its separate one-use inbox. Wait for `ARMED` with that exact ID. The watcher stays ready through the harness's wait for Job A and refuses to signal if evidence has stopped advancing for 10 seconds, Job A disappears or terminalizes, or the identity checks fail.
4. Record `SIGNAL_CONFIRMED` and the correlated timestamps. Let the workflow finish its fixture cleanup. If anything fails, stop and retain the evidence under the original attempt boundary.

### Release checks learned from this incident

The [November 22–23 incident audit](../audits/FIBO_BETA_CORRECTNESS_INCIDENTS_2026-11-23.md) records the observed symptoms, corrections and exact release evidence.

- After any account or credential migration, use a separately approved real submission and verify the app can poll it through the gateway to its terminal result.
- If Modal has finished a call and the app still shows `running`, search the production runtime logs for `provider-unconfirmed` with upstream HTTP 401 before investigating rendering or queue latency.
- Modal local deploys can leave the history Commit field blank. Record the clean checkout SHA, worker tree SHA, workspace and environment, app IDs, deploy windows, history versions, and source tag when supported.
- Vercel Hobby projects with Fluid Compute disabled default to 10 seconds for functions. Read the deployed function inventory and confirm an explicit duration for critical routes such as generation submission. [Vercel function limits](https://vercel.com/docs/functions/limitations)

### Oldest active-job operator warning

Admin Health reports the oldest active age by queued, running, cancelling and persisting separately. It derives age from immutable generation_jobs.created_at in UTC, not updated_at (which may advance while a job is stuck). The service issues four exact-status, oldest-first, one-row-only queries supported by the existing (status, created_at DESC) index; no identity, prompt, asset or provider handle enters the response. Empty states report null ages, not invented zero-age jobs.

A single **60-minute warning** is used for all four states because the beta has no separately verified per-state SLA. It is an early operator signal before the historical two-hour stale cleanup, not a generation timeout and not an instruction to release an owner's slot. The dedicated generation-oldest-active-job alert is recorded without sending new production email; it resolves idempotently after no monitored job exceeds the warning. The existing dispatch heartbeat remains a separate signal (due age 180 seconds, expired claims, unresolved dispatch, missing heartbeat). A healthy dispatcher can coexist with an old owner job; this alone does not change the dispatch health endpoint to HTTP 503. Verify both signals before choosing a recovery action. On-owner-return settlement remains the beta decision; no scheduler is enabled.
### Gateway authentication alert response

Before qualifying the alert, confirm Vercel exposes `VERCEL_ENV=production` to the Function.

For a provider degradation alert with `gateway_auth_rejected`, confirm repeated HTTP 401 or 403 on the production Modal status poll in Admin Health and Vercel logs. Check that Vercel Production's `RENDERLAB_GENERATION_GATEWAY_URL`, `RENDERLAB_FIBO_MODAL_KEY`, and `RENDERLAB_FIBO_MODAL_SECRET` point to the intended Modal gateway and current proxy-token pair. Verify the workspace and environment scope in Modal. Keep credential values out of incident notes. After an approved correction, verify an authorized job reaches a terminal result through the gateway.

### Modal proxy credential record

Fares, the RenderLab owner, approved revocation of `renderlab-production-fibo-gateway`, created November 18. On November 23 Cairo time, Modal confirmed it absent from workspace `faresmohamed260` at `2026-11-22T23:48:07.355Z`. The production token `renderlab-app-2026-11-22` was retained.

## Record ownership

[docs/production/current.json](../production/current.json) is the canonical repository record of the accepted web release. `PROJECT.md`, `docs/STATUS.md`, `docs/ui/UI_MIGRATION.md`, `docs/ui/SCREEN_REGISTRY.md`, and `docs/architecture/INFRASTRUCTURE.md` mirror it. Provider read-back is the evidence for a changed alias or runtime. Link the Modal app history, workflow or local checkout provenance and the separately verified lifecycle result from the release's dated audit evidence.
