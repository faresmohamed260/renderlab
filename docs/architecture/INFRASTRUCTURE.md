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
- `0004_core_account_ownership_prepare.sql` — applied as `20260827203604 renderlab_core_account_ownership_prepare`; adds nullable `owner_id -> auth.users.id ON DELETE RESTRICT`, owner-time indexes and revoke direct `anon`/`authenticated` raw-table grants while keeping RLS enabled.
- `0005_core_account_ownership_enforce.sql` — applied as `20260828174940 renderlab_core_account_ownership_enforce` after the owner-aware runtime was live, live two-account verification passed, and the final no-unowned-row audit was clean. It makes all four owners `NOT NULL`, makes `owner_id` immutable, and enforces same-owner links for generated media → generation job and upload session → promoted media asset. The migration was corrected at `7f0b74887ec8bb84a3fb17c4542d83f0ddc8177e` after rollback-only semantic testing exposed that one shared polymorphic trigger function could reference a field unavailable on `media_assets`; the applied migration uses separate media→job and upload→asset owner-link trigger functions.
- `0006_media_favorites.sql` — applied as `20260828183102 renderlab_media_favorites`; adds nullable `media_assets.favorited_at` plus partial `media_assets_owner_favorite_created_at_idx` for owner/favorite browsing. Post-apply audit found 0 media rows, `owner_id` still `NOT NULL`, RLS enabled and 0 direct browser grants. It changes no R2 contract.
- `0007_media_collections.sql` — applied as `20260828201740 renderlab_media_collections`; creates account-owned `media_collections` and many-to-many `media_collection_items` with `owner_id NOT NULL -> auth.users.id ON DELETE RESTRICT`, RLS enabled, zero browser grants, immutable owners and a trigger that rejects collection/media membership unless both share the membership owner.
- `0008_media_collection_asset_fk_index.sql` — applied as `20260828202601 renderlab_media_collection_asset_fk_index`; adds leading `media_asset_id` coverage for the membership foreign-key lookup/cascade path identified by the Supabase performance advisor. It changes no product behavior or R2 contract.
- `0009_media_asset_deletion.sql` — applied as `20260828221611 renderlab_media_asset_deletion`; adds nullable `media_assets.deleted_at` / `purged_at`, tombstone-state guards, first-delete cleanup of Favorite/collection/upload-session links, protection against adding deleted media to collections, and partial `media_assets_owner_active_created_at_idx` for ordinary active browsing. It does not hard-delete generation history.

Do not reapply migrations 0003, 0004, 0005, 0006, 0007, 0008 or 0009. The required 0005 sequencing was satisfied: exact owner-aware application SHA `5f5d3cee9b45af175f072050f48da4549d5f416c` became READY in production, live account isolation passed, and a final zero-unowned-row audit completed before enforcement. UI-031 implementation-head verification left all four core tables empty, zero RenderLab fixture Auth users, zero browser core-table grants, four RLS-enabled core tables, four `NOT NULL` owner columns and all six UI-030 enforcement triggers intact; `favorited_at` remains nullable and `media_assets_owner_favorite_created_at_idx` remains present.

Post-UI-032 implementation-head security advisors report only expected informational `rls_enabled_no_policy` notices for the six deliberately server-owned RenderLab tables. Performance advisors initially identified `media_collection_items.media_asset_id` as an uncovered foreign key; additive `0008` fixed that actionable issue. The remaining performance notices are unused-index INFO on empty/low-traffic RenderLab/legacy tables, including the new Collections FK index before production traffic, and do not justify removal during this slice.

