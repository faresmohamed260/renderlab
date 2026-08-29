# Project

RenderLab is an AI image/video creation platform using cloud-hosted ComfyUI workflows as the generation backend.

## Product Direction
RenderLab is a fresh application, not a direct migration or visual clone of the previous Studio implementation in `saga`.

Saga is reference material for proven behavior, backend integration, workflow capability, persistence, job lifecycle and lessons learned. Its UI, navigation, component hierarchy, routing, deployed runtime and legacy tables are not the RenderLab specification.

## Product UX Principle
**Simple by default, powerful when needed.**

Users interact with understandable creative goals rather than ComfyUI graphs, worker routing or storage implementation. Advanced/model-specific controls are progressively disclosed only when useful.

## Stack
### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui Radix Nova + `radix-ui` through the approved maintained component ecosystem
- RenderLab-owned normalized primitive layer under `src/components/ui`
- Server Components by default; Client Components for interactive feature behavior

### Infrastructure
- Vercel deployment target
- Cloudflare R2
- Supabase
- existing cloud-hosted ComfyUI/Modal worker fleet

RenderLab deliberately reuses Saga/Studio infrastructure resources while keeping RenderLab schema, storage prefixes, orchestration, APIs and product contracts independently named and owned. See `docs/architecture/INFRASTRUCTURE.md`.

## Product Architecture Direction
Generation is modeled as:

`Workflow → Inputs → Parameters → Generation Job → Outputs → Continuation Actions`

Generation inputs and media actions use opaque product identities. R2 storage keys, provider IDs and worker routing remain server-side implementation details.

## Product Areas
Primary:
- **Create** `/`
- **Library** `/library`

Contextual/utility:
- **Media Viewer** `/library/[assetId]`
- **Activity** `/activity`
- **Settings** `/settings`

Image, Video, Edit, Animate, Models and Workflows are not separate top-level destinations by default.

## Current Priority
**Cycle 2 — Creative Productivity & Beta Maturity. Phase 6 is complete under the Closed Beta boundary. Phase 7 is in progress: Phase 7B Multi-reference Image Editing v0.1 is verified and merged, the Phase 7A premium-interaction pass remains an open Phase 7 exit item, and Phase 7C Director Video is the next planned slice but has not started.**

### Cycle 2 objective
Move RenderLab from a solid functional MVP into a product that supports repeated serious creative work: richer reference-driven creation, durable reusable inputs, clearer task-oriented controls, useful job recovery, closed-beta operations, and a premium modern creative experience without exposing ComfyUI/provider complexity to ordinary users.

Cycle 2 continues the existing phase numbering, with the post-Phase-6 roadmap revised from direct production feedback:
- **Phase 6 — Cycle 2 Baseline & Production Hardening: COMPLETE.** Production/custom-domain/account/storage/generation capability was reverified and **Closed Beta** selected as the operating boundary.
- **Phase 7 — Create v2 / Creative Direction:** execute in four ordered slices. **7A Create Foundation** de-crowds the composer, introduces source-aware `Original` geometry with explicit ratio override, expands only verified aspect-ratio choices, makes Create-originated user uploads durable Library assets, establishes reference identity/order/roles, and raises the motion/interaction quality bar. **7B Multi-reference Image Editing** adds deterministic multi-input mapping plus prompt-level reference addressing and audits FLUX/Qwen behavior. **7C Director Video** audits the actual deployed LTX/REDGraft workflow for frame/story/dialogue/sound controls and, where verified, exposes them as an understandable Director experience rather than ComfyUI nodes. **7D Video Quality/Resolution** adds a curated 480p/720p/1080p/2K product choice from verified runtime support and operational evidence.
- **Phase 8 — Library v2 / Media Workflow Productivity:** collection rename/delete, page-scoped batch add/remove Collection and batch Favorite/Unfavorite remain the planned organization improvements. Create-originated uploads from Phase 7 must behave as ordinary durable Library media and compose with existing search/Favorites/Collections. Cross-page selection remains deferred. Trash/restore still requires an explicit superseding delete contract.
- **Phase 9 — Activity v2 / Recovery & Job Control:** generation Retry remains the first planned recovery mutation; cancellation stays contingent on a separate safe-execution audit. A restrained global running/failed attention indicator may be added while Activity remains the operational surface.
- **Phase 10 — Account, Admin & Closed-Beta Operations:** account recovery/session hardening plus a separately authorized privileged admin surface for closed-beta access, generation limits, feature flags and useful operational health/failure visibility. Ordinary users must not inherit worker/provider administration controls merely because the admin surface exists. Broader-beta rate/concurrency/abuse controls and the leaked-password-protection warning are handled here before any expansion beyond controlled access.
- **Phase 11 — Brand & Launch Experience:** establish RenderLab visual identity (logo/brand assets/banners), landing/onboarding presentation and the route/information-architecture decision for a marketing landing page. The current `/` Create route remains authoritative until this phase explicitly decides whether landing owns `/` and Create moves to another route.
- **Phase 12 — Cycle 2 Release Validation:** run exact-head integrated validation across Account → Create → generation → durable reference/media reuse → Library → Viewer → organization → Activity/recovery → Admin boundary → launch surfaces, then perform one deliberate production rollout only when explicitly authorized.

### Phase planning protocol
Cycle roadmaps are directional. Before each phase starts, the immediate next phase must be expanded into an execution-ready contract from current repository, production and capability evidence. Later phases remain at roadmap level until their predecessors are complete unless an early cross-phase decision is required to avoid rework.

Each phase contract covers goal, user value, verified starting state, in/out of scope, affected architecture/contracts, required UI/UX decisions, backend/infrastructure dependencies, data/schema and security/ownership implications, validation and responsive review, documentation outputs, exit criteria and next-phase dependencies. The contract is merged before phase execution. Accepting or expanding a phase does not mark it started or complete and does not authorize deployment.

### Cycle 2 scope boundary
Cycle 2 now explicitly includes Create v2 reference/geometry/composer work, verified Director-video productization, curated Video resolution, Library/Activity productivity, privileged closed-beta admin operations, and brand/launch work. It still does **not** approve generic Models or Workflows screens, ComfyUI graph editing, ordinary-user provider/worker management, arbitrary workflow-parameter forms, inpainting/outpainting, structural guidance, workflow chaining, a full billing system, a global media client store or a cross-page selection framework without separate evidence/decisions.

