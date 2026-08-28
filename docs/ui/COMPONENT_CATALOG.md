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
**Current primitives:** Alert, AlertDialog, Button, Checkbox (UI-034 candidate), Collapsible, DropdownMenu, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle, ToggleGroup.
**Used by:** application shell, Create, Create Advanced, Library search/filter/sort/upload/Favorites/Collections/selection/empty state, Media Viewer and Viewer Favorite/Collections/Rename/Download/Delete actions.
**Reuse rules:** Conventional visible controls in feature/shell code must compose this layer. Extend variants/semantics here when the requirement is genuinely shared instead of re-hand-styling each feature. Native file/hidden inputs may remain browser/form plumbing.  
**Do not:** Reintroduce raw visible `<button>`, `<select>`, `<textarea>` or ordinary visible `<input>` controls into `src/features` or `src/components/shell`; force maintained Radix semantics back into an older DOM shape just to satisfy stale tests; create a competing primitive for a solved conventional control.  
**Notes:** UI-026. `npm run verify:ui-purity` is the CI enforcement gate. The refactor preserved the approved surface design while centralizing control mechanics. During verification, `EmptyTitle` was deliberately kept as a semantic heading, shared Button icon/text spacing was normalized once, Create Image/Video single-choice intent adopted Radix radiogroup/radio semantics, and UI-027 added the maintained Radix Dropdown Menu for Library ordering instead of a bespoke selector.

### AlertDialog
**Status:** APPROVED
**Source:** `src/components/ui/alert-dialog.tsx`
**Origin:** shadcn/Radix AlertDialog wrapper normalized to RenderLab tokens
**Purpose:** Accessible modal confirmation for a genuinely destructive action with focus trapping/restoration, labelled title/description and explicit cancel/action semantics.
**Used by:** UI-033 Media Viewer Delete.
**Reuse rules:** Use for destructive confirmation that truly requires an interruptive modal decision; keep product mutation/copy outside the primitive.
**Do not:** Turn ordinary confirmations into modal friction, hide destructive consequences, or bypass feature-owned authorization/data contracts.
**Notes:** UI-033 final exact head `53b0eb4c648b47a17fee2e735b7dddc85d345518` passed Media Delete `33218433320`, UI Shell `33218433381` and the complete affected suite; PR #25 merged as `40945ff8c4c7e3a3db0e115c4d7cae9f50db4445`. Desktop/mobile confirmation review verified focus-safe destructive confirmation without hierarchy drift.

### Checkbox
**Status:** EXPERIMENTAL
**Source:** `src/components/ui/checkbox.tsx`
**Origin:** shadcn/Radix Checkbox wrapper normalized to RenderLab tokens
**Purpose:** Accessible checked/unchecked selection control for UI-034 page-scoped Library media selection.
**Used by:** `LibraryBatchSelection` only while PR #29 is in final validation.
**Reuse rules:** Use maintained checked-state/focus semantics for real multi-selection; keep media IDs and batch product behavior outside the primitive.
**Do not:** Turn Checkbox into durable selection state, a card data store or a substitute for URL/server-owned Library filtering.
**Notes:** UI-034 implementation head `78015dcfb5881639b32f22f8877874af2c3a336b` passed UI Shell `33220127872`, Library Batch Delete `33220127853` and the complete affected implementation matrix. Promote the UI-034 usage to approved only after exact documentation-head validation and merge.

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
**Origin:** RenderLab composition from `design/penpot/library-v0.1.svg`, extended by approved Upload/search/history/drag-drop/Favorites/Collections behavior and the UI-034 batch-selection candidate.
**Purpose:** Durable-media Library with URL-owned literal search, kind/Favorites/collection filtering, chronological ordering, responsive browsing, metadata, pagination, upload entry, page-scoped batch selection and Viewer deep links.
**Variants:** All/Images/Videos; Favorites on/off; optional selected collection; Newest/Oldest; active/clear search; configured/unavailable/empty/no-match/paginated states; transient desktop drag-active upload state; UI-034 selection/confirmation state; desktop/mobile.
**Dependencies:** Next.js Link, maintained Button/Checkbox/Input/DropdownMenu/Alert/AlertDialog/Empty primitives, native hidden form plumbing, Lucide, `PublicMediaAsset`, media-list/search/sort/favorite/collection/batch-delete contracts, feature-owned `LibraryBatchSelection`, `LibraryUploadButton`, `LibraryDropUploadSurface`, `LibrarySortMenu` and `LibraryCollectionMenu`.
**Reuse rules:** Extend this authoritative Library composition against approved durable contracts. Keep search/history/Favorites/Collections URL/server-owned; keep UI-034 selection transient/page-scoped; keep persistent upload paths on the shared feature-owned transaction.
**Do not:** Couple to legacy `studio_*`, expose storage identity, move organization/search/history into page-only client filtering, persist selection across Library views, or infer other batch management actions from Delete.
**Notes:** Base Library `33034606323`/`33034606396`; persistent Upload merged PR #9; search PR #10; history UI-027; drag/drop UI-028; Favorites UI-031. UI-032 final head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578` passed Collections `33210501106` plus all 13 affected regressions; PR #24 merged as `143f7bfb0be8b4857e5dd45959466e71ae22a42d` and desktop/mobile collection-filtered Library artifacts were reviewed clean.

