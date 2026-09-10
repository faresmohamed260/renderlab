# Landing Brand Experience R&D

**Status:** IN PROGRESS — HERO DIRECTIONALLY APPROVED  
**Last verified:** 2026-09-10  
**Parent tracker:** GitHub issue #158  
**Workflow:** `docs/ui/CREATIVE_DEVELOPMENT.md`

## Scope
This document records the current accepted visual R&D state for the public RenderLab Landing page. It is a design-state record, not production implementation authorization.

All existing product, route, auth, security, accessibility, exact-head validation, fixture-cleanup, documentation and deployment rules remain authoritative.

Production `/` remains unchanged until the complete Landing surface is reviewed and explicitly approved for implementation.

## Locked identity
The approved RenderLab Lab Grid modular `R` and wordmark relationship remain locked. Landing R&D must consume the repository-owned identity assets exactly and must not redraw, approximate or reinterpret the mark.

## Hero selection
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

## Verified hero evidence
Accepted rich-media candidate:
- branch: `work/landing-hero-a-media-rd-v0.3`
- draft PR: #165
- exact head: `cd0de24be0b06edafbffa284c091019faa6841c3`
- Engineering Quality: `34521959592` — passed
- Landing Hero A Media R&D: `34521959590` — passed
- evidence artifact: `10170065180`
- artifact digest: `sha256:587f2aceae11e3770a1a1d7dd7634619f227ae81ee818886f4c37a5de8f16a8b`

Browser verification covers 1440×900, 390×844, four loaded media cells, locked-logo byte parity, Lab Matrix proportions, pointer response, ambient temporal motion, reduced-motion behavior, no horizontal overflow, copy/media separation and runtime cleanliness.

## Historical alternatives
The original coded comparison in PR #163 explored:
- A — Lab Matrix
- B — Resolve Aperture
- C — Creative Instrument

The user selected A. B and C remain historical exploration evidence and are not active directions.

A v0.2 in PR #164 established the refined Lab Matrix geometry before the rich-media pass. It is superseded by the accepted v0.3 hero for ongoing R&D.

## Next section rule
Continue the Landing section-by-section under `CREATIVE_DEVELOPMENT.md`.

The next section must extend the approved Lab Matrix grammar rather than introduce a new visual identity. It should continue the same-media/creative-thread story from the hero into concrete RenderLab capability proof, preserve media dominance, and avoid reverting to generic SaaS feature cards.

The hero may only be materially changed again if:
- the user explicitly reopens it;
- a later full-page composition exposes a concrete continuity/responsive/accessibility problem;
- production feasibility requires a bounded adaptation, which must preserve the approved visual intent and be reviewed.

## Production boundary
Directional hero approval does **not** authorize:
- modifying production `/`;
- merging experimental prototype code as product implementation;
- changing routes, auth, backend, schema, security or infrastructure;
- adding dependencies without the normal dependency review;
- deploying.

The complete Landing must still reach reviewed-design-candidate status and receive explicit user approval before production implementation begins.
