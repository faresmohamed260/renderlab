# Infrastructure

This document records durable RenderLab infrastructure decisions and verified shared-resource state.

## Source of Truth
The `renderlab` repository is authoritative for RenderLab infrastructure intent/contracts. Saga/Studio infrastructure may be reused deliberately, but RenderLab application code, schema, storage prefixes, orchestration and product APIs remain independently named and owned.

## Shared-Resource Decision
RenderLab reuses the existing Saga/Studio Supabase project, Cloudflare R2 resource and cloud-hosted ComfyUI/Modal worker fleet rather than creating parallel infrastructure.

Reuse does **not** mean reusing Saga application tables, Studio APIs or the deployed Studio runtime as RenderLab product dependencies.

## Supabase
Approved shared project:
- Project: `AI Studio`
- Ref: `rashyleshocuvpgcooxy`
- API URL: `https://rashyleshocuvpgcooxy.supabase.co`
- Region: `eu-west-1`

Legacy `studio_*` tables remain present and separate. RenderLab must not rename, repurpose or silently depend on them.

### Applied RenderLab migrations
- `0001_generation_sources.sql` — creates `public.generation_sources` with RLS enabled for temporary reference sources.
- `0002_generation_jobs_media_assets.sql` — creates `public.generation_jobs` and `public.media_assets`, both with RLS enabled. Jobs own asynchronous product/runtime state; media assets own durable media identity and R2 metadata.
- `0003_persistent_media_uploads.sql` — applied as Supabase migration version `20260827031630` / `renderlab_persistent_media_uploads`. It extends `media_assets` with `origin` (default `generated`), `original_filename`, `display_name` and `size_bytes`, and creates server-owned `media_upload_sessions` with RLS enabled.

Migration 0003 has already been applied to the shared project. Do **not** reapply it.

Direct verification on 2026-08-27 confirmed:
- `media_assets` RLS enabled;
- `media_upload_sessions` RLS enabled;
- the four new `media_assets` columns exist;
- `origin` defaults to `generated` for backward compatibility;
- no persistent-upload integration fixture remained after verification.

The Supabase security advisor reports the expected informational “RLS enabled, no public policy” state for these server-owned tables. Service-role access remains server-only.

## Cloudflare R2
RenderLab reuses the existing Saga/Studio R2 resource. Credentials remain server/GitHub-secret configuration and must not be committed.

Storage namespaces:
- generated media: `renderlab/generations/YYYY/MM/...`;
- generated thumbnails: `renderlab/thumbnails/YYYY/MM/...`;
- persistent uploads: `renderlab/uploads/YYYY/MM/...`;
- temporary references use server-generated keys associated with opaque `generation_sources.id`.

Browser-held R2 credentials are prohibited. Raw R2 storage keys are internal metadata, never product identity.

### Persistent browser upload contract
```text
Library
  -> POST /api/media/uploads/upload-tickets
  -> pending media_upload_sessions row + opaque upload ID
  -> short-lived signed R2 PUT
  -> browser uploads directly to R2
  -> POST /api/media/uploads/upload-completions
  -> server HEAD-verifies MIME + exact byte size
  -> create ordinary media_assets row with origin=uploaded
  -> mark upload session completed + link media_asset_id
  -> Library / Viewer / Create reuse the ordinary media-asset ID
```

Initial persistent upload types are PNG, JPEG and WebP up to 25 MB.

The server-generated R2 key is opaque and independent of the human filename. `original_filename` therefore preserves legitimate Unicode/non-ASCII text while removing control characters/path semantics and enforcing a reasonable length bound.

`media_assets.storage_key` remains unique. Concurrent completion requests recover to an already-created asset when another request wins that unique insert, while repeated completion after success returns the same durable asset.

### Browser CORS requirement and current blocker
Presigned browser PUT still requires an R2 bucket CORS policy for the requesting browser origin.

Current RenderLab object credentials are sufficient for object PUT/HEAD/DELETE but are **not** authorized for bucket CORS management: `GetBucketCors` returned `403 AccessDenied` in GitHub Actions. `CLOUDFLARE_API_TOKEN` is not currently configured.

`scripts/ensure-r2-browser-cors.mjs` is an optional idempotent management helper. When an appropriately scoped Cloudflare/R2 admin credential is available it preserves unrelated rules and manages the `renderlab-browser-uploads` rule. CI does not require retaining an admin credential: `.github/workflows/library-lifecycle-visual.yml` skips the management step when `CLOUDFLARE_API_TOKEN` is absent and lets the actual Chromium upload prove whether bucket CORS is correct.

For the GitHub-hosted configured browser verifier the narrow test origins are:
- `http://127.0.0.1:3000`
- `http://localhost:3000`

The rule permits `PUT` with `Content-Type` and may expose `ETag`. Production browser origins must be explicitly included when production browser upload is enabled; do not use a broad wildcard merely to make tests pass.

Browser lifecycle run `33037773015` proved the current shared bucket is not browser-ready: the actual Library Upload control created a ticket, but Chromium could not complete the signed R2 PUT and never reached the completion endpoint. The test timed out, self-cleaned its upload-session fixture and produced no approval screenshots. Do not merge PR #9 or bypass browser security until this infrastructure prerequisite is resolved.

## Generation Worker Fleet
RenderLab reuses the existing ComfyUI/Modal workers while the **RenderLab server owns orchestration**.

Public routing metadata lives in `src/server/generation/worker-fleet.ts`; credentials never belong there.

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
  -> create generation_jobs
  -> resolve opaque temporary-source/media-asset inputs
  -> server submits directly to compatible worker fleet
  -> GET /api/generation/jobs/:jobId polls RenderLab
  -> server polls assigned worker and updates real state
  -> persisting
  -> write output to shared R2
  -> create media_assets
  -> generation_jobs succeeds with output_asset_ids
  -> browser receives persisted product result
