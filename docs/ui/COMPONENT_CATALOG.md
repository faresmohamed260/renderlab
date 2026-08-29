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
**Adopted:** RenderLab pins `motion@13.1.1`. Phase 7A uses `motion/react` only inside Create-owned interaction composition for spatial continuity and reduced-motion-safe presence/layout transitions; no global animation store or generic wrapper layer is introduced.

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
**Current primitives:** Alert, AlertDialog, Button, Checkbox, Collapsible, DropdownMenu, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle, ToggleGroup.
**Used by:** application shell, Create, Create Advanced, Library search/filter/sort/upload/Favorites/Collections/selection/empty state, Media Viewer and Viewer Favorite/Collections/Rename/Download/Delete actions.
**Reuse rules:** Conventional visible controls in feature/shell code must compose this layer. Extend variants/semantics here when the requirement is genuinely shared instead of re-hand-styling each feature. Native file/hidden inputs may remain browser/form plumbing.  
**Do not:** Reintroduce raw visible `<button>`, `<select>`, `<textarea>` or ordinary visible `<input>` controls into `src/features` or `src/components/shell`; force maintained Radix semantics back into an older DOM shape just to satisfy stale tests; create a competing primitive for a solved conventional control.  
**Notes:** UI-026. `npm run verify:ui-purity` is the CI enforcement gate. The refactor preserved the approved surface design while centralizing control mechanics. During verification, `EmptyTitle` was deliberately kept as a semantic heading, shared Button icon/text spacing was normalized once, Create Image/Video single-choice intent adopted Radix radiogroup/radio semantics, and UI-027 added the maintained Radix Dropdown Menu for Library ordering instead of a bespoke selector.

### AlertDialog
**Status:** APPROVED
**Source:** `src/components/ui/alert-dialog.tsx`
**Origin:** shadcn/Radix AlertDialog wrapper normalized to RenderLab tokens
**Purpose:** Accessible modal confirmation for a genuinely destructive action with focus trapping/restoration, labelled title/description and explicit cancel/action semantics.
**Used by:** UI-033 Media Viewer Delete and UI-034 Library Batch Delete confirmation.
**Reuse rules:** Use for destructive confirmation that truly requires an interruptive modal decision; keep product mutation/copy outside the primitive.
**Do not:** Turn ordinary confirmations into modal friction, hide destructive consequences, or bypass feature-owned authorization/data contracts.
**Notes:** UI-033 final exact head `53b0eb4c648b47a17fee2e735b7dddc85d345518` passed Media Delete `33218433320`, UI Shell `33218433381` and the complete affected suite; PR #25 merged as `40945ff8c4c7e3a3db0e115c4d7cae9f50db4445`. Desktop/mobile confirmation review verified focus-safe destructive confirmation without hierarchy drift.

