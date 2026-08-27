# Infrastructure

This document records durable RenderLab infrastructure decisions and verified shared-resource state.

## Source of Truth
The `renderlab` repository is authoritative for RenderLab infrastructure intent/contracts. Saga/Studio infrastructure may be reused deliberately, but RenderLab application code, schema, storage prefixes, orchestration and product APIs remain independently named and owned.

## Shared-Resource Decision
RenderLab reuses the existing Saga/Studio Supabase project, Cloudflare R2 resource, and cloud-hosted ComfyUI/Modal worker fleet rather than creating parallel infrastructure.

Reuse does **not** mean reusing Saga application tables, Studio APIs, or the deployed Studio runtime as RenderLab product dependencies.

## Supabase
Approved shared project:
- Project: `AI Studio`
- Ref: `rashyleshocuvpgcooxy`
- API URL: `https://rashyleshocuvpgcooxy.supabase.co`
- Region: `eu-west-1`

Legacy `studio_*` tables remain present and separate. RenderLab must not rename, repurpose, or silently depend on them.

### Applied RenderLab migrations
`0001_generation_sources.sql` creates `public.generation_sources` with RLS enabled for temporary reference sources.

`0002_generation_jobs_media_assets.sql` creates `public.generation_jobs` and `public.media_assets`, both with RLS enabled. `generation_jobs` owns asynchronous product/runtime state; `media_assets` owns durable media identity and R2 metadata.

Neither migration modifies legacy `studio_*` tables.

## Cloudflare R2
RenderLab reuses the existing Saga/Studio R2 resource. Credentials remain server/GitHub-secret configuration and must not be committed.

RenderLab generated media uses the `renderlab/` namespace, including `renderlab/generations/YYYY/MM/...` and `renderlab/thumbnails/YYYY/MM/...`. Temporary references use server-generated keys but are addressed by opaque `generation_sources.id` in product requests.

Browser-held R2 credentials are prohibited. Direct browser uploads use short-lived signed PUT URLs. Raw R2 keys remain internal implementation metadata.

## Generation Worker Fleet
RenderLab reuses the existing ComfyUI/Modal workers while the **RenderLab server owns orchestration**.

Public routing metadata lives in `src/server/generation/worker-fleet.ts`; no account credentials belong there.

Reused ecosystems:
- FLUX.2 Klein 9B — primary + standby
- Qwen Image Edit 2511 — primary + standby
- REDGraft LTX 2.5 — primary + standby

Current default operation resolution:
- Create Image → FLUX.2 Klein image generation
- Edit Image → FLUX.2 Klein image edit
- Create Video → REDGraft LTX 2.5
- Animate Image → REDGraft LTX 2.5

Qwen remains an audited capability but is not the default user-facing image workflow at this stage.

### Native generation flow
```text
Create UI
  -> POST /api/generation/jobs
  -> validate normalized product request
  -> create public.generation_jobs
  -> resolve opaque source/media inputs
  -> server submits directly to compatible worker fleet
  -> primary/standby submission routing
  -> GET /api/generation/jobs/:jobId polls RenderLab
  -> server polls assigned worker and updates real state
  -> persisting
  -> write output to shared R2
  -> create public.media_assets
  -> generation_jobs succeeds with output_asset_ids
  -> browser receives persisted product result
```

Worker completion is not product completion. `succeeded` occurs only after durable R2 + `media_assets` persistence.

### Verified native coverage
- Reference upload → **verified**, self-cleaning.
- Create Image → **verified end-to-end**, including real worker execution, persistence, asset verification, and cleanup.
- Edit Image with reference → **verified end-to-end** in GitHub Actions run `33021843503`, commit `f374d711f99b2a68c0e7ea43cbce42052380b0cb`.
- Create Video → **verified end-to-end** in GitHub Actions run `33021977765`, commit `638e312fdbbf5aa126faa9d2a91dbca68b026d48`.
- Animate Image with reference → **verified end-to-end in the same run `33021977765`**. The workflow's `Verify Create Video and Animate Image` step completed successfully, validated the persisted video asset through RenderLab product APIs, and self-cleaned the job/media/reference fixtures.

All four initial Create operations now have native live-infrastructure integration coverage.

## Studio Compatibility Boundary
A temporary isolated compatibility adapter exists at `src/server/generation/studio-compat.ts` for migration/debugging only. It is not the preferred production path.

The product API prioritizes:
1. explicitly configured external RenderLab backend via `RENDERLAB_GENERATION_BACKEND_URL` if intentionally used;
2. RenderLab-native orchestration when shared Supabase/R2 credentials are configured;
3. Studio compatibility only when explicitly configured as fallback.

The deployed Studio runtime at `studio.faresuniform.uk` was found during integration work to have stale/incorrect R2 credentials (`SignatureDoesNotMatch`). RenderLab's own shared R2 credentials were independently verified. This reinforces that deployed Studio must not become a production dependency.

Remove the compatibility path once native operational hardening is sufficient and no remaining migration/debugging need depends on it.

## Reference Upload Flow
```text
Create UI
  -> POST /api/assets/reference/upload-tickets
  -> pending generation_sources row + signed R2 PUT
  -> browser uploads directly to R2
  -> POST /api/assets/reference/upload-completions
  -> server HEAD-verifies MIME + size
  -> generation_sources ready
  -> generation binds opaque source ID
```

`scripts/verify-reference-upload.mjs` verifies the real shared-resource path and removes its R2/Supabase fixture afterward.

## Media Delivery Boundary
RenderLab exposes media through product APIs rather than raw R2 keys:
- `GET /api/media/assets/:assetId`
- `GET /api/media/assets/:assetId/content`
- `GET /api/media/assets/:assetId/thumbnail`

Content/thumbnail endpoints issue short-lived signed R2 redirects server-side.

## Required Server Environment Variables
### Supabase
- `SUPABASE_URL` = `https://rashyleshocuvpgcooxy.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — secret, server only

### Cloudflare R2
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

### Optional external RenderLab generation service
- `RENDERLAB_GENERATION_BACKEND_URL`

### Transitional compatibility only
- `RENDERLAB_STUDIO_COMPAT_URL`

## Security Rules
- Never commit Supabase service-role keys, R2 access keys, or provider credentials.
- Never expose server credentials through `NEXT_PUBLIC_*`.
- Keep RLS enabled on RenderLab tables.
- Direct browser uploads use short-lived signed URLs.
- Worker/provider routing remains server-owned operational state.
- Shared resources do not authorize mutation of legacy Saga tables/contracts without an explicit decision.

## CI / Integration Validation
Default GitHub UI CI intentionally runs without production infrastructure secrets and validates truthful unavailable states.

Configured integration workflows run automatically on relevant `main` pushes and may also support manual dispatch. Current integration coverage includes reference upload plus all four initial native Create operations: Create Image, Edit Image, Create Video and Animate Image. Integration fixtures self-clean rather than pollute shared production resources.

Required GitHub secrets:
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

## Next Infrastructure Work
1. Finish bounded client polling recovery for transient status/network failures.
2. Reintroduce safe poll-time worker reassignment only with strong evidence that no worker accepted/executed the job; avoid duplicate generations.
3. Remove the Studio compatibility adapter after operational hardening and migration/debugging dependence are sufficiently reduced.
4. Keep Library/Activity built against RenderLab-owned `media_assets` and `generation_jobs`, never legacy `studio_*` tables.
