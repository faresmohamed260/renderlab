# Product Capabilities & Domain Baseline

This document records the capability baseline that informs RenderLab. It distinguishes audited Saga reference behavior, currently verified RenderLab capability, and future extensibility categories.

## Authority and Scope
- `renderlab` is the product source of truth.
- Saga is a reference implementation, not the RenderLab specification.
- Items labeled **Verified in Saga** are supported by the audited Saga repository.
- Items labeled **Verified in RenderLab** are implemented/verified in the current repository.
- Items labeled **Extensibility category** are architecture pressure-tests, not feature commitments.

## Verified Saga Generation Capabilities
Saga's audited workflow registry contains five workflow IDs across three worker ecosystems.

### FLUX.2 Klein 9B ecosystem
- Image generation.
- Image edit.
- Multi-reference image edit.
- Automatic output sizing.
- PNG output.
- Execution controls include negative prompt, seed, steps, CFG and megapixel target.

### Qwen Image Edit 2511 ecosystem
- Image generation.
- Image edit.
- Multi-reference image edit.
- Automatic output sizing.
- PNG output.
- Execution controls include negative prompt, seed, fixed four-step execution, CFG and megapixel target.

### REDGraft LTX 2.5 ecosystem
- Text-to-video.
- Image-to-video using an optional first-frame/reference image.
- MP4 output.
- Resolution choices: 480p, 720p, 1080p and 2K.
- Duration range: 5–30 seconds.
- Frame rates: 24, 25 and 30 fps.
- Audio generation on/off.
- Multiple aspect ratios.
- Reference aspect support.
- Execution controls include negative prompt, seed, steps, CFG, resolution, duration, audio, aspect ratio and frame rate.

## Verified Saga Input, Job and Media Behavior
- PNG, JPEG and WebP references up to 25 MB.
- Temporary sources and durable media are distinct concepts.
- Generation is asynchronous and represented by persistent jobs.
- Real worker lifecycle state is exposed rather than synthetic percentage progress.
- Primary/standby workers and failover exist.
- Completed images/videos are persisted to R2 plus structured records in Supabase.
- Existing media can continue into later actions such as edit or animate.
- Library/gallery behavior supports durable media organization and reuse.

## Proven Behaviors Carried Forward
1. **Asynchronous jobs are first-class objects.**
2. **Persist before declaring completion.** Provider completion alone is not product completion.
3. **Reusable input assets.** References/results can become later generation inputs.
4. **Capability-aware inputs.** Input roles/requirements depend on operation/workflow compatibility.
5. **Real execution state.** Avoid fake percentage progress.
6. **Worker resilience stays behind product UX.**
7. **Output continuation is a core product concept.**
8. **Durable media needs organization/reuse surfaces.**
9. **Defaults and limits belong to capability/backend contracts, not arbitrary UI literals.**

## Saga Constraints Not to Encode as RenderLab Architecture
- Saga's five workflow IDs are not RenderLab's permanent capability boundary.
- Saga routes/screens are not the required RenderLab IA.
- Model/provider/ecosystem naming is infrastructure metadata, not primary product navigation.
- A worker/node parameter does not automatically deserve a UI control.
- Workflow-specific request parsing is evidence for validation, not a reason to render a generic ComfyUI form.

## RenderLab Capability Domain Model
RenderLab separates **what the user wants to do** from **how execution is routed**.

### Creative Operation
A user-understandable goal such as create image, edit image, create video, animate image, upscale, restore, or another approved operation.

### Workflow Definition
A registered executable capability able to declare:
- stable workflow/version identity;
- supported creative operations;
- output media kind;
- compatible model/ecosystem;
- input slots/constraints;
- parameter definitions, defaults, limits and visibility tiers;
- output definitions;
- supported continuation actions;
- capability/compatibility flags.

### Input Slot
Typed input requirements can describe:
- media type;
- required/optional;
- min/max count;
- accepted formats/size;
- semantic role such as primary image, reference, first frame, mask;
- whether temporary or durable media can satisfy the slot.

### Parameter Definition
Controls are classified as:
- **Essential** — needed for the ordinary task;
- **Contextual** — relevant because of current operation/input;
- **Advanced** — deliberate technical/reproducibility tuning;
- **Internal** — execution/infrastructure values never normally surfaced.

### Generation Request
Normalized product request containing prompt, output intent, opaque inputs and curated parameter values.

### Generation Job
Persistent asynchronous execution identity containing lifecycle, resolved execution metadata, runtime state, failures/failover provenance and output asset IDs.

### Media Asset
Durable product media identity with kind/MIME, storage metadata, preview data, generation provenance and compatible continuation actions.

### Continuation Action
An action that uses a durable media asset/configuration as the starting point for another creative operation. Continuations are capability-derived rather than hard-coded independently into each media component.

