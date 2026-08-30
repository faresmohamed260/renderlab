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
- `0010_renderlab_account_admission.sql` — applied as `20260829234212 renderlab_account_admission`; adds server-owned `renderlab_account_access` and `renderlab_beta_invitations` plus transactional same-email invitation claim. Both tables are RLS-enabled/browser-revoked.
- `0011_renderlab_admin_access_control.sql` — applied as `20260830015449 renderlab_admin_access_control`; adds nullable bounded per-account generation overrides, the role/status admin index, service-role-only transactional `renderlab_admin_set_account_access` with self-lockout/last-active-admin protection, and service-role-only sanitized `renderlab_admin_health`.
- `0012_renderlab_generation_admission.sql` — applied as `20260830101734 renderlab_generation_admission`; adds the exactly-one-row typed `renderlab_beta_settings`, server-owned `generation_admission_reservations`, and minimum service-role-only transactional admission/bind/release plus fresh-admin global-settings routines. Defaults are generation enabled / 1 active / 12 admitted per rolling hour. Both tables are RLS-enabled/browser-revoked and privileged routines use empty search paths.

Do not reapply migrations 0003, 0004, 0005, 0006, 0007, 0008, 0009, 0010, 0011 or 0012. The required 0005 sequencing was satisfied: exact owner-aware application SHA `5f5d3cee9b45af175f072050f48da4549d5f416c` became READY in production, live account isolation passed, and a final zero-unowned-row audit completed before enforcement. UI-031 implementation-head verification left all four core tables empty, zero RenderLab fixture Auth users, zero browser core-table grants, four RLS-enabled core tables, four `NOT NULL` owner columns and all six UI-030 enforcement triggers intact; `favorited_at` remains nullable and `media_assets_owner_favorite_created_at_idx` remains present.

Post-UI-032 implementation-head security advisors report only expected informational `rls_enabled_no_policy` notices for the six deliberately server-owned RenderLab tables. Performance advisors initially identified `media_collection_items.media_asset_id` as an uncovered foreign key; additive `0008` fixed that actionable issue. The remaining performance notices are unused-index INFO on empty/low-traffic RenderLab/legacy tables, including the new Collections FK index before production traffic, and do not justify removal during this slice.

