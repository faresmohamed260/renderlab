# Create usability-first R&D v0.5

Status: **ACTIVE R&D / HUMAN REVIEW REQUIRED / NOT APPROVED**

Issue: #148

Branch: `rd/create-usability-first-v05`

Production authorization: **none**

## Why this reset exists

v0.3 and v0.4 were rejected in human review because they made the Create workflow harder to understand while trying to establish a distinctive spatial/motion language. The next direction starts from the opposite premise:

> A first-time user must understand how to create an image or video before RenderLab asks them to appreciate its motion system.

The production Create contracts remain authoritative. This prototype does not change product semantics, API contracts, route behavior, generation capabilities, reference limits, or deployment state.

v0.4 is now archived explicitly as rejected R&D in `design/rd/create-cinematic-stage-v04.md`; PR #182 is closed unmerged. Do not revive v0.4 as the active direction unless the user explicitly reopens it.

## Two-source design model

### Interaction grammar comes from comparable creative products

The following current products were reviewed as references for task structure, not visual copying:

- **Runway** — prompt-first generation canvas; references can be dragged/uploaded and inserted with `@`; model/settings stay adjacent to the prompt; completed generations expose `Use`/continuation actions.
- **Adobe Firefly** — unified image/video workspace; central generation action bar; visible Reference control; generated media exposes edit, Generate video, Use as reference, and Load all actions.
- **Krea** — written prompt and reference image work together; generated outputs remain close to the prompt; image results can continue into editing, enhancement, and video.
- **Google Flow** — explicit `Ingredients to Video` and `Frames to Video` modes; assets are reusable; previous frames become inputs to the next shot.
- **Freepik / Magnific** — video flow is plainly expressed as prompt → model/aspect/duration → Generate, with start/end image roles where relevant.
- **OpenArt** — image-to-video exposes start frame, optional end frame, prompt, model/duration/aspect/resolution, then generation and iteration.
- **Luma Dream Machine** — start/end keyframes and reference roles are named directly; prompt remains the central instruction.

Observed common pattern:

1. choose what you are making;
2. describe it;
3. attach references/frames when useful;
4. set a small number of essential output controls;
5. press an unmistakable Generate action;
6. review the result;
7. reuse the result as the next input instead of starting over.

These products define **interaction expectations only**. They do not define RenderLab's visual identity.

### RenderLab visual identity comes from the approved Landing

The production Landing on `main` is the visual source of truth. Create should inherit:

- near-black canvas;
- faint 64px grid and restrained grain;
- asymmetric media framing;
- the canonical quarter-arc as a recurring accent, not as an affordance-breaking control shape;
- cool-blue and warm-orange atmospheric light;
- large compressed editorial headings where hierarchy benefits from them;
- small uppercase technical metadata;
- shallow media parallax / drift;
- precise 1px rules and restrained shadows;
- the approved `RenderLabBrand` asset unchanged.

The Landing already describes the product journey as **Create → References → Motion → Continue**. The Create redesign should make that journey operational rather than inventing a competing metaphor.

**Hard coherence rule:** comparable products may inform where controls live and how tasks are named; the approved Landing defines what the RenderLab product looks and feels like.

## Chosen v0.5 direction — Clear Composer

One persistent composer is the obvious control center. A result workspace appears above it only when there is something to review.

### Initial image state

- clearly selected **Image** mode;
- heading: `Create an image`;
- prompt is the largest interactive surface and the obvious first action;
- a labelled **Add reference** control is visible without an icon-only discovery step;
- image references appear directly above the prompt as `Primary image` and `Reference image`;
- essential settings remain visible in the composer footer: model, aspect ratio, Advanced;
- **Generate** stays in the same high-contrast position.

### Video state

- clearly selected **Video** mode;
- prompt language changes to motion/shot language;
- the optional image input is labelled **Start image** rather than an abstract source object;
- essential video settings are adjacent: aspect ratio, resolution/duration, audio;
- Generate remains in the same position.

