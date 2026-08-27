# Component Catalog

Authoritative index of reusable RenderLab UI components and approved external component sources. Populate actual RenderLab components from the repository, not assumptions.

## Statuses
`EXPERIMENTAL`, `APPROVED`, `LOCKED`, `DEPRECATED`

## Approved External Sources
These sources are approved defaults to search before implementing reusable UI mechanics from scratch.

### shadcn/ui + Radix
**Role:** Foundational accessible application primitives.  
**Default uses:** buttons, inputs, selects, dialogs, sheets, dropdown menus, popovers, tabs, tooltips, command interfaces, forms, toggles, navigation primitives, disclosures, and other standard application controls.  
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

### Collapsible
**Status:** APPROVED  
**Source:** `src/components/ui/collapsible.tsx`  
**Origin:** normalized wrapper over `@radix-ui/react-collapsible` `1.1.20`  
**Purpose:** Generic accessible disclosure primitive exposing Root/Trigger/Content without feature-specific state or styling assumptions.  
**Used by:** Create Advanced disclosure  
**Dependencies:** Radix Collapsible  
**Reuse rules:** Reuse this primitive for ordinary disclosure behavior instead of implementing custom expand/collapse mechanics. Keep feature labels, layout, and fields outside the primitive.  
**Do not:** Add Create-specific capability logic or product copy to this wrapper.  
**Notes:** Adopted in PR #6 after production build, keyboard/interaction Playwright coverage through its Create usage, and desktop/mobile rendered review.

### CreateWorkspace
**Status:** APPROVED  
**Source:** `src/features/create/create-workspace.tsx`  
**Origin:** RenderLab product composition based on the versioned Create v0.2/v0.3 open design handoff  
**Purpose:** Own the task-oriented Create experience: prompt draft, Image/Video output choice, essential aspect/duration values, reference context, typed generation submission/polling, truthful asynchronous feedback, persisted result presentation, continuation actions, and Advanced disclosure.  
**Variants:** Create Image, Create Video, reference-driven Edit Image, reference-driven Animate Image; responsive desktop/mobile layout.  
**Used by:** `/`  
**Dependencies:** React client state, Lucide React, RenderLab generation capability/API contracts, RenderLab reference-upload contract, RenderLab media asset product APIs, normalized Radix `Collapsible`  
**Reuse rules:** This is the authoritative Create workspace. Extend it or extract deliberately reusable subcomponents rather than creating competing Create surfaces. Use opaque product source/media IDs and typed RenderLab APIs rather than storage keys or direct provider/worker calls.  
**Do not:** Expose backend workflow IDs/R2 keys, fabricate progress, clear prompt/reference/settings on recoverable errors, or add technical controls to the default composer merely because workers support them.  
**Notes:** All four initial native operations are live-verified. Persisted results render through product APIs. Image results support capability-derived Edit/Animate continuation; the durable `media-asset` continuation path passed live integration run `33027460976`. Bounded polling recovery and conservative worker reassignment are merged. Advanced v0.3 passed run `33030364272`. Final configured browser-driven result/continuation review passed run `33031817744` at desktop/mobile widths and self-cleaned its production fixture. Approved, not locked.

### CreateAdvancedPanel
**Status:** APPROVED  
**Source:** `src/features/create/create-advanced-panel.tsx`  
**Origin:** RenderLab feature composition using the reviewed `design/penpot/create-v0.3-advanced.svg` candidate and normalized Radix Collapsible  
**Purpose:** Present deliberately Advanced generation controls without turning the default composer into a technical form.  
**Current fields:** negative prompt, seed, steps, guidance; frame rate only when output is Video.  
**Dependencies:** RenderLab generation capability definitions, native HTML form controls, Lucide React, `CollapsibleContent`  
**Reuse rules:** This is the approved Create Advanced implementation. If future screens need the same parameter editing model, extract shared field primitives only after a real reuse case appears.  
**Do not:** Add provider/worker/model identifiers or unverified workflow parameters.  
**Notes:** Separate Image/Video drafts preserve operation-specific defaults and edits. Invalid Advanced values block submission locally while preserving user work. PR #6 passed production build, behavior tests, API validation tests, and desktop/mobile screenshot review; the complete Create lifecycle subsequently passed run `33031817744`.