UI-031 / PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431` after exact final head `4bd41d55af27c7240d75862424039fc59027988e` passed all 13 affected gates. Merged `main` UI Shell `33205766730`, Reference Upload `33205766693`, Generation Integration `33205766671`, and Video Generation `33205766691` passed. Post-merge Supabase cleanup returned all four core tables and RenderLab fixture users to zero while preserving RLS, browser-grant revocation, six ownership triggers, four `NOT NULL` owners, nullable `favorited_at`, and the favorite index. Vercel reported zero RenderLab deployments created after the PR #23 merge, confirming automatic Git deployment remained disabled; UI-031 has not been separately deployed to production.

UI-034 / PR #29 adds no Supabase migration and no new R2 contract. Final exact head `1e634fe9a582b8a7676cb70cfc7bcd5754f613ce` passed all 16 affected workflows, including configured mixed owner/foreign partial-success deletion, before PR #29 merged as `8b0b0339f216f3ce704d965ef005b2cd020f3ae8`. Merged-`main` UI Shell `33221101101`, Generation Integration `33221101106`, and Video Generation `33221101117` passed. Post-merge cleanup returned all six RenderLab tables and configured fixture users to zero with six RLS tables, six non-null owner columns, zero browser grants, nullable `deleted_at`/`purged_at`, all three deletion-integrity triggers and `media_assets_owner_active_created_at_idx` intact; `20260828221611 renderlab_media_asset_deletion` remains the latest migration. Vercel created zero deployments after the merge.

Service-role access remains server-only. UI-029 added public Supabase Auth client configuration only. UI-030 / PR #17 threads the verified account principal through server product routes and persistence while keeping the raw core tables server-owned; the owner-aware runtime is live and corrected 0005 enforcement is applied and verified.

### Phase 10A/10B account and privileged-admin boundary — verified
`0010` and `0011` are applied in the approved shared project. `renderlab_account_access` and `renderlab_beta_invitations` remain RLS-enabled with no anon/authenticated grants. `renderlab_claim_beta_invitation`, `renderlab_admin_set_account_access`, and `renderlab_admin_health` use explicit empty search paths with execute revoked from public/anon/authenticated and granted only to `service_role` (plus owner `postgres`). Phase 10B exact head `56d5a2c26fc14f6fcad8c7093024bcc9632eb7c8` passed its complete 20-workflow matrix. Production closed-beta enforcement remains off.

### Phase 10C generation-admission boundary — verified
`0012` is applied as `20260830101734 renderlab_generation_admission`. `renderlab_beta_settings` is exactly one typed server-owned row; `generation_admission_reservations` stores only owner/admission/expiry/bind/release state and no prompt/media/provider/worker/billing data. Both are RLS-enabled with zero anon/authenticated grants. Admission/settings SECURITY DEFINER routines use schema-qualified relations, empty search paths and service-role-only execute. Exact head `ca8e426066385934b296b6d4f88324e9c12861f7` passed all 22 affected workflows; Generation Admission `33309162313` proved same-owner serialization, default/override active + rolling-hour limits, release/bind/terminal/lease semantics and Create ↔ Retry sharing before any mock-backend dispatch with zero provider spend. Admin `33309162310` verified fresh-admin singleton GET/PATCH and exact restoration.

CI shared-resource isolation is intentionally narrow. `Account/Admin Operations` and `Generation Admission` alone use `concurrency: renderlab-generation-admission-shared` with `cancel-in-progress: false` because they temporarily mutate the singleton settings baseline. Activity, Create Lifecycle, Generation Integration and Video Generation Integration retain independent concurrency groups and set `RENDERLAB_TEST_GENERATION_ADMISSION_BYPASS=true`; the configured-account helper responds only by seeding that exact run-owned account with `generation_enabled=true`, `max_active_jobs=4`, `max_jobs_per_hour=120`. This is test-fixture isolation, not an application/runtime bypass, and cleanup deletes the exact account access/reservations/Auth rows. The Admission verifier also closes Chromium explicitly; Activity terminalizes only accepted mock-backend jobs before its later mobile Retry so legacy UX coverage respects the real four-active ceiling.

Final exact audit after the accepted suite found zero audited run-owned access/job/source/media/upload/reservation/Auth rows and zero exact Admin invitation rows. The singleton is restored to generation enabled / 1 active / 12 hourly / `updated_by=null`. Security Advisor reports expected server-owned `rls_enabled_no_policy` INFO plus the existing leaked-password-protection WARN reserved for 10D. Performance Advisor reports unused-index INFO and an unindexed `renderlab_beta_settings.updated_by` FK; because the settings table is structurally one row, 10C does not add a meaningless index. Admission artifact `9731487718` (`sha256:e6e94bfabbd125c20c65aa959900a0081d6ca94bbd5b6d6a5b28fd817a09c3e7`) and Admin artifact `9731449736` (`sha256:66188b46f4249a7be6e7efba6f613331de07525f76b8a931f5ffbf85e3f56e81`) were reviewed clean. Production access enforcement remains off and no deployment was performed or authorized.

PR #68 merged Phase 10C to `main` as `26508e77975ee4dd26f60860f999e4bc55c99eca`. Merged-main UI Shell `33310860293`, Reference Upload `33310860327`, Generation Integration `33310860295`, and Video Generation Integration `33310860292` all passed. The final exact post-merge audit found zero rows for those runs' deterministic accounts across `renderlab_account_access`, `generation_jobs`, `generation_sources`, `media_assets`, `media_upload_sessions`, `generation_admission_reservations`, and `auth.users`; the singleton remained generation enabled / 1 active / 12 hourly / `updated_by=null`. No deployment or production access-enforcement change occurred.

### Phase 10D pre-implementation Auth / operational audit — 2026-08-30
- Starting repository state is merged `main` `0bad0efa96fd4a74cd531f21c38641d6b31708ab`; the audit used temporary workflow commits only and those temporary files are not part of the work branch/main contract.
- One-time audit runs `33311990845` and `33312153080` used deterministic run-owned Auth identities and exact cleanup. Independent SQL verification found no remaining matching Auth/access/job/source/media/upload/reservation state.
- Hosted recovery evidence: run `33311990845` produced `mail.send` with `mail_from=noreply@mail.app.supabase.io`, proving the project currently uses Supabase's built-in Auth mailer. Run `33312153080` then returned `429 over_email_send_rate_limit`. This is not production/broader-beta mail capacity.
- GitHub Actions does not currently have `SUPABASE_ACCESS_TOKEN`, so the hosted Management API cannot be used from CI to read Site URL, URI allowlist, SMTP booleans or template bodies. Do not add such a credential or mutate hosted Auth config without explicit operator authorization.
- Two-session password audit `33312153080` verified Auth's current revocation semantics: update `200`; acting session `getUser 200` + refresh `200`; second session `getUser 403 session_not_found` + refresh `400 refresh_token_not_found`; new-password sign-in `200`. Phase 10D therefore hardens RenderLab's private account resolver to fresh `getUser()` rather than forcing the acting session to sign out.
- Security Advisor remains unchanged: expected `rls_enabled_no_policy` INFO for deliberately server-owned RenderLab tables plus leaked-password-protection WARN. The shared organization is on Free plan, so leaked-password protection remains an explicit broader-beta blocker until plan capability is changed and verified.
- Current Phase 10 table/function privilege audit remains clean: RLS enabled, no anon/authenticated DML, privileged SECURITY DEFINER functions use empty search paths and service-role/postgres-only execute. The singleton remains generation enabled / 1 active / 12 hourly / `updated_by=null`.
- Phase 10D expects no database migration. Hosted Site URL/redirect allowlist, token-hash invite/recovery templates, production custom SMTP/Auth email hook, suitable mail limits, link-tracking posture and SPF/DKIM/DMARC are operator/configuration gates before broader beta; regular CI continues to avoid real email delivery.


### Phase 10D Auth/session freshness boundary — verified
Exact code/test head `585a606666eae5b8813f54ba19ea253fcccaaf4f` passed all 21 path-triggered workflows, led by Account Identity `33313458456`. Private RenderLab server identity now uses current Supabase Auth `getUser()` state, while the root SSR proxy retains `getClaims()` solely for cookie refresh/signature validation. The configured verifier proved still-unexpired revoked bearers fail private media and generation authorization immediately after ordinary password change, token-hash recovery/password replacement and global sign-out, while the intended current session remains usable. No schema migration or Auth-hosted configuration change was required.

Exact run-owned cleanup for Account Identity found zero matching Auth/access/invitation/reservation/job/source/media/upload state. The singleton remained enabled / 1 / 12 / no updater. Phase 10 tables remain RLS-enabled/browser-revoked; every RenderLab SECURITY DEFINER routine remains empty-search-path and service-role-only. Security Advisor remains limited to expected server-owned RLS/no-policy INFO plus leaked-password protection disabled. Built-in Supabase mail (`noreply@mail.app.supabase.io`) and observed email rate limiting, unverified production Site URL/redirect/template/sender posture, and Free-plan leaked-password support remain explicit broader-beta blockers. No Vercel deployment, UUID bootstrap or production enforcement change occurred.

PR #70 merged to `main` as `5950958dc58143b099bc2877a942829c045f700e`. Merged-main Reference Upload `33314652092`, UI Shell `33314652107`, Generation Integration `33314652101`, and Video Generation Integration `33314652229` all passed. A separate exact audit of the three deterministic configured accounts used by the push runs found 0 matching rows across `auth.users`, `renderlab_account_access`, `generation_admission_reservations`, `generation_jobs`, `generation_sources`, `media_assets`, and `media_upload_sessions`; `renderlab_beta_settings` remained generation enabled / 1 active / 12 hourly / `updated_by=null`. No deployment, production UUID bootstrap, hosted Auth configuration change or production access-enforcement change occurred.


### Phase 12 pre-release infrastructure audit — 2026-08-30
Phase 12 execution contract PR #74 merged as `c03e26c683c9c7c430c0e55cc306f5889f004844`. The following evidence remains the starting baseline for 12A; merge itself performed no deployment or production mutation.

This is read-only contract evidence, not rollout authorization.

- Contract-start repository `main`: `d8fa1fc754c4e5bdc3648177fb7f833218dc1d95`. Phase 11 merge: `46c5daa2866c6758907ee9be219bcb3cb274ca83`.
- Connected Vercel project `renderlab` (`prj_UGFbrAJ0fg2H0cZOznBoCZ8RCsJU`) reports framework `nextjs`; production domains include `renderlab-lake.vercel.app` and `renderlab.faresuniform.uk`. Repository `vercel.json` continues to disable automatic Git deployment.
- Current READY production deployment is `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` from GitHub application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca`. The compare from `c8e9943dd90cba5971f4dcfcd591445608ce46ca` to `d8fa1fc754c4e5bdc3648177fb7f833218dc1d95` is 216 commits ahead and includes executable application/API/workflow/migration-contract changes from Phases 7–11. Phase 12 must validate a current exact release candidate before any authorized deployment rather than using old-production health as a proxy.
- Vercel reported no grouped runtime errors in the inspected seven-day production window. This demonstrates current deployed-baseline health only; it says nothing about the undeployed current-main executable delta.
- Supabase Phase 11 post-merge fixture audit returned zero RenderLab fixture Auth users, account-access rows, generation jobs/sources/admission reservations, media assets/collections/items/upload sessions and invitations. Migrations remain applied through `20260830101734 renderlab_generation_admission` (`0012`).
- Fresh Security Advisor evidence remains expected INFO `rls_enabled_no_policy` on deliberately server-owned RenderLab tables plus WARN `auth_leaked_password_protection`; no new DDL finding was introduced. Fresh Performance Advisor evidence remains INFO for the one-row `renderlab_beta_settings.updated_by` FK plus unused indexes; Phase 12 does not create a schema migration solely to silence these informational notices.
- Production closed-beta enforcement remains off pending the known-RenderLab UUID bootstrap. Production Auth Site URL/redirect/template/sender/custom-SMTP evidence is still incomplete and built-in mail/rate-limit plus Free-plan leaked-password limitations remain explicit. Phase 12A audits these without mutation; Phase 12B may address production rollout prerequisites only after explicit authorization.
- R2/browser upload contract remains the existing owner-scoped signed-PUT flow and exact-origin CORS model. Phase 12A may verify its current state non-mutating; any CORS reconciliation is a production mutation and belongs only to an explicitly authorized rollout.

