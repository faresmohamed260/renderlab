# Infrastructure

This document records the durable RenderLab infrastructure decisions and verified shared-resource state.

## Source of Truth
The `renderlab` repository is authoritative for RenderLab infrastructure intent and contracts. Existing Saga/Studio infrastructure resources may be reused deliberately, but RenderLab application code, schema, storage prefixes, and product contracts remain independently named and owned.

## Shared-Resource Decision
**Decision:** RenderLab reuses the existing Saga/Studio Supabase project, Cloudflare R2 resource, and existing cloud-hosted ComfyUI/Modal worker fleet rather than creating parallel infrastructure.

Reuse does **not** mean reusing Saga application tables, Studio APIs, or deployed Studio runtime as RenderLab product dependencies. RenderLab owns its own tables, storage prefixes, API contracts, job lifecycle, and media records.

## Supabase
Approved shared project:
- Project name: `AI Studio`
- Project ref: `rashyleshocuvpgcooxy`
- API URL: `https://rashyleshocuvpgcooxy.supabase.co`
- Region: `eu-west-1`

Existing legacy tables remain present:
- `studio_generations`
- `studio_uploads`
- `studio_collections`
- `studio_collection_items`

RenderLab must not rename, repurpose, or silently depend on those legacy tables unless a later explicit migration decision says otherwise.

### Applied RenderLab migrations

#### `0001_generation_sources.sql`
Applied as `renderlab_generation_sources`.

Creates:
- `public.generation_sources`
- RLS enabled

Purpose: server-owned temporary reference sources addressed by opaque UUIDs and backed by R2 objects.

#### `0002_generation_jobs_media_assets.sql`
Applied as `renderlab_generation_jobs_media_assets`.

Creates:
- `public.generation_jobs`
- `public.media_assets`
- RLS enabled on both tables

`generation_jobs` is the RenderLab-owned asynchronous job record. It stores product operation/status plus server-only worker/runtime routing metadata.

`media_assets` is the RenderLab-owned durable media record. It references generated media in R2 while keeping storage keys out of browser/product identities.

Neither migration modifies the existing `studio_*` tables.

## Cloudflare R2
RenderLab reuses the existing Saga/Studio R2 resource. Account/bucket credentials remain environment configuration and must not be committed.

RenderLab-owned generated media uses the `renderlab/` namespace, including:
- `renderlab/generations/YYYY/MM/...`
- `renderlab/thumbnails/YYYY/MM/...`

Temporary generation references use server-generated source keys and are addressed in product requests only by their opaque `generation_sources.id` values.

Browser-held R2 credentials are prohibited. Direct browser uploads use short-lived signed PUT URLs. Server-side reads/writes may use short-lived signed URLs generated with server credentials.

## Generation Worker Fleet
RenderLab reuses the existing cloud-hosted ComfyUI/Modal workers, but the **RenderLab server layer now owns orchestration**.

Public routing metadata is recorded in `src/server/generation/worker-fleet.ts`. This registry contains worker IDs, ecosystems, public gateway URLs, display names, and primary/standby role only. It contains no account credentials.

Current reused ecosystems:
- FLUX.2 Klein 9B — primary + standby
- Qwen Image Edit 2511 — primary + standby
- REDGraft LTX 2.5 — primary + standby

RenderLab currently resolves its default production operations to:
- Create Image → FLUX.2 Klein image-generation workflow
- Edit Image → FLUX.2 Klein image-edit workflow
- Create Video → REDGraft LTX 2.5
- Animate Image → REDGraft LTX 2.5

Qwen is available as an audited capability but is not the default user-facing image workflow at this stage.

### Native generation flow

```text
Create UI
  -> POST /api/generation/jobs
  -> RenderLab validates normalized product request
  -> RenderLab creates public.generation_jobs
  -> RenderLab resolves reference/media inputs
  -> RenderLab server submits directly to compatible worker fleet
  -> primary/standby submission routing
  -> GET /api/generation/jobs/:jobId polls RenderLab
  -> RenderLab server polls assigned worker
  -> real worker state updates generation_jobs
  -> result enters persisting state
  -> RenderLab writes output to shared R2
  -> RenderLab creates public.media_assets
  -> generation_jobs becomes succeeded with output_asset_ids
  -> browser receives persisted product result
```

