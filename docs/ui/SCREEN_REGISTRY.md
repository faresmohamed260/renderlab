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
**Status:** PLANNED; temporary route placeholder  
**Purpose:** Find, inspect, organize, reuse, and continue from durable RenderLab `media_assets`. Library is not merely generation history.

### Media Viewer
**Route:** `/library/[assetId]`  
**Status:** PLANNED; temporary route placeholder  
**Purpose:** Inspect one durable media asset and take capability-derived continuation/media actions.

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

Current interaction/runtime decisions are documented in UI-015 through UI-019.

## Growth Rule
Future operations such as upscale, restore, inpaint, outpaint, structural guidance, or other workflow-backed capabilities should first be evaluated as additions to Create or continuation actions. They receive a new top-level surface only when the user workflow genuinely requires a distinct workspace.
