# Modal direct-production cutover

**Status:** The combined recovery gateway is live after a pre-alias rollback. The split Modal apps published successfully. The workflow source pin and Vercel deployment metadata must be verified before another outage.

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
| Replacement application and Modal source | `bb0bca8e41ea118c94d2fc4cdda49baf8194e4ba`; supersedes `68651d2d1e3c5602c2f840a0d066a0f6185a5cf2` |
| Recovery application and combined Modal source | `4f8efb7f52e7c43f5425c7a4aa3375f2292992cb` |
| Modal workspace | `faresmohamed260` / `ac-88wJ5dCXYBOywnXXaGmUoV` |
| Modal environment | existing `main`; no new environment |
| Existing gateway at retry preflight | `renderlab-generation-gateway`, app `ap-iiL2RGqh6N96YKknO4zCo4`, version `v1` |
| Replacement worker | `renderlab-image-generation` |
| Preserved model volume | existing `renderlab-fibo-models` in `main` |
| Preserved gateway secret | existing `renderlab-fibo-native-gateway` in `main` |
| New dispatcher secret | `renderlab-generation-dispatcher` in `main` |
| New worker secret | `renderlab-generation-worker` in `main` |
| Shared database | Supabase project `rashyleshocuvpgcooxy`, migration `0030_modal_generation_dispatch_outbox.sql` |
| Current Vercel recovery deployment | `dpl_Dk8idC6n7SuQ7aUQhUQ1a8ygu6KH`, source `4f8efb7f52e7c43f5425c7a4aa3375f2292992cb` |
| Production domain | `https://renderlab.faresuniform.uk` |

The three inactive video/image-tools/video-tools shells are not deployed in this cutover. ComfyUI continues to start and stop per render. Container-level ComfyUI reuse is explicitly outside this operation so the worker split is tested independently.

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

## Closure

After successful cutover, update `docs/production/current.json` and every required current-production mirror, change Infrastructure from candidate to verified hosted state, record the applied migration and provider identities, and run Production Documentation Sync for the exact deployed application SHA. This exception expires when that repository closure merges. Any later hosted release returns to ADR-005's normal isolated-qualification rule unless a new owner-approved repository exception is merged first.
