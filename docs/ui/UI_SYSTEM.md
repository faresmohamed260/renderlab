# UI System

## Objective
Create a consistent, reusable, predictable UI system for a professional AI image/video creative workspace.

## Design Priorities
- Generated media
- Speed
- Clarity
- Dense but understandable controls
- Progressive disclosure
- Minimal visual noise
- Consistency

## Design Authority
1. Existing approved project component
2. Existing project primitive
3. Approved component registry
4. Approved reference pattern
5. New custom implementation

Creating UI from scratch is the final option.

## Component Statuses
- `EXPERIMENTAL` — still being designed
- `APPROVED` — default implementation; reuse it
- `LOCKED` — visually finalized; do not redesign without explicit instruction
- `DEPRECATED` — do not use for new work

## Reuse
Once an application-specific component is approved, it becomes authoritative. Prefer variants of shared components over page-specific duplicates.

## Tokens
Use project tokens for backgrounds, surfaces, borders, text, accents, status, spacing, radii, typography, control sizes, shadows, animation, and layout. Avoid arbitrary values.

## Interaction Consistency
Established actions must behave consistently: model selection, media actions, expansion, menus, tooltips, dialogs, confirmations, progress, and loading states.

## Hierarchy
Generated media is usually the primary visual focus. Controls should support rather than compete with it. Use progressive disclosure for advanced controls.

## Density
This is a desktop creative tool, not a marketing site. Prefer efficient density over oversized whitespace, headings, cards, controls, or padding.

## Animation
Animation should communicate state, progress, hierarchy, navigation, or direct manipulation—not decoration.

## Responsive Design
Desktop is primary. Smaller layouts must remain functional without creating a separate visual language.

## New Component Procedure
1. Search project components.
2. Search project primitives.
3. Check approved catalogs/registries.
4. Consider extending an existing component with a variant.
5. Only then create something new.

## Default Meaning of UI Tasks
UI tasks are implementation problems by default, not design exercises. “Add X” means integrate X into the established system unless redesign is explicitly requested.
