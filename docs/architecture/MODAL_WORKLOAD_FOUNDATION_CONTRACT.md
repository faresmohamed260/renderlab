# Modal workload architecture — implementation requirements

**Status: Accepted by the project owner on 2026-11-19; effective on merge.** This engineering-owned contract is normative for implementation once merged to protected main with [ADR-005](./ARCHITECTURE_DECISIONS.md#adr-005--separate-modal-workloads-and-recover-durable-generation-dispatch). All requirements are mandatory for completion. Verification may proceed in sequence to isolate failures; no stage is an optional follow-up. Neither acceptance nor merge authorizes cloud resources, GPU use, or production cutover.

## Goal and starting point

Deploy by workload rather than by model, and make it possible to add compatible models without rewriting worker plumbing. At repository main `2595cd4` and the [recorded production release](../production/current.json), the private gateway deployment includes the GPU renderer, FIBO is the only live model, and the renderer starts and stops ComfyUI per job. Reverify live state and dependencies before any hosted work.

## Required app layout

| App | Required role |
| --- | --- |
| `renderlab-generation-gateway` | Keep the existing private front door and job API. Dispatch to the separate image-generation app; do not expose the renderer publicly. |
| `renderlab-image-generation` | Host the active, reusable image worker and the existing FIBO adapter. Move rendering out of the gateway deployment. |
| `renderlab-video-generation` | Deploy an inactive shell for video generation and editing. |
| `renderlab-image-tools` | Deploy an inactive shell for image utilities. |
| `renderlab-video-tools` | Deploy an inactive shell for video utilities. |

The three inactive apps require internal CPU-only readiness that reports the app identity and its unconfigured status. No GPU, warm instances, public endpoints, schedules, production secrets or weights, capability advertisement, or job admission for those apps. App scaffolding and hosted deploys are separately evidenced. Dashboard creation requires explicit authorization for the exact workspace and environment; no new persistent dev or staging environment is assumed.

## Required Modal support for separate environments

**Gateway and worker.** Make `renderlab-generation-gateway` and `renderlab-image-generation` deployable as a separate pair in a future Modal staging environment. Use the same gateway and worker code as production, with environment-specific configuration rather than a separate test implementation. The staging gateway must call only the image worker in its own environment. No Modal development app or staging copies of the inactive video and tools apps are required.

**Resource isolation.** Resolve the gateway, worker, secrets, and model volume within the intended Modal environment. Remove hard-coded production resource references from the reusable deployment path. Reject missing resources and cross-environment references with a clear error. Never fall back to production credentials, volumes, or workers.

**Deployment readiness.** Provide deployment commands that require an explicit workspace and environment, verify the target before making changes, and document the resources that must already exist. Add automated checks for staging target selection, missing resources, and cross-environment references. These checks must run without deploying an app or starting a GPU.

**Scope boundary.** Deliver the Modal code, configuration, deployment commands, and checks for later staging setup. Do not create the staging environment, deploy its gateway or worker, provision secrets or volumes, copy weights, or run staging GPU jobs as part of this requirement. Web previews, UI mocks, test accounts, databases, and file storage are outside this requirement. Existing production release and validation gates still apply.

## Required model switching and universal worker

- **Catalog and switcher:** Implement a server-side allowlist of model versions, supported operations, adapter, and backend. Resolve the requested or default model before dispatch; reject unknown models, unsupported operations and inactive backends before GPU work. Do not silently substitute a model. Keep FIBO as the only production entry and default; prove the switcher with two synthetic adapters in local/CI tests. No new user-facing model picker is required.
- **Universal worker contract:** Implement reusable, model-neutral worker code for dispatch, lifecycle, file isolation and cleanup, result/error handling, and correlation. FIBO-specific graph construction, validation and weight configuration belong to the FIBO adapter. Provide a backend interface for ComfyUI and direct-Python adapters; prove the latter with a lightweight test adapter, not a real new feature. Universal means shared code and contracts across pools, not one process, GPU type or dependency image for every workload. Keep public request and result behavior unchanged.
- **Job continuity:** Bind each accepted job to its exact backend, model version and execution handle for status, results and Cancel; a catalog change must not alter an existing job. Preserve compatibility with pre-cutover handles, drain old work through result saving, and verify a rollback that can still render. Do not retire the old execution path until the new path and recovery are verified.

## Required reliable dispatch and retries

- **Durable dispatch:** Persist the authorized job and its dispatch intent atomically before acknowledging submission (for example, with a transactional outbox). Dispatch outside the request, using a recoverable claim/lease so a crashed dispatcher cannot strand a job. Persist the selected backend and model version before sending and keep a stable, non-secret attempt identifier across retries of that same dispatch. Recover queued work after restarts without changing ownership, admission, or cancellation rules.
- **Dispatcher owner and wake-up:** A dedicated CPU-only Modal function in `renderlab-generation-gateway` owns dispatch. After the job and dispatch intent commit, the submission path requests a best-effort wake through the authenticated gateway, which enqueues an invocation of that function. The wake carries no render payload; the dispatcher reads exclusively from the durable outbox through narrowly scoped, environment-local access. A wake failure does not undo the accepted job. The web request and gateway handler do not own the dispatch loop; do not use an in-process background task or depend on browser polling.
- **Restart and missed-wake recovery:** A Modal-managed recurring schedule invokes the same dispatcher independently of user traffic (initial release target: every minute). Each invocation claims due entries in bounded batches, including retryable entries whose claims expired, and reconciles ambiguous sends before retrying. Overlapping scheduled and immediate invocations must use the same atomic claim and deduplication rules. Stop when idle; no GPU or always-on dispatcher container is required. Alert on missed scheduled runs and outbox age beyond the documented recovery threshold.
- **Safe retries:** Treat dispatch delivery as potentially repeated. Use backend idempotency or a durable worker-side deduplication and lookup mechanism to prevent a repeated delivery from starting a second render. Retry confirmed transient failures only, with bounded backoff and a deadline. Do not retry permanent failures or redispatch a cancelled job. Distinguish retrying delivery from a new, explicit render attempt.
- **Deduplication lifetime and expiry:** Retain durable attempt records or terminal tombstones that suppress repeats until all applicable retry, unresolved-reconciliation, in-flight cutover, and rollback windows have closed. Document how each window closes and how the per-attempt cleanup deadline is computed; do not expire live or unresolved attempts. The active and rollback paths must honor the same deduplication evidence. Cleanup of temporary job files must not remove that evidence. After record cleanup, an expired or unverifiable delivery must fail closed before starting a render; absence of a record is not proof of a new attempt. Enforce an authenticated, immutable admission deadline for the original attempt, including across cutover and rollback, and do not renew that deadline on redelivery. Only a separately authorized new render may receive a new attempt identifier.
- **Unknown submission outcome:** A timeout or disconnected response is not proof that dispatch failed. If the backend may have accepted the job, reconcile the original attempt using its stable identifier and recover its execution handle. If acceptance cannot be verified or deduplicated, record the attempt as unresolved for reconciliation or operator review; do not blindly resend or switch backends. Monitor stuck claims and unresolved attempts without exposing signed handles.

## Required renderer move and lifecycle

First qualify the renderer in `renderlab-image-generation` with unchanged FIBO workflows, weights, A10, and behavior. Then qualify container-level ComfyUI reuse as part of the same architecture delivery: start it once per GPU container, keep it private, run one job at a time, isolate and delete per-job files, and reuse model weights when memory allows. Retain one GPU slot, zero always-on GPUs, and a short measured idle window before scaling to zero. Do not add a separate CPU ComfyUI server.

Cancel must interrupt the specific active render, not merely hide its output. Verify the render is no longer executing and its files and queued work cannot contaminate the next job. Apply the same safety gate after timeouts or crashes. Recycle a worker if it cannot be confirmed clean. Preserve Library saving and existing authorization throughout.

## Required closed-demo operating scope

RenderLab remains a personal, closed, noncommercial demo. These requirements protect jobs, files, and infrastructure spend; they do not introduce customer billing or product limits.

### Routing and capacity

Route each job to a configured model and worker that support the requested operation. Validate inputs against that model's limits, such as image dimensions, file size, and number of reference images, before starting GPU work. Keep FIBO as the only live model. If the requested model or operation is unavailable, report that clearly rather than silently switching to another model.

Keep one GPU slot, run one render at a time, and let the worker shut down after the measured idle window. If the worker is busy, the next accepted job waits in the durable queue. These are worker capacity controls, not per-user rate limits. Do not add user credits, quotas, price-based routing, or separate batch queues.

### Large files and multi-step jobs

Keep the existing bounded image-transfer path for FIBO. Keep files private, isolate temporary files by job, and clean them up after success, failure, or cancellation. Mark a job complete only after its result is saved and can be reopened from Library.

Do not build a large-file transfer system or multi-step pipeline in this delivery. If a future video feature needs them, define how workers access private files directly from storage and how a failed step can be retried without redoing completed work. Neither is required for this release.

### Operations and data

Make it possible to tell from job status and logs whether work is queued, running, saving, failed, or stuck. Use a non-secret job reference for troubleshooting. Keep prompts, media, credentials, and signed job handles out of operational logs, including provider access logs. Set a simple provider spend alert for the owner under separate authorization for the provider configuration change; do not build user billing or a billing dashboard.

Verify changes in an isolated test setup before cutover and keep a tested rollback that can still render. A permanent staging environment is not required. Document where the current job inputs and outputs are stored or temporarily retained. Before adding any future model or provider, verify that its license permits the intended closed-demo use and review where it sends or retains media.

### One-time direct-production cutover exception

On 2026-11-20 the project owner approved a change in rollout direction, but no hosted action: the first gateway/worker split may be qualified during a planned production outage in the existing Modal `main` environment instead of creating a parallel `qualification` environment. The binding execution sequence, exact identities, recovery drill, separate production/GPU approval scopes, and expiry are defined in [`MODAL_DIRECT_PRODUCTION_CUTOVER.md`](../operations/MODAL_DIRECT_PRODUCTION_CUTOVER.md).

This one-time exception does not change the required environment-aware implementation, remove future separate-environment deployability, waive the zero-in-flight or recovery gates, authorize any hosted mutation, or establish precedent. It expires after the direct cutover either closes successfully in the repository or is abandoned and reconciled. All later hosted releases return to the isolated-qualification rule unless another explicit owner-approved exception is merged first.

## Acceptance and release gates

- **Repository checks:** Verify catalog selection/defaults/rejections, backend binding across catalog changes, shared runner behavior with both test adapters, and app isolation. Check deployment commands fail closed for unexpected workspace/environment and verify actual app identities after deployment. Use environment-local volumes and least-privilege credentials in line with the [Modal ownership contract](MODAL_PROJECT_ISOLATION_CONTRACT.md). Use non-secret correlation IDs in logs.
- **Dispatch fault tests:** With a fake backend in local/CI tests, simulate duplicate delivery, dispatcher restart, confirmed transient and permanent failures, cancellation while queued, and acceptance followed by a lost response. Prove the accepted attempt is recovered without a second render, bounded retry stops at its limit, and unresolvable acceptance does not auto-resubmit. Qualify the idempotency or reconciliation mechanism for the actual Modal path before cutover; fake-backend tests alone are not release evidence.
- **Deduplication expiry tests:** Use a controlled clock to replay the same attempt just before, at, and after the cleanup boundary, including after the tombstone has been removed. Prove no repeat starts a second render, cleanup preserves live or unresolved attempts, and both the cutover and rollback paths reject stale deliveries. Verify that a separately authorized new attempt is still admitted. Qualify the same protections on the actual Modal path before cutover under the existing hosted approval gate.
- **Dispatcher wake and recovery:** In local/CI tests, drop the immediate wake and prove the scheduled path dispatches a committed job without any later request. Crash after a claim and verify an expired claim is recovered by a fresh invocation. Exercise overlapping ticks and a lost response after acceptance to prove there is no duplicate render. Before cutover, under separate approval, verify that the deployed Modal schedule is enabled for the intended environment and actually wakes the dispatcher with no web traffic; record the observed recovery latency. Do not enable schedules in the inactive apps.
- **Hosted, only with separate approval:** Verify dashboard apps and dormant readiness without starting GPU work in the empty apps. Qualify the moved renderer and the reusable worker against text-to-image, reference editing, masked editing, job status, active render interruption, next-job recovery, and Library saving. Measure cold startup, a warm follow-up, and idle GPU time; verify scale-to-zero and record latency/cost evidence before approving the idle window. Do not run performance experiments in production by default.
- **Closed-demo controls:** Verify model input limits reject invalid requests before GPU work and that an accepted second job waits while the single render slot is busy. Verify private file handling, cleanup after success, failure and cancellation, and saved-result access from Library. Inspect job status and logs for the required states and absence of sensitive values, document storage and temporary retention, and verify the owner spend alert after its separately authorized configuration.
- **Cutover and handoff:** Verify a working rollback, reconcile old in-flight jobs, make the separately approved routing switch, and verify production without assuming a merge deployed it. Record exact source, deployed app/function versions, route, qualification evidence, and recovery procedure in the existing infrastructure authority. Do not mark the architecture complete while any requirement remains unverified.

## Out of scope

No additional production models, weights, features, workflows, provider integrations, or UI changes. Existing FIBO behavior remains supported. No unrelated audit remediation or database/storage redesign; document any minimal persistence changes required for durable dispatch, retry reconciliation, and job binding. None of the architecture requirements above are deferred.
