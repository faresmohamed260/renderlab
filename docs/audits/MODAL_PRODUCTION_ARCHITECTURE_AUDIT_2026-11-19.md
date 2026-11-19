# Modal production architecture audit

**Date:** 2026-11-19. **Status:** Read-only assessment, recorded and deferred. Recommendations are not approved implementation work or a deployment plan.

## Evidence and scope

Audited main at `9108c9d` and the live release in [the production manifest](../production/current.json): Vercel source `4f8efb7`, Modal `renderlab-generation-gateway` v1 (`ap-FUgK7pAXIWZn37TF7KBq9n`) in `main`. The prior gateway is stopped. [Run 44585394266](https://github.com/faresmohamed260/renderlab/actions/runs/44585394266) verified one completed image, Library reopen, and fixture cleanup, not load, failover, or GPU interruption. The audit inspected code, Modal metadata and recent logs, and the Vercel alias. It ran no renders, fault injections, or provider changes.

## Assessment

The application owns access, admission and durable job state. A CPU gateway accepts asynchronous work and a GPU function renders it. Proxy auth (unauthenticated HTTP 401), signed handles, input size bounds, isolated temporary files, loopback ComfyUI, and no blind retry of ambiguous submissions are useful controls. This is suitable for a bounded low-volume rollout; enterprise capacity and recovery are not established.

| Priority | Finding | Proposed fix (deferred) |
| --- | --- | --- |
| High | The previous Vercel deployment targets the stopped worker. Restoring its alias alone would not restore generation. The Modal deploy script checks for the old app name after deploying the new entrypoint. Live Modal history has no commit for v1. | Fix post-deploy verification; record source, worker version, and resources; qualify a rollback with a live gateway and a tested recovery procedure. |
| High | App cancellation suppresses publication but does not prove active denoising stops. A lost response after Modal accepts a submit can leave RenderLab without a job handle. | Correlate intermediate steps with actual worker exit for the same job (#452/#465). Separately qualify reconciliation of ambiguous accepts without duplicate execution. |
| High | Provider access logs contained full signed job handles. Proxy auth is still required; no credential exposure or unauthorized access was established. | Redact at source or keep handles out of logged paths; use non-secret correlation IDs. Review access and retention, and plan key overlap for rotation. |
| Medium | Only Modal main was observed. Weight volume lookup is explicitly pinned to main. Deployer/runtime scope and workspace-wide controls were not verified. | Resolve resources per environment; use separate runtime and deploy access, isolated staging resources, and read-only weight mounts where supported. |
| Medium | One A10 container with a 420-second execution timeout; ComfyUI starts per job. No verified standby, load target, alerts or billing limits. A concurrency cap is not a spend cap. | Observe queue, startup, inference and result-save time separately; track errors, cancellation and cost per success. Add budget/queue alerts and raise capacity only when measured demand warrants it. |
| Medium | ComfyUI and key packages are pinned, but the transitive GPU image dependencies are not fully locked. Async provider payload retention must be considered alongside R2. FIBO is under the existing invite-only noncommercial rollout boundary. | Lock image inputs and record weight hashes; verify provider retention, deletion and residency; review model licensing before broader use. |

## Adding models or features

The deployment name is neutral; the live route, validation, graph and output handling are still FIBO-specific. The first different model or output type requires explicit routing, request/result contracts and its own qualification; the name change did not create a plug-in system. Keep shared authorization and durable job tracking. Route by operation/capability to the right function, and keep each existing job bound to the backend and contract that accepted it for status and cancel. A FIBO image feature can often extend its existing path; image-to-text should not have to return a PNG or wait in the image render queue. Separate functions where jobs have different resource or latency needs; avoid rebuilding the gateway or creating a Modal app per feature by default.

Measure before optimizing: add bounded workers to shorten queues, reuse initialized models when startup dominates, and benchmark GPU type or model settings if inference dominates. Extra workers increase throughput, not single-job inference speed. Warm capacity has idle cost and only helps model startup if the model process is actually reused. See [Modal scaling](https://modal.com/docs/guide/scale) and [cold starts](https://modal.com/docs/guide/cold-start). No capacity or cost target is approved by this audit.