### Account identity boundary — UI-029
Supabase Auth `auth.users.id` is the canonical RenderLab account principal.

Session architecture:
```text
Settings browser
  -> Supabase Auth email/password sign-in or account creation
  -> Supabase SSR cookie session
  -> root Next.js proxy refreshes/rotates cookies
  -> Server Components/services re-confirm current Auth user for private product authorization
  -> RenderLab account identity = fresh auth.users.id
```

Rules:
- Vercel/runtime configuration uses `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`; `next.config.ts` maps those public-safe values into the existing browser-facing `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` bundle keys. The publishable key is not a service credential;
- `SUPABASE_SERVICE_ROLE_KEY` remains server/CI-only and is never used by product browser code;
- private server account identity uses fresh Supabase `auth.getUser()` state rather than trusting an unverified browser-supplied user ID or a revoked-but-unexpired JWT;
- UI-029 itself added no owner columns or account-scoped media/job persistence;
- UI-030 satisfies the ownership-isolation prerequisite for personal organization; UI-031 Favorites and UI-032 Collections are approved separate organization slices. UI-033 owns the approved single-asset tombstone/R2/history semantics; UI-034 composes that contract for page-scoped best-effort batch Delete without a new schema migration.

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

### Durable media deletion boundary — UI-033 / PR #25 (approved)
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

Final verification: exact head `53b0eb4c648b47a17fee2e735b7dddc85d345518` passed all 15 affected PR gates, including Media Delete `33218433320`, Account Ownership `33218433329`, Generation `33218433335`, Video Generation `33218433309`, Favorites `33218433314` and Collections `33218433301`. Configured Delete verification covered two-account denial, database cleanup, R2 primary/thumbnail purge, preserved generation history, idempotent retry, rejected post-delete generation reuse, responsive confirmation UI and exact cleanup. PR #25 merged as `40945ff8c4c7e3a3db0e115c4d7cae9f50db4445`; merged-`main` UI Shell `33218646377`, Reference Upload `33218646539`, Generation Integration `33218646527`, and Video Generation `33218646602` passed.

Final pre-merge and post-merge shared-resource audits returned all six RenderLab tables and configured fixture users to zero, with six RLS-enabled tables, six non-null owners, zero browser grants, nullable deletion timestamps, deletion guards and the active-media index intact. Vercel listed zero RenderLab deployments created after the PR #25 merge, preserving the disabled automatic-Git-deployment boundary. Post-`0009` security advisors report only expected `rls_enabled_no_policy` INFO for deliberately server-owned tables; performance advisors report unused-index INFO only, including the new active index on the currently empty/low-traffic dataset. No advisor requires a UI-033 schema change.

UI-034 now implements page-scoped batch selection and best-effort per-item Delete by composing the UI-033 contract. Cross-page selection, global atomic multi-delete, retention/recovery, batch Favorites/Collections and collection deletion remain separate future contracts.

### Library Batch Delete boundary — UI-034 / PR #29 (approved)
UI-034 adds no schema migration or storage namespace. `POST /api/media/assets/batch-delete` accepts at most 24 deduplicated durable UUIDs under the verified owner and sequentially composes the existing idempotent UI-033 delete contract per item. Completed tombstones/purges are never rolled back because another selected item fails; foreign/missing IDs collapse to per-item not-found and cleanup-pending success remains truthful/retryable.

Final exact head `1e634fe9a582b8a7676cb70cfc7bcd5754f613ce` passed all 16 affected gates: Library Batch Delete `33220710307`, Account Ownership `33220710301`, UI Shell `33220710365`, Create Lifecycle `33220710378`, Library Search `33220710297`, Library History `33220710393`, Library Lifecycle `33220710305`, Library Drag Drop `33220710389`, Persistent Media Upload `33220710300`, Media Download `33220710329`, Media Rename `33220710371`, Library Favorites `33220710303`, Library Collections `33220710404`, Media Delete `33220710375`, Generation Integration `33220710351`, and Video Generation `33220710347`. PR #29 merged as `8b0b0339f216f3ce704d965ef005b2cd020f3ae8`; merged-`main` UI Shell `33221101101`, Generation Integration `33221101106`, and Video Generation `33221101117` passed. The final post-merge audit found zero rows in all six RenderLab tables, zero configured fixture users, six RLS-enabled tables, six non-null owners, zero browser grants, nullable `deleted_at`/`purged_at`, all three deletion-integrity triggers and `media_assets_owner_active_created_at_idx` intact, with `20260828221611 renderlab_media_asset_deletion` still the latest migration. Vercel listed zero deployments created after the PR #29 merge, preserving the disabled automatic-Git-deployment boundary.

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

