# UI Decisions

Records durable UI/UX decisions so independent AI sessions do not reverse them. This is not a general changelog.

Detailed implementation, verification, merge, rollout, and deployment chronology that previously accumulated here is historical evidence. The lossless pre-compaction record is preserved in `docs/history/ui/UI_DECISIONS_PRE_EVIDENCE_SEPARATION_2026-10-12.md`; search that snapshot by decision ID when exact run, artifact, PR, merge, or rollout provenance is needed.

## Format
### UI-XXX — Title
**Status:** Proposed | Accepted | Superseded  
**Decision:**  
**Reason:**  
**Consequences:**  
**Supersedes:** optional
**Superseded by:** required when Status is Superseded

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
**Supersedes:** UI-037
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


### UI-044 — Stable `@imageN` aliases use maintained thumbnail-picker mechanics
**Status:** Accepted
**Decision:** Phase 7 reference addressing uses stable human-visible image aliases beginning `@image1`, `@image2`, …, each bound to one currently attached reference identity. Prompt editing exposes a thumbnail picker/autocomplete limited to attached references and inserts/selects those aliases. RenderLab persists structured alias/order/role → same-owner opaque-input mapping and translates that product intent through the selected generation adapter; alias text itself never authorizes media access. Generic picker/popover/combobox mechanics come from the approved maintained component source order before any custom mechanic is considered.
**Reason:** Users need an understandable way to say which image they mean, while raw upload order and free text are too ambiguous for multi-reference creative work. Maintained interaction primitives give the picker reliable keyboard/focus/touch behavior without rebuilding solved UI infrastructure.
**Consequences:** Reordering or removing a reference must not silently retarget an alias already present in prompt text. A removed reference leaves its prompt alias unresolved and Generate is blocked until the user removes or replaces that reference. Server-side same-owner/media-kind/slot validation remains authoritative. If a new Popover/Command/combobox-style primitive is adopted, normalize the maintained implementation into `src/components/ui` and record it in `COMPONENT_CATALOG.md`; do not build a competing bespoke generic autocomplete.

### UI-045 — Reference capability approval requires contextual output evidence
**Status:** Accepted
**Decision:** A reference/edit capability is not approved merely because the worker accepts the request, returns media, persists correctly or produces the requested dimensions. Phase 7B requires bounded real-output artifact review using controlled synthetic references for intended semantic relationships: at minimum a person/outfit edit should preserve recognizable subject appearance, a two-distinct-person composition should visibly represent both intended people, and `@imageN`-directed prompts should be reviewed against the intended alias mapping.
**Reason:** The product value of reference-guided generation is semantic. Geometry and transport tests can prove deterministic plumbing while completely missing identity drift, dropped references or incorrect prompt-to-image association.
**Consequences:** RenderLab may guarantee deterministic input membership/order/role/alias resolution, but model obedience and identity fidelity remain probabilistic and must be described as such. Human artifact review is the acceptance mechanism; biometric/face-recognition scoring is not required. If a configured model/workflow repeatedly fails the bounded contextual cases, that route may be blocked, changed or deferred even when its API technically succeeds. Exact test fixtures remain synthetic/run-owned and are cleaned after evidence capture.

### UI-046 — Multi-reference Image Edit v0.1 is a bounded two-reference FLUX path
**Status:** Accepted
**Decision:** The first user-facing Multi-reference Image Edit contract accepts at most two attached image inputs when Image is selected and at most one attached image input when Video is selected. For a two-image edit, current request slot 1 has role `primary-image` and slot 2 has role `reference`; an explicit reorder may change which attached asset occupies those roles, but each existing `@imageN` alias remains bound to its original opaque media identity. FLUX remains the internal v0.1 Image/Edit route. Qwen remains a verified available internal multi-reference ecosystem but is not selected for v0.1 and does not create a user-facing model selector.
**Reason:** PR #51 proves deterministic alias persistence/translation. FLUX contextual audit `33263044354` preserved the synthetic subject strongly in the bounded outfit edit and visibly represented both intended people with correct alias-directed left/right placement despite deliberately reversed physical request order. Qwen contract audit `33263338596` verified a ready multi-reference `/jobs/edit` contract and contextual run `33263401453` completed the same tasks, but human review found materially more facial/stylistic drift than FLUX. Two inputs therefore have direct product evidence; higher worker-permitted counts do not.
**Consequences:** Capability/server/UI limits must be centralized and authoritative: reject more than two Image inputs, more than one Video input, invalid role/order combinations, unavailable/non-image/foreign inputs and unresolved aliases. The Create UI may reveal a second reference only for Image; it must not silently discard a second reference when switching output type. Replacing/removing/reordering must preserve alias identity, and a removed referenced alias remains unresolved until fixed. RenderLab guarantees correct membership/order/role/alias mapping and ownership validation, not deterministic generative obedience or biometric identity preservation. Raising the maximum, selecting Qwen or exposing model choice requires new evidence and an explicit product decision.

### UI-047 — Director Video is deferred until a structured deployed worker contract exists
**Status:** Accepted
**Decision:** Phase 7C does not add a Director mode or dedicated storyboard/frame/action/dialogue/speech/sound/camera controls under the current deployed REDGraft contract. Live audit `33266905978` verified both configured `/jobs/video` gateways expose one shared prompt, ordinary Video settings and at most one optional image input, with no structured Director-specific fields. Current Video/Animate remains the supported product surface. A future Director slice may be reopened only from fresh deployed-worker evidence for stable structured or multi-frame semantics; upstream LTX documentation or Saga reference code does not itself authorize RenderLab UI.
**Reason:** RenderLab exposes user goals backed by real product contracts, not speculative structure around a text prompt. Splitting one free-form prompt into labeled storyboard/dialogue/sound fields would imply deterministic backend semantics that the current deployed worker does not provide. The existing prompt can carry creative intent, but that alone is not evidence for a distinct Director capability model.
**Consequences:** Phase 7C closes as audit-complete / Director deferred with no route, schema, media-identity, worker or UI implementation change. If a future prompt-composition helper is desired without a structured worker contract, it requires its own product decision because it would be an authoring aid rather than a backend Director capability. Any future frame uploads must reuse the Phase 7A durable Create-upload and opaque reference identity/order foundations. The Phase 7C audit also found that deployed `/jobs/video` omits `steps` and `cfg`; a non-generating probe confirmed those extra multipart values are inactive. Video steps/guidance must therefore be reconciled before the next Video contract is accepted. Phase 7D Video Quality/Resolution is the next planned slice; this decision does not authorize deployment.

### UI-048 — Video resolution is contextual and 480p remains the default
**Status:** Accepted
**Decision:** Phase 7D exposes exactly `480p`, `720p`, `1080p` and `2K` as a Video-only **Resolution** setting inside the existing compact Video settings Dropdown Menu. `480p` remains the default; disabled `4K` stays hidden and server-rejected. Canonical Video intent carries `output.resolution` and persists it explicitly after server normalization. Video Steps/Guidance are removed from the product surface and rejected on new Video requests because the deployed REDGraft contract does not expose `steps`/`cfg`; Image Steps/Guidance remain unchanged.
**Reason:** Live audit `33266905978` verifies the four enabled resolution classes, a live `480p` gateway default, and no active Video `steps`/`cfg`. Phase 6 proved one bounded 720p generation, but higher-mode latency/capacity/cost evidence is not exhaustive and provider cost/deployment-wide capacity are not reliably observable. Calling the control `Quality` or silently raising the default would imply guarantees the product cannot currently support.
**Consequences:** The Video settings trigger summarizes the current resolution + duration, while the menu orders Resolution, Duration, Audio and Advanced. Video Advanced retains only negative prompt, seed and frame rate. Resolution composes with all curated fixed Video ratios and source-backed Animate `Original`, duration, 24/25/30 fps and Audio without changing durable source media. The existing maintained Button/DropdownMenu/Collapsible/Field/Input/NativeSelect layer is reused; no new generic primitive, route, model/provider selector, schema or infrastructure surface is introduced. Historical jobs are not backfilled; future Retry revalidates current capability, treats legacy missing Video resolution as 480p and does not replay legacy inactive Video Steps/Guidance. Implementation requires the exact configured server/live/output/responsive/reduced-motion matrix recorded in `UI_MIGRATION.md`. This decision does not authorize deployment and does not close the separate Phase 7A premium-interaction exit item.

### UI-049 — Library v2 organization stays owner-scoped and page-scoped
**Status:** Accepted
**Decision:** Phase 8 extends the existing Library organization model rather than introducing a new management architecture. Collection create/rename/delete is managed from a compact Library-owned progressive-disclosure surface; Viewer remains focused on current-asset collection membership. Deleting a collection deletes only that owner collection and its cascade membership rows, never the durable media, Favorite state, R2 object or generation history. Current-page batch organization reuses UI-034 selection and adds explicit target-state Favorite/Unfavorite and Add/Remove Collection actions; selection never becomes cross-page or durable. Planned product APIs are owner-scoped `PATCH|DELETE /api/media/collections/[collectionId]`, `POST /api/media/assets/batch-favorite`, and `POST /api/media/collections/[collectionId]/items/batch` with 1–24 UUID entries, deduped best-effort per-asset results and explicit target-state booleans.
**Reason:** UI-031/UI-032/UI-034 already establish the safe durable organization and selection boundaries. `0007_media_collections.sql` already cascades collection deletion only through membership rows, `media_assets.favorited_at` already owns Favorite state, and the current page is already capped at 24 assets. Reusing those contracts gives repeated-work productivity without inventing a global media store, a Collections app, ambiguous toggles or a new schema.
**Consequences:** Library exposes collection management even when an account has zero collections and may reuse the existing create endpoint there. Rename preserves the existing 1–120 normalized owner-unique naming contract. Collection Delete uses explicit destructive confirmation and, when deleting the active collection filter, removes only `collection` plus stale offset while preserving compatible Library filters. Batch organization stays non-destructive/reversible and does not require confirmation; permanent media Delete remains a separate UI-033/UI-034 action. Successful organization keeps selection on still-visible items so tasks can be chained, while server refresh naturally prunes items that no longer satisfy an active Favorite/Collection filter. Missing/foreign objects preserve the not-found privacy boundary. No migration, route hierarchy change, R2 mutation, Viewer management duplication, cross-page selection, Trash/restore or deployment is approved by this decision. If implementation reveals a schema gap, stop and amend the phase contract before changing the database.


