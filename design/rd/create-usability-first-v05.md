# Create usability-first R&D v0.5

Status: **R&D / HUMAN REVIEW REQUIRED / NOT APPROVED**

Issue: #148

Branch: `rd/create-usability-first-v05`

## Why this reset exists

v0.3 and v0.4 were rejected in human review because they made the Create workflow harder to understand while trying to establish a distinctive spatial/motion language. The next direction starts from the opposite premise:

> A first-time user must understand how to create an image or video before RenderLab asks them to appreciate its motion system.

The production Create contracts remain authoritative. This prototype does not change product semantics, API contracts, route behavior, generation capabilities, reference limits, or deployment state.

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

## Scope boundary

This remains isolated design R&D. Do not merge into production, expand Phase 23, alter `/create`, or deploy without explicit human approval and a separate implementation contract.