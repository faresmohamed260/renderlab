# Screen Registry

Tracks approved product surfaces and actual route/status/component composition.

## Statuses
- `PLANNED` — approved surface, not yet implemented beyond temporary scaffolding
- `UNAUDITED` — implementation exists but has not been audited
- `MIGRATING` — implementation is actively being brought to the approved RenderLab design
- `APPROVED` — rendered implementation has been reviewed and approved
- `LOCKED` — approved surface whose established design should not change without explicit product reason

## Initial Information Architecture
Primary: **Create**, **Library**. Utility: **Activity**, **Settings**. Contextual: **Media Viewer**.

Models, Workflows, separate Image/Video apps, separate Edit/Animate/Upscale apps and ComfyUI graph/node surfaces are not initial top-level destinations. Adding a backend workflow does not create a top-level screen by default. Cycle 2 now plans a **privileged Admin** surface in Phase 10 and a **Brand/Landing** surface in Phase 11; both remain route-TBD planning items until their phase contracts lock information architecture.

## Application Shell
**Status:** APPROVED  
**Implementation:** `src/components/shell/app-shell.tsx`

Approved behavior:
- compact persistent desktop left navigation;
- Create/Library primary, Activity/Settings secondary;
- compact route-context top bar;
- feature surfaces own route content, not the shell;
- narrow layouts use bottom navigation for primary destinations;
- touch-friendly semantic navigation.

`APPROVED` does not mean `LOCKED`.

## Screens

### Create
**Route:** `/`  
**Status:** APPROVED  
**Implementation:** `src/features/create/create-workspace.tsx`  
**Supporting:** `src/features/create/create-advanced-panel.tsx`  
**Design artifacts:** `design/penpot/create-v0.2-desktop.svg`, `design/penpot/create-v0.2-mobile.svg`, `design/penpot/create-v0.2-runtime-states.svg`, `design/penpot/create-v0.3-advanced.svg`

**Purpose:** Start and continue creative operations from one task-oriented workspace.

**Approved operations:** Create Image, Edit Image, Create Video, Animate Image.

**Verified behavior:**
- prompt + Image/Video output intent;
- Video output includes contextual Audio on/off, default ON, carried through the validated generation contract as `output.audioEnabled`;
- PNG/JPEG/WebP user reference input up to 25 MB;
- signed-R2 persistent upload promoted to an owner-scoped durable `media_asset` before generation;
- newly uploaded Create references remain ordinary Library media even if Generate is never pressed;
- generation binds newly uploaded references through opaque `media-asset` identity rather than exposing R2/storage identity;
- reference preview/removal/replacement;
- Image + reference → Edit; Video + reference → Animate;
- RenderLab `generation_jobs` + durable `media_assets` persistence;
- capability-derived Edit/Animate continuation from durable images;
- Advanced controls from verified capability definitions;
- complete configured browser lifecycle `33031817744`;
- uploaded-media continuation preserves uploaded display identity;
- UI-030 keeps prompt/settings draftable while signed out, but generation/reference upload and other persistent actions require a verified non-anonymous account;
- signed-in generation jobs, reference/media inputs and persisted outputs remain within the verified account owner boundary.

**Phase 7 Create v2 extension:** durable Library persistence for newly uploaded Create references is implemented/verified through PR #46 and Create Durable Upload `33256497167`. Source-aware `Original` geometry, explicit overrides and the curated fixed ratio expansion are implemented/verified through PR #47 (`de50efe6ba462ec604ea2cace741e11904a62425`): Generation `33258831654` proved Create 16:9 → Edit Original → Edit 4:5 output geometry, Video Generation `33258831636` proved Animate Original from a 2:1 source, and final same-head Lifecycle/Shell regressions passed. Composer hierarchy/de-crowding is implemented/verified through PR #49 (`d324d7c8a520052d3c4bdc81f5f6c11edbdf50ee`): exact head `d52db83efb2af056e2e1598b54b988794ff19ab1` passed UI Shell `33261129925`, Create Lifecycle `33261129910`, Library Lifecycle `33261129917`, Account Ownership `33261129909`, Create Durable Upload `33261129940`, and Video Generation `33261129918`, with desktop/narrow artifacts reviewed. Stable `@imageN` named/ordered/role-aware reference addressing, maintained thumbnail mention mechanics and deterministic server/native mapping are implemented/verified through PR #51 (`7afe257b069e74d322d8f83c1a0868a30acd3686`). Contextual FLUX/Qwen evidence is also complete: FLUX run `33263044354` passed the bounded human artifact review, while Qwen audits `33263338596` / `33263401453` verified technical multi-reference support but showed more identity/style drift. UI-046 therefore locks the next Create extension to at most two Image references on the internal FLUX route while Video remains one source image. Still planned/not yet implemented: user-facing second-reference/reorder exposure with authoritative count/role enforcement, audited Director Video, curated 480p/720p/1080p/2K Video quality, and the deliberate premium motion/interaction pass under UI-043. Existing verified behavior remains authoritative for every unfinished item.