## Verified RenderLab Initial Capability Set
### Creative operations
The initial Create workspace supports and live-verifies:
- **Create Image** → FLUX.2 Klein generation;
- **Edit Image** → FLUX.2 Klein edit with image input;
- **Create Video** → REDGraft LTX 2.5 text-to-video;
- **Animate Image** → REDGraft LTX 2.5 image-to-video.

All four operations have native live-infrastructure verification. Qwen remains an audited available ecosystem but is not the default initial product workflow.

### Input identities
Current generation inputs remain opaque product identities:
- `{ type: "media-asset", id }` for durable user uploads and durable RenderLab results;
- `{ type: "temporary-source", id }` remains accepted for internal compatibility/staging but is no longer the user-facing identity for newly uploaded Create references.

The browser never submits R2 keys. Phase 7A PR #46 extracted one persistent browser upload transaction shared by Create and Library; feature-specific picker/drop behavior remains feature-owned.

### Current supported reference upload behavior
- PNG, JPEG, WebP;
- ≤25 MB;
- signed direct-R2 upload;
- server HEAD verification before promotion;
- authenticated owner-scoped `media_upload_sessions` → durable `media_assets`;
- persisted dimensions plus ordinary Library/Viewer/search/organization semantics immediately after successful completion, independent of whether a generation is ever submitted.

Configured Create Durable Upload run `33256497167` verified that a Create upload persisted with `generation_job_id = null`, appeared in Library, and was subsequently referenced by the generation request as the same owner-scoped `{ type: "media-asset", id }`; exact R2/database/Auth cleanup passed.

### Initial default/contextual values
- Image/Video is the explicit main output choice.
- Curated fixed Image aspect ratios: `1:1`, `4:5`, `3:4`, `2:3`, `9:16`, `5:4`, `4:3`, `3:2`, `16:10`, `16:9`, `21:9`.
- Curated fixed Video aspect ratios: `1:1`, `4:5`, `3:4`, `2:3`, `9:16`, `5:4`, `4:3`, `3:2`, `16:10`, `16:9`, `21:9`.
- Source-backed Edit Image and Animate Image additionally support `Original`; requests without a source cannot select `Original`.
- Video durations: 5, 10, 15, 20, 30 seconds.
- Video audio generation: explicit on/off, default ON, carried as `output.audioEnabled`.
- A compatible image input resolves Image → Edit and Video → Animate.

### Phase 7A source-aware geometry — Verified in RenderLab
- `Original` is persisted normalized product intent rather than being rewritten into an arbitrary preset ratio.
- FLUX output geometry follows its first image input. Create Image therefore supplies a server-created neutral execution canvas at the selected fixed ratio; no user-visible reference is fabricated.
- Edit Image + `Original` sends the owner-scoped source image unchanged to FLUX. Explicit Edit ratios center-crop and high-quality resize only an execution-time derivative of the primary image; the durable Library asset and any additional references are not modified.
- Animate Image + `Original` derives the display-oriented source W:H and submits that ratio to REDGraft when it falls within the verified 0.4–2.5 runtime range. Explicit Animate ratios continue using REDGraft's verified worker-side center-crop behavior.
- Exact implementation head `789358e8a276ab54d8eeae7e4b7dcb64c2c4c60f` live-verified Create Image 16:9 → Edit Original 16:9 → Edit override 4:5 in `33258831654`, and Create Video 16:9 → Animate Original from a 128×64 / 2:1 source in `33258831636`. Final same-head retriggered Generation `33259410952` and Video Generation `33259411008` also passed. PR #47 merged as `de50efe6ba462ec604ea2cace741e11904a62425`.

### Phase 7A reference addressing — Verified in RenderLab
- PR #51 merged stable product aliases `@image1`, `@image2`, … as structured `GenerationInput.alias` values alongside opaque source identity and semantic role. Aliases are unique within a request and persist in normalized generation intent.
- Prompt parsing detects `@imageN` mentions and blocks unresolved aliases both in Create and at the server request boundary. Alias text itself is never authorization.
- Native execution translates each alias to the current worker input position immediately before submission, so prompt addressing is deterministic even when array order differs from alias numbering. Continuation allocates a new alias rather than retargeting an older prompt mention; replace/remove semantics preserve the existing alias identity until explicitly removed.
- Durable media inputs are reloaded by authenticated owner and must be active image media before either native or authenticated external generation is attempted.
- Exact head `c8fbe9d733eb9b983b209da995b2f9865808f66a` passed nine affected gates and responsive reference-menu review before PR #51 merged as `7afe257b069e74d322d8f83c1a0868a30acd3686`.

