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

Models, Workflows, separate Image/Video apps, separate Edit/Animate/Upscale apps and ComfyUI graph/node surfaces are not top-level destinations by default. Cycle 2 includes the privileged Admin surface at `/admin` under UI-051. PR #73 implements UI-052's public **Brand/Landing** at `/` and authoritative Create workspace at `/create`; `main` adopts that routing when the verified PR merges. Admin stays out of ordinary shell navigation and remains reachable contextually from Settings only for an active admin.

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

### Brand / Landing
**Route:** `/`
**Status:** APPROVED on validated PR #73 implementation; pending merge to `main`
**Implementation:** `src/app/page.tsx`, `src/components/brand/renderlab-brand.tsx`, `src/app/opengraph-image.tsx`
**Design artifacts:** `design/penpot/brand-launch-v0.1-desktop.svg`, `design/penpot/brand-launch-v0.1-mobile.svg`

**Purpose:** Public product home for verified RenderLab capability and truthful invitation-only Closed Beta access without application-shell chrome or public self-admission.

**Verified behavior:** `/` renders without `AppShell`; `/create` and application routes use the `(app)` shell; Open Create → `/create`; Sign in → `/settings`; legacy root continuation preserves the complete query into `/create`; only verified operations/reuse/recovery are claimed; forbidden public-signup/pricing/testimonial/fake-metric/provider/SLA claims remain absent.

**Approval evidence:** validated head `8975b7b42b518eea0a462b28528ddd41d90ad986` passed 19/19 affected workflows. Brand / Launch Visual `33321365147` artifact `9734984885` (`sha256:8d9929fb5f6d85da4710184ec7bbe756f782593f58525ec2ae660729ad3b32a9`) was human-reviewed clean at 1440×1100, 390×844, `/create` shell and legacy-continuation states.

**Do not change:** Do not add public registration/waitlist, pricing/testimonials/fake metrics, provider/model claims, analytics marketing cookies, decorative heavy motion or application-shell marketing chrome without a new explicit decision.

### Create
**Route:** `/create`
**Status:** APPROVED  
**Implementation:** `src/features/create/create-workspace.tsx`  
**Supporting:** `src/features/create/create-advanced-panel.tsx`  
**Design artifacts:** `design/penpot/create-v0.2-desktop.svg`, `design/penpot/create-v0.2-mobile.svg`, `design/penpot/create-v0.2-runtime-states.svg`, `design/penpot/create-v0.3-advanced.svg`

**Purpose:** Start and continue creative operations from one task-oriented workspace.

**Approved operations:** Create Image, Edit Image, Create Video, Animate Image.

**Verified behavior:**
- prompt + Image/Video output intent;
- Video output includes contextual Audio on/off, default ON, carried through the validated generation contract as `output.audioEnabled`;
- Video output includes contextual **Resolution** with exact `480p`, `720p`, `1080p`, `2K` choices, default `480p`, hidden/rejected `4K`, and server-normalized/persisted `output.resolution`;
- PNG/JPEG/WebP user reference input up to 25 MB;
- signed-R2 persistent upload promoted to an owner-scoped durable `media_asset` before generation;
- newly uploaded Create references remain ordinary Library media even if Generate is never pressed;
- generation binds newly uploaded references through opaque `media-asset` identity rather than exposing R2/storage identity;
- reference preview/removal/replacement;
- Image + reference → Edit; Video + reference → Animate;
- RenderLab `generation_jobs` + durable `media_assets` persistence;
- capability-derived Edit/Animate continuation from durable images;
- Advanced controls from verified capability definitions;
- UI-043 purposeful Create spatial continuity for operation/context changes, reference add/remove/reorder, contextual Image↔Video controls, Advanced field changes and result arrival, with static reduced-motion behavior;
- complete configured browser lifecycle `33031817744`;
- uploaded-media continuation preserves uploaded display identity;
- UI-030 keeps prompt/settings draftable while signed out, but generation/reference upload and other persistent actions require a verified non-anonymous account;
- signed-in generation jobs, reference/media inputs and persisted outputs remain within the verified account owner boundary;
- UI-051 Phase 10C applies the shared transactional generation-admission boundary after request/input preflight and before backend/provider dispatch; Create preserves the draft and shows sanitized product-level disabled/limit feedback without exposing infrastructure detail.

