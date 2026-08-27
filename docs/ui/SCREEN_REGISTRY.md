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
- uploaded-media continuation preserves uploaded display identity.

**Do not change:** Do not turn Create into a generic ComfyUI form, expose worker/provider/R2 implementation or add fake runtime behavior.

### Library
**Route:** `/library`  
**Status:** APPROVED — Library v0.1 + persistent Upload + search v0.1 + history ordering v0.1 + drag/drop upload v0.1  
**Implementation:** `src/features/library/library-view.tsx`  
**Sort control:** `src/features/library/library-sort-menu.tsx`  
**Persistent upload interactions:** `src/features/library/library-upload-button.tsx`, `src/features/library/library-drop-upload-surface.tsx`  
**Shared browser upload transaction:** `src/features/library/library-upload-client.ts`  
**Supporting:** `src/lib/api/media-assets-contract.ts`, `src/lib/api/media-upload-contract.ts`, `src/server/media/media-assets.ts`, `src/server/media/media-uploads.ts`, `GET /api/media/assets`, media-upload ticket/completion routes  
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
- renamed durable assets are immediately discoverable through the same display-name search contract.

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
- direct Supabase cleanup after drag/drop verification found `0` drag/drop sessions/assets and `0` known legacy lifecycle sessions/assets.

**Still intentionally open:** favorites/collections or another account-owned organization model, delete/batch management and other Library interaction enhancements unless separately justified. Favorites/Collections must not be modeled as global media flags before a real ownership model exists. Delete must not be added until database/R2/reference-history cleanup and recovery/tombstone semantics are explicit.

**Do not change:** Do not couple Library to legacy `studio_*`, expose temporary `generation_sources` as durable media, add Creatives/Uploads tabs, or turn search/history ordering into a Saga-style filter console without an explicit product contract.

### Media Viewer
**Route:** `/library/[assetId]`  
**Status:** APPROVED — Media Viewer v0.1 + uploaded-media presentation + Download v0.1 + Rename v0.1  
**Implementation:** `src/features/library/media-viewer.tsx`  
**Viewer actions:** `src/features/library/media-viewer-actions.tsx`  
**Supporting:** `src/app/library/[assetId]/page.tsx`, `src/app/page.tsx`, `src/app/api/media/assets/[assetId]/route.ts`, `src/app/api/media/assets/[assetId]/download/route.ts`, `src/lib/api/media-assets-contract.ts`, `src/lib/capabilities/generation.ts`, `src/server/media/media-assets.ts`  
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
- Rename and Download remain side-by-side while the inline edit form expands beneath them on desktop/mobile.

**Download approval evidence:**
- implementation head `6d528c47445b26b5464fa529b9e489e6a7ce87ff` passed UI Shell `33070792349`, Library Search `33070792317`, Persistent Media Upload `33070792362`, Library Lifecycle `33070792329` and Media Download Visual `33070792343`;
- documentation-finalized runs `33071571971`, `33071572092`, `33071571998`, `33071571944`, `33071571912` passed;
- PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`; post-merge main shell/reference-upload runs `33071764713` / `33071764748` passed.

**Rename approval evidence:**
- refined implementation head `fb6f42cdfae377cf841655320dc4bbeee74d3549` passed UI Shell `33074480462`, Library Search `33074480419`, Persistent Media Upload `33074480288`, Media Download Visual `33074480319`, Media Rename Visual `33074480356`, and Library Lifecycle `33074480489` on rerun after stale shared fixture cleanup;
- configured Chromium verified generated/uploaded rename, Unicode/whitespace normalization, invalid/blank/overlength rejection, search discovery, original/provenance/storage preservation and unchanged uploaded Download filename/bytes;
- four refined edit/renamed Viewer screenshots were visually inspected at desktop/mobile widths;
- direct cleanup verification left `0` Rename fixtures, `0` Download fixtures, `0` lifecycle-named assets and `0` upload sessions;
- the unrelated stale lifecycle R2 object was explicitly removed by cleanup run `33075125636`.

**Do not change:** Provider/worker/R2 identity stays internal. Viewer continuation remains capability-derived. Download/Rename remain contextual product actions; do not expose raw R2 keys/signed URLs as durable product links or add Library-card/batch/delete/collection actions without a separate contract.

### Activity
**Route:** `/activity`  
**Status:** PLANNED; temporary route placeholder  
**Purpose:** Show current/recent RenderLab `generation_jobs`, real execution state and actionable failures without exposing worker infrastructure as user responsibility.

### Settings
**Route:** `/settings`  
**Status:** PLANNED; temporary route placeholder  
**Purpose:** Persistent application/account preferences backed by actual requirements; not a dumping ground for workflow/model parameters.

## Creation Experience Resolution
- Prompt + Image → Create Image.
- Prompt + ready image reference/media asset + Image → Edit Image.
- Prompt + Video, no reference → Create Video.
- Prompt + ready image reference/media asset + Video → Animate Image.

Current durable product decisions are in `docs/ui/UI_DECISIONS.md`, including UI-022 persistent uploaded-media identity, UI-023 Library search, UI-024 durable media Download, UI-025 durable display-name Rename, UI-026 maintained conventional control purity, UI-027 Library history ordering and UI-028 Library drag/drop upload.

## Growth Rule
Future operations such as upscale, restore, inpaint, outpaint or structural guidance should first be evaluated as additions to Create or continuation actions. They receive a new top-level surface only when the user workflow genuinely requires a distinct workspace.