A worker returning bytes is not product completion. The job becomes `succeeded` only after a durable `media_assets` record and R2 object exist.

## Studio Compatibility Boundary
A temporary isolated compatibility adapter exists in `src/server/generation/studio-compat.ts` for migration/debugging purposes.

It is **not** the preferred RenderLab generation path. The production product API prioritizes:
1. an explicitly configured future external RenderLab backend via `RENDERLAB_GENERATION_BACKEND_URL`;
2. RenderLab-native orchestration when shared Supabase/R2 credentials are configured;
3. Studio compatibility only as a fallback when explicitly configured.

During integration work, the deployed Studio runtime at `studio.faresuniform.uk` was found to have stale/incorrect R2 credentials and returned `SignatureDoesNotMatch` when reading a shared source object. This confirmed that the deployed Studio runtime should not be a production dependency of RenderLab. RenderLab's own shared R2 credentials were independently verified as valid.

Once native RenderLab generation is fully verified across required operations, the Studio compatibility path should be removed rather than maintained as a second production architecture.

## Reference Upload Flow
Verified application contract:

```text
Create UI
  -> POST /api/assets/reference/upload-tickets
  -> server creates generation_sources pending record + signed R2 PUT
  -> browser PUTs file directly to R2
  -> POST /api/assets/reference/upload-completions
  -> server HEAD-verifies object MIME type + size
  -> generation_sources becomes ready
  -> browser binds generation by opaque source ID
```

The real shared-resource integration has passed end-to-end. `scripts/verify-reference-upload.mjs` is self-cleaning and removes its R2 object and Supabase fixture after verification.

## Media Delivery Boundary
RenderLab exposes media through product APIs rather than R2 keys:
- `GET /api/media/assets/:assetId`
- `GET /api/media/assets/:assetId/content`
- `GET /api/media/assets/:assetId/thumbnail`

Content/thumbnail endpoints issue short-lived signed R2 redirects server-side. Raw R2 storage keys remain internal metadata.

## Required Server Environment Variables
### Supabase
- `SUPABASE_URL`
  - approved value: `https://rashyleshocuvpgcooxy.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`
  - secret; server-side only

### Cloudflare R2
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

### Optional external RenderLab generation service
- `RENDERLAB_GENERATION_BACKEND_URL`
  - optional override for a future dedicated backend service
  - browser code does not use this value directly

### Transitional compatibility only
- `RENDERLAB_STUDIO_COMPAT_URL`
  - temporary fallback/debug bridge
  - not required for RenderLab-native generation
  - remove when native generation verification is complete

## Security Rules
- Never commit Supabase service-role keys, R2 access keys, or provider credentials.
- Server credentials must never be exposed through `NEXT_PUBLIC_*` variables.
- RLS remains enabled on RenderLab tables even while current application access is server-owned.
- Direct browser uploads use short-lived signed URLs rather than browser-held R2 credentials.
- Worker/provider routing metadata remains server-side operational state.
- Existing shared resources do not authorize RenderLab to mutate legacy Saga tables/contracts without an explicit repository decision.

## CI / Integration Validation
Default GitHub UI CI intentionally runs without production infrastructure secrets and validates truthful unavailable states.

Configured integration workflows run automatically on relevant `main` pushes and may also support manual dispatch:
- `.github/workflows/reference-upload-integration.yml`
- `.github/workflows/generation-bridge-integration.yml` (name is historical; it is being transitioned to native RenderLab generation verification)

Required GitHub secrets:
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

Reference integration is verified and self-cleaning.

Native generation integration is currently being verified against the live worker fleet. Do not mark native generation fully verified until the configured workflow completes a real worker generation, persists a RenderLab `media_assets` record/R2 object, verifies it through RenderLab state, and cleans its fixture.

## Next Infrastructure Work
1. Complete and record the native text-to-image generation/persistence integration.
2. Verify reference-driven Edit through the native RenderLab path.
3. Verify text-to-video and Animate through the native RenderLab path.
4. Reintroduce proven safe poll-time worker reassignment rules without risking duplicate accepted generations.
5. Remove the transitional Studio compatibility adapter after native coverage is sufficient.
6. Keep Library/Activity built against RenderLab-owned `media_assets` and `generation_jobs`, not legacy `studio_*` tables.
