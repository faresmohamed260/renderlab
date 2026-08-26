# UI System

## Objective
Create a consistent, reusable, predictable UI system for a professional AI image/video creative workspace while avoiding unnecessary custom implementation and debugging of solved interaction patterns.

## Design Priorities
- Generated media
- Speed
- Clarity
- Dense but understandable controls
- Progressive disclosure
- Minimal visual noise
- Consistency
- High-quality direct manipulation and motion where it improves understanding

## Design Authority
1. Existing approved RenderLab component
2. Existing RenderLab primitive
3. Suitable component from an approved component ecosystem
4. Adapt/wrap an approved-source component
5. Compose a RenderLab-specific product component from approved primitives
6. New interaction mechanics from scratch only when necessary

Creating generic UI or complex motion mechanics from scratch is the final option.

## Approved Component Ecosystems

### shadcn/ui + Radix
Default foundation for accessible application primitives and conventional controls. Prefer for dialogs, menus, popovers, tabs, forms, inputs, selects, sheets, tooltips, toggles, and similar UI infrastructure.

### Motion for React
Approved animation and gesture engine. Use for custom product motion when the interaction cannot be satisfied cleanly by an existing component. Appropriate for layout transitions, gestures, drag, springs, shared spatial continuity, and reduced-motion-aware animation architecture.

### Motion Primitives
Preferred prebuilt source for application-friendly animated interaction patterns. Candidate patterns include Magnetic, Morphing Dialog, Morphing Popover, Transition Panel, Animated Group, Carousel, Disclosure, Toolbar, Progressive Blur, Spotlight, Tilt, and related primitives.

### Aceternity UI
Approved modern React/Tailwind motion source for selected interactive components and shadcn-compatible blocks. Evaluate components individually for application suitability, accessibility, performance, and visual fit; do not import marketing-page styling wholesale.

### Magic UI
Approved source for selected animated React/TypeScript/Tailwind/Motion components and effects. Its catalog is heavily oriented toward landing/marketing experiences, so application usage must be selective. Favor interaction patterns that support hierarchy/state rather than decorative spectacle.

### React Bits
Approved source for selected creative interactions and advanced components, including galleries, navigation, cards, morphing interactions, magnetic/physics-like effects, and other visually rich patterns. Evaluate performance, accessibility, reduced motion, and production suitability before adoption.

## Component Selection Rule
The approved sources are a toolkit, not a visual mandate. For each requirement:
1. Search approved RenderLab components first.
2. Search shadcn/Radix for conventional accessible UI.
3. Search Motion Primitives and Motion for interaction/motion requirements.
4. Search Aceternity UI, Magic UI, and React Bits for a suitable maintained implementation.
5. Adapt the best candidate to RenderLab tokens and interaction conventions.
6. Build from scratch only if existing options do not satisfy the product requirement.

Do not spend project time recreating magnetic behavior, morphing transitions, drag/gesture mechanics, dialogs, menus, carousels, or similar solved patterns without a documented reason.

## Adoption Requirements
An external/copy-owned component must be evaluated before becoming an approved RenderLab component:
- compatible with Next.js, React, TypeScript, and Tailwind as currently adopted;
- keyboard-accessible where interactive;
- screen-reader semantics appropriate to its role;
- reduced-motion handling for nonessential motion;
- responsive and touch-capable where relevant;
- acceptable performance and dependency cost;
- acceptable license/usage terms;
- adaptable to RenderLab tokens rather than retaining a competing visual system;
- appropriate for a production creative workspace.

Once adopted, record the local component/wrapper, source, purpose, and status in `COMPONENT_CATALOG.md` so future sessions reuse the same implementation instead of selecting a new library component.

## Component Statuses
- `EXPERIMENTAL` — still being designed
- `APPROVED` — default implementation; reuse it
- `LOCKED` — visually finalized; do not redesign without explicit instruction
- `DEPRECATED` — do not use for new work

## Reuse
Once an application-specific component is approved, it becomes authoritative. Prefer variants of shared components over page-specific duplicates.

External components become RenderLab components after adoption: normalize their API where useful, apply RenderLab tokens, and avoid scattering raw third-party variants throughout feature code.

## Tokens
Use project tokens for backgrounds, surfaces, borders, text, accents, status, spacing, radii, typography, control sizes, shadows, animation, and layout. Avoid arbitrary values.

## Interaction Consistency
Established actions must behave consistently: model selection, media actions, expansion, menus, tooltips, dialogs, confirmations, progress, loading states, drag/drop, and continuation actions.

## Hierarchy
Generated media is usually the primary visual focus. Controls should support rather than compete with it. Use progressive disclosure for advanced controls.

## Density
This is a desktop creative tool, not a marketing site. Prefer efficient density over oversized whitespace, headings, cards, controls, or padding.

## Motion & Direct Manipulation
Motion should communicate state, progress, hierarchy, navigation, spatial continuity, or direct manipulation—not decoration.

Modern motion patterns are encouraged when they make the product easier to understand or more tactile. Good candidates include:
- media card → viewer morphing/spatial continuity;
- reference media moving/snapping into input slots;
- contextual controls entering/exiting without layout confusion;
- Create operation transitions;
- drag/drop and reorder feedback;
- sheets/popovers/dialogs with coherent origin/destination motion;
- generation results entering the workspace without disruptive layout jumps.

Avoid persistent decorative motion, excessive glow/parallax, cursor effects that interfere with interaction, or stacking expensive visual effects merely to look modern.

Honor reduced-motion preferences and provide non-motion fallbacks for essential interactions.

## Responsive Design
Desktop is primary. Smaller layouts must remain functional without creating a separate visual language. Touch interactions must not depend on hover-only behavior.

## New Component Procedure
1. Search approved RenderLab components.
2. Search RenderLab primitives.
3. Search shadcn/ui and Radix.
4. Search Motion Primitives / Motion.
5. Search Aceternity UI.
6. Search Magic UI.
7. Search React Bits.
8. Compare suitable candidates for accessibility, maintenance, performance, and fit.
9. Adapt/wrap the selected implementation.
10. Only then create custom mechanics if no suitable implementation exists.
11. Record adopted components in `COMPONENT_CATALOG.md`.

## Default Meaning of UI Tasks
UI tasks are implementation problems by default, not invitations to invent new component mechanics. “Add X” means integrate X into the established RenderLab system using an approved component/source when possible unless redesign is explicitly requested.
