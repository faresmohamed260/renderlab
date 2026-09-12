# UI System

## Objective
Create a consistent, reusable, predictable UI system for a professional AI image/video creative workspace while avoiding unnecessary custom implementation and debugging of solved interaction patterns.

## Design Direction
**Simple by default, powerful when needed.** RenderLab is a dark-first creative workspace where generated media is visually dominant and interface chrome stays restrained, tactile, and precise.

Ongoing visual design exploration uses **Penpot** as defined in `docs/ui/DESIGN_WORKFLOW.md`. This repository document remains authoritative for approved design rules. `docs/ui/VISUAL_NORTH_STAR.md` defines the higher visual-ambition and kinetic-approval standard when the user explicitly authorizes redesign of a named surface/system.

The previous Figma file `RenderLab Design System` (`PHqgsDctOsEXX4EFR0SS7i`) is historical reference only. It contains prior Foundation, Application Shell, and Create Experience explorations. Decisions already extracted from those designs and documented in the repository remain valid; future work must not depend on Figma access.

Design-tool explorations are not automatically `APPROVED` or `LOCKED`. They become authoritative only when the corresponding rules are accepted and documented here or in the appropriate repository file, and implemented surfaces still require rendered verification. A static design artifact cannot by itself approve a claimed kinetic/morphing/physics interaction; follow `DESIGN_WORKFLOW.md` for temporal evidence requirements.

## Design Priorities
- Generated media first
- Speed and clarity
- Compact professional density
- Progressive disclosure
- Minimal visual noise
- Consistency
- High-quality direct manipulation and motion where it improves understanding
- Strong accessibility and touch/keyboard parity

## Visual Quality Bar
RenderLab should feel like a **premium modern creative application**, not a default component-library demo or a generic admin dashboard. Maintained primitives are the accessibility/interaction foundation, not the visual ceiling.

- Compose approved mechanics with RenderLab-specific hierarchy, spacing, media treatment and spatial continuity.
- Prefer purposeful layout/shared-element transitions, morphing disclosures, direct-manipulation feedback, reference reordering motion and coherent result/state transitions when they improve understanding.
- A screen being clean and functional is necessary but not sufficient when the creative workflow would materially benefit from stronger interaction design.
- Do not add motion/effects merely because they are fashionable or available. Physics, glow, cursor response, parallax, canvas/WebGL, shaders, scroll choreography, and similar techniques are **not blanket prohibitions** in an explicitly authorized redesign; they must be justified by the accepted interaction, the target surface's expressiveness level, accessibility/reduced-motion behavior, performance cost, and media/task hierarchy defined in `VISUAL_NORTH_STAR.md`.
- `prefers-reduced-motion`, keyboard/touch parity, performance and accessibility remain non-negotiable. Every animated interaction needs a clear static/reduced-motion equivalent.

Cycle 4 established Kinetic Precision across the product and is complete/verified/merged/live. Its phase-specific effect limits remain historical constraints for those completed phases. A future explicit user-authorized redesign may reopen the named surface's visual composition/motion under `VISUAL_NORTH_STAR.md`; that does not reopen product, security, ownership, route, API, data, or engineering contracts unless separately authorized.

## Surface Expressiveness
Use the surface-specific ambition levels from `VISUAL_NORTH_STAR.md` when a redesign is explicitly authorized:

| Surface | Level | Default direction |
|---|---:|---|
| Landing | 4 / 4 | Highest-expression public showcase; richer choreography/graphics may be explored. |
| Create | 3 / 4 | Signature creative instrument; strong spatial continuity and tactility. |
| Library | 3 / 4 | Spatial media workspace; media-object continuity and direct manipulation. |
| Media Viewer | 3 / 4 | Cinematic inspection/continuation and contextual morphing. |
| Activity | 2 / 4 | Real-state-driven motion; active states may carry bounded energy. |
| Application Shell | 2 / 4 | Navigation continuity/tactility subordinate to feature content. |
| Settings | 1 / 4 | Calm trust/security hierarchy with brief useful transitions. |
| Admin | 1 / 4 | Operational clarity first. |

These are ceilings and ambition targets for redesign, not requirements to animate every element.

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

Do not build a card-within-card-within-card visual hierarchy. Group by spacing, alignment, and surface changes first. Within Create's unified composer, the bare prompt textarea does not draw its own focus rectangle; the composer's `:focus-within` border/glow is the visible focus boundary while textarea semantics and keyboard focus remain intact.

## Application Shell Direction
The repository implementation is authoritative. UI-074 / PR #188 established the current application-shell geometry: one compact horizontal application header across desktop and narrow layouts, with no persistent desktop left rail and no fixed mobile bottom dock. The shell is `APPROVED`, not `LOCKED`.

