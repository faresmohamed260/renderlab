# Create usability-first R&D v0.5

Status: **REVIEWED DESIGN CANDIDATE / FULL VERIFIER GREEN / HUMAN APPROVAL PENDING / NOT APPROVED**

Issue: #148

Branch: `rd/create-usability-first-v05`

Production authorization: **none**

## Why this reset exists

v0.3 and v0.4 were rejected in human review because they made the Create workflow harder to understand while trying to establish a distinctive spatial/motion language. The next direction starts from the opposite premise:

> A first-time user must understand how to create an image or video before RenderLab asks them to appreciate its motion system.

The production Create contracts remain authoritative. This prototype does not change product semantics, API contracts, route behavior, generation capabilities, reference limits, or deployment state.

v0.4 is archived explicitly as rejected R&D in `design/rd/create-cinematic-stage-v04.md`; PR #182 is closed unmerged. Do not revive v0.4 as the active direction unless the user explicitly reopens it.

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

The composer remains visible and stable. The result region appears above it with truthful `Generating…` status. RenderLab expression is confined to registration lines, a subtle axis pulse, bounded quarter-arc/aperture geometry, and restrained cool/warm atmospheric light. No fake percentage or fake progress stage is introduced.

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

- `main`: `dd0fcc725c225f2e15a934ad9fe721cb27b96756`.
- Active branch: `rd/create-usability-first-v05`.
- Initial prototype commit: `1b6a0a1dad20da67b482c2ce3746d5a08ff1022a`.
- Workflow-alignment commit: `cdf463ac2d5aad61877caf68a53890feae410dcd`.
- Mobile touch-target correction began at `35b8833932d56029b90d41fb350f47fad07ea848` and later refinements preserved that gate.
- Earlier fully verified prototype/code head: `abbbc7662afeb7701253d0918fd7f5575b9aa827` (`R&D: refine v0.5 media-side expression`), proven by run #9.
- Latest verified prototype/code head: `6237f59351d2cd7b397881f617a483d62d9bf438` (`R&D: strengthen v0.5 media framing`), proven by run #12.
- A fresh `main...rd/create-usability-first-v05` comparison at the run #12 review point showed the branch is ahead only by the isolated R&D workflow, prototype HTML/CSS/JS, R&D record and verifier. Production `/create` files remain untouched.
- Issue #148 remains open. PR #182 remains closed unmerged and is not the active direction.

### Workflow history

**Run #1 — infrastructure-only failure**
- Run: `34606061038`.
- Failed before browser execution because the workflow incorrectly used npm caching / `npm ci` even though the repository intentionally has no committed lockfile.
- Corrected to the repository convention: Node 24 + `npm install --no-audit --no-fund`.

**Run #2 — real mobile accessibility failure**
- Exact tested head: `cdf463ac2d5aad61877caf68a53890feae410dcd`.
- Run: `34606190328`.
- Browser setup passed; verifier failed on `mobile remove target >= 44px`.
- Artifact: `10266791593`.
- Digest: `sha256:60ba4ce5fd33b13874d5392d55a4b3aec56e39192652fd187616f89d8e34eb1d`.
- The gate was preserved and the prototype was fixed rather than weakening the test.

**Run #9 — first complete exact-head visual/interaction proof**
- Exact tested prototype/code head: `abbbc7662afeb7701253d0918fd7f5575b9aa827`.
- Run: `34610529358` / **Create Usability-First R&D v0.5** run #9.
- Result: **PASS** — setup, dependencies, Chromium, complete interaction/evidence verifier, and evidence upload all passed.
- Artifact: `10268342208` — `renderlab-create-usability-first-v05`.
- Artifact digest: `sha256:ff527d74e6278c921f9cf9dac1e948327b974e4b9b64eac9f74fcb3c19a78f30`.
- Evidence set includes desktop authoring, one/two references, Image Advanced/generating/result, Video Advanced/generating/result, Animate continuation, 390px authoring/Video/Advanced/Image result/Video result, reduced-motion Image result, and temporal recording.

**Run #10 / #11 — documentation-head verification**
- Documentation-only head `05121077302def8406811d44042a506367695ec9` passed run #10 (`34612615774`).
- Documentation handoff head `5a1ca24fb9bed3652fd4ed5ba3cf56081edfe9a0` passed run #11 (`34612994890`).
- These runs preserved the same prototype behavior while keeping the branch/documentation exact-head green before the final design review.

**Run #12 — reviewed candidate refinement proof**
- Exact tested prototype/code head: `6237f59351d2cd7b397881f617a483d62d9bf438`.
- Run: `34613720083` / **Create Usability-First R&D v0.5** run #12.
- Result: **PASS** — exact-head checkout, setup, dependencies, Chromium, complete interaction/evidence verifier and artifact upload all passed.
- Artifact: `10269841181` — `renderlab-create-usability-first-v05`.
- Artifact digest: `sha256:3d3eec07dc2ff4924deb2ce6739bca420fba88e816665af34c4289ed45aae1c0`.
- The evidence set again includes the complete desktop, 390px, reduced-motion and temporal matrix; no verifier requirement was weakened for the visual refinement.

### Candidate refinements proven by run #12

The interaction grammar was deliberately left unchanged. The refinement is visual and media-side only:

- authoring keeps conventional Image/Video, reference, prompt, settings and Generate geometry;
- the context block gains a restrained Landing-derived technical rule rather than additional chrome;
- the composer gains a non-interactive quarter-arc registration accent that never changes hit targets or control meaning;
- generating media uses stronger but bounded Lab Matrix registration: cross-axis geometry, technical registration metadata, cool/warm atmospheric light and quarter-arc/aperture activity without fake progress;
- result media retains the shallow pointer-only depth while the composer remains transform-free;
- the result information rail becomes less generic-card-like through asymmetric radius treatment and a precise cool-to-warm registration rule;
- video results remain explicitly identified without fabricating playback state;
- 390px layouts keep the same straightforward control order and 44px+ essential targets;
- reduced motion disables registration/aperture animation and reaches the identical complete result state immediately.

## Designer-level review — completed on run #12 artifact

The complete run #9 evidence was first reviewed together, then the focused media-side refinement was made and run #12 was reviewed as the candidate artifact. The assessment below is the design-review conclusion for the isolated R&D direction; it is **not user approval** and does not authorize production implementation.

### 1. Would a first-time user immediately know what to do?

**Yes.** Image/Video choice, Add reference/Start image, prompt, essential settings and Generate read in a conventional task order. The prototype no longer asks users to understand an abstract spatial stage before they can create.

### 2. Does Image vs Video make sense without explanation?

**Yes.** The selected mode is obvious on desktop and full-width on 390px. Copy changes from image-description language to shot/motion language while Generate remains spatially stable.

### 3. Are references / Start image semantics obvious?

**Yes.** Image inputs are named `Primary image` / `Reference image`; Video uses `Start image`. The two-image → Video guard explains the one-source requirement instead of silently dropping input.

### 4. Is Generate unmistakable?

**Yes.** Generate remains a conventional high-contrast action in the same control zone and becomes full-width on 390px. No quarter-arc, 3D or hidden affordance is used for the primary action.

### 5. Does the result naturally lead to the next action?

**Yes for Image, and truthfully for Video.** Image result actions explicitly expose Animate, Edit, Use as reference and Upscale 2×. Animate visibly switches into Video and binds the same result as Start image. Video does not invent unsupported continuation controls.

### 6. Does it clearly belong to the same RenderLab product as the approved Landing?

**Yes after the run #12 refinement.** The near-black canvas, Lab Matrix grid, compressed heading, technical microtype, cool/warm atmosphere, precise rules, registration graphics, quarter-arc media accents and asymmetric result rail now read as a product-system continuation of the Landing without copying its marketing layout.

### 7. Does it feel modern, high-end and authored rather than generic SaaS?

**Strong enough for a reviewed design candidate.** The composer intentionally stays conventional because usability depends on it, while authored character is concentrated in the media/generation/result side. The run #12 refinement removes the strongest remaining generic-card feel without adding decorative control novelty.

### 8. Is there enough wow factor without damaging usability?

**Yes for the concept-approval gate.** The wow factor is intentionally bounded: atmospheric media light, registration geometry, quarter-arc framing, aperture/result reveal and shallow media-only pointer depth. Ordinary controls do not parallax, orbit, hide, or move away from the pointer.

### Responsive / reduced-motion review

- **Desktop authoring/reference/Advanced:** clear hierarchy; no evidence of control displacement from the media refinement.
- **Desktop generating/result:** the media region now carries the strongest RenderLab expression; the result rail remains subordinate to the media and continuation remains obvious.
- **390px authoring/Video/Advanced:** direct form grammar remains intact and readable; mode → reference/start image → prompt → settings → full-width Generate remains obvious.
- **390px Image result:** media → metadata/actions → composer is clear; continuation targets remain touch-sized.
- **390px Video result:** media → truthful video metadata → Video composer remains coherent without fake result actions.
- **Reduced motion:** same complete Image result is reached without delayed essential controls or registration animation.
- **Temporal recording:** Image Advanced → generation/result → Animate continuation → Video generation/result preserves spatial continuity while keeping the composer and primary control grammar stable. Media/result motion carries the expression rather than control physics.

## Candidate decision

**v0.5 Clear Composer is promoted to `REVIEWED DESIGN CANDIDATE`.**

This means the full isolated R&D direction is coherent enough to put in front of the user for explicit concept approval. It does **not** mean `APPROVED`, does not authorize production `/create` implementation, does not create Phase 23 / Cycle 5, and does not authorize merge or deployment.

The governing interpretation remains:

> Competitors define familiar interaction grammar. The approved Landing defines RenderLab visual language. Expression belongs primarily to media, result and bounded transition behavior; ordinary authoring controls stay obvious.

## Prototype acceptance gates

The verifier must continue to prove:

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

## Next work — approval gate

1. Keep issue #148 open until the user explicitly approves or rejects the v0.5 concept.
2. Keep the approval PR draft and R&D-only; it is a review surface, not a merge request for production behavior.
3. Ask the user to review the candidate as one system: desktop + 390px authoring, Image/Video semantics, references/Start image, generating state, Image/Video results, Animate continuation, reduced motion and temporal choreography.
4. If the user requests visual corrections, keep the familiar interaction grammar stable unless they identify a usability defect; refine the isolated R&D branch and rerun the full exact-head workflow.
5. If and only if the user explicitly approves v0.5, record that approval in repository documentation and then expand a separate Phase 23 / Cycle 5 production implementation contract from the accepted prototype and current production `/create` reality.
6. Production implementation must preserve existing product/API/security/data behavior and must pass the normal exact-head functional, responsive, accessibility and design-fidelity gates.
7. Merge to `main` and production deployment remain separate explicit operations; neither is authorized by design approval alone.

## Scope boundary

This remains isolated design R&D. Do not merge the prototype into production, expand Phase 23, alter production `/create`, or deploy without explicit human approval and a separate implementation contract.