### Checkbox
**Status:** APPROVED
**Source:** `src/components/ui/checkbox.tsx`
**Origin:** shadcn/Radix Checkbox wrapper normalized to RenderLab tokens
**Purpose:** Accessible checked/unchecked selection control for UI-034 page-scoped Library media selection.
**Used by:** `LibraryBatchSelection`.
**Reuse rules:** Use maintained checked-state/focus semantics for real multi-selection; keep media IDs and batch product behavior outside the primitive.
**Do not:** Turn Checkbox into durable selection state, a card data store or a substitute for URL/server-owned Library filtering.
**Notes:** UI-034 final exact head `1e634fe9a582b8a7676cb70cfc7bcd5754f613ce` passed UI Shell `33220710365`, Library Batch Delete `33220710307` and the complete 16-gate affected suite; PR #29 merged as `8b0b0339f216f3ce704d965ef005b2cd020f3ae8`. Responsive selection/confirmation review was clean.

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
**Dependencies:** RenderLab generation/media contracts, shared persistent browser media-upload client, capabilities, React client state, Motion for React, Lucide, maintained Button/Textarea/ToggleGroup/DropdownMenu/Alert/Spinner/Collapsible primitives.
**Reuse rules:** Extend or deliberately extract reusable subcomponents rather than creating competing Create surfaces.  
**Do not:** Expose worker/storage IDs, fabricate progress or push technical worker controls into default UI.  
**Notes:** All four native operations verified; complete configured browser lifecycle `33031817744`. Image/Video intent is an accessible required single-choice Radix radiogroup. Phase 7A PR #47 adds the maintained Dropdown Menu geometry selector, source-backed `Original` intent for Edit/Animate and curated fixed-ratio expansion; exact head `789358e8a276ab54d8eeae7e4b7dcb64c2c4c60f` passed responsive Create Lifecycle `33258831638` and live image/video geometry verification `33258831654` / `33258831636` before merge as `de50efe6ba462ec604ea2cace741e11904a62425`. Phase 7A PR #49 de-crowds the composer using the existing maintained DropdownMenu/ToggleGroup/Collapsible/Button mechanics: exact head `d52db83efb2af056e2e1598b54b988794ff19ab1` passed UI Shell `33261129925`, Create Lifecycle `33261129910`, Library Lifecycle `33261129917`, Account Ownership `33261129909`, Create Durable Upload `33261129940`, and Video Generation `33261129918` before merge as `d324d7c8a520052d3c4bdc81f5f6c11edbdf50ee`. PR #51 adds stable `@imageN` reference identity/prompt addressing without a new generic primitive: `CreateReferenceMentionMenu` composes the existing maintained Button + Radix DropdownMenu mechanics and exact head `c8fbe9d733eb9b983b209da995b2f9865808f66a` passed the nine affected gates plus desktop/narrow artifact review before merge as `7afe257b069e74d322d8f83c1a0868a30acd3686`. Phase 7B PR #53 extends this same Create-owned reference composition to UI-046's two-image maximum: second durable reference, stable replace/remove/reorder semantics, `Make primary`, multi-reference mention selection, and an explicit one-source Video limit. Exact validation head `acf3f8e792c2b895a9999cca24060a1c33484463` passed all nine affected gates including configured Create Lifecycle `33266025789`; desktop/narrow artifacts were reviewed after responsive action wrapping kept role labels readable. PR #53 merged as `0286b18802fc3d766d9d09e2ba8ed9a494eabd08`. UI-048 / Phase 7D extends the same Create-owned compact Video settings composition with exact `480p`/`720p`/`1080p`/`2K` Resolution, a `resolution · duration` trigger, default 480p and Resolution → Duration → Audio → Advanced ordering. Exact code/test head `594ad7eb39a9d5eec1d2f0283ac6e327f86129b3` passed UI Shell `33270777087`, Create Lifecycle `33270777086`, Video Generation `33270777081` and every other affected gate. Responsive review found and fixed narrow DropdownMenu clipping by using Radix available-height scrolling/collision padding; no new generic primitive was added. Do not create a competing generic autocomplete or model picker.

**Phase 7A premium interaction evidence:** PR #58 candidate exact head `51c293dad114c98754933ab192b13427a90d9570` adds purposeful Create-owned Motion layout/presence behavior for reference add/remove/reorder, operation/context copy, Image↔Video contextual controls, Advanced field changes and result arrival. Stable alias keys remain the identity boundary. Configured Create Lifecycle `33273370720` verifies `Make primary` produces and settles an actual layout transform and that reduced-motion mode changes remain transform-free; UI Shell `33273370797` covers the reduced-motion browser contract. Artifact `9720784693` was reviewed clean on desktop and narrow layouts.

### CreateReferenceMentionMenu
**Status:** APPROVED
**Source:** `src/features/create/create-reference-mention-menu.tsx`
**Origin:** RenderLab Create composition using maintained Button + Radix DropdownMenu mechanics
**Purpose:** Thumbnail-backed prompt-reference picker for attached stable `@imageN` aliases without exposing storage/provider identity.
**Used by:** `CreateWorkspace`.
**Reuse rules:** Keep the menu Create-owned while reference addressing is a Create-specific task interaction; populate it only from references already attached to the current normalized request and return the selected alias to prompt insertion logic.
**Do not:** Treat alias text as authorization, add a parallel generic command/autocomplete system, renumber an existing alias because display order changes, or expose workflow/model/provider identity.
**Notes:** UI-044 / PR #51 established the mechanic. UI-046 / PR #53 extends it to all currently attached Image references without replacing the maintained Button + DropdownMenu composition; exact validation head `acf3f8e792c2b895a9999cca24060a1c33484463` passed configured lifecycle and responsive review before merge as `0286b18802fc3d766d9d09e2ba8ed9a494eabd08`.