### Post-Cycle-2 direction — LoRA/model extensibility
User-selectable LoRA support is an **accepted future product direction**, but it is deliberately outside Cycle 2. A later cycle should define external model discovery/import from sources such as Civitai/Hugging Face, durable LoRA library identity, base-model/workflow compatibility, version/hash/source/license metadata, safe download/cache/storage behavior, admin approval/policy, selector UX and generation strength (including any multiple-LoRA composition rules). Phase 7 architecture must remain able to represent optional model adapters later without exposing them prematurely.

### Cycle 2 execution gate
- Roadmap status: `ACCEPTED / REVISED FROM CLOSED-BETA FEEDBACK`.
- Cycle execution status: `IN PROGRESS`.
- Phase 6: `COMPLETE`; operating boundary: **Closed Beta**.
- Current phase contract: **Phase 7 — Create v2 / Creative Direction**, `EXPANDED/PLANNED`; execution `IN PROGRESS`.
- Current product slice: **None — Phase 7B Multi-reference Image Editing v0.1 is complete.** The next planned slice is Phase 7C Director Video, which has not started. The remaining Phase 7A premium-interaction pass stays an open Phase 7 exit item and should compose with the approved reference UI rather than reopen its product contract.
- PR #51 merged as `7afe257b069e74d322d8f83c1a0868a30acd3686` from exact head `c8fbe9d733eb9b983b209da995b2f9865808f66a`. The head passed Account Ownership, UI Shell, Create Durable Upload, Create Lifecycle, Library Lifecycle, Media Delete, Activity, Generation Integration and Video Generation; desktop/narrow reference artifacts were reviewed clean. Stable `@imageN` aliases, unresolved-alias blocking, structured alias/source/role persistence and deterministic native alias→worker-position translation are implemented.
- Phase 7B contextual audit run `33263044354` used run-owned synthetic adult references against merged application SHA `7afe257b069e74d322d8f83c1a0868a30acd3686`. Human review found FLUX preserved the edited subject strongly in the outfit-only case and represented both intended people with correct `@image1`/`@image2` left/right semantics even when physical request order was deliberately reversed. Fixtures were cleaned after artifact capture.
- Qwen contract audit `33263338596` verified the deployed gateway is ready, reports `multiple_references=true`, and accepts repeated multipart `image_files` on `/jobs/edit`. Qwen contextual run `33263401453` completed the same bounded cases but showed materially more facial/stylistic drift than FLUX. Therefore v0.1 keeps **FLUX as the internal Image Edit route**, leaves Qwen internal/unselected, and does not add a model selector.
- The accepted Phase 7B v0.1 product boundary is **at most two image references for Image output and at most one image reference for Video output**. For a two-image edit, request slot 1 is `primary-image` and slot 2 is `reference`; reordering may change those slot roles/order but must never change which durable asset an existing `@imageN` alias names. RenderLab guarantees mapping/validation, not deterministic model obedience.
- PR #53 implemented that boundary and merged as `0286b18802fc3d766d9d09e2ba8ed9a494eabd08`. Polished product commit `360fa79ea85dd09ce90101518fedaca5645aaa71` and exact validation retrigger head `acf3f8e792c2b895a9999cca24060a1c33484463` have identical trees. The exact head passed Account Ownership `33266025758`, Create Durable Upload `33266025798`, Library Lifecycle `33266025756`, Activity `33266025837`, UI Shell `33266025763`, Media Delete `33266025759`, Video Generation `33266025764`, Create Lifecycle `33266025789`, and Generation Integration `33266025757`.
- Configured Create Lifecycle `33266025789` verified a second durable owner-scoped upload, replacement without alias churn, two-reference mention selection, `Make primary` reorder with alias identity preserved, correct submitted slot roles/order, two-reference Video blocking, unresolved-alias recovery and exact fixture cleanup. Desktop/narrow artifacts were reviewed after the responsive polish; narrow `Primary image` / `Reference image` labels remain readable and actions wrap without overflow. No schema, route, provider/model selector, infrastructure or deployment change was introduced.
- Configured Create Durable Upload run `33256497167` verified signed persistent upload → owner-scoped `media_asset` with no generation job → ordinary Library visibility → generation request binding through the same opaque `media-asset` identity → exact R2/database/Auth cleanup. No generation spend was required for that contract test.
- Source-aware geometry + curated ratio expansion merged through PR #47 as `de50efe6ba462ec604ea2cace741e11904a62425`. Exact implementation head `789358e8a276ab54d8eeae7e4b7dcb64c2c4c60f` passed the complete 20-workflow retriggered affected suite, including Generation Integration `33259410952`, Video Generation Integration `33259411008`, Create Lifecycle `33259411062`, Library Lifecycle `33259411170`, UI Shell `33259410968` and Deployment Readiness `33259410991`. Earlier exact-head configured runs `33258831654` / `33258831636` explicitly verified real output geometry for Create Image 16:9 → Edit Original → Edit 4:5 and Create Video 16:9 → Animate Original from a 2:1 source; all generation/reference/media/Auth fixtures cleaned.
- The shared browser upload transaction now serves both Library and Create while feature-specific picker/drop validation remains feature-owned. User-facing Create no longer depends on temporary `generation_sources` for newly uploaded references; temporary-source APIs remain an internal compatibility/staging capability until separately retired.
- Composer hierarchy/de-crowding merged through PR #49 as `d324d7c8a520052d3c4bdc81f5f6c11edbdf50ee`. Exact implementation head `d52db83efb2af056e2e1598b54b988794ff19ab1` passed UI Shell `33261129925`, Create Lifecycle `33261129910`, Library Lifecycle `33261129917`, Account Ownership `33261129909`, Create Durable Upload `33261129940`, and Video Generation `33261129918`. Desktop/narrow artifacts were reviewed: Video duration/audio/Advanced are contextualized through maintained Dropdown Menu mechanics, Image/Video uses the maintained compact ToggleGroup, and Advanced expands below the primary controls/Generate row. No generation/API/schema/worker/route/deployment contract changed.
- Next planned slice: **Phase 7C Director Video capability audit/productization**. Before adding Director controls, re-audit the actual configured LTX/REDGraft workflow/gateway for frame/story/action/dialogue/sound semantics and current constraints; expose only verified task-oriented controls and do not surface ComfyUI/provider internals. This handoff does not start Phase 7C implementation. The Phase 7A premium-interaction pass remains an open Phase 7 exit item.
- Phase 7B contextual acceptance requires real output artifacts, not only accepted requests or dimension checks: bounded synthetic-person outfit edits should preserve recognizable subject appearance, two-person multi-reference cases should visibly represent both intended people, and `@imageN`-directed prompts should be reviewed against the intended mapping. RenderLab guarantees deterministic mapping/validation, while model obedience and identity fidelity remain probabilistic and are evaluated truthfully rather than promised deterministically.
- Phase 7B/7C/7D must not bypass the Phase 7A input/media/composer foundations they depend on.

