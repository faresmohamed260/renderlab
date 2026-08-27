# RenderLab Product & UI Foundation

## Objective
Build RenderLab as a new, extensible application using proven behavior, backend capabilities, product knowledge, and lessons from Saga as reference material while deliberately re-evaluating architecture and UX. This is not a direct UI migration or visual reconstruction of Saga.

## Core Principles
- Saga is a reference implementation, not the RenderLab specification.
- Preserve proven behavior/backend knowledge where valuable; do not preserve flawed UI or architecture by default.
- Design for future ComfyUI capabilities without exposing backend complexity directly to average users.
- Simple by default, powerful when needed.
- Use progressive disclosure for advanced/model-specific controls.
- Organize the product around user goals rather than ComfyUI terminology or node graphs.
- Reuse approved RenderLab components before inventing alternatives.
- Prefer maintained approved component/interaction mechanics over rebuilding solved generic mechanics from scratch.
- Use real visual-design artifacts for exploration/verification when practical, while keeping repository documentation authoritative.
- Validate rendered UI, not only compilation.
- Record durable decisions in the repository.

## Phase 0 — Product & Capability Baseline
- [x] Audit Saga Studio at a high level and document proven behavior/backend contracts.
- [x] Document Saga UX/frontend problems that should not be copied automatically.
- [x] Audit production workflows and capability categories.
- [x] Define RenderLab workflow/capability domain model and progressive-disclosure boundaries.
- [x] Define goal-oriented information architecture and initial creation experience.
- [x] Establish frontend architecture and durable product/UI decisions.

Authorities: `docs/architecture/PRODUCT_CAPABILITIES.md`, `docs/ui/SCREEN_REGISTRY.md`, `docs/architecture/FRONTEND_ARCHITECTURE.md`, `docs/architecture/INFRASTRUCTURE.md`.

## Phase 1 — Design & Frontend Foundation
- [x] Select/document framework and routing.
- [x] Establish semantic design tokens, typography, spacing, surfaces, colors, radii, motion, responsive and accessibility rules.
- [x] Define approved component ecosystems and sourcing policy.
- [x] Establish naming/folder conventions and component catalog.
- [x] Define/review the application-shell direction.
- [x] Replace Figma as ongoing dependency with Penpot/open SVG design handoff.

## Phase 2 — Application Shell
- [x] Scaffold fresh Next.js/React/TypeScript/Tailwind application.
- [x] Implement responsive application shell/navigation and route-content boundary.
- [x] Add GitHub production-build + Playwright render validation.
- [x] Validate `/`, `/library`, `/library/[assetId]`, `/activity`, `/settings`.
- [x] Visually inspect responsive shell screenshots and promote `AppShell` to `APPROVED`.

## Phase 3 — Creation Experience
The creation UI is task-oriented and progressively discloses complexity.

### Design and product behavior
- [x] Establish open Create v0.2 desktop/mobile/runtime design artifacts under `design/penpot/`.
- [x] Visually verify revised narrow/mobile two-row composer.
- [x] Define prompt/composer, Image/Video selection, reference-driven Edit/Animate resolution, essential values, contextual controls, Advanced disclosure, and automatic model/workflow behavior.
- [x] Define truthful disabled/error/runtime states: no fake progress, preserve user work on recoverable errors, complete only after persistence.
- [x] Establish and review `design/penpot/create-v0.3-advanced.svg` for the compact desktop/mobile Advanced disclosure.

### Create UI / product API implementation
- [x] Replace Create placeholder with `src/features/create/create-workspace.tsx`.
- [x] Implement prompt, Image/Video, aspect, duration, responsive composer, reference preview/removal/replacement, and reference-driven context.
- [x] Bind generation inputs through opaque temporary-source/media-asset identities rather than R2 keys.
- [x] Add `POST /api/generation/jobs` and `GET /api/generation/jobs/[jobId]`.
- [x] Make Create submit and poll real RenderLab job state.
- [x] Preserve prompt/reference/settings on recoverable submission failures.
- [x] Retry transient polling/network failures with bounded backoff; PR #2 passed production build + Playwright validation before merge.
- [x] Render persisted output directly in Create after success through `GET /api/media/assets/[assetId]`; PR #1 passed production build + Playwright checks before merge.
- [x] Add capability-derived continuation actions to persisted image results: **Edit** and **Animate** bind the durable result as a `media-asset` input. PR #3 passed validation and the live continuation path was verified in run `33027460976`.
- [x] Implement Advanced controls from verified capability definitions. PR #6 uses normalized Radix Collapsible plus feature-owned form composition and exposes negative prompt, seed, steps, guidance, and video-only frame rate. Run `33030364272` passed production build, behavior checks, and reviewed desktop/mobile screenshots before merge.

### Shared source/storage implementation
- [x] Apply `0001_generation_sources.sql` to shared Supabase project `AI Studio` (`rashyleshocuvpgcooxy`) with RLS enabled.
- [x] Keep legacy `studio_*` tables separate.
- [x] Implement signed R2 reference upload ticket/completion APIs with server HEAD verification.
- [x] Verify real shared R2 + Supabase reference upload end-to-end and self-clean fixtures.