### CreateAdvancedPanel
**Status:** APPROVED
**Source:** `src/features/create/create-advanced-panel.tsx`  
**Purpose:** Advanced generation controls without turning the default composer into a technical form.  
**Current fields:** Image — negative prompt, seed, Steps, Guidance. Video — negative prompt, seed, Frame rate. Video Steps/Guidance are deliberately absent and server-rejected under UI-048.
**Dependencies:** capability definitions, Motion for React, maintained Field/Input/Textarea/NativeSelect/Button primitives, Lucide, Collapsible.
**Do not:** Add provider/worker identifiers or unverified workflow parameters.
**Notes:** Phase 7A uses a reduced-motion-aware presence transition only when Image/Video changes which verified Advanced fields are rendered; field values and product contracts remain feature state, not animation state.

### ActivityView
**Status:** APPROVED
**Source:** `src/features/activity/activity-view.tsx`
**Origin:** RenderLab feature composition using maintained Alert/Button/Empty primitives plus owner-scoped `generation_jobs` state.
**Purpose:** Account-private current/recent generation history with real lifecycle state, sanitized failures, bounded pagination and active-result continuation.
**Dependencies:** `generation-activity-contract`, `generation-activity` server query, `ActivityAutoRefresh`, maintained Alert/Button/Empty, Lucide.
**Reuse rules:** Keep job data server-owned and product-level. The tiny client refresh helper may refresh only while active jobs exist.
**Do not:** Expose worker/provider/workflow/failover data, fabricate progress, create a global job store or infer cancel/retry controls without a separate contract.
**Notes:** UI-035 final exact head `f0a1100ea379a5aaba43d2694bb34496b563a1b2` passed Activity `33223434378`, Account Ownership `33223434363`, UI Shell `33223434381`, Create Lifecycle `33223434428`, Generation Integration `33223434364`, and Video Generation `33223434355`; desktop/mobile implementation artifacts were reviewed clean. PR #34 merged as `7e1e7c4e3c1dc1f6d226998e7d372715c2220bc4`, merged-`main` UI Shell `33223633751`, Generation Integration `33223633631`, and Video Generation `33223633627` passed, post-merge cleanup returned to zero and Vercel created no deployment.

### LibraryView
**Status:** APPROVED
**Source:** `src/features/library/library-view.tsx`
**Origin:** RenderLab composition from `design/penpot/library-v0.1.svg`, extended by approved Upload/search/history/drag-drop/Favorites/Collections behavior, approved UI-034 batch selection and UI-049 Phase 8A collection management + Phase 8B page-scoped batch organization.
**Purpose:** Durable-media Library with URL-owned literal search, kind/Favorites/collection filtering, chronological ordering, responsive browsing, metadata, pagination, upload entry, page-scoped batch selection with explicit organization target states, Library-owned collection lifecycle management and Viewer deep links.
**Variants:** All/Images/Videos; Favorites on/off; optional selected collection; Newest/Oldest; active/clear search; configured/unavailable/empty/no-match/paginated states; zero/existing collections; transient collection-manager/create/rename/delete-confirmation state; transient desktop drag-active upload state; UI-034 selection/confirmation state; desktop/mobile.
**Dependencies:** Next.js Link, maintained Button/Checkbox/Input/DropdownMenu/Field/Alert/AlertDialog/Empty/Spinner primitives, native hidden form plumbing, Lucide, `PublicMediaAsset`, media-list/search/sort/favorite/collection/batch-delete contracts, feature-owned `LibraryBatchSelection`, `LibraryUploadButton`, `LibraryDropUploadSurface`, `LibrarySortMenu`, `LibraryCollectionMenu` and `LibraryCollectionManager`.
**Reuse rules:** Extend this authoritative Library composition against approved durable contracts. Keep search/history/Favorites/Collections URL/server-owned; keep UI-034 selection transient/page-scoped; keep persistent upload paths on the shared feature-owned transaction.
**Do not:** Couple to legacy `studio_*`, expose storage identity, move organization/search/history into page-only client filtering, persist selection across Library views, or infer other batch management actions from Delete.
**Notes:** Base Library `33034606323`/`33034606396`; persistent Upload merged PR #9; search PR #10; history UI-027; drag/drop UI-028; Favorites UI-031. UI-032 final head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578` passed Collections `33210501106` plus all 13 affected regressions; PR #24 merged as `143f7bfb0be8b4857e5dd45959466e71ae22a42d`. UI-049 Phase 8A exact head `34f9573eaabff6a91c780266ff03fedc9058df56` passed all 16 required/affected regressions; Library Collections `33275469972` plus artifact `9721370669` verified zero-collection creation, rename/delete/privacy/preservation, active-filter canonicalization and responsive manager composition.