**Phase 7 Create v2 extension:** the durable Create-upload foundation is implemented/verified through PR #46; source-aware `Original` geometry and curated fixed ratios through PR #47 (`de50efe6ba462ec604ea2cace741e11904a62425`); composer hierarchy/de-crowding through PR #49 (`d324d7c8a520052d3c4bdc81f5f6c11edbdf50ee`); stable `@imageN` addressing through PR #51 (`7afe257b069e74d322d8f83c1a0868a30acd3686`); and bounded two-image reference exposure/reorder/count/role enforcement through UI-046 / PR #53 (`0286b18802fc3d766d9d09e2ba8ed9a494eabd08`). Phase 7C live audit `33266905978` is complete and UI-047 deliberately defers Director productization because the deployed worker has no structured Director fields. Phase 7D Video Resolution is implemented/verified under UI-048 at exact code/test head `594ad7eb39a9d5eec1d2f0283ac6e327f86129b3`: exact 480p/720p/1080p/2K choices with 480p default, canonical persisted resolution, Video Steps/Guidance removal/rejection, responsive/reduced-motion menu review and the four-case live Video matrix all passed; Video Generation `33270777081` produced `854×480`, `1920×1080`, `720×1280` and `2304×1152` outputs for the accepted cases. The deliberate premium interaction/motion pass under UI-043 is verified at exact head `51c293dad114c98754933ab192b13427a90d9570`: UI Shell `33273370797`, configured Create Lifecycle `33273370720` and the complete 19-workflow affected suite passed; reference reorder motion and static reduced-motion behavior were exercised and responsive artifacts reviewed clean. Phase 7 Create v2 exit criteria are complete, while existing approved Create/reference/Resolution behavior remains authoritative.

**UI-030 evidence:** exact implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed Create Lifecycle `33131090243`, Generation Integration `33131090251`, Video Generation Integration `33131090262` and Account Ownership `33131090207`. Desktop/mobile generated-result artifacts were visually reviewed without unintended Create hierarchy drift.

**UI-036 / PR #37 audio evidence:** final exact head `5178ef95ab63e816925c66a3305c9c255708886e` passed all eight affected gates, including Create Lifecycle `33239584685`, Video Generation `33239584671`, Generation Integration `33239584676` and UI Shell `33239584665`. Audio OFF is verified for Create Video, Audio ON for Animate Image, persisted request parameters retain the choice, Image requests reject the Video-only field, and the mobile essential-control row keeps Audio/duration/Advanced/Generate reachable. PR #37 merged as `713e8a6940c25fd0dc82994507537fe1a0d06b42`; merged-`main` Generation `33239701484`, UI Shell `33239701487`, and Video Generation `33239701476` passed.

**Do not change:** Do not turn Create into a generic ComfyUI form, expose worker/provider/R2 implementation or add fake runtime behavior.

