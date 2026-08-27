# Frontend Architecture

Defines approved RenderLab frontend architecture and verified implementation state.

## Verified Scaffold
RenderLab is remotely built and validated through GitHub Actions.

Core stack from `package.json`:
- Next.js `16.3.3`
- React / React DOM `19.2.8`
- TypeScript `7.0.2`
- Tailwind CSS `4.3.3`
- Lucide React `1.34.0`
- `radix-ui` `1.6.7`
- `class-variance-authority` `0.7.1`
- `clsx` `2.1.1`
- `tailwind-merge` `3.6.0`
- Playwright `1.62.1`
- AWS SDK S3 client/request presigner `3.1116.0`

`components.json` configures shadcn with the `radix-nova` style. RenderLab owns the normalized wrapper layer under `src/components/ui`; shadcn/Radix supplies maintained mechanics and accessibility behavior while RenderLab owns semantic tokens, variants, spacing, required semantic elements and reviewed product integration.

Approved product state includes Application Shell, Create, Library v0.1, persistent Upload, Library search v0.1, Library history ordering v0.1, Media Viewer v0.1, Download v0.1 and Rename v0.1. PR #12 merged as `d76f0ce30502e2aff2384dcd168f07b2184768a4`; PR #13 merged the foundation-only maintained-primitive refactor under UI-026. PR #14 / UI-027 adds only URL/server-owned Library chronological direction plus the maintained Dropdown Menu primitive; it does not redesign or introduce organization/destructive schema. Activity and Settings remain placeholders.

## Framework
**Framework:** Next.js App Router  
**Language:** TypeScript  
**Rendering:** Server Components by default; Client Components only for interactive feature behavior  
**Styling:** Tailwind CSS + semantic project tokens  
**Components:** approved RenderLab components first; conventional visible controls use the maintained `src/components/ui` layer; new mechanics follow the approved source order in `docs/ui/COMPONENT_CATALOG.md`.

## Maintained Primitive Boundary — UI-026
Conventional visible controls are centralized rather than hand-styled in feature/shell code.

Current normalized primitive layer:
- Alert / AlertDescription
- Button
- Collapsible / Trigger / Content
- DropdownMenu / Content / Group / Item / Label / Separator / RadioGroup / RadioItem
- Empty composition
- Field / FieldLabel / FieldDescription / FieldError / FieldGroup
- Input
- Label
- NativeSelect
- Spinner
- Textarea
- Toggle / ToggleGroup / ToggleGroupItem

Rules:
- `src/features` and `src/components/shell` must not introduce raw visible `<button>`, `<select>`, `<textarea>` or ordinary visible `<input>` controls;
- native `file` and `hidden` inputs are allowed as browser/form plumbing;
- feature composition remains feature-owned; the primitive layer does not absorb product data contracts;
- fix shared spacing/variants/semantics in the wrapper once rather than recreating them in each feature;
- maintained accessibility semantics are authoritative when they correctly represent the interaction. Create Image/Video is a required single-choice Radix `radiogroup` with checked `radio` items, not two independent legacy pressed buttons; Library Newest/Oldest uses Radix Dropdown Menu radio semantics;
- custom generic mechanics are the last option and require a concrete documented reason that approved maintained sources do not satisfy the requirement.

`npm run verify:ui-purity` enforces the native-control boundary in UI Shell CI.

## Routing
```text
/                  Create
/library           Library
/library/[assetId] Media Viewer
/activity          Activity
/settings          Settings
```

Rules:
- Create remains the default route.
- Image/Video/Edit/Animate/models/workflows are not separate top-level routes by default.
- Library `kind`, `q`, `sort`, `offset` are URL-owned shareable browsing/discovery/history state.
- `sort=newest|oldest`; Newest is canonical and omitted from clean links.
- Viewer → Create `source` + `action` are untrusted navigation intent; the server reloads durable media and validates compatibility.
- Durable Download uses the Viewer asset route context and a product API; the browser never treats an R2 key/signed URL as durable identity.
- Durable Rename stays on the Viewer asset identity; the client submits a bounded display-name mutation and refreshes server-rendered asset state.

