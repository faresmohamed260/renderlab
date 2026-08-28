# UI System

## Objective
Create a consistent, reusable, predictable UI system for a professional AI image/video creative workspace while avoiding unnecessary custom implementation and debugging of solved interaction patterns.

## Design Direction
**Simple by default, powerful when needed.** RenderLab is a dark-first creative workspace where generated media is visually dominant and interface chrome stays restrained, tactile, and precise.

Ongoing visual design exploration uses **Penpot** as defined in `docs/ui/DESIGN_WORKFLOW.md`. This repository document remains authoritative for approved design rules.

The previous Figma file `RenderLab Design System` (`PHqgsDctOsEXX4EFR0SS7i`) is historical reference only. It contains prior Foundation, Application Shell, and Create Experience explorations. Decisions already extracted from those designs and documented in the repository remain valid; future work must not depend on Figma access.

Design-tool explorations are not automatically `APPROVED` or `LOCKED`. They become authoritative only when the corresponding rules are accepted and documented here or in the appropriate repository file, and implemented surfaces still require rendered verification.

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

## Application Shell Direction
The shell structure originated in the historical Figma v0.2 exploration and has since been implemented, remotely built, and responsive-render reviewed. The repository implementation/documentation is now authoritative; the old design file is only supporting history. The shell is `APPROVED`, not `LOCKED`.

### Shell/feature boundary
The persistent application shell owns:
- global/product navigation;
- page/route context in compact chrome where useful;
- account access;
- lightweight access to Activity/global generation attention state;
- the route-content region.

The shell does **not** own:
- Create prompt/composer layout;
- operation/model controls;
- references/uploads;
- generation results;
- Library grids/cards;
- feature-specific toolbars or settings.

Those belong to their feature surfaces and are designed in the relevant later phase. The first historical shell exploration mixed shell and Create UI; the v0.2 refinement corrected that boundary before implementation.

### Desktop
- Persistent compact left navigation.
- `Create` and `Library` are visually primary destinations.
- `Activity` and `Settings` remain utility destinations and sit lower in the navigation hierarchy.
- Main route content occupies the largest possible area; navigation chrome stays narrow.
- A compact top bar carries route context plus account/activity affordances.
- Idle state should not show a persistent “ready” status pill. Global status becomes more explicit only when a job, failure, degraded state, or other meaningful attention condition exists.
- The shell must not reserve a permanent settings rail for Create.

### Mobile / narrow layouts
- Do not shrink the desktop sidebar into an unusable strip.
- Primary destinations use compact bottom navigation or an equivalent touch-friendly treatment.
- `Create`, `Library`, and `Activity` are the initial visible mobile destinations; Settings can remain reachable through account/utility UI unless later product evidence justifies a fourth persistent destination.
- Feature content owns its own responsive controls/sheets.
- Avoid reproducing the entire desktop chrome vertically.

### Shell density targets from the historical v0.2 design and verified implementation
These are design targets, not immutable constants:
- desktop sidebar: approximately 200–216px
- compact top bar: approximately 52–56px
- primary nav item height: approximately 40px with at least 44px effective touch target where relevant
- application chrome gaps: approximately 12–16px
- mobile top bar: approximately 56px
- mobile bottom navigation: approximately 56–64px plus device safe-area handling

Implementation may tune these values after rendered review while preserving the hierarchy and boundary above.

## Maintained Primitive Foundation
UI-026 makes the maintained primitive layer an implementation contract rather than a suggestion.

Current approved local primitives under `src/components/ui`:
- `Alert` / `AlertDescription`
- `AlertDialog` / action / cancel / content / description / title / trigger
- `Button`
- `Checkbox`
- `Collapsible` / trigger / content
- `DropdownMenu` / content / items / radio items
- `Empty` composition with heading-preserving `EmptyTitle`
- `Field` / `FieldLabel` / `FieldDescription` / `FieldError` / `FieldGroup`
- `Input`
- `Label`
- `NativeSelect`
- `Spinner`
- `Textarea`
- `Toggle` / `ToggleGroup` / `ToggleGroupItem`

The project is configured for shadcn **Radix Nova** through `components.json`. These files are RenderLab-owned wrappers/adaptations: shadcn/Radix supplies the maintained mechanics and accessibility model; RenderLab owns semantic tokens, variants, spacing, product-required semantic elements, and reviewed visual integration.

### Primitive purity contract
- Conventional visible feature/shell controls must use the approved shared primitive layer instead of raw hand-styled native controls.
- Raw visible `<button>`, `<select>`, `<textarea>`, and ordinary visible `<input>` are prohibited in `src/features` and `src/components/shell`.
- Native `file` and `hidden` inputs remain allowed as browser/form plumbing.
- Do not force a maintained component back into legacy DOM semantics merely to satisfy an old test. Verify the correct accessible behavior. A required single-choice Radix ToggleGroup, for example, is a `radiogroup` with checked `radio` items.
- When a wrapper needs RenderLab-specific spacing, semantic elements, or token mapping, fix the wrapper once rather than patching every feature instance.
- Do not locally override a primitive into a competing visual system unless the product requirement genuinely needs a new variant that belongs in the primitive.
- `npm run verify:ui-purity` is the CI enforcement gate for the native-control boundary.
- Shared primitive/config/package changes must retrigger dependent screen lifecycle workflows so a foundation change cannot bypass approved Create/Library/Viewer regressions.

## Primitive Growth
Add maintained primitives when the first real feature needs them; do not install a catalog preemptively.

### Foundation primitives — default shadcn/Radix candidates
- Button / IconButton
- Input / Textarea
- Select
- Dropdown Menu
- Popover
- Tooltip
- Dialog
- Sheet / Drawer
- Tabs or segmented selection primitive
- Switch / Checkbox
- Slider where a real workflow needs continuous numeric input
- Separator
- Scroll Area only where native overflow behavior is insufficient
- Command interface only when a searchable command/model/action surface is justified

### Feedback primitives
- Toast / Sonner-style notification
- Inline Alert
- Skeleton / loading placeholder
- Empty state composition
- Progress/status indicator driven by real job state

### Motion primitives — adopt only where interaction benefits
- layout/shared-element transition
- morphing dialog/popover
- disclosure/transition panel
- draggable/reorder interaction
- magnetic behavior only for deliberate tactile affordances, not ordinary buttons

Do not install every primitive up front. Add a primitive when the first real feature requires it, then normalize it into RenderLab tokens and record it.

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
- Narrow/tablet portrait/mobile: move secondary controls into sheets/disclosures; preserve the current task, primary action, generation state, and result access.
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