### LibraryView
**Status:** APPROVED  
**Source:** `src/features/library/library-view.tsx`  
**Origin:** RenderLab product composition based on `design/penpot/library-v0.1.svg`, extended in place by the approved persistent-upload and search slices  
**Purpose:** Present the durable-media Library surface with URL-owned literal search, compact kind filtering, responsive browsing, product metadata, pagination, upload entry, and deep links into Media Viewer.  
**Variants:** `All`, `Images`, `Videos`; active/clear search; configured, unavailable, empty, no-match and paginated states; responsive desktop/mobile layout.  
**Used by:** `/library`  
**Dependencies:** Next.js `Link`, native GET form/input semantics, Lucide React, `PublicMediaAsset`/media-list search contracts, feature-owned `LibraryUploadButton`  
**Reuse rules:** This is the authoritative Library composition. Extend it as real Library requirements/data contracts are approved rather than creating a competing gallery or parallel search surface. Keep search URL/server-owned; extract reusable media-card/search mechanics only after another surface has a genuine shared need.  
**Do not:** Couple cards/search/filters to legacy `studio_*` records, expose R2 storage identity, turn search into client-only current-page filtering, or add fake organization controls without persistent RenderLab data.  
**Notes:** Base Library verification passed `33034606323` / `33034606396`. Persistent uploaded-media behavior is approved through PR #9. Library search v0.1 is approved for merge through UI Shell `33069004219`, configured search lifecycle `33069004204`, existing upload backend regression `33069004207`, and real Upload → Library → Viewer → Create regression `33069004227`. Four search result/no-match desktop/mobile screenshots from `33069004204` were visually inspected; the verifier self-cleaned and direct Supabase verification found no remaining search/upload fixtures. No separate reusable Search component was introduced because the current search form is feature-owned native composition.

### MediaViewer
**Status:** APPROVED  
**Source:** `src/features/library/media-viewer.tsx`  
**Origin:** RenderLab product composition based on `design/penpot/media-viewer-v0.1.svg`  
**Purpose:** Present one durable media asset as the visually primary object, show basic product metadata, and expose compatible continuation actions from the shared capability model.  
**Variants:** image/video media presentation; optional dimensions/duration; continuation actions only when supported.  
**Used by:** `/library/[assetId]`  
**Dependencies:** Next.js `Link`, Lucide React, `PublicMediaAsset`, shared generation continuation capability definitions  
**Reuse rules:** This is the authoritative contextual media-detail surface. Keep continuation action derivation in the shared capability model and pass only opaque product media identity plus intent across routes.  
**Do not:** Hard-code a second action registry, expose worker/provider/R2 identity, or treat URL query parameters as trusted asset state.  
**Notes:** Configured run `33034606396` verified a real 400×300 R2-backed image, correct Viewer geometry, capability-derived Edit/Animate links and a server-validated Viewer → Create Edit handoff at desktop/mobile widths. Fixture cleanup passed. Approved, not locked.

### RoutePlaceholder
**Status:** EXPERIMENTAL  
**Source:** `src/components/shell/route-placeholder.tsx`  
**Origin:** RenderLab  
**Purpose:** Temporary route-content placeholder used while validating/incrementally replacing feature surfaces.  
**Variants:** Text content only.  
**Used by:** Activity and Settings placeholder routes. Create, Library and Media Viewer no longer use it.  
**Dependencies:** none  
**Reuse rules:** Temporary validation helper only.  
**Do not:** Promote this placeholder layout into final feature UI or treat it as a generic empty-state component.  
**Notes:** Deprecate/remove once the remaining placeholder surfaces are replaced.

Do not treat examples, registry listings, Saga components, or desired product concepts as proof that a RenderLab component exists.