### Phase 9 cancellation safety audit — product Cancel deferred
Configured FLUX/REDGraft gateways have previously reported cancellation capability, but the RenderLab orchestration itself is not currently cancellation-safe enough for a user-facing promise. There is no owner-scoped cancel product route/service and the authenticated external backend adapter defines submit + poll only. More importantly, native `pollNativeGeneration` can already be inside a safe standby reassignment or successful-result persistence while a hypothetical cancel request changes local state; `reassignPollJob` has no cancellation lease/token check and `persistResult` writes R2/media then marks success without a cancellation-aware conditional state/version guard. A local `cancelled` row therefore cannot yet prove that no standby was submitted and no late durable result can appear.

UI-050 consequently **does not implement Cancel**. A future cancellation contract must define provider cancellation for native + external paths, eligible execution states, atomic/conditional state ownership, interaction with poll-time failover, late-result suppression/cleanup, repeated cancel semantics and exact verification before exposing a control. If that requires a schema version/lease/cancel-request field, it must be an explicit migration decision rather than hidden inside Phase 9 Retry. No live cancellation spend is required to establish this current blocker.

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
- Phase 7A source-aware geometry — exact head `789358e8a276ab54d8eeae7e4b7dcb64c2c4c60f` passed live image geometry `33258831654`, live video geometry `33258831636`, responsive Create Lifecycle `33258831638`, and after a pre-job concurrency cancellation, a same-head Library Lifecycle retrigger `33259411170`; the complete same-head 20-workflow retriggered suite passed before PR #47 merged as `de50efe6ba462ec604ea2cace741e11904a62425`. Geometry verification cleaned its generated media/jobs/reference/Auth fixtures.

Search/upload/download/rename/account configured verifiers do not invoke ComfyUI. Generation Image/Edit and Video/Animate verifiers do invoke the configured worker fleet.

## External Generation Boundary
Current product generation routing is:
1. an intentionally configured **authenticated external RenderLab backend** only when both `RENDERLAB_GENERATION_BACKEND_URL` and `RENDERLAB_GENERATION_BACKEND_TOKEN` are present;
2. RenderLab-native orchestration when shared Supabase/R2 credentials are configured;
3. otherwise a truthful generation-backend-unavailable state.

For the external path, RenderLab sends `Authorization: Bearer <server-token>` plus `x-renderlab-owner-id` on submit and poll. The external service must authenticate the bearer token before trusting the forwarded owner ID. A bare owner header is not an authorization boundary.

The transitional Studio compatibility adapter has been removed after repository audit confirmed it was not part of current product generation routing. RenderLab no longer recognizes a Studio compatibility runtime URL; generation stays on the authenticated external RenderLab backend or RenderLab-native orchestration described above.

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
- `DELETE /api/media/assets/:assetId` — UI-033 owner-scoped tombstone + R2 purge
- `POST /api/media/assets/batch-delete` — UI-034 page-bounded best-effort composition of UI-033 Delete
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
- `CLOUDFLARE_API_TOKEN` — optional zone-DNS token for Cloudflare-managed custom-domain records; its presence does not imply R2 administration authority
- `RENDERLAB_GENERATION_BACKEND_URL` — optional external RenderLab generation service; only active together with the token below
- `RENDERLAB_GENERATION_BACKEND_TOKEN` — server-only bearer secret required to authenticate the optional external generation service before `x-renderlab-owner-id` is trusted

## Cycle 2 Phase 6 Production Baseline — 2026-08-29

Phase 6 performed a fresh, non-deploying production/custom-domain/shared-resource audit through GitHub Actions run `33250031468` plus read-only Vercel/Supabase inspection.