### Library
**Route:** `/library`  
**Status:** APPROVED — Library base + Favorites / UI-031 + Collections / UI-032 + UI-033 tombstone filtering + Library Batch Delete / UI-034 + Phase 8 Collection Management and Page-scoped Batch Organization / UI-049
**Implementation:** `src/features/library/library-view.tsx`  
**Collection management:** `src/features/library/library-collection-menu.tsx`, `src/features/library/library-collection-manager.tsx`
**Batch selection:** `src/features/library/library-batch-selection.tsx`
**Sort control:** `src/features/library/library-sort-menu.tsx`  
**Persistent upload interactions:** `src/features/library/library-upload-button.tsx`, `src/features/library/library-drop-upload-surface.tsx`  
**Shared browser upload transaction:** `src/features/library/library-upload-client.ts`  
**Supporting:** `src/lib/api/media-assets-contract.ts`, `src/lib/api/media-upload-contract.ts`, `src/lib/api/media-collections-contract.ts`, `src/server/media/media-assets.ts`, `src/server/media/media-uploads.ts`, `src/server/media/media-collections.ts`, `GET /api/media/assets`, `POST /api/media/assets/batch-delete`, `POST /api/media/assets/batch-favorite`, `GET|POST /api/media/collections`, `PATCH|DELETE /api/media/collections/[collectionId]`, single-asset collection membership routes, `POST /api/media/collections/[collectionId]/items/batch`, media-upload ticket/completion routes
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
- UI-049 Phase 8A makes Library collection management reachable even with zero collections, reuses the existing create contract, and adds owner-scoped rename/delete in a compact progressive-disclosure manager. Collection Delete removes only the collection and cascade memberships; durable media, Favorite state, R2 content, generation history and provenance remain unchanged.
- Deleting the currently active collection filter navigates to the canonical equivalent Library view with `collection` and stale `offset` removed while compatible kind/search/Favorites/sort state remains. Viewer stays focused on current-asset membership and does not duplicate rename/delete management.
- UI-034 adds an explicit Library `Select` mode over only the current rendered page, maintained Checkbox selection, Select/Clear Page, Cancel and one destructive batch Delete action. Selection resets when the Library URL/server view changes.
- UI-034 batch Delete is capped at 24 IDs and best-effort per item; successful items are not rolled back because another selected item fails, while failed items remain selected for retry. It reuses UI-033 tombstone/R2 semantics and adds no schema migration.
- UI-049 Phase 8B extends that same current-page selection state with one non-destructive Organize disclosure. Favorite selected / Unfavorite selected and Add selected / Remove selected to one existing owner collection are explicit target states over bounded 1–24-item best-effort APIs; permanent Delete stays separate. Still-visible selections remain after organization for chaining, while active Favorites/Collection filters refresh and prune items/selection that no longer belong. Uploaded and generated assets use the same path.

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
- UI-049 Phase 8A exact code/test head `34f9573eaabff6a91c780266ff03fedc9058df56` passed all 16 minimum/affected gates: UI Shell `33275470009`, Account Ownership `33275469977`, Library Collections `33275469972`, Library Favorites `33275470058`, Library Batch Delete `33275470041`, Library Lifecycle `33275469967`, Library Search `33275469987`, Library History `33275469981`, Library Drag Drop `33275469963`, Persistent Media Upload `33275794675`, Media Download `33275795313`, Media Rename `33275795970`, Media Delete `33275470098`, Create Lifecycle `33275469978`, Generation Integration `33275469986`, and Video Generation Integration `33275469940`. Configured Collections artifact `9721370669` (`sha256:26eb381867bf2b270363dbb8561c0cfbe93df873e2d191873b4aeda5bb208389`) was reviewed clean across desktop/narrow manager, empty, delete-confirmation, active-filter and Viewer-membership states; exact fixtures cleaned and no migration/deployment occurred.
- UI-049 Phase 8B exact implementation head `e460a7e9e805ac9eb214277eb495adddd3c50f38` passed all 16 minimum/affected gates: UI Shell `33276766491`, Account Ownership `33276766501`, Library Collections `33276766508`, Library Favorites `33276766502`, Library Batch Delete/Actions `33276766476`, Library Lifecycle `33276766549`, Library Search `33276766510`, Library History `33276766481`, Library Drag Drop `33276766492`, Persistent Media Upload `33276766522`, Media Download `33276766512`, Media Rename `33276766480`, Media Delete `33276766497`, Create Lifecycle `33276766503`, Generation Integration `33276766505`, and Video Generation Integration `33276766504`. Configured Batch Actions artifact `9721752806` (`renderlab-library-batch-actions-screenshots`, `sha256:9dfebfad4a97aa79e6bd11a2b86de5071fa7a1e6739258d95688d37496b3adb0`) was reviewed clean across desktop/narrow Organize open/completed/filter-pruned states plus unchanged Delete confirmation; exact owner/foreign database/R2 fixtures cleaned and no migration/deployment occurred.
- UI-034 implementation head `78015dcfb5881639b32f22f8877874af2c3a336b` passed all 16 affected gates: Library Batch Delete `33220127853`, Account Ownership `33220127858`, UI Shell `33220127872`, Create Lifecycle `33220127874`, Library Search `33220127883`, Library History `33220127859`, Library Lifecycle `33220127864`, Library Drag Drop `33220127921`, Persistent Media Upload `33220127879`, Media Download `33220127852`, Media Rename `33220127885`, Library Favorites `33220127888`, Library Collections `33220127868`, Media Delete `33220127873`, Generation Integration `33220127851`, and Video Generation `33220127855`. Configured validation covered request bounds, signed-out and foreign denial, mixed partial success, database/R2 cleanup, preserved generation history, idempotence, Library-view selection reset and responsive real-browser deletion. Desktop selected/confirmation and mobile confirmation artifacts were visually reviewed clean; the shared-resource audit returned to zero with `0009` still latest.
- UI-034 final exact head `1e634fe9a582b8a7676cb70cfc7bcd5754f613ce` passed all 16 affected gates: Library Batch Delete `33220710307`, Account Ownership `33220710301`, UI Shell `33220710365`, Create Lifecycle `33220710378`, Library Search `33220710297`, Library History `33220710393`, Library Lifecycle `33220710305`, Library Drag Drop `33220710389`, Persistent Media Upload `33220710300`, Media Download `33220710329`, Media Rename `33220710371`, Library Favorites `33220710303`, Library Collections `33220710404`, Media Delete `33220710375`, Generation Integration `33220710351`, and Video Generation `33220710347`. PR #29 merged as `8b0b0339f216f3ce704d965ef005b2cd020f3ae8`; merged-`main` UI Shell `33221101101`, Generation Integration `33221101106`, and Video Generation `33221101117` passed, the post-merge shared-resource audit returned to zero, and Vercel created no deployment from the merge.