### Phase 6 verified baseline — 2026-08-29
- Audit starting `main`: `5072fe96495ea53d06f4891c6073b16203c819d2`. Vercel production remains READY on deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` from application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca`; the repository delta from that production SHA through the audit-starting `main` is documentation-only, so there is no executable application drift.
- The latest production build passed the canonical Vercel environment preflight without exposing secret values. Fresh custom-domain verification returned the exact CNAME `736ea4abfec91fb9.vercel-dns-017.com`, HTTPS `200` from Vercel and a valid TLS certificate for `renderlab.faresuniform.uk`.
- Remote production audit run `33250031468` passed account session, two-account privacy/ownership, custom-domain persistent upload → Library → Viewer → Edit handoff, Create Image → durable Edit continuation, Create Video and Animate Image on the real production domain. Vercel reported no runtime errors during/after the audit and no deployment was created by the audit branch.
- At the Phase 6 audit baseline, deployed FLUX primary live-accepted and completed a two-reference edit (`reference_count=2`) while the then-current RenderLab UI still submitted at most one reference and the request parser lacked product count/role enforcement. Phase 7B subsequently closed that gap through UI-046 / PR #53; this bullet remains historical Phase 6 evidence rather than the current product contract.
- REDGraft live runtime health enables `480p`, `720p`, `1080p` and `2K`; `4K` is represented internally but disabled and is not a product capability. RenderLab currently submits Video at fixed `480p`. A bounded live `720p`, `16:9`, 5-second, 24-fps, audio-off probe produced a verified `1280×720` MP4.
- One bounded sample observed: account identity 7s, ownership 15s, custom-domain upload/media 16s, Create Image + durable Edit 91s, Create Video + Animate 155s, direct two-reference FLUX 12.6s and direct 720p Video 62.7s. These are audit samples, not SLAs. Provider per-generation cost and exact deployment-wide worker capacity are not reliably observable from current contracts and remain unresolved rather than estimated.
- RenderLab still has no app-level per-user generation rate/concurrency/abuse limit. Supabase security advisors remain the expected server-owned RLS-with-no-policy INFO notices plus a beta-readiness warning that leaked-password protection is disabled. This audit makes no Auth/config mutation.
- Final cleanup verified zero Phase 6 fixture rows and zero Phase 6 Auth users while preserving RLS, `owner_id NOT NULL`, zero browser grants, ownership/integrity triggers and latest migration `20260828221611 renderlab_media_asset_deletion`. Pre-existing non-fixture product data was left untouched.
- **Closed Beta** is the selected Cycle 2 operating boundary. Keep access controlled until Phase 10 addresses broader-access rate/concurrency/abuse controls and the Auth leaked-password-protection warning; broader beta remains a separate explicit decision.

### Approved product state
- Application shell: `APPROVED`.
- Create: `APPROVED`; complete configured browser lifecycle run `33031817744`.
- Library v0.1: `APPROVED`; credential-free run `33034606323`, configured lifecycle `33034606396`.
- Persistent Library upload: `APPROVED`, merged through PR #9 as `d306f2abd1831538c51692545d72db1e5e9e0814`.
- Library search v0.1: `APPROVED`, merged through PR #10 as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`.
- Durable Media Download v0.1: `APPROVED`, merged through PR #11 as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`.
- Durable Media Rename v0.1: `APPROVED`, merged through PR #12 as `d76f0ce30502e2aff2384dcd168f07b2184768a4` after exact-head six-gate CI and clean shared-resource verification.
- Maintained UI primitive foundation / UI-026: `APPROVED`, merged through PR #13 as `5953934d5f67c16304be7493eda27c88e24c02cc`.
- Library history ordering v0.1 / UI-027: `APPROVED`, merged through PR #14 as `a7ecaa6a704e4378b31e694e5f21c5629920b520` after final documentation-head eight-gate CI, responsive screenshot review, clean fixture verification and green post-merge `main` UI Shell `33097463519`.
- Library drag-and-drop upload v0.1 / UI-028: `APPROVED`, merged through PR #15 as `5484638e0a2f70e1e7bb7679a3157f9fb4b4a3d8`. Final exact head `ddb522ad71615e8c489043c54581ca78f8a3330a` passed UI Shell `33109026794`, Library Search `33109026806`, Library History `33109026871`, Library Drag Drop `33109026739`, and Library Lifecycle `33109026758`; responsive screenshots were re-reviewed, shared fixtures were verified clean, and merged `main` UI Shell `33109435978` passed.
- Account Identity Foundation v0.1 / UI-029: `APPROVED`, merged through PR #16 as `bcb20365db102252db51263968de96fc795be518`. Final exact head `55a5df4351b5f9f23bde7dc9b2e73213481dd9e2` passed Account Identity `33112405837`, UI Shell `33112405863`, Create Lifecycle `33112405840`, Library Search `33112405831`, Library History `33112405838`, Library Lifecycle `33112405858`, Library Drag Drop `33112405827`, Media Download `33112405889`, and Media Rename `33112405850`; responsive Settings screenshots and exact auth-fixture cleanup were reviewed clean. Merged `main` UI Shell `33113289145` and Reference Upload Integration `33113289156` passed.
- Create supports Create Image, Edit Image, Create Video and Animate Image.
- Durable generated and uploaded media share RenderLab `media_assets`, product APIs and opaque `media-asset` identity.
- Viewer/Create continuation is capability-derived and server-validates durable asset identity/action compatibility.
- Activity v0.1 / UI-035 is `APPROVED` and account-private over RenderLab `generation_jobs`.

### Active product slice
- None. Activity v0.1 / UI-035 remains complete and approved; the reported custom-domain upload failure and missing Video audio control were resolved as completed production-usability maintenance in PR #36 and PR #37.
- The Phase 5 Models/Workflows evaluation found no dedicated user-facing surface justified by the current verified capability set, and the capability audit found no additional approved capability-specific experience beyond Create/Viewer/Activity. Future new user goals require explicit new slices rather than speculative empty screens.