**UI-030 evidence:** exact implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed Create Lifecycle `33131090243`, Generation Integration `33131090251`, Video Generation Integration `33131090262` and Account Ownership `33131090207`. Desktop/mobile generated-result artifacts were visually reviewed without unintended Create hierarchy drift.

**UI-036 / PR #37 audio evidence:** final exact head `5178ef95ab63e816925c66a3305c9c255708886e` passed all eight affected gates, including Create Lifecycle `33239584685`, Video Generation `33239584671`, Generation Integration `33239584676` and UI Shell `33239584665`. Audio OFF is verified for Create Video, Audio ON for Animate Image, persisted request parameters retain the choice, Image requests reject the Video-only field, and the mobile essential-control row keeps Audio/duration/Advanced/Generate reachable. PR #37 merged as `713e8a6940c25fd0dc82994507537fe1a0d06b42`; merged-`main` Generation `33239701484`, UI Shell `33239701487`, and Video Generation `33239701476` passed.

**Do not change:** Do not turn Create into a generic ComfyUI form, expose worker/provider/R2 implementation or add fake runtime behavior.

### Library
**Route:** `/library`  
**Status:** APPROVED — Library base + Favorites / UI-031 + Collections / UI-032 + UI-033 tombstone filtering + Library Batch Delete / UI-034
**Implementation:** `src/features/library/library-view.tsx`  
**Batch selection:** `src/features/library/library-batch-selection.tsx`
**Sort control:** `src/features/library/library-sort-menu.tsx`  
**Persistent upload interactions:** `src/features/library/library-upload-button.tsx`, `src/features/library/library-drop-upload-surface.tsx`  
**Shared browser upload transaction:** `src/features/library/library-upload-client.ts`  
**Supporting:** `src/lib/api/media-assets-contract.ts`, `src/lib/api/media-upload-contract.ts`, `src/lib/api/media-collections-contract.ts`, `src/server/media/media-assets.ts`, `src/server/media/media-uploads.ts`, `src/server/media/media-collections.ts`, `GET /api/media/assets`, `POST /api/media/assets/batch-delete`, `GET|POST /api/media/collections`, collection membership routes, media-upload ticket/completion routes
**Approved design artifacts:** `design/penpot/library-v0.1.svg`, `design/penpot/library-v0.2-upload.svg`

**Purpose:** Find, inspect, reuse and continue from durable RenderLab media. Library is a reusable creative-asset workspace, not merely generation history.

