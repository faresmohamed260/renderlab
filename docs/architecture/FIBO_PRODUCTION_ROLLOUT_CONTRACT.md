# FIBO Workspace — Production Implementation Contract

**Approved product direction:** 2026-11-18 (owner's FIBO-only workspace instruction and attached implementation plan).
**Execution:** IN PROGRESS — contract and WANDA design-reference work exist; production implementation/acceptance is not complete.
**Repository:** UNMERGED (production workspace implementation).
**Deployment:** NOT DEPLOYED. **Provider mutation:** NOT AUTHORIZED by this contract alone.
**Previous bounded model-selection contract:** historical record at `docs/history/contracts/FIBO_MODEL_ROLLOUT_CONTRACT_2026-11-18.md`; its FLUX-default/model-selector scope and exclusion of the Studio workspace are superseded.

## Goal and release boundary

Replace the normal authenticated `/create` with the preserved WANDA FIBO image/edit workspace over current protected `main`. Keep the existing app routing, account controls, durable media, Activity, Library, Viewer and global access model. Preserve the WANDA workspace's desktop/mobile geometry, stage, canvas, glass surfaces, animation and effects, input/keyboard/touch behavior, history and result handling rather than replacing them with a generic composer.

New generation is **FIBO 2.0 image generation and image editing only** through the retained `faresmohamed260` native FIBO gateway and graph. Do not restore FLUX, Qwen image, REDGraft LTX, new video/animation, or upscale. Historical video and media/job records remain readable, without making retired operations eligible for new requests or retry. FIBO's internal Qwen3-VL prompt/VGL assistant is an allowed worker-internal dependency, not a user-selectable model.

The owner intends every preserved image control to work in production. **A visual control does not count as implemented until a verified server/worker contract performs its claimed action.** Any technically unsupported control is an acceptance blocker, not permission to silently ignore it, fake it, re-route to another model, or call this phase complete.

## Verified starting state (2026-11-18)

- Protected `main` at `8c02102c6b94be61da04f963b74fac82948c80cb` already retires new non-FIBO creative requests. Its public request parser accepts prompt, up to four ordered FIBO inputs, FIBO ratios, seed, 1–8 steps and bounded negative-prompt text, while explicitly rejecting mask and VGL fields.
- `workers/fibo-studio/native_graph.py` and `native_gateway.py` use public ComfyUI nodes and a signed provider-call ID. Native `TextEncodeFibo2` can receive structured prompt text and four references, but `build_graph(mask=...)` explicitly rejects masks. The current gateway returns one PNG, not a durable multi-output batch.
- The existing RenderLab generation API, admission, ownership, cancellation, polling and R2/Supabase reconciliation already operate for eligible FIBO requests. This does **not** establish support for batched outputs, masks, distinct inspiration, generated VGL, or partial-batch persistence.
- WANDA development checkout `C:\rl-local` is `feature/fibo-create-port` at `09299d3b8aa7e03996a9b576e678752b9d5b25d3`; it contains the authored Create visual/interaction implementation and local preview/hosted-relay experiments. The branch is 164 commits ahead and 11 behind protected `main` at this checkpoint. Do not merge it wholesale. Unrelated WANDA working-tree changes must not be overwritten.
- The current production application/rollback identity in `docs/production/current.json` is an **historically verified manifest**, not live provider read-back for an eventual release. No production change is included in this contract.

## Current execution checkpoint — 2026-11-18

Phase A's bounded production contract merged through PR #422 at `1bcd92f3dc90be2c55d5fd942d23f81a95bff830`; normal implementation is now authorized within the contract, **not** a production/provider change. Phase B/C work is in progress. The first vertical slice adds bounded manual VGL JSON to RenderLab's public FIBO generation request, validates attached image references, persists VGL with the durable job, revalidates it for retry/recipe reconstruction, and forwards JSON to the existing native gateway's already-supported `TextEncodeFibo2` path. Its tests use a fake provider spawn and are not live model qualification. VGL-only jobs persist the supplied JSON in the mandatory nonblank prompt column while submitting an empty plain-text prompt plus VGL to the worker; no schema migration is required.

**Still not completed:** hosted signed-in manual VGL generation, generated VGL using FIBO's internal helper, masks, separate inspiration, multi-output durable batches, live cancellation/partial retries, complete workspace UI parity, staged smoke tests and release. Negative-prompt effectiveness remains unresolved at the existing guidance setting. Do not expose or mark these controls production-functional on the strength of request parsing or local mocks.

## Feature and contract inventory

| Surface/operation | Required production behavior |
| --- | --- |
| Workflow modes | Text-to-image and image editing through FIBO; input-dependent mode, no retired-model path |
| Ordered references | Four independently attachable, removable, replaceable and reorderable image slots; stable aliases/chips/mentions; all attached usable inputs reach the worker in order |
| Inspiration | Distinct text-to-image reference/inspiration role, owner-scoped asset lifecycle and defined mapping to worker input, not an ignored UI decoration |
| Image geometry | FIBO-supported presets, source geometry where valid, validated output size/limits across client, API and graph |
| Tuning | Validated seed/randomization, 1–8 steps, effective negative-prompt semantics, manual VGL JSON and generated VGL JSON; rejected invalid or retired fields |
| Masking | Image-edit-only mask, aligned to the selected first/source image, secure upload/validation and **model-influencing** masking; outside-mask preservation verified where promised |
| Batches | 1–4 requested outputs under one owner-scoped durable job with stable output-index identity, partial success, retry semantics, cancellation, recovery and ZIP download |
| Lifecycle | Atomic admission, immutable owner binding, queued/running/partial/completed/failed/cancelled truth, server-owned polling/reconciliation and results persisted before success |
| Session UI | Queue and active progress, history tiles, restoration, result viewer, compare/reuse, saved edits, downloads and keyboard/touch/reduced-motion fidelity |
| Safety | Same-origin mutation protection, media ownership, storage limits, response bounds, secrets server-only, provider IDs hidden from browser |

Implement the request/worker/persistence contracts before enabling their UI paths. Treat manual and generated VGL as different provenance paths; validate the JSON schema against the actual worker schema. No client-supplied provider URLs, gateway keys, output storage IDs or owner IDs.

## Critical technical gates

0. **Text-to-image production parity (not a model-selection blocker):** The owner confirms FIBO 2.0 Edit Turbo already performs source-free text-to-image generation in the running WANDA FIBO Studio. Retain that exact model for both generation and editing. The production task is to reproduce the proven WANDA text-to-image path through the reviewed native graph, authenticated gateway and durable RenderLab lifecycle. Compare the exact checkpoint, graph wiring, prompt handling, settings, and resulting image against the working WANDA path; qualify both source-free generation and editing end to end. Do not substitute FIBO Dev or another model merely because model documentation describes Edit Turbo as editing-focused.
1. **Negative prompt:** Bria's published FIBO Edit Turbo model instructions specify guidance 1 and state that `negative_prompt` has no effect. The native KSampler uses CFG 1. Merely transporting or persisting negative-prompt text is not functional support. Demonstrate effective, model-correct negative conditioning under the retained FIBO contract, or record this as an unresolved acceptance blocker. Do not quietly relabel a positive instruction as independent negative conditioning.
2. **Masks:** The checked-in native ComfyUI `TextEncodeFibo2` graph lacks a mask input. A reviewed public-node and/or original adaptation must prove that masks influence edit generation and that any outside-mask compositing matches the promised result. An overlay-only UI or post-generation crop is not sufficient. Do not copy the two provenance-unverified private WANDA Studio source files.
3. **VGL generation:** Reuse FIBO's internal Qwen3-VL helper only after validating exact supported checkpoint/code/license, input limits, prompt structure and injection boundaries. Manual JSON and generated JSON must produce real worker inputs.
4. **Batch persistence:** Demonstrate crash-safe state for each of up to four output slots, idempotent finalization, partial-failure retries, correct cancellation claims and clean zero/one/multiple-result ZIP assembly. Do not equate four independent browser submissions with one durable production job.
5. **Noncommercial use/provenance:** Preserve Bria attribution and weight notices and the owner-approved invite-only noncommercial boundary. Verify provenance/hosted-use rights for any imported UI asset/source and exact public third-party implementation before use. Avoid private adapter/worker source without a verified grant.

## Ordered execution and acceptance

### Phase A — authoritative contract and verified dependency inventory
Merge this contract and replace the provisional WANDA-only UI plan with an explicit production scope. Audit exact worker/ComfyUI node schemas, runtime dependencies, licensing and current API/schema/job lifecycle. Record unresolved technical gates without inventing support. **The contract must merge before implementation begins**, per `AGENTS.md`.

### Phase B — native worker and gateway
Implement and locally test graph/gateway acceptance of all applicable FIBO inputs, masks, VGL, dimensions and batch execution; verify image-byte, dimension, JSON, reference order and resource limits. Preserve signed call IDs, proxy authentication, no redirect-following, single-primary dispatch rules and cancellation. Run isolated GPU qualification against the exact candidate only after separately authorized provider usage.

### Phase C — RenderLab domain/API/persistence
Add explicit capabilities and strict request parser shape, owner validation, image-role handling, worker mapping and durable per-slot job/media result state. Reconcile partial success, failure, retry, cancellation and source reuse after reload without browser-session dependence. Keep retired request routes rejected and historical rows readable. Schema changes, if needed, must follow existing shared-resource migration governance and explicit authorization for applying them.

### Phase D — production Create presentation
Selectively port the authored WANDA FIBO workspace components onto current `main`, preserving its tested visual/motion/interaction inventory. Make it the normal `/create`, remove preview-only shell/route/relay and environment variants **only when** the replacement is equivalent and backed by the production contract. Preserve existing authentication, layout and unrelated routes. Make each control's enabled state capability-derived; an unavailable required control blocks closure rather than disappearing unnoticed.

### Phase E — exact-head validation
Cover valid and invalid 1–4 output requests, all four ordered inputs, inspiration, masks, manual/generated VGL, geometry, 1–8 steps, seed, negative prompt, cancellation, partial results, retry, ownership, persistence and retired-video rejection. Add authenticated browser lifecycle tests (including refreshing mid-job), history/reuse, ZIP and saved-edit restoration; verify 390px and desktop, keyboard, touch, reduced motion, focus, no horizontal overflow and screenshot/motion fidelity. Run typecheck, lint, build, unit/API, UI-purity, documentation governance, relevant lifecycle workflows, FIBO gateway integration and **all protected-main required exact-head checks**.

### Phase F — separately authorized release
After implementation and required verification, obtain fresh provider read-back for the gateway, current Vercel production identity, secrets, ownership and rollback anchor. A staged release, worker deployment, secrets change, spend, database migration or alias cutover **is not authorized merely by this plan**; require applicable Project Owner/provider approvals under `GOVERNANCE.md`. Smoke test the staged app and then obtain explicit production cutover approval. Reconcile `docs/production/current.json` and all prescribed status/UI/infrastructure mirrors and run Production Documentation Sync.

## Stop conditions and state accounting

- Stop the affected capability at a real source/contract/license/provider blocker. Preserve working FIBO-only routes and report exact missing capability, tests and decision needed; never claim it is supported just because UI exists.
- Neither a green local build, a simulated browser fixture, a submitted PR, an approved plan nor a deployed candidate gateway counts as a production release.
- Keep `docs/ui/UI_MIGRATION.md`, `docs/ui/UI_DECISIONS.md`, `docs/ui/SCREEN_REGISTRY.md`, `docs/architecture/PRODUCT_CAPABILITIES.md` and `docs/architecture/INFRASTRUCTURE.md` in sync as implementation facts become verified. Preserve completion evidence under `docs/audits/**` or `docs/history/**`, not in mandatory current-state trackers.

## References

- Owner-supplied 2026-11-18 plan, *Bring the FIBO Workspace to Production Create*.
- Bria FIBO 2.0 Edit Turbo model notes: https://huggingface.co/briaai/Fibo-2.0-edit-turbo/blob/main/README.md
- Official ComfyUI FIBO `TextEncodeFibo2` node: https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_extras/nodes_fibo2.py
- Public ComfyUI FIBO template retained in `workers/fibo-studio/COMFY_TEMPLATE_LICENSE.txt`.
