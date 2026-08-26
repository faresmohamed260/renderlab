# Component Catalog

Authoritative index of reusable RenderLab UI components and approved external component sources. Populate actual RenderLab components from the repository, not assumptions.

## Statuses
`EXPERIMENTAL`, `APPROVED`, `LOCKED`, `DEPRECATED`

## Approved External Sources
These sources are approved defaults to search before implementing reusable UI mechanics from scratch.

### shadcn/ui + Radix
**Role:** Foundational accessible application primitives.  
**Default uses:** buttons, inputs, selects, dialogs, sheets, dropdown menus, popovers, tabs, tooltips, command interfaces, forms, toggles, navigation primitives, and other standard application controls.  
**Policy:** First external stop for conventional UI primitives. Adapt styling to RenderLab tokens rather than creating competing primitive implementations.

### Motion for React
**Role:** Core motion/gesture engine for custom interaction behavior and for components adopted from motion-oriented registries.  
**Default uses:** layout transitions, springs, gestures, drag, shared-layout transitions, enter/exit animation, direct manipulation, and motion orchestration.  
**Policy:** Prefer established Motion patterns over hand-written animation/gesture engines. Respect reduced-motion preferences and avoid decorative motion without product value.

### Motion Primitives
**Role:** Reusable motion-first application components and interaction patterns.  
**Default uses:** magnetic interactions, morphing dialogs/popovers, transition panels, animated toolbars, tilt, progressive blur, text/number transitions, and other polished interaction mechanics.  
**Policy:** Search early when the requested interaction is fundamentally about morphing, magnetic behavior, spring motion, spatial continuity, or advanced transitions.

### Aceternity UI
**Role:** Modern React/Tailwind/Motion component and interaction registry, including shadcn-compatible components/blocks.  
**Default uses:** magnetic buttons, gooey inputs/dropdowns, draggable cards, animated/resizable navigation, stateful buttons, file-upload interactions, expandable cards, lens/compare interactions, loaders, and other modern interaction patterns.  
**Policy:** Strong source for interaction mechanics. Prefer application-relevant components; do not import marketing-heavy effects merely for decoration.

### Magic UI
**Role:** Animated React/Tailwind/Motion components.  
**Default uses:** progressive blur, animated lists, docks, lens, interactive buttons, loaders/progress, subtle reveal/state effects, and selected visual feedback components.  
**Policy:** Use selectively for application UX. Many catalog items are marketing-oriented and should not become default workspace decoration.

### React Bits
**Role:** Creative/experimental React interaction components and effects.  
**Default uses:** morphing, magnetic/physics-like interactions, animated galleries/cards/navigation, text motion, cursor/direct-manipulation effects, and other mechanics not already solved cleanly by higher-priority sources.  
**Policy:** Use when it materially improves a creative-tool interaction. Review accessibility, performance, mobile/touch behavior, and dependency cost before adoption.

### Lucide React
**Role:** Initial application icon source.  
**Policy:** Use consistent Lucide line icons for generic application chrome unless an approved product-specific icon/asset exists. Do not mix competing icon families casually.

### shadcn Registry Directory / additional registries
**Role:** Discovery layer for additional maintained components compatible with the shadcn ownership model.  
**Policy:** A registry being listed does not automatically approve every component. Review implementation quality, maintenance, licensing, accessibility, dependencies, and fit before adopting it into RenderLab.

## External Source Search Order
1. Existing `APPROVED` or `LOCKED` RenderLab component
2. Existing RenderLab primitive
3. shadcn/ui + Radix
4. Motion Primitives / Motion for React
5. Aceternity UI
6. Magic UI
7. React Bits
8. Other reviewed shadcn-compatible registry
9. Adapt the closest approved implementation
10. Build a new mechanic from scratch only when the existing ecosystems do not satisfy the requirement

The goal is not to force every component through every source. The goal is to avoid spending project time recreating solved interaction mechanics.

## Adoption Checklist
Before copying/installing an external component:
- Verify compatibility with Next.js App Router, React, TypeScript, and the current Tailwind version.
- Review source code and dependency footprint.
- Verify license/use terms are acceptable.
- Check keyboard and screen-reader behavior where relevant.
- Check focus behavior and visible focus treatment.
- Check reduced-motion behavior for animated components.
- Check mobile/touch behavior for pointer/hover/drag interactions.
- Check performance for media-heavy or continuously animated surfaces.
- Replace arbitrary styling with RenderLab semantic tokens where practical.
- Remove unnecessary demo/marketing effects and dependencies.
- Preserve the component's proven interaction mechanic rather than rewriting it without reason.
- Record the adopted RenderLab component below once it exists in the repository.

## Components

### AppShell
**Status:** APPROVED  
**Source:** `src/components/shell/app-shell.tsx`  
**Origin:** RenderLab composition using Next.js navigation + Lucide React icons  
**Purpose:** Persistent responsive application chrome: desktop sidebar, compact top bar, mobile bottom navigation, route context, and utility navigation.  
**Variants:** Responsive desktop/mobile behavior is internal to the component.  
**Used by:** root layout  
**Dependencies:** Next.js `Link`/`usePathname`, Lucide React  
**Reuse rules:** This is the authoritative application shell/navigation implementation. Extend it rather than creating page-specific shells.  
**Do not:** Add Create composer, Library cards, workflow controls, or feature-owned layout into the persistent shell.  
**Notes:** Verified by successful GitHub Actions production build + Playwright desktop/mobile checks and rendered screenshot review. Approved, not locked; later shell changes still require rendered review.

### CreateWorkspace
**Status:** EXPERIMENTAL  
**Source:** `src/features/create/create-workspace.tsx`  
**Origin:** RenderLab product composition based on the versioned Create v0.2 open design handoff  
**Purpose:** Own the initial task-oriented Create composer: prompt draft, Image/Video output choice, essential aspect/duration values, truthful backend availability, typed generation submission, and local job/error feedback.  
**Variants:** Image and Video states; responsive desktop/mobile layout. Reference-driven Edit/Animate states are not implemented yet.  
**Used by:** `/`  
**Dependencies:** React client state, Lucide React, RenderLab generation capability/API contracts  
**Reuse rules:** Keep this feature-owned until stable subcomponents have a real reuse case. Use the typed generation contract rather than direct provider/worker calls.  
**Do not:** Treat the current slice as the finished Create product, expose backend workflow IDs, fabricate progress, or clear prompt/settings on recoverable errors.  
**Notes:** Production build and Playwright Create/shell checks passed on CI run `33017608788`; generated 1440×1024 Image/Video and 390×844 mobile screenshots were visually inspected. Generate remains disabled in CI because no `RENDERLAB_GENERATION_BACKEND_URL` is configured. Reference upload and Advanced controls are intentionally disabled until backed by real contracts.

### RoutePlaceholder
**Status:** EXPERIMENTAL  
**Source:** `src/components/shell/route-placeholder.tsx`  
**Origin:** RenderLab  
**Purpose:** Temporary route-content placeholder used while validating/incrementally replacing feature surfaces.  
**Variants:** Text content only.  
**Used by:** Library, Activity, Settings, Media Viewer placeholder routes. Create no longer uses it.  
**Dependencies:** none  
**Reuse rules:** Temporary validation helper only.  
**Do not:** Promote this placeholder layout into final feature UI or treat it as a generic empty-state component.  
**Notes:** Deprecate/remove as real feature surfaces replace placeholders.

Do not treat examples, registry listings, Saga components, or desired product concepts as proof that a RenderLab component exists.
