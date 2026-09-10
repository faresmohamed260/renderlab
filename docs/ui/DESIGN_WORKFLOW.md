# Visual Design Workflow

## Purpose
RenderLab uses deliberate visual design before implementation when a surface needs meaningful UI/UX exploration. The repository remains the authoritative project record.

`docs/ui/VISUAL_NORTH_STAR.md` defines the visual ambition and acceptance standard for explicitly authorized redesign work. It does not supersede product, security, architecture, or engineering contracts; it controls how visual ambition is interpreted when the user has deliberately reopened a surface for redesign.

## Tool Standard
**Primary visual design workspace: Penpot.**

Penpot replaces Figma as the default ongoing design workspace for RenderLab because the project needs a free/open design workflow that is not blocked by a proprietary free-tier MCP/tool-call quota.

Penpot is used for:
- responsive screen exploration;
- component and layout exploration;
- design-system visualization;
- interaction/prototype exploration where useful;
- visual comparison before implementation.

The tool itself is not the source of truth. Accepted design decisions must be written into the appropriate repository documentation.

## Authority Order
1. `renderlab` repository code and documentation
2. Current Penpot visual workspace or repository-backed interaction prototype for working design exploration
3. Historical design artifacts such as the previous Figma file
4. Chat/session context

If a working design artifact and repository documentation disagree, the repository wins until an explicit design decision updates it.

## Historical Figma Artifact
The existing Figma file `RenderLab Design System` (`PHqgsDctOsEXX4EFR0SS7i`) is retained as **historical reference only**.

It contains useful prior work including:
- Foundation visual exploration;
- Application Shell v0.1/v0.2;
- Create Experience v0.1/v0.2 desktop/mobile explorations.

Previously reviewed decisions derived from those frames remain valid where they are already recorded in the repository. Do not require Figma access to continue the project and do not treat unrecorded Figma content as authoritative.

## Two UI Work Modes
### Integration Mode — default
Ordinary feature work is an implementation/integration problem. Existing approved composition and interaction remain the baseline unless the user explicitly requests redesign.

Procedure:
1. Read repository decisions, design system, component catalog, screen registry, and relevant architecture/product contracts.
2. Verify the current rendered surface when presentation is affected.
3. Integrate the requested feature into the existing system using approved components/mechanics.
4. Run required GitHub build, UI-purity, lifecycle, responsive, accessibility, and configured fixture validation.
5. Inspect actual implementation screenshots at relevant viewports.
6. Update authoritative documentation only from verified reality.

### Authorized Redesign Mode — explicit only
A task enters Authorized Redesign Mode only when the user explicitly asks to redesign, restyle, modernize, reimagine, or visually elevate a named surface/system.

The named surface's previous `APPROVED` visual composition, styling, and motion may then be reopened. Existing product behavior, information architecture, routes, API/data/ownership/security contracts, accessibility requirements, and engineering/testing gates remain authoritative unless the user separately changes them. `LOCKED` decisions remain locked unless explicitly reopened.

For meaningful redesign work, use this sequence:
1. **Re-establish reality.** Read current docs and inspect the current rendered implementation, responsive states, and important workflows.
2. **Define the boundary.** Record which visual decisions are intentionally reopened and which product/engineering contracts remain unchanged.
3. **Build a reference matrix.** For each important interaction, record the exact reference, the behavior to borrow, what must not be copied, desktop/touch behavior, and the reduced-motion equivalent.
4. **Create complete visual concepts.** Cover the whole requested surface—not only a hero or isolated control—with desktop and narrow/mobile states plus the important product states that materially change composition.
5. **Write interaction choreography.** Describe what the user sees and feels: origin, movement/transformation, response, settled state, interruption behavior, and reduced-motion behavior. Do this before choosing an animation library.
6. **Prototype signature temporal behavior.** Build a repository-backed interactive prototype, browser demo, or equivalent reviewable artifact for interactions whose quality cannot be judged from static frames.
7. **Obtain explicit human design approval.** Do not treat “looks plausible” or a passing static raster as approval for kinetic behavior.
8. **Record the accepted design decision/phase contract.** Only after approval should the implementation slice become execution-ready.
9. **Implement faithfully.** Treat the accepted concept/prototype as the production visual specification rather than reinterpreting it into a safer conventional UI.
10. **Validate functionality and fidelity separately.** Run exact-head engineering workflows, then compare real browser output against the accepted concept/prototype and correct material drift.
11. **Update repository status from verified implementation only.** Production deployment remains a separate explicit operation.

