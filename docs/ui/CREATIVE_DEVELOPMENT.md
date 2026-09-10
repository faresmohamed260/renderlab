# Creative Development Workflow

**Status:** Accepted workflow for high-expression visual R&D  
**Applies to:** explicitly authorized redesign work, especially public/high-expression surfaces such as Landing  
**Does not override:** product behavior, routes, data/ownership/security contracts, accessibility, exact-head validation, fixture cleanup, repository authority, or explicit deployment authorization

## Purpose
RenderLab uses a code-first creative-development loop for high-expression web design when static mockups are not the best medium for judging composition, motion, depth, or responsive behavior.

The running browser is the primary design surface for these explorations. The repository remains the source of truth.

This workflow supplements `DESIGN_WORKFLOW.md` and `VISUAL_NORTH_STAR.md`. It does not weaken the existing design-before-production gate: exploratory code may be built before full-surface approval, but production UI is not modified until the accepted direction, responsive states, and required temporal behavior are reviewed and recorded.

## Core loop
For high-expression web R&D, prefer:

`references -> design rules -> several bounded coded directions -> browser evidence -> critique -> one-variable refinement -> directional approval -> next section -> complete-surface review -> production implementation contract`

Do not default to:

`broad prompt -> whole-page AI generation -> one-shot acceptance`

## 1. Establish reality first
Before visual work:
- read `AGENTS.md`, `PROJECT.md`, `UI_MIGRATION.md`, `DESIGN_WORKFLOW.md`, `VISUAL_NORTH_STAR.md`, `UI_SYSTEM.md`, `SCREEN_REGISTRY.md`, and relevant architecture/component documentation;
- inspect the current implementation and rendered behavior;
- identify exactly which visual decisions are reopened;
- list product, security, route, accessibility, testing, and deployment constraints that remain unchanged;
- use the current repository implementation for locked assets such as the RenderLab logo. Never redraw a locked asset from memory.

## 2. Build a reference kit at interaction level
Collect references for specific properties rather than naming broad brands.

Each useful reference should record:
- source URL or captured reference;
- exact property being studied: hero composition, typography, media framing, nav behavior, scroll choreography, mask/reveal, hover physics, mobile adaptation, etc.;
- what may be borrowed as a principle;
- what must not be copied: brand identity, proprietary layout, copy, assets, claims;
- desktop behavior;
- touch/narrow behavior;
- reduced-motion equivalent.

A reference kit should normally contain multiple independent references, not one site to imitate.

## 3. Explore one section at a time
For high-expression public surfaces, section-level coded exploration is allowed before a complete-surface design exists.

This is **pre-approval R&D**, not production implementation.

For a Landing redesign:
1. start with the hero/first viewport;
2. produce at least three materially different coded directions;
3. review real browser output and motion evidence;
4. select one direction;
5. refine it until its visual grammar is strong enough to guide the next section;
6. continue section-by-section;
7. only after the complete surface exists may the full Landing design be approved for production implementation.

This preserves the existing whole-surface approval requirement while avoiding the quality loss of one-shot whole-page generation.

## 4. Prompt protocol
Prompts should be narrow, explicit, and preserve accepted work.

### Exploration prompt pattern
Use a prompt shaped like:

> Do not code yet. We are redesigning only [named section/surface]. Study the supplied references and current RenderLab implementation. Propose 3 materially different directions. For each, describe composition, typography, media treatment, signature interaction, mobile behavior, reduced-motion behavior, and why it specifically fits RenderLab. Respect all locked assets and product constraints. Do not design the rest of the page.

### Build prompt pattern
After selecting a direction:

> Build only [selected direction] as working browser code on the R&D branch/prototype. Preserve the accepted composition and all locked assets exactly. Implement the signature interaction rather than generic fade-and-slide entrances. Produce desktop, 390px mobile, and reduced-motion states. Do not modify production routes or product behavior.

### Self-critique prompt pattern
After rendering:

> Open the result in a browser. Capture the required viewports/states. Critique it before editing. Identify the five strongest reasons it still feels generic, AI-generated, visually weak, or inconsistent with the references and RenderLab north star. Correct those issues, then capture the same evidence again.

### Narrow refinement prompt pattern
Change one design dimension at a time when possible:

> Preserve [composition/media/logo/interaction/etc.] exactly. Change only [typography / spacing / crop / motion timing / depth / navigation density]. Re-render the same evidence and compare before/after.

Never use vague prompts such as "make it premium" as the primary design instruction.

## 5. Browser evidence is mandatory
Exploratory code is judged from the browser, not JSX/CSS plausibility.