### Phase 7B contextual model evidence and v0.1 boundary
- FLUX semantic-output audit `33263044354` ran on merged product SHA `7afe257b069e74d322d8f83c1a0868a30acd3686` with run-owned synthetic adult portraits. Human review found the outfit-only edit preserved recognizable appearance strongly while changing clothing, and the two-person case visibly represented both intended people with `@image1` on the requested left and `@image2` on the requested right despite deliberately reversed physical request ordering. Exact Auth/Supabase/R2 fixtures were cleaned after artifact capture.
- Qwen gateway audit `33263338596` verified `ready=true`, `multiple_references=true`, async `/jobs/edit` and repeated multipart `image_files`. Qwen semantic run `33263401453` completed the same bounded outfit/two-person cases, but human review found noticeably more facial/stylistic drift than FLUX while still following the broad edit/composition instruction.
- Accepted v0.1 boundary under UI-046: Image may use at most **2** image references; Video remains at most **1** image input. With two Image inputs, slot 1 is `primary-image` and slot 2 is `reference`. Stable aliases remain attached to media identity when order changes.
- FLUX remains the internal v0.1 Image/Edit route. Qwen remains verified/available internally but is not selected or exposed as a product model choice. This is an evidence-based routing choice, not a claim that FLUX will obey every semantic relation deterministically.
- PR #53 completed user-facing second-reference exposure and authoritative count/role/media/ownership enforcement. Image supports at most two attached image inputs; Video remains at most one. Create supports second durable upload, replacement without alias churn, explicit `Make primary` reordering, multi-item mention selection, and blocks a two-reference switch to Video instead of discarding an input.
- Polished product commit `360fa79ea85dd09ce90101518fedaca5645aaa71` and exact validation retrigger head `acf3f8e792c2b895a9999cca24060a1c33484463` are tree-identical. The exact head passed all nine affected PR gates; configured Create Lifecycle `33266025789` exercised the durable two-reference interaction/submit contract and exact cleanup. PR #53 merged as `0286b18802fc3d766d9d09e2ba8ed9a494eabd08`.
- Responsive review confirmed the two-reference composition remains readable on narrow layouts after the action cluster was allowed to wrap; desktop remains compact. No model selector, schema, route or infrastructure contract was added.

### Phase 7C live REDGraft contract audit
Live audit `33266905978` is authoritative for the currently deployed REDGraft boundary. Both configured gateways expose the same `/jobs/video` multipart fields: required `prompt`; optional `negative_prompt`, `seed`, `resolution`, `duration_seconds`, `audio_enabled`, `aspect_ratio`, `frame_rate`, and one optional `image_file`. No structured storyboard/frame/scene/action/dialogue/speech/sound/audio-prompt/camera/shot fields are deployed. Primary runtime health is ready on NVIDIA A10 with enabled 480p/720p/1080p/2K and 24/25/30 fps.

UI-047 therefore closes Phase 7C as **audit-complete / Director deferred**. The current Video/Animate surface remains one shared prompt plus at most one first-frame image and ordinary Video settings. RenderLab must not present separate Director fields as if they map to distinct worker semantics. A future Director slice requires fresh deployed-worker evidence; upstream LTX capabilities and Saga reference code alone are insufficient.

The same audit found a product-contract drift: live `/jobs/video` does not expose `steps` or `cfg`, even though current RenderLab still serializes Video `steps`/`guidance`. A no-generation probe sent deliberately invalid `steps=999` / `cfg=999` alongside invalid duration and the live endpoint proceeded to duration validation, confirming the extra tuning fields are not active live controls. Phase 7D must reconcile this before claiming Video steps/guidance are effective.

### Phase 7D Video resolution — Verified in RenderLab
UI-048 is implemented and exact-head/live verified. Video and Animate now expose a truthful delivery-resolution product contract without exposing disabled or worker-internal tuning.