### UI-050 — Activity Retry revalidates product intent; unsafe Cancel and global polling stay deferred
**Status:** Accepted
**Decision:** Phase 9 v0.1 adds one recovery mutation to Activity: an authenticated owner may Retry a **failed** generation job. Retry reconstructs only persisted product intent, applies narrowly documented legacy compatibility, revalidates the request and its referenced media/sources against current capability/ownership/readiness, then submits through the ordinary current generation path to create a distinct new job. The historical job remains unchanged. Retry never replays stored workflow/model/ecosystem/worker/provider/failover/error/output execution metadata. Cancel is not added: current native poll reassignment and result persistence are not guarded by an atomic cancellation state/version, so a local cancellation could race a standby submission or late durable result. The optional shell-global running/failed indicator is also deferred rather than introducing cross-route polling/global status state solely for this phase.
**Reason:** Failed jobs are durable user-recognizable creative attempts and already retain enough normalized intent for a safe current-capability retry. By contrast, a worker advertising cancellation does not prove the RenderLab orchestration can prevent late writes/duplicate execution. Recovery value can be delivered without broadening the shell or making infrastructure state the user's responsibility.
**Consequences:** Add planned owner-scoped `POST /api/generation/jobs/[jobId]/retry` with no browser-supplied generation payload. v0.1 accepts failed jobs only; active/succeeded/cancelled jobs are not retryable. Missing aliases may normalize positionally, legacy Video missing resolution normalizes through the current 480p default, and inactive legacy Video Steps/Guidance are discarded before current parsing; other current-invalid intent fails closed. Missing/foreign/tombstoned/not-ready inputs block retry before provider submission. Separate explicit retry requests may create separate attempts, so the client uses an in-flight busy guard rather than claiming server idempotence. No schema migration, retry-lineage table, general Run Again action, Cancel UI/API, shell-global polling, provider detail or deployment follows from this decision. A future Cancel contract must solve native/external provider semantics plus cancellation-aware atomic state/race/late-result/failover handling first.


### UI-051 — Phase 10 Account, Admin & Closed-Beta Operations contract
**Status:** Accepted
**Date:** 2026-08-30

**Decision:** Phase 10 is an ordered Closed-Beta operations program, not a generic admin-console build. Implement 10A Account Recovery & Admission, 10B Privileged Admin & Access Control, 10C Atomic Generation Admission Guardrails, then 10D Auth/Operational Hardening. The contract is merged before any implementation.

RenderLab authentication remains Supabase Auth, but RenderLab admission/authorization is server-owned product state. Add a protected RenderLab access registry with only `member|admin` and `active|suspended`, protected invitations by normalized email, typed global/account generation controls and server-only generation-admission reservations. Do not authorize from `user_metadata`; v0.1 also avoids app-metadata/JWT role claims so admin/suspension changes take effect without waiting for token refresh. Sensitive Admin page/API access must re-confirm current Auth identity server-side and then require an active admin record.

Closed Beta is invitation-gated. Remove visible ordinary `Create account` once admission is implemented. Admin records an invitation by email and may request server-only Supabase Auth invite delivery; if the Auth identity already exists, the pending RenderLab invitation remains claimable on verified sign-in. Never auto-import or display the shared project's complete `auth.users` namespace. Production enforcement requires an explicit operator-supplied bootstrap/import list of known RenderLab user UUIDs; no migration guesses which shared Auth identities belong to RenderLab.

`/admin` is approved as the only new top-level application route in Phase 10. It stays out of ordinary global navigation in v0.1; active admins receive a Settings link. It may manage RenderLab invitations, role/status, typed generation enable/limit overrides, global generation settings and sanitized aggregate RenderLab job health. It may not delete Auth accounts/data, alter passwords, expose prompts/media contents, provider/worker/workflow identifiers, raw backend errors/credentials or arbitrary cloud/provider controls. The last active admin cannot be demoted/suspended.

Generation guardrails are exact Closed-Beta defaults, not credits/pricing/SLA promises: one active job per account, twelve admitted dispatches per rolling 60 minutes; optional admin overrides are bounded to 1–4 active and 1–120/hour; a typed global/account `generationEnabled` switch is allowed. Create and Retry must pass the same transactional admission reservation after current validation/input preflight and before any native/external network request. Same-owner reservations serialize in Postgres so concurrent requests cannot both pass stale counts. Immediate failures release concurrency but the admitted dispatch still counts toward the rolling abuse window.

Account recovery uses maintained Supabase Auth SSR/PKCE conventions: enumeration-safe reset request, allowlisted token-hash `/auth/confirm`, `/settings/password`, signed-in current-password change where supported, and sanitized failure copy. CI may generate recovery/invite links with the server-only Auth Admin API rather than depend on email delivery. Leaked-password protection remains plan/config dependent; if unavailable, record it as a broader-beta blocker rather than claiming it solved.

**Reason:** the Phase 10 audit found authenticated identity but no recovery, no RenderLab access/admin model, visible self-service signup despite a Closed-Beta operating boundary, and no app-level generation admission controls. The shared Supabase project also contains non-RenderLab resources, so treating the entire Auth directory or user-editable metadata as RenderLab authorization would violate the existing ownership boundary.

**Validation:** configured run-owned admin/member/unadmitted/suspended identities; recovery/password flow; invitation claim; last-admin safety; active-access enforcement on private media/history/generation paths; exact 1-active and 12/hour race-safe admission; Create/Retry shared guard; global/per-account controls; sanitized Admin health; zero browser grants to new tables/functions; exact cleanup; exact-head affected workflow set plus desktop/narrow Settings/Admin human review.

**Non-goals:** account/data deletion, billing/credits, MFA productization, public-beta launch, generic feature-flag platform, ordinary-user provider/worker management, raw provider administration, shell-global job/account polling, redesigning Create/Library/Activity, or deployment.

**Phase 10D execution-contract expansion (2026-08-30):** UI-051 now distinguishes JWT validation from current-session authorization. The root SSR proxy may keep `auth.getClaims()` for cookie refresh/signature validation, but private RenderLab account resolution and security-sensitive Settings state must use fresh server-confirmed `auth.getUser()` before product access is returned. Live two-session audit `33312153080` proved the acting password-change session remains valid while another session is immediately removed at Auth (`getUser 403`, refresh `400`), so 10D does not force unnecessary sign-out of the acting session; it instead makes RenderLab honor that revocation immediately. Hosted Auth logs also prove the project currently sends recovery mail through Supabase built-in email (`noreply@mail.app.supabase.io`) and can hit `over_email_send_rate_limit`; custom production mail plus token-hash template/Site URL/redirect evidence and Free-plan leaked-password protection remain broader-beta blockers. No schema, MFA/CAPTCHA productization, public-beta launch or deployment is approved by this expansion.


### UI-052 — Public landing owns `/`; Create moves to `/create`
**Status:** Accepted
**Date:** 2026-08-30
**Decision:** Phase 11 makes `/` the public RenderLab Brand / Launch surface and moves the application Create workspace to `/create`. Marketing and application chrome use separate App Router route-group layouts: landing renders without `AppShell`; Create, Library, Viewer, Activity, Settings and Admin share the existing application shell. Existing public URLs stay unchanged except Create. Legacy root requests carrying `source` or `action` redirect same-origin to `/create` with the query preserved so the existing Create server boundary continues to validate continuation UUID/action/ownership/media state. Shell Create navigation and shell wordmark point to `/create`; the marketing wordmark points to `/`. Landing `Open Create` points to `/create`, and `Sign in` points to the existing `/settings` account surface. No public signup, waitlist or second auth system is introduced.
**Reason:** RenderLab needs a normal public product home without forcing marketing chrome into the dense application workspace or making the existing root Create route serve two incompatible jobs. Moving Create deliberately is cleaner than adding a secondary marketing URL, while explicit legacy-query compatibility prevents existing Viewer/deep links from silently breaking. Reusing `/settings` keeps closed-beta authentication/admission truthful and avoids parallel account UI.
**Consequences:** Phase 11 implementation must update root/app layouts, shell navigation, Create route/tests/deep links and metadata together; bare `/` becomes public landing only when that implementation merges. The landing may use richer brand composition/motion than the workspace but keeps the established dark/violet family, accessibility/reduced-motion requirements and truthful verified-capability claims. No schema, provider, Auth policy, public admission or deployment follows from this decision. Before implementation, a Penpot/open-SVG desktop+narrow brand/landing checkpoint is required; final approval requires exact-head browser validation and human review.


