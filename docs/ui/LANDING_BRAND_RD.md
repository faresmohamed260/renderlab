# Landing Brand Experience R&D

**Status:** COMPLETE — FULL SURFACE APPROVED / IMPLEMENTED / MERGED
**Last verified:** 2026-09-11
**Parent tracker:** GitHub issue #158
**Workflow:** `docs/ui/CREATIVE_DEVELOPMENT.md`

## Scope
This document records the accepted visual R&D state for the public RenderLab Landing page and the handoff into the verified production implementation now merged on `main`.

All existing product, route, auth, security, accessibility, exact-head validation, fixture-cleanup, documentation and deployment rules remain authoritative.

The complete Landing surface was explicitly approved before production implementation began. Production deployment remains a separate operation and has not been authorized by this R&D or its implementation closure.

## Locked identity
The approved RenderLab Lab Grid modular `R` and wordmark relationship remain locked. Landing R&D and production implementation consume the repository-owned identity assets exactly and must not redraw, approximate or reinterpret the mark.

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

The photographic imagery used during R&D was not itself a locked production asset set. The final implementation replaces that prototype set with the reviewed licensed media recorded in `docs/ui/LANDING_MEDIA_SOURCES.md` while preserving the accepted composition, density, crop logic, motion intent and creative-state narrative.

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
- completed R&D PR: #169, closed without merge
- exact head: `a511f44c31ac80b38560b071e307e33a9969179c`
- Engineering Quality: `34529132725` — passed
- Landing Section 03 Living Library R&D: `34529132765` — passed
- evidence artifact: `10172792215`
- artifact digest: `sha256:1a63270bb3a3509d99c3e4dc1e524dcb11c0c4e7d5fae35e39c961272e518f2f`

Browser verification covers 1440×900 default and changed-focus states, pointer selection/yield, keyboard focus selection, 390×844 touch layout/selection, reduced motion, six loaded media objects, no document-level horizontal overflow and runtime cleanliness.

The external R&D photographs were prototype media rather than production assets. The final implementation uses the reviewed production set recorded in `docs/ui/LANDING_MEDIA_SOURCES.md` while preserving the accepted composition, crop density, focus/yield behavior and responsive intent.

## Section 04 — Resolve to Create
**Status:** DIRECTIONALLY APPROVED by the user on 2026-09-11.

Section 04 closes the public story by resolving the active Library media back into the modular `R` geometry and then presenting the truthful invitation-only conversion path without dropping into a generic CTA card.

Accepted properties:
- the closing composition begins from a Living Library carry-over state rather than visually resetting the page;
- four active media objects converge into the exact modular proportions of the locked Lab Grid `R`, while two peripheral Library objects yield away;
- the real locked RenderLab mark/wordmark remains a separate repository-owned identity asset and is not redrawn from the media geometry;
- desktop uses scroll-linked convergence and supports coherent reverse-scroll restoration rather than a one-way decorative animation;
- the CTA copy remains concise and subordinate to the media resolution, with `Open Create` and `Sign in` as the only primary conversion actions;
- `Open Create` truthfully targets `/create` and `Sign in` truthfully targets `/settings`;
- closed-beta / invitation-only / no-public-sign-up truth remains visible, with no pricing, testimonials, fake metrics, provider/model claims or public-admission behavior;
- mobile does not reproduce the long desktop sticky sequence: it starts with the locked brand, uses an already-resolved compact four-cell media `R`, and keeps both actions fully visible/reachable;
- reduced motion settles directly to the complete resolved state with no running convergence animation;
- the section preserves the accepted dark restrained canvas, concise sans typography, media dominance, modular geometry and spatial continuity established by Sections 01–03.

The first verified browser pass was technically green, but mobile put the visual conclusion before the brand. A narrow mobile-only refinement moved the locked identity to the top and compacted the media conclusion without changing the desktop concept. User approval applies to that refined exact head.

### Verified Section 04 evidence
Accepted candidate:
- branch: `work/landing-section-04-resolve-to-create-rd-v0.1`
- draft R&D PR: #171
- exact head: `36d5b6210feb895143ebefaba49833ad5f4ed9fe`
- Engineering Quality: `34531640907` — passed
- Landing Section 04 Resolve to Create R&D: `34531640915` — passed
- evidence artifact: `10173749429`
- artifact digest: `sha256:07c1d30561b8e072c3fa72a1be262fc98e1f47073e8029487da977fb5a6a211e`

