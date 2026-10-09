# Phase 24 — Library Gallery Rail v0.3 Implementation Contract

**Status:** USER-APPROVED DESIGN / IMPLEMENTATION CONTRACT  
**Decision:** UI-075  
**Tracking:** #191 design R&D, #192 production implementation  
**Does not authorize:** production deployment

## Goal and user value
Implement the user-approved Gallery Rail v0.3 direction on `/library` so durable media becomes the dominant workspace content, discovery controls become faster to parse, and current-page selection feels like a coherent workspace mode rather than a detached toolbar. Preserve the complete existing Library product model, ownership/security guarantees and URL/server state.

## Verified starting state
- Contract baseline: repository `main` `6b4625000dfe50618232a0ef741416cd68adac12`.
- Verified application baseline for the UI-074 shell/Create correction: PR #188 merge `3f0d21ed55554b3c48791d35dd17cb6005212076`.
- Production remains separately deployed source `0173c4c5ba08360b6352331118abc81978cfa774`; automatic Git → Vercel deployment is disabled.
- Current Library implementation is `src/features/library/library-view.tsx` plus `library-batch-selection.tsx`, collection/sort/upload helpers and existing server/API contracts recorded in `SCREEN_REGISTRY.md`.
- `LibraryView` owns URL/server state and server-rendered discovery controls. `LibraryBatchSelection` owns current-page client selection, organization/delete actions and the media grid. This boundary must remain product-truthful; Phase 24 must not introduce a client-owned Library dataset.

## Accepted design authority
The binding visual/interaction target is the explicitly user-approved Gallery Rail v0.3 evidence:
- R&D branch: `rd/library-gallery-rail-v03`
- accepted head: `ba842e919305e07262ae95c81b3c2063a455b54d`
- exact-head browser run: `34689164957` — PASS
- artifact: `10296866215`
- artifact digest: `sha256:db81c13f34514022f01a9e8998de4c0622ee946e316d02655c70477db1a87d95`
- approval recorded on issue #191 on 2026-09-12.

The isolated R&D files remain design evidence and are not to be merged into production. Production implementation must reproduce the accepted composition using the real application component/state contracts.

## Reopened visual decisions
Phase 24 intentionally reopens only Library presentation and feature-local interaction choreography:
- page context density and hierarchy;
- source/search/filter/sort/select control composition;
- media-grid spacing and card presentation;
- media-local pointer depth;
- current-page selection mode presentation and transition;
- responsive arrangement of those Library controls.

UI-075 supersedes UI-070's Library card presentation only where the accepted v0.3 evidence materially differs. UI-070's maintained 44×44 selection root, centered 22×22 visible indicator, card-link semantics, no card quick-actions rule, no hover-only essential behavior and no client-owned media state remain authoritative.

## Locked product and engineering contracts
Do not change:
- `/library` as the primary Library route or `/library/[assetId]` as contextual Viewer;
- Creatives default and Uploads `tab=uploads` over the same durable `media_assets` identity;
- URL/server-owned All / Images / Videos, `q`, Favorites, Collections, sort and pagination;
- existing query normalization, search bound, sort ordering or pagination behavior;
- upload ticket/completion transaction, durable promotion, accepted MIME/size rules or shared media identity;
- Upload action and desktop file drop being Uploads-only; picker remains the keyboard/touch/mobile baseline;
- current-page transient selection, selection reset on server-view change and 1–24 item bounds;
- Favorite/Unfavorite, collection add/remove and permanent Delete semantics, including best-effort partial success and failed-item retry selection;
- card activation opening Viewer;
- account privacy, owner scoping, signed-out behavior, admission/security boundaries or configured fixture isolation;
- Viewer, Create continuation, generation, worker/provider, R2/storage, schema, API or route contracts;
- automatic Git → Vercel deployment remaining disabled.

Do not add fake corpus totals, fake actions, fake progress, hover-only product actions or a third Library section for visual symmetry.

## Production composition

### 1. Compact Library context
Use the accepted compact editorial context rather than the current tall title + stacked controls:
- small technical eyebrow such as `LIBRARY / MEDIA INDEX`;
- `Library` remains the stable page title;
- one short support line only;
- any count shown must be truthful to data actually available to the route. The v0.3 prototype's representative `24` is not permission to fabricate a whole-library total. Prefer current rendered-page count wording unless a real total is already supplied by the server contract.

The first media row must materially precede the current pre-redesign baseline at both 1440px desktop and 390px narrow widths.

### 2. One Gallery Rail command surface
Replace separate tab, toolbar and search glass panels with one coherent rail.