### UI-053 — Transactional email uses a project-scoped sender domain and branded email shell
**Status:** Accepted
**Date:** 2026-08-31
**Decision:** RenderLab keeps its web application on `renderlab.faresuniform.uk` but isolates Auth/transactional email identity on `mail.renderlab.faresuniform.uk`. The default production From identity is `RenderLab <noreply@mail.renderlab.faresuniform.uk>`. Transactional invite and recovery emails use a professional responsive RenderLab HTML shell with the RenderLab logo/wordmark, restrained branded header/banner treatment, clear hierarchy, one prominent accessible CTA button, concise context/security copy and a visible fallback text link. The email body/footer should present the RenderLab product brand rather than unnecessarily foregrounding the parent `faresuniform.uk` brand, while accepting that the real sender address remains inspectable by mail clients. Essential instructions, destination and security meaning must remain understandable when remote images are blocked or advanced CSS is stripped.
**Reason:** The existing web hostname is already a Vercel CNAME, so using a dedicated mail subdomain avoids DNS collisions and isolates RenderLab's sender authentication/reputation from the web host and from future projects under the same parent domain. A polished branded transactional shell increases trust and product coherence, but Auth emails must remain robust across restrictive email clients and must not become marketing messages.
**Consequences:** Phase 13 authenticates `mail.renderlab.faresuniform.uk` with only provider-required SPF/DKIM/DMARC-related records while preserving existing Vercel, Cloudflare Tunnel, apex mail-routing and unrelated DNS. The logo/banner is decorative/branding support, never the sole carrier of required text. Use email-safe markup/inline styles and system-font fallbacks; provide useful alt text and a text fallback for the CTA. Invite and recovery share the shell, but recovery copy remains security-focused. Provider link rewriting/click tracking stays disabled for Auth URLs. This decision selects the sender-domain and visual contract only; it does not itself approve a provider account/plan, create SMTP credentials, mutate DNS/Auth, send mail or deploy application code.


### UI-054 — Inbox sender avatar uses authenticated RenderLab brand identity
**Status:** Accepted
**Date:** 2026-09-02
**Decision:** Where a receiving mailbox supports authenticated brand indicators, RenderLab should present the RenderLab mark in the inbox sender-avatar slot for transactional Auth mail. This mailbox-list identity is separate from the logo rendered inside the HTML message. Implement it through standards/provider-supported authenticated brand mechanisms such as BIMI rather than From-name tricks, emoji, contact-avatar assumptions, or message-body images.
**Reason:** Post-Phase-13 real Gmail acceptance proved delivery, rendering and Auth links, but Gmail still displayed a generic sender avatar. A verified sender mark improves recognition and professional polish without weakening the transactional email security model.
**Consequences:** A future implementation must first audit live SPF/DKIM/DMARC and all shared `faresuniform.uk` mail flows. Current Resend BIMI guidance requires DMARC enforcement and, for subdomain BIMI, enforcement at the root/apex as well; it also requires a BIMI-compatible SVG Tiny P/S logo and an eligible VMC or CMC for Gmail brand-avatar display. Phase 13A historically recorded apex DMARC at `p=none`, so no enforcement change may be inferred or applied without a fresh blast-radius audit. The existing RenderLab application SVG must not be assumed BIMI-compliant. Mailbox display remains conditional on provider policy/reputation and is not guaranteed. This decision approves the desired identity outcome only; it does not authorize DNS/DMARC changes, certificate purchase, provider mutation, application code or deployment.


### UI-055 — Generation Cancel is serialized lifecycle control, not a provider shortcut
**Status:** Accepted
**Date:** 2026-09-04  
**Decision:** Phase 15 v0.1 adds owner-facing Cancel only for RenderLab-native generation when the server says the active job is safely cancellable before durable result persistence. Cancel is a lifecycle mutation serialized through the Phase 14 reconciliation claim, with an intermediate `cancelling` state and terminal `cancelled`; it is not a browser-direct worker call. Activity is the v0.1 action surface, using server-derived `canCancel` plus maintained confirmation UI. Once `persisting` wins, Cancel is unavailable and the durable result path remains authoritative. Optional external-backend cancellation is not advertised unless an authenticated external cancel contract is separately implemented and verified.  
**Reason:** Provider gateways already expose cancellation, but provider support alone does not protect RenderLab from late output persistence, standby reassignment, concurrent polling or premature admission release. Phase 14 finally provides the lifecycle claim/output-slot foundation needed to make cancellation a product-safe state transition rather than a best-effort infrastructure button.  
**Consequences:** `cancelling` is active server-owned state; ordinary failover/finalization stops once cancellation intent wins, while cancellation reconciliation retries the current provider call without reassignment. Admission remains occupied until terminal `cancelled`. Cancelled jobs remain non-retryable under UI-050; successful Run Again/Remix remains Phase 16. The browser never supplies worker/provider identity. Phase 15 also permits only bounded reference-aware maintenance of stale staging and already-tombstoned pending purges; age alone never authorizes deletion of referenced or unknown user data. This decision does not authorize production deployment, scheduler activation, broad R2 garbage collection, external-backend Cancel, or unrelated UI redesign.

### UI-056 — Successful creative history is reusable product intent, not provider replay
**Status:** Accepted
**Date:** 2026-09-05
**Decision:** Phase 16 adds three bounded creative-iteration affordances over existing owner-scoped durable history: generated Media Viewer may open a current-valid producing recipe in Create as **Reuse settings**; successful Activity jobs may **Run again** through a distinct ordinary current submission; and generated Edit/Animate Viewer results may progressively **Compare source** only when their producing job still points to an active same-owner durable primary media source. All recipe reconstruction is server-owned and revalidates the persisted product request against current capability/input ownership/readiness. Historical worker, provider, workflow/model routing, failover, errors and storage identity are never replayed. Variations is explicitly deferred despite Phase 14 output-slot readiness because current worker/product execution still returns one output per call and has no approved output-count semantics.
**Reason:** RenderLab now has durable normalized generation intent and reliable output→job provenance, so successful work can become a useful starting point without making users manually reconstruct prompts/settings. At the same time, the planning audit showed historical input availability is volatile and current generation remains single-output; blindly replaying old execution or fabricating multi-output semantics would violate current ownership/capability truth.
**Consequences:** Failed-job Retry keeps its recovery-only eligibility while sharing reconstruction/current-validation implementation with successful reuse. Reuse Settings performs no implicit dispatch and may be edited in the existing Create workspace. Run Again creates a new job through current admission/routing and does not promise bit-identical output. Comparison never resurrects temporary/deleted sources and does not create a new route or parallel media manager. Recipe URLs/job IDs remain opaque untrusted navigation identity. v0.1 adds no recipe table, lineage tree, public sharing, top-level Recipes destination, provider selector, Variations, production deployment or scheduler activation. The Phase 16D desktop+narrow comparison direction was user-approved on 2026-09-05 in design PR #100. The accepted v0.1 layout keeps the default Viewer unchanged; reveals comparison progressively; keeps Result primary at roughly 60/40 on wide layouts with truthful source/result aspect ratios; stacks a full-width Result before a compact contextual Source card on narrow layouts; gives Source only `Open source`; keeps Prompt/Details/Continue/Actions and video playback controls result-owned; uses a restrained result accent treatment and `Close comparison` as the active-state wording; and adds no separate route or durable comparison state.

### UI-057 — Operator observability extends privileged Admin Health
**Status:** Accepted
**Date:** 2026-09-05
**Decision:** Phase 17 operator visibility extends the existing fresh-active-admin `/admin` **Health** section rather than creating a new Observability/Operations destination or adding infrastructure state to ordinary product navigation. The Health contract remains bounded and aggregate: truthful lifecycle status/operation outcomes, labelled timing aggregates/bands, sanitized failure codes, failover/cancellation incidence, stale-active age buckets, admission/capacity snapshot and Phase 15 maintenance backlog may be shown when derivable from current durable state. Structured server diagnostics use opaque server-generated correlation identity and typed bounded event/error fields, but Admin/product payloads do not expose prompts, media contents/names, account identity, R2/storage identity, provider job/worker/workflow IDs or raw provider messages. No client analytics/session replay is introduced by this decision.
**Reason:** RenderLab already has a privileged Admin Health surface, durable lifecycle timestamps/status/error/failover state, admission reservations and bounded maintenance summaries. Extending those proven seams gives operators useful incident/capacity visibility without fragmenting the product into an infrastructure console or collecting sensitive creative/account data merely for telemetry.
**Consequences:** Reuse the current fresh-admin authorization and server-owned Admin contract/RPC/query boundary; ordinary Create/Library/Viewer/Activity behavior remains product-level and unchanged. Prefer compact conventional Admin stat/table composition rather than a new dashboard framework. No schema/event-store or telemetry vendor is pre-approved: derive the v0.1 aggregates from existing state first, and amend the Phase 17 contract before adding durable telemetry storage or a vendor that changes privacy/cost/runtime boundaries. Any changed privileged function must preserve RLS/browser-grant revocation, empty `search_path` and service-role-only execution. If Admin Health rendering changes, configured desktop+narrow verification and human review are required. This decision does not authorize production deployment, reconciliation/maintenance scheduling, provider controls, billing/cost/SLA claims, client tracking or Phase 18 capability implementation.

### UI-058 — Image Upscale is a contextual durable-media continuation
**Status:** Accepted
**Date:** 2026-09-06
**Decision:** Phase 18 productizes one capability only: **Image Upscale v0.1** as a fixed **Upscale 2×** action on an eligible active durable image in Media Viewer. Upscale creates a distinct owner-scoped asynchronous `upscale-image` job and a distinct durable image result while preserving the source. v0.1 does not add a top-level Upscale destination, Library-card quick action, new Create mode, prompt, factor picker, model/provider selector or generic workflow UI. The visible action appears in the existing Viewer Continue hierarchy only when server-derived source/backend eligibility is true. On acceptance the source Viewer remains stable with concise local feedback and an Activity continuation; completion is never fabricated. A succeeded Upscale result may use existing Compare source when its same-owner durable source remains active. Failed Upscale may use current-revalidated Retry; successful Run Again and Reuse Settings remain absent because v0.1 has no editable recipe.
**Reason:** The fresh Phase 18 deployed-worker audit found no Upscale/Restore endpoint, so the product must first establish a truthful worker contract. Once that exists, fixed 2× Upscale fits RenderLab's existing durable-media continuation loop without forcing a non-prompt task into the prompt-centric Create composer or fragmenting navigation. Keeping one fixed factor avoids premature controls before real worker/output limits are proved.
**Consequences:** The source is never overwritten; ordinary Library/Viewer media behavior applies to the new result. Server ownership, admission, cancellation, reconciliation, finalization and diagnostics remain authoritative. The UI must not claim Restore/enhancement semantics, expose infrastructure identity or make model-quality/ETA guarantees. A desktop+narrow Viewer design checkpoint and configured rendered review are required before implementation is approved. Restore, Inpainting/Outpainting, LoRA/model adapters, Director, video upscale, 4×/arbitrary factors, batch upscale and Variations remain outside UI-058. This decision does not authorize a worker deployment or production application deployment.