### RenderLab-native generation implementation
- [x] Apply `0002_generation_jobs_media_assets.sql` to shared Supabase.
- [x] Create RenderLab-owned `generation_jobs` and `media_assets` with RLS enabled.
- [x] Create RenderLab worker-fleet registry with public routing metadata only.
- [x] Implement native workflow resolution for Create Image, Edit Image, Create Video, Animate Image.
- [x] Implement server-to-worker multipart submission and primary/standby submission routing.
- [x] Implement native job polling through RenderLab product API.
- [x] Implement RenderLab-owned R2 persistence and `media_assets` creation.
- [x] Mark jobs succeeded only after durable media persistence.
- [x] Add private media metadata/content/thumbnail APIs.
- [x] Verify native Create Image end-to-end; persisted asset/R2 output validated and fixture self-cleaned.
- [x] Verify native reference-driven Edit Image end-to-end — GitHub run `33021843503`.
- [x] Verify native Create Video and native reference-driven Animate Image end-to-end — GitHub run `33021977765`.
- [x] Verify durable media-asset continuation (`Create Image → persisted media asset → Edit Image`) — GitHub run `33027460976`, self-cleaning.
- [x] Implement conservative poll-time worker reassignment. Only explicit credit exhaustion or explicit worker-unavailable evidence is safe to reassign; generic 429/5xx/network ambiguity never triggers duplicate-risk automatic resubmission. PR #5 passed validation and post-merge live regression run `33027861292` succeeded.
- [ ] Remove transitional Studio compatibility adapter after migration/debugging dependence is no longer needed.

### Validation
- [x] Default production build + Playwright UI/API checks pass without production credentials and show truthful unavailable states.
- [x] Configured reference integration passes automatically and self-cleans.
- [x] Configured native Create Image/Edit continuation integration passes and self-cleans.
- [x] Configured native Video + Animate integration passes and self-cleans.
- [x] Advanced desktop/mobile disclosure is rendered/tested and visually reviewed in GitHub CI run `33030364272`.
- [x] Final configured Create lifecycle review completed in GitHub Actions run `33031817744`: one real Create Image generation was submitted through the browser, persisted, rendered at desktop/mobile widths, exposed **Edit**/**Animate**, transitioned into **Edit** using the durable asset, captured desktop/mobile continuation states, and self-cleaned its R2/media/job fixture.

**Create status: `APPROVED`.** Phase 3 is complete. The Studio compatibility adapter is a separate infrastructure cleanup item and is not part of Create's visual/product approval.

## Phase 4 — Media & Continuation
**Current phase.** Library and Media Viewer must build on RenderLab-owned `media_assets` plus the existing capability-derived continuation model.

- [ ] Media library/gallery
- [ ] Media viewer
- [ ] Search/filter/history behavior
- [ ] Metadata presentation
- [ ] Favorites/collections or approved organizational model
- [ ] Media actions
- [ ] Continuation actions across Library/Media Viewer and future supported operations

Create already supports persisted-result Edit/Animate continuation. Phase 4 must reuse that capability model rather than create separate hard-coded action logic.

Underlying RenderLab `media_assets` persistence and private delivery APIs already exist; Phase 4 surfaces must build on them rather than legacy `studio_generations`.

## Phase 5 — Operational & Secondary Experiences
- [ ] Activity/jobs surface backed by RenderLab `generation_jobs`
- [ ] Models/workflows if user-facing surfaces are justified
- [ ] Settings
- [ ] Additional capability-specific experiences approved during product design

## Feature/Surface Procedure
1. Establish the user goal and required behavior.
2. Inspect applicable RenderLab decisions/components.
3. Search approved external component ecosystem before implementing generic mechanics from scratch.
4. Inspect Saga only when useful as behavioral/backend reference.
5. Inspect the relevant backend/workflow contract.
6. Decide default vs contextual vs advanced complexity.
7. Use Penpot or repository-backed SVG artifacts when visual exploration reduces implementation churn.
8. Implement the smallest coherent approved experience.
9. Build and visually verify through GitHub.
10. Check responsive/accessibility behavior.
11. Update authoritative documentation from verified implementation.

## Current Work
**Current phase:** Phase 4 — Media & Continuation  
**Current status:** `AppShell` and Create are `APPROVED`. Core generation, persistence, continuation, polling recovery, conservative worker failover and Advanced controls are verified. The configured real-lifecycle visual gate is repeatable through `scripts/verify-create-lifecycle.mjs` and `.github/workflows/create-lifecycle-visual.yml`. Library, Media Viewer and broader media organization/actions remain unimplemented beyond route placeholders.  
**Known blockers:** No credential blocker.  
**Next recommended task:** Audit the current `media_assets` contract and proven Saga Library behavior, define the smallest RenderLab Library/Media Viewer experience consistent with UI-010, then create reviewed desktop/mobile design handoff before implementation. The Studio compatibility fallback can be removed separately once no migration/debugging need remains.

## Session Handoff
Before ending meaningful work, update completed items, current phase/surface, blockers, and next recommended task. Documentation must describe verified reality rather than planned completion.
