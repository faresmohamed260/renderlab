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
Shared infrastructure authority: `docs/architecture/INFRASTRUCTURE.md`.

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

Visual/design-system authority: `docs/ui/UI_SYSTEM.md`.  
Visual workflow authority: `docs/ui/DESIGN_WORKFLOW.md`.  
Default richer design workspace: **Penpot when available**.  
Open repository handoff artifacts: `design/penpot/`.  
Historical design reference only: Figma `RenderLab Design System`, file key `PHqgsDctOsEXX4EFR0SS7i`.  
Approved source/component policy: `docs/ui/COMPONENT_CATALOG.md`.

## Phase 2 — Application Shell
- [x] Scaffold the Next.js/React/TypeScript/Tailwind application without importing Saga application code.
- [x] Implement primary desktop navigation.
- [x] Implement workspace shell and strict route-content/feature boundary.
- [x] Implement responsive desktop/mobile navigation behavior.
- [x] Implement account/activity utility affordances with accessible semantics.
- [x] Add GitHub-based production build and Playwright render validation with no Vercel preview dependency.
- [x] Validate approved routes: `/`, `/library`, `/library/[assetId]`, `/activity`, `/settings`.
- [x] Render and visually inspect 1440×1024 desktop and 390×844 mobile shell screenshots.
- [x] Promote `AppShell` to `APPROVED` after verified render review.

Deferred until a real interaction requires them:
- Dialog/sheet primitive
- Toast/notification primitive
- Route/global loading and error components

Verified shell implementation: `src/components/shell/app-shell.tsx`.

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

### Verified implementation
- [x] Replace the Create route placeholder with `src/features/create/create-workspace.tsx`.
- [x] Implement prompt state and Image/Video output choice.
- [x] Implement essential aspect and video-duration state.
- [x] Implement responsive desktop/mobile composer layout.
- [x] Introduce typed RenderLab generation domain contracts in `src/lib/capabilities/generation.ts`.
- [x] Introduce runtime generation request validation in `src/lib/api/generation-contract.ts`.
- [x] Add the stable application API boundary at `POST /api/generation/jobs`.
- [x] Add a server generation-adapter boundary using `RENDERLAB_GENERATION_BACKEND_URL` rather than direct browser-to-worker calls.
- [x] Keep Generate truthfully disabled when the environment has no configured backend instead of creating fake jobs/progress.
- [x] Preserve prompt/settings on recoverable submission failures.
- [x] Implement the reference upload/asset contract using opaque source IDs.
- [x] Implement direct signed R2 reference upload ticket/completion APIs with server-side HEAD verification.
- [x] Add `generation_sources` Supabase migration with RLS enabled and server-owned access intent.
- [x] Apply `0001_generation_sources.sql` to the explicitly approved shared Supabase project `AI Studio` (`rashyleshocuvpgcooxy`) as migration `renderlab_generation_sources`.
- [x] Verify `public.generation_sources` exists with RLS enabled and starts empty; legacy `studio_*` tables remain present and were not modified by the RenderLab migration.
- [x] Document the deliberate shared Supabase/R2 resource decision in `docs/architecture/INFRASTRUCTURE.md`.
- [x] Implement reference preview/removal/replacement behavior in Create.
- [x] Implement reference-driven Create context in the UI: Image + reference → Edit; Video + reference → Animate.
- [x] Bind generation inputs through `{ type: "temporary-source", id }` instead of R2 storage keys.
- [x] Pass production `next build` and Playwright Create/shell/API checks in GitHub Actions at CI run `33018346650` / commit `8332597f65aa85725f7395e10407dce4682ac025`.
- [x] Visually inspect the latest generated 1440×1024 Image/Video and 390×844 mobile Create screenshots after the reference-contract changes.

### Still open before Create can become APPROVED
- [ ] Configure shared Supabase/R2 environment values in the deployment/integration secret store.
- [ ] Verify a real signed reference upload end-to-end against the shared R2 bucket and `generation_sources` table.
- [ ] Validate configured reference-driven Edit/Animate submission end-to-end.
- [ ] Implement Advanced controls from real capability definitions.
- [ ] Connect a real generation backend adapter.
- [ ] Implement job-state synchronization after submission (polling/realtime decision remains open).
- [ ] Implement persisted result presentation and capability-derived continuation actions.
- [ ] Validate configured-backend generating/error/persisting/result states end-to-end.
- [ ] Review/refine final Create UX after real backend behavior is present.

Current Create status is `MIGRATING`, not `APPROVED`. See `SCREEN_REGISTRY.md` and `COMPONENT_CATALOG.md`.

## Phase 4 — Media & Continuation
- [ ] Media library/gallery
- [ ] Media viewer
- [ ] Search/filter/history behavior
- [ ] Metadata presentation
- [ ] Favorites/collections or approved organizational model
- [ ] Media actions
- [ ] Continuation actions such as edit, animate, upscale, or other supported operations

## Phase 5 — Operational & Secondary Experiences
Exact screens are not predetermined.
- [ ] Jobs/queue
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
**Current status:** The Create composer, typed generation boundary, reference-source upload/binding contract, and reference-driven Edit/Animate context are implemented. Shared infrastructure reuse is now explicit: RenderLab uses the existing AI Studio Supabase project and Saga/Studio R2 resource while maintaining RenderLab-owned contracts. The `generation_sources` migration is applied and verified. Create remains `MIGRATING`; configured end-to-end infrastructure execution has not yet been verified.  
**Known blockers:** Required server environment secrets are not available in the RenderLab integration/deployment context yet. A real generation adapter endpoint also remains to be connected.  
**Next recommended task:** Configure the exact Supabase/R2 server environment variables documented in `docs/architecture/INFRASTRUCTURE.md`, then perform a real signed reference upload. In parallel, establish `RENDERLAB_GENERATION_BACKEND_URL` so real generation submission can be validated before job synchronization and persisted-result presentation are added.

## Session Handoff
Before ending meaningful work, update completed items, current phase/surface, blockers, and next recommended task. Documentation must describe verified reality rather than planned completion.
