# Frontend Architecture

This document defines the approved RenderLab frontend architecture and records verified implementation state.

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

Create, Library v0.1, persistent Library Upload, Library search v0.1 and Media Viewer v0.1 are approved product surfaces/capabilities. Activity and Settings remain placeholders. Persistent uploads are merged through PR #9. Library search v0.1 is verified in PR #10, including implementation-head UI Shell `33069004219`, upload regression `33069004207`, Library lifecycle `33069004227` and configured search lifecycle `33069004204`.

## Framework
**Framework:** Next.js App Router  
**Language:** TypeScript  
**Rendering:** Server Components by default; Client Components only for interactive feature behavior  
**Styling:** Tailwind CSS + semantic project tokens  
**Components:** existing approved RenderLab components first, then normalized shadcn/ui/Radix and the approved component ecosystem in `docs/ui/COMPONENT_CATALOG.md`.

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
- Image, Video, Edit, Animate, models and workflows are not separate top-level routes by default.
- Library `kind`, `q` and `offset` are URL-owned browsing/discovery state because users can share, refresh and navigate them.
- Changing Library kind/search resets pagination; pagination preserves active kind/search.
- Viewer → Create `source` + `action` parameters are untrusted continuation intent; the server reloads the durable asset and validates capability compatibility before initializing client state.

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
POST     /api/media/uploads/upload-tickets
POST     /api/media/uploads/upload-completions
```

`GET /api/media/assets` accepts bounded Library query state including `kind`, `q`, `limit` and `offset`. Browser components do not call ComfyUI workers, Supabase service-role APIs or raw R2 credentials directly.

## Current Ownership Structure
Important current boundaries include:

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
│   │   ├── generation-contract.ts
│   │   ├── reference-upload-contract.ts
│   │   ├── media-assets-contract.ts
│   │   └── media-upload-contract.ts
│   └── capabilities/generation.ts
└── server/
    ├── data/supabase-rest.ts
    ├── generation/
    ├── media/
    │   ├── media-assets.ts
    │   └── media-uploads.ts
    └── storage/r2.ts

supabase/migrations/
├── 0001_generation_sources.sql
├── 0002_generation_jobs_media_assets.sql
└── 0003_persistent_media_uploads.sql
```

Ownership rules:
- `components/ui` — normalized generic primitives without feature data contracts;
- `components/shell` — persistent application chrome;
- `features/<feature>` — product-specific composition/behavior;
- `lib/capabilities` — user-facing capability definitions/resolution;
- `lib/api` — typed product API/query contracts;
- `server/generation` — orchestration/worker boundaries;
- `server/media` — durable media, media-query and upload services;
- `server/storage` — R2 provider implementation;
- `server/data` — Supabase/repository access.

Do not extract a generic media/upload/search framework from one feature. Reuse should follow a second real product need.

## Component / Client Boundaries
### Server Components by default
Use for routes/layouts and server-owned media loading/querying where browser state is unnecessary.

Library route composition, Library text search, Media Viewer media loading and root Create continuation validation are server-owned. Library search uses a native `GET` form and URL state; it does not require a client search store or client-side filtering of already-loaded cards.

### Client Components deliberately
Use for:
- Create workspace state and live polling;
- temporary reference interaction;
- Library persistent upload file selection/progress/error feedback;
- interactive continuation/disclosure mechanics;
- dialogs/sheets/popovers only when required by product behavior.

`src/features/library/library-upload-button.tsx` is intentionally feature-owned. It uses a native hidden file input and does not create a generic upload modal framework.

## State Architecture
### URL state
Current URL-owned state:
- Library `kind` / `q` / `offset` browsing and discovery state;
- durable asset ID in `/library/[assetId]`;
- Viewer → Create `source` / `action` intent.

### Server state
Server-owned durable/operational data:
- `generation_jobs`;
- `media_assets`;
- `media_upload_sessions`;
- temporary `generation_sources`.

`generation_sources` and `media_upload_sessions` have different lifetimes and responsibilities. Temporary references must not become durable Library media; pending upload sessions must not become public asset identity.

### Client feature state
Create owns prompt/reference/settings/job/result drafts. Library Upload owns only local file-selection/upload feedback until completion returns a durable asset. Library search does not introduce persistent client state: after navigation, server-rendered URL/media state is authoritative.

Avoid an ad-hoc global store until multiple features genuinely need one.

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
Continuation Actions
```

Generation inputs bind by product identity:
```text
GenerationInput
  ├── temporary-source { id }
  └── media-asset      { id }