**Current extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031, Collections v0.1 / UI-032, single-asset Durable Media Delete v0.1 / UI-033, Library Batch Delete v0.1 / UI-034 and Phase 8 Library organization / UI-049 are approved. Selection deliberately remains current-page only; Delete and organization remain bounded best-effort per item with explicit target states for reversible organization.

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
**Status:** APPROVED — Activity v0.1 / UI-035 + failed-job Retry v0.1 / UI-050
**Implementation:** `src/app/activity/page.tsx`, `src/features/activity/activity-view.tsx`, `src/features/activity/activity-auto-refresh.tsx`, `src/features/activity/activity-retry-button.tsx`
**Supporting:** `src/lib/api/generation-activity-contract.ts`, `src/lib/api/generation-retry-contract.ts`, `src/server/generation/generation-activity.ts`, `src/server/generation/retry-generation.ts`, `POST /api/generation/jobs/[jobId]/retry`, existing owner-aware generation polling/submission
**Purpose:** Show current/recent account-owned RenderLab `generation_jobs`, real execution state and actionable product failures without exposing worker infrastructure as user responsibility.

**UI-035/UI-050 behavior:** newest-first 20-job pages; queued/preparing/running/persisting/succeeded/failed/cancelled product state; lightweight refresh only while jobs are active; sanitized failure copy; result links only for currently active owner media; signed-out/unavailable/empty states; compact `Retry` only on failed rows with disabled `Retrying…` state, sanitized inline feedback and server refresh after acceptance; no Cancel, general Run Again, worker/workflow/model controls or shell-global job polling.

**Approval evidence:** final exact head `f0a1100ea379a5aaba43d2694bb34496b563a1b2` passed Activity `33223434378`, Account Ownership `33223434363`, UI Shell `33223434381`, Create Lifecycle `33223434428`, Generation Integration `33223434364`, and Video Generation `33223434355`. PR #34 merged as `7e1e7c4e3c1dc1f6d226998e7d372715c2220bc4`; merged-`main` UI Shell `33223633751`, Generation Integration `33223633631`, and Video Generation `33223633627` passed. Configured two-account Activity verification covered privacy, pagination, real state, error redaction, active/deleted result links, responsive rendering and exact cleanup. Post-merge shared-resource audit returned to zero and Vercel created no deployment.

