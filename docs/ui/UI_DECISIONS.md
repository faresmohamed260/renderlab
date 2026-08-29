# UI Decisions

Records durable UI/UX decisions so independent AI sessions do not reverse them. This is not a general changelog.

## Format
### UI-XXX — Title
**Status:** Proposed | Accepted | Superseded  
**Decision:**  
**Reason:**  
**Consequences:**  
**Supersedes:** optional

---

### UI-001 — Repository is the source of truth
**Status:** Accepted  
**Decision:** Project code and repository documentation—not conversation history—define current UI state.  
**Reason:** Development spans independent AI sessions and tools.  
**Consequences:** Agents inspect the repository and update durable documentation.

### UI-002 — Reuse before invention
**Status:** Accepted  
**Decision:** Existing approved RenderLab component → RenderLab primitive → approved external source → adaptation → new component. Saga components are reference material and are not automatically approved RenderLab components.  
**Reason:** Unconstrained generated UI causes drift and errors, while blindly reusing legacy implementation would carry old constraints into the fresh build.  
**Consequences:** Search approved RenderLab sources before creating UI. Legacy/Saga code may inform behavior but requires deliberate approval before reuse.

### UI-003 — Additions do not imply unrelated redesign
**Status:** Accepted  
**Decision:** Once a RenderLab visual language or surface is approved, feature additions integrate into it unless redesign is explicitly requested or required by an approved product decision.  
**Reason:** Small requests should not cause unrelated visual changes.  
**Consequences:** Keep UI changes scoped while still allowing deliberate redesign during the current fresh-build foundation phase.

### UI-004 — Saga is reference, not specification
**Status:** Accepted  
**Decision:** The previous Studio implementation in `saga` is a behavioral, backend, and lessons-learned reference. Its visual design, navigation, component hierarchy, routing, and frontend architecture are not authoritative for RenderLab.  
**Reason:** RenderLab is a fresh build intended to improve existing UX and support a much broader set of ComfyUI capabilities.  
**Consequences:** Agents may inspect Saga to understand proven behavior and integrations but must not copy its UI or architecture by default.

### UI-005 — Progressive capability disclosure
**Status:** Accepted  
**Decision:** RenderLab may support sophisticated backend workflows, but the default user experience exposes only controls necessary and useful for the current user task. Advanced, technical, and model-specific controls are revealed contextually or through progressive disclosure.  
**Reason:** Backend capability should grow without making the product intimidating for average users.  
**Consequences:** New ComfyUI features must be translated into understandable user-facing tasks and controls instead of directly mirroring workflow/node complexity into the primary UI.

### UI-006 — ComfyUI is the engine, not the interface
**Status:** Accepted  
**Decision:** User-facing information architecture and terminology are organized around creative goals and understandable operations, not ComfyUI nodes, graph structure, or implementation terminology.  
**Reason:** RenderLab should remain intuitive while retaining the flexibility of a powerful ComfyUI backend.  
**Consequences:** Technical workflow concepts may exist internally or in deliberately advanced experiences, but ordinary generation flows should use task-oriented language and sensible defaults.

### UI-007 — Design for capability growth without pre-exposing it
**Status:** Accepted  
**Decision:** RenderLab's internal architecture should anticipate additional workflows, models, media inputs, parameters, outputs, continuation actions, and post-processing capabilities without requiring all of them to appear in the initial UI.  
**Reason:** ComfyUI provides substantial capabilities beyond the currently productionized Saga workflows, and hard-coding the application around today's small workflow set would recreate existing limitations.  
**Consequences:** Architecture should be capability-driven; product surfaces remain intentionally curated and can expose capabilities incrementally as they become production-ready and useful.

### UI-008 — Create and Library are the primary product destinations
**Status:** Accepted  
**Decision:** The initial top-level information architecture centers on `Create` and `Library`. Activity and Settings are utility surfaces; Media Viewer is contextual. Models, workflows, media types, and individual creative operations are not separate top-level destinations by default.  
**Reason:** The primary user loop is creating media and working with durable media. Backend/workflow taxonomy should not dominate navigation.  
**Consequences:** Application-shell design should make Create and Library primary. New backend workflows do not automatically add navigation destinations.

### UI-009 — One creation workspace, multiple creative operations
**Status:** Accepted  
**Decision:** The initial product uses one Create workspace for Create Image, Edit Image, Create Video, and Animate Image rather than four separate applications/screens. Operation resolution may use intent and supplied inputs, with explicit selection available when ambiguity matters.  
**Reason:** These operations share the same core loop—intent, inputs, relevant controls, asynchronous generation, durable result, continuation—and separating them prematurely would fragment the experience.  
**Consequences:** Create must adapt contextually to the resolved operation. Future operations should first be evaluated as additions/continuations within this workspace before receiving dedicated top-level surfaces.