## Product API Boundaries
```text
POST     /api/generation/jobs
GET      /api/generation/jobs/[jobId]

POST     /api/assets/reference/upload-tickets
POST     /api/assets/reference/upload-completions

GET      /api/media/assets
GET      /api/media/assets/[assetId]
PATCH    /api/media/assets/[assetId]
GET      /api/media/assets/[assetId]/content
GET      /api/media/assets/[assetId]/thumbnail
GET      /api/media/assets/[assetId]/download
POST     /api/media/uploads/upload-tickets
POST     /api/media/uploads/upload-completions
```

`GET /api/media/assets` accepts bounded `kind`, `q`, `sort`, `limit`, `offset`; `sort` accepts only `newest|oldest` and defaults to newest. `PATCH /api/media/assets/[assetId]` currently owns the UI-025 durable display-name Rename mutation only. Browser components do not call workers, Supabase service-role APIs or raw R2 credentials directly.

## Ownership Structure
```text
src/
├── app/
│   ├── page.tsx
│   ├── library/
│   └── api/
│       ├── generation/jobs/
│       ├── assets/reference/
│       ├── media/assets/
│       └── media/uploads/
├── components/
│   ├── shell/
│   └── ui/
├── features/
│   ├── create/
│   └── library/
│       ├── library-view.tsx
│       ├── library-sort-menu.tsx
│       ├── library-upload-button.tsx
│       ├── media-viewer.tsx
│       └── media-viewer-actions.tsx
├── lib/
│   ├── api/
│   └── capabilities/
└── server/
    ├── data/
    ├── generation/
    ├── media/
    └── storage/
```

Ownership rules:
- `components/ui` — normalized generic maintained primitives without feature data contracts;
- `components/shell` — persistent application chrome composed from approved primitives;
- `features/<feature>` — product-specific composition/behavior composed from approved primitives;
- `lib/capabilities` — user-facing capability definitions/resolution;
- `lib/api` — typed product API/query contracts;
- `server/generation` — orchestration/worker boundaries;
- `server/media` — durable media/query/upload/download/rename services;
- `server/storage` — R2 implementation;
- `server/data` — Supabase/repository access.

Do not extract generic upload/search/history/download/rename frameworks from single feature needs. Reuse follows a second real product need. UI-026 applies to generic conventional control mechanics, not to feature-domain extraction.

## Component / Client Boundaries
### Server Components by default
Library route composition, Library search/history query resolution, Media Viewer loading and root Create continuation validation are server-owned.

### Client Components deliberately
Use for Create workspace/polling, temporary reference interaction, Library upload file selection/feedback, the small Library sort navigation menu, Rename edit/saving state and interactions that truly require browser state.

Library search remains a URL-owned native GET form while its visible input/actions use maintained primitives and its hidden kind/sort state remains native plumbing. `LibrarySortMenu` uses a small client component only for Radix menu interaction + URL navigation; actual ordering remains server-owned and no media dataset is copied into client sort state. Media Viewer Download uses normal product-route navigation. Rename uses one small Viewer-owned client component, submits to the product API, then calls router refresh so the server-rendered Viewer title/metadata stays authoritative. No global media-management client store exists.

## State Architecture
### URL state
- Library `kind` / `q` / `sort` / `offset`;
- durable asset ID in `/library/[assetId]`;
- Viewer → Create `source` / `action` intent.

### Server state
- `generation_jobs`;
- durable `media_assets` including human-facing `display_name`;
- `media_upload_sessions`;
- temporary `generation_sources`.

Temporary references and pending uploads have different lifetimes from durable media. Avoid an ad-hoc global client store until multiple features genuinely need one. Favorites/Collections must not be introduced as global media flags before an account/user ownership model is defined.

## Capability Architecture
```text
Creative Operation
      ↓
Workflow Capability
      ↓
Input Slots + Parameter Definitions
      ↓
Normalized Generation Request
      ↓
Generation Job
      ↓
Persisted Media Asset
      ↓
Continuation / Asset Actions
```

Generation inputs bind by product identity:
```text
GenerationInput
  ├── temporary-source { id }
  └── media-asset      { id }
```

Generated/uploaded durable media both use `media-asset`. R2/provider/worker/ComfyUI identifiers remain server-side.

