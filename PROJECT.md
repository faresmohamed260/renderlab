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
- Persistent Library upload extension: verified and visually approved for PR #9 in configured browser run `33065020778` after production/UI run `33065020735` and persistent backend integration run `33065020704`.
- Create supports the four initial native operations: Create Image, Edit Image, Create Video and Animate Image.
- Durable generated and uploaded media use RenderLab `media_assets`, product media APIs and opaque `media-asset` continuation identity.
- Viewer/Create continuation is capability-derived and server-validates durable asset identity and action compatibility before initializing Create.

Do not redesign these approved surfaces merely because new media capabilities are added.

## Phase 4 Persistent Media Upload Contract
UI-022 defines the approved durable upload model.

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
- `media_assets` owns explicit origin, original filename, display name and byte-size metadata while generated rows remain backward compatible.
- `media_upload_sessions` owns pending/completed/failed transfer state and links completed transfers to the durable media asset.
- Browser upload flow: ticket → short-lived signed R2 PUT → completion → server HEAD verification of exact MIME/size → durable `media_assets` promotion.
- Initial persistent upload types: PNG, JPEG, WebP; max 25 MB.
- Human-facing original filenames preserve Unicode/non-ASCII characters while removing controls/path semantics and enforcing a bounded length.
- Concurrent completion races recover to the unique durable `media_assets.storage_key` winner instead of surfacing a duplicate insert failure.
- Public generated/uploaded media use one `PublicMediaAsset` shape.
- Library has one compact Upload action using the native file picker and existing v0.1 visual language; uploaded cards prefer their display name.
- Media Viewer truthfully identifies uploaded media and exposes capability-derived Edit/Animate for uploaded images.
- Create continuation from uploaded media keeps the uploaded display name rather than describing it as a generated result.

### Verified approval evidence
- Shared Supabase migration is applied with RLS enabled on `media_assets` and `media_upload_sessions`.
- Original persistent backend integration run `33035954398` passed and self-cleaned.
- Final persistent backend integration run `33065020704` passed production build, direct signed PUT, HEAD verification, promotion, concurrent completion recovery, sequential idempotency, public media/list/content behavior, Unicode filename preservation and cleanup.
- Final credential-free UI/API run `33065020735` passed production build and Playwright regression coverage.
- Final configured browser lifecycle run `33065020778` passed the actual Library Upload control/native file chooser → signed R2 PUT → completion → Library card → Media Viewer → capability-derived Edit → server-validated Create handoff at desktop/mobile widths. It verified 400×300 media decode/geometry, captured six screenshots and self-cleaned.
- The six screenshots from `33065020778` were visually inspected. Upload placement, uploaded display name, Viewer uploaded metadata, Edit/Animate actions and desktop/mobile Create continuation preserve the approved v0.1/Create visual language.
- Post-run direct Supabase verification found `0` `media_upload_sessions` rows and `0` uploaded `media_assets` rows, confirming no integration fixture remained.

**PR #9 is functionally and visually ready for merge once the final documentation-head checks are green and GitHub still reports the PR mergeable.**

## R2 Production-Origin Deployment Prerequisite
The shared R2 bucket currently allows browser PUT from `https://studio.faresuniform.uk` but rejects the current localhost and RenderLab Vercel origins. Existing object credentials cannot manage bucket CORS, and no Cloudflare admin token is configured in RenderLab Actions.

The configured approval workflow therefore serves the local RenderLab build through a CI-only HTTPS loopback alias for `https://studio.faresuniform.uk`. No request is routed to or depends on the deployed Studio runtime; the alias only supplies an origin already authorized by the shared R2 policy so Chromium can exercise the real signed PUT against shared R2.

Before RenderLab is deployed for real users on a RenderLab production/preview origin, that exact origin must be added to the shared bucket CORS policy for `PUT` with `Content-Type`. `scripts/ensure-r2-browser-cors.mjs` can reconcile the managed rule when an appropriately scoped Cloudflare/R2 admin credential is available. This is a **deployment prerequisite**, not a reason to replace direct browser-to-R2 upload with a server proxy.

## Still Open in Phase 4
Persistent uploads do **not** complete broader Library organization/management work:
- search and broader history controls;
- favorites/collections;
- rename/delete/download/batch management.

The next recommended Phase 4 product slice is to define a RenderLab-owned **Library search contract** against durable `media_assets` before adding search UI. Do not infer collection/favorite/destructive-action schemas from Saga. The R2 production-origin CORS prerequisite remains separate infrastructure work before deployment.

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