### Repository and Vercel reconciliation
- Audit-starting repository `main` was `5072fe96495ea53d06f4891c6073b16203c819d2`.
- Actual READY production deployment remains `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` from application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca`. The complete repository delta from that production SHA to the audit-starting `main` is documentation-only (`AGENTS.md`, `PROJECT.md`, `UI_DECISIONS.md`, `UI_MIGRATION.md`), so production has no executable application/package/schema drift relative to current source.
- The latest production build ran `scripts/verify-vercel-env.mjs` successfully and reported the canonical production environment contract complete. Phase 6 verified environment names/presence through that preflight and did not read or expose secret values. Current Vercel connector capability does not enumerate optional secret values, so optional external-backend configuration is not inferred from absence/presence guesses.
- No Vercel deployment was created by the Phase 6 audit branch; automatic Git deployment remains disabled. Vercel reported no runtime error cluster in the audit window.

### Custom domain
- Fresh public DNS verification returned `renderlab.faresuniform.uk` CNAME → `736ea4abfec91fb9.vercel-dns-017.com`.
- Fresh HTTPS returned `200` with Vercel edge headers. TLS 1.3 verification succeeded with a certificate whose CN/SAN includes `renderlab.faresuniform.uk`, issued by Let's Encrypt and valid through 2026-11-27.
- The real production custom-domain persistent browser upload → Library → Viewer → Edit continuation lifecycle passed in 16s and exact fixture cleanup succeeded; the approved signed-R2/exact-origin CORS/storage identity contract remains unchanged.

### Production application and worker baseline
- Account session lifecycle passed in 7s; two-account ownership/privacy verification passed in 15s.
- Create Image → durable Edit continuation passed in 91s total on native FLUX primary routing with no observed failover. Create Video + Animate passed in 155s total on native REDGraft primary routing with no observed failover. One sampled 5-second Create Video job was about 101s from product-job creation through durable completion.
- Deployed FLUX gateway health reported async jobs, cancel capability and `multiple_references=true`; a two-reference live probe completed successfully in about 12.6s.
- Deployed REDGraft runtime health reported NVIDIA A10, enabled `480p`/`720p`/`1080p`/`2K`, 24/25/30 fps and disabled `4K`. A bounded 720p 16:9 5-second 24-fps probe produced 1280×720 MP4 in 62.7s total, about 59.0s reported worker time.
- These timings are one bounded audit sample, not SLAs. Worker source serializes each container invocation; exact deployment-wide autoscaling/capacity and provider per-generation billing/cost are not reliably exposed by current health/product contracts and remain unresolved rather than estimated.
- RenderLab currently has no app-level per-user generation rate/concurrency/abuse limiter. Broader beta access therefore requires a separate server-enforced capacity/abuse contract in Phase 10; Phase 6 does not add one.

### Phase 7C live REDGraft gateway contract — 2026-08-29
- Audit `33266905978` queried both configured REDGraft gateway `/health` and `/openapi.json` endpoints plus primary `/runtime-health`; no generation job was spawned. Primary/standby both report gateway build `a10-normalvram-poster-v2`, runtime `saga-ltx25-video` / `LTX25Worker`, async jobs and cancellation capability.
- Both deployed gateways expose the same `/jobs/video` fields: `prompt`, `negative_prompt`, `seed`, `resolution`, `duration_seconds`, `audio_enabled`, `aspect_ratio`, `frame_rate`, and optional single `image_file`. No structured Director/storyboard/multi-frame/dialogue/speech/sound/audio-prompt/camera/shot fields are present.
- Primary runtime health remained ready on NVIDIA A10 with enabled `480p`, `720p`, `1080p`, `2K` and frame rates 24/25/30. This confirms the Phase 7D resolution basis while UI-047 defers Director UI under the current worker contract.
- Live/source drift exists: current Saga reference source contains gateway `steps`/`cfg`, but deployed OpenAPI does not. A deliberately invalid, non-generating request sent `steps=999`, `cfg=999`, and `duration_seconds=1`; the deployed gateway returned only the duration validation error, confirming `steps`/`cfg` are not active live inputs. RenderLab currently serializes those extras for Video, so product capability documentation/UI must be reconciled before the next Video slice is accepted.

### Shared Supabase and cleanup baseline
- Final post-run audit found **zero Phase 6 fixture rows** across all six RenderLab tables and **zero Phase 6 Auth users**. Pre-existing non-fixture product data was deliberately left untouched.
- All six RenderLab tables retain RLS, `owner_id NOT NULL`, zero `anon`/`authenticated` table grants and their expected ownership/integrity triggers. Latest migration remains `20260828221611 renderlab_media_asset_deletion`.
- Security advisors continue to report informational `rls_enabled_no_policy` notices for the deliberately server-owned tables; this matches the zero-browser-grant architecture. They additionally report `auth_leaked_password_protection` WARN because leaked-password protection is disabled. Treat that as a beta-readiness item; Phase 6 makes no Auth configuration mutation.
- Performance advisors report unused-index INFO only; no Phase 6 schema change is justified by those notices.

### Cycle 2 operating-boundary implication
The verified technical baseline is healthy for continued controlled use. The user explicitly selected **Closed Beta** as the Cycle 2 operating boundary on 2026-08-29. Because app-level generation rate/concurrency/abuse controls are absent, provider cost is not product-observable and leaked-password protection is disabled, access remains controlled until Phase 10 hardens broader-access requirements. Any move to broader beta is a separate explicit decision.

## Security Rules
- Never commit service-role/R2/provider/backend bearer credentials.
- Only the Supabase project URL and publishable key are intentionally exposed to browser code. `next.config.ts` maps those public-safe values from `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`; service-role and R2 credentials must never be published.
- Supabase Auth `auth.users.id` remains the canonical account principal; do not trust a browser-supplied owner ID.
- Raw `generation_sources`, `generation_jobs`, `media_assets` and `media_upload_sessions` stay server-owned. Browser roles have no direct table grants; product routes/services enforce owner scope while using server-only service-role access.
- Keep RLS enabled on all six current RenderLab tables. No browser RLS policy is required while browser roles have no direct grants; if the access architecture changes later, define owner policies deliberately before granting table access.
- An external generation service must authenticate the server-only bearer token before trusting `x-renderlab-owner-id`; owner headers alone are not authorization.
- UI-030 ownership rollout is complete: owner-aware code is live, the no-unowned-row gate passed and corrected `0005` is applied/verified. Preserve that boundary for all current and future private product state; do not weaken owner scope or browser-grant isolation when adding Cycle 2 features.
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
- `verify-activity.mjs` + `activity-visual.yml` — two-account generation-history privacy, lifecycle/status rendering, internal-error redaction, active-result filtering, bounded pagination, responsive screenshots and exact cleanup
- `verify-media-upload.mjs` + `media-upload-integration.yml`
- `verify-library-lifecycle.mjs` + `library-lifecycle-visual.yml` — shared-resource lifecycle is serialized and exact durable fixture identity is used for browser targeting
- `verify-library-batch-delete.mjs` + `library-batch-delete-visual.yml` — page-scoped selection, per-item partial success, R2/database cleanup, ownership isolation, idempotence and responsive confirmation
- `verify-library-search.mjs` + `library-search-visual.yml`
- `verify-media-download.mjs` + `media-download-visual.yml`
- `verify-media-rename.mjs` + `media-rename-visual.yml`
- `verify-account-identity.mjs` + `account-identity-visual.yml` — exact run-owned confirmed Auth user, real Settings session lifecycle, responsive screenshots and exact cleanup; now also validates the canonical `SUPABASE_PUBLISHABLE_KEY` → browser-bundle mapping
- `verify-account-ownership.mjs` + `account-ownership.yml` — two-account private-record isolation, signed-out denial, foreign opaque-ID denial, raw table-access denial and exact fixture cleanup
- `verify-reference-upload.mjs` + `reference-upload-integration.yml` — owner-bound temporary source persistence
- `verify-generation-bridge.mjs` + `generation-bridge-integration.yml` — owner-bound Create Image/Edit Image persistence and continuation plus actual output-dimension assertions for fixed Create geometry, Edit `Original` and explicit Edit override
- `verify-video-generation.mjs` + `video-generation-integration.yml` — owner-bound Create Video/Animate Image plus temporary reference ownership; CI installs `ffmpeg`/`ffprobe` so real persisted MP4 dimensions verify fixed Video and source-derived Animate `Original` geometry
- `verify-vercel-env.mjs` + `deployment-readiness.yml` — non-deploying Next.js/Vercel configuration, canonical Vercel environment preflight and production-build gate
- `ensure-r2-browser-cors.mjs` for idempotent exact-origin upload-CORS reconciliation

### Browser upload CORS — custom production domain / PR #36
A production browser upload reported as `Failed to fetch` from `https://renderlab.faresuniform.uk` was traced to Cloudflare R2 CORS origin coverage for the direct signed PUT. The approved upload API/session/ownership contract did not change.