## Native Generation Flow
```text
Create
  -> POST /api/generation/jobs
  -> validate / resolve operation
  -> create generation_jobs
  -> resolve opaque inputs
  -> submit to compatible worker
  -> poll RenderLab API
  -> persist output to R2
  -> create media_assets
  -> job succeeds with outputAssetIds
  -> render durable result + continuation
```

Worker completion is not product completion; success requires durable persistence. All four initial operations are live verified.

## Persistent Library Upload Flow
UI-022:
```text
Library selects PNG/JPEG/WebP ≤25 MB
  -> POST upload ticket
  -> media_upload_sessions pending + opaque uploadId
  -> short-lived signed R2 PUT
  -> browser PUT
  -> POST completion
  -> server HEAD verifies MIME + bytes
  -> create media_assets(origin=uploaded)
  -> complete session
  -> Library / Viewer / Create use normal media-asset identity
```

Rules: no browser R2 credentials; storage key opaque; human filename Unicode-preserving after cleanup; only verified completion creates durable media; completion is idempotent/race-safe; no public Uploads asset type/tab.

PR #9 final verification passed `33067469516`, `33067469518`, `33067469527`; merged as `d306f2abd1831538c51692545d72db1e5e9e0814`.

## Library Search Flow
UI-023:
```text
/library?q=<text>&kind=<optional>&sort=<optional>&offset=<optional>
  -> normalize/cap q
  -> validate sort newest|oldest
  -> listMediaAssets({ search, kind, sort, offset })
  -> escape literal query
  -> PostgREST OR display_name/original_filename/provenance.prompt imatch
  -> AND optional kind
  -> UI-027 chronological order
  -> existing cards / truthful no-match state
```

Search is server-side across durable media, not current-page filtering. It excludes storage/provider/model/temporary/legacy data. No schema migration/index/service in v0.1. PR #10 final documentation-head runs passed `33070046222`, `33070046205`, `33070046336`, `33070046186`; merged as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`. Post-merge main `33070215358` passed.

## Library History Ordering Flow
UI-027:
```text
/library?sort=<newest|oldest>&kind=<optional>&q=<optional>&offset=<optional>
  -> parse/validate URL-owned sort
  -> newest default when omitted
  -> listMediaAssets({ sort, search, kind, offset })
  -> PostgREST order created_at.<dir>,id.<dir>
  -> fetch limit + 1 for hasMore
  -> render existing media grid
  -> direction-aware Newer/Older pagination
```

Rules:
- ordering is server-owned across durable `media_assets`, never a current-page client reorder;
- `created_at` and `id` use the same direction so offset pagination is deterministic for equal timestamps;
- kind/search/sort preserve one another in generated links and form state;
- changing sort or kind resets offset; search submission resets offset while preserving sort/kind;
- Newest is canonical and clean links omit `sort=newest`;
- `LibrarySortMenu` is UI-only navigation composition using maintained Dropdown Menu radio items; no global client data store is introduced;
- UI-027 adds no database migration, relevance ranker, date/model filter console, Favorites/Collections, Delete or batch framework.

Implementation head `9cde5180acb932b255e956c0f257b0246c0e381c` passed Library History `33094977896`, UI Shell `33094977929`, Library Search `33094977911`, Library Lifecycle `33094977899`, Media Download `33094977913` after unchanged rerun, Media Rename `33094977895`, Create Lifecycle `33094977825`, and Persistent Media Upload Integration `33094978022`. Direct Supabase cleanup found `0` history fixtures and `0` upload sessions.

## Durable Media Download Flow
UI-024:
```text
Media Viewer
  -> GET /api/media/assets/[assetId]/download
  -> server reloads durable media_assets row
  -> derive safe product filename from durable metadata + verified MIME
  -> sign R2 GetObject with ResponseContentDisposition=attachment
  -> 302 redirect, private/no-store
  -> browser downloads directly from R2
```

Rules:
- product identity is the opaque `media-asset` ID, not an R2 key or signed URL;
- RenderLab does not proxy file bytes through the application server;
- uploaded downloads prefer sanitized `original_filename`, then `display_name`, while forcing canonical extension from `mime_type`;
- filename sanitization preserves legitimate Unicode but removes controls/path/platform-forbidden semantics and mitigates Windows reserved basenames;
- generated media uses `renderlab-<kind>-<id-prefix>.<ext>` fallback, not prompt/storage identity;
- response disposition includes ASCII `filename` fallback plus UTF-8 RFC5987 `filename*`;
- Download is Viewer-only/secondary in v0.1, not a Library-card or batch action.

PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef` after configured and documentation-finalized verification.

## Durable Media Rename Flow
UI-025:
```text
Media Viewer
  -> user opens inline Rename editor
  -> PATCH /api/media/assets/[assetId] { displayName }
  -> validate opaque UUID + normalize bounded human name
  -> reload durable media_assets row
  -> update display_name only
  -> return public media asset
  -> client closes editor + refreshes server-rendered Viewer
  -> Library search sees the new display name immediately
```

Rules:
- control characters are removed and whitespace is collapsed before persistence;
- normalized name must be non-empty and at most 240 characters;
- only `media_assets.display_name` changes;
- uploaded `original_filename`, `mime_type`, `storage_key`, generated provenance/prompt and object contents are preserved;
- Download semantics remain independent: uploaded downloads continue to prefer original filename, generated downloads keep deterministic fallback naming;
- no R2 object move/rename occurs and Rename adds no browser-upload CORS requirement;
- the interaction remains Viewer-only and feature-owned in v0.1; no generic management framework, Library-card rename, delete, collections or batch actions are implied.

PR #12 final exact head `70cbcc4daeafb9a48c0253df38796811d4cf4f03` passed UI Shell `33077320919`, Search `33077320839`, Upload Integration `33077320935`, Download `33077320886`, Rename `33077321228`, and Library Lifecycle `33077320976`; direct cleanup was zero and the PR merged as `d76f0ce30502e2aff2384dcd168f07b2184768a4`.

## Media Delivery and Continuation
Product media APIs expose metadata/content/thumbnail/download plus bounded metadata mutation without exposing raw storage identity. Ordinary content routes sign inline reads; Download signs attachment reads. Library cards deep-link to Viewer. Image continuation actions come from shared capabilities, and Create revalidates durable identity/action compatibility before initialization.

## Supabase Boundary
RenderLab reuses shared Supabase project `AI Studio` (`rashyleshocuvpgcooxy`) while keeping RenderLab tables separate from legacy `studio_*`.

Applied RenderLab tables: `generation_sources`, `generation_jobs`, `media_assets`, `media_upload_sessions`. Migration `0003_persistent_media_uploads.sql` is applied as `20260827031630`. RLS remains enabled; service-role credentials are server-only. Search, Download, Rename, history ordering and UI-026 add no schema migration.

## Cloudflare R2 Boundary
- shared R2 is deliberately reused;
- generated media uses `renderlab/generations/...`; persistent uploads use `renderlab/uploads/...`;
- credentials stay server-only;
- upload uses short-lived signed PUT + exact-origin CORS;
- the current admin-capable R2 access-key credentials can reconcile the managed exact-origin CORS rule through the S3 API;
- ordinary media delivery uses short-lived signed GET;
- Download uses short-lived signed GET with `ResponseContentDisposition` attachment override;
- Rename does not mutate R2 objects at all;
- Library history ordering does not touch R2 or CORS;
- signed URLs are ephemeral implementation details, never durable product links.

Do not disable browser security, use broad wildcard upload CORS, proxy transfers solely for convenience, expose raw storage identity, or implement Rename by moving storage objects.

## Remote Validation Architecture
GitHub-based iteration; no Vercel preview dependency.

Key workflows:
- `.github/workflows/ui-shell.yml` — UI purity audit, production build, credential-free UI/API behavior and responsive screenshots;
- `.github/workflows/create-lifecycle-visual.yml` — configured real generation lifecycle;
- `.github/workflows/media-upload-integration.yml` — persistent upload backend contract, no ComfyUI;
- `.github/workflows/library-lifecycle-visual.yml` — real Upload → Library → Viewer → Create, responsive screenshots, cleanup; serialized with `concurrency: renderlab-library-lifecycle-shared` because it mutates shared Supabase/R2 fixture state;
- `.github/workflows/library-search-visual.yml` — real durable-media search fixtures, responsive result/no-match states, cleanup;
- `.github/workflows/library-history-visual.yml` — real R2/Supabase-backed controlled-timestamp fixtures, newest/oldest API + pagination/kind composition, real Dropdown Menu navigation, responsive screenshots and cleanup;
- `.github/workflows/media-download-visual.yml` — real uploaded/generated R2-backed downloads, exact filenames/bytes, Viewer screenshots, cleanup;
- `.github/workflows/media-rename-visual.yml` — real generated/uploaded durable Rename, Search/Download invariants, desktop/mobile edit/renamed screenshots, cleanup.

Shared primitive/config/package paths are included in the affected visual workflow triggers. A change to `src/components/ui`, `components.json`, `package.json` or the shared primitive contract must not bypass Create/Library/Viewer regression coverage merely because a feature file itself was untouched.

### PR #13 maintained-primitive verification
Implementation head `36ee8e8eb80645d1389afa749a36b493e2abbb61` passed all six affected gates:
- UI Shell Validation `33088086901`;
- Create Lifecycle Visual `33088086892`;
- Library Search Visual `33088086914`;
- Library Lifecycle Visual `33088086872`;
- Media Download Visual `33088086907`;
- Media Rename Visual `33088086871`.

The Library lifecycle verified real browser Upload → Library → Viewer → Edit continuation with the Radix Image radio selected, 400×300 media geometry and self-cleanup. Final-code desktop/mobile screenshots from UI Shell and Library lifecycle were visually inspected with no unintended hierarchy/layout drift.

Documentation-finalized candidate head `ba8199b49d4576dc5495779f8e84812786c5b586` passed UI Shell `33089332190`, Create Lifecycle `33089332135`, Library Search `33089333557`, Library Lifecycle `33089332001`, Media Download `33089332087`, and Media Rename `33089332021`. UI-026 and the maintained primitive architecture are approved and merged through PR #13.

### PR #14 Library history verification
Implementation head `9cde5180acb932b255e956c0f257b0246c0e381c` passed all eight affected gates:
- Library History Visual `33094977896`;
- UI Shell Validation `33094977929`;
- Library Search Visual `33094977911`;
- Library Lifecycle Visual `33094977899`;
- Media Download Visual `33094977913` after an unchanged rerun of a transient second-download event timeout;
- Media Rename Visual `33094977895`;
- Create Lifecycle Visual `33094977825`;
- Persistent Media Upload Integration `33094978022`.

History screenshots for desktop Oldest, open menu and mobile Newest were visually inspected with no unintended hierarchy drift. Direct Supabase cleanup found `0` history verification assets and `0` upload sessions. Final documentation-head regression is required before PR #14 merge.

## Naming Conventions
- React files: `kebab-case.tsx`
- Hooks: `use-*.ts`
- Services/libraries: `kebab-case.ts`
- framework route filenames remain framework-defined
- component exports/types: `PascalCase`
- functions/variables: `camelCase`
- semantic CSS/Tailwind tokens: lowercase kebab-case

## Architecture Guardrails
- Server Components by default; no broad client boundaries for convenience.
- Product contracts use opaque IDs, never provider/storage identity.
- Shared capability logic owns continuation eligibility.
- Browser does not talk directly to workers.
- Shared infrastructure reuse never authorizes legacy `studio_*` coupling.
- Approved Create/Library/Viewer visual language is not redesigned by incremental media features or primitive maintenance.
- Conventional visible feature/shell controls compose the approved maintained primitive layer; raw native controls are plumbing-only exceptions defined by UI-026.
- Search remains server-owned durable discovery.
- Library chronological ordering remains URL/server-owned over the durable corpus; do not replace it with page-only client sorting or expand it into a generic filter console by implication.
- Favorites/Collections require an explicit account/user ownership model; do not encode global durable-media flags prematurely.
- Delete requires explicit database/R2/reference-history cleanup and recovery/tombstone semantics before product approval.
- Download remains a Viewer-contextual product action through a stable media route; raw signed R2 URLs are ephemeral only.
- Rename remains a bounded durable display-name mutation; do not reinterpret it as file/storage rename or broader management approval.
- Future public upload origins must be added explicitly to exact-origin R2 CORS.