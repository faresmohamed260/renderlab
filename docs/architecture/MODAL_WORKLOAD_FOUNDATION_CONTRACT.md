# Modal workload architecture — implementation requirements

**Status: Proposed for review.** All requirements below are mandatory for architecture completion. Implementation may be verified in sequence to isolate failures; the stages are not optional follow-ups. This PR records the contract, not an implementation or approval to create cloud resources, use GPUs, or cut over production.

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

## Required model switching and universal worker

- **Catalog and switcher:** Implement a server-side allowlist of model versions, supported operations, adapter, and backend. Resolve the requested or default model before dispatch; reject unknown models, unsupported operations and inactive backends before GPU work. Do not silently substitute a model. Keep FIBO as the only production entry and default; prove the switcher with two synthetic adapters in local/CI tests. No new user-facing model picker is required.
- **Universal worker contract:** Implement reusable, model-neutral worker code for dispatch, lifecycle, file isolation and cleanup, result/error handling, and correlation. FIBO-specific graph construction, validation and weight configuration belong to the FIBO adapter. Provide a backend interface for ComfyUI and direct-Python adapters; prove the latter with a lightweight test adapter, not a real new feature. Universal means shared code and contracts across pools, not one process, GPU type or dependency image for every workload. Keep public request and result behavior unchanged.
- **Job continuity:** Bind each accepted job to its exact backend, model version and execution handle for status, results and Cancel; a catalog change must not alter an existing job. Preserve compatibility with pre-cutover handles, drain old work through result saving, and verify a rollback that can still render. Do not retire the old execution path until the new path and recovery are verified.

## Required reliable dispatch and retries

- **Durable dispatch:** Persist the authorized job and its dispatch intent atomically before acknowledging submission (for example, with a transactional outbox). Dispatch outside the request, using a recoverable claim/lease so a crashed dispatcher cannot strand a job. Persist the selected backend and model version before sending and keep a stable, non-secret attempt identifier across retries of that same dispatch. Recover queued work after restarts without changing ownership, admission, or cancellation rules.
- **Safe retries:** Treat dispatch delivery as potentially repeated. Use backend idempotency or a durable worker-side deduplication and lookup mechanism to prevent a repeated delivery from starting a second render. Retry confirmed transient failures only, with bounded backoff and a deadline. Do not retry permanent failures or redispatch a cancelled job. Distinguish retrying delivery from a new, explicit render attempt.
- **Unknown submission outcome:** A timeout or disconnected response is not proof that dispatch failed. If the backend may have accepted the job, reconcile the original attempt using its stable identifier and recover its execution handle. If acceptance cannot be verified or deduplicated, record the attempt as unresolved for reconciliation or operator review; do not blindly resend or switch backends. Monitor stuck claims and unresolved attempts without exposing signed handles.

## Required renderer move and lifecycle

First qualify the renderer in `renderlab-image-generation` with unchanged FIBO workflows, weights, A10, and behavior. Then qualify container-level ComfyUI reuse as part of the same architecture delivery: start it once per GPU container, keep it private, run one job at a time, isolate and delete per-job files, and reuse model weights when memory allows. Retain one GPU slot, zero always-on GPUs, and a short measured idle window before scaling to zero. Do not add a separate CPU ComfyUI server.

Cancel must interrupt the specific active render, not merely hide its output. Verify the render is no longer executing and its files and queued work cannot contaminate the next job. Apply the same safety gate after timeouts or crashes. Recycle a worker if it cannot be confirmed clean. Preserve Library saving and existing authorization throughout.

## Acceptance and release gates

- **Repository:** Verify catalog selection/defaults/rejections, backend binding across catalog changes, shared runner behavior with both test adapters, and app isolation. Check deployment commands fail closed for unexpected workspace/environment and verify actual app identities after deployment. Use environment-local volumes and least-privilege credentials in line with the [Modal ownership contract](MODAL_PROJECT_ISOLATION_CONTRACT.md). Use non-secret correlation IDs in logs.
- **Dispatch fault tests:** With a fake backend in local/CI tests, simulate duplicate delivery, dispatcher restart, confirmed transient and permanent failures, cancellation while queued, and acceptance followed by a lost response. Prove the accepted attempt is recovered without a second render, bounded retry stops at its limit, and unresolvable acceptance does not auto-resubmit. Qualify the idempotency or reconciliation mechanism for the actual Modal path before cutover; fake-backend tests alone are not release evidence.
- **Hosted, only with separate approval:** Verify dashboard apps and dormant readiness without starting GPU work in the empty apps. Qualify the moved renderer and the reusable worker against text-to-image, reference editing, masked editing, job status, active render interruption, next-job recovery, and Library saving. Measure cold startup, a warm follow-up, and idle GPU time; verify scale-to-zero and record latency/cost evidence before approving the idle window. Do not run performance experiments in production by default.
- **Cutover and handoff:** Verify a working rollback, reconcile old in-flight jobs, make the separately approved routing switch, and verify production without assuming a merge deployed it. Record exact source, deployed app/function versions, route, qualification evidence, and recovery procedure in the existing infrastructure authority. Do not mark the architecture complete while any requirement remains unverified.

## Out of scope

No additional production models, weights, features, workflows, provider integrations, or UI changes. Existing FIBO behavior remains supported. No unrelated audit remediation or database/storage redesign; document any minimal persistence changes required for durable dispatch, retry reconciliation, and job binding. None of the architecture requirements above are deferred.