For each serious candidate, review at minimum:
- 1440px desktop;
- standard laptop viewport where useful;
- 390px narrow/mobile;
- start state;
- meaningful transitional or mid-interaction state;
- settled state;
- reverse/interrupted behavior when the interaction depends on continuity;
- `prefers-reduced-motion` equivalent;
- no horizontal overflow or clipped primary content;
- console/runtime cleanliness for the prototype.

Use Playwright or equivalent deterministic browser automation for captures where practical.

## 6. Preserve what works
AI-assisted visual development tends to regress accepted details when prompts are broad.

Every refinement prompt must explicitly state what must remain unchanged when that is material, including examples such as:
- locked logo geometry and wordmark relationship;
- accepted composition;
- media crop;
- headline copy;
- interaction mechanic;
- route behavior;
- accessibility semantics.

Do not regenerate an entire section merely to change one visual property unless the direction itself has been rejected.

## 7. Use maintained mechanics before inventing them
The existing RenderLab component/source policy remains authoritative.

For high-expression web R&D, evaluate in this order:
1. existing RenderLab component/mechanic;
2. existing RenderLab primitive;
3. shadcn/Radix for conventional accessible controls;
4. Motion Primitives / Motion for React for springs, shared layout, gestures, masking, presence, drag, and local choreography;
5. approved maintained creative sources such as React Bits, Aceternity UI, and Magic UI where a specific mechanic fits;
6. external design-engineering registries may be used for research/prototype mechanics after license/accessibility/stack review;
7. GSAP/ScrollTrigger only when accepted choreography benefits materially from timeline-heavy or scroll-linked control;
8. Lenis only when the accepted Landing experience genuinely benefits from smooth-scroll orchestration;
9. Canvas/WebGL/Three.js/shaders only for a bounded scene whose contribution is central enough to justify cost and fallback work.

Technology follows the interaction. Do not install libraries as decoration or because they appear in showcase sites.

## 8. Dependency and performance gate
Exploratory prototypes may evaluate a candidate runtime, but production adoption still requires the repository's normal dependency review.

Before adopting a material new runtime in production, document:
- why the existing stack is insufficient;
- bundle/runtime cost;
- interaction/performance implications;
- accessibility/reduced-motion strategy;
- mobile/touch fallback;
- maintainability and license fit;
- whether the effect can be isolated/lazy-loaded.

Landing may justify richer tooling than application surfaces, but it does not waive performance or accessibility requirements.

## 9. Design approval vs implementation approval
Use these distinctions:

- **EXPERIMENTAL CODED DIRECTION** — browser-running exploration; not accepted.
- **DIRECTIONALLY APPROVED** — one section establishes an accepted visual grammar and may guide further R&D; not permission to modify production.
- **REVIEWED DESIGN CANDIDATE** — complete requested surface, responsive states, and required motion evidence have been reviewed.
- **APPROVED** — production implementation has passed functional, exact-head, responsive, accessibility, motion/fidelity, and documentation gates.
- **LOCKED** — intentionally finalized and not to be reinterpreted.

A hero may be directionally approved while the Landing as a whole remains unapproved.

## 10. Remote-first implementation loop
RenderLab remains remote-first and does not depend on a local workstation or Vercel preview deployments for normal iteration.

Preferred R&D loop:

`GitHub R&D branch -> browser-capable GitHub Action / Playwright -> screenshot/video artifact -> review -> branch refinement`

Production remains untouched until the design gate is passed.

If a remote browser prototype is implemented inside the application repository, keep it clearly isolated and unmerged while experimental. Do not expose temporary R&D routes in a production deployment.

## 11. Production handoff
Once the complete design is explicitly approved:
1. record the accepted design and interaction contract in the repository;
2. open/expand the bounded implementation contract;
3. implement against the accepted prototype rather than reinterpreting it;
4. run all existing affected exact-head workflows;
5. compare real production-candidate browser output with the accepted R&D evidence;
6. fix material visual drift even when tests are green;
7. update repository documentation from verified implementation only;
8. deploy only after separate explicit authorization.

## RenderLab Landing R&D application
For the current Landing redesign:
- the Lab Grid modular `R` and approved wordmark relationship remain locked;
- the current production Landing behavior/routes/closed-beta truth remain authoritative;
- visual composition and motion are reopened under Authorized Redesign Mode;
- first working slice is **hero-only competitive exploration in real code**;
- at least three materially different hero directions should be rendered before selecting one;
- no complete Landing implementation should be merged merely because a hero direction succeeds;
- the rest of the Landing is developed only after the hero establishes an accepted visual grammar.
