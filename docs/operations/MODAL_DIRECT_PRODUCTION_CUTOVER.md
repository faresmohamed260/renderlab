# Modal direct-production cutover

**Status:** The split gateway and private image worker are live in production. The three ordered smokes, recovery drill, cleanup and queue drain passed.

## 2026-11-20 ADR-005 production continuation

The owner directed completion of the accepted ADR-005 workload architecture in the existing production `main` environment without recreating a qualification environment. Exact protected-main source `c3f92247b21b9761fde6cee610cce2c9084441f8` passed all required checks. Hosted recovery migration `20261120050006` is applied over the original outbox migration, with zero active jobs, nonterminal attempts or unresolved attempts at rollout preflight. The original production gateway and image-worker app identities were redeployed from that source, and the three inactive workload shells were added as recorded below.

The first bounded smoke, run `44678583907`, dispatched exactly one attempt and the image worker completed it. The still-live older Vercel application polled the new header-only gateway through the retired path-shaped contract, received 404 and marked the job failed before the worker result completed. Exact fixture cleanup passed and later read-back found no active or unresolved work. Matching Vercel deployment `dpl_ok8kLgcaYAqHZAk2f1m874jotpPp` then reached READY from `c3f92247b21b9761fde6cee610cce2c9084441f8` and received `renderlab.faresuniform.uk`. Run `44679165799` performed no provider work because the protected smoke allowlist still named the prior cutover pair. Matched-release text-to-image run `44679882865` and reference-edit run `44680785603` subsequently rendered, saved, reopened from Library and cleaned their exact fixtures. Reference-edit preflight run `44680178792` performed no provider work because the historical cutover guard admitted only the text-to-image scenario; the corrected guard remains bounded to the two image scenarios. Provider logs recorded one dispatch per successful run, pending 202 responses while each call executed, and final 200 results. Those executions were cold starts because the review interval exceeded the configured idle window; the later lifecycle evidence below closes warm reuse and active cancellation/clean-next-job recovery. The rollback remains `e93481466806b3a88f986cd547f11ef62e9543fb` / `dpl_sPamVvj9D9g8eyczLsNuRwFfYPEE`.

## 2026-11-20 reusable-worker lifecycle evidence

PR #497 added the manual, serialized `Production ADR-005 Worker Lifecycle` workflow. Each scenario verifies the exact recorded production release before fixture work, permits at most two disposable FIBO calls, uses a run-owned account and storage namespace, excludes signed handles/prompts/media/credentials from its artifact, and requires exact Auth/database/R2 cleanup. PR #498 corrected only its Library evidence query after run `44720778537` used a nonexistent `media_assets.status` column. That failed run had already completed both renders and cleanup; it is not the accepted Library-readback result.

- Accepted warm-queue run `44722092155` observed the second edit in `queued` / `dispatch_pending` while the first job was active. Both attempts had `delivery_count=1`, distinct provider-call fingerprints, saved one indexed PNG each, reopened through the private Library content route and cleaned two assets plus the uploaded source. Modal logs show both attempts on container `ta-01M7W92ZRHPF5C6W1Z0CTGAJXR` and ComfyUI session `4d67449c3549429c8e7d05ee77e84d12`: the first reported `cold=True`, `ready_seconds=15.074`, `total_seconds=43.216`; the queued follow-up started one second later and reported `cold=False`, `ready_seconds=0.019`, `total_seconds=30.103`.
- Accepted cancellation/recovery run `44722444992` cancelled only after the first attempt had a persisted provider dispatch and reached `running`. It terminalized `cancelled` with no output IDs or media rows. Modal emitted a start but no completion for its container/session. The next job started in a different container/session, completed with `cold=True`, saved one indexed PNG, reopened privately from Library and cleaned exactly. Both attempts had one durable delivery. An authoritative Modal container read returned no running image-worker containers after the configured idle period; the bounded observation was 92 seconds after the final worker completion. A subsequent production database read returned zero active generation jobs and dispatch health `{oldestDueSeconds: 0, expiredClaims: 0, unresolved: 0}`.

These runs close same-container warm reuse, one-slot queueing, active provider interruption, clean next-job recovery, result persistence/readback and ordinary scale-to-zero. The later durable-recovery, dispatch-health and Modal usage-alert audits close missed-wake/lost-response/overlap recovery, replay across retention/rollback, heartbeat/outbox alert delivery and owner provider-spend alert configuration. Injected timeout/process-exit cleanup remains open below.

## 2026-11-20 durable dispatch recovery evidence

Production audit [`ADR005_DURABLE_RECOVERY_PRODUCTION_2026-11-20.md`](../audits/ADR005_DURABLE_RECOVERY_PRODUCTION_2026-11-20.md) verifies the real scheduled and manual dispatcher functions in gateway app `ap-UfrkwIijsdz6xiGiQwtMlB` without starting a GPU render. A committed run-owned ambiguous-send record received no immediate wake; the next scheduled pass recovered its recorded Modal call identity, increased its durable delivery count once and attached the signed handle without submitting again. Two simultaneous manual passes against a second due recovery record produced exactly one claim/dispatch and one zero-work result. Controlled hosted retention checks rejected the same stale attempt through the current and rollback admission functions while retained, deleted nothing one millisecond before the boundary, deleted exactly that row at the boundary, and continued to reject it after removal while a distinct fresh attempt remained admissible.

All disposable Auth, generation, outbox and media rows were removed. Final read-back returned zero fixture residue, zero active jobs, zero incomplete dispatches, zero due age, zero expired claims and zero unresolved attempts. No application, Modal app, schema, route, secret, model volume, provider function or GPU allocation changed. This closes the hosted missed-wake, lost-response, overlap and replay-retention gates only.

## Process-exit recovery checkpoint