### LibraryBatchSelection
**Status:** EXPERIMENTAL
**Source:** `src/features/library/library-batch-selection.tsx`
**Origin:** RenderLab feature composition using maintained Checkbox/Button/AlertDialog/Alert primitives and the UI-033 deletion contract.
**Purpose:** Explicit page-scoped Library selection plus permanent Delete for the currently rendered media page.
**Used by:** `LibraryView` when media items are present.
**Dependencies:** `POST /api/media/assets/batch-delete`, `PublicMediaAsset`, maintained Checkbox/AlertDialog/Button/Alert/Spinner, Next.js router refresh.
**Reuse rules:** Selection is transient browser interaction state over the current server-rendered page. A keyed Library view resets it across kind/search/Favorites/collection/sort/pagination navigation. Successful items may disappear locally while server-owned data refreshes.
**Do not:** Persist selection globally, select across pages, promise all-or-nothing R2/database deletion, add batch Favorites/Collections implicitly, or expose storage identity.
**Notes:** UI-034 implementation head `78015dcfb5881639b32f22f8877874af2c3a336b` passed Library Batch Delete `33220127853` plus the complete 15 existing affected regressions; desktop/mobile selection and confirmation artifacts were reviewed clean. Final documentation-head validation/merge remains required.

### LibraryUploadButton
**Status:** APPROVED  
**Source:** `src/features/library/library-upload-button.tsx`  
**Origin:** RenderLab feature composition using maintained Button/Spinner plus the browser native file chooser  
**Purpose:** Keyboard/touch/mobile baseline for one persistent Library image upload.  
**Used by:** `LibraryView` only.  
**Dependencies:** feature-owned `uploadLibraryFile`, native hidden file input, Next.js router refresh.  
**Reuse rules:** Keep picker interaction feature-owned while the persistent upload contract belongs to Library. Share the transaction through `library-upload-client.ts` rather than duplicating ticket/R2/completion logic.  
**Do not:** Replace the native file chooser plumbing with a bespoke visible raw control or introduce a second upload data contract.  
**Notes:** UI-022 + UI-028. Existing picker lifecycle remained green after the shared upload transaction extraction.