PR #36 adds `https://renderlab.faresuniform.uk` to the canonical `RENDERLAB_BROWSER_UPLOAD_ORIGINS` used by configured Library lifecycle and drag/drop validation. Final head `a66bcff942efa82b9823f031b25487e97eeb3fa6` passed Library Lifecycle `33238196620` and Library Drag Drop `33238196599`; configured verification received a successful `204` PUT preflight and completed the real ticket → signed PUT → completion → HEAD verification → durable promotion lifecycle. PR #36 merged as `0d4f05980e78a3c3b29beb68e91ebf0e225d2815`; merged-`main` Generation Integration `33238360406`, Video Generation `33238360399`, and UI Shell `33238360429` passed.

This maintenance changes no Supabase schema, browser credential boundary, R2 key exposure, upload data model or account ownership semantics. Future public browser origins still require deliberate CORS addition and configured validation before use.

### Custom-domain DNS and Cloudflare credential roles — 2026-08-29
`renderlab.faresuniform.uk` is configured in the Cloudflare `faresuniform.uk` zone as a **DNS-only** `CNAME` to Vercel's assigned target `736ea4abfec91fb9.vercel-dns-017.com`. Cloudflare API read-back and public DNS-over-HTTPS both verified that exact record after creation.

The repository secret `CLOUDFLARE_API_TOKEN` is deliberately scoped for zone DNS editing and must not be treated as proof of R2 administration authority. `scripts/ensure-r2-browser-cors.mjs` may try the Cloudflare R2 API when that token is present, but an R2 authorization `401`/`403` is a credential-role mismatch, not an upload/CORS failure; the script must fall back to the existing R2 S3 credentials and continue exact-origin reconciliation/probing. Non-authorization Cloudflare API errors remain hard failures.

This DNS change does not enable automatic Git -> Vercel deployment and does not change the RenderLab upload/session/ownership model. The custom-domain browser upload origin remains explicitly approved as documented above.

## Infrastructure Operating Rules
Cycle 2 production is accepted and Phase 13 — Email & Invite Production Hardening is `CONTRACTED / NOT STARTED` as the first planned Cycle 3 phase. The Phase 13 planning contract authorizes no SMTP/provider signup or purchase, Cloudflare DNS mutation, hosted Supabase Auth mutation, live email send, Vercel deployment or application change until the user explicitly authorizes implementation.

1. Keep GitHub validation and Vercel deployment separate: deployment-readiness changes must be exact-head green on GitHub before any explicit rollout; a repository merge is never implicit permission to deploy or apply a future schema change.
2. Add any future public upload origin explicitly to R2 CORS before deployment/use.
3. Keep Library/Activity against RenderLab-owned `media_assets`/`generation_jobs`, never legacy `studio_*`.
4. Preserve conservative duplicate-avoidance if worker routing evolves.

## Phase 10 Contract Audit — Account/Admin/Admission
**Audited:** 2026-08-30 against merged `main` `ced9632e343a89ac9a815175835b6f3899eac10d` and the live shared Supabase project.

### Current facts
- Supabase project `rashyleshocuvpgcooxy` is `ACTIVE_HEALTHY` in `eu-west-1` on Postgres 17.
- Security Advisor still reports `auth_leaked_password_protection` WARN. The remaining RLS/no-policy notices are INFO for RenderLab server-owned tables whose anon/authenticated privileges are intentionally revoked.
- There is no RenderLab account/admin/limit schema yet. Existing migrations stop at `0009_media_asset_deletion.sql`.
- App-level generation rate/concurrency/abuse controls remain absent. Supabase Auth endpoint rate limits do not protect RenderLab generation/provider spend.
- Current Settings exposes self-service Auth sign-up despite the chosen Closed Beta operating boundary. Current verified account identity has no RenderLab role/admission state.
- The project is shared infrastructure. `auth.users` can contain identities unrelated to RenderLab, so Phase 10 must not auto-backfill or expose the full Auth namespace.

### Accepted Phase 10 infrastructure boundary
- Introduce RenderLab-prefixed server-owned access/invitation/settings/admission records with RLS enabled and zero browser grants. No legacy application table is reused.
- Production access enforcement is a deliberate rollout step: an operator must supply exact known RenderLab user UUIDs for bootstrap/import. No migration infers membership by scanning shared Auth users, email domain, existing provider data or unrelated application records.
- Supabase Auth Admin invite/user/link operations remain server-only. The service-role key stays server/CI-only and must never reach browser code or Admin payloads.
- Generation admission is reserved transactionally before any native/external backend request so the RenderLab application, not the worker/provider, owns spend/abuse limits. The default one-active/12-hourly values are operational guardrails only.
- New SQL functions must revoke execute from public/anon/authenticated, use explicit search paths and be included in Security Advisor/browser-grant verification.
- Password recovery/invite email URLs/templates must match the RenderLab SSR PKCE callback. Current Supabase guidance recommends custom SMTP for production reliability; record actual hosted-project SMTP/template/redirect configuration before broader beta rather than assuming built-in delivery is sufficient.
- Leaked-password protection should be enabled and advisor-cleared when the project plan supports it. If not supported, the warning remains a documented broader-beta blocker; do not compensate by claiming an equivalent RenderLab implementation.
- No infrastructure action in the contract PR applies migrations, changes hosted Auth configuration, changes Vercel deployment settings or deploys the application.

## Phase 10A Closed-Beta Admission Schema
**Status:** APPLIED / VERIFIED, application enforcement not enabled in production.

- Repository migration: `supabase/migrations/0010_renderlab_account_admission.sql`.
- Hosted migration: `20260829234212 renderlab_account_admission` on the approved shared RenderLab Supabase project.
- `renderlab_account_access`: server-owned RenderLab role/status keyed by canonical Auth UUID.
- `renderlab_beta_invitations`: server-owned normalized-email invitation/claim state.
- `renderlab_claim_beta_invitation(uuid,text)`: SECURITY DEFINER, empty `search_path`, public/anon/authenticated execute revoked, service-role-only execute.
- Both tables: RLS enabled; anon/authenticated direct DML revoked; service role has required DML. Security Advisor therefore reports expected server-owned `rls_enabled_no_policy` INFO notices; the existing leaked-password-protection warning is unchanged and remains 10D operational work.
- Final exact-head CI cleanup returned both new tables to 0 rows. No migration scans/backfills `auth.users`; the shared Auth namespace is not a RenderLab directory.
- `RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED` defaults off. Before enabling production enforcement, an operator must supply the exact known RenderLab Auth UUID bootstrap set. Enabling is a separate explicit operational step, not implied by migration/merge.
- Phase 10A exact code/test head `e36140911c63527927ef404d1befa7670d590f8a` passed all 20 affected workflows; Account Identity artifact `9723305472` was visually reviewed. No Vercel deployment was created or authorized.