UI-031 / PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431` after exact final head `4bd41d55af27c7240d75862424039fc59027988e` passed all 13 affected gates. Merged `main` UI Shell `33205766730`, Reference Upload `33205766693`, Generation Integration `33205766671`, and Video Generation `33205766691` passed. Post-merge Supabase cleanup returned all four core tables and RenderLab fixture users to zero while preserving RLS, browser-grant revocation, six ownership triggers, four `NOT NULL` owners, nullable `favorited_at`, and the favorite index. Vercel reported zero RenderLab deployments created after the PR #23 merge, confirming automatic Git deployment remained disabled; UI-031 has not been separately deployed to production.

Service-role access remains server-only. UI-029 added public Supabase Auth client configuration only. UI-030 / PR #17 threads the verified account principal through server product routes and persistence while keeping the raw core tables server-owned; the owner-aware runtime is live and corrected 0005 enforcement is applied and verified.

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
- Vercel/runtime configuration uses `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; `next.config.ts` maps those public-safe values into the existing browser-facing `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` bundle keys. The publishable key is not a service credential;
- `SUPABASE_SERVICE_ROLE_KEY` remains server/CI-only and is never used by product browser code;
- server account identity uses verified Supabase claims rather than trusting an unverified browser-supplied user ID;
- UI-029 itself added no owner columns or account-scoped media/job persistence;
- UI-030 satisfies the ownership-isolation prerequisite for personal organization; UI-031 Favorites and UI-032 Collections are approved separate organization slices. UI-033 now owns the explicit single-asset tombstone/R2/history semantics in final validation; batch media management remains separate.

Configured Account Identity Visual `33111299356` created a run-owned confirmed test user through the server-only Auth admin API, signed in through the actual Settings UI, verified session persistence across reload, signed out and deleted the exact user. Direct verification afterward found no matching account-CI users.

### Core account ownership boundary — UI-030 / PR #17 (production enforced)
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

Verified branch behavior:
- Library, Media Viewer, media metadata/content/thumbnail/download/rename, persistent upload, temporary reference upload, generation submission/polling and generation input resolution require a verified non-anonymous account where they touch private state;
- list/get/update/completion queries include `owner_id`; foreign opaque IDs resolve as ordinary not-found state rather than disclosing ownership;
- persistent upload sessions/assets and temporary reference sources are created with the authenticated owner;
- generation jobs are created with the authenticated owner and generated media inherits the job owner;
- Create may still hold an unsigned draft, but persistent generation/upload actions require sign-in;
- raw core tables remain unavailable to browser roles: actual grants show `service_role` retains required privileges while `anon` and `authenticated` have none;
- an optional external RenderLab generation service is active only when both its URL and a server-only bearer token are configured. RenderLab authenticates both submit and poll calls before forwarding `x-renderlab-owner-id`; a backend must verify the bearer token before trusting that owner header. URL-only configuration falls back to native orchestration rather than trusting an unauthenticated external owner boundary.

Verified ownership state in shared Supabase after production rollout:
- all four ownership tables contain `0` rows and therefore `0` null owners;
- all four owner FKs use `ON DELETE RESTRICT`;
- RLS is enabled on all four tables;
- there are intentionally no browser RLS policies because browser roles have no direct table grants and product routes are the access boundary;
- no RenderLab configured-test Auth users remain after cleanup;
- all four owner columns are `NOT NULL` after applied `0005` enforcement;
- all six UI-030 enforcement triggers are active: four owner-immutability triggers plus media→job and upload→asset same-owner guards;
- migration history includes `20260828174940 renderlab_core_account_ownership_enforce`; later migrations `20260828183102 renderlab_media_favorites`, `20260828201740 renderlab_media_collections`, `20260828202601 renderlab_media_collection_asset_fk_index` and `20260828221611 renderlab_media_asset_deletion` are also applied;
- before rollout, corrected `0005` was executed in rollback-only live-schema transactions. Same-owner generation/media/upload relationships succeeded; cross-owner media→job and upload→asset links were rejected on insert/update; owner reassignment and missing ownership were rejected; Auth-owner deletion was restricted while owned rows existed; all six enforcement triggers existed inside the transaction;
- a second rollback-only compatibility simulation verified existing FK cleanup remains valid under corrected `0005`: deleting a generation job still sets `media_assets.generation_job_id` to null, while deleting a media asset still cascades its `media_upload_sessions` row;
- that pre-rollout rollback verification found four still-nullable owner columns, zero enforcement triggers/functions, zero simulation Auth users and zero core rows before production enforcement.