### UI-010 — Library represents reusable creative assets, not only history
**Status:** Accepted  
**Decision:** Library is the durable media workspace for both generated outputs and persistent uploaded assets.  
**Reason:** Verified Saga behavior shows references are reusable assets, and RenderLab's domain model treats media as reusable inputs/outputs rather than disposable generation attachments.  
**Consequences:** Library design should support discovery, organization, inspection, reuse as inputs, and compatible continuation actions; it should not be reduced to a chronological generation-history screen.

### UI-011 — Operational complexity stays secondary
**Status:** Accepted  
**Decision:** Generation jobs and meaningful runtime state remain visible through Activity and global status where useful, but worker/provider/failover infrastructure is not a routine user-facing management surface.  
**Reason:** Asynchronous execution state is valuable to users; infrastructure routing is not part of their creative task.  
**Consequences:** Surface actionable states and failures while keeping worker selection, provider routing, and failover bookkeeping internal.

### UI-012 — Next.js App Router is the frontend foundation
**Status:** Accepted  
**Decision:** RenderLab uses Next.js with React, TypeScript, and the App Router. Server Components are the default composition model; Client Components are introduced deliberately for interactive creative/workspace behavior. Tailwind CSS is the primary styling mechanism and shadcn/ui is an approved primitive source where appropriate.  
**Reason:** The architecture fits the Vercel deployment target, provides real routing/layouts and server/client boundaries, removes the need for Saga-style manual hash routing, and supports a highly interactive application without forcing the entire frontend into a client-only SPA.  
**Consequences:** Public product routes follow the App Router. Product APIs and server-only integrations can be colocated behind stable application boundaries. Broad `'use client'` trees, route-per-workflow design, and direct browser-to-worker integrations are not approved patterns.

### UI-013 — Prefer maintained component mechanics over bespoke reinvention
**Status:** Accepted  
**Decision:** RenderLab defaults to an approved component ecosystem consisting of shadcn/ui + Radix, Motion for React, Motion Primitives, Aceternity UI, Magic UI, React Bits, and individually reviewed shadcn-compatible registries. Custom RenderLab product composition remains expected, but solved generic component/interaction mechanics should not be rebuilt from scratch without a concrete reason.  
**Reason:** Building and debugging generic dialogs, menus, magnetic interactions, morphing transitions, drag physics, animated controls, and similar mechanics from scratch consumes time while mature implementations already exist.  
**Consequences:** Before custom implementation, agents must search the approved sources documented in `COMPONENT_CATALOG.md`. Adopted components are reviewed for accessibility, reduced motion, touch/responsive behavior, performance, licensing, dependency cost, and token compatibility. Once adopted into RenderLab, the project-owned version becomes the reusable authority.

### UI-014 — Persistent shell does not own feature UI
**Status:** Accepted  
**Decision:** The persistent application shell owns navigation, compact route context, account access, lightweight Activity/global-attention access, and the route-content region. Feature-specific UI such as the Create composer, references, generation controls/results, Library grids/cards, and feature toolbars remain owned by their feature surfaces.  
**Reason:** The first historical Figma shell exploration mixed shell and Create UI, which would prematurely couple Phase 2 shell implementation to Phase 3 product design. The reviewed v0.2 refinement separated these concerns before implementation.  
**Consequences:** Phase 2 may implement stable shell chrome without locking the Create or Library layout. Idle shell state should not show an unnecessary persistent “ready” status; global status becomes prominent only when user attention is useful.

### UI-015 — Output media is the primary Create-mode choice
**Status:** Accepted  
**Decision:** The default Create experience presents the primary explicit choice as output media—`Image` or `Video`—rather than exposing backend workflow IDs, model ecosystems, or separate top-level Edit/Animate modes. Image is the initial default output.  
**Reason:** Average users understand the output they want more readily than backend workflow taxonomy, and the same Create workspace can resolve the appropriate operation from output intent plus supplied inputs.  
**Consequences:** The primary composer may expose a compact Image/Video selector. Workflow and model resolution remains behind product capability logic unless a user-facing model choice provides concrete value.

### UI-016 — Reference media resolves Create context
**Status:** Accepted  
**Decision:** Supplying compatible reference media changes the creative operation context without requiring a separate screen: Image output + image reference resolves to image editing; Video output + image reference resolves to image animation/video generation from the reference. The UI must communicate this resolved context and allow the reference to be removed or replaced.  
**Reason:** References are first-class reusable inputs, and automatic contextual resolution keeps the default workflow simple while preserving explicit control over the intended output type.  
**Consequences:** Create should display concise contextual language such as editing/animating the attached reference rather than adding permanent Edit/Animate navigation or mode clutter.

### UI-017 — Default Create controls show useful values, not backend categories
**Status:** Accepted  
**Decision:** Essential controls in the default Create composer should communicate their current user-relevant value (for example `1:1`, `16:9`, `5 s`) instead of abstract category labels such as “Aspect”, “Format”, or “Duration” when the value can be shown directly. Model-specific and technical tuning stays contextual or Advanced.  
**Reason:** Concrete values are faster to understand and reduce the visual/mental cost of the default composer. Historical v0.1 visual review showed category labels created unnecessary indirection.  
**Consequences:** Essential control chips/buttons should display current values and open an appropriate selector when activated. Advanced disclosure must not become a second always-visible settings panel.

