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
- `0004_core_account_ownership_prepare.sql` — applied as `20260827203604 renderlab_core_account_ownership_prepare`; adds nullable `owner_id -> auth.users.id` with `ON DELETE RESTRICT` to generation sources/jobs, media assets and upload sessions, adds owner-time indexes, and revokes direct raw-table privileges from `anon` / `authenticated` while keeping RLS enabled.

`0005_core_account_ownership_enforce.sql` is committed on draft PR #17 but is **not applied**. It is the tightening step that refuses unowned rows, makes all four owners `NOT NULL`, makes `owner_id` immutable, and enforces same-owner links for generated media → generation job and upload session → promoted media asset. The staged migration was corrected at `7f0b74887ec8bb84a3fb17c4542d83f0ddc8177e` after rollback-only semantic testing exposed that one shared polymorphic trigger function could reference a field unavailable on `media_assets`; the corrected migration uses separate media→job and upload→asset owner-link trigger functions.

Do not reapply migrations 0003 or 0004. Do not apply corrected 0005 before the owner-aware application code is safely live and the configured ownership suite can execute again; tightening the shared schema first could break the currently deployed writer.

Service-role access remains server-only. UI-029 added public Supabase Auth client configuration only. UI-030 / PR #17 is the in-progress ownership slice that threads the verified account principal through server product routes and persistence while keeping the raw core tables server-owned.

### Account identity boundary — UI-029
Supabase Auth `auth.users.id` is the canonical RenderLab account principal.

Session architecture:
```text
Settings browser
  -> Supabase Auth email/password sign-in or account creation
  -> Supabase SSR cookie session
  -> root Next.js proxy refreshes/rotates cookies
  -> Server Components/services read verified claims
  -> RenderLab account identity = claims.sub / auth.users.id
```

Rules:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public browser configuration, not secrets;
- `SUPABASE_SERVICE_ROLE_KEY` remains server/CI-only and is never used by product browser code;
- server account identity uses verified Supabase claims rather than trusting an unverified browser-supplied user ID;
- UI-029 itself added no owner columns or account-scoped media/job persistence;
- personal organization remains blocked until UI-030 ownership isolation is merged and enforcement is safely completed.

Configured Account Identity Visual `33111299356` created a run-owned confirmed test user through the server-only Auth admin API, signed in through the actual Settings UI, verified session persistence across reload, signed out and deleted the exact user. Direct verification afterward found no matching account-CI users.

### Core account ownership boundary — UI-030 / PR #17 (in progress)
PR #17 establishes account-private ownership for the four RenderLab core durable/pending record types:
- `generation_sources.owner_id`
- `generation_jobs.owner_id`
- `media_assets.owner_id`
- `media_upload_sessions.owner_id`

Application boundary:
```text
verified Supabase claims.sub
  -> RenderLab route/account context
  -> owner-scoped server query or write
  -> server-only service-role REST
  -> RenderLab core table row with owner_id
```

Current branch behavior:
- Library, Media Viewer, media metadata/content/thumbnail/download/rename, persistent upload, temporary reference upload, generation submission/polling and generation input resolution require a verified non-anonymous account where they touch private state;
- list/get/update/completion queries include `owner_id`; foreign opaque IDs resolve as ordinary not-found state rather than disclosing ownership;
- persistent upload sessions/assets and temporary reference sources are created with the authenticated owner;
- generation jobs are created with the authenticated owner and generated media inherits the job owner;
- Create may still hold an unsigned draft, but persistent generation/upload actions require sign-in;
- raw core tables remain unavailable to browser roles: actual grants show `service_role` retains required privileges while `anon` and `authenticated` have none;
- an optional external RenderLab generation service is active only when both its URL and a server-only bearer token are configured. RenderLab authenticates both submit and poll calls before forwarding `x-renderlab-owner-id`; a backend must verify the bearer token before trusting that owner header. URL-only configuration falls back to native orchestration rather than trusting an unauthenticated external owner boundary.

