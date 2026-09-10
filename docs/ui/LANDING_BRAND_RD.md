# Landing Brand Experience R&D

**Status:** IN PROGRESS — HERO + SECTIONS 02–03 DIRECTIONALLY APPROVED  
**Last verified:** 2026-09-10  
**Parent tracker:** GitHub issue #158  
**Workflow:** `docs/ui/CREATIVE_DEVELOPMENT.md`

## Scope
This document records the current accepted visual R&D state for the public RenderLab Landing page. It is a design-state record, not production implementation authorization.

All existing product, route, auth, security, accessibility, exact-head validation, fixture-cleanup, documentation and deployment rules remain authoritative.

Production `/` remains unchanged until the complete Landing surface is reviewed and explicitly approved for implementation.

## Locked identity
The approved RenderLab Lab Grid modular `R` and wordmark relationship remain locked. Landing R&D must consume the repository-owned identity assets exactly and must not redraw, approximate or reinterpret the mark.

## Section 01 — Hero
### A — Lab Matrix
**Status:** DIRECTIONALLY APPROVED by the user on 2026-09-10.

The hero visual grammar is accepted as the foundation for continued Landing R&D.

Accepted properties:
- left-led concise product copy with the media composition carrying most of the visual weight;
- a four-cell media structure derived directly from the proportions and logic of the locked Lab Grid `R`;
- four truthful creative states: **Create → Shape with references → Set in motion → Keep and continue**;
- high-density cinematic imagery inside the cells rather than abstract placeholder geometry;
- restrained dark canvas and chrome so media remains dominant;
- bounded pointer-depth response that separates the cells without breaking recognition of the overall `R` structure;
- ambient motion inside the media cells rather than generic page-entry animation;
- deliberate mobile art direction rather than a scaled desktop composition;
- a fully static `prefers-reduced-motion` equivalent;
- exact locked-logo fidelity.

The current photographic imagery is R&D media and is **not** itself a locked production asset set. Final production media may be replaced with RenderLab-owned/generated image/video assets while preserving the accepted composition, density, crop logic, motion intent and creative-state narrative.

### Verified hero evidence
Accepted rich-media candidate:
- branch: `work/landing-hero-a-media-rd-v0.3`
- completed R&D PR: #165, closed without merge
- exact head: `cd0de24be0b06edafbffa284c091019faa6841c3`
- Engineering Quality: `34521959592` — passed
- Landing Hero A Media R&D: `34521959590` — passed
- evidence artifact: `10170065180`
- artifact digest: `sha256:587f2aceae11e3770a1a1d7dd7634619f227ae81ee818886f4c37a5de8f16a8b`

Browser verification covers 1440×900, 390×844, four loaded media cells, locked-logo byte parity, Lab Matrix proportions, pointer response, ambient temporal motion, reduced-motion behavior, no horizontal overflow, copy/media separation and runtime cleanliness.

## Section 02 — One creative thread
**Status:** DIRECTIONALLY APPROVED by the user on 2026-09-10.

Section 02 proves that the Lab Matrix grammar can carry a longer product story rather than working only as a hero treatment.

Accepted properties:
- the same media object remains the visual anchor while the story progresses through **Create → References → Motion → Continue / Library**;
- desktop uses a sticky working-media stage with scroll-driven state progression instead of a row of disconnected feature cards;
- the left narrative and active-step treatment remain concise and subordinate to the media stage;
- References visibly brings owned source media into the working composition rather than explaining references only in copy;
- Motion adds temporal treatment and a concise timeline without fabricating generation/runtime state;
- Continue / Library resolves the same work into durable saved-media context rather than replacing it with unrelated UI;
- pointer-capable desktop gets bounded stage depth; touch/narrow layouts do not depend on pointer behavior;
- reverse scrolling returns coherently through earlier creative states;
- the 390px composition is deliberately adapted rather than scaled from desktop, including readable headline grouping and stronger References/Library states;
- reduced motion settles to a complete static state without running animation;
- the section preserves the approved dark restrained canvas, media-first hierarchy, concise sans typography and product truth established by the hero.

The first browser pass exposed cramped mobile headline breaks and References/Library states that were too visually subtle. Those were corrected before the accepted candidate; the approval applies to the corrected exact head below, not the earlier pass.

### Verified Section 02 evidence
Accepted candidate:
- branch: `work/landing-section-02-thread-rd-v0.1`
- completed R&D PR: #167, closed without merge
- exact head: `3aaf1245a90ebcdbd48b817ba906c3f6127d1f41`
- Engineering Quality: `34524062920` — passed
- Landing Section 02 Thread R&D: `34524062884` — passed
- evidence artifact: `10170862843`
- artifact digest: `sha256:cf5ae1fcfe858cea2fd3658419d871f1b877126f0715507c406231d8e1b29e80`

