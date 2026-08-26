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
- [ ] Define the initial core RenderLab primitive set and select concrete source implementations.
- [x] Establish accessibility expectations.
- [ ] Establish naming/folder conventions.
- [ ] Define application shell based on approved information architecture.
- [ ] Establish the RenderLab component catalog with actual components as they are implemented.

Visual/design-system authority: `docs/ui/UI_SYSTEM.md`.  
Working visual exploration: Figma `RenderLab Design System`, file key `PHqgsDctOsEXX4EFR0SS7i`. Figma is not the source of truth; approved rules must be reflected in the repository.  
Approved source policy: `docs/ui/COMPONENT_CATALOG.md`.

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
3. Search the approved external component ecosystem before implementing generic mechanics from scratch.
4. Inspect Saga only when it provides useful behavioral/backend reference.
5. Inspect the relevant backend/workflow contract.
6. Decide which complexity belongs in the default experience and which should be contextual or advanced.
7. Use Figma or another appropriate design tool for meaningful visual/interaction exploration when it reduces implementation churn.
8. Implement the smallest coherent experience that satisfies the approved product design.
9. Build and visually verify.
10. Check responsive and accessibility behavior.
11. Update component/screen/decision documentation based on verified implementation.

## Current Work
**Current phase:** Phase 1 — Design & Frontend Foundation  
**Current status:** Frontend architecture, approved component ecosystems, initial dark-first visual foundation, semantic token roles, typography, spacing, radii, control metrics, motion guidance, responsive principles, and accessibility baseline are documented. A working Figma foundation board has been created for visual exploration.  
**Known blockers:** None recorded.  
**Next recommended task:** Select the initial concrete primitive set from approved component ecosystems, define naming/folder conventions, and design the application shell in Figma before scaffolding implementation.

## Session Handoff
Before ending meaningful work, update completed items, current phase/surface, blockers, and next recommended task. Documentation must describe verified reality rather than planned completion.