Browser verification covers desktop Library carry-over, resolved final and reverse-scroll states, exact final modular-R geometry, locked-mark loading, truthful CTA route targets, 390×844 mobile composition, reduced motion, six media loads, no document-level horizontal overflow and runtime cleanliness.

The external R&D photographs were prototype media rather than production assets. The final implementation uses the reviewed production set recorded in `docs/ui/LANDING_MEDIA_SOURCES.md` while preserving the accepted geometry, crop density, transition intent and closing narrative.

## Historical alternatives
The original coded hero comparison in PR #163 explored:
- A — Lab Matrix
- B — Resolve Aperture
- C — Creative Instrument

The user selected A. B and C remain historical exploration evidence and are not active directions.

A v0.2 in PR #164 established the refined Lab Matrix geometry before the rich-media pass. It is superseded by the accepted v0.3 hero for ongoing R&D.

## Complete-surface approval
All four Landing sections were first approved individually under `CREATIVE_DEVELOPMENT.md`, then assembled into one continuous desktop and 390px Landing prototype for whole-surface review.

Accepted complete-surface candidate before the user's final geometry clarification:
- branch: `work/landing-complete-surface-rd-v0.1`
- draft R&D PR: #173
- exact head: `78f91321cd5ced1ce4566cf8c563c37e58cd382e`
- Engineering Quality: `34533941565` — passed
- Landing Complete Surface R&D: `34533941598` — passed
- evidence artifact: `10174651739`
- artifact digest: `sha256:81bf40d58494395dbb82d112d667ce8a5632bfee50b371dbaf7e7105b16fd0a2`

The user explicitly approved the complete design for production implementation on 2026-09-11, with one subsequent geometry clarification: the lower-right media module of the Lab Grid `R` must use the canonical quarter-circle / large outer arc from the locked identity rather than a conventional rounded-corner rectangle. `docs/ui/LANDING_IMPLEMENTATION_CONTRACT.md` is authoritative for that clarification and the production handoff.

The complete design therefore resolves to the accepted sequence:
1. Hero — Lab Matrix;
2. One creative thread;
3. Living Library;
4. Resolve to Create.

The approval preserves the accepted section contracts, transition pacing, navigation/brand continuity, full-page hierarchy, mobile adaptation, reduced-motion behavior and final invitation-only CTA. It does not authorize unrelated product redesign or deployment.

## Production implementation closure — 2026-09-11
Production implementation is complete in the repository and merged through PR #174.

Verified repository state:
- final implementation head: `a7f94b77bf1be989c0101376aa0404cbb28b34ae`
- PR #174 squash merge / `main`: `1dc04f68d059a9f7d903c8313fe2e690aeec9d0e`
- pre-merge Release Candidate Matrix `34539565841` — passed
- pre-merge Brand / Launch Visual artifact `10176777155` (`sha256:249575e790be67219927ccefb6edef00efaf6aedc5694a95f2ed62f4aef48e38`) — browser evidence human-reviewed clean
- merged-main Release Candidate Matrix `34540955037` — passed, including configured exact-SHA child verification
- merged-main Brand / Launch Visual `34541065002` — passed
- merged-main Brand / Launch artifact `10177340818` (`sha256:069aaa3d35febffc9e591f254d7a11e1b5575248bc11ab7846f44b10516b8971`)

The implementation keeps `src/app/page.tsx` as the server redirect boundary and places the interactive surface in `src/features/landing/landing-experience.tsx` with Landing-local styling. It uses existing Motion for React and maintained RenderLab controls/identity; no new animation runtime was added. Production media provenance is recorded in `docs/ui/LANDING_MEDIA_SOURCES.md`.

The final candidate preserves the approved canonical quarter-circle / large-arc lower-right geometry in both Hero and Resolve, route and closed-beta truth, keyboard/touch/reduced-motion behavior, and no-overflow/runtime-cleanliness requirements.

Repository implementation completion is not production rollout. The deployed production source remains the previously recorded UI-071 release until an explicit deployment operation is separately authorized and verified.