# Component Catalog

Authoritative index of reusable RenderLab UI components and approved external component sources. Populate actual RenderLab components from repository reality, not assumptions.

## Statuses
`EXPERIMENTAL`, `APPROVED`, `LOCKED`, `DEPRECATED`

## Approved External Sources
Search these before implementing reusable interaction mechanics from scratch.

### shadcn/ui + Radix
**Role:** Foundational accessible application primitives.  
**Uses:** buttons, inputs, selects, dialogs, sheets, menus, popovers, tabs, tooltips, forms, toggles, navigation/disclosure primitives.  
**Policy:** First external stop for conventional UI; normalize styling to RenderLab tokens.

### Motion for React
**Role:** Core motion/gesture engine.  
**Uses:** layout transitions, springs, gestures, drag, shared-layout transitions and motion orchestration.  
**Policy:** Prefer established patterns; respect reduced motion and avoid decorative motion without product value.

### Motion Primitives
**Role:** Reusable motion-first application components.  
**Uses:** morphing dialogs/popovers, transition panels, magnetic/spatial interactions, animated toolbars and related mechanics.

### Aceternity UI
**Role:** Modern React/Tailwind/Motion interaction registry.  
**Policy:** Prefer application-relevant mechanics; do not import marketing-heavy decoration wholesale.

### Magic UI
**Role:** Animated React/Tailwind/Motion components.  
**Policy:** Use selectively for application feedback/hierarchy rather than decorative spectacle.

### React Bits
**Role:** Creative/experimental React interaction components.  
**Policy:** Use when it materially improves a creative-tool interaction; review accessibility, performance and touch behavior.

### Lucide React
**Role:** Initial application icon source.  
**Policy:** Use a consistent Lucide line-icon family unless an approved product-specific asset exists.

### Additional shadcn registries
**Role:** Discovery layer for maintained shadcn-compatible implementations.  
**Policy:** Registry presence does not automatically approve a component; review quality, accessibility, licensing, maintenance and dependency cost first.

## External Source Search Order
1. Existing `APPROVED`/`LOCKED` RenderLab component
2. Existing RenderLab primitive
3. shadcn/ui + Radix
4. Motion Primitives / Motion for React
5. Aceternity UI
6. Magic UI
7. React Bits
8. Other reviewed shadcn-compatible registry
9. Adapt the closest approved implementation
10. Build a new mechanic only when the ecosystems do not satisfy the requirement

## Adoption Checklist
Before copying/installing an external component:
- verify Next.js/React/TypeScript/Tailwind compatibility;
- review source, license and dependency footprint;
- verify keyboard/screen-reader/focus behavior where relevant;
- verify reduced-motion and touch/mobile behavior;
- check performance for media-heavy or continuous effects;
- normalize styling to RenderLab semantic tokens;
- remove demo/marketing effects and unnecessary dependencies;
- preserve proven mechanics rather than rewriting them without reason;
- record adopted RenderLab-owned components below.

## Components

### Maintained UI Primitive Layer
**Status:** APPROVED  
**Source:** `src/components/ui/*`, configured by `components.json` with shadcn `radix-nova`  
**Origin:** shadcn/ui + `radix-ui`, normalized to RenderLab semantic tokens and reviewed product semantics  
**Current primitives:** Alert, Button, Collapsible, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle, ToggleGroup.  
**Used by:** application shell, Create, Create Advanced, Library search/filter/upload/empty state, Media Viewer and Viewer Rename/Download actions.  
**Reuse rules:** Conventional visible controls in feature/shell code must compose this layer. Extend variants/semantics here when the requirement is genuinely shared instead of re-hand-styling each feature. Native file/hidden inputs may remain browser/form plumbing.  
**Do not:** Reintroduce raw visible `<button>`, `<select>`, `<textarea>` or ordinary visible `<input>` controls into `src/features` or `src/components/shell`; force maintained Radix semantics back into an older DOM shape just to satisfy stale tests; create a competing primitive for a solved conventional control.  
**Notes:** UI-026. `npm run verify:ui-purity` is the CI enforcement gate. The refactor preserved the approved surface design while centralizing control mechanics. During verification, `EmptyTitle` was deliberately kept as a semantic heading, shared Button icon/text spacing was normalized once, and Create Image/Video single-choice intent adopted Radix radiogroup/radio semantics.

### AppShell
**Status:** APPROVED  
**Source:** `src/components/shell/app-shell.tsx`  
**Origin:** RenderLab composition using approved `Button`, Next.js navigation + Lucide React  
**Purpose:** Persistent responsive application chrome: desktop sidebar, compact top bar, mobile bottom navigation, route context and utility navigation.  
**Used by:** root layout  
**Reuse rules:** Extend this authoritative shell rather than creating page-specific shells.  
**Do not:** Put Create composer, Library cards, workflows or feature-owned layout into persistent chrome.  
**Notes:** Production build + Playwright desktop/mobile rendering approved; not locked.

### Collapsible
**Status:** APPROVED  
**Source:** `src/components/ui/collapsible.tsx`  
**Origin:** shadcn/Radix Collapsible wrapper through `radix-ui`  
**Purpose:** Generic accessible disclosure primitive.  
**Used by:** Create Advanced  
**Reuse rules:** Reuse for ordinary disclosure; keep feature state/copy outside the primitive.  
**Notes:** Adopted through PR #6 and normalized into the maintained primitive foundation through PR #13.

