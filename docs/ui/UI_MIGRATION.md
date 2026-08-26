# UI Migration

## Objective
Migrate independently implemented UI into a reusable, registry-driven design system without rebuilding the application.

## Principles
- Preserve working behavior.
- Migrate one coherent surface at a time.
- Prefer reuse over replacement.
- Search before creating.
- Approve/document reusable results.
- Avoid unrelated redesign.
- Validate rendered UI.

## Phase 0 — Repository Governance
- [ ] Audit current frontend.
- [ ] Populate `COMPONENT_CATALOG.md` from real code.
- [ ] Populate `SCREEN_REGISTRY.md` from real routes.
- [ ] Populate `FRONTEND_ARCHITECTURE.md`.
- [ ] Record durable decisions in `UI_DECISIONS.md`.
- [ ] Confirm ChatGPT Project instructions point to `AGENTS.md`.

## Phase 1 — Foundation
- [ ] Identify styling systems.
- [ ] Define/normalize design tokens.
- [ ] Normalize UI primitives.
- [ ] Identify duplicate components.
- [ ] Establish approved external registries.
- [ ] Establish naming/folder conventions.

## Phase 2 — Application Shell
- [ ] Sidebar
- [ ] Top navigation
- [ ] Workspace shell
- [ ] Responsive layout
- [ ] Dialog system
- [ ] Toast system

## Phase 3 — Generation Workspace
- [ ] Prompt editor
- [ ] Model picker
- [ ] Generation settings
- [ ] Upload/reference media
- [ ] Generate controls
- [ ] Job progress
- [ ] Generation cards

## Phase 4 — Media
- [ ] Gallery
- [ ] Media viewer
- [ ] History
- [ ] Metadata
- [ ] Media actions

## Phase 5 — Secondary Screens
- [ ] Models
- [ ] Workflows
- [ ] Queue
- [ ] Settings

## Per-Surface Procedure
1. Audit existing implementation.
2. Identify reusable components.
3. Identify duplicated/problematic UI.
4. Search approved libraries/registries.
5. Choose smallest viable migration.
6. Implement without unrelated redesign.
7. Build and visually verify.
8. Check responsive behavior.
9. Mark reusable components `APPROVED`/`LOCKED`.
10. Update migration/catalog/screen docs.

## Current Work
**Current phase:** Phase 0 — Repository Governance  
**Current surface:** Not yet audited  
**Known blockers:** None recorded  
**Next recommended task:** Audit the existing frontend and populate repository-specific documentation without changing the visual UI.

## Session Handoff
Before ending meaningful migration work, update completed items, current phase/surface, blockers, and next recommended task.