The remaining worker-failure exercise targets unchanged production application source `a450a95996329a4508883ab77996016cd27fbd86`, Modal workspace/environment `faresmohamed260` / `main`, gateway `ap-UfrkwIijsdz6xiGiQwtMlB`, image worker `ap-wS5WKruuipwssNGHf7Eo6k`, database project `rashyleshocuvpgcooxy`, and the current owner-scoped R2 bucket. It changes no deployment, route, secret, schema, app identity, model weight or owner data.

The manual `process-exit-recovery` lifecycle scenario is limited to one run-owned account and two FIBO calls: one eight-step disposable render whose run-owned ComfyUI subprocess is terminated externally only after its provider call is durably bound and running, followed by one four-step clean recovery render. Stop if the target differs, another production job is active, the first call or its sole ComfyUI subprocess cannot be identified unambiguously, termination is not observed within four minutes, a duplicate dispatch occurs, cleanup fails, or cumulative A10 allocation reaches 600 seconds. The first job must terminalize failed with no output or media row; the second must save one PNG, reopen it through Library, and use a distinct provider call. The workflow then deletes the exact Auth/database/R2 fixtures and proves zero residue, active jobs, incomplete dispatches, expired claims and unresolved attempts.

Do not use `modal container stop` for this checkpoint. Modal documents that a crashed or stopped Function container reschedules its active input, so terminating the container would not prove RenderLab's worker failure path and could consume an unbounded retry window. After the workflow prints `ADR005_PROCESS_EXIT_READY`, list containers only for image-worker app `ap-wS5WKruuipwssNGHf7Eo6k` in environment `main`. Continue only when exactly one container exists. Inspect that container's `/proc/[0-9]*/cmdline` and `/proc/[0-9]*/cwd` entries and continue only when exactly one child has working directory `/opt/ComfyUI` plus exact command arguments `main.py`, `--listen 127.0.0.1`, `--port 8188`, and `--disable-all-custom-nodes`; terminate only that child PID. The renderer starts the child with a relative `main.py` argument from `/opt/ComfyUI`, so an absolute-script-path match is incorrect and must not be used. The renderer then observes the real subprocess exit, resets its isolated workspace, propagates a normal Function exception without Modal container-crash resubmission, and lets the durable application reconciliation produce the truthful failed state.

Recovery is to stop the manual workflow, reconcile only its run-owned job to a truthful terminal state, terminate only its identified ComfyUI subprocess if it is still present, and run the existing exact fixture cleanup. The production gateway, scheduled dispatcher and prior rollback release remain unchanged. This checkpoint does not authorize a container stop, deployment, performance experiment, additional rerun, ComfyUI code change, or more than the two named provider calls.

