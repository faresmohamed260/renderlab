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
- Radix Collapsible `@radix-ui/react-collapsible` `1.1.20`
- Playwright `1.62.1`
- AWS SDK S3 client/request presigner `3.1116.0`

Approved product state includes Create, Library v0.1, persistent Upload, Library search v0.1 and Media Viewer v0.1. Upload merged through PR #9; search merged through PR #10 as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`; durable Media Viewer Download v0.1 merged through PR #11 as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`. Durable Media Viewer Rename v0.1 is functionally and visually approved in PR #12 pending documentation-finalized exact-head CI. Activity and Settings remain placeholders.

## Framework
**Framework:** Next.js App Router  
**Language:** TypeScript  
**Rendering:** Server Components by default; Client Components only for interactive feature behavior  
**Styling:** Tailwind CSS + semantic project tokens  
**Components:** approved RenderLab components first, then normalized shadcn/Radix and approved sources in `docs/ui/COMPONENT_CATALOG.md`.

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
- Library `kind`, `q`, `offset` are URL-owned shareable browsing/discovery state.
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

`GET /api/media/assets` accepts bounded `kind`, `q`, `limit`, `offset`. `PATCH /api/media/assets/[assetId]` currently owns the UI-025 durable display-name Rename mutation only. Browser components do not call workers, Supabase service-role APIs or raw R2 credentials directly.

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
- `components/ui` — normalized generic primitives without feature data contracts;
- `components/shell` — persistent application chrome;
- `features/<feature>` — product-specific composition/behavior;
- `lib/capabilities` — user-facing capability definitions/resolution;
- `lib/api` — typed product API/query contracts;
- `server/generation` — orchestration/worker boundaries;
- `server/media` — durable media/query/upload/download/rename services;
- `server/storage` — R2 implementation;
- `server/data` — Supabase/repository access.

Do not extract generic upload/search/download/rename frameworks from single feature needs. Reuse follows a second real product need.

## Component / Client Boundaries
### Server Components by default
Library route composition, Library search, Media Viewer loading and root Create continuation validation are server-owned.

### Client Components deliberately
Use for Create workspace/polling, temporary reference interaction, Library upload file selection/feedback, and interactions that truly require browser state.

Library search uses a native GET form + URL state. Media Viewer Download uses a normal anchor to a product route. Rename uses one small Viewer-owned client component for local edit/saving/error state, submits to the product API, then calls router refresh so the server-rendered Viewer title/metadata stays authoritative. No global media-management client store exists.

## State Architecture
### URL state
- Library `kind` / `q` / `offset`;
- durable asset ID in `/library/[assetId]`;
- Viewer → Create `source` / `action` intent.

### Server state
- `generation_jobs`;
- durable `media_assets` including human-facing `display_name`;
- `media_upload_sessions`;
- temporary `generation_sources`.

Temporary references and pending uploads have different lifetimes from durable media. Avoid an ad-hoc global client store until multiple features genuinely need one.

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
/library?q=<text>&kind=<optional>&offset=<optional>
  -> normalize/cap q
  -> listMediaAssets({ search, kind, offset })
  -> escape literal query
  -> PostgREST OR display_name/original_filename/provenance.prompt imatch
  -> AND optional kind
  -> newest-first
  -> existing cards / truthful no-match state
```

Search is server-side across durable media, not current-page filtering. It excludes storage/provider/model/temporary/legacy data. No schema migration/index/service in v0.1. PR #10 final documentation-head runs passed `33070046222`, `33070046205`, `33070046336`, `33070046186`; merged as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`. Post-merge main `33070215358` passed.

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

Implementation head `6d528c47445b26b5464fa529b9e489e6a7ce87ff` passed UI Shell `33070792349`, Search `33070792317`, Upload Integration `33070792362`, Library Lifecycle `33070792329`, and configured Download `33070792343`. Documentation-finalized runs `33071571971`, `33071572092`, `33071571998`, `33071571944`, `33071571912` passed. PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`; post-merge main shell/reference-upload runs `33071764713` / `33071764748` passed.

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

Refined implementation head `fb6f42cdfae377cf841655320dc4bbeee74d3549` passed UI Shell `33074480462`, Search `33074480419`, Upload Integration `33074480288`, Download `33074480319`, Rename `33074480356`, and Library Lifecycle `33074480489` on rerun after unrelated stale shared fixture cleanup. Configured Chromium verified generated/uploaded Rename, validation bounds, Unicode/whitespace normalization, search discovery, storage/provenance/original-file preservation, unchanged uploaded Download filename/bytes, responsive states and cleanup. Four refined screenshots were visually inspected.

## Media Delivery and Continuation
Product media APIs expose metadata/content/thumbnail/download plus bounded metadata mutation without exposing raw storage identity. Ordinary content routes sign inline reads; Download signs attachment reads. Library cards deep-link to Viewer. Image continuation actions come from shared capabilities, and Create revalidates durable identity/action compatibility before initialization.

## Supabase Boundary
RenderLab reuses shared Supabase project `AI Studio` (`rashyleshocuvpgcooxy`) while keeping RenderLab tables separate from legacy `studio_*`.

Applied RenderLab tables: `generation_sources`, `generation_jobs`, `media_assets`, `media_upload_sessions`. Migration `0003_persistent_media_uploads.sql` is applied as `20260827031630`. RLS remains enabled; service-role credentials are server-only. Search, Download and Rename add no schema migration.

## Cloudflare R2 Boundary
- shared R2 is deliberately reused;
- generated media uses `renderlab/generations/...`; persistent uploads use `renderlab/uploads/...`;
- credentials stay server-only;
- upload uses short-lived signed PUT + exact-origin CORS;
- ordinary media delivery uses short-lived signed GET;
- Download uses short-lived signed GET with `ResponseContentDisposition` attachment override;
- Rename does not mutate R2 objects at all;
- signed URLs are ephemeral implementation details, never durable product links.

Do not disable browser security, use broad wildcard upload CORS, proxy transfers solely for convenience, expose raw storage identity, or implement Rename by moving storage objects.

## Remote Validation Architecture
GitHub-based iteration; no Vercel preview dependency.

Key workflows:
- `.github/workflows/ui-shell.yml` — production build, credential-free UI/API behavior;
- `create-lifecycle-visual.yml` — configured real generation lifecycle;
- `media-upload-integration.yml` — persistent upload backend contract, no ComfyUI;
- `library-lifecycle-visual.yml` — real Upload → Library → Viewer → Create, responsive screenshots, cleanup; serialized with `concurrency: renderlab-library-lifecycle-shared` because it mutates shared Supabase/R2 fixture state;
- `library-search-visual.yml` — real durable-media search fixtures, responsive result/no-match states, cleanup;
- `media-download-visual.yml` — real uploaded/generated R2-backed downloads, exact filenames/bytes, Viewer screenshots, cleanup;
- `media-rename-visual.yml` — real generated/uploaded durable Rename, Search/Download invariants, desktop/mobile edit/renamed screenshots, cleanup.

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
- Approved Create/Library/Viewer visual language is not redesigned by incremental media features.
- Search remains server-owned durable discovery.
- Download remains a Viewer-contextual product action through a stable media route; raw signed R2 URLs are ephemeral only.
- Rename remains a bounded durable display-name mutation; do not reinterpret it as file/storage rename or broader management approval.
- Future public upload origins must be added explicitly to exact-origin R2 CORS.
