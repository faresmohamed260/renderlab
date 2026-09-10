# Landing Hero R&D 0.1

**Status:** EXPERIMENTAL CODED DIRECTIONS  
**Issue:** #158  
**Workflow:** `docs/ui/CREATIVE_DEVELOPMENT.md`

## Scope
This is hero-only pre-approval R&D for the public Landing. It intentionally does **not** modify production `/`, product behavior, routes, auth/admission, backend/schema/infrastructure, or deployment.

The locked Lab Grid mark and wordmark relationship remain authoritative. The prototype vendors the exact production `public/renderlab-mark.svg` geometry as its local brand asset.

## Reopened vs locked
Reopened for this R&D:
- hero composition;
- headline hierarchy;
- media framing;
- pointer response;
- first-viewport spatial treatment;
- supporting microcopy and visual chrome.

Still locked/authoritative:
- Lab Grid `R` geometry and brand relationship;
- Closed Beta / invitation-only truth;
- `Open Create` → `/create`;
- `Sign in` → `/settings`;
- no public signup/waitlist/pricing/testimonial/fake-metric/provider/SLA claims;
- accessibility, reduced motion, no-overflow, exact-head validation, repository authority, and separate deployment authorization.

## Research translated into working rules
The research pass produced these operating rules:

1. **Build in the browser, not in presentation tooling.** Use coded directions and browser captures as the design surface.
2. **Explore several bounded directions before committing.** Do not one-shot the whole Landing.
3. **Make media/work dominate while chrome recedes.** The hero must feel like a creative instrument, not a marketing dashboard.
4. **Use one strong interaction idea per direction.** Avoid generic fade/slide/hover-scale motion as the signature behavior.
5. **Preserve accepted details explicitly during refinement.** Change one visual dimension at a time after a direction is chosen.
6. **Use existing approved mechanics first.** Production runtime choice follows the accepted interaction; this prototype does not pre-approve GSAP, Lenis, Three.js, or another dependency.

## Reference kit
These sources guide process/interaction principles only; RenderLab must not copy their branding, assets, layouts, or product claims.

| Reference | Property studied | Borrow | Do not copy |
|---|---|---|---|
| OpenAI Academy — Codex design context & iteration | screenshot-driven coding loop | render → critique → refine; persistent design rules | demo assets/layout |
| Anthropic Claude Code frontend-design guidance | anti-generic art direction | strong concept, subject-specific visual language, critique before/after build | Anthropic identity/examples |
| 21st.dev prompting/component workflow | bounded variation and preservation prompts | options before implementation; preserve accepted properties; maintained mechanics | catalogue styling unchanged |
| Motion for React | local interaction continuity | bounded pointer response, transforms, reduced-motion-aware motion | library-demo aesthetic |
| GSAP ScrollTrigger | timeline/scroll choreography evaluation | consider only if accepted Landing choreography needs precise timeline control | dependency adoption before evidence |

## Shared content truth
All three directions use the same representative visual scene and the same product truth so the comparison measures design rather than random content variation.

Truthful capability language may include:
- Create Image;
- Edit Image with references;
- Create Video;
- Animate Image;
- durable Library continuity.

The hero does not claim live generation state, speed, provider behavior, or unsupported capabilities.

## Direction A — Lab Matrix
**Thesis:** a render assembles from modular cells related to the locked `R` geometry.

- Composition: copy at left, large four-cell media object at right.
- Signature interaction: bounded pointer displacement separates/rejoins the media cells.
- Brand connection: modularity comes from the Lab Grid mark without enlarging or redrawing the logo itself.
- Mobile: copy stacks above a compact cell assembly.
- Reduced motion: cells remain settled with zero pointer displacement.

## Direction B — Resolve Aperture
**Thesis:** the visitor directly resolves one image from rough draft to finished render.

- Composition: nearly full-viewport media field with copy anchored into the darker left region.
- Signature interaction: pointer position controls the draft/final reveal boundary.
- Brand connection: experimentation → rendering is literal in behavior rather than decorative symbolism.
- Mobile: the media remains dominant and copy settles over a protected lower gradient.
- Reduced motion: static final-weighted split with no pointer tracking.

## Direction C — Creative Instrument
**Thesis:** the media canvas is already the instrument; controls sit at its edge rather than inside a dashboard card.

- Composition: strong headline above one dominant canvas, with a compact attached control dock.
- Signature interaction: bounded stage depth/pointer response while controls remain stable and legible.
- Product connection: dock labels use truthful Image/Video, Reference, Motion, Advanced, and Generate concepts without fabricating a live application state.
- Mobile: dock compresses to mode + prompt + Generate; secondary concepts recede.
- Reduced motion: flat stable canvas with no pointer depth.

## Review gate
Before any direction can become `DIRECTIONALLY APPROVED`:
- [ ] 1440×900 browser capture for A, B, C;
- [ ] 390×844 capture for A, B, C;
- [ ] pointer behavior proven for A, B, C;
- [ ] reduced-motion state checked for A, B, C;
- [ ] no horizontal overflow;
- [ ] no console/runtime errors;
- [ ] locked mark asset verified against the production SVG content;
- [ ] human chooses a direction or rejects all three.

Directional approval of one hero is **not** approval to modify production Landing. It only establishes the visual grammar for the next Landing section under `CREATIVE_DEVELOPMENT.md`.