Authorized run [`44822796963`](https://github.com/faresmohamed260/renderlab/actions/runs/44822796963) failed closed at application submission before creating a generation job or contacting Modal. Both the production custom domain and exact deployment URL returned HTTP 402 with Vercel `X-Vercel-Error: DEPLOYMENT_DISABLED`. Authenticated Vercel billing read-back identified a Hobby fair-use pause for Fluid Active CPU, stated that it ends December 20, 2026, and offered Pro upgrade as the immediate dashboard recovery action. The artifact recorded zero events, `outcome: null`, `cleanupVerified: true`, and `passed: false`; direct Modal read-back returned zero image-worker containers. No provider call or GPU allocation occurred, so the approved two-call / 600-A10-second allowance remains unused. Do not rerun until the owner restores Vercel service and independent HTTP read-back proves the exact production domain and deployment reachable. See [`ADR005_PROCESS_EXIT_BLOCKED_VERCEL_2026-11-20.md`](../audits/ADR005_PROCESS_EXIT_BLOCKED_VERCEL_2026-11-20.md).

## Owner provider usage alert

Production audit [`ADR005_MODAL_USAGE_ALERT_PRODUCTION_2026-11-20.md`](../audits/ADR005_MODAL_USAGE_ALERT_PRODUCTION_2026-11-20.md) records the owner workspace's existing provider controls. Modal shows a $30 monthly workspace usage limit set by the owner and has both Email and In-app channels enabled for Usage alerts, which Modal describes as threshold and unexpected inactive-Function charge alerts. The read-only verification changed no billing, notification, environment or application setting. This closes the ADR-005 provider-spend alert gate without adding a second notification system or changing the owner's cap.

## 2026-11-20 execution and recovery checkpoint

The owner confirmed prior Scope D and G approval for runtime `68651d2d1e3c5602c2f840a0d066a0f6185a5cf2`. The earlier approval for superseded source `e47d3ae7e1928b563cec5adb14678cb712c3beaf` did not carry to the corrected source.

- Supabase migration `0030` was applied as hosted version `20261119230644`. It remains in place for recovery. Before the gateway attempt, the outbox was empty and the database had 70 generation jobs, two sources, and zero active jobs.
- The candidate image worker deployed as `ap-k9SzNTtsmQKGV1d7r1V7Yk` v1. Codex's deployment command used the candidate checkout, which was later read back clean at the exact approved SHA. The candidate gateway deployment exited nonzero before publication even though the CPU image built successfully, and Modal reported app `ap-om9ZYUJL5WyBiTbABEKMHm` stopped without an active replacement. Modal reported an unknown stop reason. An offline reproduction on the same Windows host with Modal CLI 1.4.2 showed its object-tree output raising `UnicodeEncodeError` on the checkmark under CP1256 before the publish boundary. With `PYTHONUTF8=1` the same output path passed. This is the leading explanation; the original client exception was not captured. Use UTF-8 and capture both streams on any future deployment attempt.
- Recovery gateway `ap-n7OgOpn4QFu3B97PyoQG7E` v1 was deployed from clean source `4f8efb7f52e7c43f5425c7a4aa3375f2292992cb`. The Modal endpoint responded with the expected unauthenticated 401; this does not qualify rendering. Vercel remained at recovery deployment `dpl_Dk8idC6n7SuQ7aUQhUQ1a8ygu6KH`; no alias movement occurred.
- The separate candidate worker was stopped, the dispatcher and worker DB roles were restored to `NOLOGIN` with passwords cleared, and only the two candidate secrets were removed. The existing gateway secret and model volume were not modified.
- One authorized recovery smoke was dispatched as [run 44639143236](https://github.com/faresmohamed260/renderlab/actions/runs/44639143236). The workflow completed successfully. Before closing recovery, independently reconcile fixture cleanup, queue drain, and A10 usage. Do not treat the candidate split or the three-smoke acceptance sequence as complete. Refresh the production and recovery identities, and reconcile approval and remaining GPU allowance before another cutover attempt.


### Retry preflight — outage not started

The recovery Vercel release and combined Modal gateway are still live. The seven corrected-source checks passed, the combined gateway had zero tasks, and Supabase had zero active jobs and an empty outbox (70 jobs and two sources total). The successful recovery smoke occurred before any replacement smoke, so it cannot establish the ordered recovery drill in this runbook. It is nevertheless one GPU render already performed. Modal CLI billing returned hourly app cost, not metered A10 time; it did not establish the remaining hard allowance. Do not start another outage until the runbook records an owner-approved retry sequence and a verifiable cumulative GPU budget. No production runtime changes were made during this preflight.

The owner subsequently directed the retry to use a fresh 15-A10-minute planning allowance. The prior recovery render remains historical usage and is not the in-sequence drill. The outage was also blocked by a separate release-verification conflict: the established production FIBO smoke workflow checks out protected main and requires its production manifest to match the exact requested live SHA before fixture work. The manifest records recovery source `4f8efb7f52e7c43f5425c7a4aa3375f2292992cb`; the replacement smoke requires `68651d2d1e3c5602c2f840a0d066a0f6185a5cf2`. The cutover runbook records the new production manifest only after final smoke acceptance. The workflow change in this PR resolves that circular dependency once merged to protected main; it does not record release acceptance.

## Purpose and one-time exception

This is the one-time operating exception to ADR-005's normal requirement to qualify the split Modal gateway and image worker in an isolated hosted environment before production cutover. RenderLab currently has one user, that user has accepted a planned outage, and the project owner explicitly rejected creating a `qualification` Modal environment for this rollout.

The exception changes only the first hosted qualification location and sequence:

- use a planned production outage in Modal `main` instead of a parallel hosted environment;
- stop and replace the combined production gateway rather than keep it serving while a parallel candidate is qualified;
- exercise the real recovery pair during the outage before accepting the replacement;
- do not use this exception as precedent for later releases.

It does **not** waive exact-source CI, zero-in-flight verification, least privilege, disposable-fixture cleanup, provider read-back, recovery proof, or production documentation closure. The gateway and image worker must remain deployable to a separate environment later. No `qualification` environment is created by this operation.

## Exact identities

<!-- EXTERNAL_FACT: modal-direct-cutover-baseline -->

| Boundary | Exact target |
| --- | --- |
| Replacement application and Modal source | `c3f92247b21b9761fde6cee610cce2c9084441f8`; includes the post-#487 worker lifecycle and dispatch-recovery runtime |
| Recovery application and Modal source | `e93481466806b3a88f986cd547f11ef62e9543fb` |
| Modal workspace | `faresmohamed260` / `ac-88wJ5dCXYBOywnXXaGmUoV` |
| Modal environment | existing `main`; no new environment |
| Existing gateway at retry preflight | `renderlab-generation-gateway`, app `ap-UfrkwIijsdz6xiGiQwtMlB` |
| Replacement worker | `renderlab-image-generation`, app `ap-wS5WKruuipwssNGHf7Eo6k` |
| Preserved model volume | existing `renderlab-fibo-models` in `main` |
| Preserved gateway secret | existing `renderlab-fibo-native-gateway` in `main` |
| New dispatcher secret | `renderlab-generation-dispatcher` in `main` |
| New worker secret | `renderlab-generation-worker` in `main` |
| Shared database | Supabase project `rashyleshocuvpgcooxy`; outbox migration `20261119230644` plus recovery migration `20261120050006` |
| Current Vercel recovery deployment | `dpl_sPamVvj9D9g8eyczLsNuRwFfYPEE`, source `e93481466806b3a88f986cd547f11ef62e9543fb` |
| Production domain | `https://renderlab.faresuniform.uk` |

The three inactive CPU-only shells are deployed in production `main`: `renderlab-video-generation` (`ap-N4eknQ8llq21wpRalpJZX1`), `renderlab-image-tools` (`ap-V3BZK2LUEnnuU0DJEPTgoY`) and `renderlab-video-tools` (`ap-fT4zmpzFH5KD82jOvp9V8A`). Their deployed private readiness functions returned their own identity and `state: inactive`; they have no GPU, secrets, public endpoint or schedule. The replacement image worker includes container-level ComfyUI reuse and must be qualified by the bounded production continuation smoke before this release is closed.

## Preserved state

- Reuse the existing `renderlab-fibo-models` volume in place. Do not copy, rename, replace, or delete model weights.
- Migration `0030` is additive. Do not modify or delete existing generation jobs, Library rows, account state, or R2 objects as part of migration or cutover.
- The current gateway URL and Vercel's existing Modal proxy key/secret remain unchanged. Do not create a new Modal account credential or expose worker identity to the browser.
- Before outage, capture counts for active Library media, generation jobs, generation sources, and active job states. After final smoke cleanup, require the pre-existing counts and objects to remain, allowing only explicitly identified terminal smoke-history behavior.
- Smoke fixtures must use the established run-owned production FIBO smoke account and exact cleanup. Never clean by broad owner, name, date, or storage prefix.

Read-only planning inspection on 2026-11-20 observed 14 active media assets, 70 generation jobs, 2 generation sources, zero in-flight generation jobs, and no dispatch-outbox table. These are planning evidence only and must be re-read immediately before execution.

## Credential permissions

After migration, generate two independent high-entropy passwords, enable the two dedicated PostgreSQL login roles, and store one TLS-required connection URL only in its matching Modal secret:

| Credential | Postgres role | Allowed RPC execution | Explicitly forbidden |
| --- | --- | --- | --- |
| Dispatcher connection | `renderlab_modal_dispatcher` | `renderlab_claim_generation_dispatch`, `renderlab_finish_generation_dispatch`, `renderlab_lookup_generation_attempt` | attempt admission, job acceptance, cleanup, direct table access, browser use, inherited roles, RLS bypass, service-role privileges |
| Image-worker connection | `renderlab_modal_worker` | `renderlab_begin_generation_attempt` | claim/finish/lookup, job acceptance, cleanup, direct table access, browser use, inherited roles, RLS bypass, service-role privileges |

Each Modal secret contains only `RENDERLAB_DISPATCH_DATABASE_URL` for its own role. Use the hosted Supabase pooler identity for project `rashyleshocuvpgcooxy`, percent-encode the generated password, and require `sslmode=require`; runtime independently forces TLS. Neither secret receives a Supabase publishable/secret API key, legacy JWT, service-role key, shared login, or the other role's password. The existing Vercel server retains its already-authorized service-role access for application-owned acceptance, cancellation, persistence, and cleanup RPCs. Before storing credentials, verify both roles are `NOINHERIT`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOBYPASSRLS`, connection-limited, not members of `authenticator`, and have no direct table privileges. After creating each Modal secret, test only its permitted RPCs and prove representative forbidden RPC and table access fail.

## Pre-outage gates

All gates are fail-closed. Do not stop or deploy anything unless every gate passes on the execution date.

1. Confirm protected-main CI remains successful for the corrected replacement source recorded in [Exact identities](#exact-identities).
2. Confirm the production domain still serves recorded deployment `dpl_Dk8idC6n7SuQ7aUQhUQ1a8ygu6KH` at recovery source `4f8efb7f52e7c43f5425c7a4aa3375f2292992cb`.
3. Confirm Modal token identity is workspace `faresmohamed260` / `ac-88wJ5dCXYBOywnXXaGmUoV`, environment `main`.
4. Confirm `renderlab-generation-gateway` has zero Modal tasks and capture its app ID/history.
5. Query Supabase and require zero `generation_jobs` in `queued`, `preparing`, `running`, `cancelling`, or `persisting`. If migration is already present, also require zero outbox rows in `pending`, `claimed`, `retry_wait`, or `unresolved`.
6. Capture the Library/database baseline and verify the model volume and gateway secret still exist without reading or logging secret values.
7. Validate the exact recovery checkout at `4f8efb7f52e7c43f5425c7a4aa3375f2292992cb` and the corrected replacement checkout recorded in [Exact identities](#exact-identities); both must be pristine.
8. Arm both recovery methods before outage: Modal rollback to captured combined-gateway version when history remains available, and source redeployment from exact recovery SHA when it does not. Arm Vercel alias restoration to `dpl_Dk8idC6n7SuQ7aUQhUQ1a8ygu6KH`.

Any nonzero active work, identity mismatch, missing preserved resource, dirty checkout, or unavailable recovery source aborts the operation without forced cancellation.

## Replacement cold-start preflight

The superseded replacement source `68651d2` failed a local cold-import check using Modal's documented container environment. The gateway and renderer require resource names at module import, but the deployment process only sets those names locally. Forward only each function's explicit non-secret resource settings and verify that the entrypoints import with the resulting container environment. Keep the shared gateway secret, two database credential contracts and model volume as specified above.

Production stayed on the combined recovery gateway during this preflight. Before declaring another outage, record the corrected protected-main runtime SHA, confirm its required checks, and obtain Scope D and Scope G for that exact source.

## 2026-11-20 owner authorization for the corrected source

The project owner approved Scope D and Scope G for exact protected-main source `bb0bca8e41ea118c94d2fc4cdda49baf8194e4ba`. All six required checks passed on that SHA. The recovery anchor is Vercel `dpl_Dk8idC6n7SuQ7aUQhUQ1a8ygu6KH` with the combined Modal gateway `ap-IccrW86VuyQL9yZfVVShld` v1. The earlier recovery smoke stays historical.

Track a conservative A10 bound for each of the three authorized smoke renders. With one A10 slot, charge the time from the first instant the monitored workflow can submit a render through the first provider observation that the corresponding GPU workload has no running container after the job drains. For the combined app, count its entire observed container window if provider telemetry cannot distinguish the CPU container. Count pending or unverified intervals conservatively. Stop dispatch and the exact GPU workload with time reserved for termination before exhausting the 900-second aggregate cap. Preserve the workflow and Modal evidence alongside the release.

## 2026-11-20 rollout attempt and restoration

- At 02:56:52 Cairo time, the combined gateway stopped after an empty-queue preflight. Both restricted database identities passed TLS and allowed/denied RPC checks. Modal published private image worker `ap-LXB3h6OYnylGHs1Fk4dP3e` and split gateway `ap-g03bteS8JZyqHNy7D96jix` successfully. The image worker had no public endpoint and zero containers. The dispatcher had one runner before any manual call or production smoke.
- The staged production-target Vercel build `dpl_71xEwp5dmmcBxfTeH3QKLD9d436A` reached READY but reported neither `gitSource.sha` nor `meta.githubCommitSha`. The protected-main smoke verifier also still pinned `68651d2`. The production alias stayed on the recovery deployment and no smoke was dispatched.
- At 03:01 Cairo time, the combined source `4f8efb7` republished as `ap-iiL2RGqh6N96YKknO4zCo4` v1. The public site returned HTTP 200 and the protected gateway returned HTTP 401. The split apps stopped, both candidate passwords were cleared, both roles returned to `NOLOGIN`, and the two candidate Modal secrets were removed. Migration `0030` remained applied with an empty outbox. The baseline remained 70 jobs, two generation sources, and 14 active media assets. This attempt submitted zero GPU renders.
- Before the next outage, run the matching smoke verifier regression tests and verify the allowlist on protected main. Prepare a clean Git checkout of the exact replacement SHA. When staging Vercel from that checkout, supply the verified Git SHA using `--meta githubCommitSha=<git rev-parse HEAD>` if the CLI does not infer it. Keep automatic alias assignment disabled and confirm the exact SHA in Vercel's deployment record before any alias movement.

## 2026-11-20 first split smoke and verified rollback

- The combined gateway stopped at 03:13:17 Cairo time. The retry deployed worker `ap-v0h3DXOzrLNA55Pb6nMOIW` and gateway `ap-CKGSQdaH2LXYe28BZxpHVU` from approved `bb0bca8`. The private worker had no web endpoint. The dispatcher completed a scheduled database claim before alias movement, demonstrated by the claim counter increasing from five to six under its dedicated database identity.
- The alias moved to READY deployment `dpl_6LjYRnBZCLL5PBz8jr2RwqSuqMih`. [Split smoke 44652292811](https://github.com/faresmohamed260/renderlab/actions/runs/44652292811) passed the exact release and fixture checks. The outbox dispatched once and the private worker completed its four FIBO sampler steps. The application job remained running because the durable backend key `fibo` was stored where reconciliation resolved only the fleet ID `renderlab-fibo-native-01`. Source inspection also found that the dispatcher stored an unsigned Modal call ID, which the gateway's result route rejects. The operator marked only the identified disposable fixture job failed after stopping the split path. The workflow then verified exact fixture cleanup.
- The alias returned to `dpl_Dk8idC6n7SuQ7aUQhUQ1a8ygu6KH`, and the combined gateway republished as `ap-RhZ9OtOWoaFzSvnIXL1FDs` v1. [Recovery smoke 44653302341](https://github.com/faresmohamed260/renderlab/actions/runs/44653302341) completed a four-step render, saved its output, reopened it from Library and passed fixture cleanup. Both split apps stopped, their two secrets were removed and their database roles returned to `NOLOGIN`. Database read-back showed zero active jobs, an empty outbox, 70 jobs, two sources and 14 active media assets.
- The two smoke runs used a conservative upper bound of 498 A10 seconds, measured from each GitHub generation step start through provider-observed zero containers (285 seconds split and 213 seconds recovery). The cut-forward smoke was not dispatched. The recovery run followed a failed split smoke and does not complete the ordered acceptance sequence.
- Before another outage, qualify the corrected runtime and reconcile its exact source across the runbook and the protected-main smoke workflow. Obtain approval for the corrected source and reconcile the two consumed renders before allocating a new smoke sequence.

## 2026-11-20 result reconciliation candidate

[PR #483](https://github.com/faresmohamed260/renderlab/pull/483) merged as `e93481466806b3a88f986cd547f11ef62e9543fb`. It maps the durable backend key to the existing FIBO fleet route and signs durable Modal call handles with the same contract used by the gateway. The change reuses migration `0030` and the existing named gateway signing secret. The combined release and verified rollback evidence remain current. Prior authorization and GPU consumption recorded above belong to `bb0bca8e41ea118c94d2fc4cdda49baf8194e4ba`.

Before starting the new outage, record approval for both scopes on the exact replacement source, including the budget for all three ordered smoke renders. Reconfirm the previous render accounting, live recovery identities, required exact-source checks, zero in-flight work, and the staged Vercel deployment metadata.

## 2026-11-20 authorization for the reconciled runtime

The project owner approved Scope D and Scope G for exact application and Modal runtime `e93481466806b3a88f986cd547f11ef62e9543fb`. The approved retry has three disposable, four-step renders and a fresh aggregate ceiling of 900 A10 seconds. The prior two smoke runs and their conservative 498-second upper bound remain separate historical usage. The smoke harness is bound on protected main as `b514b9b4547fce28ecf43d1a4f4c11f2f60c4479`.

Vercel read-back verified production-target deployment `dpl_sPamVvj9D9g8eyczLsNuRwFfYPEE` READY with the exact approved SHA before the outage. The live alias still pointed to recovery deployment `dpl_Dk8idC6n7SuQ7aUQhUQ1a8ygu6KH` and the combined gateway `ap-RhZ9OtOWoaFzSvnIXL1FDs`.

## Cutover smoke invocation

For each runbook render, dispatch `Production FIBO Smoke` from protected `main` with `scenario=text-to-image`, the exact current cutover or recovery SHA as `expected_production_sha`, the intended live Vercel deployment ID as `cutover_deployment_id`, and bounded fixture work explicitly confirmed. The cutover gate checks the live domain alias, RenderLab project, deployment readiness and production target, and exact provider-reported source before fixture work. Keep the domain stable until the run and fixture cleanup finish. Leave `cutover_deployment_id` blank for normal production audits; those still require manifest sync. Do not begin the outage until this workflow change is on protected main.

## Planned-outage execution

1. Declare the outage window and repeat the zero-in-flight/database and zero-task checks.
2. Stop `renderlab-generation-gateway` in Modal `main`. The outage begins here.
3. Apply migration `0030` transactionally to shared Supabase and verify the table, RLS, functions, role grants, and absence of browser execution. Run Supabase security advisors and compare new findings with the expected server-owned/RLS-without-policy posture.
4. Generate and provision the two dedicated login passwords without printing or persisting them outside the provider/secret-store transaction. Create the two new Modal secrets with their separate TLS connection URLs. Preserve the existing gateway secret and volume.
5. From pristine replacement source, deploy `renderlab-image-generation` to `main` with one A10 slot, zero warm GPUs, the existing model volume, the worker secret, and the existing per-job ComfyUI lifecycle.
6. Deploy replacement `renderlab-generation-gateway` to `main` with the preserved gateway secret, the dispatcher secret, and its one-minute CPU schedule. Verify it resolves only `renderlab-image-generation` in `main` and that the private renderer has no public endpoint.
7. Deploy Vercel from the exact replacement source, preserving existing production environment values. Do not change `RENDERLAB_GENERATION_GATEWAY_URL`, `RENDERLAB_FIBO_MODAL_KEY`, or `RENDERLAB_FIBO_MODAL_SECRET`. Move `renderlab.faresuniform.uk` to the new READY deployment only after provider identity/readiness checks pass.
8. Run the first replacement smoke: one disposable authenticated FIBO text-to-image request through the production domain. Require an outbox attempt, gateway dispatch, `renderlab-image-generation` execution, terminal saved output, Library listing, Viewer reopen, and exact fixture cleanup.
9. Exercise recovery while the outage remains declared:
   - restore the Vercel alias to `dpl_Dk8idC6n7SuQ7aUQhUQ1a8ygu6KH`;
   - restore the recorded combined Modal gateway through provider rollback, or redeploy exact recovery source if history is unavailable;
   - verify one disposable authenticated FIBO result completes, saves, reopens from Library, and cleans up;
   - confirm the additive migration does not prevent the old direct-submit path.
10. Cut forward again: redeploy the replacement image worker and gateway from the exact replacement source, restore the new Vercel alias, and run a final disposable FIBO result through save, Library reopen, and cleanup.
11. Require zero active jobs, zero nonterminal/unresolved outbox attempts, zero smoke residue, preserved pre-existing Library/database state, a healthy dispatcher schedule, one GPU slot, and scale-to-zero after the measured idle window.
12. End the outage only after the final replacement smoke passes. Record exact Vercel deployment/alias, Modal app IDs/versions, migration version, credential identifiers without values, smoke runs, cost/time, cleanup, and recovery-drill evidence.

## Recovery and stop conditions

If any replacement step fails before the production alias moves, leave or restore the current Vercel deployment, restore the combined gateway, stop `renderlab-image-generation`, disable login on the two new roles, and remove only the new Modal secrets.

If the first replacement smoke, recovery drill, or final forward smoke fails:

1. stop the replacement gateway and image worker;
2. restore Vercel alias `dpl_Dk8idC6n7SuQ7aUQhUQ1a8ygu6KH`;
3. restore Modal combined gateway `v1` by rollback, or redeploy exact source `4f8efb7f52e7c43f5425c7a4aa3375f2292992cb` with the preserved gateway secret and model volume;
4. run the bounded recovery smoke and keep the outage open until rendering and Library reopen are verified;
5. stop and remove the failed image-worker deployment, disable its schedule path, set the two database roles back to `NOLOGIN`, rotate away their passwords, and remove only the two new Modal secrets after evidence capture;
6. leave migration `0030` applied but dormant. It is additive and compatible with the recovery application; do not attempt destructive schema rollback during the outage.

If recovery rendering cannot be restored, keep generation unavailable, preserve Library/data access, stop further mutations, and report the blocker. Do not delete the preserved model volume, gateway secret, current Vercel deployment, existing Library data, or R2 media.

After final acceptance, the old combined gateway is retired by replacement: it is not left deployed or serving. Retain its exact Git source and the previous Vercel deployment as recovery anchors. Retain the shared gateway secret and model volume because the accepted replacement still uses them.

## Bounded real-work budget

The operation authorizes no performance experiment. Its separate GPU scope contains exactly three successful disposable text-to-image renders at four steps:

1. replacement worker-split smoke;
2. combined-stack recovery smoke;
3. final replacement smoke after cutting forward again.

Stop after any failure rather than spending through the remaining budget. Hard ceiling: 15 aggregate A10 GPU-minutes across the operation. No mask, reference-edit, batch, variable-step, ComfyUI-reuse, load, or soak run is part of this cutover.

## Approval boundary

The 2026-11-20 direction decision does not authorize execution. Execution requires both approvals, which may be granted together but remain separately recorded:

### Scope D — direct production mutation and cutover

Authorizes the exact Supabase migration, two dedicated database-login/password provisions, Modal secret changes, planned outage, old-gateway stop, two `main` app deployments, one-minute dispatcher schedule, exact-source Vercel deployment, alias movements for the recovery drill and final cutover, failure recovery actions, retirement of the old running stack, and post-release documentation closure described here. It authorizes no additional environment, app, model, weight change, feature gate, credential, schema change, or destructive data cleanup.

### Scope G — bounded GPU verification

Authorizes only the three disposable four-step A10 renders and 15-A10-minute aggregate ceiling described above. It authorizes no ComfyUI-reuse qualification or other GPU experiment.

Do not begin the outage unless both Scope D and Scope G are explicitly renewed for the corrected replacement source recorded in [Exact identities](#exact-identities).

## 2026-11-20 accepted split-stack cutover

- Exact runtime `e93481466806b3a88f986cd547f11ef62e9543fb`. Vercel production deployment `dpl_sPamVvj9D9g8eyczLsNuRwFfYPEE` was verified at the custom domain at `2026-11-20T01:52:15.000Z`. Recovery remains available through `dpl_Dk8idC6n7SuQ7aUQhUQ1a8ygu6KH` and exact combined source `4f8efb7f52e7c43f5425c7a4aa3375f2292992cb`.
- Initial image worker `ap-Qb1FruxXG3f3mwFJXOXIu0` and gateway `ap-CY9mlYx7bS6jda8IDiPhHw` deployed to Modal `main`. The dispatcher completed a scheduled database claim during an empty queue before any smoke or web request. The first split smoke [run 44655593284](https://github.com/faresmohamed260/renderlab/actions/runs/44655593284) saved and reopened the output, then cleaned its fixture.
- The recovery drill restored the combined gateway `ap-zQzSJmdpxG7ZY4PrMHyYyB` and verified the prior Vercel alias. [Run 44656168377](https://github.com/faresmohamed260/renderlab/actions/runs/44656168377) rendered, saved and reopened on the combined stack and cleaned its fixture. The combined gateway then stopped before cut-forward.
- Final gateway `ap-UfrkwIijsdz6xiGiQwtMlB` v1 and private image worker `ap-wS5WKruuipwssNGHf7Eo6k` v1 now serve the split path. The final dispatcher independently completed scheduled claims. [Run 44656743969](https://github.com/faresmohamed260/renderlab/actions/runs/44656743969) saved and reopened its output, and exact fixture cleanup passed.
- After final cleanup, Supabase had zero active generation jobs and an empty outbox. The original baseline remained 70 jobs, two sources and 14 active media assets. Both dedicated restricted logins were enabled with TLS credentials in their approved secrets. Modal reported zero image-worker containers and the accepted configuration has one A10 slot. Migration `0030` remains applied as `20261119230644`.
- Three renders completed at four steps. Conservative bounds from each generation step through zero containers were 205, 160 and 153 seconds, 518 A10 seconds total against 900 authorized. The previous attempt remains separate historical usage.

## Closure

After successful cutover, update `docs/production/current.json` and every required current-production mirror, change Infrastructure from candidate to verified hosted state, record the applied migration and provider identities, and run Production Documentation Sync for the exact deployed application SHA. This exception expires when that repository closure merges. Any later hosted release returns to ADR-005's normal isolated-qualification rule unless a new owner-approved repository exception is merged first.

## Qualification after the production split

The production split and its closed-demo smoke evidence above apply to the recorded production release. Use the following evidence for the reusable worker, transport and dispatch recovery changes. Run the hosted qualification against an isolated Modal environment and test-only RenderLab, Supabase and R2 resources. Record the exact source, workspace and environment, app IDs and versions, database migration, test account and storage namespace before running it. Use separate gateway signing, proxy and database credentials for the qualification target.

### Preflight and local evidence

- Verify the stable Modal workspace ID against the workspace selected by the active RenderLab credentials. Read the environment, secret names and volume names with `modal environment list --json`, `modal secret list -e <environment> --json` and `modal volume list -e <environment> --json`. Use only names in the preflight inventory. Give `scripts/plan-modal-workload-deployment.py --isolated --resource-readback <inventory.json>` the exact workspace, environment, three secret names and model volume. The inventory has `workspaceId`, `environment`, `secrets` and `volumes` fields. Verify that the test worker reads the pinned model artifacts and cannot use the production DB or service role. Confirm the image app has one A10 slot, zero minimum containers and no public endpoint.
- Run the Python worker and deployment-plan tests. Apply the recovery migration over `0030` in a disposable PostgreSQL database with the generation-job table and roles, then run `tests/sql/modal_dispatch_recovery.sql` using `psql -v ON_ERROR_STOP=1`. The fixture checks the restricted entry points, overlapping claims, a lost response, queued cancellation, and record replay across cleanup and rollback.
- Verify the gateway, dispatcher and image worker in the same Modal environment and the same source revision. The updated server caller sends signed handles only in `X-RenderLab-Job-Handle` to the static status, caption and cancellation routes. Keep both halves of each release together when moving traffic. The signing format is unchanged and saved handles still refer to the original provider call. Drain active jobs through result saving before swapping the paired release. Keep the previous verified release and its matching worker available for rollback.

### 2026-11-20 CPU readiness correction

A read-only preflight found that Modal environment `renderlab-471-qualification` already contained three deployed dormant-workload readiness apps, an unqualified `renderlab-fibo-471-stage` app and volume `renderlab-471-models`, but no secrets. The readiness apps repeatedly failed during startup because their images did not contain the imported `workload_environment` module. Repository fix [#488](https://github.com/faresmohamed260/renderlab/pull/488) merged as exact source `87ba94b75af685e92141b8679a61bc246677f506` before any correction.

Under a separately approved CPU-only corrective scope, the same three app identities were redeployed from that exact source as version `v2`: `renderlab-image-tools` (`ap-T31fjJ6VVMTFhE7i02AA7R`), `renderlab-video-generation` (`ap-ntHJkRTb1dtue8BxM17YaC`) and `renderlab-video-tools` (`ap-bjl07kZ250nKv95pwM4TIX`). Each private `readiness` function returned its own app name and `state: inactive`. All three returned to zero tasks after their idle window, and no stderr was emitted after the corrected deployments. The environment still had no secrets.

This checkpoint closes only the dormant CPU readiness case. It did not invoke or modify `renderlab-fibo-471-stage`, modify `renderlab-471-models`, use a GPU, create credentials, apply a database migration, use production data, change routing or alter the production environment. Active gateway/worker qualification and every A10 case below remain unrun and require their own exact approval.

### 2026-11-20 isolated non-GPU split provisioning and retirement

Under a separately approved isolated, non-GPU scope, the split release was provisioned from exact merged source `32b86daf0472113fc3ab9b0ac598ab45522a7605` in Modal workspace `faresmohamed260`, environment `renderlab-471-qualification`. The private image worker is `renderlab-image-generation` (`ap-u6ROwtBnE2dAXSBxSUtrPo`) and the proxy-authenticated gateway/dispatcher is `renderlab-generation-gateway` (`ap-kN4vlrujjdMNKHq7CLKFvF`). Both use the existing private volume `renderlab-471-models`. Environment-local secrets are `renderlab-471-gateway`, `renderlab-471-dispatcher` and `renderlab-471-worker`; the gateway secret contains only the call-signing key, while each database secret contains only its own TLS-required connection URL.

The empty Supabase project `renderlab-471-qualification` (`dpoqcnvckiodirhzjinw`, `eu-west-1`) has `0029` recorded as hosted version `20261120041351`, `0030` as `20261120041651`, and dispatch recovery as `20261120041657`. Dedicated `renderlab_modal_dispatcher` and `renderlab_modal_worker` logins use independent passwords, remain `NOINHERIT`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION` and `NOBYPASSRLS`, and retain connection limits four and two. Live TLS tests proved each allowed RPC and rejected cross-role RPCs and direct outbox reads. The outbox remained empty.

A single bounded manual dispatcher pass returned zero claimed, dispatched, retried, failed and unresolved jobs. The scheduled CPU dispatcher then remained the only active task; the image worker stayed at zero tasks and emitted no runtime log, so no A10 container or render was started. Post-migration advisors reported no health findings, only expected informational server-only RLS notices and empty-project index notices. No production environment, route, credential, data or feature gate changed.

This checkpoint does not qualify rendering. A test-only RenderLab application/account and complete R2 credential boundary were never configured, and every A10 case in [Hosted evidence](#hosted-evidence) remains unrun. GPU qualification still requires a separate exact-source approval naming its resources, fixtures, fault injection and spend ceiling.

The owner subsequently declined a separate qualification setup. The empty Supabase project `dpoqcnvckiodirhzjinw`, empty private R2 bucket `renderlab-471-qualification`, and complete Modal environment `renderlab-471-qualification` were permanently deleted on 2026-11-20. No R2 credential was created. Provider read-back showed only Modal `main`, production apps `ap-wS5WKruuipwssNGHf7Eo6k` and `ap-UfrkwIijsdz6xiGiQwtMlB`, and production model volume `renderlab-fibo-models`; the production Supabase project, R2 buckets, data, routes and credentials were not changed. Do not recreate these qualification resources for this rollout without new owner authorization. The historical CPU evidence above remains valid, but it is not render qualification.

### Hosted evidence

| Case | Evidence to record |
| --- | --- |
| Cold create and warm follow-up | Start with zero A10 containers. Render a four-step fixture from the app and save it. Submit an edit with ordered references during that render, confirm it waits for the one slot, and save its output. Record both attempt references, provider container identity, ready and total times, and confirm the same ComfyUI process served the second render. Reopen both outputs in Library. |
| Masked edit and input limits | Run one masked edit and confirm the selected change and saved output in Library. Submit invalid source formats, source counts and dimensions, and an oversized or empty mask. Confirm rejection before a provider render call. |
| Active cancellation and recovery | Cancel a valid render after provider execution starts. Confirm the provider call stops, the job reaches cancelled, and no output is saved. Submit a valid next job and confirm it saves without stale input, output or queued work. In an isolated fault run, trigger a timeout or process exit and confirm the next job starts clean. |
| Durable recovery | Withhold the immediate wake, then observe the recurring CPU tick claim the job without web traffic. Test an expired claim and an overlapping wake with the same attempt, then lose the accepted spawn response in isolation. Restart dispatch and confirm recovery attaches the original provider call exactly once, with no second render. Check pre-admission cancellation separately. Record acceptance-to-dispatch latency and the bound on retries. |
| Replay across retention and rollback | Replay an expired attempt against the updated worker and the exact rollback entry point. Confirm denial with the retained row and after controlled cleanup in the test database. Confirm the cleanup retains live and unresolved rows and that a newly authorized attempt can render. |
| Idle, logs and storage | Wait for the GPU container count to return to zero. Record the provider timestamps from the final result to zero GPU containers. Inspect application and provider access logs using counts and non-secret job references. Confirm there are no signed handles, prompts, media or credentials in the new logs. Confirm staging cleanup after each outcome and expected saved-output/Library access. |
| Dormant workloads | With separate CPU-only scope, deploy the video generation, image tools and video tools entry points. Invoke private readiness for each and confirm its own identity and unconfigured state, with zero GPU, public endpoints, scheduled work, production secrets and weights. |

Reuse the create and edit fixtures when recording missed-wake, claim and recovery evidence. Start with CPU-only checks and skip any fixture whose setup would use production data. A proposed ceiling for the isolated hosted run is seven accepted A10 calls, including active cancellation and an isolated failure, with no automatic reruns. At the configured 420-second function timeout and 60-second scale-down window, budget up to 3,360 A10-seconds of test execution and idle windows. Record actual provider allocation time and stop the run on a wrong target, unexpected call, cleanup failure or exhausted cap. Qualification approval must name the resources, permitted fault injection and budget. Any subsequent production promotion uses that captured evidence and its own exact-source approval.

### Recovery and data retention

The scheduled dispatcher emits `renderlab.dispatch-tick` only after completing a bounded pass. Its trigger differentiates an actual scheduled pass from an immediate wake. Hosted migration `20261120110737` and exact merged gateway source `d9f9bd4e12103e3524b02e6d4d188ddf9b3ba882` now record the completed summary through a dispatcher-only RPC in `generation_dispatch_heartbeats`; browser, worker and direct service-role table access remain revoked. The production schedule populated `last_scheduled_at` without a manual substitute, and live health read-back returned `scheduledHeartbeatMissing=false`, heartbeat age 18 seconds, zero due/expired/unresolved dispatch work and zero active jobs. The protected generation reconcile GET in production Vercel deployment `dpl_GNAGLCFnynWUdMEtiYDgX9oXeNrb` reports unhealthy after three missed one-minute scheduled completions, after 180 seconds of due age, or when expired claims or unresolved attempts require attention. The later monitor rollout verifies scheduled owner notification and recovery; the Modal usage-alert audit verifies the owner's provider threshold alert channels.

The immutable admission deadline limits all deliveries of the attempt, including during rollback. While the original send is ambiguous, retain its record for reconciliation and never submit it again. A provider call ID recorded by worker admission lets a later scheduled pass recover that original call. Preserve live and unresolved rows for operator review. The daily maintenance pass removes bounded terminal rows no earlier than seven days after the later of the original admission deadline and terminal job time. Confirm that this boundary covers the planned rollback window before release. After a row is removed, both worker entry points reject the stale attempt. Start another render by accepting a new job with a new attempt identifier.

Source assets live in owner-scoped R2 and the dispatch row contains the bounded request payload until terminal cleanup. Worker input, output and temporary files live in a private container directory. After success the worker removes the files and ComfyUI history. On interruption or failure it resets the local process and workspace or lets Modal recycle the container. Model weights remain on the private volume and in the idle process only while that container survives. The provider result is used to save a durable object to R2 and metadata to Supabase. Use the saved Library object and its account lifecycle as the durable record. Record the provider result and log retention settings in the hosted evidence and keep reference images and masks out of evidence artifacts.
