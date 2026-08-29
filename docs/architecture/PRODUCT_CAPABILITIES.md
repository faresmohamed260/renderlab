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
Current generation inputs are opaque product identities:
- `{ type: "temporary-source", id }` for ready uploaded references;
- `{ type: "media-asset", id }` for durable RenderLab results.

The browser does not submit R2 keys.

### Initial supported reference behavior
- PNG, JPEG, WebP;
- ≤25 MB;
- signed direct-R2 upload;
- server HEAD verification;
- opaque `generation_sources.id` binding.

### Initial default/contextual values
- Image/Video is the explicit main output choice.
- Image aspect ratios: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`.
- Video aspect ratios: `16:9`, `9:16`, `1:1`.
- Video durations: 5, 10, 15, 20, 30 seconds.
- Video audio generation: explicit on/off, default ON, carried as `output.audioEnabled`.
- A compatible image input resolves Image → Edit and Video → Animate.

### Verified Advanced product controls
Create v0.3 intentionally exposes only currently justified Advanced controls:
- negative prompt;
- seed;
- steps;
- guidance;
- frame rate for Video only (24/25/30 fps).

Current UI/API capability metadata is centralized in `src/lib/capabilities/generation.ts`. Advanced is collapsed by default. A worker supporting more parameters is not sufficient reason to expose them. Video audio is contextual output intent rather than an Advanced control; `defaultVideoAudioEnabled = true` is centralized beside the other capability defaults.

### Verified continuation actions
Persisted image results currently expose:
- **Edit** → rebind result as `media-asset` / `primary-image`;
- **Animate** → rebind result as `media-asset` / `first-frame`.

Run `33027460976` live-verified `Create Image → persisted media asset → Edit Image` and cleaned both fixtures.

### Verified job/runtime behavior
- asynchronous `generation_jobs`;
- queued/running/persisting/succeeded/failed/cancelled product states;
- success only after R2 + `media_assets` persistence;
- bounded client retry/backoff for transient status/network errors;
- primary/standby submission routing;
- conservative poll-time reassignment only on explicit safe evidence;
- no automatic poll-time resubmission for generic 429/5xx/network ambiguity.

## Cycle 2 Phase 6 Capability Audit — 2026-08-29

Phase 6 re-audited current RenderLab code plus the configured deployed worker paths. Audit run `33250031468` is the live evidence source; Saga worker source remains implementation-reference evidence only.

### Multi-reference image edit
- RenderLab's normalized request already models `inputs` as an array, and native image submission forwards every resolved source as repeated `image_files` in request order. Temporary `generation_sources` and durable `media_assets` can both be resolved to server-side bytes without exposing R2 keys.
- The approved Create UI still submits at most one reference. The current request parser validates input object shape but does **not** yet enforce media-kind compatibility, per-role multiplicity or a maximum input count. Multi-reference v0.1 must add those server-side input-slot constraints before exposing additional reference controls.
- The current deployed FLUX gateway reports `multiple_references=true`; a bounded two-reference live probe was accepted with `reference_count=2` and returned PNG successfully in about 12.6 seconds total.
- Audited worker runtime dynamically creates additional reference-conditioning nodes for every image after the first and has no explicit reference-count ceiling. The first image controls normalized output dimensions; later images are auxiliary conditioning references. Worker permissiveness is **not** a product maximum: Phase 7 must choose and document a deliberate bounded user-facing count.
- Existing per-file reference limits remain image MIME types and at most 25 MB per input at the worker boundary. Phase 7 must preserve the simpler one-reference path and validate both temporary/durable input media compatibility server-side.

### Video resolution
- RenderLab's current normalized product request has no resolution field. Native REDGraft submission is currently fixed to `480p`; that is the actual current product behavior even though the deployed runtime supports more.
- Live REDGraft runtime health reports enabled resolutions `480p`, `720p`, `1080p` and `2K`, with frame rates 24/25/30. `4K` appears in internal resolution metadata but is **not enabled** and must not be surfaced as supported product capability.
- A bounded live `720p`, `16:9`, 5-second, 24-fps, audio-off request completed successfully and produced a verified `1280×720` MP4. Higher enabled modes were not exhaustively generated because Phase 6 intentionally avoids an expensive benchmark when live runtime capability evidence is sufficient.
- Resolution interacts with aspect ratio through final delivery dimensions rather than exposing the runtime's internal base preset geometry directly. Duration remains 5–30 seconds, audio remains on/off and frame rate remains 24/25/30 under the existing worker contract.

### Operational evidence for product defaults
- Production-domain samples from the same run: Create Image + durable Edit 91s total; Create Video + Animate 155s total; direct two-reference FLUX 12.6s; direct 720p 5-second Video 62.7s. These are bounded audit samples and are not latency SLAs or percentile measurements.
- The current product has no per-user generation rate/concurrency/abuse limiter at the generation route. Worker source serializes each container invocation; exact deployment-wide autoscaling/capacity is not exposed by current health APIs.
- Provider per-generation cost/credit consumption is not reliably observable through the current product/worker health contracts. Phase 7 must not invent cost labels or promises from unavailable data; Phase 10 must account for capacity/abuse controls if access broadens.

## Accepted Cycle 2 Create v2 Direction — not yet implemented
The following items are accepted product direction from closed-beta feedback, but remain **unimplemented until Phase 7 execution and verification**:
- reference-backed Edit/Animate should default to source-aware `Original` geometry with explicit supported-ratio override;
- aspect-ratio choices should expand only from verified worker/capability behavior;
- user uploads initiated from Create should promote to durable owner-scoped `media_assets` after verification and remain in Library even if no generation is submitted;
- multi-reference inputs need stable aliases/order, task-relevant roles and prompt-level reference addressing plus strict server media-kind/count/ownership validation;
- FLUX and Qwen multi-input behavior must be audited for real subject/outfit/pose/style/background-style tasks, while product guarantees remain limited to deterministic mapping rather than probabilistic model obedience;
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

Phase 6 verified the capability handoff and is complete under Closed Beta. The first production-feedback pass has now expanded Phase 7 around the prerequisites that evidence exposed: source-aware geometry, durable Create uploads, composer de-crowding, explicit reference identity/prompt mapping, FLUX/Qwen multi-input verification, an audit-first Director-video slice and curated Video resolution. Phase 7 execution has not started; verified current behavior above remains authoritative until each new contract is implemented and validated.