### UI-018 — Penpot is the ongoing visual design workspace
**Status:** Accepted  
**Decision:** Penpot is the default ongoing visual UI/UX design workspace for RenderLab when a direct workspace is available. Open SVG handoff artifacts under `design/penpot/` are an approved repository-backed fallback and import source. The previous Figma `RenderLab Design System` file is retained as historical reference only. The repository remains authoritative over every design tool/artifact.  
**Reason:** The project requires a free/open visual-design workflow that does not block progress on proprietary free-tier MCP/tool-call limits or connector availability.  
**Consequences:** New meaningful visual design work should use Penpot when practical or versioned interoperable SVG handoff artifacts when direct Penpot automation is unavailable. Existing repository decisions extracted from Figma remain valid. A design artifact alone still does not make implementation `APPROVED`; real responsive rendered verification remains required.

### UI-019 — Create runtime states reflect real execution and preserve user work
**Status:** Accepted  
**Decision:** Generate is disabled when required task inputs are missing and while a submission is already in progress. Running-state copy/progress must be derived from real job/orchestration state when available rather than fabricated percentage progress. Submission/runtime errors appear locally without clearing the user's prompt, references, or settings. A generation is presented as complete only after the durable media result has been persisted.  
**Reason:** Saga proved that generation is asynchronous and persistence/worker state are meaningful product concepts; fake progress or destructive error handling would reduce trust and make recovery harder.  
**Consequences:** The Create UI must preserve task state across recoverable errors, expose concise actionable failure feedback, surface meaningful runtime state, and transition to result/continuation UI only after persistence succeeds. Result actions are capability-derived rather than hard-coded to one workflow.

### UI-020 — Initial Library stays media-first and contract-driven
**Status:** Accepted  
**Decision:** Library v0.1 is a unified durable-media surface backed by RenderLab `media_assets`. It starts with newest-first browsing, a compact `All / Images / Videos` filter, a responsive media grid, an empty state that points back to Create, and deep links into Media Viewer. Prompt/created-time metadata may be shown when present; optional dimensions/duration must not be required for the layout.  
**Reason:** The current RenderLab media contract reliably owns durable media identity, kind, MIME, creation time, product media URLs, and generation provenance, but does not yet own favorites, collections, persistent-upload names, or a rich searchable organization schema. Saga proves those richer behaviors are useful, but copying its full filter/collection/batch-management surface before RenderLab owns the data would create fake or legacy-coupled product state.  
**Consequences:** Do not add Creatives/Uploads tabs, model/date/favorites filters, density toggles, collections, batch actions, rename, or delete merely because Saga has them. Persistent uploaded assets remain part of Library's accepted long-term purpose under UI-010; introduce them through a RenderLab-owned persistent upload contract rather than legacy `studio_uploads`. The initial grid must work correctly even when the Library is empty or asset dimensions are null.

### UI-021 — Media Viewer is the contextual asset workspace
**Status:** Accepted  
**Decision:** `/library/[assetId]` is the deep-linked Media Viewer for one durable RenderLab asset. Media is visually primary; prompt, creation time, media kind and available dimensions/duration are secondary metadata. Compatible continuation actions come from the shared capability model rather than a Viewer-specific hard-coded action list.  
**Reason:** A stable asset route supports inspection, reuse and future media actions without overloading grid cards or creating modal-only state. The same durable asset identity is already proven as a generation input in Create.  
**Consequences:** Library cards navigate to the route rather than opening a separate legacy-style modal. Viewer actions must use opaque `media-asset` IDs and product APIs. Provider/worker/ecosystem/R2 data remain internal. A cross-route continuation handoff to Create must be implemented as a stable product contract before Viewer buttons are presented as functional; do not render fake Edit/Animate actions.

### UI-022 — Persistent uploads become ordinary durable media assets
**Status:** Accepted  
**Decision:** Verified persistent user uploads are represented by the same durable RenderLab `media_assets` identity used by generated media. A separate server-owned `media_upload_sessions` record owns pending direct-transfer state until the uploaded object is verified. RenderLab does not introduce a parallel public Uploads asset identity or Uploads tab for this contract.  
**Reason:** Library, Media Viewer, capability-derived continuation, and future media actions already operate on opaque `media-asset` identity. Promoting a verified upload into that existing durable contract keeps the product model coherent while isolating short-lived transfer state from durable media state.  
**Consequences:** The browser receives an opaque upload session plus a short-lived signed R2 PUT URL, never raw R2 credentials or storage keys as product identity. Completion server-side HEAD-verifies MIME and exact size before creating the `media_assets` row and linking the completed upload session. Uploaded media is immediately reusable through normal Library/Viewer/Create `media-asset` continuation after verification. Temporary `generation_sources` remain generation/reference input state and must not become the durable Library upload model. Legacy Saga `studio_uploads` is not reused or repurposed. This decision does not approve broader upload organization, favorites, collections, search, rename, delete, download, or batch-management UI.

