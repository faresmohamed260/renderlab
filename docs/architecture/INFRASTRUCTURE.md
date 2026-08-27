# Infrastructure

Records durable RenderLab infrastructure decisions and verified shared-resource state.

## Source of Truth
The `renderlab` repository is authoritative for RenderLab infrastructure intent/contracts. Saga/Studio resources may be reused deliberately, but RenderLab application code, schema, storage prefixes, orchestration and product APIs remain independently named and owned.

## Shared-Resource Decision
RenderLab reuses the existing Saga/Studio Supabase project, Cloudflare R2 resource and cloud-hosted ComfyUI/Modal worker fleet rather than creating parallel infrastructure.

Reuse does **not** mean reusing Saga application tables, Studio APIs or deployed Studio runtime as RenderLab product dependencies.

## Supabase
Approved shared project:
- Project: `AI Studio`
- Ref: `rashyleshocuvpgcooxy`
- API URL: `https://rashyleshocuvpgcooxy.supabase.co`
- Region: `eu-west-1`

Legacy `studio_*` tables remain separate and must not be renamed, repurposed or silently coupled.

### Applied RenderLab migrations
- `0001_generation_sources.sql` — temporary reference sources, RLS enabled.
- `0002_generation_jobs_media_assets.sql` — RenderLab jobs + durable media identity, RLS enabled.
- `0003_persistent_media_uploads.sql` — applied as `20260827031630 renderlab_persistent_media_uploads`; adds durable origin/name/size fields and server-owned `media_upload_sessions`, RLS enabled.

Do not reapply migration 0003. Search v0.1, Download v0.1 and Rename v0.1 add no database migration.

Service-role access remains server-only. Rename uses the existing `media_assets.display_name` column and a server-side product route; no browser Supabase credential is introduced.

## Cloudflare R2
RenderLab reuses shared R2. Credentials remain server/GitHub-secret configuration and must not be committed.

Storage namespaces:
- generated media: `renderlab/generations/YYYY/MM/...`;
- generated thumbnails: `renderlab/thumbnails/YYYY/MM/...`;
- persistent uploads: `renderlab/uploads/YYYY/MM/...`;
- temporary references use server-generated keys tied to opaque `generation_sources.id`.

Test workflows may use isolated `renderlab/*-fixtures/...` prefixes and must self-clean.

Browser-held R2 credentials are prohibited. Raw R2 storage keys and signed URLs are implementation details, never durable product identity.

### Persistent browser upload contract
```text
Library
  -> POST /api/media/uploads/upload-tickets
  -> media_upload_sessions pending + opaque upload ID
  -> short-lived signed R2 PUT
  -> browser direct PUT
  -> POST completion
  -> server HEAD verifies MIME + exact bytes
  -> create media_assets(origin=uploaded)
  -> complete session + media_asset_id
  -> Library / Viewer / Create reuse opaque media-asset ID
```

Initial persistent upload types: PNG/JPEG/WebP up to 25 MB. Human filenames preserve legitimate Unicode after path/control cleanup and length bounding. `media_assets.storage_key` is unique; completion is sequentially idempotent and recovers concurrent insert races.

### Browser upload CORS
Presigned browser PUT requires an exact-origin R2 bucket CORS rule.

The R2 access-key token behind `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` has Admin Read & Write capability. `scripts/ensure-r2-browser-cors.mjs` manages the `renderlab-browser-uploads` rule through the S3 API while preserving unrelated rules.

Managed origins:
- `http://127.0.0.1:3000`
- `http://localhost:3000`
- `https://renderlab-faresmohamed260-6733s-projects.vercel.app`
- `https://renderlab-git-main-faresmohamed260-6733s-projects.vercel.app`

Configured browser verification uses the local RenderLab origin directly and does not depend on the Studio runtime. `CLOUDFLARE_API_TOKEN` is an optional REST fallback only.

If a future public RenderLab origin changes, add that exact origin before direct browser upload use. Do not use broad wildcard CORS merely for convenience.

### Durable media read/download contract
Ordinary media presentation and user download both stay behind RenderLab product routes.

Ordinary content:
```text
GET /api/media/assets/:assetId/content
  -> reload durable media_assets row
  -> sign short-lived R2 GetObject
  -> 302 to ephemeral inline/read URL
```

Durable Download (UI-024):
```text
GET /api/media/assets/:assetId/download
  -> reload durable media_assets row
  -> derive safe product filename from durable metadata + MIME
  -> sign R2 GetObject with ResponseContentDisposition=attachment
  -> 302 private/no-store
  -> browser downloads directly from R2
```