### Advanced

Secondary controls expand *inside the composer* below the essentials. They do not replace, cover, or move the prompt and Generate action.

### Generating

The composer remains visible and stable. The result region appears above it with truthful `Generating…` status. RenderLab expression is confined to registration lines, a subtle axis pulse, and a bounded aperture reveal. No fake percentage or fake progress stage is introduced.

### Result / continuation

The result becomes the dominant media surface, but the composer remains immediately available below it. Result actions are explicit:

- **Edit** — image result becomes the primary image input;
- **Use as reference** — result is attached as a reference for the next image generation;
- **Animate** — switches to Video and uses the result as the Start image;
- **Upscale 2×** — preserves the existing continuation contract;
- download remains a direct media action where appropriate.

This is the operational version of the Landing’s `Make it. Shape it. Move it. Keep going.` promise.

## Motion / physics / morphing rules

These are subordinate to usability:

- controls never move away from the pointer;
- controls never require depth perception to understand hierarchy;
- reference insertion uses a short spring settle, not free physics;
- Image ↔ Video uses one shared mode highlight and content crossfade/morph;
- result reveal grows from a bounded aperture into the media frame while the composer stays fixed;
- pointer depth is allowed only on media/result surfaces, never on prompt/settings/Generate;
- the quarter-arc appears as media framing / registration geometry, never as the only shape of a critical button;
- reduced motion resolves directly to the same final geometry with no delayed essential actions.

## Desktop composition

1. persistent RenderLab header;
2. concise `Create an image/video` context;
3. optional result workspace;
4. persistent composer centered below the workspace;
5. familiar result action panel;
6. faint Lab Matrix grid/halo around the media, not around every control.

## 390px composition

Mobile is not a compressed desktop panel:

- Image / Video switch is full-width and obvious;
- prompt remains first-class;
- Add reference / Start image is a labelled 44px+ target;
- reference cards are flat and non-overlapping;
- essential settings wrap cleanly;
- Generate becomes a full-width high-contrast action when space requires it;
- Advanced expands inline;
- Result stacks media → metadata/actions → composer with no transformed hit-testing hierarchy.

## Current implementation / evidence state — 2026-09-11

### Repository state

- `main` verified at the start of this reset: `dd0fcc725c225f2e15a934ad9fe721cb27b96756`.
- Active branch: `rd/create-usability-first-v05`.
- Initial prototype commit: `1b6a0a1dad20da67b482c2ce3746d5a08ff1022a`.
- Workflow-alignment commit: `cdf463ac2d5aad61877caf68a53890feae410dcd`.
- The branch contains isolated R&D only: prototype HTML/CSS/JS, R&D design record, verifier, and dedicated GitHub Actions workflow. Production `/create` remains untouched.

### Workflow run 1

- Run: `34606061038` / **Create Usability-First R&D v0.5** run #1.
- Result: **FAIL before browser execution**.
- Cause: workflow setup incorrectly used npm caching / `npm ci` even though this repository intentionally has no committed lockfile.
- Resolution: aligned the R&D workflow with repository convention: Node 24 + `npm install --no-audit --no-fund`.
- This was infrastructure-only and is not design evidence.

### Workflow run 2

- Exact tested head: `cdf463ac2d5aad61877caf68a53890feae410dcd`.
- Run: `34606190328` / run #2.
- Browser setup: **PASS**.
- Interaction/evidence verifier: **FAIL** on one real accessibility gate: `mobile remove target >= 44px`.
- Artifact upload: **PASS**.
- Artifact: `10266791593` — `renderlab-create-usability-first-v05`.
- Artifact digest: `sha256:60ba4ce5fd33b13874d5392d55a4b3aec56e39192652fd187616f89d8e34eb1d`.
- The failing assertion must be fixed in the prototype. Do **not** weaken or remove the 44px gate.

### Partial human visual review of run 2