### UI-023 — Library search is URL-owned durable-media discovery
**Status:** Accepted  
**Decision:** Library text search uses the shareable URL parameter `q` and runs server-side against durable RenderLab `media_assets`. Search is a case-insensitive literal substring over human-facing display name, original uploaded filename, and generated prompt. It combines with the existing `All / Images / Videos` kind filter, preserves newest-first ordering, and resets pagination when the query or kind changes. Search queries are normalized and bounded to 120 characters.  
**Reason:** Library needs useful discovery without copying Saga's broader organization/filter system or filtering only the currently loaded page. RenderLab already owns these durable human-facing fields, so a small server-owned search contract can improve discovery without introducing a parallel search service or premature collection schema.  
**Consequences:** `q` is navigation state, not client-only state. Storage keys, provider/worker metadata, model internals, temporary `generation_sources`, and legacy `studio_*` data are not searchable through this contract. Search punctuation is treated literally rather than as PostgREST/regex syntax. v0.1 keeps newest-first ordering instead of adding relevance ranking. A future index, database function, or search service may optimize the implementation behind the same product contract when corpus size justifies it. This decision does not approve favorites, collections, model/date filters, batch actions, rename, delete, download, or a command-palette search experience.

### UI-024 — Durable media download stays a product-media action
**Status:** Accepted  
**Decision:** Media Viewer exposes one secondary `Download` action for durable generated/uploaded media through `/api/media/assets/[assetId]/download`. The server resolves the opaque durable asset ID and redirects to a short-lived signed R2 GET with attachment `Content-Disposition`; RenderLab does not expose storage keys as product identity or proxy media bytes through the application server. Uploaded media downloads preserve a sanitized human Unicode basename while forcing the canonical extension from verified MIME. Generated media uses a deterministic `renderlab-<kind>-<id-prefix>.<ext>` fallback rather than prompts or storage keys.  
**Reason:** Download is a basic asset action that fits the contextual Media Viewer without adding Library-card clutter, organization schema, or unnecessary server transfer cost. MIME-owned extension selection avoids misleading user filenames, while the UTF-8 disposition preserves legitimate uploaded names.  
**Consequences:** Download remains Viewer-contextual in v0.1; it is not a batch action or Library-card control. The stable product route revalidates durable identity before signing storage access. Filename sanitization removes path/control/platform-forbidden semantics and handles reserved basenames. R2 `ResponseContentDisposition` is an implementation detail behind the product route. This decision does not approve rename, delete, favorites, collections, batch actions, or exposing raw signed R2 URLs as durable product links.

### UI-025 — Rename changes durable display identity only
**Status:** Accepted  
**Decision:** Media Viewer exposes one contextual `Rename` action for durable generated/uploaded media. Rename updates only `media_assets.display_name` through `PATCH /api/media/assets/[assetId]`; it does not rename or move the R2 object, rewrite uploaded `original_filename`, alter MIME, mutate generated provenance/prompt, or change Download filename semantics. Names remove control characters, collapse whitespace, must remain non-empty, and are capped at 240 characters.  
**Reason:** `display_name` is already the RenderLab-owned human-facing durable identity used by Library and UI-023 search. A Viewer-contextual Rename gives users a basic organization tool without introducing a new schema, collections model, destructive behavior, or storage mutation.  
**Consequences:** Library search immediately discovers the new display name. The Viewer owns a small inline client edit state; Rename and Download stay side-by-side while the editor expands beneath them. Rename remains Viewer-only in v0.1 and does not approve Library-card rename, modal/global management frameworks, delete, favorites/collections, batch actions, or raw storage mutation. Uploaded Download naming continues to prefer the preserved original filename, and generated Download naming remains deterministic.

### UI-026 — Conventional visible controls use maintained shared primitives
**Status:** Accepted  
**Decision:** Conventional visible controls in RenderLab feature and shell code are composed from the approved maintained primitive layer in `src/components/ui` rather than hand-styled raw native controls. shadcn/ui + Radix is the default source for ordinary application controls; local wrappers may normalize RenderLab tokens, variants, semantic elements, spacing and accessibility behavior without reimplementing the underlying interaction mechanic. Native file and hidden inputs remain allowed as browser/form plumbing.  
**Reason:** Approved product surfaces had accumulated repeated raw button/input/select/textarea styling even though the project had already chosen maintained component ecosystems. Centralizing conventional controls reduces visual drift, duplicate debugging and accessibility inconsistency while preserving RenderLab-specific product composition.  
**Consequences:** `npm run verify:ui-purity` rejects raw visible `<button>`, `<select>`, `<textarea>` and ordinary visible `<input>` controls in `src/features` and `src/components/shell`. A maintained primitive's correct accessibility semantics take precedence over legacy DOM-shape assertions; tests must verify user behavior and accessible state rather than force an older implementation contract. Shared primitive/config/package changes must trigger the screen lifecycles that depend on them. Building a new generic UI primitive/mechanic from scratch requires a concrete documented reason that approved maintained sources do not satisfy the requirement. This decision does not redesign approved Create, Library, Viewer or shell product behavior.