**Approved behavior:**
- unified durable `media_assets` browsing with canonical newest-first default;
- explicit URL-owned `Newest first / Oldest first` ordering via `sort`, with deterministic server ordering by `created_at` + `id` in matching direction;
- `All / Images / Videos` URL-owned kind filter;
- bounded pagination with direction-aware Newer/Older navigation;
- responsive media grid and product media URLs;
- truthful unavailable/empty/no-match states;
- deep links to `/library/[assetId]`;
- compact native-file-picker Upload action with verified durable promotion;
- optional desktop drag/drop of one image through the exact same persistent upload transaction, with a temporary drag-only full-Library affordance and no persistent dropzone;
- multi-file drops are rejected before upload requests start; Upload button remains the keyboard/touch/mobile baseline;
- uploaded cards prefer durable display names and preserve Unicode filenames;
- URL-owned server-side search `q` over display name, original filename and generated prompt;
- search is case-insensitive literal substring matching, max 120 characters, composed with kind/sort/pagination;
- changing search, kind or sort clears stale pagination appropriately;
- renamed durable assets are immediately discoverable through the same display-name search contract;
- UI-030 makes Library private to the verified account: signed-out users see an explicit sign-in state rather than media/search/upload controls, while signed-in list/search/history/upload queries are owner-scoped.
- UI-031 adds URL-owned `favorite=true` as a server-side owner-scoped Favorites view that composes with kind/search/sort/pagination and preserves clean URL state when Favorites is inactive.
- Favorites remains a compact Library toolbar filter, not a new top-level destination or client-only card filter.
- UI-032 adds optional URL-owned `collection=<uuid>` as an owner-scoped server-side Library view that composes with kind/search/Favorites/sort/pagination.
- Collections remain a compact Library selector plus Viewer contextual membership action, not a new top-level destination, card/batch action system or client-owned media store.
- UI-034 adds an explicit Library `Select` mode over only the current rendered page, maintained Checkbox selection, Select/Clear Page, Cancel and one destructive batch Delete action. Selection resets when the Library URL/server view changes.
- UI-034 batch Delete is capped at 24 IDs and best-effort per item; successful items are not rolled back because another selected item fails, while failed items remain selected for retry. It reuses UI-033 tombstone/R2 semantics and adds no schema migration.

**Approval evidence:**
- base Library/Viewer lifecycle `33034606396`;
- persistent upload final pre-merge runs `33067469516`, `33067469518`, `33067469527`; PR #9 merged as `d306f2abd1831538c51692545d72db1e5e9e0814`;
- search implementation runs `33069004219`, `33069004207`, `33069004227`, `33069004204`;
- search documentation-finalized runs `33070046222`, `33070046205`, `33070046336`, `33070046186`;
- PR #10 merged as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`; post-merge `33070215358` passed;
- Rename configured search-discovery regression passed in Media Rename Visual `33074480356`;
- history ordering implementation head `9cde5180acb932b255e956c0f257b0246c0e381c` passed Library History `33094977896`, UI Shell `33094977929`, Library Search `33094977911`, Library Lifecycle `33094977899`, Media Download `33094977913` after unchanged rerun, Media Rename `33094977895`, Create Lifecycle `33094977825`, and Persistent Media Upload Integration `33094978022`;
- history desktop Oldest, open sort menu and mobile Newest screenshots were visually inspected with no unintended Library hierarchy drift;
- drag/drop implementation head `d957242d9b45fbb9fb115c8fd2b0a4dc60dc88ef` passed UI Shell `33102672560`, Library Search `33102672572`, Library History `33102672507`, Library Lifecycle `33102672568`, and Library Drag Drop `33102672468`;
- clean drag-active/completed desktop and completed mobile drag/drop screenshots were visually inspected; exactly one current run-owned durable card rendered with a valid preview and the mobile Upload baseline remained unchanged;
- direct Supabase cleanup after drag/drop verification found `0` drag/drop sessions/assets and `0` known legacy lifecycle sessions/assets;
- UI-030 exact implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed Library Search `33131090279`, Library History `33131090264`, Library Lifecycle `33131090245`, Library Drag Drop `33131090242`, Persistent Media Upload `33131090265` and Account Ownership `33131090207`; signed-out desktop/mobile and signed-in Library artifacts were reviewed clean.
- UI-031 exact implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed Library Favorites `33200364267`, Library Search `33200364171`, Library History `33200364183`, Library Lifecycle `33200364235`, Library Drag Drop `33200364254`, Persistent Media Upload `33200364229`, Account Ownership `33200364288` and UI Shell `33200364256`; fresh desktop/mobile Favorites Library screenshots were visually reviewed clean and shared-resource cleanup returned to zero.
- Final UI-031 head `4bd41d55af27c7240d75862424039fc59027988e` passed the complete 13-gate affected suite, then PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431`; merged `main` UI Shell `33205766730`, Reference Upload `33205766693`, Generation `33205766671`, and Video Generation `33205766691` passed, and the post-merge shared-resource audit returned to zero.
- UI-032 final head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578` passed all 14 affected gates, including Collections `33210501106`, Account Ownership `33210501089`, Favorites `33210501168`, Library Lifecycle `33210501160`, Generation `33210501178` and Video Generation `33210501167`; four responsive Collections artifacts were visually reviewed, PR #24 merged as `143f7bfb0be8b4857e5dd45959466e71ae22a42d`, merged-main checks UI Shell `33210876059`, Reference Upload `33210876022`, Generation Integration `33210876042`, and Video Generation `33210876085` passed, and post-merge shared-resource cleanup returned to zero.
- UI-034 implementation head `78015dcfb5881639b32f22f8877874af2c3a336b` passed all 16 affected gates: Library Batch Delete `33220127853`, Account Ownership `33220127858`, UI Shell `33220127872`, Create Lifecycle `33220127874`, Library Search `33220127883`, Library History `33220127859`, Library Lifecycle `33220127864`, Library Drag Drop `33220127921`, Persistent Media Upload `33220127879`, Media Download `33220127852`, Media Rename `33220127885`, Library Favorites `33220127888`, Library Collections `33220127868`, Media Delete `33220127873`, Generation Integration `33220127851`, and Video Generation `33220127855`. Configured validation covered request bounds, signed-out and foreign denial, mixed partial success, database/R2 cleanup, preserved generation history, idempotence, Library-view selection reset and responsive real-browser deletion. Desktop selected/confirmation and mobile confirmation artifacts were visually reviewed clean; the shared-resource audit returned to zero with `0009` still latest.
- UI-034 final exact head `1e634fe9a582b8a7676cb70cfc7bcd5754f613ce` passed all 16 affected gates: Library Batch Delete `33220710307`, Account Ownership `33220710301`, UI Shell `33220710365`, Create Lifecycle `33220710378`, Library Search `33220710297`, Library History `33220710393`, Library Lifecycle `33220710305`, Library Drag Drop `33220710389`, Persistent Media Upload `33220710300`, Media Download `33220710329`, Media Rename `33220710371`, Library Favorites `33220710303`, Library Collections `33220710404`, Media Delete `33220710375`, Generation Integration `33220710351`, and Video Generation `33220710347`. PR #29 merged as `8b0b0339f216f3ce704d965ef005b2cd020f3ae8`; merged-`main` UI Shell `33221101101`, Generation Integration `33221101106`, and Video Generation `33221101117` passed, the post-merge shared-resource audit returned to zero, and Vercel created no deployment from the merge.