The header owns product/global navigation, account access, lightweight Activity/global-attention access and the route-content boundary. Create, Library, Activity, Settings and Admin continue to use the same route hierarchy and access rules; UI-074 changed presentation geometry only. Phase 24 / UI-075 does not alter shell ownership—it composes the approved Gallery Rail inside Library feature content.

### Shell/feature boundary
The persistent application shell owns:
- global/product navigation;
- compact product/route context where useful without duplicating feature headings;
- account access;
- lightweight access to Activity/global generation attention state;
- the route-content region.

The shell does **not** own:
- Create prompt/composer layout;
- operation/model controls;
- references/uploads;
- generation results;
- Library grids/cards or Gallery Rail controls;
- feature-specific toolbars or settings.

Those belong to their feature surfaces. Do not reintroduce page-specific shells, a permanent Create settings rail, or duplicate route chrome.

### Desktop
- Use one compact horizontal application header; do not restore a persistent desktop left rail.
- RenderLab/Create identity anchors the left side; Library, Activity and Settings/account access remain available in the established horizontal navigation hierarchy.
- Create and Library remain the primary product destinations; Activity and Settings remain utility destinations without requiring a second navigation surface.
- Main route content occupies the largest possible area and begins below the compact header; feature surfaces own their own context and controls.
- Avoid a redundant full-width route context bar when the feature already supplies its page context.
- Idle state should not show a persistent “ready” status pill. Global status becomes explicit only when a job, failure, degraded state or other meaningful attention condition exists.

### Mobile / narrow layouts
- Keep the same compact horizontal header model rather than introducing a separate bottom-dock navigation product.
- Do not add a fixed mobile bottom dock; Create, Library, Activity and Settings/account access remain reachable through the responsive header/utility composition.
- Preserve at least 44×44 effective touch targets for ordinary interactive controls where practical.
- Feature content owns its responsive controls, sheets/disclosures and safe-area spacing.
- Avoid reproducing desktop chrome vertically or hiding essential navigation behind hover-only behavior.

### Shell density targets
These are current design targets rather than immutable constants:
- compact application header: approximately 52–56px;
- primary navigation/control hit area: at least 44px effective touch height where practical;
- application chrome gaps: approximately 12–16px;
- no reserved desktop sidebar width and no fixed mobile bottom-navigation height.

Implementation may tune these values after rendered review while preserving the horizontal-header hierarchy, feature boundary, keyboard/touch semantics and reduced-motion equivalence.

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

For a signature redesign, transform before replace when that improves continuity: use geometry, clipping/masking, scale, shared layout, spatial movement, and depth as primary storytelling tools, with opacity as support rather than the whole language. A repeated fade + `translateY`, generic hover scale, or glow-only restyle does not by itself meet the 3/4 or 4/4 expressiveness target.

Avoid persistent decorative motion or expensive effects that compete with media/task focus. Richer effects are allowed only where the accepted redesign justifies them and they degrade cleanly under reduced motion/performance constraints.

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

Material additions such as GSAP, Lenis, canvas/WebGL/shader runtimes, or continuous pointer/physics systems are not pre-approved dependencies. They may be proposed only from a concrete accepted interaction/prototype, with dependency/performance rationale and a reduced-motion/static fallback recorded before production adoption.

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
UI work has two explicit modes:

- **Integration Mode — default:** “Add X” means integrate X into the established RenderLab system using approved components/mechanics without unrelated redesign.
- **Authorized Redesign Mode — explicit only:** if the user explicitly asks to redesign/restyle/modernize/reimagine/visually elevate a named surface/system, follow `VISUAL_NORTH_STAR.md` and `DESIGN_WORKFLOW.md`. The named surface's approved visual composition/styling/motion may be reopened, but product behavior, routes, API/data/ownership/security contracts, accessibility, and engineering/testing gates remain authoritative unless separately changed.

In Authorized Redesign Mode, design/prototype approval precedes production code for meaningful visual changes, and static screenshots alone cannot approve signature temporal behavior.

## Cycle 4 visual direction — Kinetic Precision
Cycle 4 deliberately raises the visual ceiling beyond the earlier restrained application baseline. The product remains media-first and professional, but visible atmosphere, depth and motion are now first-class parts of the RenderLab identity when they support clarity and creative flow.

### Signature visual language
- **Canvas:** near-black foundation with sparse violet/electric spectral light and deep falloff, not a flat uniform charcoal field.
- **Chrome:** translucent dimensional surfaces with backdrop separation, thin luminous/inner highlights and restrained elevation.
- **State:** selected/active UI may use shared-layout morphing and localized accent light rather than only static fills.
- **Tactility:** hover/press can use subtle scale/translation/spring response; touch and keyboard receive equivalent state/focus feedback.
- **Spatial continuity:** meaningful mode/route/disclosure/media transitions should preserve origin/destination relationships rather than hard-cutting when practical.
- **Media priority:** generated/uploaded media remains the strongest visual object. Effects recede around imagery and long-form text.

