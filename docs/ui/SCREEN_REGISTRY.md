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
**Status:** APPROVED — Library v0.1 + persistent Upload + search v0.1  
**Implementation:** `src/features/library/library-view.tsx`  
**Persistent upload client:** `src/features/library/library-upload-button.tsx`  
**Supporting:** `src/lib/api/media-assets-contract.ts`, `src/lib/api/media-upload-contract.ts`, `src/server/media/media-assets.ts`, `src/server/media/media-uploads.ts`, `GET /api/media/assets`, media-upload ticket/completion routes  
**Approved design artifacts:** `design/penpot/library-v0.1.svg`, `design/penpot/library-v0.2-upload.svg`

**Purpose:** Find, inspect, reuse and continue from durable RenderLab media. Library is a reusable creative-asset workspace, not merely generation history.

**Approved behavior:**
- unified newest-first durable `media_assets` browsing;
- `All / Images / Videos` URL-owned kind filter;
- bounded pagination;
- responsive media grid and product media URLs;
- truthful unavailable/empty/no-match states;
- deep links to `/library/[assetId]`;
- compact native-file-picker Upload action with verified durable promotion;
- uploaded cards prefer durable display names and preserve Unicode filenames;
- URL-owned server-side search `q` over display name, original filename and generated prompt;
- search is case-insensitive literal substring matching, max 120 characters, composed with kind/pagination.

**Approval evidence:**
- base Library/Viewer lifecycle `33034606396`;
- persistent upload final pre-merge runs `33067469516`, `33067469518`, `33067469527`; PR #9 merged as `d306f2abd1831538c51692545d72db1e5e9e0814`;
- search implementation runs `33069004219`, `33069004207`, `33069004227`, `33069004204`;
- search documentation-finalized runs `33070046222`, `33070046205`, `33070046336`, `33070046186`;
- PR #10 merged as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`; post-merge `33070215358` passed.

**Still intentionally open:** broader history controls, favorites/collections, rename/delete/batch management and drag/drop unless separately justified.

**Do not change:** Do not couple Library to legacy `studio_*`, expose temporary `generation_sources` as durable media, add Creatives/Uploads tabs, or turn search into a Saga-style filter console without an explicit product contract.

### Media Viewer
**Route:** `/library/[assetId]`  
**Status:** APPROVED — Media Viewer v0.1 + uploaded-media presentation + Download v0.1  
**Implementation:** `src/features/library/media-viewer.tsx`  
**Supporting:** `src/app/library/[assetId]/page.tsx`, `src/app/page.tsx`, `src/app/api/media/assets/[assetId]/download/route.ts`, `src/lib/api/media-assets-contract.ts`, `src/lib/capabilities/generation.ts`, `src/server/media/media-assets.ts`  
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
- generated downloads use deterministic `renderlab-<kind>-<id-prefix>.<ext>` fallback names rather than prompt/storage identity.

**Download approval evidence:**
- implementation head `6d528c47445b26b5464fa529b9e489e6a7ce87ff` passed UI Shell `33070792349`, Library Search `33070792317`, Persistent Media Upload `33070792362`, Library Lifecycle `33070792329` and Media Download Visual `33070792343`;
- configured Chromium verified uploaded `RenderLab-Download-画像.png`, generated deterministic fallback, and exact 68-byte R2 contents for both;
- three Viewer screenshots were visually inspected at desktop/mobile widths;
- direct cleanup verification left `0` Download fixtures, `0` upload sessions and `0` uploaded test assets.

**Do not change:** Provider/worker/R2 identity stays internal. Viewer continuation remains capability-derived. Download remains a contextual product action; do not expose raw R2 keys/signed URLs as durable product links or add batch/card actions without a separate contract.

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

Current durable product decisions are in `docs/ui/UI_DECISIONS.md`, including UI-022 persistent uploaded-media identity, UI-023 Library search and UI-024 durable media Download.

## Growth Rule
Future operations such as upscale, restore, inpaint, outpaint or structural guidance should first be evaluated as additions to Create or continuation actions. They receive a new top-level surface only when the user workflow genuinely requires a distinct workspace.