### LibraryDropUploadSurface
**Status:** APPROVED  
**Source:** `src/features/library/library-drop-upload-surface.tsx`  
**Origin:** RenderLab feature composition using browser DragEvent/DataTransfer semantics, maintained Spinner, Lucide and the existing persistent upload transaction  
**Purpose:** Optional desktop drag/drop path for adding one compatible image to Library without adding a permanent dropzone.  
**Used by:** `LibraryView` only.  
**Dependencies:** `library-upload-client.ts`, Next.js router refresh, UI-022 persistent upload APIs.  
**Reuse rules:** Keep it Library-owned while only Library has this drag-to-persist interaction. Generic drag/drop abstraction is not justified by a single feature need.  
**Do not:** Turn it into a global dropzone framework, accept batch uploads implicitly, hide the ordinary Upload button, or create a parallel storage/upload contract.  
**Notes:** UI-028. The drag affordance exists only while a file drag is active; multi-file drops are rejected before network upload. Configured run `33102672468` verified exact one-ticket/one-completion/one-session/one-asset/one-card behavior plus responsive screenshots and cleanup.

### LibraryUploadClient
**Status:** APPROVED  
**Source:** `src/features/library/library-upload-client.ts`  
**Origin:** RenderLab feature-owned browser transaction extracted from the approved picker upload behavior  
**Purpose:** One shared validation + ticket/R2 PUT/completion transaction for Library picker and drag/drop interaction paths.  
**Used by:** `LibraryUploadButton`, `LibraryDropUploadSurface`.  
**Dependencies:** `media-upload-contract`, browser `fetch`, `createImageBitmap`.  
**Reuse rules:** Share it only across Library persistent upload interaction paths; it is not a generic application upload service.  
**Do not:** Expose R2 credentials/storage keys, bypass server completion verification, or merge temporary Create reference uploads into this durable Library contract.  
**Notes:** UI-028. PNG/JPEG/WebP and 25 MB validation remains identical across picker/drop paths.

### LibrarySortMenu
**Status:** APPROVED  
**Source:** `src/features/library/library-sort-menu.tsx`  
**Origin:** RenderLab feature composition using the maintained shadcn/Radix Dropdown Menu + Button primitives  
**Purpose:** Compact Library-owned Newest/Oldest navigation without moving media ordering into client state.  
**Used by:** `LibraryView` only.  
**Dependencies:** URL-owned `sort`, `kind`, `q`; Next.js router navigation; maintained DropdownMenu radio items.  
**Reuse rules:** Keep it feature-owned while ordering is a Library-specific navigation contract. Generic DropdownMenu mechanics belong in `src/components/ui/dropdown-menu.tsx`.  
**Do not:** Expand it into a Saga-style filter framework, add unsupported model/date/collection filters, or persist organization state client-side.
**Notes:** UI-027. Configured Library History Visual proved Newest/Oldest selection, composed URL state, deterministic API order and responsive rendering.

### LibraryCollectionMenu
**Status:** APPROVED
**Source:** `src/features/library/library-collection-menu.tsx`
**Origin:** RenderLab feature composition using maintained Button/DropdownMenu primitives and URL navigation.
**Purpose:** Compact Library-owned collection selector that keeps durable collection filtering server-owned through `collection=<uuid>`.
**Used by:** `LibraryView` only.
**Dependencies:** `MediaCollectionSummary`, current Library URL state, maintained DropdownMenu + Button, Next.js navigation.
**Reuse rules:** Keep the selector feature-owned; generic dropdown mechanics remain in `src/components/ui`. Preserve kind/search/Favorites/sort while changing the selected collection and clear stale pagination.
**Do not:** Turn it into a collection management console, client media filter, top-level Collections destination or card/batch membership UI.
**Notes:** UI-032. UI-032 final head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578` passed the configured Collections lifecycle and responsive Library review before PR #24 merged as `143f7bfb0be8b4857e5dd45959466e71ae22a42d`.

### MediaViewer
**Status:** APPROVED
**Source:** `src/features/library/media-viewer.tsx`
**Origin:** RenderLab composition based on `design/penpot/media-viewer-v0.1.svg`
**Purpose:** Contextual durable-media workspace: media-primary presentation, truthful metadata, capability-derived continuation and secondary durable asset actions.
**Variants:** image/video; generated/uploaded metadata; optional dimensions/duration; continuation actions when supported; Viewer-only Favorite, Collections, Download and Rename; approved UI-033 single-asset Delete.
**Used by:** `/library/[assetId]`
**Dependencies:** Next.js Link, maintained Button/AlertDialog primitives, Lucide React, `PublicMediaAsset`, shared continuation capabilities, product media/collection routes, feature-owned `MediaViewerActions` and `MediaViewerCollections`.
**Reuse rules:** Keep continuation derivation in the capability model. Keep durable actions on opaque media IDs/product routes. Extend Viewer actions deliberately rather than adding card/batch controls by implication.
**Do not:** Hard-code a second continuation registry, expose worker/provider/R2 identity, use raw signed URLs as durable links, or infer batch/destructive/collection-management actions from contextual Viewer controls.
**Notes:** Base generated-media Viewer/continuation passed `33034606396`; Download PR #11; Rename PR #12; Favorites PR #23. UI-032 final head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578` passed Collections `33210501106` and the complete affected matrix; PR #24 merged as `143f7bfb0be8b4857e5dd45959466e71ae22a42d` and desktop/mobile Viewer artifacts preserve Continue hierarchy and existing Rename/Download composition.

