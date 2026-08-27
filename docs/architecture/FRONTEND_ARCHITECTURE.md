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

Create, Library v0.1 and Media Viewer v0.1 are approved product surfaces. Activity and Settings remain placeholders. The persistent Library upload extension exists in PR #9 but is not visually approved while its real browser direct-R2 lifecycle is blocked by bucket CORS.

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
- Library kind/pagination may use URL state because it is navigable browsing state.
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

Browser components do not call ComfyUI workers, Supabase service-role APIs or raw R2 credentials directly.

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
- `lib/api` — typed product API contracts;
- `server/generation` — orchestration/worker boundaries;
- `server/media` — durable media and upload services;
- `server/storage` — R2 provider implementation;
- `server/data` — Supabase/repository access.

Do not extract a generic media/upload framework merely because one feature uses an Upload button. Reuse should follow a second real product need.

## Component / Client Boundaries
### Server Components by default
Use for routes/layouts and server-owned media loading where browser state is unnecessary.

Library route composition, Media Viewer media loading and root Create continuation validation are server-owned.

### Client Components deliberately
Use for:
- Create workspace state and live polling;
- temporary reference interaction;
- Library persistent upload file selection/progress/error feedback;
- interactive continuation/disclosure mechanics;
- dialogs/sheets/popovers only when required by the product behavior.

`src/features/library/library-upload-button.tsx` is intentionally feature-owned. It uses a native hidden file input and does not create a generic upload modal framework.

## State Architecture
### URL state
Current URL-owned state:
- Library `kind` / `offset` browsing state;
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
Create owns prompt/reference/settings/job/result drafts. Library Upload owns only local file-selection/upload feedback until completion returns a durable asset. After verification, the server-rendered Library/media contract is authoritative.

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

A worker response is not product completion. Success occurs only after durable media persistence.

All four initial operations and durable generated-media continuation are live verified.

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

Backend integration run `33037773016` verifies this contract against shared R2/Supabase, including Unicode filename preservation, concurrent completion, repeated completion, ordinary media API visibility/content and cleanup.

The real browser lifecycle is **not yet approved**. Run `33037773015` used the actual Upload control/native file chooser and created a ticket, but Chromium could not complete the signed R2 PUT because the shared R2 bucket lacks usable CORS for the test browser origin. Its upload-session fixture self-cleaned and no approval screenshots were produced.

## Media Delivery and Continuation
Product media APIs expose metadata/content/thumbnail without exposing raw storage identity.

Library cards deep-link to `/library/[assetId]`. Media Viewer derives compatible continuation actions from `src/lib/capabilities/generation.ts`.

Persisted image assets—generated or uploaded—use the same continuation model. Viewer links carry opaque `media-asset` identity plus action intent; the Create server route validates the durable record and capability before initializing workspace state.

## Supabase Boundary
RenderLab reuses `AI Studio` (`rashyleshocuvpgcooxy`) while keeping RenderLab tables separate from legacy `studio_*`.

Applied tables/contracts:
- `generation_sources`;
- `generation_jobs`;
- `media_assets`;
- `media_upload_sessions`.

Migration `0003_persistent_media_uploads.sql` is already applied as version `20260827031630`. RLS remains enabled; service-role credentials are server-only.

## Cloudflare R2 Boundary
- Shared R2 is reused by explicit decision.
- Generated outputs use `renderlab/generations/...`; persistent uploads use `renderlab/uploads/...`.
- R2 credentials stay server-only.
- Browser uploads use short-lived signed PUT URLs.
- Direct browser PUT additionally requires an origin-appropriate bucket CORS rule.
- Existing object-level credentials cannot manage that CORS rule (`403 AccessDenied`); optional `CLOUDFLARE_API_TOKEN`/R2 Admin configuration is documented in `docs/architecture/INFRASTRUCTURE.md`.

Do not disable browser security, proxy the transfer through RenderLab solely to satisfy CI, or replace real browser proof with Node-only integration.

## Remote Validation Architecture
UI iteration remains GitHub-based and does not require Vercel preview deployments.

### Credential-free validation
`.github/workflows/ui-shell.yml` covers production build, Playwright Chromium, desktop/mobile rendering, product API contracts and truthful unavailable states.

Hardened persistent-upload code head run `33037773014` passed this gate.

### Configured Create lifecycle
`scripts/verify-create-lifecycle.mjs` + `.github/workflows/create-lifecycle-visual.yml` drive one real generation through the browser, verify durable persistence/continuation, capture responsive screenshots and self-clean. Approval run: `33031817744`.

### Configured persistent upload API integration
`scripts/verify-media-upload.mjs` + `.github/workflows/persistent-media-upload-integration.yml` exercise ticket → signed PUT → completion → durable media contract directly without ComfyUI. Hardened run `33037773016` passed and self-cleaned.

### Configured persistent upload browser lifecycle
`scripts/verify-library-lifecycle.mjs` + `.github/workflows/library-lifecycle-visual.yml` are now the required browser-visible persistent upload gate. The verifier uses the actual Library Upload control/native file chooser and is intended to verify:
1. ticket + browser signed R2 PUT + completion;
2. uploaded Library card/display name;
3. Viewer uploaded metadata and media geometry;
4. capability-derived Edit/Animate;
5. Edit → server-validated Create continuation using the durable uploaded `media-asset` ID;
6. desktop/mobile screenshots;
7. R2 + `media_assets` + `media_upload_sessions` cleanup.

It does not invoke ComfyUI. The current shared bucket CORS blocker must be resolved before this gate can approve PR #9.

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
- Approved Create/Library/Viewer visual language is not redesigned by this upload slice.
- Persistent upload implementation is not `APPROVED` until the configured browser lifecycle and screenshot review pass.