### LibraryBatchSelection
**Status:** APPROVED
**Source:** `src/features/library/library-batch-selection.tsx`
**Origin:** RenderLab feature composition using maintained Checkbox/Button/Collapsible/NativeSelect/AlertDialog/Alert primitives, UI-034 page-scoped selection/Delete and UI-049 Phase 8B organization.
**Purpose:** Explicit transient current-page Library selection with one non-destructive Organize disclosure for Favorite/Unfavorite and existing-collection Add/Remove target states, plus permanent Delete kept as a separate destructive action.
**Used by:** `LibraryView` when media items are present.
**Dependencies:** `POST /api/media/assets/batch-delete`, `POST /api/media/assets/batch-favorite`, `POST /api/media/collections/[collectionId]/items/batch`, `PublicMediaAsset`, `PublicMediaCollection`, maintained Checkbox/Collapsible/NativeSelect/AlertDialog/Button/Alert/Spinner, Next.js router refresh.
**Reuse rules:** Selection remains transient browser interaction state over exactly the current server-rendered page. A keyed Library view resets it across kind/search/Favorites/collection/sort/pagination navigation. Non-destructive organization keeps still-visible selections for chaining; server refresh naturally prunes selected items that no longer satisfy an active Favorites/Collection filter.
**Do not:** Persist selection globally, select across pages, create collections inside Organize, turn target-state actions into ambiguous toggles, merge permanent Delete into Organize, promise all-or-nothing best-effort mutations or expose storage identity.
**Notes:** UI-034 final exact head `1e634fe9a582b8a7676cb70cfc7bcd5754f613ce` established page-scoped Delete. UI-049 Phase 8B exact head `e460a7e9e805ac9eb214277eb495adddd3c50f38` passed all 16 minimum/affected regressions including configured Batch Actions `33276766476`; artifact `9721752806` (`renderlab-library-batch-actions-screenshots`, `sha256:9dfebfad4a97aa79e6bd11a2b86de5071fa7a1e6739258d95688d37496b3adb0`) was reviewed clean across desktop/narrow organization/filter-reconciliation/Delete-regression states and exact fixtures cleaned.

### LibraryUploadButton
**Status:** APPROVED
**Source:** `src/features/library/library-upload-button.tsx`  
**Origin:** RenderLab feature composition using maintained Button/Spinner plus the browser native file chooser  
**Purpose:** Keyboard/touch/mobile baseline for one persistent Library image upload.  
**Used by:** `LibraryView` only.  
**Dependencies:** feature-owned `uploadLibraryFile`, native hidden file input, Next.js router refresh.  
**Reuse rules:** Keep picker interaction Library-owned while persistent upload transport is shared through the product browser media-upload client. `library-upload-client.ts` owns Library-specific validation/copy and delegates the ticket/R2/completion transaction rather than duplicating it.
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