### Phase 12A release-candidate infrastructure verification — 2026-08-30
PR #75 merged the non-deploying release machinery to `main` as `d6b8f386db3893e583c99b23fc3397b0eb377d42`. Exact-main Deployment Readiness `33335278699`, Integrated Release `33335278694`, and Release Candidate Matrix `33335278667` passed; manifest artifact `9739024806` (`sha256:8185cadab7ab1d20468c476b42486285d084bc56b4aa3dddaed035f77f8d5ab1`) records 23/23 configured child workflows at terminal success on that SHA.

The permanent release matrix first requires exact-SHA whitespace/verifier-syntax/UI-purity/TypeScript/production-build preflight, then dispatches the existing configured feature/integration workflows at the same candidate ref and waits for terminal success. On pull-request branches it quiesces stale branch-owned workflow-dispatch runs and retries bounded concurrency cancellations; on `main` it never cancels existing runs. A cancelled run is never accepted as success.

`Integrated Release` is a provider-cheap cross-surface continuity verifier: it uses a run-owned authenticated mock generation backend for Account → Create → durable R2-backed result → Library → Viewer/organization → Edit reuse → Activity Retry while preserving the existing live Generation Integration and Video Generation workflows as the authoritative provider-mapping checks. It performs exact cleanup and uploads bounded release screenshots. Exact-main artifact `9738853882` (`sha256:b8b9d48d1f97a93595ff6691708b4a2c5f13d33c0c01c785c7b6f5e35afdd8a6`) was human-reviewed clean; exact-main Create Lifecycle artifact `9738873955` (`sha256:78eb279abb14492cd63550f2c4363bd37c6f6ea4add29e7dd572959d2327137e`) completed narrow/reduced-motion Create review.

Release R2 CORS verification is now explicitly read-only through `scripts/verify-r2-browser-cors.mjs`: it uses existing object credentials only to construct a signed PUT URL and sends OPTIONS preflights for the canonical browser origins. It does **not** call Cloudflare/S3 CORS mutation APIs and does not upload an object. `scripts/ensure-r2-browser-cors.mjs` remains the separate reconciliation tool and must not be used as a read-only audit substitute.

Final post-matrix shared-resource audit found zero release-created Auth users/jobs/sources/assets/uploads/collections/items, zero RenderLab access/invitation/admission-reservation fixtures, restored generation defaults enabled / 1 active / 12 hourly / no updater, and zero audited owner/orphan integrity mismatches. Existing legitimate project media/history predating 12A remains intentionally preserved. RLS/browser-grant/function-privilege and advisor posture remain unchanged from the verified Phase 10 boundary.

Vercel production remains unchanged at READY deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` / application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca`; automatic Git deployment remains disabled and PR #75/12A created no deployment. Phase 12A therefore closes as `RELEASE CANDIDATE VERIFIED / DEPLOYMENT NOT AUTHORIZED`. Any production rollout, UUID bootstrap/access enforcement, hosted Auth configuration or infrastructure mutation belongs to separately authorized Phase 12B.


### Phase 12B rollout preflight — Auth URL blocker — 2026-08-31
Phase 12B received explicit rollout authorization for exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42`, but production deployment remains blocked by hosted Supabase Auth URL configuration.

The sole persistent RenderLab account was bootstrapped before enforcement with one `renderlab_account_access` row: `admin` / `active`, no per-account generation overrides. Verification found exactly one active account and one active admin. The account UUID is operational/private data and is intentionally not copied into repository documentation. Closed-beta enforcement remains off.

Vercel preflight `33336831850` used the existing repository `VERCEL_TOKEN` without exposing it and verified all seven required production Supabase/R2 environment keys are present. `RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED` is absent and intentionally remains absent while the Auth gate is open. No deployment was created.

Exact-candidate preflight `33336966309` checked out `d6b8f386db3893e583c99b23fc3397b0eb377d42` and passed read-only R2 CORS OPTIONS probes for `renderlab-lake.vercel.app`, `renderlab.faresuniform.uk` and the two canonical Vercel aliases. Its no-email Supabase Admin generate-link probe then requested recovery redirect `https://renderlab.faresuniform.uk/auth/confirm?type=recovery&next=/settings/password`; hosted Auth returned `redirect_to=http://localhost:3000`, proving the production redirect is not currently accepted and the Site URL remains a local fallback.

Supabase documents Site URL as the default redirect and requires `redirectTo` destinations to match the configured Redirect URLs. For production it recommends exact redirect paths. Before rollout resumes, configure Site URL `https://renderlab.faresuniform.uk` and exact redirects `https://renderlab.faresuniform.uk/settings` plus `https://renderlab.faresuniform.uk/auth/confirm?type=recovery&next=/settings/password`, then rerun the no-email link probe. Management API endpoint is `PATCH /v1/projects/rashyleshocuvpgcooxy/config/auth`, but GitHub Management API preflight `33337036024` confirmed no `SUPABASE_ACCESS_TOKEN` secret is currently available, and the connected Supabase tool does not expose hosted Auth URL mutation.

This blocker does not alter the broader-beta findings: built-in Supabase email/rate-limit posture and Free-plan leaked-password protection remain documented limitations. Existing production/rollback remains READY deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` at application SHA `c8e9943dd90cba5971f4dcfcd591445608ce46ca`. Do not add enforcement or deploy until the Auth URL probe passes.


### Phase 12B accepted Closed-Beta production rollout — 2026-08-31
Phase 12B is `COMPLETE / VERIFIED` for the Cycle 2 Closed-Beta operating boundary. Exact 12A-verified application SHA `d6b8f386db3893e583c99b23fc3397b0eb377d42` is the accepted production application.

The earlier Auth URL blocker was resolved by run `33337864235`: Supabase hosted Auth Site URL is now `https://renderlab.faresuniform.uk`; exact production redirect destinations `https://renderlab.faresuniform.uk/settings` and `https://renderlab.faresuniform.uk/auth/confirm?type=recovery&next=/settings/password` are configured, and no-email generated invite/recovery links preserved those destinations. The sole persistent RenderLab account remains exactly one active admin with no per-account generation overrides. Vercel production `RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED=true` is active.