### Latest maintenance / production usability fixes
- Custom-domain browser upload CORS / PR #36 is complete. A user-visible `Failed to fetch` during signed direct-R2 upload from `https://renderlab.faresuniform.uk` was traced to missing browser-origin coverage, not to the upload API, authentication, ownership or durable-media model. The canonical configured upload-origin list now includes the custom production domain. Final head `a66bcff942efa82b9823f031b25487e97eeb3fa6` passed Library Lifecycle `33238196620` and Library Drag Drop `33238196599`, including a successful `204` PUT preflight plus a real upload lifecycle. PR #36 merged as `0d4f05980e78a3c3b29beb68e91ebf0e225d2815`; merged-`main` Generation Integration `33238360406`, Video Generation `33238360399`, and UI Shell `33238360429` passed.
- Video audio control / PR #37 / UI-036 is complete. Video output now exposes an explicit contextual Audio on/off control, default ON. The product request carries `output.audioEnabled`; image requests reject the video-only field; native REDGraft submission maps the validated value to worker `audio_enabled` rather than hardcoding audio on. Final head `5178ef95ab63e816925c66a3305c9c255708886e` passed all eight affected gates: Account Ownership `33239584670`, UI Shell `33239584665`, Create Lifecycle `33239584685`, Video Generation `33239584671`, Generation Integration `33239584676`, Media Delete `33239584663`, Library Lifecycle `33239584662`, and Activity `33239584661`. PR #37 merged as `713e8a6940c25fd0dc82994507537fe1a0d06b42`; merged-`main` Generation Integration `33239701484`, UI Shell `33239701487`, and Video Generation `33239701476` passed.
- Custom-domain DNS activation / 2026-08-29: Cloudflare now has a DNS-only `CNAME` for `renderlab.faresuniform.uk` targeting Vercel's assigned `736ea4abfec91fb9.vercel-dns-017.com`. The repository `CLOUDFLARE_API_TOKEN` is intentionally zone-DNS scoped and is not an R2-admin credential. R2 browser-CORS reconciliation must therefore fall back to the existing R2 S3 credentials when the generic Cloudflare token receives an R2 authorization `401`/`403`; a DNS-scoped token must not break upload verification.
- PR #36 and PR #37 add no schema migration and do not redesign Create or change the account/private-media ownership model. Automatic Git deployment remains disabled; repository merge is not implicit production deployment authorization.

### Latest completed product slice
- Activity v0.1 / UI-035 is **APPROVED**. PR #34 merged as `7e1e7c4e3c1dc1f6d226998e7d372715c2220bc4` after final exact head `f0a1100ea379a5aaba43d2694bb34496b563a1b2` passed all six affected gates: Activity `33223434378`, Account Ownership `33223434363`, UI Shell `33223434381`, Create Lifecycle `33223434428`, Generation Integration `33223434364`, and Video Generation `33223434355`.
- Activity is an owner-scoped recent-generation surface backed by RenderLab `generation_jobs`; it presents real persisted lifecycle state, sanitized product failures, newest-first 20-job pagination, lightweight refresh only while work is active, and Viewer result links only for still-active owner media. Worker/provider/workflow/failover metadata remains internal; UI-035 adds no cancellation/retry mutation, global job store or schema migration.
- Configured two-account verification proved signed-out/private isolation, pagination, active state, internal-error redaction, active/deleted result-link behavior, responsive rendering and exact cleanup. Desktop/mobile implementation artifacts were visually reviewed clean; the final exact head reran the same Activity lifecycle successfully after reduced-motion polish.
- Merged `main` checks UI Shell `33223633751`, Generation Integration `33223633631`, and Video Generation `33223633627` passed. Final shared-resource audit returned all six RenderLab tables and configured fixture users to zero with six RLS tables, six non-null owners, zero browser grants and `20260828221611 renderlab_media_asset_deletion` still latest. Vercel listed zero deployments created after the merge, so automatic Git deployment remains disabled and UI-035 was not deployed separately.
- Models/Workflows and additional capability-specific surfaces were evaluated and are not justified as separate product screens by the current verified capability set.

### Previous completed product slice — Library Batch Delete
- Library Batch Delete v0.1 / UI-034 is **APPROVED**. PR #29 merged as `8b0b0339f216f3ce704d965ef005b2cd020f3ae8` after final exact head `1e634fe9a582b8a7676cb70cfc7bcd5754f613ce` passed all 16 affected gates: Library Batch Delete `33220710307`, Account Ownership `33220710301`, UI Shell `33220710365`, Create Lifecycle `33220710378`, Library Search `33220710297`, Library History `33220710393`, Library Lifecycle `33220710305`, Library Drag Drop `33220710389`, Persistent Media Upload `33220710300`, Media Download `33220710329`, Media Rename `33220710371`, Library Favorites `33220710303`, Library Collections `33220710404`, Media Delete `33220710375`, Generation Integration `33220710351`, and Video Generation `33220710347`.
- UI-034 keeps selection transient and current-page scoped (maximum 24 assets), composes the existing UI-033 tombstone/R2 deletion per item, and reports truthful partial success without rolling back completed deletions.
- Desktop selection/confirmation and mobile confirmation artifacts were visually reviewed clean. Final pre-merge and post-merge shared-resource audits both returned all six RenderLab tables and configured fixture users to zero with six RLS tables, six non-null owners, zero browser grants, deletion guards/index intact, and `0009` still latest.
- Merged `main` checks UI Shell `33221101101`, Generation Integration `33221101106`, and Video Generation `33221101117` passed.
- Vercel listed zero RenderLab deployments created after the PR #29 merge; automatic Git deployment remains disabled and UI-034 was not deployed separately.
- No new schema migration was added. Cross-page selection, Trash/restore, batch Favorites/Collections and broader bulk-management remain separate future contracts.

### Previous completed product slice — Durable Media Delete
- Durable Media Delete v0.1 / UI-033 is **APPROVED**. PR #25 merged as `40945ff8c4c7e3a3db0e115c4d7cae9f50db4445` after final exact head `53b0eb4c648b47a17fee2e735b7dddc85d345518` passed all 15 applicable gates: Media Delete `33218433320`, Account Ownership `33218433329`, UI Shell `33218433381`, Create Lifecycle `33218433291`, Library Search `33218433357`, Library History `33218433299`, Library Lifecycle `33218433285`, Library Drag Drop `33218433305`, Persistent Media Upload `33218433348`, Media Download `33218433296`, Media Rename `33218433406`, Library Favorites `33218433314`, Library Collections `33218433301`, Generation Integration `33218433335`, and Video Generation `33218433309`.
- `0009_media_asset_deletion.sql` is applied as `20260828221611 renderlab_media_asset_deletion`. Delete is tombstone-first and permanent to the user in v0.1; generation history retains opaque media IDs while R2 primary/thumbnail cleanup is retryable and auditable through `purged_at`.
- Desktop/mobile destructive confirmation artifacts were visually reviewed clean: Continue remains dominant, Favorite/Collections/Rename/Download stay intact, and Delete remains visually secondary.
- Merged `main` checks UI Shell `33218646377`, Reference Upload `33218646539`, Generation Integration `33218646527`, and Video Generation `33218646602` passed. Final post-merge Supabase cleanup returned all six RenderLab tables and configured fixture users to zero while retaining six RLS tables, six non-null owners, zero browser grants, deletion guards, nullable `deleted_at`/`purged_at`, the active-media index and `0009` as latest migration.
- Vercel listed zero RenderLab deployments created after the PR #25 merge; automatic Git deployment remains disabled and UI-033 was not deployed separately.
- UI-033 remains intentionally narrow: one Viewer-contextual permanent Delete. Batch/card selection, multi-delete atomicity, user Trash/restore/retention and collection deletion remain separate future contracts.