**Phase 9 verified extension:** UI-050 is implemented at exact code/test head `ab33e146ccaa7770f3dd66146708f01933cc0173`. The browser posts only the historical failed job ID; the server reconstructs product intent, applies bounded legacy compatibility, runs current parser and owner/source preflight, then creates a distinct ordinary job through current submission while the historical row remains immutable. Activity `33279062575` verified status/privacy/input/legacy/provider-isolation semantics and exact cleanup against a run-local authenticated mock backend without generation spend. Final artifact `9722428767` (`sha256:65490c380fe35d5b6a186596cafa1d0706d181c6c827748aaaf8a9dc99e8dcbe`) was visually reviewed clean after fixing a prior narrow success-feedback flex defect. Active/succeeded/cancelled rows still do not expose Retry; Cancel and shell-global status polling remain absent/deferred.

**Phase 10C verified extension:** Retry continues through the ordinary shared `submitGeneration` path and now consumes the same transactional admission policy as Create. Admission-specific `403`/`503`/`429` errors survive Retry mapping as sanitized row-local feedback and the historical failed row remains immutable. Exact-head Activity `33309162322` passed after its verifier was updated to terminalize only accepted mock-success jobs before a later UI Retry, preserving the deliberately active seeded job while respecting the new active-slot guard. Final Admission Activity desktop/narrow states in artifact `9731487718` were reviewed clean.


### Settings
**Route:** `/settings`  
**Status:** APPROVED — Account Identity Foundation / UI-029 + Phase 10A/10B account/admin integration / UI-051
**Implementation:** `src/app/settings/page.tsx`  
**Account surface:** `src/features/account/account-settings.tsx`; password security: `src/features/account/account-password-form.tsx`
**Session boundary:** `src/lib/supabase/config.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/proxy.ts`, root `proxy.ts`

**Purpose:** Own persistent account/application settings only when backed by real requirements. UI-029 uses Settings for the first real RenderLab account identity surface; it is not a workflow/model parameter dumping ground.

**Approved behavior:**
- compact email/password Sign in + Forgot password when signed out, and access-status / Change password / Sign out when signed in; public self-service Create account is absent under the Closed-Beta admission contract;
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


**Phase 10A/10B verified extension — UI-051:** Settings remains the ordinary account/security surface. Signed-out state is Sign in + Forgot password with no public Create account; signed-in state includes Change password and server-owned RenderLab access status; recovery/invite completion uses `/settings/password`. Suspended users retain Settings for recovery/sign-out. Active admins get a contextual `/admin` link after fresh privilege confirmation. Raw Supabase errors, role editing and other users never belong in ordinary Settings.

### Admin
**Route:** `/admin`
**Status:** APPROVED / VERIFIED — Phase 10B + 10C / UI-051
**Implementation:** `src/app/admin/page.tsx`, `src/features/admin/admin-operations.tsx`, `src/server/admin/*`, `src/app/api/admin/**`

**Purpose:** Operate the controlled RenderLab beta without exposing provider infrastructure or the shared Supabase Auth namespace.

**Verified v0.1 composition:**
- **Access:** RenderLab invitations and admitted accounts only; invite/revoke, active/suspended status and member/admin role. Account discovery starts from `renderlab_account_access`; Auth Admin lookup is only by already-known RenderLab UUID.
- **Generation controls:** fresh-admin typed global `generationEnabled`, `maxActiveJobs` (1–4) and `maxJobsPerHour` (1–120) defaults above nullable per-account overrides. Account override wins when present; otherwise the global value is effective. These controls now feed the shared Create/Retry transactional admission boundary.
- **Health:** bounded aggregate RenderLab operation/status counts, active-job count and sanitized product error-code counts; no prompt/media/provider/worker/workflow/raw-error data.
- `/admin` and `/api/admin/**` require a freshly server-confirmed Supabase identity plus active RenderLab `admin` access. Unauthorized page/API paths fail closed without privileged payload.
- ordinary global shell navigation remains Create/Library/Activity/Settings; Settings exposes `Open Admin` only to a fresh active admin.
- member/admin and active/suspended changes are transactionally protected against self-lockout and removal of the last active admin.
- desktop uses dense maintained-primitive rows/cards; narrow layout stacks records/actions without horizontal clipping.

