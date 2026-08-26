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
**Figma reference:** `RenderLab Design System` → `Application Shell` → v0.2 desktop/mobile  
**Verification:** GitHub Actions production build + Playwright desktop/mobile checks passed on 2026-08-27. Generated 1440×1024 and 390×844 screenshots were visually inspected against the v0.2 direction.  

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
**Status:** PLANNED; route exists with temporary `RoutePlaceholder` only  
**Purpose:** Start and continue creative operations from one task-oriented workspace.  
**Initial production operations:** Create Image, Edit Image, Create Video, Animate Image.  

**Default controls:**
- Prompt
- Reference/input media when relevant
- Operation/output intent when it cannot be inferred safely
- Small set of operation-specific essential output choices
- Generate

**Contextual controls:**
- Image/reference inputs for edit/animate
- Video duration
- Video aspect ratio/output shape
- Video resolution when meaningful
- Audio toggle for video
- Other controls only when supported and useful for the current task

**Advanced controls:** seed, negative prompt, steps where genuinely variable/useful, CFG/guidance where useful, frame rate, and other deliberately advanced tuning.  
**Internal/not user-facing by default:** provider, worker, ecosystem, storage transport, workflow graph/node IDs, failover bookkeeping.  
**Shell boundary:** Create owns its composer, references, controls, results, and feature-specific layout.  
**Do not change:** Do not turn the default Create workspace into a generic ComfyUI/workflow parameter form.

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

Operation is resolved from user intent and inputs where practical, while explicit selection remains available when ambiguity matters:
- Prompt + image output intent → Create Image.
- Prompt + reference image + edit intent → Edit Image.
- Prompt + video output intent, no image → Create Video.
- Prompt + image reference + video output intent → Animate Image.

The exact interaction control for operation selection remains experimental until the Create design is reviewed.

## Growth Rule
Future operations such as upscale, restore, inpaint, outpaint, structural guidance, or other workflow-backed capabilities should first be evaluated as additions to Create or as continuation actions. They receive a new top-level surface only when the user workflow genuinely requires a distinct workspace.