### Previous completed product slice — Library Collections
- Library Collections v0.1 / UI-032 is **APPROVED**. PR #24 merged as `143f7bfb0be8b4857e5dd45959466e71ae22a42d` after final exact head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578` passed all 14 applicable gates: Library Collections `33210501106`, Account Ownership `33210501089`, UI Shell `33210501226`, Create Lifecycle `33210501211`, Library Search `33210501182`, Library History `33210501191`, Library Lifecycle `33210501160`, Library Drag Drop `33210501202`, Persistent Media Upload `33210501130`, Media Download `33210501133`, Media Rename `33210501203`, Library Favorites `33210501168`, Generation Integration `33210501178`, and Video Generation `33210501167`.
- `0007_media_collections.sql` is applied as `20260828201740 renderlab_media_collections`; `0008_media_collection_asset_fk_index.sql` is applied as `20260828202601 renderlab_media_collection_asset_fk_index`. Collections remain server-owned with RLS enabled, zero browser grants, non-null immutable owners and database-enforced same-owner collection/media membership.
- Four fresh desktop/mobile Library/Viewer Collections artifacts were visually reviewed without hierarchy drift. Final pre-merge and post-merge audits both returned zero rows across all six RenderLab tables, zero fixture users, zero browser grants, six RLS-enabled tables, six `NOT NULL` owners, all nine ownership/integrity triggers and all expected Collections indexes.
- Merged `main` checks UI Shell `33210876059`, Reference Upload `33210876022`, Generation Integration `33210876042`, and Video Generation `33210876085` passed. Vercel listed zero RenderLab deployments created after the PR #24 merge; automatic Git deployment remains disabled and UI-032 was not deployed separately.
- Collections v0.1 remains intentionally narrow: named account-owned collections, many-to-many durable-media membership, one URL/server-owned Library collection filter and Viewer-only create/add/remove membership. Collection rename/delete, Library-card/batch membership and media Delete/batch remain separate future contracts.

### Previous completed product slice — Library Favorites
- Library Favorites v0.1 / UI-031 is **APPROVED**. PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431` after final exact head `4bd41d55af27c7240d75862424039fc59027988e` passed all 13 applicable gates: Library Favorites `33205471360`, Account Ownership `33205471266`, UI Shell `33205471298`, Create Lifecycle `33205471299`, Library Search `33205471263`, Library History `33205471326`, Library Lifecycle `33205471335`, Library Drag Drop `33205471286`, Persistent Media Upload `33205471255`, Media Download `33205471419`, Media Rename `33205471361`, Generation Integration `33205471331`, and Video Generation `33205471358`.
- The implementation-head suite `85460b7920afe66eee7ff35da03d4f43c9f207fd` also passed all 13 applicable gates before documentation finalization. Four fresh desktop/mobile Library Favorites and Media Viewer screenshots were visually reviewed without hierarchy drift.
- The final pre-merge and post-merge Supabase audits both found 0 core rows, 0 null owners, 0 RenderLab fixture users, 0 browser grants, four RLS-enabled core tables, four `NOT NULL` owner columns, all six UI-030 enforcement triggers, nullable `favorited_at`, and applied migration `20260828183102 renderlab_media_favorites` with its partial owner/favorite index intact.
- Merged `main` push checks UI Shell `33205766730`, Reference Upload `33205766693`, Generation Integration `33205766671`, and Video Generation `33205766691` all passed. Vercel listed zero RenderLab deployments created after the PR #23 merge; automatic Git deployment remains disabled and UI-031 was not deployed separately.
- Favorites v0.1 remains intentionally narrow: owner-scoped favorite metadata on existing durable `media_assets`, server-owned `favorite=true` Library filtering that composes with kind/search/sort/pagination, and one contextual Media Viewer toggle. Collections, Library-card/batch favorite actions, Delete/batch, new top-level navigation and a global client media store remain out of scope.

### Previous completed product slice — Core Account Ownership
- Core Account Ownership v0.1 / UI-030 is **APPROVED**. PR #17 merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`; owner-aware production deployment `dpl_DYs48pvBEvzDuDbHwcEn4f9LGabE` is READY at `https://renderlab-lake.vercel.app` from exact application SHA `5f5d3cee9b45af175f072050f48da4549d5f416c`; corrected `0005` was applied as `20260828174940 renderlab_core_account_ownership_enforce` after live two-account verification and a zero-unowned-row audit.
- Validated implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed all 14 configured PR gates: Account Ownership `33131090207`, Account Identity `33131090197`, UI Shell `33131090250`, Create Lifecycle `33131090243`, Library Search `33131090279`, Library History `33131090264`, Library Lifecycle `33131090245`, Library Drag Drop `33131090242`, Persistent Media Upload `33131090265`, Media Download `33131090206`, Media Rename `33131090198`, Reference Upload `33131090263`, Generation Integration `33131090251`, and Video Generation `33131090262`.
- Final PR documentation head `d7f856913847ff22fa2594d060dbe21b6ea9373a` passed all 14 configured gates again before merge. PR #17 then merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`; push-triggered `main` UI Shell `33135862296`, Reference Upload `33135862307`, Generation Integration `33135862297`, and Video Generation `33135862337` all passed.
- The staged `0005_core_account_ownership_enforce.sql` was corrected after rollback-only semantic testing found an invalid shared trigger-field reference. Table-specific owner-link triggers pass same-owner, cross-owner, null-owner, owner-immutability, Auth-delete restriction and existing FK cleanup compatibility simulations against the live prepared schema.
- The optional external generation adapter requires both `RENDERLAB_GENERATION_BACKEND_URL` and server-only `RENDERLAB_GENERATION_BACKEND_TOKEN`; submit and poll authenticate with that token before forwarding the owner header. Native generation remains the fallback when the external pair is incomplete.
- Shared Supabase has both ownership migrations applied: `20260827203604 renderlab_core_account_ownership_prepare` and `20260828174940 renderlab_core_account_ownership_enforce`. All four owner columns are `NOT NULL`; six UI-030 enforcement triggers and their three functions are active; RLS remains enabled; browser roles still have no raw core-table grants; final cleanup left 0 core rows and 0 RenderLab fixture Auth users.
- The repository is public, which resolved the previous private-repository hosted Actions capacity failure. Mid-development validation remains GitHub-first. Repository `vercel.json` disables automatic Git deployments and pins `framework: nextjs`; `scripts/verify-vercel-env.mjs` runs as a Vercel-only prebuild guard for required Supabase/R2 configuration. During the authorized rollout the Vercel project preset was corrected to Next.js and the stale explicit `dist` output override was removed. Automatic Git deployment remains disabled, so production deployment is still explicit only.
- Deployment Readiness v0.1 merged through PR #18 as `2b8a5170df0675a691deb8d5a7031f1dc14d803b`. Exact candidate `da7f9c23224f5a03ba0832fe8fcd773d1586e0c2` passed all 15 configured gates; merged `main` Deployment Readiness `33137972011`, UI Shell `33137972042`, Reference Upload `33137972130`, Generation Integration `33137972033`, and Video Generation `33137972021` all passed. Vercel created no deployment for the PR #18 merge. During the later authorized rollout the dashboard project preset was corrected from Vite to Next.js and the stale `dist` output override was removed while repository `vercel.json` continued to disable automatic Git deployments. Final post-merge Supabase audit found 0 core rows, 0 null owners, 0 RenderLab fixture users, 0 browser core-table grants, four still-nullable owner columns, 0 enforcement triggers, and migration history still ending at applied `0004`.
- UI-030 provides the enforced ownership boundary used by approved Favorites v0.1 / UI-031 and approved Collections v0.1 / UI-032; Delete/batch remains a separate blocked management contract pending destructive cleanup/recovery semantics.