### UI-059 — Contextual Image model choice is product intent, not worker selection
**Status:** Accepted
**Date:** 2026-09-07
**Decision:** When Create is in Image output mode, expose one compact model selector containing the currently productized image choices: **FLUX.2 Klein 9B** and **Qwen Image Edit 2511**. FLUX remains the default because the existing bounded comparison evidence favored its identity preservation; Qwen is a deliberate user-selectable alternative because both registered Qwen gateways remain ready and contract-compatible. The selection is canonical generation product intent, not a provider-routing hint: it is validated against output kind, persisted in existing generation-job parameters, reconstructed through current-valid recipe reuse/retry paths, and resolved server-side to the matching worker ecosystem. Do not expose primary/standby worker selection, raw workflow/checkpoint IDs, provider identity or failover controls. Video keeps no model selector while only one current productized Video model exists. Qwen's verified Lightning contract is fixed at 4 steps / CFG 1.0, so configurable FLUX Steps/Guidance are hidden and incompatible Qwen tuning is rejected.
**Reason:** Users reasonably need control over materially different image-generation/edit behavior, and RenderLab already has two verified active image ecosystems. Keeping the model completely invisible makes creative output choice opaque; exposing raw workers would swing too far toward infrastructure complexity. A bounded model choice preserves the product principle of simple defaults while giving users meaningful creative control.
**Consequences:** `GenerationRequest.model` uses stable product IDs (`flux2-klein-9b`, `qwen-image-edit-2511`, with `ltx25-redgraft` as the current Video identity). Historical requests/jobs with no model field preserve the old default behavior. Reuse Settings, Run Again and Retry preserve the selected current-valid model rather than silently reverting to FLUX. No Models top-level screen, schema migration, worker redeployment or new infrastructure resource is introduced. This refines UI-015/UI-046 without changing their bounded-reference or hidden-worker rules.

### UI-060 — Library separates Creatives and Uploads while retaining one media identity
**Status:** Accepted
**Date:** 2026-09-07
**Decision:** `/library` has two origin-scoped, URL-addressable sections over the existing durable media model. **Creatives** is the canonical default and maps to `media_assets.origin=generated`; **Uploads** maps to `media_assets.origin=uploaded` and is encoded as `tab=uploads`. The section is higher-level browsing context than `All / Images / Videos`: kind, search, Favorites, Collections and sort remain available inside either section, pagination is section-scoped, and switching sections clears stale `offset`. Upload and desktop drag/drop are visible/active only in Uploads. The Media Viewer remains `/library/[assetId]`, and both sections continue using the same Favorite, Collection, rename, delete, download and continuation contracts.

**Reason:** Generated creative outputs and user-supplied source assets serve different day-to-day retrieval tasks. Keeping them visually interleaved makes the Library harder to scan and makes uploads compete with the outputs users usually want to revisit. The existing durable origin field already expresses this distinction truthfully, so the UI can expose it without inventing a parallel data store.

**Consequences:** UI-020's original v0.1 instruction not to add Creatives/Uploads tabs and UI-022's original instruction not to expose an Uploads section are superseded by this decision. Their more important architectural constraint remains: uploads are ordinary durable `media_assets`, not a parallel public media identity. `GET /api/media/assets` may accept optional `origin=generated|uploaded`; omitted origin remains backward-compatible unified API behavior. No schema migration, data backfill, new top-level route, worker/provider change or production rollout is implied.

### UI-061 — Create Advanced disclosure is dedicated and the narrow control row stays compact
**Status:** Accepted
**Date:** 2026-09-07
**Decision:** Image and Video use the same dedicated compact Advanced disclosure button in the primary Create control row. Video's Resolution / Duration / Audio dropdown no longer contains an Advanced menu item. On narrow/mobile layouts, the non-primary Create controls remain one no-wrap row: Add reference, Image/Video intent, contextual model (Image only), aspect ratio, contextual Video settings (Video only), and Advanced. The Image model trigger uses compact visible `FLUX` / `Qwen` labels while retaining the full accessible name and full model labels/version context inside the menu. Generate remains the separate full-width primary action on narrow layouts.

**Reason:** Hiding Advanced inside Video settings makes the same capability discoverable in two different ways, and the existing control widths force contextual settings onto a second row on narrow screens. The correction restores interaction parity between Image and Video while reducing chrome width instead of hiding capability.

**Consequences:** This supersedes only UI-048's placement of Advanced inside the Video settings menu and the earlier Phase 7A allowance for the narrow primary-control cluster to wrap. Resolution, Duration, Audio, model intent, aspect ratios, Advanced fields, generation serialization, accessibility semantics, reduced-motion behavior and server validation are unchanged. The implementation reuses the approved Button / ToggleGroup / DropdownMenu / Collapsible layer and existing 32–36px compact visual metrics; no new primitive, route, schema, worker/provider contract or deployment is introduced.


### UI-062 — Cycle 4 uses a Kinetic Precision visual system and starts at the shared AppShell
**Status:** Accepted
**Date:** 2026-09-07

**Decision:** RenderLab's next visual era is **Kinetic Precision**: a dark media-first creative environment with restrained spectral atmosphere, translucent dimensional chrome, spring/shared-layout morphing, tactile interaction feedback and carefully bounded depth. Phase 19 applies the first visible layer at the shared application shell so Create, Library/Viewer, Activity and Settings immediately inherit the new visual language. The existing information architecture, destinations, product semantics and ownership boundaries remain unchanged.

The signature Phase 19 motifs are:
- atmospheric near-black canvas with low-frequency violet/electric light;
- glass/translucent shell surfaces with subtle inner highlight and depth rather than flat opaque charcoal;
- shared-layout spring motion for active navigation selection;
- small press/hover/focus response that makes controls feel physical without reducing touch/keyboard parity;
- a floating mobile navigation dock with the same active-state language;
- reduced-motion-aware top-level route continuity.

**Reason:** The current product is functionally mature but visually restrained enough to read as a conventional component-library application. The explicit product goal is now a visibly futuristic, high-end AI creative experience comparable in interaction ambition to modern model-demo sites. Starting with the shared shell establishes one coherent visual grammar before feature-level redesigns and makes the first implementation slice materially visible across the product.

**Effect budget / guardrails:** Futuristic does not mean permanent spectacle. Avoid rainbow gradients, constant high-amplitude parallax, cursor-following particles, essential hover-only behavior, large-area glow behind body copy, continuous JS physics loops or expensive WebGL as baseline chrome. Continuous ambience should be CSS/transform/opacity based and subtle. Physics-like response is reserved for discrete interaction using Motion springs. `prefers-reduced-motion` must produce a complete static composition. Media, prompts and task state remain more visually important than decorative effects.

**Consequences:** UI-062 deliberately evolves the approved-but-not-locked shell visual treatment and the earlier UI System warning against gratuitous effects; that warning still applies to unbounded decoration, while purposeful visible atmosphere/morphing/tactility is now an explicit product requirement. Phase 19 changes no backend capability, route, schema, worker/provider contract or deployment boundary. Feature-internal visual redesign remains sequenced into later Cycle 4 phases.


### UI-063 — Create becomes the signature Kinetic Precision creative instrument
**Status:** Accepted
**Date:** 2026-09-07

**Decision:** Phase 20 may deliberately redesign the internal visual composition and interaction treatment of `/create` while preserving all current product semantics. The Create workspace should feel like one coherent creative instrument: immersive prompt stage, morphing Image/Video context, media-like reference slots, a precision-oriented Advanced disclosure, a tactile Generate actuator, truthful lifecycle energy and spatial result arrival. This supersedes the earlier visual restraint only where necessary to meet the explicit Cycle 4 goal; it does not reopen generation, ownership or routing contracts.

**Interaction rule:** Motion must explain state and spatial continuity. Image/Video selection may use shared-layout spring morphing; references may animate insertion/removal/reorder; Advanced may expand as a transition panel; Generate may use tactile press/luminous active state; results may arrive through bounded opacity/blur/scale/layout motion. Real product lifecycle categories may drive visual energy, but fake percentages, ETA, provider stages or decorative pseudo-progress are prohibited.

**Tooling rule:** The existing Motion + CSS + RenderLab primitive stack is the default. Motion Primitives and React Bits are approved candidate sources for specific mechanics. GSAP or Lenis may be evaluated only when a concrete Phase 20 interaction cannot be expressed cleanly with the current stack; adding a second animation runtime or smooth-scroll layer merely for novelty is not approved. Watermelon UI, Kaikei.app, Taste/Vercel design-guideline skills, `awesome-design.md`, image-to-code and Emil Kowalski interaction references may inform design/review when available, but they are advisory and must pass source/license/accessibility/performance/token-fit review before any code adoption.

