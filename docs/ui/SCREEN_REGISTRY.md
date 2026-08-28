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

Models, Workflows, separate Image/Video apps, separate Edit/Animate/Upscale apps and ComfyUI graph/node surfaces are not initial top-level destinations. Adding a backend workflow does not create a top-level screen by default.

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
- PNG/JPEG/WebP temporary reference input up to 25 MB;
- signed-R2 temporary reference input with opaque source identity;
- reference preview/removal/replacement;
- Image + reference → Edit; Video + reference → Animate;
- RenderLab `generation_jobs` + durable `media_assets` persistence;
- capability-derived Edit/Animate continuation from durable images;
- Advanced controls from verified capability definitions;
- complete configured browser lifecycle `33031817744`;
- uploaded-media continuation preserves uploaded display identity;
- UI-030 keeps prompt/settings draftable while signed out, but generation/reference upload and other persistent actions require a verified non-anonymous account;
- signed-in generation jobs, reference/media inputs and persisted outputs remain within the verified account owner boundary.

**UI-030 evidence:** exact implementation head `49f08013dc428d8d390a1bd803b10886f853cd82` passed Create Lifecycle `33131090243`, Generation Integration `33131090251`, Video Generation Integration `33131090262` and Account Ownership `33131090207`. Desktop/mobile generated-result artifacts were visually reviewed without unintended Create hierarchy drift.

**Do not change:** Do not turn Create into a generic ComfyUI form, expose worker/provider/R2 implementation or add fake runtime behavior.

### Library
**Route:** `/library`  
**Status:** APPROVED base + Favorites v0.1 / UI-031; Collections v0.1 / UI-032 IN FINAL VALIDATION
**Implementation:** `src/features/library/library-view.tsx`  
**Sort control:** `src/features/library/library-sort-menu.tsx`  
**Persistent upload interactions:** `src/features/library/library-upload-button.tsx`, `src/features/library/library-drop-upload-surface.tsx`  
**Shared browser upload transaction:** `src/features/library/library-upload-client.ts`  
**Supporting:** `src/lib/api/media-assets-contract.ts`, `src/lib/api/media-upload-contract.ts`, `src/lib/api/media-collections-contract.ts`, `src/server/media/media-assets.ts`, `src/server/media/media-uploads.ts`, `src/server/media/media-collections.ts`, `GET /api/media/assets`, `GET|POST /api/media/collections`, collection membership routes, media-upload ticket/completion routes
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
- UI-032 implementation head `bf4b047e55b99e3d673c5d5d6c31b46d3e1b383a` passed the complete 14-gate affected suite including Collections `33207939064`, Account Ownership `33207939069`, Favorites `33207939053`, Library Lifecycle `33207939113`, Generation `33207939088` and Video Generation `33207939039`; four responsive Collections artifacts were visually reviewed and shared-resource cleanup returned to zero.

**Approved extension:** UI-030 owner scoping is live and database enforcement is complete. Favorites v0.1 / UI-031 is approved. Collections v0.1 / UI-032 is the separately contracted owner-scoped relation currently in final validation; Delete/batch remains blocked until database/R2/reference-history cleanup and recovery/tombstone semantics are explicit.

**Do not change:** Do not couple Library to legacy `studio_*`, expose temporary `generation_sources` as durable media, add Creatives/Uploads tabs, or turn search/history ordering into a Saga-style filter console without an explicit product contract.

### Media Viewer
**Route:** `/library/[assetId]`  
**Status:** APPROVED base + Download/Rename/Favorites; Collections v0.1 / UI-032 IN FINAL VALIDATION
**Implementation:** `src/features/library/media-viewer.tsx`  
**Viewer actions:** `src/features/library/media-viewer-actions.tsx`  
**Supporting:** `src/app/library/[assetId]/page.tsx`, `src/app/page.tsx`, `src/app/api/media/assets/[assetId]/route.ts`, `src/app/api/media/assets/[assetId]/favorite/route.ts`, `src/app/api/media/assets/[assetId]/download/route.ts`, `src/app/api/media/collections/route.ts`, collection membership route, `src/lib/api/media-assets-contract.ts`, `src/lib/api/media-collections-contract.ts`, `src/lib/capabilities/generation.ts`, `src/server/media/media-assets.ts`, `src/server/media/media-collections.ts`
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

**Collections verification evidence:** UI-032 implementation head `bf4b047e55b99e3d673c5d5d6c31b46d3e1b383a` passed Collections `33207939064`, Account Ownership `33207939069`, Favorites `33207939053`, Media Download `33207939031`, Media Rename `33207939044`, Library Lifecycle `33207939113` and UI Shell `33207939112`. Configured Chromium verified create/add/remove membership, `aria-pressed` persistence, Library collection navigation and responsive Viewer composition; desktop/mobile Viewer screenshots were visually reviewed clean.

**Do not change:** Provider/worker/R2 identity stays internal. Viewer continuation remains capability-derived. Favorite/Collections/Download/Rename remain contextual product actions; do not expose raw R2 keys/signed URLs as durable product links or add collection rename/delete, Library-card/batch membership or destructive media actions without their own contract.

### Activity
**Route:** `/activity`  
**Status:** PLANNED; temporary route placeholder  
**Purpose:** Show current/recent RenderLab `generation_jobs`, real execution state and actionable failures without exposing worker infrastructure as user responsibility.

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

## Creation Experience Resolution
- Prompt + Image → Create Image.
- Prompt + ready image reference/media asset + Image → Edit Image.
- Prompt + Video, no reference → Create Video.
- Prompt + ready image reference/media asset + Video → Animate Image.

Current durable product decisions are in `docs/ui/UI_DECISIONS.md`, including UI-022 persistent uploaded-media identity, UI-023 Library search, UI-024 durable media Download, UI-025 durable display-name Rename, UI-026 maintained conventional control purity, UI-027 Library history ordering, UI-028 Library drag/drop upload, UI-029 account identity, UI-030 core account ownership and active UI-031 Favorites.

## Growth Rule
Future operations such as upscale, restore, inpaint, outpaint or structural guidance should first be evaluated as additions to Create or continuation actions. They receive a new top-level surface only when the user workflow genuinely requires a distinct workspace.