Browser verification covers desktop Create/References/Motion/Library states, reverse scroll, bounded pointer depth, 390px Create/Motion states, reduced motion, loaded media, no horizontal overflow and runtime cleanliness.

## Section 03 — Living Library
**Status:** DIRECTIONALLY APPROVED by the user on 2026-09-11.

Section 03 continues directly from Section 02's Library resolution and proves that durable media can become a spatial, reusable working field rather than another explanatory marketing block.

Accepted properties:
- a media-dominant spatial Library field with six representative durable-media objects at varied scales/positions rather than equal feature cards;
- one media object is focused at a time while neighboring work yields spatially away from the active object on pointer-capable desktop;
- the contextual treatment remains compact and subordinate, updating selected-media identity and truthful compatible continuation/actions rather than behaving like dashboard chrome;
- pointer hover, direct activation and keyboard focus can all establish the active media object;
- interrupted focus changes resolve directly toward the new selection rather than queueing a decorative animation sequence;
- narrow/touch layouts deliberately replace the absolute desktop field with a horizontal snap-like media rail, one dominant item and a visible next-item cue;
- mobile selection remains tap/focus driven with contextual details below the rail and no pointer-only meaning;
- reduced motion removes ambient media movement and spatial yield transitions while keeping selection and all meaning complete;
- the section uses only existing RenderLab concepts: durable generated/uploaded Library media, reusable references, compatible Edit/Animate/Upscale 2× continuation, durable video, Favorites, Collections, Rename and Download;
- the prototype does not claim automatic variants, branches or lineage that RenderLab does not own;
- the dark restrained canvas, concise sans typography, media-first hierarchy and modular/grid logic remain coherent with Sections 01–02.

The user approved the first verified Section 03 review candidate after desktop default/motion/keyboard states and mobile default/selected states were shown.

### Verified Section 03 evidence
Accepted candidate:
- branch: `work/landing-section-03-living-library-rd-v0.1`
- draft R&D PR: #169
- exact head: `a511f44c31ac80b38560b071e307e33a9969179c`
- Engineering Quality: `34529132725` — passed
- Landing Section 03 Living Library R&D: `34529132765` — passed
- evidence artifact: `10172792215`
- artifact digest: `sha256:1a63270bb3a3509d99c3e4dc1e524dcb11c0c4e7d5fae35e39c961272e518f2f`

Browser verification covers 1440×900 default and changed-focus states, pointer selection/yield, keyboard focus selection, 390×844 touch layout/selection, reduced motion, six loaded media objects, no document-level horizontal overflow and runtime cleanliness.

The current external R&D photographs are not production assets. Final production media may be replaced with owned/cleared RenderLab media while preserving the accepted composition, crop density, focus/yield behavior and responsive intent.

## Historical alternatives
The original coded hero comparison in PR #163 explored:
- A — Lab Matrix
- B — Resolve Aperture
- C — Creative Instrument

The user selected A. B and C remain historical exploration evidence and are not active directions.

A v0.2 in PR #164 established the refined Lab Matrix geometry before the rich-media pass. It is superseded by the accepted v0.3 hero for ongoing R&D.

## Continuity rule for remaining Landing R&D
Continue the Landing section-by-section under `CREATIVE_DEVELOPMENT.md`.

Every remaining section must extend the accepted Lab Matrix / creative-thread / Living Library grammar rather than introduce a new visual identity. The page should feel like one authored sequence rather than a stack of individually styled marketing blocks.

The next section should close the public story naturally from the durable Library field into the existing invitation-only conversion path. It should preserve media dominance and spatial continuity, make `Open Create` and `Sign in` clear without becoming a generic CTA card, and remain truthful about closed-beta access.

Already accepted sections may only be materially changed again if:
- the user explicitly reopens them;
- later full-page composition exposes a concrete continuity/responsive/accessibility problem;
- production feasibility requires a bounded adaptation that preserves the approved visual intent and is reviewed.

## Production boundary
Directional approval of Sections 01–03 does **not** authorize:
- modifying production `/`;
- merging experimental prototype code as product implementation;
- changing routes, auth, backend, schema, security or infrastructure;
- adding dependencies without the normal dependency review;
- deploying.

The complete Landing must still reach reviewed-design-candidate status and receive explicit user approval before production implementation begins.
