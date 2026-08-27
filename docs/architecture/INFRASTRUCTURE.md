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
  -> resolve opaque temporary-source/media-asset inputs
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

### Submission routing
Initial submission may try another compatible worker when a worker clearly rejects/is unavailable before a provider call ID is accepted. The accepted provider job is then pinned to its assigned worker.

### Poll-time reassignment safety
RenderLab carries forward the proven Saga safety distinction rather than treating every worker error as failover-safe.

Safe automatic reassignment requires explicit evidence such as:
- credit/budget/quota exhaustion;
- explicit worker state/code indicating unavailable;
- explicit disabled/stopped workspace evidence.

Automatic poll-time reassignment is **not** allowed for ambiguous conditions such as:
- generic HTTP 429;
- generic 5xx;
- network/fetch failure.

Those ambiguous failures may occur after the worker already accepted/executed the job. Resubmitting would risk duplicate generations. Instead, the API returns a transient unavailable response and Create's bounded polling recovery retries status checks against the same job.

Poll reassignment attempts are persisted in `failover_history` and limited to three. An ambiguous standby submission is not automatically repeated.

PR #5 implemented this rule. Its production build/Playwright checks passed, and post-merge live generation regression run `33027861292` completed successfully.

### Verified native coverage
- Reference upload → **verified**, self-cleaning.
- Create Image → **verified end-to-end**, including real worker execution, persistence, asset verification, and cleanup.
- Edit Image with reference → **verified end-to-end** in GitHub Actions run `33021843503`.
- Create Video → **verified end-to-end** in GitHub Actions run `33021977765`.
- Animate Image with reference → **verified end-to-end** in the same run `33021977765`.
- Durable media continuation → **verified end-to-end** in run `33027460976`: a persisted Create Image `media_assets` result was loaded from shared R2 by opaque product identity and used as the next Edit Image input; both generation fixtures were cleaned afterward.
- Post-hardening regression → **verified** in run `33027861292` after conservative poll-time reassignment was merged.
- Configured browser lifecycle → **verified** in run `33031817744`: one real Create Image request was submitted from the rendered Create UI, reached durable persistence, rendered through the product media API, exposed Edit/Animate, transitioned into Edit from the durable asset at desktop/mobile widths, and removed its generated R2/media/job fixture afterward.

All four initial Create operations plus durable image continuation and the complete browser-visible Create lifecycle now have live shared-infrastructure coverage.

## Studio Compatibility Boundary
A temporary isolated compatibility adapter exists at `src/server/generation/studio-compat.ts` for migration/debugging only. It is not the preferred production path.

The product API prioritizes:
1. explicitly configured external RenderLab backend via `RENDERLAB_GENERATION_BACKEND_URL` if intentionally used;
2. RenderLab-native orchestration when shared Supabase/R2 credentials are configured;
3. Studio compatibility only when explicitly configured as fallback.

The deployed Studio runtime at `studio.faresuniform.uk` was found during integration work to have stale/incorrect R2 credentials (`SignatureDoesNotMatch`). RenderLab's own shared R2 credentials were independently verified. This reinforces that deployed Studio must not become a production dependency.

Remove the compatibility path once no current migration/debugging workflow still requires it. Do not route new product behavior through Studio merely because the adapter exists.

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

Durable media assets can also become generation inputs via `{ type: "media-asset", id }`; the server resolves that product ID to the private R2 object. The browser never needs the underlying storage key.

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
- Raw R2 keys and worker IDs are internal implementation metadata, not browser product identities.

## CI / Integration Validation
Default GitHub UI CI intentionally runs without production infrastructure secrets and validates truthful unavailable states.

Configured integration workflows use the existing server-side GitHub Secrets and keep production credentials out of browser/client code. Current integration coverage includes:
- signed reference upload;
- Create Image;
- Edit Image;
- Create Video;
- Animate Image;
- persisted `media-asset` → Edit continuation;
- browser-driven Create result/continuation rendering at desktop/mobile widths.

Integration fixtures self-clean rather than pollute shared production resources.

### Configured Create visual lifecycle
`scripts/verify-create-lifecycle.mjs` and `.github/workflows/create-lifecycle-visual.yml` provide the repeatable visual lifecycle check used for final Create approval. It uses one real generation, captures four screenshots, then deletes its generated R2 object and associated RenderLab media/job rows. The workflow is separate from ordinary credential-free UI CI and can also be manually dispatched when future Create changes justify a configured regression review.

Approval run: `33031817744`.

Required GitHub secrets:
- `SUPABASE_SERVICE_ROLE_KEY`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

## Next Infrastructure Work
1. Remove the transitional Studio compatibility adapter once no migration/debugging need depends on it.
2. Keep Library/Activity built against RenderLab-owned `media_assets` and `generation_jobs`, never legacy `studio_*` tables.
3. Preserve the conservative duplicate-avoidance rule if worker APIs/routing evolve; do not broaden safe reassignment to generic network/5xx errors without stronger execution evidence.