**Guardrails:** Keep one `/create` route, current Image/Video/model/reference/Advanced semantics, current 390px essential-control density, account/admission/privacy boundaries and durable result behavior. No WebGL, cursor followers, scroll hijacking, continuous pointer physics, worker/provider exposure, schema change or deployment is authorized. Reduced motion must preserve full hierarchy without transform-dependent meaning.

**Reason:** Phase 19 successfully changed the shared shell, but the Create interior still reads primarily as a conventional form. Create is the product's signature authoring surface and therefore the highest-leverage place to deliver the user's requested futuristic, demo-quality tactility and morphing behavior while keeping RenderLab's mature backend contracts stable.

**Acceptance:** final approval requires exact-head functional regressions plus human desktop/390px review of empty Image/Video, reference, Advanced, active-generation, result and reduced-motion states. A technically passing but visually timid candidate is not sufficient.

### UI-064 — Library and Viewer become the Kinetic Precision spatial media workspace
**Status:** Accepted
**Date:** 2026-09-07


**Decision:** Cycle 4 Phase 21 may deliberately redesign the visual composition and interaction treatment of `/library` and `/library/[assetId]` so durable media feels spatial, tactile and media-first while preserving the complete current Library/Viewer product model. Library cards gain bounded depth/tactility and clearer selection state; opening media gains safe spatial continuity; Viewer becomes a dimensional media stage; eligible Compare source gains bounded layout choreography. UI-060 Creatives/Uploads, URL-owned discovery/organization, current-page selection, durable media identity, capability-derived continuation, Viewer actions and server-derived Compare/Upscale eligibility remain authoritative.

**Spatial-continuity rule:** The user should perceive the Library media object and Viewer media stage as the same durable object across navigation. Literal cross-route shared-element animation is not itself a requirement if the current Next App Router lifecycle would require brittle DOM persistence, navigation interception or global client state. Matched media geometry plus a bounded keyed Viewer entrance is an accepted implementation when it provides clear continuity without weakening deep links/back navigation. Stable media ID may key presentation but never authorization.

**Card/effect rule:** Media is more important than chrome. Bounded pointer-capable lift/tilt/spotlight is allowed, but dense-grid comfort, keyboard/touch parity and reduced-motion/static hierarchy are mandatory. Cards must not acquire hover-only management actions or become miniature Viewer consoles. Selection must remain unmistakable without animation.

**Viewer rule:** Result/current media remains primary. Prompt/Details/Continue/Actions become subordinate precision chrome, not a second focal plane. UI-056 Source stays contextual with only `Open source`; native result-video controls remain intact. UI-058 Upscale stays a server-eligible fixed 2× continuation with truthful start/accepted/error states and no Viewer job polling.

**Architecture/tooling rule:** Keep Library URL/server state and Viewer owner/capability derivation where they are today. Client motion stays feature-local presentation state; no global media/animation/router store is approved. Existing RenderLab primitives + Motion + Phase 19 tokens are the first implementation choice. Motion Primitives/React Bits remain individually reviewed candidates; GSAP/Lenis are not justified for ordinary Phase 21 layout/hover continuity.

**Design/acceptance rule:** A repository-backed Penpot/open-SVG desktop + 390px checkpoint for Library default/selection and Viewer default/comparison must be reviewed before Phase 21 visual implementation. Completion then requires exact-head functional regressions plus human desktop/390px/reduced-motion review. A technically green but visually flat candidate does not satisfy the Cycle 4 goal.

**Consequences:** This decision changes no media/schema/account/storage/generation/worker/deployment contract. No new route, third Library section, media identity, capability, post-processing control or production rollout is approved. Phase 22 remains roadmap-only until Phase 21 closes.

### UI-065 — Activity, Settings and Landing complete Kinetic Precision system cohesion
**Status:** Accepted
**Date:** 2026-09-08

**Decision:** Cycle 4 Phase 22 deliberately extends the already-approved Kinetic Precision language into `/activity`, `/settings` + password continuation, and public `/` without changing ownership, authorization, capability or routing semantics. Activity gains dimensional truthful lifecycle hierarchy from persisted product state; Settings becomes a deliberate identity/access/security surface; Landing becomes the public Kinetic Precision expression with a clearly decorative/static product preview. These surfaces must feel related to Create and Library/Viewer while retaining their distinct product jobs.

**Activity rule:** Real persisted lifecycle meaning stays primary. Queued/preparing/running/cancelling/persisting/succeeded/failed/cancelled labels, sanitized failure copy and server-derived View Result / Run Again / Retry / Cancel eligibility remain authoritative. Motion may reinforce active state but cannot fabricate percent progress, ETA, provider stage, queue position or SLA; reduced motion keeps equivalent static meaning.

**Settings rule:** Identity, Closed Beta access and admin visibility remain server-derived. Signed-out stays Sign in + Forgot password with no public account creation and no Admin continuation. Active/suspended states keep truthful access feedback; password/sign-out remain reachable on narrow layouts above the floating dock. The Admin continuation appears only for a real fresh active-admin identity match. Phase 22 adds no profile/preferences/role-editing/account-management system.

**Landing rule:** `Open Create` continues to `/create`; `Sign in` continues to `/settings`; legacy root continuation still preserves query intent into Create. Closed-beta/invitation-only truth stays explicit. The product preview may communicate current operations and visual language only when clearly marked as a static illustration rather than live generation state. Public signup/pricing/testimonial/fake-metric/provider/model/SLA and marketing-analytics claims remain absent.

**Cohesion/effect rule:** Reuse UI-062's existing atmospheric, glass, depth, tactile and reduced-motion system. Phase 22 may use feature-scoped CSS and existing Motion where presentation benefits, but no second animation runtime, shell-global state, WebGL/shader engine or new reusable component is justified. Effects stay subordinate to status/content hierarchy, and 390px keyboard/touch/focus behavior remains mandatory.


**Consequences:** UI-065 changes no generation/media/account/admission/schema/storage/worker/provider/routing/deployment contract and adopts no new dependency.

### UI-066 — Post-production corrective interaction pass
**Status:** Accepted

Live Cycle 4 production review supersedes several narrow interaction details without reopening the visual system or creating a new phase:

- AppShell top-right Activity and account/Settings utilities use equal centered control geometry on narrow screens.
- Library keeps URL/server-owned `sort=newest|oldest`, but UI-027's dropdown interaction is superseded by a single direct toggle whose visible label is the current order and whose activation switches to the other order. Newest remains the canonical URL default.
- Narrow Library actions reflow into deliberate full-width/equal groupings before returning to the compact desktop row.
- Create's compact model/aspect/video-setting triggers preserve UI-061's one-row contract while using ordinary flex spacing between label and chevron instead of overlapping absolute placement.
- Source-free Image Create rotates a bounded set of truthful creative headlines with short Motion transitions. Reduced motion disables timed rotation and presents the stable first phrase.
- Advanced Seed gains a die-style randomize action. Randomized product seeds are conservative non-negative 31-bit integers and a randomize action must differ from the current seed.
- Failed-job Retry remains a new distinct job from current-revalidated persisted intent, but now deliberately replaces the historical seed with a new random seed. Other current-valid settings are preserved. Successful Run Again remains a separate unchanged operation.

These are corrective interaction changes only: no new route, global client store, model/provider exposure, schema or deployment contract is introduced.

### UI-067 — Deleted generated content leaves the user-facing Activity feed
**Status:** Accepted

When a succeeded generation's recorded result media has been deleted and no active result from that job remains, the corresponding entry is omitted from the ordinary Activity feed. This supersedes UI-035's prior user-facing consequence that deleted-output jobs remained visible without a Viewer action.

The correction changes product visibility, not lifecycle history storage: `generation_jobs` remains server-owned historical/diagnostic state and media tombstones remain intact. Active, failed, cancelled and succeeded jobs with at least one active result keep their existing Activity semantics. No database migration or hard-delete cascade is introduced.

### UI-068 — Create composer and desktop shell chrome cleanup
**Status:** Accepted
**Date:** 2026-09-09

**Decision:** User-directed production review supersedes two narrow presentation details without reopening the shell or Create architecture. Desktop `/create` omits AppShell's full-width top context bar because the persistent desktop rail already communicates Create context and provides Activity/Settings navigation. Mobile Create retains the compact utility header because Settings is not a persistent mobile-dock destination, and other application routes retain their existing top bar.

Create's prompt area is one visual composer rather than a nested field inside a card. The maintained bare `Textarea` keeps native semantics, keyboard focus and accessible naming, but inside `.kinetic-composer` its independent focus outline is suppressed; the existing composer `:focus-within` border/glow becomes the sole visible focus boundary. This is a feature-scoped visual composition rule, not a weakening of the global focus contract.


**Consequences:** No generation, media, account, authorization, schema, storage, worker, provider, routing or deployment contract changes. Automatic Git deployment remains disabled. UI-068 does not authorize Phase 23 / Cycle 5.

### UI-069 — Post-production Create / Viewer / Library corrective interaction pass
**Status:** Accepted
**Date:** 2026-09-09

**Decision:** User-directed production review adds four bounded corrections without reopening Create, Library or Viewer architecture. Desktop Create may accept one image file dropped onto the composer through the exact existing durable reference-upload transaction used by the file picker; the picker remains the keyboard/touch/mobile baseline. Media Viewer layout/stage/rail children must permit min-content shrinking, long unbroken titles/filenames must wrap safely and intrinsic media must not force horizontal viewport overflow at narrow or intermediate widths. Library Favorites / Collections / sort controls share one actual baseline and closed progressive-disclosure content may not reserve phantom spacing. Creatives↔Uploads and All↔Images↔Videos remain URL/server-owned; relevant destinations are explicitly prefetched and the activating link exposes immediate pending feedback while the dynamic authoritative server view resolves. No client-owned Library dataset/filter store is introduced.