```

Generated and uploaded durable media both use `media-asset` identity. R2 keys, provider IDs, worker IDs and ComfyUI graph identifiers remain server-side.

## Native Generation Flow
```text
Create
  -> POST /api/generation/jobs
  -> validate request / resolve operation
  -> create generation_jobs
  -> resolve opaque inputs
  -> submit to compatible worker
  -> poll via RenderLab API
  -> persist output to R2
  -> create media_assets
  -> job succeeds with outputAssetIds
  -> Create loads product media API
  -> render result + capability-derived continuation
```

A worker response is not product completion. Success occurs only after durable media persistence. All four initial operations and durable generated-media continuation are live verified.

## Temporary Reference Upload Flow
```text
Create selects reference
  -> reference upload ticket
  -> pending generation_sources + signed PUT
  -> browser PUT
  -> reference completion
  -> server HEAD verification
  -> generation_sources ready
  -> Create binds temporary-source ID
```

This flow is temporary generation-input state, not Library persistence.

## Persistent Library Upload Flow
UI-022 defines persistent uploads as ordinary durable media assets:

```text
Library selects PNG/JPEG/WebP (≤25 MB)
  -> POST /api/media/uploads/upload-tickets
  -> pending media_upload_sessions + opaque uploadId
  -> short-lived signed R2 PUT
  -> browser uploads directly to R2
  -> POST /api/media/uploads/upload-completions
  -> server HEAD-verifies exact MIME + byte size
  -> create media_assets(origin=uploaded)
  -> mark session completed + media_asset_id
  -> router refreshes Library
  -> card / Viewer / Create use normal media-asset identity
```

Rules:
- Browser never receives R2 credentials or storage keys as product identity.
- Storage key is RenderLab-generated and opaque.
- Human original filenames preserve legitimate Unicode/non-ASCII text while controls/path semantics are removed and length is bounded.
- Only verified completion creates the durable asset.
- Repeated completion is idempotent; concurrent insert races recover to the unique `media_assets.storage_key` winner.
- No parallel public Uploads asset type/tab is introduced.

Final pre-merge upload verification passed UI Shell `33067469516`, backend integration `33067469518` and Library browser lifecycle `33067469527`; PR #9 then merged as `d306f2abd1831538c51692545d72db1e5e9e0814` and `main` remained green.

## Library Search Flow
UI-023 defines Library search as URL-owned durable-media discovery:

```text
/library?q=<text>&kind=<optional>&offset=<optional>
  -> normalize whitespace and cap q at 120 chars
  -> server listMediaAssets({ search, kind, offset })
  -> escape q as literal regex text
  -> PostgREST OR:
       display_name imatch q
       original_filename imatch q
       provenance->>prompt imatch q
  -> AND optional kind
  -> order created_at.desc,id.desc
  -> render existing Library cards / truthful no-match state