**Current extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031, Collections v0.1 / UI-032, single-asset Durable Media Delete v0.1 / UI-033 and Library Batch Delete v0.1 / UI-034 are approved. UI-034 deliberately remains page-scoped and best-effort per item.

**Do not change:** Do not couple Library to legacy `studio_*`, expose temporary `generation_sources` as durable media, add Creatives/Uploads tabs, or turn search/history ordering into a Saga-style filter console without an explicit product contract.

### Media Viewer
**Route:** `/library/[assetId]`  
**Status:** APPROVED — Media Viewer base + Download + Rename + Favorites + Collections v0.1 / UI-032 + Delete v0.1 / UI-033
**Implementation:** `src/features/library/media-viewer.tsx`  
**Viewer actions:** `src/features/library/media-viewer-actions.tsx`  
**Supporting:** `src/app/library/[assetId]/page.tsx`, `src/app/page.tsx`, `src/app/api/media/assets/[assetId]/route.ts` (GET/PATCH/DELETE), `src/app/api/media/assets/[assetId]/favorite/route.ts`, `src/app/api/media/assets/[assetId]/download/route.ts`, `src/app/api/media/collections/route.ts`, collection membership route, `src/lib/api/media-assets-contract.ts`, `src/lib/api/media-collections-contract.ts`, `src/lib/capabilities/generation.ts`, `src/server/media/media-assets.ts`, `src/server/media/media-collections.ts`
**Design artifact:** `design/penpot/media-viewer-v0.1.svg`

