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

Approved product state includes Create, Library v0.1, persistent Upload, Library search v0.1 and Media Viewer v0.1. Upload merged through PR #9; search merged through PR #10 as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`. Durable Media Viewer Download v0.1 is verified in PR #11 pending final documentation-head CI. Activity and Settings remain placeholders.

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

## Product API Boundaries
```text
POST     /api/generation/jobs
GET      /api/generation/jobs/[jobId]

POST     /api/assets/reference/upload-tickets
POST     /api/assets/reference/upload-completions

GET      /api/media/assets
GET      /api/media/assets/[assetId]
GET      /api/media/assets/[assetId]/content
GET      /api/media/assets/[assetId]/thumbnail
GET      /api/media/assets/[assetId]/download
POST     /api/media/uploads/upload-tickets
POST     /api/media/uploads/upload-completions
```

`GET /api/media/assets` accepts bounded `kind`, `q`, `limit`, `offset`. Browser components do not call workers, Supabase service-role APIs or raw R2 credentials directly.

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
│       └── media-viewer.tsx
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
- `server/media` — durable media/query/upload/download services;
- `server/storage` — R2 implementation;
- `server/data` — Supabase/repository access.

Do not extract generic upload/search/download frameworks from single feature needs. Reuse follows a second real product need.

## Component / Client Boundaries
### Server Components by default
Library route composition, Library search, Media Viewer loading and root Create continuation validation are server-owned.

### Client Components deliberately
Use for Create workspace/polling, temporary reference interaction, Library upload file selection/feedback, and interactions that truly require browser state.

Library search uses a native GET form + URL state. Media Viewer Download uses a normal anchor to a product route. Neither needs a client state store.

## State Architecture
### URL state
- Library `kind` / `q` / `offset`;
- durable asset ID in `/library/[assetId]`;
- Viewer → Create `source` / `action` intent.

### Server state
- `generation_jobs`;
- durable `media_assets`;
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

Implementation head `6d528c47445b26b5464fa529b9e489e6a7ce87ff` passed UI Shell `33070792349`, Search `33070792317`, Upload Integration `33070792362`, Library Lifecycle `33070792329`, and configured Download `33070792343`. Chromium verified `RenderLab-Download-画像.png`, deterministic generated fallback, exact 68-byte contents and R2 `ResponseContentDisposition`. Screenshots reviewed; cleanup `0/0/0`.

## Media Delivery and Continuation
Product media APIs expose metadata/content/thumbnail/download without exposing raw storage identity. Ordinary content routes sign inline reads; Download signs attachment reads. Library cards deep-link to Viewer. Image continuation actions come from shared capabilities, and Create revalidates durable identity/action compatibility before initialization.

## Supabase Boundary
RenderLab reuses shared Supabase project `AI Studio` (`rashyleshocuvpgcooxy`) while keeping RenderLab tables separate from legacy `studio_*`.

Applied RenderLab tables: `generation_sources`, `generation_jobs`, `media_assets`, `media_upload_sessions`. Migration `0003_persistent_media_uploads.sql` is applied as `20260827031630`. RLS remains enabled; service-role credentials are server-only. Search and Download add no schema migration.

## Cloudflare R2 Boundary
- shared R2 is deliberately reused;
- generated media uses `renderlab/generations/...`; persistent uploads use `renderlab/uploads/...`;
- credentials stay server-only;
- upload uses short-lived signed PUT + exact-origin CORS;
- ordinary media delivery uses short-lived signed GET;
- Download uses short-lived signed GET with `ResponseContentDisposition` attachment override;
- signed URLs are ephemeral implementation details, never durable product links.

Do not disable browser security, use broad wildcard upload CORS, proxy transfers solely for convenience, or expose raw storage identity.

## Remote Validation Architecture
GitHub-based iteration; no Vercel preview dependency.

Key workflows:
- `.github/workflows/ui-shell.yml` — production build, credential-free UI/API behavior;
- `create-lifecycle-visual.yml` — configured real generation lifecycle;
- `media-upload-integration.yml` — persistent upload backend contract, no ComfyUI;
- `library-lifecycle-visual.yml` — real Upload → Library → Viewer → Create, responsive screenshots, cleanup;
- `library-search-visual.yml` — real durable-media search fixtures, responsive result/no-match states, cleanup;
- `media-download-visual.yml` — real uploaded/generated R2-backed downloads, exact filenames/bytes, Viewer screenshots, cleanup.

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
- Future public upload origins must be added explicitly to exact-origin R2 CORS.