**Consequences:** No schema, account/authorization, generation/provider/worker, R2/storage, route hierarchy or deployment contract changes. Automatic Git deployment remains disabled. UI-069 does not authorize or imply Phase 23 / Cycle 5.


### UI-070 — Library media cards are media-first and selection chrome is visually compact
**Status:** Accepted
**Date:** 2026-09-10

**Decision:** User-directed post-production review refines only the Library card presentation and card-level selection chrome. The maintained Radix Checkbox remains the selection mechanic, keyboard/focus semantics remain unchanged, and its interactive root stays 44×44px; the visible box is reduced to 22×22px and uses restrained checked-state accent treatment instead of the previous 36×36px filled square inside a second styled shell. Library media cards remain links to the same Viewer and keep the same title/kind/date information, but the visual composition becomes media-first: the 4:3 media frame is the full card surface and metadata sits in a compact floating glass shelf over the lower media edge rather than a separate opaque footer. Video identity moves to the top-right so it cannot compete with the top-left selection control.

**Guardrails:** No card quick actions, Favorite/Collection controls, client-owned media/filter state, selection persistence, route, grid-count, durable media identity or server contract changes. The card remains fully understandable without hover; hover only adds restrained lift/saturation using the existing reduced-motion-safe Kinetic Precision system. No new primitive, animation runtime or dependency is introduced.


**Consequences:** No schema, account/authorization, generation/provider/worker, R2/storage, route hierarchy or deployment contract changed. Automatic Git → Vercel deployment remains disabled. UI-070 does not authorize or imply Phase 23 / Cycle 5.

### UI-071 — Desktop application chrome is rail-only and Create drop copy aligns as one unit
**Status:** Accepted
**Date:** 2026-09-10
**Supersession:** UI-074 supersedes UI-071's desktop-rail/mobile-dock shell geometry. UI-071's Create drag/drop copy-alignment correction remains accepted.

**Decision:** User-directed production review supersedes UI-068's desktop-Create-only top-bar exception. On desktop application routes, the persistent left rail is the shell navigation/context surface and the redundant full-width top context bar is omitted across Create, Library/Viewer, Activity, Settings and Admin. Mobile/narrow application routes keep the compact utility header because Settings remains outside the persistent bottom dock.

Create's UI-069 drag-only reference overlay also gets one bounded composition correction: the icon aligns with the primary copy line and the title/detail are one left-aligned two-line text block inside the centered overlay. Drag/drop availability, upload validation, durable upload transaction, keyboard/touch picker baseline and drop lifecycle remain unchanged.

**Guardrails:** No route, navigation destination, account access, media/generation behavior, upload contract, global state, primitive, dependency, schema, storage, worker/provider/routing or deployment contract changes. This is post-production corrective maintenance, not Phase 23 / Cycle 5.


### UI-072 — Current production Lab Grid identity is the binding brand authority
**Status:** Accepted
**Date:** 2026-09-11

**Decision:** The current `RenderLabBrand` implementation and associated production mark/icon assets are the binding settled RenderLab logo/wordmark geometry and spacing. Earlier concept-board imagery, rejected vector experiments and descriptive R&D prose remain historical design evidence; they must not be used to reinterpret, re-vectorize or otherwise alter the accepted production logo when they conflict with the shipped implementation. Changing the settled logo requires the user to explicitly reopen the identity decision.

**Reason:** PR #157 productionized the Lab Grid identity and its exact implementation head passed every workflow GitHub attached. A later documentation interpretation treated older negative-space wording as evidence that the shipped logo needed correction, but the user explicitly confirmed on 2026-09-11 that the logo currently rendered on the production Landing is correct. PR #178 therefore made the accepted deployed implementation the production identity authority and superseded issue #161.

**Consequences:** Reuse `src/components/brand/renderlab-brand.tsx` and the associated current production mark/icon assets rather than reconstructing the logo from older R&D references. The brand system may evolve around this identity, but logo geometry/spacing is locked unless explicitly reopened. This decision changes no product behavior, route, Auth/backend/schema/infrastructure contract or deployment policy.


### UI-073 — Clear Composer keeps Create familiar while expression belongs to media
**Status:** Accepted
**Decision:** Create uses one stable Clear Composer grammar: obvious Image/Video intent, labelled reference or Start image semantics, explicit attached-media roles, dominant prompt, visible essential settings and Advanced disclosure, and one stable conventional Generate action. Generation/result expression belongs primarily to truthful media-stage and result composition; ordinary authoring controls stay stationary and understandable. Continuation keeps the stable `Create an image` / `Create a video` workspace heading and communicates Edit/Animate context through `Primary image` / `Reference image` / `Start image` roles rather than changing the whole screen title.
**Reason:** Approved v0.5 R&D showed that familiar creative-tool grammar produces substantially better first-use clarity than abstract/orbital workspaces while the Landing-derived Lab Matrix visual language can still give RenderLab a distinctive authored identity.
**Consequences:** Create must preserve current product/API/security/data contracts, maintained control semantics and real video controls. Image result continuation remains capability-derived; Animate binds the durable image as Video Start image. Generating state must be truthful and cannot invent progress, ETA, queue/provider stages or workflow mechanics. 390px and reduced-motion states must reach the same usable result, and result actions must remain clear of fixed shell navigation. Do not reintroduce giant abstract stages, hidden essential actions, 3D/orbital controls, generic SaaS glass-card nesting or a second animation runtime without a new explicit decision.

### UI-074 — Approved Create fidelity requires compact horizontal application chrome
**Status:** Accepted
**Date:** 2026-09-12
**Decision:** Direct user fidelity review of the first merged UI-073 implementation reaffirmed the approved Clear Composer v0.5 artifact as the visual authority. Application routes now use the compact horizontal application header accepted in PR #188: no persistent desktop left rail and no fixed mobile bottom dock. Create uses the approved 900px authoring / 1120px result composition, reference-before-prompt grammar, visible Prompt and setting labels, flat settings footer, stable high-contrast Generate, attached Advanced, registration-framed truthful generating state and asymmetric media-first result rail.
**Reason:** The first merged Phase 23 implementation preserved product behavior but materially diverged from the explicitly approved v0.5 composition. Fidelity QA is a separate acceptance gate under `DESIGN_WORKFLOW.md`; technically green output does not override explicit visual approval.
**Consequences:** UI-074 supersedes UI-071's rail/mobile-dock visual geometry on repository `main`. Navigation destinations, route hierarchy, account access, generation/upload/media contracts, schema, provider/worker routing, storage, ownership, admission and deployment policy remain unchanged. The compact horizontal header remains the authoritative shell geometry for Create/Library/Activity/Settings at desktop and narrow widths while preserving keyboard/touch semantics and reduced-motion equivalence.

### UI-075 — Library Gallery Rail makes discovery compact and selection an in-place workspace mode
**Status:** Accepted
**Date:** 2026-09-12

**Decision:** The user-approved Gallery Rail v0.3 direction is the authoritative production composition for `/library`. Library keeps the UI-074 compact horizontal application header, compresses route context, promotes search into the primary retrieval field, consolidates source/filter/organization controls into one compact command rail, and keeps the media field visually dominant. Current-page selection transforms that same command rail in place into selection summary/actions; it does not introduce a generic floating batch toolbar over media.

**Product boundary:** All established Library contracts remain unchanged: Creatives/Uploads are URL/server-owned views over the same durable `media_assets`; kind/search/Favorites/Collections/sort/pagination remain URL/server-owned; uploads and desktop drop stay Uploads-only; selection remains current-page transient state with existing bounded Organize/Delete behavior; cards remain Viewer links; account ownership/security and durable-media identity remain unchanged. No schema, API, worker/provider, storage, routing or deployment change was introduced.

**Card/interaction boundary:** UI-075 supersedes UI-070's card presentation only where the approved v0.3 evidence differs. UI-070's maintained 44×44 checkbox root, centered 22×22 visible indicator, card-link semantics, no quick-actions rule, no hover-only essential behavior and no client-owned media state remain authoritative. Pointer-capable media uses bounded local depth/highlight; touch and reduced motion retain complete static meaning. Ordinary command controls remain stable and touch-safe.

**Truthfulness rule:** Prototype counts and labels remain representative design content rather than product facts. Production shows only route-supported counts/labels, and sort/source context reflects active URL state. No corpus total, progress or capability is fabricated for visual fidelity.


### UI-076 — Media Viewer uses an attached Media Register and Result-primary Source Fold
**Status:** Accepted
**Date:** 2026-09-12

**Decision:** `/library/[assetId]` adopts the user-approved **Media Register + Source Fold v0.2** composition for Phase 25. The durable asset becomes the Viewer workspace rather than content beside a permanent property sidebar. A registered media stage remains visually dominant; capability-derived continuation lives in an attached register immediately below it; Prompt, Details, Manage and Compare are local disclosures from the same attached geometry. Favorite and Download are singular quick actions, while Collections, Rename and permanent Delete live in Manage. Compare Source uses a Result-primary Source Fold transformation: desktop reallocates the same stage so Result remains materially primary and Source reveals contextually; narrow layouts keep Result first and place Source below it. Fine-pointer depth is bounded to the single Result media object; controls remain stationary; touch and reduced motion use complete static equivalents.

**Design authority:** R&D issue #196 is completed. Binding design authority is exact R&D head `639aef25e57e166be8d8b3d226b3e83930e05a25`, focused verifier run `34703774288`, artifact `10300577421`, digest `sha256:06cade2dc2e9ce51dc871971530fa9641a7c1ef0cc0271e19763fcebfa8ca2b0`, and `design/rd/media-viewer-register-fold-v02.md` on that R&D branch. The user explicitly approved this direction on 2026-09-12.

