from pathlib import Path

additions = {
    "PROJECT.md": r'''

# Cycle 4 — Kinetic Visual Experience
**Status: `ACTIVE / PHASE 19 CONTRACT READY`.**
**Planning baseline:** `e85aa633caa25e1bc7fdc529d37f08d10cde3cea`.

## Objective
Make RenderLab visibly feel like a premium next-generation AI creative instrument. This cycle is intentionally about what users can see and feel: spatial continuity, responsive depth, morphing state, spring-like tactile feedback, atmospheric surfaces and highly polished media presentation. It is not a performance-only or backend cycle.

The target is closer to the interaction quality of modern AI model-demo experiences than to a conventional dark dashboard: futuristic, kinetic and memorable without becoming noisy, unreadable or gimmicky.

## Visual thesis — Kinetic Precision
RenderLab keeps its dark-first media-focused foundation but evolves it into a more dimensional system:
- deep near-black canvas with restrained violet/electric spectral light rather than flat charcoal panels;
- translucent elevated chrome with luminous edge response instead of large opaque boxes;
- spring-based spatial transitions and shared-layout morphs so state feels physically connected;
- low-frequency atmospheric motion in the background, with task/media content remaining dominant;
- tactile hover/press/focus feedback, including selective magnetic or depth response where it clarifies interactivity;
- morphing disclosure and navigation selection rather than abrupt swaps;
- later media surfaces may use bounded tilt/depth and card-to-viewer spatial continuity;
- reduced motion always resolves to a complete static experience.

This direction is intentionally **not** generic neon cyberpunk. Avoid rainbow chrome, constant parallax, cursor followers, perpetual high-amplitude animation, fake particle overload, or visual effects that make prompts/media harder to read.

## Locked cycle roadmap
1. **Phase 19 — Kinetic Foundation & App Shell.** Establish the visual tokens/effect budget and make every application route immediately feel different through atmospheric canvas, glass/depth shell treatment, shared-layout active navigation, tactile feedback and route transitions.
2. **Phase 20 — Create as a Creative Instrument.** Recompose the Create workspace around a more immersive prompt surface, morphing Image/Video context, richer Advanced disclosure, tactile generation controls and expressive but truthful generation/result state motion.
3. **Phase 21 — Library & Viewer Spatial Media Experience.** Elevate Creatives/Uploads browsing and the Viewer with media-first depth, bounded hover/tilt, shared-element/spatial continuity, richer selection/organization feedback and result/source comparison polish.
4. **Phase 22 — Activity, Settings, Landing & System Cohesion.** Give remaining user-facing surfaces the same visual language, add expressive lifecycle/status presentation where useful, and run the final cross-product responsive/accessibility/performance visual audit.

Later phases remain roadmap-level until the immediately preceding phase produces rendered evidence. The cycle does not pre-approve backend capability, schema, worker, routing or deployment changes.

---

# Phase 19 Execution Contract — Kinetic Foundation & App Shell
**Status: `READY FOR IMPLEMENTATION`.**
**UI decision:** UI-062.

## Goal / user value
The first application viewport should immediately communicate that RenderLab is a futuristic creative system rather than a default component-library application. The change must be obvious before the user opens a menu or starts a generation.

## Verified starting state
- The application shell is approved but not locked and is shared by Create, Library/Viewer, Activity, Settings and Admin.
- Current global styling is a flat dark token set (`canvas`, `surface-1..3`, border, text, accent) with no atmospheric layer or shared effect tokens.
- `motion@13.1.1` is already pinned and approved for reduced-motion-aware layout/presence transitions; no new animation runtime is required for Phase 19.
- The current shell uses conventional opaque sidebar/topbar/mobile-bottom-nav surfaces and static active navigation styling.
- Existing route prefetch/refresh behavior is performance-sensitive and must remain intact.
- Production deployment remains explicit and separate; Phase 19 implementation/merge does not deploy automatically.

## In scope
### 19A — Kinetic visual tokens and effect budget
- Add semantic visual tokens for glass/translucent surfaces, surface highlight, subtle spectral accent, soft glow/elevation and atmospheric background treatment.
- Keep the existing semantic roles intact; new tokens extend the system rather than replacing contrast/status meaning.
- Establish effect intensity rules so glow, blur and gradients are concentrated in shell/interaction emphasis rather than flooding every card.

### 19B — Atmospheric application canvas
- Add a RenderLab-owned application backdrop with layered radial/spectral light and very slow transform/opacity motion.
- Prefer CSS/GPU-friendly transforms and opacity for continuous ambience; avoid a continuous JavaScript animation loop.
- Background motion must be subtle enough that media and text remain the focal point.
- `prefers-reduced-motion` must disable or collapse ambient movement without removing the visual composition.

### 19C — AppShell visual transformation
- Desktop sidebar/top bar become translucent dimensional chrome with controlled backdrop blur, inner highlight and separation from the atmospheric canvas.
- Active navigation uses a shared-layout morphing background/indicator with spring motion; icons/text receive restrained active emphasis rather than a static filled button only.
- Hover/press states gain tactile spring/scale feedback while preserving keyboard/focus semantics.
- Mobile bottom navigation becomes a compact floating dock treatment with safe-area support and the same morphing active state.
- Brand/account/activity affordances retain existing destinations and semantics.

### 19D — Route-content continuity
- Add a small reduced-motion-aware route transition at the shell content boundary so top-level Create / Library / Activity / Settings changes feel spatially connected instead of hard-cutting.
- The transition must not interfere with Next.js navigation, route prefetch, server rendering, focus handling or current refresh behavior.
- Do not animate nested Viewer transitions as if they were top-level section changes; later Phase 21 owns media-specific spatial continuity.

### 19E — Responsive and accessibility behavior
- Preserve desktop and narrow information architecture.
- No essential interaction may depend on hover or pointer motion.
- Focus rings remain high-contrast and visible over translucent/glowing surfaces.
- Text contrast and touch targets remain WCAG-oriented.
- Reduced motion uses static state changes with no transform-dependent meaning.

## Explicitly out of scope
- Internal Create composer redesign beyond shell inheritance (Phase 20).
- Library card/Viewer spatial redesign (Phase 21).
- Activity row or Settings content redesign beyond shell inheritance (Phase 22).
- WebGL/canvas particle engines, shader backgrounds, cursor-following particles, audio-reactive effects or a permanent physics simulation.
- Product capability, generation semantics, model routing, media identity, schema, Supabase, R2, worker/provider or deployment changes.

## Component / architecture direction
- Reuse the existing `AppShell`, `Button`, `RenderLabBrand`, Lucide family and `motion/react` dependency.
- A small shell-owned motion composition may be introduced for shared-layout navigation and route transitions; it must remain UI state only and never become a product/global data store.
- Atmospheric visuals belong to the application-shell visual layer, not to feature data components.
- Prefer CSS custom properties and semantic Tailwind tokens for reusable visual effects.
- Do not add a new third-party package unless implementation proves the existing Motion + CSS stack cannot provide the required effect cleanly.

## Validation matrix
Before Phase 19 can be marked complete:
- `npm run verify:ui-purity`, lint, typecheck, unit tests and production build pass on exact head;
- UI Shell regression passes with existing navigation/prefetch/account semantics;
- affected Create, Library and Activity lifecycle/render workflows pass because the shared shell changes every application route;
- desktop and 390px screenshots are captured for at least Create, Library and Activity;
- visual review confirms the atmospheric canvas, dimensional chrome, morphing active navigation and route transition are materially visible and coherent;
- no horizontal overflow, clipped mobile dock, unreadable text, excessive blur/glow or reduced-motion regression is accepted;
- implementation uses transform/opacity for continuous motion and does not introduce a permanent high-frequency JS animation loop.

## Documentation outputs
On verified implementation update `PROJECT.md`, `docs/ui/UI_MIGRATION.md`, `docs/ui/UI_DECISIONS.md`, `docs/ui/UI_SYSTEM.md`, `docs/ui/COMPONENT_CATALOG.md`, `docs/ui/SCREEN_REGISTRY.md` and `docs/architecture/FRONTEND_ARCHITECTURE.md` where implementation changes durable visual/component/architecture state.

## Exit criteria
Phase 19 is complete only when a user can visibly identify the new visual era on first load, the exact-head functional/regression matrix is green, desktop/mobile renders are reviewed, reduced-motion/accessibility behavior is verified, and authoritative docs match the implementation. Build success alone is insufficient.
''',
    "docs/ui/UI_MIGRATION.md": r'''

# Cycle 4 — Kinetic Visual Experience
**Status: `ACTIVE / PHASE 19 READY`.**

The next major product pass is explicitly visual. Success is measured by user-visible changes to hierarchy, surfaces, motion, depth and spatial continuity, not merely by backend/performance improvements.

## Roadmap
- **Phase 19 — Kinetic Foundation & App Shell:** `READY FOR IMPLEMENTATION` — atmospheric canvas, dimensional/glass shell chrome, morphing active navigation, tactile feedback, top-level route continuity, reduced-motion/static equivalents.
- **Phase 20 — Create as a Creative Instrument:** roadmap only until Phase 19 evidence closes.
- **Phase 21 — Library & Viewer Spatial Media Experience:** roadmap only until Phase 20 evidence closes.
- **Phase 22 — Activity, Settings, Landing & System Cohesion:** roadmap only until Phase 21 evidence closes.

## Phase 19 acceptance tracker
- [ ] Extend semantic visual tokens/effect budget without weakening contrast/status semantics.
- [ ] Add subtle atmospheric application canvas with reduced-motion static fallback.
- [ ] Transform desktop shell chrome into dimensional translucent surfaces.
- [ ] Add spring/shared-layout active navigation state and tactile hover/press response.
- [ ] Transform the mobile bottom navigation into a compact floating dock with safe-area handling.
- [ ] Add top-level route-content continuity that does not break prefetch/refresh/focus behavior.
- [ ] Pass purity/lint/typecheck/unit/build and affected shell/Create/Library/Activity exact-head regressions.
- [ ] Review desktop + 390px Create/Library/Activity renders for obvious visible improvement, no overflow and reduced-motion correctness.
- [ ] Update component/screen/architecture records from verified implementation reality.

UI-062 is the visual decision for this phase. No deployment is authorized by this plan.
''',
    "docs/ui/UI_DECISIONS.md": r'''

### UI-062 — Cycle 4 uses a Kinetic Precision visual system and starts at the shared AppShell
**Status:** Accepted / Phase 19 implementation authorized
**Date:** 2026-09-07

**Decision:** RenderLab's next visual era is **Kinetic Precision**: a dark media-first creative environment with restrained spectral atmosphere, translucent dimensional chrome, spring/shared-layout morphing, tactile interaction feedback and carefully bounded depth. Phase 19 applies the first visible layer at the shared application shell so Create, Library/Viewer, Activity and Settings immediately inherit the new visual language. The existing information architecture, destinations, product semantics and ownership boundaries remain unchanged.

The signature Phase 19 motifs are:
- atmospheric near-black canvas with low-frequency violet/electric light;
- glass/translucent shell surfaces with subtle inner highlight and depth rather than flat opaque charcoal;
- shared-layout spring motion for active navigation selection;
- small press/hover/focus response that makes controls feel physical without reducing touch/keyboard parity;
- a floating mobile navigation dock with the same active-state language;
- reduced-motion-aware top-level route continuity.

**Reason:** The current product is functionally mature but visually restrained enough to read as a conventional component-library application. The explicit product goal is now a visibly futuristic, high-end AI creative experience comparable in interaction ambition to modern model-demo sites. Starting with the shared shell establishes one coherent visual grammar before feature-level redesigns and makes the first implementation slice materially visible across the product.

**Effect budget / guardrails:** Futuristic does not mean permanent spectacle. Avoid rainbow gradients, constant high-amplitude parallax, cursor-following particles, essential hover-only behavior, large-area glow behind body copy, continuous JS physics loops or expensive WebGL as baseline chrome. Continuous ambience should be CSS/transform/opacity based and subtle. Physics-like response is reserved for discrete interaction using Motion springs. `prefers-reduced-motion` must produce a complete static composition. Media, prompts and task state remain more visually important than decorative effects.

**Consequences:** UI-062 deliberately evolves the approved-but-not-locked shell visual treatment and the earlier UI System warning against gratuitous effects; that warning still applies to unbounded decoration, while purposeful visible atmosphere/morphing/tactility is now an explicit product requirement. Phase 19 changes no backend capability, route, schema, worker/provider contract or deployment boundary. Feature-internal visual redesign remains sequenced into later Cycle 4 phases.
''',
    "docs/ui/UI_SYSTEM.md": r'''

## Cycle 4 visual direction — Kinetic Precision
Cycle 4 deliberately raises the visual ceiling beyond the earlier restrained application baseline. The product remains media-first and professional, but visible atmosphere, depth and motion are now first-class parts of the RenderLab identity when they support clarity and creative flow.

### Signature visual language
- **Canvas:** near-black foundation with sparse violet/electric spectral light and deep falloff, not a flat uniform charcoal field.
- **Chrome:** translucent dimensional surfaces with backdrop separation, thin luminous/inner highlights and restrained elevation.
- **State:** selected/active UI may use shared-layout morphing and localized accent light rather than only static fills.
- **Tactility:** hover/press can use subtle scale/translation/spring response; touch and keyboard receive equivalent state/focus feedback.
- **Spatial continuity:** meaningful mode/route/disclosure/media transitions should preserve origin/destination relationships rather than hard-cutting when practical.
- **Media priority:** generated/uploaded media remains the strongest visual object. Effects recede around imagery and long-form text.

### Effect budget
Use visual effects in layers:
1. **Persistent ambient layer:** one low-frequency atmospheric treatment for the application canvas. Very low amplitude; no essential information.
2. **Shell/state layer:** glass, edge highlight, active-nav glow/morph. Visible but restrained.
3. **Interaction layer:** brief spring/press/hover/focus response on the element being manipulated.
4. **Feature hero moments:** richer morphing/depth only when a later feature phase explicitly approves it.

Do not stack every layer at maximum intensity on the same element. Avoid broad neon halos behind body text, rainbow borders, constant cursor followers, continuous particle physics or multiple competing animated backgrounds.

### Motion implementation rules
- Existing `motion/react` remains the default engine for discrete spring/shared-layout/presence behavior.
- Prefer transforms and opacity; avoid layout-thrashing animation of large surfaces.
- Continuous ambience should prefer CSS keyframes/transforms and must not require a permanent high-frequency JavaScript pointer/physics loop.
- Hover motion cannot be the only affordance. Touch/keyboard semantics remain complete.
- `prefers-reduced-motion` disables continuous ambience and collapses nonessential spatial movement to static/near-instant state changes.
- Preserve current timing guidance: micro feedback 120–180ms, standard transition 180–260ms, large/shared morph 260–420ms; spring response may settle naturally within the same perceived range.

### Phase 19 foundation target
The first implementation of this system belongs to `AppShell` and global semantic tokens. It should visibly change the application canvas, desktop/mobile navigation chrome, active navigation state and top-level route continuity while leaving feature data/behavior untouched. Later Cycle 4 phases extend the same language into Create, Library/Viewer and remaining user-facing surfaces.
''',
}

for filename, addition in additions.items():
    path = Path(filename)
    text = path.read_text()
    marker = addition.strip().splitlines()[0]
    if marker in text:
        raise SystemExit(f"{filename}: planning section already present")
    path.write_text(text.rstrip() + "\n" + addition.rstrip() + "\n")