Configured ownership evidence:
- original owner-aware product SHA `7dfda5e61b787f6ac30ed905ccc565e3bc32266b` passed Account Ownership run `33115683962`, including build, configured application startup, two real confirmed Supabase accounts, own-vs-foreign media/job access, foreign rename/content/download/completion denial, owner-bound upload/reference writes, raw Data API denial and cleanup;
- final validated implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed all 14 configured PR gates: Account Ownership `33131090207`, Account Identity `33131090197`, UI Shell `33131090250`, Create Lifecycle `33131090243`, Library Search `33131090279`, Library History `33131090264`, Library Lifecycle `33131090245`, Library Drag Drop `33131090242`, Persistent Media Upload `33131090265`, Media Download `33131090206`, Media Rename `33131090198`, Reference Upload `33131090263`, Generation Integration `33131090251`, and Video Generation `33131090262`;
- resumed CI exposed one verifier-only bearer-leak issue: Playwright header overrides followed local media-route 302 redirects to signed R2 URLs. The shared helper now uses a non-following authenticated fetch for the local product route and lets Chromium follow the external signed redirect without the fixture bearer; Create, Library Lifecycle, Download and Rename all pass after the fix;
- fresh exact-head signed-out/signed-in Create/Library/Viewer desktop/mobile artifacts were visually reviewed without unintended hierarchy drift;
- configured test cleanup uses deterministic fixture account ownership so a rerun on a fresh runner can recover its own stale DB/R2 rows without deleting another workflow's fixtures;
- Generation Image/Edit and Video/Animate PR workflows carry timeout budgets that exceed their own sequential verifier deadlines.

Merge verification: final documentation head `d7f856913847ff22fa2594d060dbe21b6ea9373a` passed all 14 configured gates before PR #17 merged as `dac7aa9ab382ffa3cf2abf197ff72ef1ca3597d1`. Push-triggered merged-`main` UI Shell `33135862296`, Reference Upload `33135862307`, Generation Integration `33135862297`, and Video Generation `33135862337` all passed. Post-run cleanup again left all four core tables empty and no RenderLab fixture Auth users.

Production rollout verification: deployment `dpl_DYs48pvBEvzDuDbHwcEn4f9LGabE` is READY on exact application SHA `5f5d3cee9b45af175f072050f48da4549d5f416c` with canonical alias `https://renderlab-lake.vercel.app`; signed-out Create/Library/Viewer and private API denial were verified; live two-account Account Ownership run `33196254711` passed before enforcement; final zero-unowned-row audit passed; `0005` was then applied; post-enforcement live Account Ownership run `33196534150` passed with cleanup; final audit again found zero core rows and zero fixture users.

Supabase advisor result after production enforcement:
- security: only informational `RLS enabled, no policy` notices on the four deliberately server-owned tables; this is expected while browser roles have no direct grants;
- performance: unused-index INFO notices on empty/low-traffic RenderLab/legacy tables; no UI-030 schema change is justified from those notices.

### Library Collections boundary — UI-032 / PR #24 (approved)
UI-032 adds two RenderLab-owned server tables without coupling to legacy `studio_*`:
- `media_collections` — named account-owned collection identity;
- `media_collection_items` — many-to-many same-owner relation between a collection and durable `media_assets`.

Database boundary:
- `0007_media_collections.sql` applied as `20260828201740 renderlab_media_collections`;
- both owner columns are `NOT NULL` Auth foreign keys with `ON DELETE RESTRICT` and immutable-owner triggers;
- membership has a database trigger that rejects collection/media links unless both rows share `media_collection_items.owner_id`;
- RLS is enabled on both tables and `anon`/`authenticated` have no direct grants;
- owner-normalized collection name uniqueness is enforced;
- `0008_media_collection_asset_fk_index.sql` applied as `20260828202601 renderlab_media_collection_asset_fk_index` after the performance advisor identified the `media_asset_id` FK as uncovered; rerunning advisors removed that warning.

