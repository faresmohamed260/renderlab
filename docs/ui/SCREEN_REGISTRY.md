# Screen Registry

Tracks approved product surfaces and actual route/status/component composition.

## Statuses
- `PLANNED` — approved product surface, not yet implemented beyond temporary route scaffolding
- `UNAUDITED` — implementation exists but has not been audited
- `MIGRATING` — implementation is actively being brought to the approved RenderLab design
- `APPROVED` — rendered implementation has been reviewed and approved
- `LOCKED` — approved surface whose established design should not change without explicit product reason

## Initial Information Architecture
RenderLab is organized around user goals, not backend workflow types.

### Primary navigation
1. **Create** — the main creative workspace and default entry point.
2. **Library** — durable generated and uploaded media, discovery, organization, and continuation.

### Utility surfaces
- **Activity** — generation jobs and operational status.
- **Settings** — persistent product/account/application preferences as introduced.

### Contextual surfaces
- **Media Viewer** — focused inspection and continuation of a selected asset.

### Not initial top-level destinations
- Models
- Workflows
- Separate Image and Video applications
- Separate Edit/Animate/Upscale applications
- ComfyUI graph/node surfaces

Adding a backend workflow does not create a new top-level screen by default.

## Application Shell
**Status:** APPROVED  
**Implementation:** `src/components/shell/app-shell.tsx`  
**Historical design reference:** previous Figma `RenderLab Design System` → `Application Shell` → v0.2 desktop/mobile. Figma is no longer the ongoing design workspace.  
**Verification:** GitHub Actions production build + Playwright desktop/mobile checks passed on 2026-08-27. Generated 1440×1024 and 390×844 screenshots were visually inspected against the reviewed shell direction.  

Approved behavior:
- Desktop uses a persistent compact left navigation (`w-52`, approximately 208px).
- Create and Library are primary; Activity and Settings are visually secondary utilities.
- Compact 56px top bar provides route context plus Activity/account affordances.
- Main route content owns the overwhelming majority of screen area.
- Idle shell state does not show a permanent “Ready” status pill.
- The persistent shell stops at the route-content boundary. Create composer, references, generation controls/results, Library cards/grids, and feature-specific settings belong to their own feature designs.
- Narrow/mobile layouts hide the desktop sidebar and use bottom navigation for Create, Library, and Activity.
- Settings remains accessible through top utility/account access on narrow layouts rather than occupying persistent bottom navigation.
- Essential nav controls have touch-friendly sizing and semantic navigation landmarks.

`APPROVED` does not mean `LOCKED`; changes are allowed when product needs justify them, but they require rendered responsive review.

## Screens

### Create
**Route:** `/`  
**Status:** MIGRATING  
**Implementation:** `src/features/create/create-workspace.tsx`  
**Current design artifacts:** `design/penpot/create-v0.2-desktop.svg`, `design/penpot/create-v0.2-mobile.svg`, `design/penpot/create-v0.2-runtime-states.svg`  
**Purpose:** Start and continue creative operations from one task-oriented workspace.  
**Initial production operations:** Create Image, Edit Image, Create Video, Animate Image.  

**Implemented now:**
- focused prompt composer;
- Image/Video output choice with Image as default;
- concrete essential aspect value;
- contextual video duration value;
- responsive two-row mobile composer with full-width Generate action;
- typed `/api/generation/jobs` submission boundary;
- truthful backend availability state;
- request validation and application-level generation/job types;
- local submission/error/job-status feedback that does not fabricate percentage progress;
- production build + responsive Playwright checks and rendered screenshot review.

**Intentionally not implemented yet:**
- reference upload/asset binding;
- reference-driven Edit/Animate runtime behavior;
- Advanced controls;
- workflow/model chooser;
- real configured generation backend adapter;
- job polling/realtime synchronization after submission;
- persisted result presentation and continuation actions.