Do not redesign approved surfaces merely because new media capabilities or ownership enforcement are added.

## Maintained UI Primitive Contract
UI-026 makes maintained conventional controls a repository-enforced frontend foundation rule.

- `components.json` configures shadcn `radix-nova`.
- `src/components/ui` owns normalized Alert, AlertDialog, Button, Checkbox, Collapsible, DropdownMenu, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle and ToggleGroup primitives.
- Conventional visible controls in `src/features` and `src/components/shell` compose those approved primitives rather than hand-styled raw native controls.
- Native `file` and `hidden` inputs remain allowed as browser/form plumbing.
- Local wrappers own RenderLab tokens, variants, spacing, required semantic elements and product accessibility adaptations; features should not rebuild the same mechanic independently.
- Correct maintained accessibility semantics are authoritative. Create Image/Video is a required Radix single-choice `radiogroup` with checked `radio` items; Library history ordering uses maintained Radix Dropdown Menu radio items.
- `npm run verify:ui-purity` rejects raw visible button/select/textarea/ordinary-input controls in feature/shell code and runs in UI Shell CI.
- Shared primitive/config/package changes retrigger the dependent Create, Library Search, Library Lifecycle, Library History, Download, Rename and Shell regressions.

PR #13 was foundation-only and preserved approved Create/Library/Viewer/shell product behavior. Implementation head `36ee8e8eb80645d1389afa749a36b493e2abbb61` passed UI Shell `33088086901`, Create Lifecycle `33088086892`, Library Search `33088086914`, Library Lifecycle `33088086872`, Media Download `33088086907`, and Media Rename `33088086871`. Final-code UI Shell and Library lifecycle desktop/mobile screenshots were visually inspected with no unintended hierarchy/layout drift. Library lifecycle verified real Upload → Library → Viewer → Edit continuation, correct Radix Image selection, 400×300 media geometry and self-cleanup.

Final exact PR head `89dc69e394bf467227e0131432c301050d718999` passed UI Shell `33089808029`, Create Lifecycle `33089808086`, Library Search `33089807606`, Library Lifecycle `33089807890`, Media Download `33089807786`, and Media Rename `33089807776`. Create Lifecycle attempt 1 was blocked before browser execution by a transient Microsoft Ubuntu apt-repository 403 during Playwright dependency installation; unchanged attempt 2 completed successfully. Direct pre-merge cleanup found `0` upload sessions, no recent RenderLab-named test media assets and no remaining configured Create lifecycle test job. PR #13 merged as `5953934d5f67c16304be7493eda27c88e24c02cc`; post-merge `main` UI Shell `33092354072` and Reference Upload Integration `33092353971` both passed.

## Account Identity Foundation v0.1 Contract
UI-029 establishes a real RenderLab account principal while deliberately leaving media/job ownership enforcement to the next slice.

- Supabase Auth `auth.users.id` is the canonical account identity.
- Settings owns the initial email/password sign-in, account-creation and sign-out experience.
- Browser/server sessions use maintained Supabase SSR cookie handling; root `proxy.ts` refreshes sessions and server identity is read from verified claims.
- Browser code receives only the public Supabase project URL and publishable key; service-role credentials remain server-only.
- Existing Create and Library behavior is not gated or redesigned by this slice.
- UI-029 does not add owner columns, account-scoped media queries, Favorites/Collections, Delete/batch behavior or a schema migration.

Final exact PR head `55a5df4351b5f9f23bde7dc9b2e73213481dd9e2` passed Account Identity `33112405837`, UI Shell `33112405863`, Create Lifecycle `33112405840`, Library Search `33112405831`, Library History `33112405838`, Library Lifecycle `33112405858`, Library Drag Drop `33112405827`, Media Download `33112405889`, and Media Rename `33112405850`. Account Identity created one run-owned confirmed Supabase user through the server-only Auth admin API, signed in through the actual Settings UI, verified cookie persistence across reload, rendered desktop/mobile signed-in states, signed out, rendered the mobile signed-out state and deleted the exact fixture. Direct final cleanup found `0` account CI users and zero shared Library drag/drop/lifecycle fixtures. PR #16 merged as `bcb20365db102252db51263968de96fc795be518`; merged `main` UI Shell `33113289145` and Reference Upload Integration `33113289156` both passed.

## Core Account Ownership v0.1 Contract
UI-030 owner-scopes the existing core persistence model without introducing a parallel account-media system.