## Reference Matrix Standard
For expressive redesign work, vague direction such as “make it modern” or a list of libraries is insufficient. Record references at the interaction level.

A useful matrix includes:
- RenderLab user task/interaction;
- exact source or internal prototype;
- visual/behavioral property to borrow (for example spring character, media-object continuity, masking, scroll choreography, drag displacement, pointer depth, morph origin);
- properties that must not be copied (brand, copy, layout, product claims, proprietary identity);
- desktop pointer behavior;
- narrow/touch behavior;
- keyboard/focus behavior when interactive;
- reduced-motion/static equivalent.

Different references may guide navigation, media transitions, drag physics, disclosures, scroll storytelling, and microinteraction timing. The result must still read as one RenderLab system.

## Static Design vs Kinetic Design
Static artifacts remain valuable and required for composition. Penpot/SVG/raster review can establish:
- hierarchy;
- typography;
- spacing;
- palette;
- surface treatment;
- responsive layout;
- static states.

A static artifact **cannot by itself approve a claimed kinetic, morphing, physics, pointer-responsive, scroll-choreographed, or other temporal interaction**.

For those interactions, the design gate requires reviewable motion evidence before implementation approval. Acceptable evidence includes:
- a repository-backed interactive prototype;
- deterministic browser interaction capture;
- a browser recording/video artifact;
- another reviewable temporal artifact that demonstrates the full interaction.

The kinetic evidence must show, where relevant:
- pointer behavior;
- keyboard/focus behavior;
- narrow/touch equivalent;
- `prefers-reduced-motion` behavior;
- starting, transitional, interrupted/reversed where important, and settled states;
- no clipped primary content or horizontal overflow;
- no fabricated product state.

## Fidelity Review
Functional QA and visual-fidelity QA are separate gates.

After an accepted redesign is implemented, review real browser output against the accepted concept/prototype for at least:
- visible copy and information hierarchy;
- typography and spacing;
- palette, surface depth, borders, glow/blur treatment;
- media framing and component geometry;
- motion origin/destination and continuity;
- timing/easing/spring character and settled geometry;
- desktop and narrow behavior;
- keyboard/touch/focus parity;
- reduced-motion equivalence.

A build passing, controls working, or screenshots existing does not prove fidelity. A technically green candidate may still fail if it is materially flatter, more generic, or less coherent than the accepted design.

## Remote-First Constraint
RenderLab development must not depend on a local workstation or Vercel preview deployments for ordinary iteration.

For integration work, the preferred loop remains:

`repository decision → GitHub implementation → GitHub Actions/Playwright screenshots → visual review → repository update`

For Authorized Redesign Mode, prefer:

`current-render audit → reference matrix → visual concepts → interaction prototype/motion evidence → human approval → repository decision/phase contract → GitHub implementation → GitHub Actions functional + visual/motion evidence → fidelity review → repository update`

Prototype artifacts should be remote/repository-backed when possible so future sessions can inspect them. A prototype is design evidence, not production product code and not deployment authorization.

If direct Penpot automation is not available in a given ChatGPT session, that is not permission to invent an unreviewed visual state. Use repository-backed open assets/prototypes and remote rendered evidence instead.

## Export/Handoff Guidance
When Penpot artifacts need to survive outside the design service, prefer open/interoperable exports such as SVG or PNG and place only genuinely useful handoff assets in the repository. Do not duplicate every working design frame into GitHub.

For kinetic work, preserve the smallest useful prototype/source plus review evidence needed to understand the accepted behavior. Do not commit large disposable captures when a compact source/prototype and bounded evidence artifact suffice.

Repository documentation should describe the design decision, not depend on an opaque design-tool node ID or inaccessible video to explain it.