- User-facing Video resolution values are exactly `480p`, `720p`, `1080p`, `2K`; `480p` is the default and disabled `4K` is hidden/rejected.
- Product language is **Resolution**, not Quality. No cost, ETA or perceptual-quality tier is inferred from the setting.
- Video-only `output.resolution` is server validated. Omission at the public request boundary normalizes to `480p` before persistence/orchestration; canonical persisted Video intent therefore has an explicit resolution. Image requests reject the field.
- Resolution composes with the 11 curated fixed Video ratios, 5/10/15/20/30-second durations, 24/25/30 fps, Audio and source-backed Animate `Original`. `Original` retains source-derived W:H independently of delivery resolution.
- Video Steps/Guidance are no longer product controls: new Video requests reject `advanced.steps` / `advanced.guidance`, and native REDGraft multipart no longer sends `steps` / `cfg`. Image Steps/Guidance remain unchanged.
- The existing `generation_jobs.parameters.output` JSON persists the normalized resolution; no database migration or new durable table was added. Historical jobs are not rewritten. Future Retry must revalidate current capability, normalize a legacy missing Video resolution to 480p and not replay legacy inactive Video tuning.
- Exact implementation code/test head `594ad7eb39a9d5eec1d2f0283ac6e327f86129b3` passed the 1,320-combination fixed product matrix and all nine affected PR workflows: UI Shell `33270777087`, Account Ownership `33270777089`, Media Delete `33270777092`, Activity `33270777133`, Create Durable Upload `33270777088`, Library Lifecycle `33270777082`, Generation Integration `33270777083`, Create Lifecycle `33270777086`, and Video Generation Integration `33270777081`.
- The exact live matrix produced: 480p 16:9 → `854×480`; matched 1080p 16:9 → `1920×1080`; 720p 9:16 with Audio → `720×1280`; and 2K Animate `Original` from a 2:1 source → `2304×1152`. Duration/fps/audio/persisted owner/product state also matched each request. Observed timings are samples, not SLAs.
- Contextual review accepted the matched 480p/1080p outputs as usable; the portrait city-scene result was coherent with its prompt; and the 2K Animate output preserved visible influence and 2:1 geometry from its run-owned solid-blue source. Model obedience is probabilistic; RenderLab guarantees correct mapping/validation rather than deterministic creative output.
- Configured fixtures were exactly cleaned, including the earlier diagnostic run. No route, model/provider selector, Director UI, schema or deployment change was introduced.

### Phase 9 Retry — Verified in RenderLab
- Retry is a product-level recovery operation for `failed` jobs only in v0.1. It creates a new job from current-revalidated persisted product intent; it is not a provider-job replay or mutation of the historical job.
- Authoritative reconstruction fields are `prompt`, `output_kind`, `inputs`, `parameters.output` and `parameters.advanced`. Historical workflow/model/ecosystem/worker/provider/failover/error/output metadata is ignored for new routing.
- Current `parseGenerationRequest` remains authoritative. Missing input aliases may receive positional aliases for compatibility. Legacy Video retries discard inactive `steps`/`guidance`; missing Video resolution normalizes to current default `480p`. No other invalid historical value is silently migrated.
- Current input ownership/readiness/activity is revalidated. Tombstoned/missing/foreign durable media and missing/not-ready temporary sources cannot be retried.
- A retry may route through current internal workflow/model implementation and does not promise bit-identical reproduction even when persisted seed/prompt remain valid.
- Current cancellation capability is **not** a product capability: although configured gateways report cancellation support, RenderLab's native reassignment/persistence path lacks cancellation-aware atomic guards, so Cancel remains deferred.
- UI-050 is implemented at exact code/test head `ab33e146ccaa7770f3dd66146708f01933cc0173`. `POST /api/generation/jobs/[jobId]/retry` accepts only historical job identity plus verified owner context; the browser never resends the stored generation payload.
- Configured Activity `33279062575` verified failed-only status gating, two-account privacy, immutable historical rows, distinct attempts, current request/input validation, positional alias compatibility, legacy Video missing resolution -> `480p`, discarded legacy Video Steps/Guidance, source readiness, provider/execution metadata isolation and sanitized backend failures against an authenticated run-local mock backend with no generation spend.
- The exact head also passed Account Ownership `33279062570`, Media Delete `33279062563`, Create Lifecycle `33279062581`, Generation Integration `33279062568`, and Video Generation Integration `33279062569`. Final Activity artifact `9722428767` (`sha256:65490c380fe35d5b6a186596cafa1d0706d181c6c827748aaaf8a9dc99e8dcbe`) was visually reviewed clean after fixing narrow success-feedback wrapping. Exact fixtures and cleanup-only verification passed.
- Retry introduces no schema migration, new workflow/model selector, provider/admin surface, shell-global polling or deployment. It does not promise bit-identical reproduction; it guarantees current validation/routing of supported persisted product intent.
- No schema migration or retry lineage relation is planned for v0.1.

### Advanced product controls
Capability metadata is centralized in `src/lib/capabilities/generation.ts`, and the verified surface is output-specific:
- Image: negative prompt, seed, Steps and Guidance.
- Video: negative prompt, seed and Frame rate. Audio remains a contextual Video setting in the compact Video settings menu; Steps/Guidance are rejected and are not forwarded as native REDGraft fields.

Advanced remains collapsed by default. A worker/source parameter is not sufficient reason to expose a control; the deployed contract and verified behavior govern product truth.

### Verified continuation actions
Persisted image results currently expose:
- **Edit** → rebind result as `media-asset` / `primary-image`;
- **Animate** → rebind result as `media-asset` / `first-frame`.

