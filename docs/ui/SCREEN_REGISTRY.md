# Screen Registry

Tracks approved product surfaces and, once implementation begins, their actual route/status/component composition.

## Statuses
- `PLANNED` — approved product surface, not yet implemented
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
- **Activity** — generation jobs and operational status, accessible without making queue management a primary creative destination.
- **Settings** — product/account/application preferences as they are introduced.

### Contextual surfaces
- **Media Viewer** — focused inspection and continuation of a selected asset; entered from Library, Create results, or Activity rather than treated as a primary navigation destination.

### Not initial top-level destinations
- Models
- Workflows
- Separate Image and Video applications
- Separate Edit/Animate/Upscale applications
- ComfyUI graph/node surfaces

These concepts may be selectable or contextual inside Create when they provide user value. Adding a backend workflow does not create a new top-level screen by default.

## Application Shell
**Status:** EXPERIMENTAL design direction; no implementation exists yet.  
**Figma reference:** `RenderLab Design System` → `Application Shell` page, exploration v0.1.  

Current direction:
- Desktop uses a persistent compact left navigation.
- Create and Library are primary; Activity and Settings are visually secondary utilities.
- Main workspace/media receives substantially more space than application chrome.
- Compact top-level status may surface running generation activity without requiring navigation to Activity.
- Create controls cluster around the composer/workspace rather than occupying a permanent large settings sidebar.
- Narrow/mobile layouts replace the desktop sidebar with an appropriate compact navigation treatment; they do not simply shrink the same sidebar.

This is intentionally not `APPROVED` or `LOCKED` yet. It must be reviewed as rendered design/implementation before those statuses are used.

## Screens

### Create
**Route:** `/`  
**Status:** PLANNED  
**Purpose:** Start and continue creative operations from one task-oriented workspace.  
**Primary experience:** A unified composer/workspace that lets the user express intent, attach/select relevant media, choose the intended output/task when necessary, set essential output controls, generate, observe real job state, and continue from results.  
**Initial production operations:**
- Create Image
- Edit Image
- Create Video
- Animate Image

These operations map onto the currently verified image and video workflow capabilities. They are product concepts, not direct workflow IDs.

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
- Video resolution when it is a meaningful user choice
- Audio toggle for video
- Other controls only when supported by the resolved workflow and useful for the current task

**Advanced controls:**
- Seed
- Negative prompt
- Steps where genuinely variable/useful
- CFG/guidance where genuinely useful
- Frame rate
- Other workflow/model tuning deliberately classified as advanced

**Internal/not user-facing by default:** provider, worker, ecosystem, storage transport, workflow graph/node IDs, failover bookkeeping.  
**Result behavior:** Generated media appears in the same creative flow with actions derived from compatibility, such as Edit, Animate, Reuse settings, Download, or View in Library. Completion means the durable result has been persisted, not merely returned by the provider.  
**Current shell exploration:** large media/result canvas with a compact composer anchored near the working area; desktop navigation remains separate from creation controls. This is a design exploration, not a locked layout.  
**Reference pattern:** Fresh RenderLab design; Saga supplies behavioral/backend evidence only.  
**Do not change:** Do not turn the default Create workspace into a generic ComfyUI/workflow parameter form.

### Library
**Route:** `/library`  
**Status:** PLANNED  
**Purpose:** Find, inspect, organize, reuse, and continue from durable media assets.  
**Content:** Generated images/videos and persistent uploaded assets should be represented as media assets while preserving their provenance/type distinctions where relevant.  
**Primary capabilities:**
- Browse media
- Search/filter/sort as approved during implementation
- Preview
- Favorite/organize where retained
- Download
- Delete
- Open Media Viewer
- Start compatible continuation actions
- Reuse an asset as an input in Create

**Reference pattern:** Preserve proven reusable-media behavior from Saga without copying its gallery UI.  
**Do not change:** Library is not merely generation history; reusable uploads and generated outputs are both durable creative assets.

### Media Viewer
**Route:** `/library/[assetId]`  
**Status:** PLANNED  
**Purpose:** Inspect one media asset in detail and take the next meaningful action.  
**Primary capabilities:**
- Large image/video presentation
- Essential asset metadata
- Download/delete/favorite or approved organization actions
- Generation provenance/settings when relevant
- Continuation actions determined by asset/workflow compatibility
- Return to originating context

**Reference pattern:** Purpose-built RenderLab viewer; no requirement to copy Saga viewer structure.  
**Do not change:** Continuation actions should be capability-derived rather than hard-coded independently in every media surface.

### Activity
**Route:** `/activity`  
**Status:** PLANNED  
**Purpose:** Provide visibility into current/recent asynchronous generation work and actionable failures without forcing users to manage infrastructure.  
**Primary capabilities:**
- Running/queued/recent jobs
- Real execution state when available
- Completed/failed state
- Failure explanation/action where useful
- Open completed output
- Retry/cancel only when supported by the final job contract

**Navigation role:** Utility surface rather than one of the two primary creative destinations. Active generation state may also surface globally in the application shell.  
**Do not change:** Do not expose worker selection, failover controls, or provider infrastructure as routine user responsibilities.

### Settings
**Route:** `/settings`  
**Status:** PLANNED  
**Purpose:** Hold persistent application/account preferences that do not belong in the creative workflow.  
**Initial scope:** Not yet defined; create only settings backed by actual product requirements.  
**Do not change:** Do not use Settings as a dumping ground for workflow parameters or model controls.

## Creation Experience Resolution
The initial Create experience uses a single workspace instead of separate top-level Image, Video, Edit, and Animate applications.

The operation is resolved from user intent and inputs where practical, while explicit operation selection remains available when ambiguity matters. Examples:
- Prompt + image output intent → Create Image.
- Prompt + reference image + edit intent → Edit Image.
- Prompt + video output intent, no image → Create Video.
- Prompt + image reference + video output intent → Animate Image.

The exact interaction control for operation selection remains experimental until the Create design is reviewed.

## Growth Rule
Future operations such as upscale, restore, inpaint, outpaint, structural guidance, or other workflow-backed capabilities should first be evaluated as additions to Create or as continuation actions. They should receive a new top-level product surface only when the user workflow genuinely requires a distinct workspace.
