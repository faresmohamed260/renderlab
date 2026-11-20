# ADR-005 process-exit checkpoint: Vercel-disabled evidence

Date: 2026-11-20

## Authorized boundary

The owner authorized one bounded production checkpoint against application source `a450a95996329a4508883ab77996016cd27fbd86`: at most two disposable FIBO calls and 600 A10-seconds, termination of only the first call's uniquely identified ComfyUI child process, exact Auth/database/R2 cleanup, and no deployment, container stop, secret, route, schema, model or owner-data change.

Protected main `90b7063d6d71269fced3ade4d915737b6c8a54be` contained the reviewed workflow and fail-closed process-identification contract. Preflight found no running lifecycle workflow and zero containers for production image-worker app `ap-wS5WKruuipwssNGHf7Eo6k` in Modal environment `main`.

## Failed-closed execution

Manual workflow [`44822796963`](https://github.com/faresmohamed260/renderlab/actions/runs/44822796963) passed its exact-release, credential, dependency and harness checks. Its first application submission returned HTTP 402 before a generation job was accepted. The run then executed fixture cleanup and uploaded artifact `production-adr005-process-exit-recovery-44822796963-1`.

The artifact records:

- expected production source `a450a95996329a4508883ab77996016cd27fbd86`;
- scenario `process-exit-recovery`;
- provider-call ceiling 2;
- no events and no outcome;
- `cleanupVerified: true`;
- `passed: false`.

Immediate direct response-header reads from both `https://renderlab.faresuniform.uk/api/generation/jobs` and the exact recorded deployment URL returned:

- HTTP `402 Payment Required`;
- `Server: Vercel`;
- `X-Vercel-Error: DEPLOYMENT_DISABLED`.

Modal read-back returned zero image-worker containers, and no `phase=started` worker log existed for the checkpoint window. Therefore the run made zero provider calls, used no GPU allocation, created no accepted generation job and terminated no process. The approved two-call / 600-A10-second allowance remains unused.

## Result and recovery gate

This run does not close hosted timeout/process-exit recovery. Vercel service must be restored by the owner or provider before another checkpoint. Before reuse of the existing authorization, independently verify that both the production custom domain and exact deployment URL no longer return `DEPLOYMENT_DISABLED`, re-run the existing exact-release and zero-active-work preflight, and confirm zero image-worker containers. No deployment or alias movement is authorized merely by this audit.