The failed run still produced enough evidence to review the early composition.

**Desktop authoring:**
- materially clearer than v0.3/v0.4;
- first-use sequence is legible without explanation: Image/Video → Add reference → Prompt → Model/Ratio/Advanced → Generate;
- Generate has conventional high-contrast affordance and does not rely on the quarter-arc geometry;
- Landing coherence is visible through the near-black canvas, restrained grid, blue/orange atmosphere, compressed heading, technical labels, and sparse 1px framing rather than through unusual control shapes.

**390px authoring:**
- mode switch, Add reference, prompt, essential settings, and full-width Generate are immediately visible;
- composition reads as a usable creative form rather than a miniature desktop spatial experiment;
- the run exposed a genuine touch-target defect on reference Remove that must be corrected before acceptance.

**Desktop result / continuation:**
- result media is dominant and continuation actions are named explicitly;
- the composer remains directly available below the result;
- Animate continuation visibly switches the composer to Video and binds the result/current source as a `Start image`, matching the intended interaction grammar;
- this state is not yet approved; complete mobile/result/reduced-motion evidence is still required after the touch-target fix.

### Current status

**v0.5 is NOT an approval candidate yet.** The concept direction is retained, but validation is incomplete. No PR should be opened for approval and no production implementation contract should be expanded until the remaining verifier defect is fixed and the complete evidence set receives human review.

## Prototype acceptance gates

Before this can be shown as an approval candidate, evidence must prove:

- first-time authoring state makes Image/Video, prompt, Add reference, settings, and Generate visible;
- two image references can be added, reprioritized, and removed;
- Video clearly exposes Start image semantics and one-source limit;
- Advanced never covers prompt or Generate;
- Generate remains spatially stable across mode/reference changes;
- generating state is truthful and composer remains usable/legible;
- result actions include clear continuation into Edit / Reference / Animate;
- Animate switches to Video and binds the result as Start image;
- keyboard focus is visible;
- 390px touch targets are at least 44px where essential;
- no accepted horizontal overflow;
- reduced motion reaches complete states without delayed essential controls;
- media-only pointer depth has bounded motion and cannot shift controls.

## Next work — exact handoff sequence

1. Re-verify current `main`, `rd/create-usability-first-v05`, issue #148, and any new branch workflow runs before editing.
2. Read `AGENTS.md`, `PROJECT.md`, `docs/ui/UI_MIGRATION.md`, `docs/ui/UI_DECISIONS.md`, `docs/ui/DESIGN_WORKFLOW.md`, `docs/ui/UI_SYSTEM.md`, `docs/ui/VISUAL_NORTH_STAR.md`, `docs/ui/COMPONENT_CATALOG.md`, `docs/ui/SCREEN_REGISTRY.md`, and this file.
3. Inspect the v0.5 prototype/verifier/workflow at the current branch head. Do not infer current code from this handoff text.
4. Fix the mobile reference **Remove** target so its actual rendered hit area is at least 44×44px. Preserve the flat/non-overlapping mobile reference treatment.
5. Rerun the complete exact-head v0.5 workflow. Do not weaken the touch-target assertion.
6. If green, download and visually review the complete evidence: desktop authoring/references/Video/Advanced/generating/result/continuation, 390px authoring/references/Video/Advanced/result, reduced motion, focus/overflow, and temporal recording.
7. Judge usability before spectacle: a first-time user should know what to do without explanation. If not, correct the information hierarchy before adding richer motion.
8. Judge visual coherence against the approved Landing: competitors define interaction grammar; Landing defines RenderLab appearance. Do not copy competitor styling.
9. Only after the complete evidence is strong should the branch be promoted to a reviewed candidate and a draft review PR be opened. User approval remains mandatory before any production `/create` implementation contract.

## Scope boundary

This remains isolated design R&D. Do not merge into production, expand Phase 23, alter `/create`, or deploy without explicit human approval and a separate implementation contract.