Run `33027460976` live-verified `Create Image → persisted media asset → Edit Image` and cleaned both fixtures.

### Verified job/runtime behavior
- asynchronous `generation_jobs`;
- queued/preparing/running/cancelling/persisting/succeeded/failed/cancelled product states;
- success only after R2 + `media_assets` persistence;
- bounded client retry/backoff for transient status/network errors;
- primary/standby submission routing;
- conservative poll-time reassignment only on explicit safe evidence;
- no automatic poll-time resubmission for generic 429/5xx/network ambiguity.

## Cycle 2 Phase 6 Capability Audit — 2026-08-29

Phase 6 re-audited current RenderLab code plus the configured deployed worker paths. Audit run `33250031468` is the live evidence source; Saga worker source remains implementation-reference evidence only.

### Multi-reference image edit
- RenderLab's normalized request already models `inputs` as an array, and native image submission forwards every resolved source as repeated `image_files` in request order. Temporary `generation_sources` and durable `media_assets` can both be resolved to server-side bytes without exposing R2 keys.
- At the Phase 6 audit baseline, the approved Create UI still submitted at most one reference and the request parser did not yet enforce media-kind compatibility, per-role multiplicity or a product maximum. UI-046 / PR #53 later implemented those product constraints; this bullet is retained only as historical audit evidence.
- The current deployed FLUX gateway reports `multiple_references=true`; a bounded two-reference live probe was accepted with `reference_count=2` and returned PNG successfully in about 12.6 seconds total.
- Audited worker runtime dynamically creates additional reference-conditioning nodes for every image after the first and has no explicit reference-count ceiling. The first image controls normalized output dimensions; later images are auxiliary conditioning references. Worker permissiveness is **not** a product maximum: Phase 7 must choose and document a deliberate bounded user-facing count.
- Existing per-file reference limits remain image MIME types and at most 25 MB per input at the worker boundary. Phase 7B preserves the simpler one-reference path and PR #53 validates temporary/durable input image availability and owner-scoped media compatibility server-side.

### Video resolution
- RenderLab's current normalized product request has no resolution field. Native REDGraft submission is currently fixed to `480p`; that is the actual current product behavior even though the deployed runtime supports more.
- Live REDGraft runtime health reports enabled resolutions `480p`, `720p`, `1080p` and `2K`, with frame rates 24/25/30. `4K` appears in internal resolution metadata but is **not enabled** and must not be surfaced as supported product capability.
- A bounded live `720p`, `16:9`, 5-second, 24-fps, audio-off request completed successfully and produced a verified `1280×720` MP4. Higher enabled modes were not exhaustively generated because Phase 6 intentionally avoids an expensive benchmark when live runtime capability evidence is sufficient.
- Resolution interacts with aspect ratio through final delivery dimensions rather than exposing the runtime's internal base preset geometry directly. Duration remains 5–30 seconds, audio remains on/off and frame rate remains 24/25/30 under the existing worker contract.

### Operational evidence for product defaults
- Production-domain samples from the same run: Create Image + durable Edit 91s total; Create Video + Animate 155s total; direct two-reference FLUX 12.6s; direct 720p 5-second Video 62.7s. These are bounded audit samples and are not latency SLAs or percentile measurements.
- The current product has no per-user generation rate/concurrency/abuse limiter at the generation route. Worker source serializes each container invocation; exact deployment-wide autoscaling/capacity is not exposed by current health APIs.
- Provider per-generation cost/credit consumption is not reliably observable through the current product/worker health contracts. Phase 7 must not invent cost labels or promises from unavailable data; Phase 10 must account for capacity/abuse controls if access broadens.

## Accepted Cycle 2 Create v2 Direction — implementation in progress
The following items are accepted product direction from closed-beta feedback; implemented items are marked by their merged evidence while later Phase 7 slices remain pending:
- reference-backed Edit/Animate should default to source-aware `Original` geometry with explicit supported-ratio override;
- aspect-ratio choices should expand only from verified worker/capability behavior;
- user uploads initiated from Create now promote to durable owner-scoped `media_assets` after verification and remain in Library even if no generation is submitted; configured run `33256497167` verifies this Phase 7A foundation;
- stable `@imageN` alias/order/role persistence and prompt-level reference addressing are implemented through PR #51; UI-046's bounded two-reference Image / one-reference Video slot contract is implemented and verified through PR #53;
- FLUX/Qwen bounded contextual audits are complete (`33263044354`, `33263338596`, `33263401453`); FLUX is selected for v0.1 because it preserved the tested synthetic identities more strongly, while product guarantees remain limited to deterministic mapping rather than probabilistic model obedience;
- reported LTX/REDGraft Director/frame/dialogue/sound controls require a fresh audit of the configured workflow before they can become a curated Director product mode;
- Video quality may expose verified 480p/720p/1080p/2K through a deliberate contextual product control; 4K remains unsupported/hidden;
- capability growth must not crowd the default composer: task controls stay contextual and technical controls stay Advanced/internal.