### UI-027 — Library history ordering is URL-owned durable-media state
**Status:** Accepted  
**Decision:** Library supports explicit `Newest first` and `Oldest first` ordering through shareable URL state `sort=newest|oldest`. `newest` remains the canonical default and is omitted from clean links. Ordering runs server-side over durable `media_assets` using matching `created_at` and `id` directions so pagination remains deterministic. Sort composes with `q`, `kind`, Clear and pagination; changing sort resets stale offset state.  
**Reason:** Chronological direction is a useful low-complexity history control that RenderLab can own today without inventing account-scoped organization state, destructive storage semantics or a Saga-style filter console.  
**Consequences:** The compact sort control uses the maintained shadcn/Radix Dropdown Menu primitive while Library data ownership remains server/URL-based. Pagination language follows the active direction so navigation stays truthful. This decision does not approve relevance ranking, date/model filter panels, Favorites/Collections, delete or batch management. Favorites/Collections remain deferred until RenderLab has an explicit user/account ownership model; Delete remains deferred until durable database/R2 cleanup, references/history and tombstone/recovery semantics are defined.

### UI-028 — Library drag-and-drop reuses the persistent upload contract
**Status:** Accepted  
**Decision:** Library may accept one compatible image dropped onto the Library surface as an optional desktop enhancement to the existing persistent Upload flow. The visible Upload button and native file picker remain the keyboard/touch/mobile baseline. A file drag reveals a temporary full-Library drop affordance only while the drag is active; there is no persistent dropzone. Dropped files use the same PNG/JPEG/WebP, 25 MB validation and ticket → signed R2 PUT → completion → durable `media_assets` promotion contract as picker uploads. Multi-file drops are rejected before any upload request starts.  
**Reason:** Drag/drop makes an already-approved upload task faster for desktop creative workflows without inventing a second upload identity, parallel storage path, organization model or always-visible UI. Reusing the exact upload transaction prevents picker/drop behavior from drifting apart.  
**Consequences:** `library-upload-client.ts` owns the shared browser upload transaction; `LibraryUploadButton` and feature-owned `LibraryDropUploadSurface` are two interaction paths into it. Success refreshes the server-owned Library and announces completion; errors remain local. Drag/drop adds no schema migration, global client media store, Favorites/Collections, Delete/batch framework or new R2/CORS contract. Configured validation must use run-unique fixtures, enforce one ticket/completion/session/asset/card for one dropped file, and clean the serialized shared upload-test fixture namespace before visual review.

### UI-029 — Account identity precedes personal Library organization
**Status:** Accepted  
**Decision:** Supabase Auth `auth.users.id` is the canonical RenderLab account identity. Settings owns the initial email/password sign-in, account-creation and sign-out surface. Browser/server session state uses the maintained Supabase SSR cookie contract and verified server claims; the browser receives only the public project URL/publishable key, while service-role credentials remain server-only. This identity foundation does not itself gate Create/Library or change ownership of generation/media records.  
**Reason:** Favorites, collections and other personal organization cannot be modeled safely as global durable-media flags. RenderLab needs a real account principal first, but introducing identity should not silently redesign approved Create/Library behavior or pretend that media isolation exists before owner scoping is implemented.  
**Consequences:** `@supabase/ssr` + `@supabase/supabase-js` provide session mechanics; root `proxy.ts` refreshes auth cookies; Settings exposes a compact feature-owned account surface composed from maintained Field/Input/Button/Alert/Spinner primitives. No new generic auth UI framework or global client store is introduced. Owner columns, account-scoped queries, cross-account denial and RLS policies remain the next required ownership slice before Favorites/Collections are approved. Delete remains separately blocked on storage/reference/recovery semantics.

### UI-030 — Core private records are owned by the verified account principal
**Status:** Accepted  
**Decision:** RenderLab's existing `generation_sources`, `generation_jobs`, `media_assets`, and `media_upload_sessions` records are account-owned by the verified Supabase Auth principal (`auth.users.id` / server-verified `claims.sub`). Raw core tables remain server-owned: RLS stays enabled, browser roles receive no direct table grants, and product routes/services use the server-only service role only after resolving verified account context. Private list/read/update/completion/poll/input-resolution operations are scoped by `owner_id`, new records receive the authenticated owner, generated media inherits the generation job owner, and foreign opaque IDs resolve as ordinary not-found state rather than disclosing ownership.  
**Reason:** UI-029 created a real account identity, but personal Library state is unsafe until durable/pending records are isolated across accounts. Reusing the existing RenderLab persistence model with a single canonical owner avoids a parallel per-user media system and preserves the approved Create/Library/Viewer product model.  
**Consequences:** Ownership rolls out in two database stages: compatible nullable prepare migration `0004_core_account_ownership_prepare.sql`, followed only after owner-aware application code is safely live and a no-unowned-row audit passes by `0005_core_account_ownership_enforce.sql`, which makes ownership non-null/immutable and enforces same-owner relational links. Create may preserve an unsigned draft, but persistent generation/upload actions require sign-in. Configured tests use deterministic owner-scoped fixtures and must never perform service-role namespace cleanup across other owners. Favorites/Collections remain blocked until UI-030 is fully enforced; Delete/batch remains separately blocked on durable storage/reference/recovery semantics. Implementation status is tracked in `UI_MIGRATION.md`; accepting this decision does not mark PR #17 complete or waive its exact-head configured execution gate.