```

Worker completion is not product completion. `succeeded` occurs only after durable R2 + `media_assets` persistence.

### Worker reassignment safety
Initial submission may try another compatible worker when a worker clearly rejects/is unavailable before a provider call ID is accepted. Once accepted, the provider job is pinned to its assigned worker.

Poll-time automatic reassignment requires explicit safe evidence such as credit/budget/quota exhaustion or an explicit worker-unavailable state. Generic 429, generic 5xx and network/fetch ambiguity do not trigger automatic resubmission because the original worker may already have accepted/executed the request. Failover history is persisted and bounded.

PR #5 implemented this rule; post-merge live generation regression run `33027861292` succeeded.

## Verified Native Coverage
- Reference upload → verified, self-cleaning.
- Create Image → verified end-to-end with real worker execution and persistence.
- Edit Image with reference → run `33021843503`.
- Create Video → run `33021977765`.
- Animate Image with reference → run `33021977765`.
- Durable generated media continuation → run `33027460976`.
- Configured complete Create browser lifecycle → run `33031817744`.
- Configured Library/Viewer generated-media lifecycle → run `33034606396`.
- Persistent media backend integration → original run `33035954398`; hardened run `33037773016` including concurrent completion recovery, sequential idempotency, Unicode filename preservation, ordinary media API visibility/content and cleanup.
- Persistent media browser lifecycle → **not yet approved**; run `33037773015` is blocked at direct browser R2 PUT by bucket CORS.

The persistent media verifier does not invoke ComfyUI or spend a generation.

## Studio Compatibility Boundary
A temporary isolated compatibility adapter exists at `src/server/generation/studio-compat.ts` for migration/debugging only. It is not the preferred production path.

The product API prioritizes:
1. explicitly configured external RenderLab backend if intentionally used;
2. RenderLab-native orchestration when shared Supabase/R2 credentials are configured;
3. Studio compatibility only when explicitly configured as fallback.

The deployed Studio runtime previously showed stale/incorrect R2 credentials while RenderLab's own shared R2 credentials were independently verified. Do not make the deployed Studio runtime a RenderLab product dependency.

Remove the compatibility path once no current migration/debugging workflow still requires it.

## Temporary Reference Upload Flow
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

`generation_sources` is temporary generation-input state. It must not be exposed or reinterpreted as durable Library uploaded media.

## Media Delivery Boundary
RenderLab exposes media through product APIs rather than raw R2 identity:
- `GET /api/media/assets`
- `GET /api/media/assets/:assetId`
- `GET /api/media/assets/:assetId/content`
- `GET /api/media/assets/:assetId/thumbnail`

Generated and uploaded durable media use the same public media contract. Durable media can become generation input via `{ type: "media-asset", id }`; the server resolves that product identity to private storage.

Viewer → Create continuation carries only opaque asset identity plus action intent. The Create server route reloads the durable asset and validates capability compatibility before initializing workspace state.

## Required Server / CI Environment Variables
### Supabase
- `SUPABASE_URL` = `https://rashyleshocuvpgcooxy.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — secret, server only

### Cloudflare R2 object access
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

### Optional bucket-CORS management
- `CLOUDFLARE_API_TOKEN` — optional; requires appropriate R2 bucket configuration permission. Do not expose to browser code.

### Optional external RenderLab generation service
- `RENDERLAB_GENERATION_BACKEND_URL`

### Transitional compatibility only
- `RENDERLAB_STUDIO_COMPAT_URL`

## Security Rules
- Never commit Supabase service-role keys, R2 access keys or provider credentials.
- Never expose server credentials through `NEXT_PUBLIC_*`.
- Keep RLS enabled on RenderLab tables.
- Direct browser uploads use short-lived signed URLs and require origin-restricted bucket CORS.
- Worker/provider routing remains server-owned operational state.
- Shared resources do not authorize mutation of legacy Saga contracts without an explicit decision.
- Raw R2 keys and worker IDs are internal implementation metadata.
- URL continuation parameters are untrusted navigation intent; durable asset/capability are revalidated server-side.

## CI / Integration Validation
Ordinary GitHub UI CI runs without production infrastructure secrets and validates truthful unavailable states.

Configured workflows use GitHub Secrets and keep production credentials out of browser/client code. Integration fixtures self-clean shared production resources.

Key workflows:
- `scripts/verify-create-lifecycle.mjs` + `.github/workflows/create-lifecycle-visual.yml` — real generation browser lifecycle.
- `scripts/verify-media-upload.mjs` + `.github/workflows/persistent-media-upload-integration.yml` — server/API persistent upload contract without ComfyUI.
- `scripts/verify-library-lifecycle.mjs` + `.github/workflows/library-lifecycle-visual.yml` — actual browser persistent Upload → Library → Viewer → Create continuation, no ComfyUI.
- `scripts/ensure-r2-browser-cors.mjs` — optional CORS reconciliation when admin permission is available.

## Next Infrastructure Work
1. Establish the shared R2 browser CORS policy required by persistent direct uploads, then rerun and inspect the configured browser lifecycle before PR #9 can merge.
2. After a successful browser run, confirm R2 + `media_assets` + `media_upload_sessions` fixtures are clean and record the approval run in source-of-truth docs.
3. Remove the transitional Studio compatibility adapter when no migration/debugging need depends on it.
4. Keep Library/Activity built against RenderLab-owned `media_assets` and `generation_jobs`, never legacy `studio_*` tables.
5. Preserve the conservative duplicate-avoidance rule if worker routing evolves.