- Supabase Auth `auth.users.id` / verified `claims.sub` is the canonical owner identity.
- `generation_sources`, `generation_jobs`, `media_assets` and `media_upload_sessions` carry `owner_id -> auth.users.id ON DELETE RESTRICT`.
- Raw core tables remain server-owned: RLS stays enabled, `anon`/`authenticated` have no direct table grants, and product routes/services use the server-only service role after resolving verified account context.
- Private media list/read/rename/content/thumbnail/download, upload ticket/completion, reference ticket/completion, generation submission/polling and generation input resolution are owner-scoped.
- New pending/durable records receive the authenticated owner; generated output media inherits the generation job owner.
- Foreign opaque media/job/upload/reference IDs resolve like ordinary not-found records; ownership is not disclosed.
- Create may hold a signed-out draft, but persistent upload/generation actions require a verified non-anonymous account.
- An optional external RenderLab generation backend is trusted only when both `RENDERLAB_GENERATION_BACKEND_URL` and server-only `RENDERLAB_GENERATION_BACKEND_TOKEN` are configured. RenderLab authenticates submit/poll calls with that bearer token; the external service must verify it before trusting `x-renderlab-owner-id`. A URL without the token does not activate the external path.
- The prepare migration allowed nullable owners during rolling deployment. Applied `0005` now rejects unowned rows, requires owner non-null/immutable, and enforces the table-specific same-owner relational guards.
- The required enforcement sequence was owner-aware application live first, then a final no-unowned-row audit, then `0005`; the completed production rollout followed that order.
- Configured fixtures are isolated by deterministic test owner; cleanup reconstructs DB/R2 state by owner, deletes in dependency order, then removes the Auth fixture. Active workflows must not perform namespace-wide service-role deletion across owners.

Validated implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed all 14 configured PR gates, including the two-account Account Ownership gate, owner-bound upload/reference/generation persistence, signed-out denial, foreign opaque-ID denial, real browser Library/Viewer/Create lifecycles, generated image/video flows, Download/Rename, responsive UI artifacts and exact cleanup. The resumed suite exposed one verifier-only issue: Playwright's header override followed product-media 302 redirects and leaked the fixture bearer to signed R2 requests. The shared helper now authenticates the local route with a non-following fetch and lets Chromium follow the signed external redirect cleanly; the four affected lifecycle tests all pass after that fix.

Corrected `0005` was applied after exact application SHA `5f5d3cee9b45af175f072050f48da4549d5f416c` became READY in production and live two-account Account Ownership run `33196254711` passed. Migration `20260828174940 renderlab_core_account_ownership_enforce` makes all four owners `NOT NULL`, binds four owner-immutability triggers plus the media→job and upload→asset same-owner guards, and preserves RLS/no-browser-grant boundaries. Post-enforcement production run `33196534150` passed the same two-account isolation suite and cleanup; final shared-resource audit found zero core rows and zero RenderLab fixture Auth users. Supabase security advisors still report only the expected informational no-policy notices for these deliberately server-owned tables; performance notices remain unused-index INFO findings on empty/low-traffic tables.

**Core Account Ownership v0.1 status: `APPROVED`; owner-aware production is live, corrected `0005` is applied and verified, post-enforcement two-account isolation is green, and final shared-resource cleanup is clean.**

## Persistent Media Upload Contract
UI-022 defines the approved durable upload model.

- Durable user uploads are ordinary `media_assets` with `origin = uploaded`.
- Pending direct-to-R2 transfer state belongs to server-side `media_upload_sessions`.
- `generation_sources` remains temporary generation/reference state; legacy Saga `studio_uploads` is not reused.
- Migration `0003_persistent_media_uploads.sql` is applied as `20260827031630 renderlab_persistent_media_uploads`.
- Browser upload is ticket → signed R2 PUT → completion → server HEAD verification → durable asset promotion.
- PNG/JPEG/WebP up to 25 MB are supported.
- Unicode filenames are preserved after control/path cleanup and length bounding.
- Concurrent completion races recover to the unique durable asset winner.

## Library Drag-and-Drop Upload v0.1 Contract
UI-028 adds a second interaction path into UI-022 without changing persistence.

- The ordinary visible Upload button + native file picker remain the keyboard/touch/mobile baseline.
- Desktop file drag over Library reveals a temporary full-surface drop affordance; there is no persistent dropzone.
- Exactly one PNG/JPEG/WebP image up to 25 MB is accepted per drop; multi-file drops fail locally before ticket creation.
- Picker and drop use the same feature-owned `library-upload-client.ts` transaction: upload ticket → signed R2 PUT → completion → durable `media_assets` promotion.
- Success refreshes the server-owned Library and announces completion; errors stay local. No global media store or toast framework is introduced.
- Configured verification is serialized with the shared Library upload fixture lock, uses run-unique fixtures, and asserts exactly one ticket/completion/session/asset/card.
- Under UI-030 configured verification cleanup is additionally owner-scoped; the active Drag Drop workflow no longer runs namespace-wide destructive cleanup across owners.
- Drag/drop adds no schema migration, account/organization state, Delete/batch framework or new R2/CORS contract.

Final exact PR head `ddb522ad71615e8c489043c54581ca78f8a3330a` passed UI Shell `33109026794`, Library Search `33109026806`, Library History `33109026871`, Library Drag Drop `33109026739`, and Library Lifecycle `33109026758`. Drag Drop `33109026739` verified pre-run namespace cleanup, real DataTransfer upload through ticket → signed R2 PUT → completion, exact one session/asset/card, and post-run cleanup using the run-unique fixture `renderlab-drop-33109026739-اختبار-画像.png`. Desktop drag-active/completed and mobile completed screenshots were re-reviewed with no hierarchy drift. Direct Supabase cleanup after the exact-head suite found `0` drag/drop sessions, `0` drag/drop assets, `0` legacy lifecycle sessions and `0` legacy lifecycle assets. PR #15 merged as `5484638e0a2f70e1e7bb7679a3157f9fb4b4a3d8`; push-triggered merged `main` UI Shell `33109435978` passed.

## Library Search v0.1 Contract
UI-023 defines durable-media discovery.

- Search state is shareable URL parameter `q`.
- Search is server-owned against durable `media_assets`, not a client-only current-page filter.
- Queries are whitespace-normalized and capped at 120 characters.
- Matching is case-insensitive literal substring across `display_name`, `original_filename`, and generated `provenance.prompt`.
- Search composes with All/Images/Videos and URL-owned chronological ordering/pagination.
- v0.1 adds no relevance ranking, model/date filters, command palette, collection schema or dedicated search service/index.

PR #10 passed implementation and documentation-finalized Search/upload/lifecycle/UI gates before merge. Post-merge main shell `33070215358` passed.

## Durable Media Download v0.1 Contract
UI-024 defines Download as a contextual product-media action.