### UI-031 — Favorites are lightweight owner-scoped durable-media organization

**Status:** Accepted
**Decision:** Favorites v0.1 uses a nullable `media_assets.favorited_at` marker on the existing account-owned durable asset row. Library exposes an optional URL/server-owned `favorite=true` filter that composes with the existing kind/search/sort/pagination contract. Media Viewer exposes one idempotent favorite toggle through an owner-scoped product API. v0.1 does not add Collections, Library-card/batch favorite controls, a new top-level route, a parallel organization table or a global client media store.
**Reason:** UI-030 now guarantees one immutable account owner per durable media asset, so a favorite is safely modeled as lightweight metadata on that owned asset. Starting with the smallest useful organization action improves retrieval without prematurely designing Collections or a generic organization framework.
**Consequences:** Additive migration `0006_media_favorites.sql` introduces nullable `favorited_at` plus an owner/favorites browsing index without changing RLS or browser grants. Product serialization exposes only favorite state, not database/storage identity. Favorite mutations remain server-authorized by the verified account and foreign asset IDs resolve as ordinary not-found state. Collections and Delete/batch remain separate future slices with their own contracts and validation.

### UI-032 — Collections are owner-scoped durable-media organization
**Status:** Accepted
**Decision:** RenderLab Collections are account-owned named records with a separate many-to-many membership relation to same-owner durable `media_assets`. v0.1 exposes one URL/server-owned Library `collection=<uuid>` filter and Viewer-only create/add/remove membership. One asset may belong to multiple collections. Collections do not become a new top-level destination or a property folded into Favorites.
**Reason:** Favorites proves the account-private organization boundary, but named reusable sets require their own durable relation and integrity rules. Keeping v0.1 inside the approved Library/Viewer surfaces adds real organization without copying Saga's anonymous/global collection model or prematurely introducing a management console.
**Consequences:** Collection and membership writes require a verified account, raw tables remain server-owned with RLS plus zero browser grants, membership must be same-owner at the database boundary, and Library collection browsing composes with existing kind/search/Favorites/sort/pagination state. Collection rename/delete, card/batch membership, dedicated collection routes, Delete/batch media management and global client media state require separate future contracts.

### UI-033 — Durable media Delete is permanent and tombstone-first
**Status:** Accepted
**Decision:** Durable Media Delete v0.1 is a single-asset Media Viewer action. Deletion first writes an immutable `media_assets.deleted_at` tombstone so the asset immediately disappears from ordinary product reads, signed-media issuance, Favorites/Collections and new generation-input reuse. It then deletes the durable R2 content plus optional thumbnail and records `purged_at` only after physical storage cleanup succeeds. v0.1 is permanent to the user and has no restore UI. Generation jobs retain historical `output_asset_ids` and `inputs` references to the deleted opaque media ID instead of rewriting creative history.
**Reason:** A durable asset participates in database organization, upload promotion, generation history and R2 storage, so a direct hard row delete would either erase history or leave distributed cleanup ambiguous. Tombstone-first deletion makes product unavailability atomic at the database boundary while keeping physical R2 cleanup retryable and auditable. Preserving job references keeps historical execution truthful. Starting in Media Viewer avoids inventing Library-card selection/batch mechanics before a second contract requires them.
**Consequences:** Additive migration `0009_media_asset_deletion.sql` owns nullable `deleted_at`/`purged_at`, clears Favorite state and removes collection/upload-session links on first tombstone, prevents tombstone reversal, and prevents collection membership from targeting deleted assets. `DELETE /api/media/assets/[assetId]` is owner-scoped and idempotent; a successful tombstone with incomplete R2 cleanup returns a pending-cleanup state rather than pretending purge succeeded. Previously issued short-lived signed R2 URLs cannot be revoked and may remain valid until their existing expiry, but no new product URL is issued after tombstoning. A generation request submitted after deletion must reject the tombstoned media input before backend submission; a generation already in flight is not implicitly cancelled. Batch selection/actions, user restore/trash, retention windows and collection deletion remain separate future contracts.

