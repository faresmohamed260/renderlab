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
- temporary signed-R2 reference upload with opaque source identity;
- reference preview/removal/replacement;
- Image + reference → Edit; Video + reference → Animate;
- real RenderLab generation jobs and durable media persistence;
- capability-derived Edit/Animate continuation from persisted images;
- durable `media-asset` continuation verified in run `33027460976`;
- Advanced controls from verified capability definitions;
- complete configured browser lifecycle approval run `33031817744` with responsive screenshots and cleanup;
- persistent uploaded-image continuation verified in run `33066999350`; Create reloads the durable uploaded asset through the existing server-validated handoff and preserves the uploaded display name in the reference summary rather than mislabeling it as generated.

**Do not change:** Do not turn Create into a generic ComfyUI form, expose worker/provider/R2 implementation or add fake runtime behavior.

### Library
**Route:** `/library`  
**Status:** APPROVED — Library v0.1 + persistent Upload + search v0.1  
**Implementation:** `src/features/library/library-view.tsx`  
**Persistent upload client:** `src/features/library/library-upload-button.tsx`  
**Supporting:** `src/lib/api/media-assets-contract.ts`, `src/lib/api/media-upload-contract.ts`, `src/server/media/media-assets.ts`, `src/server/media/media-uploads.ts`, `GET /api/media/assets`, `POST /api/media/uploads/upload-tickets`, `POST /api/media/uploads/upload-completions`  
**Approved design artifacts:** `design/penpot/library-v0.1.svg`, `design/penpot/library-v0.2-upload.svg`

**Purpose:** Find, inspect, reuse and continue from durable RenderLab media. Library is a reusable creative-asset workspace, not merely generation history.

**Library v0.1 approved behavior:**
- unified newest-first `media_assets` browsing;
- `All / Images / Videos` filtering via URL state;
- bounded pagination;
- responsive media grid;
- product media URLs for image/video presentation;
- truthful unavailable/empty states;
- deep links to `/library/[assetId]`;
- credential-free verification run `33034606323`;
- configured shared-R2/Supabase lifecycle approval run `33034606396`.

#### Persistent upload extension — approved
- one compact `Upload` action in the existing Library header;
- native file picker; no separate Uploads tab or generic modal framework;
- PNG/JPEG/WebP up to 25 MB;
- ticket → short-lived signed R2 PUT → completion → server HEAD verification;
- asset appears through the normal Library list only after verified `media_assets` promotion;
- uploaded cards prefer durable display names;
- Unicode/non-ASCII filenames remain readable;
- existing approved Library grid remains the durable media surface.

Final pre-merge upload evidence: UI Shell `33067469516`, backend integration `33067469518`, Library lifecycle `33067469527`, inspected responsive screenshots and cleanup. PR #9 merged as `d306f2abd1831538c51692545d72db1e5e9e0814`; post-merge `main` checks passed.

#### Search v0.1 — approved for merge
- one native `GET` search form integrated below the existing kind filter;
- shareable URL parameter `q` owns search state;
- server-side search spans durable media rather than filtering only the rendered page;
- case-insensitive literal substring matching over display name, original filename and generated prompt;
- whitespace-normalized, max 120 characters;
- user punctuation is literal text, not query syntax;
- combines with `All / Images / Videos` and newest-first pagination;
- kind/pagination links preserve active search; changing kind/search resets offset;
- concise `Clear` action while searching;
- truthful `No media matches …` state with clear-search recovery;
- no relevance ranking, model/date filters, command palette, collection model or generic search framework.

**Search approval evidence:**
- UI Shell `33069004219` passed production build and credential-free Playwright/API coverage;
- existing backend upload regression `33069004207` passed;
- existing real upload → Library → Viewer → Create regression `33069004227` passed;
- configured search run `33069004204` passed prompt, Unicode filename, literal punctuation and kind+search semantics with self-cleaning real R2-backed fixtures;
- four desktop/mobile result/empty screenshots from `33069004204` were visually inspected;
- direct Supabase verification left `0` search fixtures, `0` upload sessions and `0` uploaded test assets.

The managed R2 CORS rule includes both localhost CI origins plus the current stable RenderLab Vercel domains. See `docs/architecture/INFRASTRUCTURE.md`.

**Still intentionally open:** broader history controls, favorites/collections, rename/delete/download/batch management and drag/drop mechanics unless separately justified.

**Do not change:** Do not couple Library to legacy `studio_generations`/`studio_uploads`, do not expose temporary `generation_sources` as durable media, do not add Creatives/Uploads tabs, and do not turn search into a legacy-style filter console without an explicit product contract.

### Media Viewer
**Route:** `/library/[assetId]`  
**Status:** APPROVED — Media Viewer v0.1 + uploaded-media presentation  
**Implementation:** `src/features/library/media-viewer.tsx`  
**Supporting:** `src/app/library/[assetId]/page.tsx`, `src/app/page.tsx`, `src/lib/api/media-assets-contract.ts`, `src/lib/capabilities/generation.ts`  
**Design artifact:** `design/penpot/media-viewer-v0.1.svg`

**Approved behavior:**
- deep-linked durable asset route;
- responsive media-primary image/video presentation;
- secondary product metadata;
- capability-derived continuation actions;
- persisted image assets expose Edit/Animate;
- Viewer links carry only opaque `media-asset` identity plus action intent;
- Create reloads durable media and validates action compatibility server-side;
- configured generated-media Library → Viewer → Create Edit approval run `33034606396`;
- uploaded assets use truthful uploaded metadata and display name;
- original filename/size/source metadata appears when available;
- uploaded images derive Edit/Animate from the same capability model and ordinary `media-asset` identity;
- uploaded-media Viewer → Create Edit lifecycle is visually approved in run `33066999350` at desktop/mobile widths.

**Do not change:** Provider/worker/R2 identity stays internal. Viewer actions remain capability-derived and use opaque product media identity; URL parameters are navigation intent, not authoritative asset state.

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

Current durable interaction/product decisions are documented in `docs/ui/UI_DECISIONS.md`, including UI-022 for persistent uploaded-media identity and UI-023 for Library search.

## Growth Rule
Future operations such as upscale, restore, inpaint, outpaint or structural guidance should first be evaluated as additions to Create or continuation actions. They receive a new top-level surface only when the user workflow genuinely requires a distinct workspace.