## Extensibility Categories
These must remain representable if/when production workflows are introduced, but are **not current feature commitments**:
- inpainting/outpainting and mask-based editing;
- pose/depth/edge/structural conditioning;
- style/identity/reference adapters;
- LoRA/model adapters;
- upscaling/restoration;
- multi-stage generation/post-processing;
- additional image/video/audio input roles;
- multiple outputs/variations;
- workflow chaining/branching;
- reusable presets;
- expert workflow inspection/control as a deliberately separate experience if ever justified.

## Accepted post-Cycle-2 direction — LoRA/model adapters
User-selectable LoRA support is now an accepted future product direction rather than only an abstract pressure-test. It is **not a Cycle 2 implementation commitment**. A later phase/cycle must verify and define:
- Civitai/Hugging Face or other approved source discovery/import contracts;
- durable LoRA identity, source/version/hash/license metadata and compatibility with base model/workflow;
- safe download/file handling plus worker cache/storage/eviction behavior;
- admin approval/policy and any content/safety constraints;
- generation selection UX and strength range/defaults;
- whether multiple LoRAs can compose and how ordering/combined strength is represented;
- reproducible persisted generation intent without exposing raw worker filesystem paths.

The current capability/request model should remain extensible enough to attach optional model adapters later, but ordinary users must not see fake LoRA controls before this subsystem exists.

## Progressive Disclosure Boundary
### Default
Prompt, necessary reference media, understandable output choices and Generate.

### Contextual
Controls that matter because of the current task, such as video duration/aspect or attached-reference context.

### Advanced
Technical/reproducibility controls intentionally requested by the user, currently negative prompt, seed, steps, guidance and video frame rate.

### Internal
Provider routing, worker selection, ecosystem IDs, R2 keys, ComfyUI node/graph identifiers and failover bookkeeping.

## Architecture Invariants
1. A new backend workflow does not create a new top-level screen by default.
2. A new worker parameter does not automatically create a default/Advanced control.
3. User-facing creative operations and backend workflow IDs remain separate concepts.
4. Durable media assets are reusable inputs to compatible operations.
5. Constraints are validated server-side even when the UI also validates them.
6. Provider/infrastructure details remain replaceable behind stable product contracts.
7. Purpose-built UX is allowed even though the internal capability model is extensible.
8. Unsurfaced capabilities may exist in architecture without being advertised prematurely.

## Current Capability Work
The initial Create capability set is implemented and approved: Create Image, Edit Image, Create Video and Animate Image all have live configured coverage, durable continuation is established, and UI-035 adds account-private Activity over persisted `generation_jobs`. PR #37 / UI-036 additionally makes REDGraft video audio an explicit verified user choice: Video defaults audio ON, `output.audioEnabled` is validated/persisted, and native submission maps it to `audio_enabled`.

The Phase 5 capability-surface audit found no current user goal that justifies dedicated Models or Workflows screens. Qwen and registered workflow/model/ecosystem identities remain execution choices behind the capability boundary, while all currently approved creative operations are already reachable through Create/Viewer. Likewise, none of the extensibility categories above is a current product commitment, so there is no additional capability-specific screen to implement now. Future capability work must start from a verified user need and an explicit product slice rather than pre-populating navigation or controls from backend possibilities.

Phases 6–9 are complete and verified under the Closed Beta boundary. Phase 10 Account, Admin & Closed-Beta Operations is in progress under UI-051: 10A recovery/admission, 10B privileged admin/access control and 10C atomic generation admission are implemented and exact-head verified; 10D Auth/Operational Hardening remains unimplemented. Verified current Create, Library, Activity and Admin behavior below is authoritative.