Default desktop hierarchy:
1. Creatives / Uploads source choice;
2. first-class bordered search field;
3. contextual Upload action when and only when Uploads is active, plus `Select`;
4. a compact second row for All / Images / Videos, Favorites, Collections and chronological sort.

Narrow hierarchy may use three compact rows as in the approved evidence, but must keep controls obvious, touch-safe and free of horizontal page overflow. A horizontally scrollable filter row is acceptable only if all essential controls remain discoverable and keyboard/touch operable.

Search remains an ordinary GET `/library` form with the current hidden URL-owned parameters. Pressing Enter/Search must submit; active query remains visible in the field. Clear is contextual, has an accessible name and at least a 44×44 touch target on narrow layouts. Do not add client-only instant filtering.

### 3. Preserve server ownership while enabling the in-place selection morph
Do not move the Library dataset or URL state into client state merely to animate the rail.

Preferred implementation boundary:
- keep route-derived links/forms/collection/sort controls server-owned in `LibraryView`;
- allow `LibraryBatchSelection` (or a narrowly extracted Library-specific client rail wrapper) to receive the server-rendered default control content as a React node/slot;
- the same client boundary owns `Select`, selection state and the alternate selection-mode rail;
- switching into selection changes presentation in the same rail origin without changing URL state or moving the media grid.

An equivalent implementation is acceptable only if it preserves the same server/client ownership and avoids a global Library store.

### 4. Selection mode is a workspace transformation
When selection begins:
- default retrieval controls yield to a selection summary/actions surface in the exact command-rail location;
- media cards do not reflow merely because selection starts;
- maintained 44×44 checkbox roots appear at the top-left of cards with 22×22 visible indicators;
- selected state is unmistakable without animation;
- summary and actions form one cohesive cluster rather than being separated across a mostly empty rail;
- actions remain `Select page`/`Clear page`, `Organize`, permanent `Delete`, and `Cancel` with current availability/busy rules;
- no generic floating bottom action bar may cover media.

`Organize` is a real product-required state not shown in the simplified R&D frames. Its existing Favorites and collection actions must expand as an attached subdeck from the selection rail, preserve current semantics and remain responsive. Delete continues to use the maintained destructive confirmation dialog. Partial-success/error feedback remains truthful and should sit immediately adjacent to the rail/media field rather than becoming overlay chrome.

### 5. Media field and truthful context
Keep the grid visually dominant. A compact media-field heading may communicate source/sort/current-page count, for example `CREATIVES / NEWEST`, but labels must reflect actual active URL state. Uploads may retain the truthful desktop drop affordance copy. Do not claim `RECENT` when Oldest-first is active.

Pagination remains below the grid with the existing direction-aware Newer/Older semantics.

### 6. Card fidelity and pointer behavior
Cards remain deep links to Viewer and contain no management quick actions.

Implement the accepted v0.3 card hierarchy:
- media dominates card area;
- title and kind/date metadata are legible at normal product sizes, including 390px;
- video identity remains clear without colliding with selection controls;
- selected border/state remains static and obvious;
- long durable display names must truncate/wrap safely without forcing overflow.

On hover-capable fine pointers, media cards may use the accepted bounded local depth/spotlight response. Keep rotation/displacement small and media-local; command chrome must remain stationary. Touch receives a static equivalent. `prefers-reduced-motion` removes tilt/transform-dependent expression while preserving hover/focus/selected meaning.

Use the existing Motion for React runtime and/or feature-local CSS for this accepted behavior. No second animation runtime, GSAP, Lenis, WebGL/canvas effect, global pointer loop or new generic motion primitive is authorized.

### 7. Existing truthful states must survive the redesign
The production surface must integrate, not drop, states absent from the simplified prototype:
- signed-out Library state;
- unavailable environment alert;
- empty Creatives/Uploads;
- no-match search;
- missing collection;
- offset/pagination empty state;
- upload active/drop feedback;
- Organize open/busy/success/partial failure;
- Delete dialog/busy/partial failure;
- collection management disclosure;
- link-pending feedback from UI-069.

These states may be visually normalized to Gallery Rail but their copy and semantics stay truthful.

## Component and styling plan
Reuse existing approved components first:
- `Button`, `Input`, `Checkbox`, `Collapsible`, `Alert`, `AlertDialog`, `Empty`, `NativeSelect`, `Spinner`;
- `LibraryNavigationLink`, `LibraryCollectionMenu`, `LibrarySortToggle`, `LibraryUploadButton`, `LibraryDropUploadSurface`;
- existing Motion for React dependency only where the rail/card choreography benefits.

