# Create usability-first R&D v0.5

Status: **USER-APPROVED DESIGN DIRECTION / FULL VERIFIER GREEN / IMPLEMENTATION PLANNING AUTHORIZED / NOT PRODUCTION IMPLEMENTED**

Issue: #148

Branch: `rd/create-usability-first-v05`

Design approval: **explicit user approval on 2026-09-11**

Production authorization: **none**

## Approval meaning

The user explicitly approved the complete v0.5 **Clear Composer** concept and interaction language after review of the desktop, 390px, reduced-motion and temporal evidence.

This approval closes the visual-R&D decision and authorizes the repository to create the immediate Phase 23 / Cycle 5 production implementation contract from the accepted evidence. It does **not** by itself authorize:

- production `/create` implementation changes;
- merge of the R&D prototype into `main`;
- merge of a future production implementation PR;
- production deployment;
- backend/schema/provider/routing changes outside the later implementation contract.

The production Create surface remains the currently shipped implementation until a separate implementation slice is completed, verified and explicitly merged.

## Why this reset exists

v0.3 and v0.4 were rejected in human review because they made the Create workflow harder to understand while trying to establish a distinctive spatial/motion language. v0.5 starts from the opposite premise:

> A first-time user must understand how to create an image or video before RenderLab asks them to appreciate its motion system.

The production Create contracts remain authoritative. The prototype does not change product semantics, API contracts, route behavior, generation capabilities, reference limits, account/ownership rules, or deployment state.

v0.4 remains archived as rejected R&D in `design/rd/create-cinematic-stage-v04.md`; PR #182 is closed unmerged. Do not revive v0.3 or v0.4 as the active design direction unless the user explicitly reopens them.

## Two-source design model — accepted

### Interaction grammar comes from comparable creative products

Current comparable creative products were used to establish familiar task structure, not visual styling:

- **Runway** — prompt-first generation canvas; references near the prompt; continuation from results.
- **Adobe Firefly** — unified image/video workspace; visible Reference control; direct generation action; result continuation.
- **Krea** — prompt + reference working together; generated outputs stay close to the authoring context.
- **Google Flow** — explicit frame/ingredient semantics and reuse of prior media as the next input.
- **Freepik / Magnific** — plain video flow: prompt → essential settings → Generate, with named frame inputs.
- **OpenArt** — explicit start-frame semantics with prompt and essential video settings.
- **Luma Dream Machine** — named keyframe/reference roles and prompt-centered authoring.

Accepted interaction sequence:

1. choose Image or Video;
2. describe what to make;
3. attach references / Start image when useful;
4. choose a small number of essential settings;
5. press an unmistakable Generate action;
6. inspect the result;
7. reuse the result as the next input instead of rebuilding the request.

These products define **interaction expectations only**. They do not define RenderLab visual identity.

### RenderLab visual identity comes from the approved Landing

The production Landing remains the visual authority. The accepted Create direction inherits:

- near-black canvas;
- faint Lab Matrix grid and restrained grain;
- asymmetric media framing;
- canonical quarter-arc as media/registration accent, not a confusing control shape;
- cool-blue and warm-orange atmospheric light;
- compressed editorial headings where hierarchy benefits;
- small uppercase technical metadata;
- shallow media-only parallax/depth;
- precise 1px rules and restrained shadows;
- the locked `RenderLabBrand` implementation unchanged.

**Hard coherence rule:** comparable products define familiar usability patterns; the approved Landing defines what RenderLab looks and feels like.

## Accepted v0.5 direction — Clear Composer

One persistent composer is the obvious control center. A result workspace appears above it only when there is something truthful to review.

### Image

- clearly selected **Image** mode;
- heading `Create an image`;
- prompt is the dominant authoring input;
- visible labelled **Add reference** action;
- up to two image inputs with explicit `Primary image` / `Reference image` roles;
- essential settings remain visible: model, ratio, Advanced;
- **Generate** remains the stable high-contrast primary action.

### Video

- clearly selected **Video** mode;
- shot/motion prompt language;
- optional image input is explicitly named **Start image**;
- essential video settings remain adjacent: ratio, resolution/duration, audio;
- Generate remains in the same control zone.

