# Project

RenderLab is an AI image/video creation platform using cloud-hosted ComfyUI workflows as the generation backend.

## Product Direction
RenderLab is a fresh application, not a direct migration or visual clone of the previous Studio implementation in `saga`.

Saga is reference material for proven behavior, backend integration, workflow capability, persistence, job lifecycle and lessons learned. Its UI, navigation, component hierarchy, routing, deployed runtime and legacy tables are not the RenderLab specification.

## Product UX Principle
**Simple by default, powerful when needed.**

Users interact with understandable creative goals rather than ComfyUI graphs, worker routing or storage implementation. Advanced/model-specific controls are progressively disclosed only when useful.

## Stack
### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui/Radix plus the approved maintained component ecosystem
- Server Components by default; Client Components for interactive feature behavior

### Infrastructure
- Vercel deployment target
- Cloudflare R2
- Supabase
- existing cloud-hosted ComfyUI/Modal worker fleet

RenderLab deliberately reuses Saga/Studio infrastructure resources while keeping RenderLab schema, storage prefixes, orchestration, APIs and product contracts independently named and owned. See `docs/architecture/INFRASTRUCTURE.md`.

## Product Architecture Direction
Generation is modeled as:

`Workflow → Inputs → Parameters → Generation Job → Outputs → Continuation Actions`

Generation inputs use opaque product identities such as temporary-source IDs and durable media-asset IDs. R2 storage keys, provider IDs and worker routing remain server-side implementation details.

## Product Areas
Primary:
- **Create** `/`
- **Library** `/library`

Contextual/utility:
- **Media Viewer** `/library/[assetId]`
- **Activity** `/activity`
- **Settings** `/settings`

Image, Video, Edit, Animate, Models and Workflows are not separate top-level destinations by default.

## Current Priority
**Phase 4 — Media & Continuation.**

### Approved product state
- Application shell: `APPROVED`.
- Create: `APPROVED`; configured complete browser lifecycle approval run `33031817744`.
- Library v0.1: `APPROVED`; credential-free run `33034606323`, configured R2/Supabase lifecycle run `33034606396`.
- Media Viewer v0.1: `APPROVED`; the same configured run `33034606396` verified Library → Viewer → Create Edit continuation.
- Create supports the four initial native operations: Create Image, Edit Image, Create Video and Animate Image.
- Durable generated media is stored in RenderLab `media_assets`, delivered through product media APIs and reusable through opaque `media-asset` continuation.
- Viewer/Create continuation is capability-derived and server-validates durable asset identity and action compatibility before initializing Create.

Do not redesign these approved surfaces merely because new media capabilities are added.

## Current Phase 4 Slice — Persistent Media Uploads
PR #9 on `work/persistent-media-uploads-v0-1` implements the RenderLab-owned persistent upload contract defined by UI-022.

### Durable identity decision
- Durable user uploads are ordinary `media_assets` with `origin = uploaded`.
- Pending direct-to-R2 transfer state is owned by server-side `media_upload_sessions`.
- After verification, the upload is promoted into normal `media_assets` and immediately participates in Library, Media Viewer and Create continuation through the existing opaque `media-asset` identity.
- `generation_sources` remains temporary generation/reference input state and is not the durable Library upload model.
- Legacy Saga `studio_uploads` is not reused or repurposed.
- There is no parallel public Uploads identity or Uploads tab.

### Implemented contract
- Migration: `supabase/migrations/0003_persistent_media_uploads.sql`.
- Applied shared-Supabase migration: `20260827031630 renderlab_persistent_media_uploads`.
- `media_assets` now owns explicit origin, original filename, display name and byte-size metadata while generated rows remain backward compatible.
- `media_upload_sessions` owns pending/completed/failed transfer state and links completed transfers to the durable media asset.
- Browser upload flow: ticket → short-lived signed R2 PUT → completion → server HEAD verification of exact MIME/size → durable `media_assets` promotion.
- Initial persistent upload types: PNG, JPEG, WebP; max 25 MB.
- Human-facing original filenames preserve Unicode/non-ASCII characters while removing controls/path semantics and enforcing a bounded length.
- Concurrent completion races recover to the unique durable `media_assets.storage_key` winner instead of surfacing a duplicate insert failure.
- Public generated/uploaded media use one `PublicMediaAsset` shape.
- Library has a compact Upload action using the native file picker and existing v0.1 visual language; uploaded cards prefer their display name.
- Media Viewer truthfully identifies uploaded media and exposes capability-derived Edit/Animate for uploaded images.

### Verification status
Verified:
- Shared Supabase migration is applied with RLS enabled on `media_assets` and `media_upload_sessions`.
- Original persistent backend integration run `33035954398` passed and self-cleaned.
- Hardened backend integration run `33037773016` passed, including Unicode filename preservation, concurrent completion recovery, sequential idempotency, ordinary media-list visibility/content delivery and cleanup.
- Hardened UI Shell / production build + credential-free Playwright run `33037773014` passed.

Not yet approved:
- Real configured browser Upload → Library → Viewer → Create continuation.
- Desktop/mobile screenshot inspection for the upload extension.

### Current blocker
The shared R2 bucket is not currently browser-ready for the configured GitHub origin because bucket CORS has not been established with a credential available to RenderLab automation.

Browser lifecycle run `33037773015` used the actual Library Upload control and native file chooser. The upload ticket was created, but the browser could not complete the signed R2 PUT, so the completion endpoint was never reached and the verifier timed out. Its upload-session fixture was self-cleaned and no screenshots were produced.

The existing RenderLab R2 credentials can read/write objects but receive `403 AccessDenied` for bucket CORS management. `CLOUDFLARE_API_TOKEN` is not configured. `scripts/ensure-r2-browser-cors.mjs` is an optional idempotent management helper when an appropriately scoped R2 Admin/Cloudflare API credential is available; the browser lifecycle itself remains the authority for whether CORS is actually correct.

**PR #9 must remain open and unmerged until the real browser lifecycle passes, screenshots are inspected, fixtures are confirmed clean, approval documentation is finalized and all required checks are green on the current head.**

## Still Open in Phase 4
Do not treat these as completed by the persistent-upload contract:
- search and broader history controls;
- favorites/collections;
- rename/delete/download/batch management;
- any broader Library organization model.

The immediate next work is to unblock and complete the configured persistent-upload browser verification. After PR #9 is genuinely approved and merged, establish the next Phase 4 task from repository state rather than assuming one of the broader features above should be next.

## Infrastructure Cleanup Still Open
- Remove the transitional Studio compatibility adapter once no migration/debugging requirement depends on it.
- Keep capability definitions and native workflow defaults aligned as backend capability grows; do not expose controls merely because a worker accepts them.

## Source of Truth
The `renderlab` repository is authoritative. ChatGPT Project context is secondary continuity context and current conversations are temporary working context.

See:
- `AGENTS.md`
- `docs/ui/UI_MIGRATION.md`
- `docs/ui/UI_DECISIONS.md`
- `docs/ui/SCREEN_REGISTRY.md`
- `docs/architecture/FRONTEND_ARCHITECTURE.md`
- `docs/architecture/INFRASTRUCTURE.md`