**Product/security boundary:** UI-076 changes presentation only. `/library/[assetId]`, opaque owner-scoped durable media identity, owner/tombstone fail-closed behavior, truthful image/video geometry, native video controls, Favorite, Collections, Rename, Download, Delete, capability-derived Edit/Animate continuation, current-valid Reuse settings, server-derived Compare source, Result-primary/Source-contextual semantics, Source-only `Open source`, and eligible Upscale 2× admission/lifecycle semantics remain authoritative. No new durable compare state, global media/router store, client-owned authorization, route, schema, API, provider/worker, R2/storage, auth/admission, ownership, capability, or deployment contract is approved.

**Interaction/accessibility boundary:** Ordinary controls continue to use the maintained primitive layer. Essential actions cannot depend on hover. Icon-only quick actions require explicit accessible names and at least 44×44 effective touch targets where practical. Prompt/Details/Manage return to the same stage geometry when dismissed. Source Fold is keyboard reachable, reversible, no-overflow, and complete under `prefers-reduced-motion`; reduced motion skips spatial transforms but preserves the full settled Result/Source relationship. Existing Motion for React plus CSS and RenderLab primitives remain the implementation stack.


### UI-077 — Activity uses a chronological Job Matrix with an attached History Register
**Status:** Accepted
**Date:** 2026-09-13

**Decision:** `/activity` adopts the user-approved **Job Matrix + History Register v0.2** composition for Phase 26. Activity remains one account-private newest-first generation-history surface, but its presentation becomes one registered RenderLab work object: the three newest visible jobs form an asymmetric `01 / 02 / 03` Lab Matrix and remaining visible jobs continue directly beneath in an attached chronological History Register. The dominant newest cell communicates recency only; size never represents progress, priority, queue position or expected completion.

**Design authority:** R&D issue #202 is completed. Binding reviewed visual authority is exact head `13bbfc32e5dabb5944943c1a704058aed6a1befc`, verifier run `34722631963`, artifact `10307305396`, digest `sha256:5c440d5c1768fa6ea19a67165263c20d701ee9f2b50487e3a87246e7de8a9058`, and `design/rd/activity-system-continuity-v02.md` on that head. The user explicitly approved the direction on 2026-09-13 after rejecting the earlier ledger-like v0.1 as insufficiently continuous with the finished RenderLab system.

**Visual/system boundary:** UI-077 keeps the UI-074 compact horizontal application header and extends the established near-black 64px Lab Matrix field, compressed editorial hierarchy, technical microtype, restrained cool/warm atmosphere, precise 1px registration rules and canonical quarter-arc accent into Activity at the Visual North Star's 2/4 expressiveness level. Ordinary controls remain conventional and stationary. Active lifecycle energy is bounded to truthful state markers; terminal history settles and becomes still. Loading, empty, signed-out, unavailable and paginated states remain inside the same Activity family rather than becoming unrelated SaaS cards.

**Product/security boundary:** Existing Activity truth remains authoritative: `/activity`; owner-scoped server-owned newest-first jobs; current bounded pagination; `queued`, `preparing`, `running`, `cancelling`, `persisting`, `succeeded`, `failed`, `cancelled`; observational refresh only while nonterminal work exists; sanitized errors; owner-scoped active result links; deleted-output success suppression; server-derived Retry / Run Again / Cancel eligibility and their distinct semantics. No provider/worker/workflow/failover/storage identity, fake percentage, queue rank, ETA/SLA, fabricated stage, Admin-console behavior, route, schema, API, auth/admission, ownership, generation-lifecycle, storage, provider or deployment change is approved.

**Interaction/accessibility boundary:** Required actions stay keyboard reachable, focus-visible and touch-safe; narrow layouts preserve chronological `01 → 02 → 03` stacking before the attached register with no horizontal overflow. Cancellation keeps the maintained accessible confirmation mechanic and server-owned lifecycle truth. Reduced motion removes active marker pulse and terminal-settle duration while presenting the same complete state immediately. Existing Motion for React plus CSS and RenderLab primitives are sufficient; no second animation runtime is approved.

**Implementation gate:** satisfied through planning PR #204 before production source changes. Functional QA and fidelity QA remain separate: future Activity changes still fail if they materially return to isolated rounded cards/status-pill-led hierarchy, become an Admin ledger, fabricate progress, break the `01 / 02 / 03` → attached-register chronology, or diverge from the accepted desktop/390px/temporal/reduced-motion evidence. Production deployment remains separately explicit.


### UI-078 — Settings uses a truthful Trust Register for current account/security capability
**Status:** Accepted
**Date:** 2026-09-13

**Decision:** Phase 27 chooses the bounded visual/account-information-architecture path rather than expanding RenderLab account capability. `/settings` and `/settings/password` now use the low-expressiveness **Trust Register** grammar for the behavior RenderLab already has: read-only Sign-in email, server-derived Closed Beta Access, Change password, truthful password-session consequences, verified-recovery context, global **Sign out everywhere**, and conditional fresh-Admin continuation. Phase 27 does not make the broader Account & Settings roadmap complete.

**Design/planning authority:** draft R&D PR #212 at exact head `9f315be09a6de3db51de39e215990ca86901f1a4` remains the visual/account-IA checkpoint. Its registered Account / Access / Security / Sessions hierarchy, UI-074 shell continuity, near-black field, compressed editorial hierarchy, technical microtype, precise rules, restrained atmosphere and desktop-to-390px row collapse are adopted. The later merged `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md` is authoritative where scope evolved after that R&D: v0.2 password Show/Hide is not a Phase 27 fidelity requirement because #223 now owns one consistent credential-field interaction contract across all credential surfaces.

**Current-truth boundary:** the canonical account owner remains `auth.users.id`; fresh Supabase identity, server-owned RenderLab admission/status/role and the existing fresh-Admin gate remain authoritative. The current Settings sign-out calls global Supabase sign-out and configured verification proves a secondary session is revoked, so presentation must say **Sign out everywhere** rather than imply a current-browser-only action. Ordinary password change continues to require Current password; valid recovery continues to depend on the server-validated recovery marker; successful replacement preserves the acting/recovery session while other sessions are revoked. No Auth/admission/recovery semantic change is approved.

**Roadmap boundary:** #223 remains responsible for editable display name, avatar, username/handle decisions and the reusable Show/Hide/policy-guidance/Caps-Lock/password-manager credential UX standard. #215 remains responsible for hosted Auth/email/password-policy hardening and leaked-password protection. #216–#221 remain responsible for sessions/security activity, MFA/step-up, identity/sign-in methods, export/deletion, product-backed preferences/notifications and passkey research. Phase 27 may leave visual room for those capabilities but must not render fake, disabled or decorative controls for them.

**Visual/system boundary:** Settings remains a 1/4-expressiveness surface. Use one registered account object with restrained row hierarchy rather than isolated rounded SaaS cards, security spectacle, fabricated telemetry or a new navigation shell. Desktop may use a narrow section-label column plus value/action column; 390px collapses in document order to section label → value/title → helper/status → action. Essential controls remain keyboard reachable, focus-visible and touch-safe with no horizontal overflow. Reduced motion preserves a complete static equivalent.

**Implementation gate:** `docs/history/contracts/ui/SETTINGS_TRUST_REGISTER_IMPLEMENTATION_CONTRACT.md` must merge with UI-078 before production Settings source changes. Exact-head implementation verification must preserve configured account/security assertions and compare production screenshots against only the v0.2 elements adopted by this decision. Production deployment and hosted Supabase/Auth configuration remain separately explicit operations.


### UI-079 — Admin reuses the Settings Trust Register skeleton for system continuity
**Status:** Accepted
**Date:** 2026-09-13

**Decision:** `/admin` adopts the user-approved **Admin System Continuity v0.2** direction for Phase 28. Admin remains a 1/4-expressiveness privileged utility surface and uses UI-078 Settings Trust Register as its binding structural parent: UI-074 compact horizontal shell, compact utility intro, one registered near-black object, numbered left label/value rows, precise 1px rules, restrained quarter-arc signature and the same desktop-to-390px label-band collapse. Activity / UI-077 may contribute technical microtype and internal dense-row separators only; it does not supply the Admin page skeleton.

**Design authority:** the accepted R&D authority is draft PR #232 exact head `419a58c8c7877bab21673342775eb0650108412e`, focused run `34777699455`, artifact `10323843563`, digest `sha256:1ada86fbb81b19ee0da11dbadbc5bab1aa15f31b56652f64aabd8eac6001940b`, plus `design/rd/admin-system-continuity-v02.md` and the companion prototype on that head. The user explicitly approved the settled desktop and 390px direction on 2026-09-13. PR #231 / Operations Register v0.1 is rejected and closed unmerged; its Admin-specific operator/ledger scaffold is not production authority.

**Product/security boundary:** UI-079 changes presentation only. The fresh active-admin route/API gate, RenderLab-only admitted-account directory, invitation behavior, role/status semantics, self-lockout and last-active-admin protections, typed global generation settings, nullable per-account override inheritance, transactional generation-admission behavior, bounded/sanitized Health definitions, privacy/truncation rules and current server/client ownership remain authoritative. No arbitrary shared Supabase Auth browsing, new operator action, metric, route, schema/API/RLS, Auth configuration, provider/worker/R2/storage change or deployment is approved.

**Composition boundary:** production keeps exactly three top-level registered rows: `01 Access`, `02 Generation`, `03 Health`. Access retains invitation, pending-invitation and admitted-account controls. Generation keeps global defaults visibly parent to nullable account overrides. Health keeps the current four primary values plus six diagnostic groups and bounded explanatory copy, but reads as one operational field rather than a generic KPI dashboard. Ordinary maintained controls remain conventional and stationary. Narrow layouts preserve all current controls and truth; reducing repetition must not hide capability.