Verified rollout state in shared Supabase:
- all four ownership tables currently contain `0` rows and therefore `0` null owners;
- all four owner FKs use `ON DELETE RESTRICT`;
- RLS is enabled on all four tables;
- there are intentionally no browser RLS policies because browser roles have no direct table grants and product routes are the access boundary;
- no RenderLab configured-test Auth users remain after cleanup;
- corrected `0005` was executed only inside live-schema transactions and rolled back. Same-owner generation/media/upload relationships succeeded; cross-owner media→job and upload→asset links were rejected on insert/update; owner reassignment and missing ownership were rejected; Auth-owner deletion was restricted while owned rows existed; all six enforcement triggers existed inside the transaction;
- a second rollback-only compatibility simulation verified existing FK cleanup remains valid under corrected `0005`: deleting a generation job still sets `media_assets.generation_job_id` to null, while deleting a media asset still cascades its `media_upload_sessions` row;
- post-rollback verification found four still-nullable owner columns, zero enforcement triggers/functions, zero simulation Auth users and zero core rows; migration history still contains only applied `0004`.

Configured ownership evidence:
- exact SHA `7dfda5e61b787f6ac30ed905ccc565e3bc32266b` passed Account Ownership run `33115683962`, including build, configured application startup, two real confirmed Supabase accounts, own-vs-foreign media/job access, foreign rename/content/download/completion denial, owner-bound upload/reference writes, raw Data API denial and cleanup;
- subsequent exact-scope hardening changed corrected staged `0005` and the external generation adapter's submit/poll authentication. These newer code/schema changes have independent static/transactional evidence but still require final executable exact-head hosted validation before approval;
- configured test cleanup now uses deterministic fixture account ownership so a rerun on a fresh runner can recover its own stale DB/R2 rows without deleting another workflow's fixtures;
- Generation Image/Edit and Video/Animate PR workflows now carry timeout budgets that exceed their own sequential verifier deadlines.

Current external validation blocker:
- GitHub-hosted Actions jobs currently fail before executing step 1 (`steps: null`, no job log) on PR #17, including heads containing the corrected migration;
- rerunning the previously successful merged-main UI Shell job from run `33113289145` now fails with the same zero-step symptom, proving the runner-start failure is independent of PR #17 code;
- therefore PR #17 remains draft and corrected 0005 remains unapplied until exact-head hosted execution becomes available again.

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
- Account Identity configured lifecycle — `33111299356`; exact run-owned auth fixture, real Settings sign-in/session persistence/sign-out and cleanup passed.
- Account Ownership configured lifecycle — `33115683962` on exact SHA `7dfda5e61b787f6ac30ed905ccc565e3bc32266b`; two-account private-media/job boundary, owner-bound upload/reference persistence, raw Data API denial and cleanup passed before later verifier/test hardening, corrected staged `0005`, and external-backend authentication hardening.

Search/upload/download/rename/account configured verifiers do not invoke ComfyUI. Generation Image/Edit and Video/Animate verifiers do invoke the configured worker fleet.

## External Generation & Studio Compatibility Boundary
Current product generation routing is:
1. an intentionally configured **authenticated external RenderLab backend** only when both `RENDERLAB_GENERATION_BACKEND_URL` and `RENDERLAB_GENERATION_BACKEND_TOKEN` are present;
2. RenderLab-native orchestration when shared Supabase/R2 credentials are configured;
3. otherwise a truthful generation-backend-unavailable state.

For the external path, RenderLab sends `Authorization: Bearer <server-token>` plus `x-renderlab-owner-id` on submit and poll. The external service must authenticate the bearer token before trusting the forwarded owner ID. A bare owner header is not an authorization boundary.

