# Modal direct-production cutover

**Status:** Direction approved by the project owner on 2026-11-20. Hosted execution is not approved. This runbook becomes executable only after it merges to protected `main` and the project owner separately approves both scopes defined under [Approval boundary](#approval-boundary).

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
| Replacement application and Modal source | `e47d3ae7e1928b563cec5adb14678cb712c3beaf` |
| Recovery application and combined Modal source | `4f8efb7f52e7c43f5425c7a4aa3375f2292992cb` |
| Modal workspace | `faresmohamed260` / `ac-88wJ5dCXYBOywnXXaGmUoV` |
| Modal environment | existing `main`; no new environment |
| Existing gateway | `renderlab-generation-gateway`, app `ap-FUgK7pAXIWZn37TF7KBq9n`, recorded current version `v1` |
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

Create two separate modern Supabase API keys and store each only in its matching Modal secret:

| Key | Postgres role | Allowed RPC execution | Explicitly forbidden |
| --- | --- | --- | --- |
| Dispatcher | `renderlab_modal_dispatcher` | `renderlab_claim_generation_dispatch`, `renderlab_finish_generation_dispatch`, `renderlab_lookup_generation_attempt` | attempt admission, job acceptance, cleanup, direct table access, browser use, service-role privileges |
| Image worker | `renderlab_modal_worker` | `renderlab_begin_generation_attempt` | claim/finish/lookup, job acceptance, cleanup, direct table access, browser use, service-role privileges |

The keys are sent only as Supabase `apikey` headers. Neither Modal secret receives the Supabase service-role key. The existing Vercel server retains its already-authorized service-role access for application-owned acceptance, cancellation, persistence, and cleanup RPCs. Verify the effective grants after migration and before storing either key.

## Pre-outage gates

All gates are fail-closed. Do not stop or deploy anything unless every gate passes on the execution date.

1. Confirm protected-main CI remains successful for replacement source `e47d3ae7e1928b563cec5adb14678cb712c3beaf`.
2. Confirm the production domain still serves recorded deployment `dpl_Dk8idC6n7SuQ7aUQhUQ1a8ygu6KH` at recovery source `4f8efb7f52e7c43f5425c7a4aa3375f2292992cb`.
3. Confirm Modal token identity is workspace `faresmohamed260` / `ac-88wJ5dCXYBOywnXXaGmUoV`, environment `main`.
4. Confirm `renderlab-generation-gateway` has zero Modal tasks and capture its app ID/history.
5. Query Supabase and require zero `generation_jobs` in `queued`, `preparing`, `running`, `cancelling`, or `persisting`. If migration is already present, also require zero outbox rows in `pending`, `claimed`, `retry_wait`, or `unresolved`.
6. Capture the Library/database baseline and verify the model volume and gateway secret still exist without reading or logging secret values.
7. Validate the exact recovery checkout at `4f8efb7f52e7c43f5425c7a4aa3375f2292992cb` and the exact replacement checkout at `e47d3ae7e1928b563cec5adb14678cb712c3beaf`; both must be pristine.
8. Arm both recovery methods before outage: Modal rollback to captured combined-gateway version when history remains available, and source redeployment from exact recovery SHA when it does not. Arm Vercel alias restoration to `dpl_Dk8idC6n7SuQ7aUQhUQ1a8ygu6KH`.

Any nonzero active work, identity mismatch, missing preserved resource, dirty checkout, or unavailable recovery source aborts the operation without forced cancellation.

## Planned-outage execution

1. Declare the outage window and repeat the zero-in-flight/database and zero-task checks.
2. Stop `renderlab-generation-gateway` in Modal `main`. The outage begins here.
3. Apply migration `0030` transactionally to shared Supabase and verify the table, RLS, functions, role grants, and absence of browser execution. Run Supabase security advisors and compare new findings with the expected server-owned/RLS-without-policy posture.
4. Create the two scoped API keys and the two new Modal secrets. Preserve the existing gateway secret and volume.
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

If any replacement step fails before the production alias moves, leave or restore the current Vercel deployment, restore the combined gateway, stop `renderlab-image-generation`, and revoke/remove only the new scoped keys/secrets.

If the first replacement smoke, recovery drill, or final forward smoke fails:

1. stop the replacement gateway and image worker;
2. restore Vercel alias `dpl_Dk8idC6n7SuQ7aUQhUQ1a8ygu6KH`;
3. restore Modal combined gateway `v1` by rollback, or redeploy exact source `4f8efb7f52e7c43f5425c7a4aa3375f2292992cb` with the preserved gateway secret and model volume;
4. run the bounded recovery smoke and keep the outage open until rendering and Library reopen are verified;
5. stop and remove the failed image-worker deployment, disable its schedule path, revoke the two new scoped keys, and remove only the two new Modal secrets after evidence capture;
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

Authorizes the exact Supabase migration, scoped-key creation, Modal secret changes, planned outage, old-gateway stop, two `main` app deployments, one-minute dispatcher schedule, exact-source Vercel deployment, alias movements for the recovery drill and final cutover, failure recovery actions, retirement of the old running stack, and post-release documentation closure described here. It authorizes no additional environment, app, model, weight change, feature gate, credential, schema change, or destructive data cleanup.

### Scope G — bounded GPU verification

Authorizes only the three disposable four-step A10 renders and 15-A10-minute aggregate ceiling described above. It authorizes no ComfyUI-reuse qualification or other GPU experiment.

Do not begin the outage unless both Scope D and Scope G are explicitly approved for replacement source `e47d3ae7e1928b563cec5adb14678cb712c3beaf`.

## Closure

After successful cutover, update `docs/production/current.json` and every required current-production mirror, change Infrastructure from candidate to verified hosted state, record the applied migration and provider identities, and run Production Documentation Sync for the exact deployed application SHA. This exception expires when that repository closure merges. Any later hosted release returns to ADR-005's normal isolated-qualification rule unless a new owner-approved repository exception is merged first.