**Implementation gate:** `docs/history/contracts/ui/ADMIN_SYSTEM_CONTINUITY_IMPLEMENTATION_CONTRACT.md` must merge with UI-079 before production Admin source changes. Exact-head implementation acceptance requires the existing Account/Admin Operations security/product assertions, Engineering Quality, UI Shell Validation and every workflow GitHub actually attaches, plus configured desktop/390px/reduced-motion browser evidence compared directly with the approved v0.2 design and Settings/UI-078 structural parent. Production deployment remains separately explicit.


### UI-080 — Whole-product cohesion repairs integration drift without reopening approved surfaces
**Status:** Accepted
**Date:** 2026-09-14

**Decision:** Phase 29 is the final Integration-Mode cohesion pass for the current UI/UX redesign program. It preserves the approved Lab Matrix Landing, UI-074 shell, UI-075 Library, UI-076 Viewer, UI-077 Activity, UI-078 Settings and UI-079 Admin compositions while auditing their integrated behavior for shell/content clearance, accidental typography/spacing drift, responsive overflow/clipping, feedback-state attachment, focus/touch reachability, reduced-motion equivalence and cross-surface continuity. Only defects demonstrated by the current implementation or deterministic browser evidence may change production UI.

**Reason:** The major surfaces were intentionally designed and verified in separate phases with different expressiveness levels. The final product needs an end-to-end integration gate, but making every surface visually identical—or using a cleanup phase to redesign accepted work—would destroy those deliberate distinctions and repeat prior drift. Cohesion therefore means shared boundaries and interaction quality, not visual homogenization.

**Consequences:** Existing surface authorities remain binding. Fix the smallest true owner of a demonstrated problem: shared shell/primitive when the defect is shared; feature-local layout when it is not. Keep the current UI-074 header geometry unless evidence shows the shell itself is wrong. Preserve maintained primitive semantics and substantive product/security assertions. Do not add routes, features, account/Admin capability, backend/schema/Auth/provider/storage changes, new animation runtimes or deployment under Phase 29.

**Initial audit rule:** same-product-tree Phase 28 browser evidence is the starting point. The apparent 390px Create title/header collision is treated only as a candidate defect until deterministic geometry reproduces it; if reproduced, correct the owning content boundary and add regression coverage rather than changing the approved shell height by assumption.

**Implementation gate:** `docs/history/contracts/ui/WHOLE_PRODUCT_COHESION_IMPLEMENTATION_CONTRACT.md` and UI-080 must merge before Phase 29 production UI changes. Final acceptance requires exact-head affected workflows, cross-product desktop/390px evidence, reduced-motion verification for changed temporal paths, no horizontal overflow, human review against the currently approved surface authorities, merged-main verification and repository documentation closure. Production deployment remains separately explicit.


### UI-081 — Profile and credential baseline extends UI-078 without redesign
**Status:** Accepted
**Date:** 2026-09-16

**Decision:** #223 is an Integration-Mode capability extension of the approved UI-078 Settings Trust Register, not a Settings redesign. RenderLab will own one private 1:1 profile record keyed by immutable `auth.users.id`; optional display name and a private account avatar ship as ordinary display identity, while sign-in email remains Auth identity and `renderlab_account_access` remains admission/role truth. The avatar is account-profile media in a dedicated private R2 namespace, not a creative `media_asset`, and it must participate in #219 export/deletion/purge/residue guarantees. A subordinate `/settings/profile` editor extends the existing Account row and retains Settings' 1/4-expressiveness hierarchy.

**Username decision:** Do not implement a username/handle in #223. Current RenderLab has no public profile, attribution/feed, sharing namespace, handle lookup or person-to-person collaboration surface that consumes one. Creating a unique namespace now would impose reserved-name, normalization, race, rename and impersonation policy without current product value. A future handle requires its own use-case-backed namespace contract.

**Credential decision:** All current password-entry contexts—signed-out sign-in, Current/New/Confirm password change/recovery, email-change Current-password reauthentication, and delete-account Current-password reauthentication—must compose one account-owned password-field component using maintained Field/Input/Button + Lucide mechanics. Password is hidden by default; Show/Hide has programmatic name/state and keyboard/touch parity; Caps Lock feedback is advisory where detectable; paste and password-manager behavior remain allowed; autocomplete semantics stay authoritative; sign-in/current-password fields never inherit a new-password minimum gate. New-password guidance derives from the shared current 15-character policy and does not invent character-class rules or a fake strength score.

**Lifecycle/security boundary:** Profile fields never grant ownership, access, role, Admin eligibility, MFA/session authority or admission. Implementation cannot merge until #219 account export moves to schema v2 for new exports and profile/avatar state joins deterministic R2 purge/proof, transactional finalization, residue verification, maintenance recovery and two-account acceptance. No raw R2 identity or secret values may reach product UI/evidence.

**Implementation gate:** `docs/history/contracts/architecture/PROFILE_CREDENTIAL_UX_BASELINE_IMPLEMENTATION_CONTRACT.md` must merge before schema/application implementation starts. Exact-head implementation requires configured two-account profile/avatar lifecycle verification plus credential interaction coverage and the existing Account Identity, Account Data Lifecycle, Email Identity Change, Session Controls, MFA/security and normal engineering/UI regressions that repository path selection attaches. Production deployment and hosted Supabase Auth/password-policy mutation remain separately explicit operations.


### UI-082 — Media-first hierarchy and legibility outrank content-derived spectacle
**Status:** Accepted
**Date:** 2026-09-20

**Decision:** The user has explicitly reopened application visual hierarchy, spacing, typography, density and presentation chrome after direct review of the current production Viewer. RenderLab must keep generated/uploaded media and the current user task visually primary; prompt text is content/metadata and must not become an unbounded page hero merely because no explicit display name exists. The correction applies as a whole-site audit, not a forced one-template redesign: each route is reviewed for the same hierarchy, wide-screen space use, duplicate-content, chrome-density and legibility failures, and only reproduced problems receive runtime changes.


**Consequences:** Viewer is the first implementation checkpoint. Activity is explicitly audited for the same prompt-as-headline failure. Library/Create/account/Admin/Landing/shell are audited for corresponding density, readability and space-allocation issues without erasing their approved expressiveness differences. Product behavior, routes, security/ownership, generation/media contracts, locked RenderLabBrand geometry and Landing quarter-circle remain unchanged. The binding execution contract is `docs/history/contracts/ui/MEDIA_FIRST_HIERARCHY_CORRECTION_CONTRACT.md`.

**Release rule:** work proceeds in small documented checkpoints. No production deployment occurs until the full exact-head affected workflow set, rendered desktop/390px/reduced-motion review, merge, merged-main verification and guarded rollout gates pass.


### UI-083 — Android uses a media-first, Instagram-inspired native navigation and Library grammar
**Status:** Accepted
**Date:** 2026-10-26

**Decision:** The separately developed RenderLab **Android** client adopts the user's Instagram screenshots as interaction references, not as a social-product template or branding source. Its native application shell places the settled RenderLab wordmark/identity at the top and provides persistent thumb-reachable bottom navigation for **Create, Library, Activity, Settings**. Library presents vertically scrollable, media-dominant feed browsing with contextually positioned creative/media actions, plus a dense grid browsing option inspired by Instagram's profile grid. Library information architecture should accommodate **Items, Albums, Collections**, with **All / Generated / Uploads** origin views and suitable image/video filtering, search, and organization controls. The feed and grid are alternate views of the same authorized owner-scoped assets; generated results and verified uploads remain one durable `media_assets` product identity.

**Reason:** On 2026-10-26 the user approved the Android feature/control blueprint and explicitly requested Instagram-style lower controls, the RenderLab wordmark above, a scrollable Library media feed with actions arranged around its contents, and Library tabs/sections for individual assets, albums, collections and generated/uploaded media. The goal is familiar one-handed, media-first navigation while keeping RenderLab a creative instrument rather than a social feed.

**Platform/design boundary:** This is an **Android-specific high-level design direction**, not approval of a final pixel layout, motion study, actual screen implementation, new native dependency or release. It does **not** supersede web UI-074's compact horizontal shell or web UI-075's Gallery Rail presentation; those remain authoritative for the Next.js application. The shipped RenderLabBrand logo/wordmark geometry in UI-072 remains settled. Native screens may use the already-selected Expo Router / gluestack mobile foundation from the accepted Android M0 contract, with accessible safe-area, touch, keyboard, large-text and reduced-motion behavior. Instagram-style browsing does not authorize public profiles, likes, comments, following, engagement metrics or fake counters.

**Capability/data boundary:** Existing Collections are account-private supported product behavior; **Albums are a proposed distinct grouping concept whose meaning, lifecycle and backend support remain unresolved**. Do not render operational Albums controls or invent persistent album data until an explicit product/domain contract is accepted and implemented. Reuse supported origin/source, search, kind, favorite, collection, sort and media actions within their server-owned API/security limits, and expose Edit/Animate/Upscale/Reuse actions only when capability-derived and eligible. Do not create a second upload identity, bypass private owner scope, display synthetic generation progress, or route native credentials to signed R2 media URLs.

**Delivery boundary:** The open Android Phase M0 PR #399 remains a nonproduction placeholder foundation, subject to its independent security/device verification gates. This decision authorizes design exploration/documentation only; it does **not** authorize M1+ implementation, API/Auth/schema/R2/worker changes, Expo/EAS provisioning, device installation, public distribution, production deployment, or changes to web UI. Before mobile feature implementation, complete a reviewable native screen/interaction design and accept the appropriate bounded phase contract under `AGENTS.md` and `docs/ui/DESIGN_WORKFLOW.md`.