### Advanced

Secondary controls expand inside/below the composer. They never replace, cover or move the prompt or Generate action.

### Generating

The composer remains visible and spatially stable. The media region exposes truthful `Generating…` state with bounded Landing-derived registration graphics, quarter-arc/aperture geometry and cool/warm atmosphere. No fake percentage, ETA or fabricated provider stage is introduced.

### Result / continuation

The result becomes the dominant media surface while the composer remains immediately available.

Image-result continuation is explicit:

- **Animate** — switch to Video and bind the result as Start image;
- **Edit** — bind the result as Primary image;
- **Use as reference** — attach the result as an image reference;
- **Upscale 2×** — continue through the existing Upscale product flow;
- download remains a direct media action where applicable.

Video results remain truthful and do not invent unsupported continuation actions.

## Accepted motion / physics rules

Expression is subordinate to usability:

- ordinary controls never move away from the pointer;
- hierarchy never depends on depth perception;
- reference insertion may use a short spring settle, not free decorative physics;
- Image ↔ Video may use a shared highlight / bounded content morph;
- result reveal may expand from a bounded aperture into the media frame while the composer stays fixed;
- pointer depth is allowed only on media/result surfaces, never prompt/settings/Generate;
- quarter-arc geometry is a media/registration motif, never the sole shape of a critical control;
- reduced motion resolves directly to the same complete state with no delayed essential action.

## Responsive composition

### Desktop

1. RenderLab application context;
2. concise `Create an image/video` heading;
3. optional truthful result/generating workspace;
4. persistent composer beneath it;
5. explicit result continuation rail when appropriate;
6. Lab Matrix atmosphere concentrated around media rather than around ordinary controls.

### 390px

- full-width obvious Image / Video switch;
- prompt remains first-class;
- Add reference / Start image is a labelled 44px+ target;
- reference cards remain flat and non-overlapping;
- essential settings wrap cleanly;
- Generate becomes full-width/high-contrast where required;
- Advanced expands inline;
- result stacks media → metadata/actions → composer;
- no transformed hit-testing hierarchy and no accepted horizontal overflow.

## Verified evidence — 2026-09-11

### Repository boundary

- `main`: `dd0fcc725c225f2e15a934ad9fe721cb27b96756`.
- R&D branch before approval record: `58d7ee0e5c182c8b77715ae974d99414a819c8b1`.
- The R&D diff against `main` is isolated to the dedicated R&D workflow, prototype HTML/CSS/JS, verifier and this design record.
- Production `/create` source remains untouched by the R&D branch.
- PR #182 remains closed unmerged; v0.4 remains rejected.

### Important workflow history

**Run #2 — genuine mobile accessibility failure, fixed without weakening the verifier**
- head `cdf463ac2d5aad61877caf68a53890feae410dcd`;
- run `34606190328`;
- failed on `mobile remove target >= 44px`;
- artifact `10266791593`;
- digest `sha256:60ba4ce5fd33b13874d5392d55a4b3aec56e39192652fd187616f89d8e34eb1d`.

**Run #9 — first complete exact-head proof**
- prototype/code head `abbbc7662afeb7701253d0918fd7f5575b9aa827`;
- run `34610529358`;
- PASS;
- artifact `10268342208`;
- digest `sha256:ff527d74e6278c921f9cf9dac1e948327b974e4b9b64eac9f74fcb3c19a78f30`.

**Run #12 — final reviewed prototype refinement**
- prototype/code head `6237f59351d2cd7b397881f617a483d62d9bf438`;
- run `34613720083`;
- PASS;
- artifact `10269841181`;
- digest `sha256:3d3eec07dc2ff4924deb2ce6739bca420fba88e816665af34c4289ed45aae1c0`.

Run #12 covers the complete desktop, 390px, reduced-motion and temporal matrix without weakening any verifier requirement.

**Run #13 — reviewed-candidate documentation head**
- documentation head `58d7ee0e5c182c8b77715ae974d99414a819c8b1`;
- run `34614217898`;
- PASS;
- artifact `10269847134`;
- digest `sha256:78610ebd23f70cac3e9e65a3c5983a0835d49ec3f27fb4ebfaf708a3a440d5c2`.