### MediaViewerActions
**Status:** APPROVED
**Source:** `src/features/library/media-viewer-actions.tsx`
**Origin:** RenderLab feature composition using maintained Button/Input/AlertDialog primitives, React client state and Lucide React.
**Purpose:** Viewer-owned secondary action group for durable Favorite + Collections + Rename + Download plus approved UI-033 single-asset Delete, including local mutation/confirmation state and the feature-owned Collections composition.
**Used by:** `MediaViewer` only.
**Dependencies:** favorite PUT/DELETE, Rename PATCH, asset DELETE, Download route, `MediaViewerCollections`, display-name/delete contracts, maintained AlertDialog and Next.js router navigation/refresh.
**Reuse rules:** Keep this feature-owned while only Media Viewer needs the action composition. Extract generic mechanics only after a second real reuse need.
**Do not:** Turn it into a global media-management framework, mutate R2 identity from the client, or infer batch/card selection/collection-management actions from the UI-033 single-asset Delete action.
**Notes:** Favorite remains full-width above the action stack; Collections is contextual below it; Rename/Download remain paired. UI-033 places Delete below the existing action stack as a visually secondary destructive action. Final exact head `53b0eb4c648b47a17fee2e735b7dddc85d345518` passed all 15 affected gates and desktop/mobile confirmation review; PR #25 merged as `40945ff8c4c7e3a3db0e115c4d7cae9f50db4445` and merged-`main` checks remained green.

### MediaViewerCollections
**Status:** APPROVED
**Source:** `src/features/library/media-viewer-collections.tsx`
**Origin:** RenderLab feature composition using maintained Button/Input/Alert primitives and the owner-scoped Collections product API.
**Purpose:** Viewer-only collection disclosure for listing current-account collections, creating-and-adding a named collection, and idempotently toggling membership of the current durable asset.
**Used by:** `MediaViewerActions` only.
**Dependencies:** `GET|POST /api/media/collections`, `PUT|DELETE /api/media/collections/[collectionId]/items/[assetId]`, `MediaCollectionSummary`, React local busy/error state.
**Reuse rules:** Keep collection dataset ownership on the server/product API. Local state may reflect current Viewer membership interactions but is not a global media/collection store.
**Do not:** Add rename/delete management, card/batch membership, cross-account IDs, raw table access or a dedicated Collections navigation surface in v0.1.
**Notes:** UI-032 final configured run `33210501106` verified create/add/remove persistence, same-owner isolation, pressed-state accessibility, responsive rendering and exact cleanup; PR #24 is merged and approved.

### RoutePlaceholder
**Status:** EXPERIMENTAL  
**Source:** `src/components/shell/route-placeholder.tsx`  
**Purpose:** Temporary route placeholder for Activity/Settings while validating/replacing feature surfaces.  
**Reuse rules:** Temporary validation helper only.  
**Do not:** Promote into final feature UI or a generic empty-state pattern.

Do not treat examples, registry listings, Saga components, or desired concepts as proof that a RenderLab component exists.
