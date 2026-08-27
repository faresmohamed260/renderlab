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

Models, Workflows, separate Image/Video apps, separate Edit/Animate/Upscale apps, and ComfyUI graph/node surfaces are not initial top-level destinations. Adding a backend workflow does not create a top-level screen by default.

## Application Shell
**Status:** APPROVED  
**Implementation:** `src/components/shell/app-shell.tsx`  
**Verification:** GitHub production build + Playwright desktop/mobile checks and rendered screenshot review.

Approved behavior:
- compact persistent desktop left navigation;
- Create/Library primary, Activity/Settings secondary;
- compact top bar for route context/utilities;
- route content owns the overwhelming majority of screen area;
- shell stops at route-content boundary and does not own Create/Library feature UI;
- narrow layouts hide desktop sidebar and use bottom navigation for Create/Library/Activity;
- touch-friendly semantic navigation.

`APPROVED` does not mean `LOCKED`.

## Screens

### Create
**Route:** `/`  
**Status:** APPROVED  
**Implementation:** `src/features/create/create-workspace.tsx`  
**Supporting implementation:** `src/features/create/create-advanced-panel.tsx`  
**Design artifacts:** `design/penpot/create-v0.2-desktop.svg`, `design/penpot/create-v0.2-mobile.svg`, `design/penpot/create-v0.2-runtime-states.svg`, `design/penpot/create-v0.3-advanced.svg`  
**Purpose:** Start and continue creative operations from one task-oriented workspace.  
**Initial operations:** Create Image, Edit Image, Create Video, Animate Image.