Verification boundary: final exact head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578` passed the complete 14-gate affected suite, including Collections `33210501106`, Account Ownership `33210501089`, Favorites `33210501168`, Library Lifecycle `33210501160`, Generation `33210501178` and Video Generation `33210501167`. PR #24 merged as `143f7bfb0be8b4857e5dd45959466e71ae22a42d`; merged-main checks UI Shell `33210876059`, Reference Upload `33210876022`, Generation Integration `33210876042`, and Video Generation `33210876085` passed. Configured Collections verification covers signed-out denial, two-account own/foreign boundaries, database same-owner/immutability enforcement, idempotent membership, composed Library filtering, responsive Viewer/Library interactions and exact cleanup.

Final post-merge audit found zero rows in all six RenderLab tables, zero fixture Auth users, zero browser grants, six RLS-enabled tables, six `NOT NULL` owner columns, nine ownership/integrity triggers and `0008` as latest migration. Vercel listed zero RenderLab deployments created after the PR #24 merge, preserving the disabled automatic-Git-deployment boundary. UI-032 adds no new R2 prefix or browser-upload CORS requirement; Collections store only account-owned organization metadata around existing durable media identity.

### Durable media deletion boundary — UI-033 / PR #25 (final validation)
UI-033 resolves the previously deferred destructive storage/reference/history contract for one durable asset without introducing batch selection or a user Trash model.

Database boundary:
- `0009_media_asset_deletion.sql` is applied as `20260828221611 renderlab_media_asset_deletion`;
- `media_assets.deleted_at` is the immutable product tombstone and `purged_at` is only valid at/after deletion;
- first tombstone clears Favorite state and deletes same-asset collection memberships plus completed upload-session staging links;
- database guards prevent tombstone reversal and prevent collection membership from targeting deleted media;
- generation-job JSON input/output IDs are deliberately preserved as historical opaque references; the media row itself remains as the durable tombstone;
- ordinary owner-scoped active browsing is supported by partial `media_assets_owner_active_created_at_idx`; raw browser grants remain zero and RLS remains enabled.

Storage/runtime boundary:
- owner-scoped `DELETE /api/media/assets/[assetId]` tombstones before storage mutation;
- the server deletes the primary R2 object plus optional thumbnail and records `purged_at` only after successful physical cleanup;
- a tombstone with incomplete physical cleanup remains explicitly retryable/idempotent rather than being reported as fully purged;
- previously issued short-lived signed URLs cannot be revoked, but active product routes issue no new signed media after tombstoning;
- new generation submission preflights durable inputs so tombstoned media cannot be sent to native or external generation backends; already-running jobs are not cancelled implicitly.

Verification state before final documentation-head rerun: decision-finalized head `1d087e5791bd713e4b0f1d540bff18bea5fae386` passed all 15 affected PR gates, including Media Delete `33216665876`, Account Ownership `33216665938`, Generation `33216665787`, Video Generation `33216665774`, Favorites `33216665770` and Collections `33216665804`. Configured Delete verification covered two-account denial, database cleanup, R2 primary/thumbnail purge, preserved generation history, idempotent retry, rejected post-delete generation reuse, responsive confirmation UI and exact cleanup.

Shared-resource audit after that suite returned all six RenderLab tables and configured fixture users to zero, with six RLS-enabled tables, six non-null owners, zero browser grants, nullable deletion timestamps, deletion guards and the active-media index intact. Post-`0009` security advisors report only expected `rls_enabled_no_policy` INFO for deliberately server-owned tables; performance advisors report unused-index INFO only, including the new active index on the currently empty/low-traffic dataset. No advisor requires a UI-033 schema change.

Batch/card selection, multi-delete atomicity, retention/recovery and collection deletion remain separate future contracts.

### GitHub Actions / repository visibility
The repository is **public** as of 2026-08-28. This is a deliberate remote-development infrastructure decision.

Why:
- while the repository was private, RenderLab exhausted metered GitHub-hosted Actions capacity and all workflows began failing before runner allocation with `steps: null` and no job log;
- making the repository public restored GitHub-hosted runner allocation immediately and the complete exact-head suite executed normally;
- repository Actions secrets remain secret and are not exposed by public repository visibility; committed code/history are public and must continue to contain no private credentials.

Validation consequences:
- public GitHub Actions is the normal mid-development remote validation path;
- Vercel preview deployment is not required for iterative UI/application verification;
- final exact-head validation remains mandatory; a future runner outage still does not waive required gates;
- connector-driven writes should continue to batch cohesive changes into as few commits as practical.

## Vercel deployment boundary
Vercel is the production deployment target, but Git pushes are **not** deployment authorization. Repository `vercel.json` sets `git.deploymentEnabled=false`, so GitHub development/merge activity does not automatically create Vercel deployments. An explicit deployment action is required.

The RenderLab repository is Next.js (`npm run build` -> `next build`). The Vercel project originally retained a stale `vite` framework preset and explicit `dist` output override; automatic production attempt `dpl_26Di1DVD3fpAdb2HjiskT9kTtpqz` therefore completed the Next.js build but failed before becoming live. During the authorized rollout the dashboard Framework Preset was corrected to Next.js and the `dist` Output Directory override was disabled. Repository `vercel.json` still pins `framework: nextjs` and disables automatic Git deployments.

Deployment readiness sequencing rule: `0005` could not be applied merely because GitHub `main` was owner-aware. The completed rollout explicitly deployed the verified owner-aware runtime, verified serving private-account flows, re-audited shared Supabase for unowned rows, and only then applied/validated `0005`.

`.github/workflows/deployment-readiness.yml` is the permanent non-deploying configuration gate. On changes to Vercel/build configuration it asserts `framework: nextjs`, asserts automatic Git deployment remains disabled, rejects a forced `outputDirectory`, exercises the Vercel environment preflight with non-secret fixture values, installs dependencies and runs the production `next build`. `scripts/verify-vercel-env.mjs` is also wired as `prebuild`, but only enforces the real environment contract when `VERCEL=1`. The gate performs no Vercel deployment and no Supabase/R2 writes.

Deployment Readiness PR #18 merged as `2b8a5170df0675a691deb8d5a7031f1dc14d803b`. Exact candidate `da7f9c23224f5a03ba0832fe8fcd773d1586e0c2` passed all 15 configured PR gates after fixing a concurrent fixture race: configured account identity now scopes by `GITHUB_RUN_ID`, so an older superseded run cannot delete a newer run's Auth owner. Merged `main` Deployment Readiness `33137972011`, UI Shell `33137972042`, Reference Upload `33137972130`, Generation Integration `33137972033`, and Video Generation `33137972021` all passed. The PR #18 merge itself created no Vercel deployment. The dashboard-level project preset was subsequently corrected to Next.js and the stale `dist` output override was removed during the authorized rollout; repository `framework: nextjs` remains the explicit-deployment contract. Final post-merge Supabase audit found zero core rows/fixture users/browser grants, four nullable owner columns, zero enforcement triggers, and migration history still ending at applied `0004`.

The first separately authorized rollout attempts after PR #18 did **not** become live. Probe deployment `dpl_6jG1VKYMWimBtZMgyr75b2EKtK9i` failed with the stale-project output condition, and exact-main bootstrap deployment `dpl_FHeEYsHjERijXcoHSaTdV7MUCvdu` exposed the mismatch between the repository's then-expected environment names and the Vercel project's established names. PR #19 aligned the repository contract to `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and `CLOUDFLARE_R2_*` while preserving GitHub CI aliases. After the current Vercel secret values were refreshed, the project preset was corrected to Next.js and the stale `dist` override removed, explicit Git deployment `dpl_DYs48pvBEvzDuDbHwcEn4f9LGabE` became READY on exact SHA `5f5d3cee9b45af175f072050f48da4549d5f416c`. Automatic Git deployments remain disabled.

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