The application server does **not** proxy the media bytes. The product route is stable; the signed R2 URL is short-lived and must not be stored/shared as durable identity.

Uploaded Download filenames preserve a sanitized Unicode basename and force canonical extension from verified `mime_type`. Generated files use deterministic `renderlab-<kind>-<id-prefix>.<ext>` names rather than prompts/storage keys. Content-Disposition includes an ASCII fallback plus RFC5987 UTF-8 `filename*`.

Configured Media Download run `33070792343` proved Cloudflare R2 honors the signed response-content-disposition override. Documentation-finalized Download runs `33071571971`, `33071572092`, `33071571998`, `33071571944`, `33071571912` passed; PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`. Post-merge main shell/reference-upload runs `33071764713` / `33071764748` passed.

Top-level Download navigation does not create a new browser-upload CORS requirement. Upload CORS remains governed by the exact-origin PUT rule above.

### Durable media Rename boundary
Rename (UI-025) is a Supabase metadata mutation, not a storage mutation:
```text
PATCH /api/media/assets/:assetId
  -> validate opaque durable asset ID
  -> normalize/validate bounded display name
  -> reload media_assets row server-side
  -> PATCH display_name only through service-role REST
  -> return public media asset
```

Infrastructure invariants:
- no R2 object is renamed, moved, copied or rewritten;
- `storage_key`, uploaded `original_filename`, MIME and generated provenance/prompt remain unchanged;
- Download filename behavior remains independent of Rename;
- Rename introduces no new R2 CORS origin or R2 credential requirement;
- no schema migration is required because `display_name` already belongs to durable `media_assets`.

Configured Media Rename Visual `33074480356` used real generated/uploaded R2-backed durable assets and Chromium. It verified bounded validation, Unicode/whitespace normalization, durable persistence, Search discovery, unchanged uploaded Download filename/bytes and preservation of original filename/storage/provenance. Direct cleanup verification found `0` Rename fixtures, `0` Download fixtures, `0` lifecycle-named assets and `0` upload sessions.

During PR #12 verification, two older leaked Library lifecycle assets surfaced with the same fixed human fixture name. Each failing run cleaned its own newly created upload correctly; the stale database rows were removed separately. One-off cleanup run `33075125636` deleted the first orphaned R2 object. One-off cleanup run `33076888858` deleted and then HEAD-verified absence of the second orphaned R2 object `renderlab/uploads/2026/08/dde3c1c0-d65e-498a-a4b1-78cc9cbd0264.png`. The temporary cleanup script/workflow was removed from the branch after each cleanup.

The configured Library lifecycle is now hardened at both orchestration and identity boundaries. `.github/workflows/library-lifecycle-visual.yml` uses `concurrency: renderlab-library-lifecycle-shared` with `cancel-in-progress: false` so shared mutable lifecycle windows do not overlap for workflow revisions that include the rule. Independently, `scripts/verify-library-lifecycle.mjs` locates the exact Library card by the durable `media-asset` ID returned by its own upload completion and separately asserts the expected display name. Same-name durable assets therefore cannot make the verifier ambiguous even if unrelated stale state exists.

## Generation Worker Fleet
RenderLab reuses existing ComfyUI/Modal workers while the **RenderLab server owns orchestration**. Public routing metadata lives in `src/server/generation/worker-fleet.ts`; credentials never belong there.

Reused ecosystems:
- FLUX.2 Klein 9B — primary + standby
- Qwen Image Edit 2511 — primary + standby
- REDGraft LTX 2.5 — primary + standby

Current default operations:
- Create Image → FLUX.2 Klein
- Edit Image → FLUX.2 Klein edit
- Create Video → REDGraft LTX 2.5
- Animate Image → REDGraft LTX 2.5

Qwen is audited but not the default user-facing image workflow.

### Native generation flow
```text
Create
  -> POST /api/generation/jobs
  -> validate product request
  -> create generation_jobs
  -> resolve opaque inputs
  -> server submits to compatible worker
  -> RenderLab polls assigned worker
  -> persist output to R2
  -> create media_assets
  -> job succeeds with output_asset_ids
  -> browser receives durable product result
