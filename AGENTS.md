# AI Development Instructions

This repository is developed with AI assistance across multiple independent sessions and tools. The `renderlab` repository itself is the persistent and primary source of truth.

## Required Context
Before substantial project work, read:
1. `PROJECT.md`
2. `docs/ui/UI_MIGRATION.md`
3. `docs/ui/UI_DECISIONS.md`

For frontend/UI work also read the relevant current versions of:
- `docs/ui/UI_SYSTEM.md`
- `docs/ui/COMPONENT_CATALOG.md`
- `docs/ui/SCREEN_REGISTRY.md`

For architectural work also read `docs/architecture/FRONTEND_ARCHITECTURE.md`.

Do not fill unfinished documentation from assumptions. Verify repository state and relevant reference implementation/backend behavior first.

## Source-of-Truth Hierarchy
1. `renderlab` repository code and documentation
2. ChatGPT Project context for supplementary continuity and intent
3. Current chat session as temporary working context

If older Project/chat context conflicts with current repository documentation, follow the repository unless the user explicitly changes the decision.

## Fresh-Build Rule
RenderLab is a new application. The previous Studio implementation in `saga` is **reference material, not the RenderLab specification**.

Use Saga to understand:
- proven product behavior;
- backend/API contracts;
- generation and job lifecycle behavior;
- storage/persistence behavior;
- media actions and continuation flows;
- lessons learned and known problems.

Do not assume Saga's visual design, navigation, routes, component hierarchy, frontend architecture, or implementation patterns should be copied.

## Product UX Rule
**Simple by default, powerful when needed.**

RenderLab should support sophisticated and expanding ComfyUI capabilities without exposing that backend complexity directly to average users.

- Organize the product around user goals and understandable creative operations.
- Use sensible defaults.
- Reveal contextual controls only when relevant.
- Put advanced/model-specific controls behind progressive disclosure when appropriate.
- Do not mirror ComfyUI node graphs or technical workflow terminology into the default UI.
- ComfyUI is the generation engine, not the product interface.

## Capability Growth
Design internal contracts so new workflows, models, media inputs, parameters, outputs, continuation actions, and post-processing capabilities can be added without repeatedly redesigning the application.

This does not mean exposing every supported capability immediately. Product surfaces must remain curated and intuitive.

## Reuse Rule
Do not invent UI when an approved RenderLab implementation already exists.

Priority:
1. Existing approved RenderLab component
2. Existing RenderLab primitive
3. Approved component library/registry
4. Adapt an approved RenderLab component
5. Create a new component only when necessary

Saga/legacy components do not enter this priority automatically. They are references until deliberately approved or reimplemented for RenderLab.

## Approved UI Is Authoritative
During the fresh-build foundation phase, the old Saga design is not authoritative. Once a RenderLab component, pattern, or surface is explicitly approved and documented, do not casually redesign it, introduce competing styles, or change its interaction behavior without a product reason or explicit user request.

## Before Creating a Component
Search for an existing approved RenderLab implementation, similar component, approved primitive, and approved registry component. Reuse or extend when appropriate.

## Design Tokens
Once RenderLab tokens exist, never introduce arbitrary visual values when an appropriate project token exists. Prefer tokens for colors, surfaces, spacing, typography, radii, shadows, control heights, breakpoints, animation timing, and z-index.

## Foundation State
Current product/UI foundation state is tracked in `docs/ui/UI_MIGRATION.md`. Do not restart or reinterpret it from old conversation history. Update it when verified project state changes.

## Session Continuity
At the beginning of substantial work:
1. Inspect relevant repository documentation.
2. Inspect relevant source files.
3. Identify the current phase, completed work, open work, and constraints.
4. Use Project context only as supplementary continuity.
5. Continue from verified repository state.

Missing conversation history does not mean the project has no existing decision.

## Documentation Updates
Durable decisions must update the appropriate source-of-truth file. Examples:
- approved reusable component → `COMPONENT_CATALOG.md`
- foundation/migration progress → `UI_MIGRATION.md`
- screen/information architecture → `SCREEN_REGISTRY.md`
- design-system rule → `UI_SYSTEM.md`
- important product/UI decision → `UI_DECISIONS.md`
- frontend architecture → `FRONTEND_ARCHITECTURE.md`

Update existing authoritative documentation rather than creating competing sources of truth.

## Scope Discipline
Follow the user's requested scope precisely. Do not redesign, migrate, refactor, deploy, or expand scope merely because it seems useful. Preserve approved RenderLab behavior unless changing it is required.

## Validation
For frontend changes:
1. Verify the application builds.
2. Verify affected routes/surfaces render.
3. Check responsive behavior when relevant.
4. Inspect the rendered result.
5. Check reused components for regressions.
6. Confirm documentation reflects verified reality.

Compilation alone does not mean the UI task is complete.
