# RenderLab Product & UI Foundation

## Objective
Build RenderLab as a new, extensible application using the proven behavior, backend capabilities, product knowledge, and lessons from Saga as reference material while deliberately re-evaluating architecture and UX.

This is not a direct UI migration and not a visual reconstruction of Saga.

## Core Principles
- Saga is a reference implementation, not the RenderLab specification.
- Preserve proven behavior and backend knowledge where valuable; do not preserve flawed UI or architecture by default.
- Design for future ComfyUI capabilities without exposing backend complexity directly to average users.
- Simple by default, powerful when needed.
- Use progressive disclosure for advanced and model-specific controls.
- Organize the product around user goals rather than ComfyUI terminology or node graphs.
- Reuse approved RenderLab components before inventing alternatives.
- Prefer maintained approved component/interaction mechanics over rebuilding solved generic mechanics from scratch.
- Use real visual-design artifacts for exploration/verification when practical, while keeping repository documentation authoritative.
- Validate rendered UI, not only compilation.
- Record durable decisions in the repository.

## Phase 0 — Product & Capability Baseline
- [x] Audit the current Saga Studio frontend at a high level.
- [x] Confirm ChatGPT Project instructions point to repository governance and prioritize the repository as source of truth.
- [x] Document Saga's proven product behaviors and backend contracts worth carrying forward.
- [x] Document Saga UX and frontend architecture problems that should not be copied automatically.
- [x] Audit the production workflow registry and generation/orchestration capabilities currently represented in Saga.
- [x] Identify capability categories that RenderLab architecture should be able to represent later without requiring their immediate implementation.
- [x] Define the initial RenderLab workflow/capability domain model.
- [x] Define the boundary between default controls, contextual controls, advanced controls, and internal execution controls.
- [x] Define RenderLab information architecture from user goals rather than copying Saga routes.
- [x] Define the first production creation experience and which capabilities it exposes initially.
- [x] Populate `FRONTEND_ARCHITECTURE.md` with the chosen RenderLab architecture.
- [x] Record current durable product/UI decisions in `UI_DECISIONS.md`.

Capability/domain baseline: `docs/architecture/PRODUCT_CAPABILITIES.md`.  
Approved information architecture and actual screen status: `docs/ui/SCREEN_REGISTRY.md`.  
Approved frontend architecture: `docs/architecture/FRONTEND_ARCHITECTURE.md`.  
Shared/native infrastructure authority: `docs/architecture/INFRASTRUCTURE.md`.

## Phase 1 — Design & Frontend Foundation
- [x] Select and document the concrete frontend framework and routing approach.
- [x] Define initial semantic design tokens.
- [x] Establish initial typography, spacing, surfaces, color roles, radii, motion, and responsive rules.
- [x] Define approved external primitive/component sources and adoption policy.
- [x] Define the initial core RenderLab primitive roles.
- [x] Establish accessibility expectations.
- [x] Establish naming/folder conventions.
- [x] Define the initial application-shell direction.
- [x] Visually review and iterate the shell exploration.
- [x] Establish the component catalog/index and populate it from verified implementation.
- [x] Replace Figma as the ongoing design dependency with Penpot/open design handoff and document the visual design workflow.

## Phase 2 — Application Shell
- [x] Scaffold the Next.js/React/TypeScript/Tailwind application without importing Saga application code.
- [x] Implement primary desktop navigation.
- [x] Implement workspace shell and strict route-content/feature boundary.
- [x] Implement responsive desktop/mobile navigation behavior.
- [x] Implement account/activity utility affordances with accessible semantics.
- [x] Add GitHub-based production build and Playwright render validation with no Vercel preview dependency.
- [x] Validate approved routes: `/`, `/library`, `/library/[assetId]`, `/activity`, `/settings`.
- [x] Render and visually inspect desktop/mobile shell screenshots.
- [x] Promote `AppShell` to `APPROVED` after verified render review.

Deferred until a real interaction requires them:
- Dialog/sheet primitive
- Toast/notification primitive
- Route/global loading and error components

## Phase 3 — Creation Experience
The creation UI must be task-oriented and progressively disclose complexity.

### Design and product behavior
- [x] Establish open Create v0.2 desktop/mobile design handoff artifacts under `design/penpot/`.
- [x] Visually verify the revised narrow/mobile two-row composer.
- [x] Define prompt/composer direction.
- [x] Define Image/Video output selection and operation-resolution behavior.
- [x] Define reference/input media direction.
- [x] Define essential output-control direction using concrete values.
- [x] Define contextual-control direction.
- [x] Define Advanced-control disclosure direction.
- [x] Define automatic/internal model/workflow behavior for the default path.
- [x] Define Generate disabled/error states.
- [x] Define real job/runtime state rules: no fake percentage progress, preserve user work on errors, complete only after persistence.
- [x] Define initial persisted-result/continuation state direction in `design/penpot/create-v0.2-runtime-states.svg`.

### Create UI / product API implementation
- [x] Replace the Create route placeholder with `src/features/create/create-workspace.tsx`.
- [x] Implement prompt state and Image/Video output choice.
- [x] Implement essential aspect and video-duration state.
- [x] Implement responsive desktop/mobile composer layout.
- [x] Implement reference preview/removal/replacement behavior.
- [x] Implement reference-driven context: Image + reference → Edit; Video + reference → Animate.
- [x] Bind generation inputs through opaque temporary-source/media-asset identities instead of R2 keys.
- [x] Add `POST /api/generation/jobs`.
- [x] Add `GET /api/generation/jobs/[jobId]`.
- [x] Make Create poll real RenderLab job state after submission.
- [x] Preserve prompt/reference/settings on recoverable submission failures.
- [ ] Make transient polling/network failures retry with bounded backoff instead of abandoning tracking.
- [ ] Render the persisted output asset directly in Create after job success.
- [ ] Add capability-derived continuation actions to the persisted result.
- [ ] Implement Advanced controls from real capability definitions.