**Current accepted design direction:**
- One focused composer rather than separate Image/Edit/Video/Animate screens.
- `Image` / `Video` is the main explicit output choice.
- Image is the default output.
- A compatible image reference changes context automatically: Image + reference → Edit; Video + reference → Animate.
- Essential controls show useful current values such as `1:1`, `16:9`, and `5 s`.
- Technical/model-specific controls remain contextual or Advanced.
- Runtime states derive from real asynchronous job state; no fake progress.
- A result is complete only after durable persistence succeeds.

**Default controls:**
- Prompt
- Add/reference input
- Image/Video output choice
- Small set of operation-specific essential current values
- Generate

**Contextual controls:**
- Attached reference context/removal/replacement
- Video duration
- Video aspect ratio/output shape
- Video resolution when meaningful
- Audio toggle for video when surfaced
- Other controls only when supported and useful for the current task

**Advanced controls:** seed, negative prompt, steps where genuinely variable/useful, CFG/guidance where useful, frame rate, and other deliberately advanced tuning.  
**Internal/not user-facing by default:** provider, worker, ecosystem, storage transport, workflow graph/node IDs, failover bookkeeping.  
**Shell boundary:** Create owns its composer, references, controls, results, and feature-specific layout.  
**Do not change:** Do not turn the default Create workspace into a generic ComfyUI/workflow parameter form or wire fake generation behavior merely to make the screen look complete.

### Library
**Route:** `/library`  
**Status:** PLANNED; route exists with temporary `RoutePlaceholder` only  
**Purpose:** Find, inspect, organize, reuse, and continue from durable media assets.  
**Content:** Generated images/videos and persistent uploaded assets.  
**Primary capabilities:** browse, search/filter/sort as approved, preview, organize/favorite where retained, download, delete, open viewer, start compatible continuation actions, reuse assets as inputs.  
**Do not change:** Library is not merely generation history.

### Media Viewer
**Route:** `/library/[assetId]`  
**Status:** PLANNED; route exists with temporary `RoutePlaceholder` only  
**Purpose:** Inspect one media asset in detail and take the next meaningful action.  
**Primary capabilities:** large media presentation, essential metadata, media actions, provenance/settings when relevant, capability-derived continuation actions, return to originating context.  
**Do not change:** continuation actions should be capability-derived rather than hard-coded independently in every media surface.

### Activity
**Route:** `/activity`  
**Status:** PLANNED; route exists with temporary `RoutePlaceholder` only  
**Purpose:** Provide visibility into current/recent asynchronous generation work and actionable failures without forcing users to manage infrastructure.  
**Primary capabilities:** running/queued/recent jobs, real execution state, terminal states, useful failure explanation/action, completed output access, retry/cancel only when supported.  
**Do not change:** do not expose worker selection, failover controls, or provider infrastructure as routine user responsibilities.

### Settings
**Route:** `/settings`  
**Status:** PLANNED; route exists with temporary `RoutePlaceholder` only  
**Purpose:** Hold persistent application/account preferences that do not belong in the creative workflow.  
**Initial scope:** Not yet defined; create only settings backed by actual requirements.  
**Do not change:** do not use Settings as a dumping ground for workflow parameters or model controls.

## Creation Experience Resolution
The initial Create experience uses a single workspace instead of separate top-level Image, Video, Edit, and Animate applications.

Operation is resolved from user intent and inputs where practical, while explicit output selection remains available when ambiguity matters:
- Prompt + Image output → Create Image.
- Prompt + image reference + Image output → Edit Image.
- Prompt + Video output, no image → Create Video.
- Prompt + image reference + Video output → Animate Image.

Current interaction/runtime decisions are documented in UI-015 through UI-019.

## Growth Rule
Future operations such as upscale, restore, inpaint, outpaint, structural guidance, or other workflow-backed capabilities should first be evaluated as additions to Create or as continuation actions. They receive a new top-level surface only when the user workflow genuinely requires a distinct workspace.