Do not replace maintained primitives with raw visible `<button>`/`<input>` controls in feature code. `npm run verify:ui-purity` remains mandatory.

Prefer a Library-specific presentation layer over further expanding generic/global Kinetic Precision styling. Existing `.kinetic-media-*` rules may be narrowed/replaced for the Library as needed, but avoid regressing Viewer or other surfaces that share `globals.css` selectors. If a shared selector must change, dependent Viewer/Creative Iteration evidence becomes mandatory.

No new reusable component should be added to `COMPONENT_CATALOG.md` unless implementation genuinely introduces one; do not document a prototype-only mechanic as a production component.

## Backend, infrastructure, data and security impact
- Backend/API: none expected.
- Database/schema: none.
- R2/storage: none.
- Worker/provider/generation: none.
- Authentication/admission: none.
- Ownership/RLS expectations: unchanged.
- Dependencies: no new runtime dependency expected.
- Deployment: not authorized.

If implementation uncovers a need to change any item above, stop and amend the phase contract before making that change.

## Validation matrix
Exact-head completion requires every workflow GitHub actually attaches plus, at minimum where path filters apply:
- Engineering Quality / production build / typecheck / lint / unit tests;
- UI Shell Validation;
- Library Lifecycle Visual;
- Library Search;
- Library History;
- Library Favorites;
- Library Collections;
- Library Batch Delete / Batch Actions;
- Library Drag Drop;
- Persistent Media Upload Integration;
- Account Ownership;
- Create Lifecycle or continuation coverage when the changed path reaches Library → Viewer → Create seams;
- Creative Iteration/Viewer regressions if shared Library/Viewer styling is touched;
- Integrated Release / Release Candidate Matrix if GitHub attaches them to the candidate.

Do not weaken functional/security assertions because the redesign changes DOM presentation. Update stale presentation locators only when the underlying product invariant is unchanged and explicitly document the correction.

Configured workflows must clean every run-owned Supabase/R2 fixture they create.

## Visual and interaction acceptance
Human fidelity review is separate from CI success.

Required exact-head evidence:
- 1440×1000 desktop: default Creatives, Uploads, active search/filter, selection settled, Organize open, representative empty/no-match where practical;
- 390×844 narrow: the same important default/search/selection states plus touch-safe controls;
- selection temporal frames showing start, transition and settled in-place rail morph;
- reduced-motion selection state and media-card behavior;
- keyboard-visible focus through source/search/filter/Select and selection actions;
- no body/document horizontal overflow;
- media starts materially earlier than the current pre-Phase-24 baseline;
- search clear and all essential narrow controls meet 44px effective touch targets;
- maintained selection root is at least 44×44 with 22×22 visible indicator;
- pointer depth is bounded to cards and does not move the command rail;
- selected state remains obvious with animation disabled.

The real implementation must be compared directly against accepted artifact `10296866215`. A technically green candidate that returns to stacked dashboard chrome, weakens search hierarchy, reintroduces a floating selection bar, shrinks metadata into decorative microtype or materially flattens the accepted media-first composition is not complete.

## Documentation outputs
Before Phase 24 closure, update verified reality in:
- `PROJECT.md`;
- `docs/ui/UI_MIGRATION.md`;
- `docs/ui/UI_DECISIONS.md`;
- `docs/ui/SCREEN_REGISTRY.md`;
- `docs/ui/COMPONENT_CATALOG.md` only if a reusable production component is actually added;
- issue #192 with exact implementation/verification/merge evidence.

Keep the accepted R&D branch unmerged; reference its exact head/artifact rather than copying disposable prototype files into production.

## Exit criteria
Phase 24 is complete only when:
1. this contract is merged before production implementation starts;
2. the implementation faithfully matches Gallery Rail v0.3 while preserving locked product/server/security contracts;
3. exact-head engineering, configured lifecycle and security gates pass;
4. desktop/390px/reduced-motion/temporal evidence passes direct human fidelity review;
5. no regression is found in upload, search, filters, collections, favorites, sort, pagination, selection, organization, delete, Viewer activation or ownership;
6. repository documentation is synchronized with verified reality;
7. the implementation PR is merged and merged-main workflows actually attached to the merge are green.

Production rollout remains a separate explicit operation after repository closure. Phase 24 completion does not itself authorize deployment.

## Next-phase dependency
Do not begin another Library/Viewer redesign slice from Phase 24 planning alone. Any later Viewer or cross-route continuity redesign must start from the verified merged Phase 24 implementation, not from the isolated prototype branch.