### Effect budget
Use visual effects in layers:
1. **Persistent ambient layer:** one low-frequency atmospheric treatment for the application canvas. Very low amplitude; no essential information.
2. **Shell/state layer:** glass, edge highlight, active-nav glow/morph. Visible but restrained.
3. **Interaction layer:** brief spring/press/hover/focus response on the element being manipulated.
4. **Feature hero moments:** richer morphing/depth only when a later feature phase explicitly approves it.

Do not stack every layer at maximum intensity on the same element. Avoid broad neon halos behind body text, rainbow borders, constant cursor followers, continuous particle physics or multiple competing animated backgrounds.

### Motion implementation rules
- Existing `motion/react` remains the default engine for discrete spring/shared-layout/presence behavior.
- Prefer transforms and opacity; avoid layout-thrashing animation of large surfaces.
- Continuous ambience should prefer CSS keyframes/transforms and must not require a permanent high-frequency JavaScript pointer/physics loop.
- Hover motion cannot be the only affordance. Touch/keyboard semantics remain complete.
- `prefers-reduced-motion` disables continuous ambience and collapses nonessential spatial movement to static/near-instant state changes.
- Preserve current timing guidance: micro feedback 120–180ms, standard transition 180–260ms, large/shared morph 260–420ms; spring response may settle naturally within the same perceived range.

### Phase 19 foundation target
The first implementation of this system belongs to `AppShell` and global semantic tokens. It should visibly change the application canvas, desktop/mobile navigation chrome, active navigation state and top-level route continuity while leaving feature data/behavior untouched. Later Cycle 4 phases extend the same language into Create, Library/Viewer and remaining user-facing surfaces.

### Phase 19 implemented foundation
The Kinetic Precision foundation is now implemented at the application-shell layer. `globals.css` owns semantic spectral/glass/elevation tokens and a CSS-only low-frequency ambient canvas. `AppShell` owns floating dimensional desktop/mobile chrome, Motion shared-layout selection and tactile press/hover response, plus a deliberately short 220ms top-level route entrance. Continuous ambience uses CSS transforms/opacity; there is no permanent JavaScript animation loop. `prefers-reduced-motion` removes ambience animation and transform-dependent route movement while retaining the full static composition. This visual layer is the baseline for subsequent Cycle 4 feature work; feature content should extend it rather than create a competing atmosphere.

### Cycle 4 Phase 20 sourcing note
Phase 20 should first compose the existing RenderLab primitives, Motion for React and Phase 19 Kinetic Precision tokens. Motion Primitives and React Bits are the preferred external mechanic sources when a maintained pattern materially improves the interaction. GSAP, Lenis, Watermelon UI, Kaikei.app and design-review/reference tools suggested for Cycle 4 remain optional evaluation candidates rather than default dependencies. Any actual adoption must satisfy the existing Adoption Requirements and be recorded in `COMPONENT_CATALOG.md`; visual inspiration alone does not justify another runtime or competing component system.

### Cycle 4 Phase 21 spatial-media target
Phase 21 applies Kinetic Precision to Library and Media Viewer. The target is a media-first spatial workspace: bounded card depth/tactility, clear static selection, safe card → Viewer perceptual continuity, a dimensional Viewer stage and spatial Compare source choreography. Existing server/URL state, durable media identity and product actions remain outside motion state. True cross-route shared-element motion is optional when safe; matched media geometry plus a bounded Viewer entrance is preferred over brittle navigation interception or global client route/media state. Reduced motion preserves the same hierarchy and comparison/selection meaning without tilt or transform-dependent continuity.

## Post-Cycle-4 Redesign Interpretation
Cycle 4's completed Phase 19–22 notes above document what was approved and implemented at that time. They are not a permanent global ceiling on future explicitly authorized visual R&D.

When the user starts a new authorized redesign:
- preserve the completed phase history rather than rewriting it;
- explicitly identify which named surface visual decisions are reopened;
- use `VISUAL_NORTH_STAR.md` to set the new ambition and expressiveness ceiling;
- require reference-driven design, complete concepts, interaction choreography, and temporal prototype evidence before production implementation for signature kinetic behavior;
- preserve all non-visual product/security/architecture/testing contracts unless separately changed;
- keep Motion for React as the default application runtime, and justify any additional runtime/effect system from an accepted interaction rather than from trend or novelty;
- do not mark the redesign complete because builds/tests pass if the implementation materially misses the accepted design/prototype.

This interpretation changes design governance only. It does not itself reopen a surface, create Phase 23/Cycle 5, adopt a dependency, modify product code, or authorize deployment.