```

Worker completion is not product completion. `succeeded` occurs only after durable R2 + `media_assets` persistence.

### Worker reassignment safety
Initial submission may try another worker only before a provider call ID is accepted. Once accepted, the job is pinned. Poll-time reassignment requires explicit safe evidence such as credit/budget exhaustion or explicit unavailable state. Generic 429/5xx/network ambiguity does not trigger automatic duplicate-prone resubmission. Failover history is persisted and bounded.

## Verified Native/Media Coverage
- Temporary reference upload — verified/self-cleaning.
- Create Image/Edit Image/Create Video/Animate Image — live verified.
- Durable generated continuation — `33027460976`.
- Complete Create browser lifecycle — `33031817744`.
- Generated Library/Viewer lifecycle — `33034606396`.
- Persistent Upload final pre-merge — `33067469518` + `33067469527`; PR #9 merged.
- Library Search configured lifecycle — `33069004204`; final docs head `33070046205`; PR #10 merged as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`; post-merge main `33070215358` passed.
- Media Download configured lifecycle — `33070792343`; final documentation-head gates passed before PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`.
- Media Rename configured lifecycle — `33074480356`; refined-head UI Shell `33074480462`, Search `33074480419`, Upload Integration `33074480288`, Download `33074480319`, and Library Lifecycle `33074480489` on rerun all passed.

Search/upload/download/rename configured verifiers do not invoke ComfyUI.

## Studio Compatibility Boundary
`src/server/generation/studio-compat.ts` is transitional migration/debugging compatibility only, not the preferred production path.

Product generation priority:
1. intentionally configured external RenderLab backend;
2. RenderLab-native orchestration when shared Supabase/R2 credentials are configured;
3. Studio compatibility only when explicitly configured as fallback.

Do not make deployed Studio runtime a RenderLab product dependency. Remove the adapter when no migration/debugging workflow requires it.

## Temporary Reference Upload Flow
```text
Create
  -> reference upload ticket
  -> generation_sources pending + signed R2 PUT
  -> browser direct PUT
  -> reference completion
  -> server HEAD verification
  -> generation_sources ready
  -> generation binds opaque source ID
```

`generation_sources` is temporary input state, never durable Library upload identity.

## Media Delivery Boundary
Product media APIs:
- `GET /api/media/assets`
- `GET /api/media/assets/:assetId`
- `PATCH /api/media/assets/:assetId` — current bounded UI-025 display-name Rename mutation
- `GET /api/media/assets/:assetId/content`
- `GET /api/media/assets/:assetId/thumbnail`
- `GET /api/media/assets/:assetId/download`

Generated/uploaded durable media share one public contract and can become generation input through `{ type: "media-asset", id }`. Viewer → Create carries opaque identity + action intent; the server revalidates durable media/capability state.

## Required Server / CI Environment Variables
### Supabase
- `SUPABASE_URL` = `https://rashyleshocuvpgcooxy.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — secret, server only

### R2
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

R2 credentials currently require Admin Read & Write because configured browser upload verification reconciles bucket CORS.

### Optional
- `CLOUDFLARE_API_TOKEN` — REST CORS fallback
- `RENDERLAB_GENERATION_BACKEND_URL` — optional external RenderLab generation service
- `RENDERLAB_STUDIO_COMPAT_URL` — transitional compatibility only

## Security Rules
- Never commit service-role/R2/provider credentials.
- Never expose server credentials through `NEXT_PUBLIC_*`.
- Keep RLS enabled on RenderLab tables.
- Direct browser uploads use short-lived signed URLs + exact-origin CORS.
- Durable reads/downloads use short-lived signed R2 GETs behind opaque product routes.
- Rename uses a server-side service-role metadata mutation and never exposes Supabase credentials to the browser.
- Do not persist/expose raw signed URLs as product links.
- Worker/provider routing remains server-owned.
- Shared resources do not authorize legacy Saga mutation/coupling.
- URL continuation parameters are untrusted intent; durable asset/capability state is revalidated server-side.

## CI / Integration Validation
Ordinary UI CI runs without production secrets and validates truthful unavailable states. Configured workflows use GitHub Secrets and self-clean shared production fixtures.

Key workflows:
- `verify-create-lifecycle.mjs` + `create-lifecycle-visual.yml`
- `verify-media-upload.mjs` + `media-upload-integration.yml`
- `verify-library-lifecycle.mjs` + `library-lifecycle-visual.yml` — shared-resource lifecycle is serialized and exact durable fixture identity is used for browser targeting
- `verify-library-search.mjs` + `library-search-visual.yml`
- `verify-media-download.mjs` + `media-download-visual.yml`
- `verify-media-rename.mjs` + `media-rename-visual.yml`
- `ensure-r2-browser-cors.mjs` for idempotent exact-origin upload-CORS reconciliation

## Next Infrastructure Work
1. Add any future public upload origin explicitly to R2 CORS before deployment/use.
2. Remove transitional Studio compatibility when no migration/debugging need remains.
3. Keep Library/Activity against RenderLab-owned `media_assets`/`generation_jobs`, never legacy `studio_*`.
4. Preserve conservative duplicate-avoidance if worker routing evolves.