### Phase 10 Closed-Beta account/admin/guardrail capability — 10A–10C verified; 10D pending
- Supabase authentication and RenderLab product admission are distinct capabilities. A valid Supabase identity alone does not grant private RenderLab access after Phase 10; an active server-owned RenderLab access record does.
- Access roles are intentionally only `member` and `admin`; statuses only `active` and `suspended`. User-editable metadata is never authorization. Admin privilege is checked from current server-confirmed identity plus protected RenderLab state.
- Closed-Beta admission is invitation-gated by normalized email. The ordinary public Create-account affordance is removed. A pending RenderLab invitation may be claimed by the same verified email even when the underlying shared Supabase Auth identity already existed.
- The Admin product capability is RenderLab-scoped: admitted account/invitation management, active/suspended and member/admin controls, typed global/account generation guardrails and sanitized aggregate RenderLab job health. It is not a shared Supabase user directory or provider console.
- Generation defaults are exactly one active job/account and twelve admitted dispatches/account in a rolling 60-minute window. Optional account overrides are bounded to 1–4 active and 1–120/hour. A global/account generation-enabled switch can stop new submissions. Retry consumes the same guard as Create. These values are Closed-Beta operating limits, not billing/credits or throughput promises.
- Admission is transactional and occurs before any backend/provider network call. The user-facing request is still validated first so invalid requests do not consume admission. Same-owner concurrency/rate decisions must be serialized; a naive read-count-then-submit check is explicitly insufficient.
- Password recovery/change remains a Supabase Auth capability composed into RenderLab Settings using current SSR PKCE/token-hash conventions. Product feedback is sanitized/enumeration-safe; CI does not require actual email delivery because server-only Auth Admin generated links can exercise the flow.
- Leaked-password protection is not treated as implemented by app code. Current live Security Advisor still reports it disabled, and current Supabase docs make the control plan-dependent. Phase 10D must record/clear the setting when supported; otherwise broader-beta readiness remains blocked.
- Account deletion, billing/credits, MFA productization, public-beta access, provider administration and generic feature flags remain outside this contract.

**Phase 10C capability evidence (2026-08-30):** exact code/test head `ca8e426066385934b296b6d4f88324e9c12861f7` passed the complete 22-workflow affected matrix. Create and failed-job Retry now share transactional server-owned admission after current product/input validation and before backend/provider work. Effective policy is global typed defaults with nullable account overrides; defaults are generation enabled, one active job and twelve admitted dispatches per rolling 60 minutes, bounded to 1–4 active / 1–120 hourly. Immediate dispatch failure releases concurrency while preserving the admitted timestamp; terminal jobs release active capacity; unbound or missing-job reservations fail conservatively until bounded expiry. Stable product errors are `generation_access_denied`, `generation_disabled`, `generation_active_limit_reached`, and `generation_rate_limit_reached`. Generation Admission `33309162313` verified this with a run-local mock backend and zero provider spend. `20260830101734 renderlab_generation_admission` is applied/audited; production closed-beta enforcement remains off and 10D remains pending.

### Phase 14 Autonomous Generation Lifecycle — Verified in RenderLab
- Once a native generation is accepted and dispatched, backend lifecycle correctness no longer depends on the initiating tab polling the job. Browser polling remains a responsive read/refresh accelerator and enters the same claimed reconciliation path.
- `generation_jobs` remains the durable product history identity. Active jobs can be claimed by one short-lived server reconciliation lease at a time; expired claims can be safely reclaimed.
- Generated media has an explicit zero-based output slot. Current jobs use slot `0`; deterministic asset identity and slot uniqueness make repeated/parallel finalization converge while retaining an extensibility path for future multi-output capabilities.
- Product success means durable media state exists, not merely that the provider says ready. Recovery can adopt already-written R2 bytes or canonical media metadata before requiring provider output again.
- Primary video output remains successful if only optional poster persistence fails.
- Stale retryable provider failure is bounded rather than occupying capacity forever; RenderLab records sanitized product errors and keeps worker/provider diagnostics internal.
- Terminal lifecycle settles generation-admission concurrency. Local terminal-before-bind races release atomically; accepted external backend jobs without a local RenderLab job row remain conservatively admission-bound.
- Exact implementation head `1b3927c98be2122fdbd1b5754fc67cddfcf675ca` passed dedicated reconciliation/admission fault coverage plus real Image/Video generation and existing Create/Activity/ownership/release regressions. Production scheduler activation remains separate from the verified capability.

## Phase 15 Generation Control & Maintenance — Verified in RenderLab
- RenderLab-native jobs expose an owner-facing Cancel capability only while the server says the current queued/preparing/running attempt is safely cancellable. `persisting` and terminal state win over cancellation and are never reversed.
- `cancelling` is a first-class nonterminal product state. Cancellation intent, ordinary reconciliation, failover and durable finalization serialize through the Phase 14 lifecycle claim. Once cancellation intent wins, that attempt never fails over or publishes a durable late result.
- Provider cancellation targets only the currently persisted native call with bounded timeout. Confirmed provider cancellation or recognized not-running state may terminalize immediately; ambiguous failures stay `cancelling` for server-owned retry. A ten-minute local grace may terminalize while permanently discarding late output without claiming provider compute stopped instantly.
- Terminal cancellation releases bound generation-admission capacity. Repeated/concurrent Cancel is idempotent. Cancelled jobs remain historical terminal attempts and are not Retry-eligible.
- The optional external RenderLab generation backend remains non-cancellable because no authenticated external cancellation contract has been verified.
- Activity consumes only a server-derived `canCancel` boolean and opaque job ID. Worker/provider/storage identity remains internal.
- Exact head `9cd0528ff50ef55a3ad3e09080980a71234af096` passed Generation Cancellation `33939690824`, including exhaustive mock races/faults and bounded real FLUX + REDGraft cancellation through the ordinary product API with zero durable output; Activity Cancel Visual `33939690827` verified the responsive interaction.

