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
- Use real design tools for visual exploration/verification when practical, while keeping repository documentation authoritative.
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
- [x] Visually review and iterate the shell exploration in Figma.
- [x] Establish the component catalog/index and begin populating them from verified implementation.

Visual/design-system authority: `docs/ui/UI_SYSTEM.md`.  
Working visual exploration: Figma `RenderLab Design System`, file key `PHqgsDctOsEXX4EFR0SS7i`.  
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
Latest verified shell CI commit: `e0e24a08b18d1c0964bd6dd60f93aeaa1d395752` (successful production build + responsive Playwright checks).  
The component was subsequently filename-normalized to match the documented kebab-case convention; the post-normalization CI run also passed.

## Phase 3 — Creation Experience
The creation UI must be task-oriented and progressively disclose complexity.
- [ ] Design the default Create experience in Figma before feature implementation. v0.2 desktop states are visually reviewed; final mobile v0.2 review remains blocked by the Figma Starter MCP call limit.
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
- [ ] Implement the smallest approved Create slice after design review.
- [ ] Build and visually verify desktop/mobile implementation.

Figma Create exploration currently contains v0.1 and refined v0.2 states for default Image, reference-driven Edit, Video, and mobile. Desktop v0.2 states were visually inspected. The v0.1 mobile review exposed toolbar clipping/competition between controls and Generate; v0.2 was revised to a two-row mobile composer with Generate separated from compact settings. The v0.2 mobile frame exists in Figma, but its final screenshot could not be retrieved because the Figma Starter MCP tool-call limit was reached. Do not mark the Create design approved or begin implementation until that responsive state is visually verified.

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
7. Use Figma or another appropriate design tool for meaningful visual/interaction exploration when it reduces implementation churn.
8. Implement the smallest coherent experience that satisfies the approved product design.
9. Build and visually verify through the remote GitHub validation path.
10. Check responsive and accessibility behavior.
11. Update component/screen/decision documentation based on verified implementation.

## Current Work
**Current phase:** Phase 3 — Creation Experience design  
**Current status:** Phase 2 shell is approved. Create v0.2 establishes the current desktop design direction and the durable product rules for output selection, reference-driven context, concrete essential values, and progressive disclosure. Desktop v0.2 states are visually reviewed. The final v0.2 mobile screenshot has not been reviewed because the Figma Starter MCP call limit is currently exhausted. No Create feature implementation has begun.  
**Known blockers:** Figma Starter MCP tool-call limit prevents final responsive visual verification of the existing Create v0.2 mobile frame. This is a design-approval blocker, not an application/runtime blocker.  
**Next recommended task:** When Figma MCP access is available, retrieve and inspect Create v0.2 mobile (`8:125`). If it passes, record the Create design candidate as reviewed and continue with Generate states, job/progress, and result/continuation design before implementing the first approved Create slice. Do not bypass the responsive visual checkpoint by treating the unreviewed mobile frame as approved.

## Session Handoff
Before ending meaningful work, update completed items, current phase/surface, blockers, and next recommended task. Documentation must describe verified reality rather than planned completion.
