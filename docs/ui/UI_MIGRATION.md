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
- [ ] Populate `FRONTEND_ARCHITECTURE.md` with the chosen RenderLab architecture once framework/routing decisions are verified.
- [x] Record current durable product/UI decisions in `UI_DECISIONS.md`.

Capability/domain baseline: `docs/architecture/PRODUCT_CAPABILITIES.md`.  
Approved information architecture and planned surfaces: `docs/ui/SCREEN_REGISTRY.md`.

## Phase 1 — Design & Frontend Foundation
- [ ] Select and document the concrete frontend framework and routing approach.
- [ ] Define design tokens.
- [ ] Establish typography, spacing, surfaces, color roles, radii, motion, and responsive rules.
- [ ] Define core UI primitives and approved component sources.
- [ ] Establish accessibility expectations.
- [ ] Establish naming/folder conventions.
- [ ] Define application shell based on approved information architecture.
- [ ] Establish the RenderLab component catalog with only deliberately approved components.

## Phase 2 — Application Shell
Exact surfaces depend on the approved information architecture.
- [ ] Primary navigation
- [ ] Workspace shell
- [ ] Responsive navigation/layout
- [ ] Dialog/sheet system
- [ ] Toast/notification system
- [ ] Global loading/error conventions

## Phase 3 — Creation Experience
The creation UI must be task-oriented and progressively disclose complexity.
- [ ] Prompt/composer experience
- [ ] Task/mode selection where needed
- [ ] Reference/input media
- [ ] Essential output controls
- [ ] Contextual workflow controls
- [ ] Advanced controls
- [ ] Model/workflow selection only where it provides user value
- [ ] Generate controls
- [ ] Job/progress feedback
- [ ] Output and continuation actions

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
3. Inspect Saga only when it provides useful behavioral/backend reference.
4. Inspect the relevant backend/workflow contract.
5. Decide which complexity belongs in the default experience and which should be contextual or advanced.
6. Implement the smallest coherent experience that satisfies the approved product design.
7. Build and visually verify.
8. Check responsive and accessibility behavior.
9. Update component/screen/decision documentation based on verified implementation.

## Current Work
**Current phase:** Phase 1 — Design & Frontend Foundation  
**Current status:** Phase 0 product baseline is complete except for frontend architecture details that depend on the framework/routing selection. Initial IA is Create + Library as primary destinations, with Activity and Settings as utilities and Media Viewer contextual. The initial Create workspace covers Create Image, Edit Image, Create Video, and Animate Image through contextual operation resolution and progressive disclosure.  
**Known blockers:** None recorded.  
**Next recommended task:** Select the concrete frontend framework/routing approach, document the architecture, then establish the design-system foundation and application shell around the approved IA.

## Session Handoff
Before ending meaningful work, update completed items, current phase/surface, blockers, and next recommended task. Documentation must describe verified reality rather than planned completion.