`src/server/generation/studio-compat.ts` remains transitional migration/debugging code only. It is **not part of current product generation routing** and must not become a deployed Studio runtime dependency. Remove the adapter when no migration/debugging workflow requires it.

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
### Supabase server/private
- `SUPABASE_URL` = `https://rashyleshocuvpgcooxy.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — secret, server/CI only

### Supabase public auth configuration
- `NEXT_PUBLIC_SUPABASE_URL` = `https://rashyleshocuvpgcooxy.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — public publishable project key; safe for browser configuration, not a service credential

### R2
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

R2 credentials currently require Admin Read & Write because configured browser upload verification reconciles bucket CORS.

### Optional
- `CLOUDFLARE_API_TOKEN` — REST CORS fallback
- `RENDERLAB_GENERATION_BACKEND_URL` — optional external RenderLab generation service; only active together with the token below
- `RENDERLAB_GENERATION_BACKEND_TOKEN` — server-only bearer secret required to authenticate the optional external generation service before `x-renderlab-owner-id` is trusted
- `RENDERLAB_STUDIO_COMPAT_URL` — transitional migration/debugging compatibility only; not current product generation routing

## Security Rules
- Never commit service-role/R2/provider/backend bearer credentials.
- Never expose server credentials through `NEXT_PUBLIC_*`; only public Supabase URL/publishable-key configuration belongs there.
- Supabase Auth `auth.users.id` remains the canonical account principal; do not trust a browser-supplied owner ID.
- Raw `generation_sources`, `generation_jobs`, `media_assets` and `media_upload_sessions` stay server-owned. Browser roles have no direct table grants; product routes/services enforce owner scope while using server-only service-role access.
- Keep RLS enabled on the four core tables. No browser RLS policy is required while browser roles have no direct grants; if the access architecture changes later, define owner policies deliberately before granting table access.
- An external generation service must authenticate the server-only bearer token before trusting `x-renderlab-owner-id`; owner headers alone are not authorization.
- UI-030 ownership is still in progress until PR #17 receives exact-head configured execution and corrected 0005 is safely enforced. Do not approve Favorites/Collections or other personal organization before that rollout completes.
- Direct browser uploads use short-lived signed URLs + exact-origin CORS.
- Durable reads/downloads use short-lived signed R2 GETs behind opaque product routes.
- Rename uses a server-side service-role metadata mutation and never exposes service-role credentials to the browser.
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
- `verify-account-identity.mjs` + `account-identity-visual.yml` — exact run-owned confirmed Auth user, real Settings session lifecycle, responsive screenshots and exact cleanup
- `verify-account-ownership.mjs` + `account-ownership.yml` — two-account private-record isolation, signed-out denial, foreign opaque-ID denial, raw table-access denial and exact fixture cleanup
- `verify-reference-upload.mjs` + `reference-upload-integration.yml` — owner-bound temporary source persistence
- `verify-generation-bridge.mjs` + `generation-bridge-integration.yml` — owner-bound Create Image/Edit Image persistence and continuation
- `verify-video-generation.mjs` + `video-generation-integration.yml` — owner-bound Create Video/Animate Image plus temporary reference ownership
- `ensure-r2-browser-cors.mjs` for idempotent exact-origin upload-CORS reconciliation

## Next Infrastructure Work
1. Complete UI-030 / PR #17: when GitHub-hosted runners can execute again, rerun the exact-head configured suite including corrected `0005` and external-backend authentication hardening, inspect any real failures/artifacts, and re-audit shared-resource cleanup.
2. After owner-aware code is safely merged/live, verify there are no unowned rows, apply corrected `0005_core_account_ownership_enforce.sql`, and confirm `NOT NULL`, immutable ownership and table-specific same-owner link triggers. Do not reverse this rollout order.
3. Only after UI-030 is fully enforced may personal organization such as Favorites/Collections be reconsidered.
4. Add any future public upload origin explicitly to R2 CORS before deployment/use.
5. Remove transitional Studio compatibility when no migration/debugging need remains.
6. Keep Library/Activity against RenderLab-owned `media_assets`/`generation_jobs`, never legacy `studio_*`.
7. Preserve conservative duplicate-avoidance if worker routing evolves.