```

Rules:
- Search spans durable `media_assets`; it is not a client-side filter over one loaded page.
- Matching is case-insensitive literal substring behavior. Regex/PostgREST syntax is internal and user punctuation is escaped before it reaches the provider query.
- Search covers human-facing display name, original uploaded filename and generated prompt only.
- Storage keys, provider/worker metadata, model internals, temporary `generation_sources` and legacy `studio_*` tables are excluded.
- Kind and search compose; newest-first ordering remains authoritative in v0.1 rather than relevance ranking.
- There is no schema migration or dedicated search service in v0.1. During the search audit the shared production corpus was empty and `pg_trgm` was not installed, so indexing is intentionally deferred until actual corpus size/query behavior warrants it. Optimization may change behind the same UI-023 product contract later.

Configured approval run `33069004204` used two self-cleaning real R2-backed `media_assets` fixtures and verified prompt, Unicode filename, punctuation-literal and kind+search behavior through the public API/browser. Four desktop/mobile result/empty screenshots were visually inspected. Direct cleanup verification found zero search fixtures after the run.

## Media Delivery and Continuation
Product media APIs expose metadata/content/thumbnail without exposing raw storage identity.

Library cards deep-link to `/library/[assetId]`. Media Viewer derives compatible continuation actions from `src/lib/capabilities/generation.ts`.

Persisted image assets—generated or uploaded—use the same continuation model. Viewer links carry opaque `media-asset` identity plus action intent; the Create server route validates the durable record and capability before initializing workspace state. Uploaded media preserves its uploaded display name in Create instead of being mislabeled as generated.

## Supabase Boundary
RenderLab reuses `AI Studio` (`rashyleshocuvpgcooxy`) while keeping RenderLab tables separate from legacy `studio_*`.

Applied tables/contracts:
- `generation_sources`;
- `generation_jobs`;
- `media_assets`;
- `media_upload_sessions`.

Migration `0003_persistent_media_uploads.sql` is applied as version `20260827031630`. RLS remains enabled; service-role credentials are server-only. Library search reuses existing `media_assets` fields and adds no migration.

## Cloudflare R2 Boundary
- Shared R2 is reused by explicit decision.
- Generated outputs use `renderlab/generations/...`; persistent uploads use `renderlab/uploads/...`.
- R2 credentials stay server-only.
- Browser uploads use short-lived signed PUT URLs.
- Direct browser PUT requires an origin-appropriate bucket CORS rule.
- The R2 access-key token represented by `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` has bucket-admin capability and manages the `renderlab-browser-uploads` rule through the S3 API.
- Managed origins include both localhost CI origins and the current stable RenderLab Vercel domains.
- `CLOUDFLARE_API_TOKEN` remains an optional REST-API fallback, not the verified primary path.
- If the eventual public custom/different RenderLab origin changes, add that exact origin before serving direct uploads there.

Do not disable browser security, use broad wildcard CORS merely for convenience, proxy the transfer through RenderLab solely to satisfy CI, or replace real browser proof with Node-only integration.

## Remote Validation Architecture
UI iteration remains GitHub-based and does not require Vercel preview deployments.

### Credential-free validation
`.github/workflows/ui-shell.yml` covers production build, Playwright Chromium, desktop/mobile rendering, product API contracts and truthful unavailable states. Library search implementation-head run `33069004219` passed.

### Configured Create lifecycle
`scripts/verify-create-lifecycle.mjs` + `.github/workflows/create-lifecycle-visual.yml` drive one real generation through the browser, verify durable persistence/continuation, capture responsive screenshots and self-clean. Approval run: `33031817744`.

### Configured persistent upload API integration
`scripts/verify-media-upload.mjs` + `.github/workflows/media-upload-integration.yml` exercise ticket → signed PUT → completion → durable media contract directly without ComfyUI. Search implementation-head regression run `33069004207` passed and self-cleaned.

### Configured persistent upload browser lifecycle
`scripts/verify-library-lifecycle.mjs` + `.github/workflows/library-lifecycle-visual.yml` verify the actual Upload control/native picker → direct R2 PUT → promotion → Library → Viewer → Create continuation plus screenshots and cleanup. Search implementation-head regression run `33069004227` passed.

### Configured Library search lifecycle
`scripts/verify-library-search.mjs` + `.github/workflows/library-search-visual.yml` create self-cleaning real R2-backed durable media fixtures and verify:
1. case-insensitive generated-prompt search;
2. case-insensitive Unicode original-filename search;
3. literal punctuation/wildcard-character search semantics;
4. kind + search conjunction;
5. URL-owned search and kind-link preservation;
6. desktop/mobile result states;
7. truthful desktop/mobile no-match states;
8. R2 + `media_assets` cleanup.

It does not invoke ComfyUI. Implementation-head approval run: `33069004204`.

## Naming Conventions
- React files: `kebab-case.tsx`.
- Hooks: `use-*.ts`.
- Services/libraries: `kebab-case.ts`.
- Next.js reserved route filenames remain framework-defined.
- Component exports/types: `PascalCase`.
- Functions/variables: `camelCase`.
- Semantic CSS/Tailwind tokens: lowercase kebab-case.

## Architecture Guardrails
- Server Components by default; no broad client boundaries for convenience.
- Product contracts use opaque IDs, never provider/storage identity.
- Shared capability logic owns continuation eligibility.
- Browser does not talk directly to worker providers.
- Shared infrastructure reuse never authorizes legacy `studio_*` coupling.
- Approved Create/Library/Viewer visual language is not redesigned by incremental media features.
- Persistent uploads remain one durable-media contract rather than a parallel upload product model.
- Library search remains server-owned durable discovery; do not replace it with a page-only client filter or a Saga-style filter console without an explicit product decision.
- Search implementation details may evolve for scale while preserving UI-023 literal matching, URL state and field scope.
- Any future public origin change must be reflected in exact origin-restricted R2 CORS before browser upload is considered deployable there.