Required production Supabase/R2 env presence was reconfirmed in `33336831850`; read-only exact-origin R2 CORS preflight passed in `33336966309`. Final clean deployment run `33338162385` deployed pristine exact candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` as Vercel deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`. Vercel reported `READY`, exact candidate SHA and `gitDirty=0`. Stable aliases and custom domain route to the release. `https://renderlab.faresuniform.uk/` returned HTTP 200 with HSTS and the Phase 11 Brand / Landing metadata/content. Error/fatal runtime-log inspection for the rollout/smoke window returned no entries.

Bounded production smoke `33338323520` ran against `https://renderlab.faresuniform.uk` while explicitly checking out the exact candidate. It passed public Landing/Create/Settings routes, signed-out denial and two-account ownership/privacy, browser-table denial, durable Create upload → Library → Viewer → Create reuse, real Create Image, failed-job Activity Retry with immutable history and a real 5-second 480p Create Video. All generated/uploaded smoke media, DB rows and R2 objects were cleaned. The generic Admin verifier then reached a production-only assumption: its run-owned admin was not the last active admin because the persistent bootstrapped admin correctly existed. All earlier Admin/UI assertions had passed and its cleanup completed. Production-specific Admin follow-up `33338643898` passed signed-out/member denial, active-admin Settings/Accounts/Health/Admin page, self-lockout, member suspend/reactivate and cleanup without mutating the persistent admin.

Production Admin artifact `9739796661` (`sha256:b360b8674566d95d8ad34bb384fa97e302a7d7628de974bf6e307058cade165c`) from `33338323520` was human-reviewed clean on desktop and 390px narrow: no horizontal clipping, broken controls or hierarchy regression. Final `33338643898` audit returned zero run-owned Auth fixture users, zero non-persistent owner rows across generation jobs/sources/media assets/upload sessions/collections, zero generation admission reservations and zero open beta invitations. Final access state is one active persistent admin with no overrides; singleton admission defaults are `generation_enabled=true`, `max_active_jobs=1`, `max_jobs_per_hour=12`, `updated_by=null`.

Pre-rollout deployment `dpl_DeFYMv7DNHqXfPF2himBMsUK5hEL` remains the documented rollback baseline. Automatic Git → Vercel deployments remain disabled. Documentation-only commits may place repository `main` ahead of deployed application SHA; this does not make the docs head an application release candidate. A future production release requires a separately verified candidate/release scope.

Closed-Beta Cycle 2 acceptance does not resolve broader-beta Auth hardening. Supabase built-in mail/rate-limit posture and Free-plan leaked-password protection remain documented limitations; custom SMTP/sender/template productionization belongs to a separately scoped broader-access cycle.


### Phase 13 Email & Invite Production Hardening infrastructure contract — 2026-08-31
**Status: `CONTRACTED / NOT STARTED`.** This section defines the infrastructure acceptance boundary only; it does not authorize production mutation.

Current Closed-Beta production already has the application-side admission and security contract needed for external invites: admin-only invitation creation/revocation, server-owned `renderlab_beta_invitations`, active account enforcement, fresh Auth-backed private authorization, token-hash invite/recovery confirmation and no public sign-up. Phase 12B corrected hosted Auth Site URL to `https://renderlab.faresuniform.uk` and verified exact invite/recovery redirects. The remaining weakness is mail delivery infrastructure, not account ownership architecture.

Phase 10D live evidence showed Supabase built-in Auth delivery from `noreply@mail.app.supabase.io` and an `over_email_send_rate_limit` response. That built-in posture remains acceptable for deterministic technical verification only; Phase 13 must replace it for production invite/recovery delivery before broader external-beta reliance.

Accepted Phase 13 infrastructure sequence:
1. Read actual hosted Auth mail/template/rate-limit state and current `faresuniform.uk` sender DNS before mutation. Reuse the approved shared Supabase project; do not create another Auth project.
2. Operator selects and provisions one production transactional delivery mechanism: Supabase custom SMTP with a transactional provider, or an equivalent Supabase Send Email Auth Hook. Vendor/account/plan choice and costs require explicit operator acceptance.
3. Establish one RenderLab transactional sender identity under `faresuniform.uk`. Provider-required DNS must be applied through the existing Cloudflare zone with preservation of unrelated records: avoid multiple SPF records, verify provider DKIM, and configure/document DMARC policy/reporting. DNS authentication must be publicly resolved and provider-verified before live acceptance.
4. Configure Supabase/provider sender/from/reply posture, bounded invitation-only email limits and invite/recovery templates. Templates must use the existing SSR token-hash paths through `{{ .SiteURL }}`: invite `/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/settings`; recovery `/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/settings/password`.
5. Disable click/link tracking or URL rewriting for Auth mail. Authentication tokens, raw confirmation URLs, provider keys and recipient addresses must not be emitted into repository logs or durable docs.
6. Keep normal CI free of real email delivery. Use generate-link and browser/security tests for deterministic coverage; reserve actual sends for a bounded operator-gated acceptance run.
7. Live acceptance must cover real external receipt and browser completion for an invite and recovery on `renderlab.faresuniform.uk`, with at least two independent mailbox providers where practical, provider delivery/bounce evidence, Inbox/Spam observation, consumed/revoked/invalid-link failure and exact fixture cleanup.
8. Final audit preserves the sole persistent production admin, zero run-owned access/invitation/Auth/admission/media/generation residue and generation defaults enabled / 1 active / 12 hourly / no updater.
9. Credential hygiene is part of acceptance. SMTP/API/management credentials remain secret-store-only. Any privileged Supabase Management API credential used for bounded configuration must be reviewed after the phase and narrowed, rotated or removed when continuing retention is not justified.

Phase 13 requires no Supabase database migration, R2 change, worker/provider-generation change or Vercel deployment when completed purely as email/Auth/DNS configuration. If live testing exposes an application defect, make only the smallest code correction, validate a new exact application candidate through affected gates and obtain deployment authorization before replacing the accepted Cycle 2 production build.

The Free-plan leaked-password-protection warning is intentionally separate from this email phase. Phase 13 may improve delivery reliability and sender trust, but it must not claim broader-beta security completion until leaked-password protection and any other separately contracted requirements are actually resolved.