**Approved behavior:**
- deep-linked durable asset route;
- responsive media-primary image/video presentation;
- secondary product metadata;
- capability-derived continuation actions;
- persisted images expose Edit/Animate via opaque media identity + action intent;
- Create reloads durable media and validates compatibility server-side;
- uploaded assets show truthful Upload/display-name/original-file metadata;
- one secondary Viewer-only `Download` action for durable generated/uploaded media;
- Download uses `/api/media/assets/[assetId]/download`, reloads the durable asset server-side, then redirects to a short-lived signed R2 attachment GET;
- uploaded download filenames preserve a sanitized Unicode basename with canonical MIME extension;
- generated downloads use deterministic `renderlab-<kind>-<id-prefix>.<ext>` fallback names rather than prompt/storage identity;
- one Viewer-only `Rename` action changes only durable `display_name` through `PATCH /api/media/assets/[assetId]`;
- Rename strips controls, collapses whitespace, requires non-empty input and caps names at 240 characters;
- Rename preserves original filename, MIME, R2 storage key, generated provenance/prompt and Download filename semantics;
- Rename and Download remain side-by-side while the inline edit form expands beneath them on desktop/mobile;
- UI-031 adds one full-width accessible `Favorite` / `Favorited` Viewer action above Rename/Download; it exposes `aria-pressed`, local saving/error feedback and an idempotent owner-scoped product mutation without changing continuation hierarchy;
- UI-032 adds one contextual `Collections` disclosure below Favorites; it lists only the verified owner's collections, supports create-and-add plus idempotent membership toggles with pressed state, and keeps Rename/Download plus continuation hierarchy unchanged.
- UI-033 adds one visually secondary permanent `Delete` action beneath existing durable actions. Confirmation uses the maintained AlertDialog primitive; successful deletion tombstones first, removes collection/upload links, purges R2 content/thumbnail, preserves generation-history IDs and returns to Library. Tombstoned media is not reusable as a new generation input.
- UI-030 requires a verified account for private Viewer state; the asset is loaded by owner and foreign IDs collapse to normal not-found behavior. Signed-out access renders the compact sign-in state rather than exposing private media.