### Shared source/storage implementation
- [x] Apply `0001_generation_sources.sql` to shared Supabase project `AI Studio` (`rashyleshocuvpgcooxy`).
- [x] Keep RLS enabled and legacy `studio_*` tables separate.
- [x] Implement signed R2 reference upload ticket/completion APIs with server HEAD verification.
- [x] Verify real shared R2 + Supabase reference upload end-to-end.
- [x] Make the reference integration self-cleaning; verified zero fixture rows remain after completion.

### RenderLab-native generation implementation
- [x] Apply `0002_generation_jobs_media_assets.sql` to the shared Supabase project.
- [x] Create RenderLab-owned `generation_jobs` and `media_assets` tables with RLS enabled.
- [x] Create RenderLab-owned worker-fleet registry containing public routing metadata only.
- [x] Implement native server-side workflow resolution for Create Image, Edit Image, Create Video, and Animate Image.
- [x] Implement server-to-worker multipart submission.
- [x] Implement primary/standby submission routing.
- [x] Implement native job polling through the RenderLab product endpoint.
- [x] Implement RenderLab-owned R2 persistence and `media_assets` creation.
- [x] Mark jobs succeeded only after media persistence.
- [x] Add private media metadata/content/thumbnail product API boundaries.
- [x] Verify real native Create Image end-to-end in GitHub run `33021409151` / commit `2381d346f1c451af46d96b8da89d1f872f30adf1`.
- [x] Verify the real integration demonstrated primary→standby routing and `loading` → `generating` worker lifecycle before persistence.
- [x] Verify the real integration created a RenderLab media asset and R2 output, then self-cleaned its database/object fixture.
- [ ] Verify reference-driven Edit Image natively. **Current integration target; native-only Create+Edit workflow is running.**
- [ ] Verify text-to-video natively.
- [ ] Verify reference-driven Animate Image natively.
- [ ] Reintroduce proven safe poll-time reassignment only for strong no-execution evidence; never duplicate a possibly accepted generation on generic network/5xx failures.
- [ ] Remove the transitional Studio compatibility adapter after native operation coverage is sufficient.

### Validation
- [x] Default production build + Playwright UI/API checks pass without production credentials and show truthful unavailable states.
- [x] Configured reference integration passes automatically on relevant pushes.
- [x] Configured native Create Image integration passes automatically and self-cleans.
- [ ] Configured native Edit integration pass.
- [ ] Configured native Video/Animate integration pass.
- [ ] Final responsive Create review after persisted result UI and real backend lifecycle are visible.

Current Create status is `MIGRATING`, not `APPROVED`.

## Phase 4 — Media & Continuation
- [ ] Media library/gallery
- [ ] Media viewer
- [ ] Search/filter/history behavior
- [ ] Metadata presentation
- [ ] Favorites/collections or approved organizational model
- [ ] Media actions
- [ ] Continuation actions such as edit, animate, upscale, or other supported operations

The underlying RenderLab `media_assets` persistence and private delivery APIs now exist; Phase 4 product surfaces must build on these rather than legacy `studio_generations`.

## Phase 5 — Operational & Secondary Experiences
- [ ] Activity/jobs product surface backed by RenderLab `generation_jobs`
- [ ] Models/workflows if user-facing surfaces are justified
- [ ] Settings
- [ ] Additional capability-specific experiences approved during product design

## Feature/Surface Procedure
1. Establish the user goal and required behavior.
2. Inspect applicable RenderLab decisions and approved components.
3. Search the approved external component ecosystem before implementing generic mechanics from scratch.
4. Inspect Saga only when it provides useful behavioral/backend reference.
5. Inspect the relevant backend/workflow contract.
6. Decide which complexity belongs in the default experience and which should be contextual or advanced.
7. Use Penpot or repository-backed open SVG design artifacts when visual/interaction exploration reduces implementation churn.
8. Implement the smallest coherent experience that satisfies the approved product design.
9. Build and visually verify through the remote GitHub validation path.
10. Check responsive and accessibility behavior.
11. Update component/screen/decision documentation based on verified implementation.

## Current Work
**Current phase:** Phase 3 — Creation Experience implementation  
**Current status:** Shared source upload is verified. RenderLab now owns its generation jobs/media records and native orchestration path against the reused ComfyUI worker fleet. Real Create Image generation and persistence is verified end-to-end; the successful integration self-cleans after validating the persisted asset. Create polls real job state. Native-only Edit verification is now the active configured integration target.  
**Known blockers:** No credential blocker. Remaining work is implementation/verification: native Edit/Video/Animate coverage, persisted-result UI, resilient client polling, safe poll-time worker failover, Advanced controls, and final UX review.  
**Next recommended task:** Complete native Edit verification, then surface the persisted asset in Create and verify the resulting UI. After that, verify Video/Animate and reintroduce safe poll-time failover before considering Create approved.

## Session Handoff
Before ending meaningful work, update completed items, current phase/surface, blockers, and next recommended task. Documentation must describe verified reality rather than planned completion.