The production R2 access-key token is configured in Vercel as `CLOUDFLARE_R2_ACCESS_KEY_ID` / `CLOUDFLARE_R2_SECRET_ACCESS_KEY` and has Admin Read & Write capability. GitHub configured workflows may continue supplying the existing `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` aliases; server storage accepts both during the transition. `scripts/ensure-r2-browser-cors.mjs` manages the `renderlab-browser-uploads` rule through the S3 API while preserving unrelated rules.

Managed origins:
- `http://127.0.0.1:3000`
- `http://localhost:3000`
- `https://renderlab-lake.vercel.app`
- `https://renderlab-faresmohamed260-6733s-projects.vercel.app`
- `https://renderlab-git-main-faresmohamed260-6733s-projects.vercel.app`

Configured browser verification uses the local RenderLab origin directly and does not depend on the Studio runtime. PR #21 added the canonical production alias to both CORS-reconciling workflows; Drag Drop `33196932122` and Library Lifecycle `33196932073` attempt 2 verified the propagated rule and real browser upload cleanup. `CLOUDFLARE_API_TOKEN` is an optional REST fallback only; current R2 S3 credentials successfully manage the bucket CORS rule.

If a future public RenderLab origin changes, add that exact origin before direct browser uploads there. Do not use broad wildcard CORS merely for convenience.

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
- Account Ownership final implementation coverage — exact head `49f08013dc428d8d390a1bd803b10886f853cd82` passed the complete 14-gate ownership/media/generation suite listed above after the earlier two-account foundation run `33115683962`.

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

