# UI System

## Objective
Create a consistent, reusable, predictable UI system for a professional AI image/video creative workspace while avoiding unnecessary custom implementation and debugging of solved interaction patterns.

## Design Direction
**Simple by default, powerful when needed.** RenderLab is a dark-first creative workspace where generated media is visually dominant and interface chrome stays restrained, tactile, and precise.

Initial design exploration is maintained in the Figma file `RenderLab Design System` (file key `PHqgsDctOsEXX4EFR0SS7i`). Figma is a working design/verification surface; this repository document is authoritative for approved design rules.

## Design Priorities
- Generated media first
- Speed and clarity
- Compact professional density
- Progressive disclosure
- Minimal visual noise
- Consistency
- High-quality direct manipulation and motion where it improves understanding
- Strong accessibility and touch/keyboard parity

## Semantic Color Foundation
Dark theme is the initial product theme. Values below are the initial approved baseline and may be tuned through visual implementation review without changing their semantic roles.

| Token | Initial value | Role |
|---|---:|---|
| `canvas` | `#090A0C` | application background |
| `surface-1` | `#111318` | primary panels/navigation |
| `surface-2` | `#171A20` | raised controls/cards |
| `surface-3` | `#20242C` | hover/selected/stronger elevation |
| `border` | `#2B303A` | default separation |
| `text` | `#F4F5F7` | primary text |
| `text-muted` | `#9CA3AF` | secondary/supporting text |
| `accent` | `#7C6CF2` | primary action, focus, active selection |
| `success` | `#3FBF8A` | successful/completed state |
| `warning` | `#D9A441` | attention/degraded state |
| `danger` | `#E06464` | destructive/error state |

Accent/status colors are semantic, not decoration. Do not flood large surfaces with accent color or use multiple competing brand accents.

## Typography
Initial UI typeface: **Inter** or its platform-appropriate bundled/web equivalent. Typography should be compact and functional rather than editorial/marketing-sized.

- Display: 36px / semibold — rare, major empty/onboarding moments only
- Page title: 28px / semibold
- Section heading: 20px / semibold
- Body: 15px / regular
- UI label: 13px / semibold
- Caption/metadata: 12px / regular

Avoid oversized headings and excessive weight. Prompts, media, and task state should command more attention than application chrome.

## Spacing
Base unit: **4px**.

Preferred spacing sequence: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.

Use semantic spacing roles in implementation rather than arbitrary pixel values. Creative surfaces should feel compact but not cramped.

## Shape & Radius
Preferred radius scale: `6, 8, 12, 16, 20px`.

- Small controls/chips: 6–8px
- Standard controls/cards: 8–12px
- Panels/media containers: 12–16px
- Large sheets/hero containers: up to 20px

Avoid pill-shaped treatment as a universal default. Pills are appropriate for tags, compact segmented states, or controls whose semantics benefit from them.

## Control Metrics
Preferred visual control heights: `32, 36, 40, 44px` depending on density and importance.

Interactive touch target: **44×44px minimum** where practical, including icon-only actions. A visually smaller control may use a larger hit area.

## Surfaces & Elevation
Prefer separation through tonal surfaces and borders before shadows. Shadows should be subtle in the dark UI and used primarily for floating layers such as dialogs, popovers, sheets, drag previews, and contextual overlays.

Do not build a card-within-card-within-card visual hierarchy. Group by spacing, alignment, and surface changes first.

## Motion
Motion communicates continuity, hierarchy, direct manipulation, and state.

Timing guidance:
- Micro feedback: **120–180ms**
- Standard UI transition: **180–260ms**
- Large spatial/morphing transition: **260–420ms**

Prefer spring/layout transitions for morphing, drag/drop, snapping, and spatial continuity. Prefer short easing for ordinary hover, disclosure, and feedback.

Good candidates:
- media card → viewer spatial continuity;
- reference media snapping/moving into input slots;
- contextual controls entering/exiting without layout confusion;
- Create operation transitions;
- drag/drop and reorder feedback;
- sheets/popovers/dialogs with coherent origin/destination motion;
- generation results entering without disruptive layout jumps.

Avoid persistent decorative motion, excessive glow/parallax, distracting cursor effects, or stacking expensive visual effects merely to look modern.

Always honor `prefers-reduced-motion`; essential state changes must remain understandable without animation.

## Responsive Rules
Desktop is primary, but responsive behavior is required from the start rather than retrofitted later.

- Wide desktop: allow creative workspace and supporting controls to coexist without excessive line lengths.
- Standard desktop/tablet landscape: compress secondary chrome before reducing media/workspace usefulness.
- Narrow/tablet portrait/mobile: move secondary controls into sheets/disclosures; preserve the prompt, current inputs, primary action, generation state, and result access.
- Never require hover for an essential action.
- Avoid a separate mobile product/navigation model unless evidence shows it is necessary.

Exact breakpoints will follow Tailwind defaults initially unless implementation evidence justifies project-specific breakpoints.

## Accessibility Baseline
Target WCAG 2.2 AA behavior for normal product UI.

Required:
- keyboard-operable interactive UI;
- visible focus treatment using the semantic accent/focus role;
- semantic HTML/Radix behavior for menus, dialogs, popovers, tabs, forms, and disclosures;
- text/status meaning must not depend on color alone;
- minimum touch targets as above;
- reduced-motion support;
- meaningful accessible names for icon-only controls;
- no hover-only essential actions;
- appropriate focus trapping/restoration for modal surfaces;
- sufficient text and control contrast;
- media controls usable by keyboard/touch where applicable.

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
1. Search approved RenderLab components first.
2. Search shadcn/Radix for conventional accessible UI.
3. Search Motion Primitives and Motion for interaction/motion requirements.
4. Search Aceternity UI, Magic UI, and React Bits for a suitable maintained implementation.
5. Adapt the best candidate to RenderLab tokens and interaction conventions.
6. Build from scratch only if existing options do not satisfy the product requirement.

Do not spend project time recreating magnetic behavior, morphing transitions, drag/gesture mechanics, dialogs, menus, carousels, or similar solved patterns without a documented reason.

## Adoption Requirements
An external/copy-owned component must be evaluated before becoming an approved RenderLab component:
- compatible with Next.js, React, TypeScript, and Tailwind;
- keyboard-accessible where interactive;
- screen-reader semantics appropriate to its role;
- reduced-motion handling for nonessential motion;
- responsive and touch-capable where relevant;
- acceptable performance and dependency cost;
- acceptable license/usage terms;
- adaptable to RenderLab tokens rather than retaining a competing visual system;
- appropriate for a production creative workspace.

Once adopted, record the local component/wrapper, source, purpose, and status in `COMPONENT_CATALOG.md`.

## Component Statuses
- `EXPERIMENTAL` — still being designed
- `APPROVED` — default implementation; reuse it
- `LOCKED` — visually finalized; do not redesign without explicit instruction
- `DEPRECATED` — do not use for new work

## Interaction Consistency
Established actions must behave consistently: model selection, media actions, expansion, menus, tooltips, dialogs, confirmations, progress, loading states, drag/drop, and continuation actions.

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
