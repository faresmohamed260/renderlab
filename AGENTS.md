# AI Development Instructions

This repository is developed with AI assistance across multiple independent sessions and tools. The repository itself is the persistent source of truth.

## Required Context
Before substantial frontend/UI work, read:
1. `PROJECT.md`
2. `docs/ui/UI_SYSTEM.md`
3. `docs/ui/UI_MIGRATION.md`
4. `docs/ui/COMPONENT_CATALOG.md`
5. `docs/ui/SCREEN_REGISTRY.md`
6. `docs/ui/UI_DECISIONS.md`

For architectural work also read `docs/architecture/FRONTEND_ARCHITECTURE.md`.

## Core Rule
Do not invent UI when an approved implementation already exists.

Priority:
1. Existing approved project component
2. Existing project primitive
3. Approved component library/registry
4. Adapt an existing component
5. Create a new component only as a last resort

## Existing UI Is Authoritative
Do not casually redesign approved components, introduce alternative styles, change typography hierarchy, spacing systems, colors, radii, interaction patterns, navigation, or responsive behavior unless explicitly required.

## Before Creating a Component
Search for an existing implementation, similar component, approved primitive, and approved registry component. Reuse or extend when possible.

## Design Tokens
Never introduce arbitrary visual values when a project token exists. Prefer tokens for colors, surfaces, spacing, typography, radii, shadows, control heights, breakpoints, animation timing, and z-index.

## UI Migration
Migration state is tracked in `docs/ui/UI_MIGRATION.md`. Do not restart or reinterpret the migration.

## Session Continuity
At the beginning of a task:
1. Inspect relevant source files.
2. Inspect relevant documentation.
3. Identify what already exists.
4. Continue from current state.

Missing conversation history does not mean the project has no existing decision.

## Documentation Updates
Durable decisions must update the appropriate source-of-truth file:
- approved reusable component → `COMPONENT_CATALOG.md`
- screen migration → `UI_MIGRATION.md`
- screen architecture → `SCREEN_REGISTRY.md`
- design-system rule → `UI_SYSTEM.md`
- important design decision → `UI_DECISIONS.md`

## Scope Discipline
When modifying one feature, avoid unrelated redesigns/refactors. Preserve working behavior unless changing it is required.

## Validation
For frontend changes:
1. Verify the application builds.
2. Verify affected routes render.
3. Check responsive behavior when relevant.
4. Inspect the rendered result.
5. Check reused components for regressions.

Compilation alone does not mean the UI task is complete.