## Required Server / CI / Production Environment Variables
For an explicit Vercel deployment, every non-optional variable below must be configured in the target Vercel environment. `npm run build` invokes `scripts/verify-vercel-env.mjs`; when Vercel exposes `VERCEL=1`, the prebuild fails before compilation if required Supabase/R2 variables are missing, if `SUPABASE_URL` does not target the approved shared project, or if only one half of the optional external-backend URL/token pair is configured. GitHub builds remain secret-free because the preflight is Vercel-only.

The canonical Vercel names intentionally match the variables already configured on the RenderLab Vercel project. Existing GitHub configured workflows may continue using the older `NEXT_PUBLIC_SUPABASE_*` / `R2_*` aliases where their workflow contracts already provide them; application/build compatibility keeps those aliases working without requiring secret rotation.

### Supabase
- `SUPABASE_URL` = `https://rashyleshocuvpgcooxy.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY` — public publishable project key; `next.config.ts` intentionally maps this plus `SUPABASE_URL` into browser-facing `NEXT_PUBLIC_SUPABASE_*` bundle keys
- `SUPABASE_SERVICE_ROLE_KEY` — secret, server/CI only

### R2
- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET`

R2 credentials currently require Admin Read & Write because configured browser upload verification reconciles bucket CORS.

### Optional
- `CLOUDFLARE_R2_PUBLIC_BASE_URL` — existing project variable; not required by current private signed-R2 delivery paths
- `CLOUDFLARE_API_TOKEN` — REST CORS fallback
- `RENDERLAB_GENERATION_BACKEND_URL` — optional external RenderLab generation service; only active together with the token below
- `RENDERLAB_GENERATION_BACKEND_TOKEN` — server-only bearer secret required to authenticate the optional external generation service before `x-renderlab-owner-id` is trusted
- `RENDERLAB_STUDIO_COMPAT_URL` — transitional migration/debugging compatibility only; not current product generation routing

## Security Rules
- Never commit service-role/R2/provider/backend bearer credentials.
- Only the Supabase project URL and publishable key are intentionally exposed to browser code. `next.config.ts` maps those public-safe values from `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`; service-role and R2 credentials must never be published.
- Supabase Auth `auth.users.id` remains the canonical account principal; do not trust a browser-supplied owner ID.
- Raw `generation_sources`, `generation_jobs`, `media_assets` and `media_upload_sessions` stay server-owned. Browser roles have no direct table grants; product routes/services enforce owner scope while using server-only service-role access.
- Keep RLS enabled on the four core tables. No browser RLS policy is required while browser roles have no direct grants; if the access architecture changes later, define owner policies deliberately before granting table access.
- An external generation service must authenticate the server-only bearer token before trusting `x-renderlab-owner-id`; owner headers alone are not authorization.
- UI-030 is merged and GitHub-verified, but the ownership rollout is not complete until owner-aware code is actually live, a final no-unowned-row audit passes, and corrected `0005` is applied/verified. Do not approve Favorites/Collections or other personal organization before that rollout completes.
- Direct browser uploads use short-lived signed URLs + exact-origin CORS.
- Durable reads/downloads use short-lived signed R2 GETs behind opaque product routes.
- Rename uses a server-side service-role metadata mutation and never exposes service-role credentials to the browser.
- Do not persist/expose raw signed URLs as product links.
- Worker/provider routing remains server-owned.
- Shared resources do not authorize legacy Saga mutation/coupling.
- URL continuation parameters are untrusted intent; durable asset/capability state is revalidated server-side.

## CI / Integration Validation
Ordinary UI CI runs without production secrets and validates truthful unavailable states. Configured workflows use GitHub Secrets and self-clean shared production fixtures.

Actions budget discipline:
- the repository is public, so normal GitHub-hosted public-repository runner usage is the approved mid-development validation path;
- final exact-head validation remains mandatory; budget pressure or runner-start failure is not permission to waive a required gate;
- only workflows whose interrupted state is safely reconstructible use `cancel-in-progress: true`. Current cancellation-safe workflows are UI Shell, Persistent Media Upload Integration, and Reference Upload Integration;
- worker-backed Create/Generation/Video workflows, the shared Library Lifecycle/Drag Drop lock, and visual fixtures that can place R2 objects before their DB row remain non-canceling;
- configured helper accounts use deterministic `GITHUB_RUN_ID`-scoped owner identities (or an explicit test-scope override): reruns of the same workflow can reconstruct their own cleanup, while separate workflow runs cannot delete each other's Auth owner or owned rows;
- connector-driven repository writes should batch cohesive changes into as few commits as practical so intermediate heads do not launch redundant workflows.

Key workflows:
- `verify-create-lifecycle.mjs` + `create-lifecycle-visual.yml`
- `verify-media-upload.mjs` + `media-upload-integration.yml`
- `verify-library-lifecycle.mjs` + `library-lifecycle-visual.yml` — shared-resource lifecycle is serialized and exact durable fixture identity is used for browser targeting
- `verify-library-search.mjs` + `library-search-visual.yml`
- `verify-media-download.mjs` + `media-download-visual.yml`
- `verify-media-rename.mjs` + `media-rename-visual.yml`
- `verify-account-identity.mjs` + `account-identity-visual.yml` — exact run-owned confirmed Auth user, real Settings session lifecycle, responsive screenshots and exact cleanup; now also validates the canonical `SUPABASE_PUBLISHABLE_KEY` → browser-bundle mapping
- `verify-account-ownership.mjs` + `account-ownership.yml` — two-account private-record isolation, signed-out denial, foreign opaque-ID denial, raw table-access denial and exact fixture cleanup
- `verify-reference-upload.mjs` + `reference-upload-integration.yml` — owner-bound temporary source persistence
- `verify-generation-bridge.mjs` + `generation-bridge-integration.yml` — owner-bound Create Image/Edit Image persistence and continuation
- `verify-video-generation.mjs` + `video-generation-integration.yml` — owner-bound Create Video/Animate Image plus temporary reference ownership
- `verify-vercel-env.mjs` + `deployment-readiness.yml` — non-deploying Next.js/Vercel configuration, canonical Vercel environment preflight and production-build gate
- `ensure-r2-browser-cors.mjs` for idempotent exact-origin upload-CORS reconciliation

## Next Infrastructure Work
1. Keep GitHub validation and Vercel deployment separate: deployment-readiness changes must be exact-head green on GitHub before any explicit rollout, and repository merges are never permission to apply corrected `0005`.
2. Through a separately authorized rollout, make owner-aware code actually live; then verify there are no unowned rows, apply corrected `0005_core_account_ownership_enforce.sql`, and confirm `NOT NULL`, immutable ownership and table-specific same-owner link triggers. Do not reverse this rollout order.
3. Only after UI-030 is fully enforced may personal organization such as Favorites/Collections be reconsidered.
4. Add any future public upload origin explicitly to R2 CORS before deployment/use.
5. Remove transitional Studio compatibility when no migration/debugging need remains.
6. Keep Library/Activity against RenderLab-owned `media_assets`/`generation_jobs`, never legacy `studio_*`.
7. Preserve conservative duplicate-avoidance if worker routing evolves.