### PersistentBrowserMediaUpload
**Status:** APPROVED
**Source:** `src/lib/browser/media-upload-client.ts`
**Origin:** UI-040 / Phase 7A extraction of the already-approved persistent media upload transaction
**Purpose:** Shared browser transport for authenticated image upload ticket → signed R2 PUT → dimension read → verified durable-media completion.
**Used by:** Create reference upload and Library's `LibraryUploadClient`.
**Dependencies:** `media-upload-contract`, browser `fetch`, `createImageBitmap`.
**Reuse rules:** Share the network/promotion transaction across product features that create the same durable user media identity; keep feature-specific picker/drop UX, validation wording and post-upload behavior in the owning feature.
**Do not:** Expose credentials/storage keys, skip server HEAD/completion verification, or turn this helper into a client-side media store.
**Notes:** Configured Create Durable Upload run `33256497167` verifies durable Create persistence + Library visibility + `media-asset` generation binding and exact cleanup. Existing Library upload regressions stayed green on the same code head.

### LibraryUploadClient
**Status:** APPROVED
**Source:** `src/features/library/library-upload-client.ts`  
**Origin:** Library-specific validation wrapper over `PersistentBrowserMediaUpload`
**Purpose:** Library picker/drop validation and copy while delegating the persistent ticket/R2/completion transaction to the shared product helper.
**Used by:** `LibraryUploadButton`, `LibraryDropUploadSurface`.  
**Dependencies:** `media-upload-contract`, `src/lib/browser/media-upload-client.ts`.
**Reuse rules:** Keep Library-specific behavior here; reuse the lower-level persistent upload helper when another feature creates the same durable media identity.
**Do not:** Duplicate the persistent transaction, expose R2 credentials/storage keys, or bypass server completion verification.
**Notes:** UI-028 + UI-040. PNG/JPEG/WebP and 25 MB validation remains identical across Library picker/drop paths.

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
**Purpose:** Compact Library-owned collection selector that keeps durable collection filtering server-owned through `collection=<uuid>` and exposes the progressive `Manage collections` disclosure, including when zero collections exist.
**Used by:** `LibraryView` only.
**Dependencies:** `MediaCollectionSummary`, current Library URL state, maintained DropdownMenu/Collapsible/Button, Next.js navigation, feature-owned `LibraryCollectionManager`.
**Reuse rules:** Keep collection navigation URL/server-owned and management interaction feature-owned. Preserve kind/search/Favorites/sort while changing the selected collection, clear stale pagination, and delegate create/rename/delete state to `LibraryCollectionManager`.
**Do not:** Turn Collections into a top-level destination, client media filter/store or card/batch membership system; do not duplicate management in Viewer.
**Notes:** UI-032 established the selector. UI-049 Phase 8A exact head `34f9573eaabff6a91c780266ff03fedc9058df56` makes the control reachable at zero collections and adds the maintained management disclosure; configured Collections `33275469972` and artifact `9721370669` passed responsive review.

### LibraryCollectionManager
**Status:** APPROVED
**Source:** `src/features/library/library-collection-manager.tsx`
**Origin:** UI-049 Phase 8A feature composition using existing owner-scoped collection product routes and maintained Button/Field/Input/AlertDialog/Spinner mechanics.
**Purpose:** Compact Library-owned create/rename/delete lifecycle for the verified account's collections without moving durable Library state into the browser.
**Used by:** `LibraryCollectionMenu` only.
**Dependencies:** existing `POST /api/media/collections`, new owner-scoped `PATCH|DELETE /api/media/collections/[collectionId]`, `PublicMediaCollection`, maintained Button/Field/Input/AlertDialog/Spinner, Next.js router refresh/navigation.
**Reuse rules:** Keep local state limited to disclosure/form/busy/error/confirmation mechanics. Server routes remain authoritative for normalization, ownership, privacy and deletion semantics. Deleting the active collection navigates to the already-computed canonical all-collections URL.
**Do not:** Delete media/Favorites/R2/history with a collection, expose storage identity, create a generic collection-management framework, persist collection data client-side, or duplicate rename/delete controls in Viewer.
**Notes:** Exact head `34f9573eaabff6a91c780266ff03fedc9058df56` passed the 16-workflow Phase 8A minimum/affected suite. Library Collections `33275469972` verified zero-collection creation, rename/duplicate/privacy, collection-only deletion/preservation, active-filter canonicalization and exact cleanup; artifact `9721370669` was reviewed clean on desktop/narrow layouts.

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