### Final run #12 visual review

The user-facing design review was completed across the full artifact rather than one screenshot:

1. **First-time usability:** Image/Video → references/Start image → prompt → settings → Generate is understandable without explanation.
2. **Image vs Video:** selected intent and mode-specific copy are obvious on desktop and 390px.
3. **Reference semantics:** `Primary image`, `Reference image` and `Start image` are direct and the one-source Video boundary is explained rather than silently destructive.
4. **Generate:** conventional, high-contrast and spatially stable; full-width on narrow layouts.
5. **Continuation:** Image results expose explicit next actions; Animate visibly enters Video and binds Start image.
6. **RenderLab coherence:** near-black canvas, Lab Matrix grid, compressed heading, technical microtype, cool/warm atmosphere, precise rules, registration graphics, quarter-arc media accents and asymmetric result treatment align with the approved Landing.
7. **Authored quality:** familiar authoring controls stay conventional while distinctive character is concentrated in media/generation/result treatment.
8. **Wow factor:** aperture/result reveal, registration activity, atmospheric light and shallow media-only pointer depth provide bounded expression without sacrificing clarity.

Responsive and reduced-motion review also passed: 390px authoring/results remain obvious and touch-safe, reduced motion reaches the same complete result immediately, and the temporal recording preserves continuity without control physics.

## User approval decision — 2026-09-11

**The user explicitly approved v0.5 Clear Composer as the future Create design direction.**

The accepted interpretation is now durable:

> Competitors define familiar interaction grammar. The approved Landing defines RenderLab visual language. Expression belongs primarily to media, result and bounded transition behavior; ordinary authoring controls stay obvious.

This approval supersedes v0.3/v0.4 as future Create visual direction. It does not change the currently shipped production Create surface by itself.

## Reusable rules extracted for Phase 23

The future implementation slice must preserve these accepted rules:

- obvious Image/Video intent before any expressive treatment;
- prompt remains the dominant authoring surface;
- references are named by direct product role (`Primary image`, `Reference image`, `Start image`);
- Advanced remains attached to the composer and never hides basic authoring;
- Generate remains conventional, high-contrast and spatially stable;
- composer stays available while generating and after results;
- generation state is truthful and never fabricates percentage/ETA/provider stages;
- result media owns the strongest visual expression;
- continuation actions are explicit and capability-backed;
- Landing-derived Lab Matrix grid, quarter-arc registration, cool/warm atmosphere, editorial type and technical microtype form the Create visual language;
- motion is bounded to continuity and media expression, with controls stationary;
- reduced motion reaches identical completed geometry without delayed essential controls;
- production behavior, APIs, ownership/security, data semantics and capability limits remain authoritative unless a separate decision explicitly changes them.

## Prototype acceptance gates retained as implementation-fidelity requirements

Future production work must continue to prove:

- first-time authoring state exposes Image/Video, prompt, references, settings and Generate;
- two Image references can be added, reprioritized and removed;
- Video exposes one clear Start image semantic;
- Advanced never covers prompt or Generate;
- Generate remains spatially stable across mode/reference changes;
- generating state is truthful and composer remains usable/legible;
- Image results expose clear Edit / Reference / Animate continuation;
- Animate switches to Video and binds the result as Start image;
- keyboard focus remains visible;
- essential 390px touch targets remain at least 44px;
- no accepted horizontal overflow;
- reduced motion reaches complete states without delayed essential actions;
- media-only pointer depth remains bounded and cannot shift controls.

## Handoff after approval

The design-R&D work is complete. The next repository step is to create the separate Phase 23 / Cycle 5 production implementation contract from this accepted evidence and the current production `/create` implementation.

That contract must define implementation files, preserved product behavior, visual-fidelity requirements, required workflow matrix, responsive/accessibility gates, documentation updates and merge boundaries before production code is changed.

PR #183 is the design-review checkpoint only and must not be merged as production implementation. The R&D prototype remains design evidence.

## Scope boundary

The prototype remains isolated R&D. User design approval authorizes implementation planning, **not merge or deployment**. Production `/create` may change only under the separate Phase 23 implementation contract and normal exact-head engineering/fidelity review. Production deployment remains a further explicit operation.