**Approval evidence:** Phase 10B exact head `56d5a2c26fc14f6fcad8c7093024bcc9632eb7c8` established the privileged Admin boundary. Phase 10C exact head `ca8e426066385934b296b6d4f88324e9c12861f7` then passed the complete 22-workflow matrix including Account/Admin Operations `33309162310`, Generation Admission `33309162313`, Activity `33309162322`, Generation `33309162306` and Video Generation `33309162305`. Final Admin artifact `9731449736` (`sha256:66188b46f4249a7be6e7efba6f613331de07525f76b8a931f5ffbf85e3f56e81`) was human-reviewed clean on desktop/narrow layouts with global defaults above account overrides; Admission artifact `9731487718` (`sha256:e6e94bfabbd125c20c65aa959900a0081d6ca94bbd5b6d6a5b28fd817a09c3e7`) was reviewed clean for Create/Activity denial states. Migrations `20260830015449 renderlab_admin_access_control` and `20260830101734 renderlab_generation_admission` are applied/audited; exact final fixture cleanup and singleton restoration passed.

**Do not change:** Do not turn Admin into a shared-Supabase user browser, cloud/provider console, arbitrary feature-flag framework or generic internal dashboard. Do not expose provider identity/credentials, raw errors, other applications' users or destructive account/data deletion. Keep global/account controls typed and bounded; generation reservations remain server-only operational state rather than a browser/admin reservation console.

### Brand / Landing — Phase 11 target
**Target route:** `/`
**Status:** PLANNED — UI-052 contract accepted; implementation not started
**Current repository reality:** `/` still serves the approved Create workspace until Phase 11 implementation merges.

**Purpose:** Public product home for RenderLab identity, verified creative capability and closed-beta entry into the application.

**Locked target behavior:**
- marketing surface renders outside `AppShell` while sharing RenderLab global tokens/theme;
- primary `Open Create` → `/create`; account `Sign in` → `/settings`;
- concise truthful product proof for Create/Edit Image, Create/Animate Video, durable reference/Library reuse and Activity/recovery continuity;
- no public signup/waitlist, pricing, testimonials, fabricated metrics, provider/model claims or unverified capability;
- desktop+narrow design checkpoint precedes implementation; final surface requires responsive/accessibility/reduced-motion browser review.

**Related route migration:** Create remains `APPROVED` at current `/` until implementation. Phase 11 will move that same authoritative Create surface to `/create`, update the application shell accordingly and preserve legacy `/?source=...&action=...` continuation intent through a same-origin redirect to `/create` before existing server validation.

## Creation Experience Resolution
- Prompt + Image → Create Image.
- Prompt + ready image reference/media asset + Image → Edit Image.
- Prompt + Video, no reference → Create Video.
- Prompt + ready image reference/media asset + Video → Animate Image.

Phase 7 will extend these current rules with durable Create uploads, source-aware geometry, named/ordered multi-reference inputs and audited Director-video semantics. Until those slices are implemented, the current four resolution rules above remain the production contract.

Current durable product decisions are in `docs/ui/UI_DECISIONS.md`; UI-038–UI-043 now additionally govern the revised Cycle 2 roadmap, source-aware geometry, durable Create uploads, explicit multi-reference addressing, curated hidden-workflow productization and the premium maintained-component visual-quality target.

## Growth Rule
Future operations such as upscale, restore, inpaint, outpaint or structural guidance should first be evaluated as additions to Create or continuation actions. They receive a new top-level surface only when the user workflow genuinely requires a distinct workspace.

**Phase 10A verified extension:** Settings remains the ordinary account/security destination. Signed-out state exposes Sign in + Forgot password and no public Create account. Verified identities see server-owned Closed Beta access status; Active users retain private product access, while Suspended users keep password/sign-out recovery but are denied private product operations when admission enforcement is enabled. `/settings/password` requires current-password reauthentication for ordinary changes and accepts old-password-free replacement only after the server verifies a signed short-lived recovery marker created by `/auth/confirm`. `e36140911c63527927ef404d1befa7670d590f8a` passed Account Identity `33282141315`, Account Ownership `33282141349`, UI Shell `33282141382` and the full 20-workflow affected suite. Artifact `9723305472` was reviewed clean across active/suspended/signed-out/recovery desktop+narrow states. Production admission enforcement remains off pending explicit known-user UUID bootstrap.