### Bounded maintenance capability
- Phase 15 adds server-owned maintenance for only three proven categories: stale unreferenced temporary generation sources, stale unpromoted pending/failed media-upload staging, and already-tombstoned assets whose R2 purge is pending.
- Eligibility is bounded and ownership/storage identity comes from existing rows. `generation_sources` and `media_upload_sessions` use an internal `cleaning` claim plus a quiescence/re-reference pass before physical deletion. Late references restore a source; promoted media is adopted; R2 failure leaves retryable state.
- Referenced temporary sources, durable media, generation history, unknown R2 objects and historical output anomalies are not age-purged.
- Shared migrations `20260905015926 renderlab_generation_cancellation` and `20260905020803 renderlab_staging_cleanup_claims` are applied. Maintenance Integration `33939690830` passed race/fault/idempotence verification.
- Final shared audit after verification: zero fixture users, active jobs/claims, indexed duplicate output slots, pending media purges and nonterminal upload sessions; three old unreferenced temporary sources remain eligible backlog and one old referenced source remains protected. Maintenance is implemented but not production-scheduled.
- The shared schema is ahead of the still-deployed Cycle 2/Phase 13 application. Old-production generations may continue creating nullable `generation_output_index` rows until Phase 14/15 is explicitly rolled out; those rows are product history, not maintenance garbage.

Production deployment/scheduling remains separate: no Phase 14/15 app deployment, reconciler/maintenance secret, `pg_cron` or `pg_net` schedule is active from this verified implementation.

### Phase 16 Creative Iteration — COMPLETE / VERIFIED in RenderLab
Successful durable generation history can now be reused as **current-valid product intent** without claiming historical provider replay.

- `src/server/generation/generation-recipe.ts` is the shared server boundary for historical request reconstruction. It reloads the job under owner scope, parses persisted prompt/output/inputs/Advanced state through the current request contract, verifies operation/output consistency and revalidates current image input ownership/readiness.
- Existing narrow legacy Video compatibility remains deliberate: obsolete historical Video `steps`/`guidance` are removed before current validation rather than resurfaced as controls or replayed to workers.
- **Reuse Settings** resolves a successful current-valid recipe into editable Create state. Stable aliases, semantic roles and the exact current-valid source identity are preserved. Opening the recipe creates no new job and sends no backend generation request.
- Ready same-owner historical `temporary-source` inputs remain valid compatibility inputs when their current row/object is still available. They are previewed through an authenticated product redirect and remain temporary; the browser never receives their R2 key.
- **Run Again** is succeeded-only and server-owned. It reconstructs the same current-valid product request and calls ordinary `submitGeneration`, so current admission, routing and defaults apply. Each explicit request creates a distinct attempt; the historical row is immutable and worker/provider/workflow/model/failover metadata is excluded.
- Failed-job **Retry** remains recovery-only, successful **Run Again** remains iteration, and active **Cancel** remains lifecycle control. These are intentionally separate product actions.
- Exact configured verification head `5c9008c974c9b096fd484b3e5546c613880ff79a` passed the dedicated Creative Iteration run `33959979016` and all 26 affected workflows. The focused run verified privacy, no implicit dispatch, editable Image/Video/Advanced prefill, ready temporary references, fail-closed unavailable references, distinct immutable Run Again attempts and admission denial with exact cleanup.
- Conditional Viewer **Compare source** is implemented for generated Edit/Animate results whose producing owner-scoped job still resolves an active same-owner durable primary `media-asset`. Ineligible temporary/deleted/foreign/no-source history fails closed. The feature reveals comparison progressively, preserves truthful media geometry and result-primary hierarchy, links Source only through its ordinary Viewer, preserves video controls/result actions, and adds no new route, schema or durable comparison state. Exact implementation head `4d1a495a8145238e1e78756c7b09cdbaee8d8115` passed Creative Iteration `33964679539` and all 26 affected workflows. Artifact `9969057974` (`sha256:cc20206371324f0698433731294924105174943cc0176dfd4ce9264fee6e8df5`) was independently hash-checked and human-reviewed clean across Image→Image and Image→Video desktop/narrow; no corrective implementation change was required. Phase 16 is `COMPLETE / VERIFIED`. Variations remains deferred because current product/worker execution still has one-output semantics.