### UI-034 — Library batch Delete is page-scoped and best-effort
**Status:** Accepted
**Decision:** Library Batch Delete v0.1 adds an explicit transient selection mode to the currently rendered Library page. Selection is not URL state and does not persist across kind/search/Favorites/collection/sort/pagination changes. The product API accepts at most one page of durable IDs (24), resolves every item under the verified account, and applies the existing UI-033 tombstone/R2 deletion contract per item. The batch result is best-effort and per-item: completed deletions are not rolled back because another selected item fails; failed items remain eligible for retry. v0.1 does not add cross-page selection, Trash/restore, batch Favorites/Collections, or a global media client store.
**Reason:** Database tombstoning can establish per-asset product unavailability, but R2 cleanup is a distributed per-object operation, so promising all-or-nothing multi-delete across database and storage would be false. Page-scoped selection gives users useful bulk cleanup without inventing durable selection state or a broad management framework.
**Consequences:** `POST /api/media/assets/batch-delete` is owner-scoped, UUID-bounded, deduplicated and capped at 24. Missing/foreign IDs collapse to per-item not-found. Successful items immediately disappear locally while server-owned Library data refreshes; partial failures are reported truthfully and failed IDs stay selected for retry. No new schema migration is required; UI-034 reuses applied `0009_media_asset_deletion.sql`.

### UI-035 — Activity exposes product job state, not execution infrastructure
**Status:** Accepted
**Decision:** `/activity` is the account-private operational history for recent RenderLab `generation_jobs`. It presents real persisted lifecycle state, human creative-operation labels, prompt context, bounded chronological history, sanitized failures and Viewer links only for currently active owner media. While an active job exists, the screen may lightly refresh and reuse the existing owner-aware poll contract; it must not fabricate percentage progress. Worker IDs, provider call IDs, workflow/model/ecosystem routing, failover history and raw backend error detail remain internal.
**Reason:** Jobs are first-class durable product objects and users need a place to understand work after leaving Create, but infrastructure routing is not a user goal. UI-033 also preserves historical output IDs after media deletion, so Activity must distinguish historical job identity from an available result action.
**Consequences:** Activity is server-owned by default and scopes every query to the verified account. It shows at most 20 jobs per page in v0.1, exposes no cancel/retry mutation or global client job store, sanitizes failures into product-level guidance, and resolves result actions through active same-owner `media_assets`. Models/Workflows do not become dedicated screens from this decision; the current capability audit confirms no separate user-facing surface is justified until a new user goal requires one.

### UI-036 — Video audio is a contextual Create control
**Status:** Accepted
**Decision:** When Video is the selected Create output, RenderLab exposes an explicit Audio on/off control in the contextual essential settings row. Audio defaults ON. The normalized product request carries the choice as `output.audioEnabled`; Image requests do not accept the Video-only field. Native REDGraft execution maps the validated product value to worker `audio_enabled`.
**Reason:** Audio generation changes the user-visible video result and the backend already supports the choice, so hiding it behind a hardcoded `true` removes meaningful creative control. Audio on/off is understandable output intent, unlike worker/provider/workflow implementation detail, and therefore belongs in the contextual Video UI rather than infrastructure or a generic technical settings panel.
**Consequences:** `defaultVideoAudioEnabled = true` is the centralized capability default. Create uses the maintained Toggle primitive and keeps the approved task-oriented composition; narrow layouts must keep Audio, duration, Advanced and Generate reachable. Server validation remains authoritative, persisted generation parameters retain the resolved choice, and provider/workflow identity stays internal. No schema migration or separate Video screen follows from this decision.

### UI-037 — Cycle 2 prioritizes creative productivity and beta maturity
**Status:** Superseded
**Superseded by:** UI-038
**Decision:** After completed Phases 0–5, RenderLab's second major development cycle is organized as Phase 6 baseline/production hardening, Phase 7 Create v2, Phase 8 Library v2, Phase 9 Activity v2, Phase 10 Account/Beta readiness and Phase 11 integrated release validation. The planned first feature after the Phase 6 audit is Multi-reference Image Edit v0.1, followed by a curated Video quality/resolution slice. Library v2 prioritizes collection management and page-scoped batch organization; Activity v2 prioritizes safe Retry before any cancellation contract; Account/Beta work stays requirement-driven. Generic Models/Workflows surfaces, ComfyUI graph editing, infrastructure management and billing are not implied by this cycle. Implementation does not begin merely because this decision is accepted; Phase 6 waits for explicit user authorization.
**Reason:** Cycle 1 established a complete functional product foundation. The highest-value next step is deeper repeated creative productivity and beta maturity while preserving RenderLab's task-oriented UX and stable infrastructure/ownership boundaries, rather than surfacing backend taxonomy or accumulating speculative screens.
**Consequences:** Future sessions treat the Phase 6–11 roadmap in `PROJECT.md` and `UI_MIGRATION.md` as the accepted order unless the user explicitly changes it. Phase 6 must reverify current production/capability/cost reality before feature implementation. Multi-reference editing must extend the existing Create capability/input-slot model; video resolution must be curated from verified capability and operational evidence. Trash/restore would supersede part of UI-033 and therefore requires a separate explicit decision; Cancel requires an execution-safety audit; billing/credits require separate product scope. Roadmap acceptance does not mark any Phase 6–11 checkbox complete, authorize a Vercel deployment, create a new top-level route, or relax UI-008/UI-011/provider-storage privacy rules.