**Download approval evidence:**
- implementation head `6d528c47445b26b5464fa529b9e489e6a7ce87ff` passed UI Shell `33070792349`, Library Search `33070792317`, Persistent Media Upload `33070792362`, Library Lifecycle `33070792329` and Media Download Visual `33070792343`;
- documentation-finalized runs `33071571971`, `33071572092`, `33071571998`, `33071571944`, `33071571912` passed;
- PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`; post-merge main shell/reference-upload runs `33071764713` / `33071764748` passed.

**Rename approval evidence:**
- refined implementation head `fb6f42cdfae377cf841655320dc4bbeee74d3549` passed UI Shell `33074480462`, Library Search `33074480419`, Persistent Media Upload `33074480288`, Media Download Visual `33074480319`, Media Rename Visual `33074480356`, and Library Lifecycle `33074480489` on rerun after stale shared fixture cleanup;
- configured Chromium verified generated/uploaded rename, Unicode/whitespace normalization, invalid/blank/overlength rejection, search discovery, original/provenance/storage preservation and unchanged uploaded Download filename/bytes;
- four refined edit/renamed Viewer screenshots were visually inspected at desktop/mobile widths;
- direct cleanup verification left `0` Rename fixtures, `0` Download fixtures, `0` lifecycle-named assets and `0` upload sessions;
- the unrelated stale lifecycle R2 object was explicitly removed by cleanup run `33075125636`;
- UI-030 exact head `49f08013dc428d8d390a1bd803b10886f853cd82` passed Library Lifecycle `33131090245`, Media Download `33131090206`, Media Rename `33131090198` and Account Ownership `33131090207`; signed-in mobile Viewer media/continuation/Rename/Download presentation was visually reviewed clean.

**Favorites approval evidence:** exact UI-031 implementation head `85460b7920afe66eee7ff35da03d4f43c9f207fd` passed Library Favorites `33200364267`, Media Download `33200364193`, Media Rename `33200364178`, Library Lifecycle `33200364235`, Account Ownership `33200364288` and UI Shell `33200364256`. Final head `4bd41d55af27c7240d75862424039fc59027988e` passed the full 13-gate affected suite before PR #23 merged as `45991e1d55b75dcc13eab162093fc1be1f5c2431`. Configured Chromium verified favorite/unfavorite state, `aria-pressed`, owner isolation, idempotent persistence and responsive Viewer composition; desktop/mobile Viewer screenshots were visually reviewed clean.

**Collections approval evidence:** UI-032 final head `fa0a6088a2e3fa0c14488b64d7dd6828e7bd6578` passed Collections `33210501106`, Account Ownership `33210501089`, Favorites `33210501168`, Media Download `33210501133`, Media Rename `33210501203`, Library Lifecycle `33210501160` and UI Shell `33210501226`; PR #24 merged as `143f7bfb0be8b4857e5dd45959466e71ae22a42d` and merged-main checks UI Shell `33210876059`, Reference Upload `33210876022`, Generation Integration `33210876042`, and Video Generation `33210876085` passed. Configured Chromium verified create/add/remove membership, `aria-pressed` persistence, Library collection navigation and responsive Viewer composition; desktop/mobile Viewer screenshots were visually reviewed clean.

**Delete approval evidence:** final exact head `53b0eb4c648b47a17fee2e735b7dddc85d345518` passed Media Delete `33218433320`, Account Ownership `33218433329`, UI Shell `33218433381`, Create Lifecycle `33218433291`, Library Search `33218433357`, Library History `33218433299`, Library Lifecycle `33218433285`, Library Drag Drop `33218433305`, Persistent Media Upload `33218433348`, Media Download `33218433296`, Media Rename `33218433406`, Library Favorites `33218433314`, Library Collections `33218433301`, Generation Integration `33218433335`, and Video Generation `33218433309`. Configured verification proved signed-out/foreign denial, database tombstone cleanup, R2 primary/thumbnail purge, generation-history preservation, idempotent retry and rejected post-delete generation reuse. Desktop/mobile confirmation screenshots were visually reviewed clean. PR #25 merged as `40945ff8c4c7e3a3db0e115c4d7cae9f50db4445`; merged-`main` UI Shell `33218646377`, Reference Upload `33218646539`, Generation Integration `33218646527`, and Video Generation `33218646602` passed and post-merge shared-resource cleanup returned to zero.

**Do not change:** Provider/worker/R2 identity stays internal. Viewer continuation remains capability-derived. Favorite/Collections/Download/Rename remain contextual product actions; UI-033 Delete follows its explicit tombstone/purge contract. Do not expose raw R2 keys/signed URLs as durable product links or infer collection rename/delete, Library-card selection or batch destructive actions from the single-asset Viewer action.

### Activity
**Route:** `/activity`  
**Status:** APPROVED — Activity v0.1 / UI-035
**Implementation:** `src/app/activity/page.tsx`, `src/features/activity/activity-view.tsx`, `src/features/activity/activity-auto-refresh.tsx`
**Supporting:** `src/lib/api/generation-activity-contract.ts`, `src/server/generation/generation-activity.ts`, existing owner-aware generation polling
**Purpose:** Show current/recent account-owned RenderLab `generation_jobs`, real execution state and actionable product failures without exposing worker infrastructure as user responsibility.

**UI-035 behavior:** newest-first 20-job pages; queued/preparing/running/persisting/succeeded/failed/cancelled product state; lightweight refresh only while jobs are active; sanitized failure copy; result links only for currently active owner media; signed-out/unavailable/empty states; no cancel/retry/worker/workflow/model controls.

**Approval evidence:** final exact head `f0a1100ea379a5aaba43d2694bb34496b563a1b2` passed Activity `33223434378`, Account Ownership `33223434363`, UI Shell `33223434381`, Create Lifecycle `33223434428`, Generation Integration `33223434364`, and Video Generation `33223434355`. PR #34 merged as `7e1e7c4e3c1dc1f6d226998e7d372715c2220bc4`; merged-`main` UI Shell `33223633751`, Generation Integration `33223633631`, and Video Generation `33223633627` passed. Configured two-account Activity verification covered privacy, pagination, real state, error redaction, active/deleted result links, responsive rendering and exact cleanup. Post-merge shared-resource audit returned to zero and Vercel created no deployment.

### Settings
**Route:** `/settings`  
**Status:** APPROVED — Account Identity Foundation v0.1 / UI-029  
**Implementation:** `src/app/settings/page.tsx`  
**Account surface:** `src/features/account/account-settings.tsx`  
**Session boundary:** `src/lib/supabase/config.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts`, root `proxy.ts`

**Purpose:** Own persistent account/application settings only when backed by real requirements. UI-029 uses Settings for the first real RenderLab account identity surface; it is not a workflow/model parameter dumping ground.

**Approved behavior:**
- compact email/password sign-in, account creation and sign-out states;
- Supabase Auth `auth.users.id` is the canonical account identity;
- maintained Supabase SSR cookie sessions are refreshed through the root Next.js proxy and server identity uses verified claims;
- public Supabase URL/publishable key may reach browser code; service-role credentials remain server-only;
- UI-029 itself did not gate or redesign Create/Library and did not imply owner columns; UI-030 now consumes that verified identity as the private product owner without moving media authorization into the Settings component.

**Approval evidence:**
- Account Identity Visual `33111299356` built and exercised an exact run-owned confirmed Supabase user through real Settings sign-in, reload-persistent cookie identity, responsive signed-in state, sign-out and exact cleanup;
- UI Shell `33111299265`, Create Lifecycle `33111299305`, Library Search `33111299144`, Library History `33111299040`, Library Lifecycle `33111299250`, Library Drag Drop `33111299309`, Media Download `33111299155`, and Media Rename `33111299172` also passed on the shared package-change code head;
- desktop signed-in and mobile signed-in/signed-out screenshots were visually reviewed without shell hierarchy drift;
- direct Supabase verification found `0` account CI fixture users after cleanup;
- UI-030 exact implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed Account Identity `33131090197` and Account Ownership `33131090207` while the private product routes consumed the same verified account principal.

**Still intentionally open:** UI-030 strict database enforcement is complete. Personal Library organization remains owned by Library/Viewer rather than Settings; other Settings sections remain requirement-driven.

### Admin — planned Cycle 2 privileged surface
**Route:** TBD
**Status:** PLANNED — Phase 10
**Purpose:** Closed-beta administration for explicitly authorized operators: access/user management, generation limit/feature-flag controls and useful operational health/failure visibility behind a server-authoritative admin boundary.
**Boundary:** This is not ordinary Settings and does not make worker/provider/secret mutation an ordinary-user capability. Exact route, role/claim model and mutations are decided in the Phase 10 contract.

### Brand / Landing — planned Cycle 2 launch surface
**Route:** TBD; current `/` remains Create until Phase 11 explicitly changes information architecture.
**Status:** PLANNED — Phase 11
**Purpose:** RenderLab brand identity, logo/banners, landing/onboarding presentation and launch messaging appropriate to the access posture.
**Boundary:** Phase 11 must explicitly decide whether a landing page takes `/` and Create moves elsewhere or whether landing uses another route. No route change is implied by planning alone.

## Creation Experience Resolution
- Prompt + Image → Create Image.
- Prompt + ready image reference/media asset + Image → Edit Image.
- Prompt + Video, no reference → Create Video.
- Prompt + ready image reference/media asset + Video → Animate Image.

Phase 7 will extend these current rules with durable Create uploads, source-aware geometry, named/ordered multi-reference inputs and audited Director-video semantics. Until those slices are implemented, the current four resolution rules above remain the production contract.

Current durable product decisions are in `docs/ui/UI_DECISIONS.md`; UI-038–UI-043 now additionally govern the revised Cycle 2 roadmap, source-aware geometry, durable Create uploads, explicit multi-reference addressing, curated hidden-workflow productization and the premium maintained-component visual-quality target.

## Growth Rule
Future operations such as upscale, restore, inpaint, outpaint or structural guidance should first be evaluated as additions to Create or continuation actions. They receive a new top-level surface only when the user workflow genuinely requires a distinct workspace.