## Approval Language
- `EXPERIMENTAL` — exploration exists but is not accepted.
- `REVIEWED DESIGN CANDIDATE` — visual direction has been reviewed and may proceed to the next design/implementation gate. For a signature kinetic interaction, this status requires temporal evidence, not only static frames.
- `APPROVED` — implemented surface/component has passed the required engineering gates, responsive rendered review, design-fidelity review, and documentation review; temporal behavior has motion evidence when applicable.
- `LOCKED` — intentionally finalized and should not change without explicit product reason/user authorization.

A Penpot frame alone never makes implementation `APPROVED`.

## Design / Interaction Toolbox
These are evaluation sources, not mandatory dependencies and not competing sources of truth. Libraries do not substitute for an interaction specification.

- **Motion Primitives / Motion for React:** default application path for morphing, shared-layout, springs, presence, disclosure, drag, tilt/magnetic behavior and other feature-local interaction continuity.
- **React Bits:** candidate source for selected creative/physics-like interactions after accessibility, reduced-motion, touch and performance review.
- **Aceternity UI / Magic UI:** candidate sources for selected maintained mechanics/effects, especially when they can be normalized to RenderLab rather than imported as a competing visual system.
- **GSAP:** candidate choreography runtime when an accepted interaction needs timeline-heavy, scroll-linked, SVG or complex sequence control that is materially clearer or more maintainable than the existing Motion stack. A second runtime requires explicit dependency/performance justification; novelty is insufficient.
- **Lenis:** candidate smooth-scroll layer primarily for a high-expression public surface whose accepted design genuinely benefits from it. Do not globally replace native application scrolling or make essential behavior depend on scroll hijacking.
- **Canvas/WebGL/shaders:** candidates for an explicitly approved high-expression surface, especially Landing. Keep them isolated, performance-budgeted, lazy where appropriate, and backed by a complete static/reduced-motion equivalent.
- **Watermelon UI / Kaikei.app:** component and visual-pattern research sources; code adoption requires stack/license/accessibility/token-fit review.
- **Taste skill / Vercel web-design-guideline skill / `awesome-design.md`:** advisory review heuristics when available in the active environment.
- **Image-to-code:** implementation accelerator for a specific accepted visual reference, never a source of product semantics or approval.
- **Emil Kowalski design references:** inspiration for interaction timing, tactile feedback and restraint; adapt principles to RenderLab rather than copying a competing system.

For every external source, keep the repository authority order unchanged. Prefer the smallest suitable solution, document any real adoption, and avoid dependency soup.

## Engineering Integrity During Redesign
Visual ambition does not lower RenderLab's engineering bar.

Any production implementation still requires the relevant existing gates, including:
- `npm run build` and Engineering Quality as applicable;
- `npm run verify:ui-purity` where feature/shell controls may be affected;
- exact-head GitHub workflow success for every required/actually attached workflow;
- responsive desktop and 390px/narrow verification;
- keyboard, focus, screen-reader semantics, and touch reachability;
- `prefers-reduced-motion` and a complete static equivalent;
- no horizontal overflow/clipping;
- performance/dependency review for material effects/runtimes;
- configured fixture ownership/isolation and cleanup when cloud-backed workflows are affected;
- regression coverage for reused/shared components;
- documentation synchronized with verified implementation;
- separate explicit authorization for production deployment.

Do not weaken a functional or security test because it makes a redesign harder. If an accepted concept cannot satisfy an invariant, revise the concept or implementation architecture.

## First Recommended Visual R&D Slice
The first future use of Authorized Redesign Mode should be a **Create visual R&D prototype**. Create is the signature authoring surface and the best place to establish the reusable RenderLab motion/interaction language before another cross-product redesign.

That design task should stop after an accepted complete concept + interaction prototype. It must not modify production Create code, add production dependencies, open a new product route, or deploy the application. After explicit human approval, the next session may expand a Phase 23/Cycle 5 implementation contract from the accepted evidence under the existing progressive-planning rules.

This recommendation does not itself create Phase 23 or Cycle 5.