### CreateWorkspace
**Status:** APPROVED  
**Source:** `src/features/create/create-workspace.tsx`  
**Purpose:** Authoritative task-oriented Create experience: prompt, Image/Video intent, references, typed generation, truthful runtime state, durable results, continuation and Advanced disclosure.  
**Variants:** Create Image, Edit Image, Create Video, Animate Image; responsive desktop/mobile.  
**Dependencies:** RenderLab generation/reference/media contracts, capabilities, React client state, Lucide, maintained Button/Textarea/ToggleGroup/Alert/Spinner/Collapsible primitives.  
**Reuse rules:** Extend or deliberately extract reusable subcomponents rather than creating competing Create surfaces.  
**Do not:** Expose worker/storage IDs, fabricate progress or push technical worker controls into default UI.  
**Notes:** All four native operations verified; complete configured browser lifecycle `33031817744`. Image/Video intent is an accessible required single-choice Radix radiogroup.

### CreateAdvancedPanel
**Status:** APPROVED  
**Source:** `src/features/create/create-advanced-panel.tsx`  
**Purpose:** Advanced generation controls without turning the default composer into a technical form.  
**Current fields:** negative prompt, seed, steps, guidance; frame rate for Video.  
**Dependencies:** capability definitions, maintained Field/Input/Textarea/NativeSelect/Button primitives, Lucide, Collapsible.  
**Do not:** Add provider/worker identifiers or unverified workflow parameters.

### LibraryView
**Status:** APPROVED  
**Source:** `src/features/library/library-view.tsx`  
**Origin:** RenderLab composition from `design/penpot/library-v0.1.svg`, extended by approved Upload/search slices  
**Purpose:** Durable-media Library with URL-owned literal search, kind filtering, responsive browsing, metadata, pagination, upload entry and Viewer deep links.  
**Variants:** All/Images/Videos; active/clear search; configured/unavailable/empty/no-match/paginated states; desktop/mobile.  
**Dependencies:** Next.js Link, maintained Button/Input/Alert/Empty primitives, native hidden form plumbing, Lucide, `PublicMediaAsset`, media-list/search contracts, feature-owned `LibraryUploadButton`.  
**Reuse rules:** Extend this authoritative Library composition against approved durable contracts. Keep search URL/server-owned.  
**Do not:** Couple to legacy `studio_*`, expose storage identity, use page-only client filtering or add fake organization controls.  
**Notes:** Base Library `33034606323`/`33034606396`; persistent Upload merged PR #9; search merged PR #10 as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`. Rename v0.1 reuses the existing display-name search contract; no generic Search feature component was created because the URL-owned GET search form remains Library composition while its conventional controls use the shared primitive layer.

### MediaViewer
**Status:** APPROVED  
**Source:** `src/features/library/media-viewer.tsx`  
**Origin:** RenderLab composition based on `design/penpot/media-viewer-v0.1.svg`  
**Purpose:** Contextual durable-media workspace: media-primary presentation, truthful metadata, capability-derived continuation and secondary durable asset actions.  
**Variants:** image/video; generated/uploaded metadata; optional dimensions/duration; continuation actions when supported; Viewer-only Download and Rename.  
**Used by:** `/library/[assetId]`  
**Dependencies:** Next.js Link, maintained Button primitive, Lucide React, `PublicMediaAsset`, shared continuation capabilities, product media routes, feature-owned `MediaViewerActions`.  
**Reuse rules:** Keep continuation derivation in the capability model. Keep durable actions on opaque media IDs/product routes. Extend Viewer actions deliberately rather than adding card/batch controls by implication.  
**Do not:** Hard-code a second continuation registry, expose worker/provider/R2 identity, use raw signed URLs as durable links, or add Library-card/batch/destructive actions merely because Viewer has contextual actions.  
**Notes:** Base generated-media Viewer/continuation passed `33034606396`; uploaded continuation approved through PR #9. Download v0.1 merged through PR #11 as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`. Rename v0.1 refined head `fb6f42cdfae377cf841655320dc4bbeee74d3549` passed UI Shell `33074480462`, Search `33074480419`, Upload Integration `33074480288`, Download `33074480319`, Rename `33074480356`, and Library Lifecycle `33074480489` on rerun; four responsive Rename screenshots were visually inspected.

### MediaViewerActions
**Status:** APPROVED  
**Source:** `src/features/library/media-viewer-actions.tsx`  
**Origin:** RenderLab feature composition using maintained Button/Input primitives, React client state and Lucide React  
**Purpose:** Viewer-owned secondary action group for durable Rename + Download, including the small inline Rename editor and local error/saving state.  
**Used by:** `MediaViewer` only.  
**Dependencies:** `PATCH /api/media/assets/[assetId]`, `/api/media/assets/[assetId]/download`, `MEDIA_ASSET_DISPLAY_NAME_MAX_LENGTH`, Next.js router refresh.  
**Reuse rules:** Keep this feature-owned while only Media Viewer needs the action composition. Extract generic mechanics only after a second real reuse need.  
**Do not:** Turn it into a global media-management framework, mutate R2 identity from the client, or infer delete/batch/collection actions from its existence.  
**Notes:** Rename and Download stay side-by-side while the edit form expands beneath them. Configured Rename run `33074480356` verified generated/uploaded rename, responsive editing/renamed states, search discovery, Download preservation and cleanup.

### RoutePlaceholder
**Status:** EXPERIMENTAL  
**Source:** `src/components/shell/route-placeholder.tsx`  
**Purpose:** Temporary route placeholder for Activity/Settings while validating/replacing feature surfaces.  
**Reuse rules:** Temporary validation helper only.  
**Do not:** Promote into final feature UI or a generic empty-state pattern.

Do not treat examples, registry listings, Saga components, or desired concepts as proof that a RenderLab component exists.