**Implemented and verified:**
- focused prompt composer;
- Image/Video output choice with Image default;
- concrete aspect and contextual video duration values;
- responsive two-row mobile composer;
- reference selection for PNG/JPEG/WebP up to 25 MB;
- signed direct-R2 upload with server verification and opaque source identity;
- reference preview/removal/replacement;
- Image + reference → Edit and Video + reference → Animate context resolution;
- typed `POST /api/generation/jobs` and `GET /api/generation/jobs/[jobId]` boundaries;
- real RenderLab job polling without fabricated percentage progress;
- bounded retry/backoff for transient client polling/network failures;
- RenderLab-owned `generation_jobs` + `media_assets` persistence and private media-delivery APIs;
- native Create Image end-to-end generation/persistence;
- native reference-driven Edit Image end-to-end generation/persistence (GitHub run `33021843503`);
- native Create Video and native reference-driven Animate Image end-to-end generation/persistence (GitHub run `33021977765`);
- persisted `media_assets` result loading and real image/video rendering after successful jobs;
- capability-derived **Edit** and **Animate** continuation actions on persisted image results;
- durable result reuse through opaque `media-asset` input identity, live-verified in GitHub run `33027460976` (`Create Image → persisted asset → Edit Image`) with fixture cleanup;
- conservative poll-time worker reassignment: only explicit credit exhaustion or explicit worker-unavailable evidence may reassign; generic 429/5xx/network ambiguity does not trigger duplicate-risk resubmission. Post-merge live regression run `33027861292` succeeded;
- compact Advanced disclosure using normalized Radix Collapsible rather than a bespoke disclosure mechanic;
- Advanced values from verified capability definitions: negative prompt, seed, steps, guidance, plus video-only frame rate;
- separate Image/Video Advanced drafts and reset-to-default behavior;
- Advanced production build, behavior/API tests, and reviewed desktop/mobile screenshots in GitHub run `33030364272` before PR #6 merge;
- complete configured lifecycle review in GitHub run `33031817744`: a real browser-driven Create Image request reached durable persistence, rendered at desktop/mobile widths, exposed **Edit**/**Animate**, selected **Edit** using the persisted asset, rendered the continuation state at both widths, and self-cleaned the generated R2/media/job fixture;
- production build + responsive Playwright/API validation.

**Approval evidence:** The complete Create product loop is verified both functionally and visually against configured production resources. Run `33031817744` provides the final lifecycle screenshots and cleanup evidence. Create is `APPROVED`, not `LOCKED`; future changes still require scoped validation and must preserve the accepted behavior below.

**Accepted design direction:**
- one focused workspace rather than separate Image/Edit/Video/Animate screens;
- Image/Video is the main explicit output choice;
- compatible reference changes operation context automatically;
- essential controls show useful current values such as `1:1`, `16:9`, `5 s`;
- technical/model-specific controls remain contextual or Advanced;
- Advanced remains collapsed by default and uses maintained disclosure mechanics;
- runtime states derive from real asynchronous state; no fake progress;
- result is complete only after durable persistence;
- continuation actions are capability-derived and operate on durable product media identities.

**Default controls:** Prompt, reference input, Image/Video, operation-specific essential values, Generate.  
**Contextual controls:** attached reference context/removal/replacement, video duration/aspect, supported continuation actions.  
**Advanced controls:** negative prompt, seed, steps, guidance, video frame rate, and only future parameters deliberately promoted from verified capability definitions.  
**Internal:** provider, worker, ecosystem, R2 key, workflow graph/node IDs, failover bookkeeping.  
**Do not change:** Do not turn Create into a generic ComfyUI parameter form or wire fake behavior merely to make it look complete.

### Library
**Route:** `/library`  
**Status:** APPROVED  
**Implementation:** `src/features/library/library-view.tsx`  
**Supporting implementation:** `src/lib/api/media-assets-contract.ts`, `src/server/media/media-assets.ts`, `GET /api/media/assets`  
**Design artifact:** `design/penpot/library-v0.1.svg`  
**Purpose:** Find, inspect, reuse, and continue from durable RenderLab media. Library is a reusable creative-asset workspace, not merely generation history.

**Implemented and verified:**
- unified newest-first `media_assets` browsing;
- `All / Images / Videos` filtering through URL state;
- server-owned list contract with bounded pagination (`limit`, `offset`, `hasMore`);
- responsive two/three/four-column media grid;
- image previews and video preview/thumbnail states through product media URLs;
- prompt/fallback title, media kind and created-time card metadata;
- deep links to `/library/[assetId]`;
- truthful unavailable state when shared media infrastructure is not configured;
- truthful empty/no-older-media states;
- desktop/mobile credential-free rendering in GitHub Actions run `33034606323`;
- configured shared-R2/Supabase lifecycle in run `33034606396`, including deterministic 400×300 media geometry verification and fixture cleanup.

**Approval evidence:** Run `33034606396` rendered a real R2-backed durable `media_assets` fixture in Library at desktop/mobile widths, verified product media delivery and correct 4:3 geometry, opened the deep-linked Viewer, and self-cleaned the fixture. Library v0.1 is `APPROVED`, not `LOCKED`.

**Accepted design direction:**
- media is visually primary;
- default organization remains simple and contract-backed;
- kind filtering and newest-first order are enough for v0.1;
- dimensions are not required for grid layout correctness;
- richer organization is added only when RenderLab owns the corresponding persistent data contract.

**Still intentionally open:** persistent uploaded assets, search, favorites/collections, richer history controls, rename/delete/download/batch management.  
**Do not change:** Do not couple Library to legacy `studio_generations`/`studio_uploads`, and do not copy Saga organization controls before RenderLab owns the required data.

### Media Viewer
**Route:** `/library/[assetId]`  
**Status:** APPROVED  
**Implementation:** `src/features/library/media-viewer.tsx`  
**Supporting implementation:** `src/app/library/[assetId]/page.tsx`, `src/app/page.tsx`, `src/lib/api/media-assets-contract.ts`, `src/lib/capabilities/generation.ts`  
**Design artifact:** `design/penpot/media-viewer-v0.1.svg`  
**Purpose:** Inspect one durable media asset and continue from it using compatible product capabilities.

**Implemented and verified:**
- deep-linked durable asset route;
- media-primary responsive image/video presentation;
- prompt/fallback title and created-time metadata;
- optional dimensions and video duration details;
- capability-derived continuation actions rather than Viewer-specific action rules;
- persisted image assets expose **Edit** and **Animate** through the shared capability model;
- Viewer links carry only opaque `media-asset` identity plus continuation intent;
- root Create route treats continuation URL state as untrusted navigation intent, validates UUID/action compatibility, loads the durable media record server-side and initializes Create only when valid;
- malformed, unavailable, stale or incompatible continuation state falls back to usable Create with truthful local feedback rather than becoming product state;
- configured Library → Viewer → Create Edit lifecycle verified at desktop/mobile widths in GitHub Actions run `33034606396` with fixture cleanup.

**Approval evidence:** Run `33034606396` verified a real 400×300 R2-backed image in the Viewer, capability-derived Edit/Animate links, server-validated durable-asset Edit handoff into Create, correct media geometry, responsive rendering and cleanup. Media Viewer v0.1 is `APPROVED`, not `LOCKED`.

**Do not change:** Provider/worker/R2 identity stays internal. Viewer actions must remain capability-derived and use opaque product media identity; URL query parameters are continuation intent, not authoritative asset state.

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

Current interaction/runtime decisions are documented in UI-015 through UI-021.

## Growth Rule
Future operations such as upscale, restore, inpaint, outpaint, structural guidance, or other workflow-backed capabilities should first be evaluated as additions to Create or continuation actions. They receive a new top-level surface only when the user workflow genuinely requires a distinct workspace.
