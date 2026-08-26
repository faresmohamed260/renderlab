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
Approved information architecture and planned surfaces: `docs/ui/SCREEN_REGISTRY.md`.  
Approved frontend architecture: `docs/architecture/FRONTEND_ARCHITECTURE.md`.

## Phase 1 — Design & Frontend Foundation
- [x] Select and document the concrete frontend framework and routing approach.
- [x] Define initial semantic design tokens.
- [x] Establish initial typography, spacing, surfaces, color roles, radii, motion, and responsive rules.
- [x] Define approved external primitive/component sources and adoption policy.
- [x] Define the initial core RenderLab primitive roles. Concrete package/source adoption is deferred until the first implementation requires each primitive.
- [x] Establish accessibility expectations.
- [x] Establish naming/folder conventions.
- [x] Define the initial application-shell direction from the approved information architecture.
- [x] Visually review and iterate the shell exploration in the historical Figma artifact.
- [x] Establish the component catalog/index and begin populating them from verified implementation.
- [x] Replace Figma as the ongoing design dependency with Penpot/open design handoff and document the visual design workflow.

Visual/design-system authority: `docs/ui/UI_SYSTEM.md`.  
Visual workflow authority: `docs/ui/DESIGN_WORKFLOW.md`.  
Default ongoing design workspace: **Penpot when available**.  
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

Deferred until a real interaction requires them; do not install speculative primitives merely to close a checklist:
- Dialog/sheet primitive
- Toast/notification primitive
- Route/global loading and error components

Verified shell implementation: `src/components/shell/app-shell.tsx`.  
Remote validation: `.github/workflows/ui-shell.yml` + `tests/ui/shell.spec.ts`.

## Phase 3 — Creation Experience
The creation UI must be task-oriented and progressively disclose complexity.
- [x] Establish an open Create v0.2 design handoff before feature implementation. Desktop states are versioned in `design/penpot/create-v0.2-desktop.svg`; revised mobile state is versioned in `design/penpot/create-v0.2-mobile.svg`.
- [x] Visually verify the revised narrow/mobile two-row composer from the open SVG handoff. It resolves the v0.1 clipping/competition issue and keeps Generate as a clear full-width primary action.
- [x] Define prompt/composer direction: one focused prompt surface with compact task-relevant controls and Generate action.
- [x] Define operation selection/resolution behavior: explicit Image/Video output choice; compatible references resolve Edit/Animate context.
- [x] Define reference/input media interaction direction: add reference from the composer; attached reference communicates resolved context and can be removed/replaced.
- [x] Define essential output-control direction: show concrete current values such as `1:1`, `16:9`, and `5 s` rather than abstract setting-category labels.
- [x] Define contextual-control direction: only controls relevant to the current output/operation remain on the primary surface.
- [x] Define advanced-control disclosure direction: technical/model-specific tuning stays behind Advanced rather than becoming a permanent secondary settings panel.
- [x] Define model/workflow default behavior: automatic/internal unless an explicit model choice provides concrete user value.
- [ ] Define Generate disabled/error states.
- [ ] Define real job/progress feedback in the Create flow.
- [ ] Define output and continuation actions.
- [ ] Implement the smallest approved Create slice after state-design review.
- [ ] Build and visually verify desktop/mobile implementation.

The open SVG handoff is deliberately importable into Penpot but does not require Penpot automation to remain useful. Repository documentation is authoritative; Penpot is an optional richer editing workspace, not a critical-path dependency. Historical Figma work remains reference only.

Durable Create decisions are recorded in `docs/ui/UI_DECISIONS.md` as UI-015 through UI-017.

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
7. Use Penpot or repository-backed open SVG design artifacts for meaningful visual/interaction exploration when it reduces implementation churn; follow `DESIGN_WORKFLOW.md`.
8. Implement the smallest coherent experience that satisfies the approved product design.
9. Build and visually verify through the remote GitHub validation path.
10. Check responsive and accessibility behavior.
11. Update component/screen/decision documentation based on verified implementation.

## Current Work
**Current phase:** Phase 3 — Creation Experience design  
**Current status:** Phase 2 shell is approved. Create v0.2 now has open, versioned desktop/mobile design handoff artifacts under `design/penpot/`. The revised mobile two-row composer has been independently rendered and visually reviewed, so Penpot/Figma connector availability is no longer a design-approval blocker. No Create feature implementation has begun yet.  
**Known blockers:** None recorded.  
**Next recommended task:** Define Generate disabled/error states, real job/progress feedback, and result/continuation behavior using the same open visual-handoff workflow. Then implement the smallest reviewed Create slice and verify it through GitHub Actions + Playwright screenshots.

## Session Handoff
Before ending meaningful work, update completed items, current phase/surface, blockers, and next recommended task. Documentation must describe verified reality rather than planned completion.