### UI-038 — Cycle 2 roadmap incorporates closed-beta production feedback
**Status:** Accepted
**Decision:** The post-Phase-6 Cycle 2 roadmap is revised so Phase 7 begins with Create foundations before multi-reference: 7A Create Foundation, 7B Multi-reference Image Editing, 7C verified Director Video, 7D Video Quality/Resolution; Phase 8 remains Library v2; Phase 9 Activity v2; Phase 10 expands to Account, Admin & Closed-Beta Operations; Phase 11 becomes Brand & Launch Experience; final integrated release validation moves to Phase 12. LoRA/model-adapter library work is an accepted post-Cycle-2 direction rather than part of Cycle 2.
**Reason:** Real production use exposed input-geometry, upload durability, prompt-reference, composer-density, hidden-workflow, admin, branding and visual-quality needs that are prerequisites or later-cycle concerns, not a single multi-reference feature.
**Consequences:** UI-037's original Phase 6–11 ordering is superseded. Phase 7A must establish the Create input/media/composer foundation before later Phase 7 slices are considered complete. Admin and branding are now explicit later Cycle 2 work; LoRA remains future scope with architecture compatibility preserved now.

### UI-039 — Reference-backed Create defaults to source-aware geometry with explicit override
**Status:** Accepted
**Decision:** Edit/Animate tasks that begin from user image media should default to an understandable `Original`/source-aware geometry behavior instead of silently applying an unrelated preset aspect ratio. The user may explicitly override to another capability-supported ratio. Create without a constraining reference may keep a normal product default.
**Reason:** The source image is part of the user's creative intent; surprising geometry changes make Edit/Animate feel destructive or arbitrary.
**Consequences:** Phase 7 audits exact worker resize/crop/normalization semantics before implementation, adds only verified ratios, keeps server validation authoritative and avoids promising literal pixel preservation where a worker requires normalized delivery dimensions.

### UI-040 — User uploads initiated from Create become durable Library media
**Status:** Accepted
**Decision:** Once a signed-in user's image upload initiated from Create is successfully transferred and server-verified, it becomes an owner-scoped durable `media_asset` and remains available in Library whether or not the user presses Generate or ultimately uses it in a job. Temporary provider/source staging may remain internal, but it is not the durable user-facing identity of the upload.
**Reason:** User-provided creative assets are reusable owned media, and discarding a successfully uploaded asset merely because a generation was abandoned conflicts with Library's role as the reusable media workspace.
**Consequences:** Phase 7 should reuse UI-022's persistent-upload promotion/media identity where practical, preserve opaque R2 boundaries and integrate Create uploads with existing Library search/Favorites/Collections/Viewer/Delete semantics. Do not expose `generation_sources` as a second durable Library asset type.

### UI-041 — Multi-reference inputs require explicit product identity and prompt addressing
**Status:** Accepted
**Decision:** Multi-reference Create gives each attached input a stable human-visible identity, deterministic order and task-relevant role metadata where useful. Prompt editing provides a product-level way to address attached references (for example via an `@reference` interaction/autocomplete) and the server persists/resolves that mapping against same-owner opaque media identities.
**Reason:** Multiple unlabeled files plus free text makes intent ambiguous for subject/outfit/pose/style/background/frame relationships and is difficult to reconstruct or validate.
**Consequences:** RenderLab guarantees correct input membership/order/role/prompt mapping and server validation, but does not claim a probabilistic image model will obey every semantic relation deterministically. Exact alias syntax, product maximum and FLUX/Qwen routing are locked from Phase 7 evidence rather than worker permissiveness.

### UI-042 — Hidden workflow capability becomes curated creative modes, not node controls
**Status:** Accepted
**Decision:** Useful capabilities discovered in ComfyUI workflows may be surfaced when they serve a concrete user goal, but they are translated into purpose-built product interactions. For the reported LTX/REDGraft frame/story/dialogue/sound capability, Phase 7 audits the actual configured workflow first and may expose a curated `Director` experience with storyboard/frame, action, dialogue and sound intent rather than raw node names/parameters.
**Reason:** Backend capability is valuable, while exposing graph structure would recreate ComfyUI complexity and worsen the already crowded Create experience.
**Consequences:** A user report or hidden node is a reason to audit, not proof of product support. Unverified/unstable inputs stay hidden. Director uses the same durable upload/reference contracts and must coexist with simple default Video creation through progressive disclosure.

### UI-043 — Maintained components are the mechanics foundation, not the visual ceiling
**Status:** Accepted
**Decision:** RenderLab's quality target is a premium modern creative application. shadcn/Radix and other approved maintained sources remain the default way to obtain reliable mechanics/accessibility, but feature composition should use deliberate RenderLab styling, spatial continuity, morphing/layout transitions, direct-manipulation feedback and other reviewed motion patterns when they materially improve the creative workflow.
**Reason:** Reuse prevents needless reinvention; it does not require the product to look like default component demos or a visually basic admin tool.
**Consequences:** Future visual reviews judge both usability and product quality. Motion must be purposeful, performant, touch/keyboard complete and reduced-motion safe; decorative physics/glow/parallax is not added merely to look AI-generated or fashionable.