- Media Viewer exposes one secondary `Download` action for durable generated/uploaded media.
- `/api/media/assets/[assetId]/download` reloads the durable asset and redirects to a short-lived signed R2 GET with attachment `Content-Disposition`.
- RenderLab does not proxy media bytes through the application server and never treats raw R2 identity as product identity.
- Uploaded downloads preserve a sanitized Unicode basename with canonical extension from verified MIME.
- Generated downloads use deterministic `renderlab-<kind>-<id-prefix>.<ext>` names rather than prompts/storage keys.
- v0.1 adds no Library-card Download or batch framework.

PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef` after implementation and documentation-finalized configured verification; `main` remained green.

## Durable Media Rename v0.1 Contract
UI-025 defines Rename as durable display identity, not file/storage mutation.

### Product behavior
- Media Viewer exposes `Rename` beside Download under secondary **Actions**.
- Rename changes only `media_assets.display_name` through `PATCH /api/media/assets/[assetId]`.
- Names remove control characters, collapse whitespace, must remain non-empty and are capped at 240 characters.
- Original uploaded filename, MIME, R2 storage key, generated provenance/prompt and Download filename semantics remain unchanged.
- Library search immediately discovers the new display name because `display_name` is already part of UI-023.
- The edit UI is feature-owned inline Viewer state; Rename and Download remain side-by-side while the form expands beneath them.
- v0.1 adds no Library-card rename, modal framework, global store, delete, batch actions, favorites/collections or database migration.

### Verified approval evidence
Final exact-head `70cbcc4daeafb9a48c0253df38796811d4cf4f03` passed UI Shell `33077320919`, Library Search `33077320839`, Persistent Media Upload `33077320935`, Media Download `33077320886`, Media Rename `33077321228`, and Library Lifecycle `33077320976`. Direct Supabase cleanup immediately before merge found `0` Rename fixtures, `0` Download fixtures, `0` lifecycle-named assets and `0` upload sessions. PR #12 merged as `d76f0ce30502e2aff2384dcd168f07b2184768a4`.

The configured Library lifecycle is serialized with `concurrency: renderlab-library-lifecycle-shared` and targets the exact durable asset ID returned by its own upload completion while separately asserting the expected human display name. Fixture-name uniqueness is not a correctness assumption.

## Library History Ordering v0.1 Contract
UI-027 defines the approved chronological history control.

- URL state is `sort=newest|oldest`; Newest first is canonical and omitted from clean links.
- Ordering is server-owned against durable `media_assets`; it is not client-only sorting of the current page.
- `created_at` and `id` use the same direction to keep pagination deterministic.
- Sort composes with `q`, All/Images/Videos, Clear and `offset`; changing sort drops stale offset.
- Pagination labels follow the active direction so `Newer` / `Older` remain truthful.
- The visible selector is feature-owned `LibrarySortMenu` composed from the maintained shadcn/Radix Dropdown Menu primitive.
- No schema migration, global client media store, relevance ranking, model/date filter console, Favorites/Collections, Delete or batch framework is introduced.

Implementation head `9cde5180acb932b255e956c0f257b0246c0e381c` passed Library History `33094977896`, UI Shell `33094977929`, Library Search `33094977911`, Library Lifecycle `33094977899`, Media Download `33094977913` after unchanged rerun, Media Rename `33094977895`, Create Lifecycle `33094977825`, and Persistent Media Upload Integration `33094978022`. Desktop Oldest, open Dropdown menu and mobile Newest screenshots were visually reviewed without unintended hierarchy drift. Direct Supabase verification found `0` history fixtures and `0` upload sessions.

Final exact documentation head `cae17cb2850f3a995bbe3d106669ce651e3e0aa1` passed UI Shell `33097006928`, Create Lifecycle `33097006913`, Persistent Media Upload Integration `33097007064`, Library Lifecycle `33097006853`, Library Search `33097007092`, Library History `33097006833`, Media Download `33097006968`, and Media Rename `33097006959`. PR #14 merged as `a7ecaa6a704e4378b31e694e5f21c5629920b520`; the merged `main` UI Shell run `33097463519` passed.

UI-030 ownership enforcement is complete in production and Favorites v0.1 / UI-031 is approved as the first owner-scoped personal-organization slice. Collections remains a separate future contract. Delete remains deliberately deferred until database/R2/reference-history cleanup plus recovery/tombstone semantics are defined.

## R2 Browser CORS State
The admin-capable R2 access-key credentials manage the exact-origin `renderlab-browser-uploads` rule through the S3 API for:
- `http://127.0.0.1:3000`
- `http://localhost:3000`
- `https://renderlab-lake.vercel.app`
- `https://renderlab-faresmohamed260-6733s-projects.vercel.app`
- `https://renderlab-git-main-faresmohamed260-6733s-projects.vercel.app`

Download uses product-route → signed-R2 top-level GET navigation. Rename is a server-side Supabase metadata mutation and introduces no R2 object write/move or new CORS requirement. History ordering is a server-side Supabase query concern and adds no R2/CORS requirement. Drag/drop reuses the same direct browser PUT origin policy as the approved Upload button and introduces no new CORS surface.

If a future user-facing production origin changes, add that exact origin before serving direct browser uploads there. Do not use broad wildcard CORS or replace direct-to-R2 transfers with an application-server proxy merely for convenience.

## Still Open in Phase 4
No Phase 4 product slice is active. Remaining follow-ups, in order:
- evaluate Collections only through a separate RenderLab-owned organization contract if/when that slice is explicitly selected;
- delete and batch management only after durable storage/reference/recovery semantics are explicit;
- other Library interaction enhancements only when separately justified.

Do not infer Saga organization/destructive-action schemas automatically. UI-030 is complete; future personal organization must continue using the verified account-private product boundary rather than global flags or legacy `studio_*` state.

## Infrastructure Cleanup Still Open
- Remove the transitional Studio compatibility adapter once no migration/debugging requirement depends on it.
- Keep capability definitions/native workflow defaults aligned as backend capability grows; do not expose controls merely because a worker accepts them.
- If the eventual public RenderLab origin differs from currently configured stable Vercel domains, add the exact origin to R2 CORS before direct browser upload use.

## Source of Truth
The `renderlab` repository is authoritative. ChatGPT Project context is secondary continuity context and current conversations are temporary working context.

See:
- `AGENTS.md`
- `docs/ui/UI_MIGRATION.md`
- `docs/ui/UI_DECISIONS.md`
- `docs/ui/SCREEN_REGISTRY.md`
- `docs/architecture/FRONTEND_ARCHITECTURE.md`
- `docs/architecture/INFRASTRUCTURE.md`
