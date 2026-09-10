# RenderLab Visual North Star

**Status:** Accepted design-governance baseline  
**Scope:** visual/interaction direction only  
**Does not authorize:** product implementation, route changes, backend/schema/infrastructure changes, dependency adoption, production deployment, or a new Cycle/Phase by itself

## Purpose
RenderLab should not merely be clean, polished, or component-library-correct. Its signature creative surfaces should feel authored, physical, spatial, and unmistakably premium while preserving the product's existing engineering, accessibility, ownership, security, and testing discipline.

This file exists because broad phrases such as “premium modern creative application” and “kinetic” are too easy to satisfy with conservative fades, hover fills, and generic SaaS polish. It defines the visual ambition expected when the user **explicitly authorizes a redesign or visual R&D task**.

For ordinary feature work, existing approved UI remains authoritative and changes stay scoped. For an explicitly authorized redesign, this file controls the interpretation of visual ambition for the named surface together with `UI_SYSTEM.md` and `DESIGN_WORKFLOW.md`.

## Redesign mode is explicit
A task enters **Authorized Redesign Mode** only when the user explicitly asks to redesign, restyle, modernize, reimagine, visually elevate, or otherwise reopen the visual/interaction treatment of a named surface or system.

In Authorized Redesign Mode:
- previous `APPROVED` visual composition, styling, and motion for the named surface may be reopened;
- existing product behavior, information architecture, routes, backend/API contracts, account/security boundaries, durable data semantics, and accessibility requirements remain authoritative unless the task separately and explicitly changes them;
- the work is a **design problem before it is an implementation problem**;
- an implementation that is functionally correct but visually generic is not complete;
- warnings against gratuitous effects mean “do not use effects without purpose,” not “default to no effects.”

`LOCKED` surfaces remain locked unless the user explicitly authorizes changing the locked decision.

## Target experience
RenderLab should feel like a creative instrument with physical continuity rather than a collection of static panels that occasionally animate.

The intended character is:
- **spatial:** users can perceive where important objects come from and where they go;
- **tactile:** direct manipulation has believable response, resistance, settling, or snap where useful;
- **continuous:** meaningful state changes transform existing objects instead of replacing them with unrelated UI whenever practical;
- **media-first:** generated/uploaded media and the current creative task remain visually dominant;
- **precise:** expressive motion does not make controls ambiguous, slow, noisy, or difficult to operate;
- **authored:** the interaction system should have recognizable RenderLab personality rather than default library-demo motion.

## Expressiveness by surface
The same motion intensity is not appropriate everywhere. Use this as the default ceiling and ambition target during explicitly authorized redesign work.

| Surface | Level | Default direction |
|---|---:|---|
| Landing | 4 / 4 | Showcase expression. Rich atmosphere, scroll choreography, interactive graphics, kinetic typography, or bounded canvas/WebGL may be considered when justified. |
| Create | 3 / 4 | Signature creative instrument. Strong morphing, shared geometry, tactile controls, reference physics, and result continuity. |
| Library | 3 / 4 | Spatial media workspace. Media-object continuity, direct manipulation, selection/reorder feedback, bounded pointer depth. |
| Media Viewer | 3 / 4 | Cinematic inspection/continuation. Media continuity, morphing contextual tools, source/result choreography. |
| Activity | 2 / 4 | State-driven motion. Real lifecycle changes may carry restrained energy; terminal history settles. |
| Application Shell | 2 / 4 | Cohesive navigation continuity and tactile state, subordinate to feature surfaces. |
| Settings | 1 / 4 | Calm and trustworthy. Brief depth/state transitions only; no spectacle. |
| Admin | 1 / 4 | Operational clarity first. Minimal expressive motion beyond useful state feedback. |

A lower level is not permission for poor visual design; it limits motion/effect intensity, not typography, spacing, hierarchy, polish, or craft.

## Interaction principles
### 1. Preserve spatial origin and destination
When a user opens, expands, attaches, moves, or continues from an object, prefer transitions that preserve its spatial relationship.

Examples:
- Library media should feel like the same durable object when it becomes the Viewer media stage.
- Viewer → Create continuation should, when the accepted design supports it, visually resolve the media into the Create reference context rather than feeling like an unrelated page cut.
- A disclosure should appear to emerge from its trigger or surrounding geometry rather than teleporting into a disconnected box.

Literal cross-route shared-element implementation is not mandatory if it would require brittle routing/global state. The perceptual requirement is continuity, not a specific technical trick.

### 2. Transform before replacing
For important state changes, prefer geometry, scale, clipping, masking, layout, blur/focus, or shared-element transformation before using a simple fade as the primary storytelling device.

Opacity remains a valid supporting tool. It should not be the entire interaction language.

### 3. Give manipulated objects believable response
Dragging, reordering, attaching, expanding, or pressing may use spring behavior, displacement, resistance, snap, velocity, or bounded overshoot when that improves understanding and feel.

Do not make every ordinary button magnetic or elastic. Physical behavior should be concentrated in interactions users perceive as objects or instruments.

### 4. Motion explains hierarchy and state
Motion may communicate:
- where content came from;
- which object is selected or being manipulated;
- how a mode changes the workspace;
- how a result enters the creative loop;
- which lifecycle state is active;
- which control owns an expanding surface.

Motion must never fabricate progress, ETA, queue position, provider stage, completion, availability, authorization, or other product truth.

### 5. Depth is selective
Glass, glow, blur, spotlight, tilt, parallax, cursor response, shaders, particles, and animated backgrounds are allowed when they support the accepted design for an appropriately expressive surface.

They are not globally forbidden. They also are not defaults.

Avoid:
- large glow behind body text;
- multiple competing animated backgrounds;
- high-frequency cursor followers across ordinary application chrome;
- continuous physics loops for controls that do not benefit from physics;
- decoration that competes with generated media or task state.

## Generic AI-animation failure modes
The following do **not** satisfy a signature RenderLab redesign by themselves:
- every section fading in with `opacity: 0 → 1` plus `translateY`;
- adding a gradient/glow while leaving interaction structure unchanged;
- scaling every card to `1.02` on hover and calling the surface kinetic;
- staggered entrance animation with no spatial relationship to user action;
- using a component demo unchanged from an external registry;
- random parallax, particles, or cursor effects with no product meaning;
- adding more animated elements instead of designing one strong interaction idea.

A plain fade/translate may still be appropriate for low-importance supporting content. It is not enough as the defining interaction of Create, Library, Viewer, or Landing when those surfaces are explicitly being redesigned for high visual ambition.

## Surface interaction targets
These are targets for future design exploration, not pre-approved implementation requirements.

### Create
Explore:
- one composer that morphs coherently across Image/Video, reference/no-reference, Advanced, generating, and result states;
- reference insertion/removal/reorder with object-like snap and displacement;
- a primary Generate actuator with tactile response proportional to its importance;
- generation/result transition that visibly rebalances the workspace rather than inserting a generic card;
- Advanced controls that feel attached to the composer rather than like a separate settings form.

### Library
Explore:
- media-object continuity into Viewer;
- selection and batch mode that reshape the workspace instead of simply adding checkboxes/toolbar chrome;
- bounded depth/tilt/spotlight for pointer-capable media cards while preserving static keyboard/touch meaning;
- drag/drop and reorder behavior with clear target displacement and snap.

### Media Viewer
Explore:
- media-stage continuity from Library;
- contextual actions/disclosures that morph from their origin;
- source/result comparison that changes spatial composition coherently;
- continuation back into Create that visually preserves the media relationship where practical.

### Landing
Landing is the highest-expression surface. It may explore:
- scroll-directed composition;
- kinetic typography;
- interactive graphical objects;
- bounded pointer-responsive depth;
- canvas/WebGL/shader scenes;
- richer GSAP choreography;
- smooth-scroll treatment when it genuinely improves the accepted experience.

These techniques require a static/reduced-motion fallback and must not break native accessibility, focus, history, or content semantics.

## Technology policy
Technology follows the accepted interaction; libraries are not a checklist.

### Default application motion
**Motion for React** remains the default engine for application interactions: layout/shared geometry, springs, presence, gestures, drag, and feature-local choreography.

### Maintained mechanic sources
Prefer approved RenderLab components/primitives first, then maintained sources such as Motion Primitives, React Bits, Aceternity UI, Magic UI, and shadcn-compatible registries when they provide a suitable mechanic.

### GSAP
GSAP may be proposed when a concrete accepted prototype needs timeline-heavy, scroll-linked, SVG, or sequence choreography that would be materially clearer or more maintainable than forcing the same behavior through Motion.

A second runtime must be justified by the interaction prototype and reviewed for bundle/performance/maintenance cost. “More modern” is not sufficient justification.

### Lenis
Lenis may be proposed only for a surface whose accepted design genuinely benefits from smooth-scroll orchestration, usually the public Landing. Do not globally replace native scrolling across application workspaces and do not make essential content/functionality depend on scroll hijacking.

### Canvas / WebGL / shaders
May be proposed primarily for Landing or another explicitly approved high-expression surface. Keep the effect isolated, budgeted, lazy where appropriate, and replaceable with a static/reduced-motion fallback. Application truth and interaction must not depend on GPU decoration.

### Research/advisory sources
Watermelon UI, Kaikei.app, Taste/design-review skills, Vercel web-design guidance, `awesome-design.md`, image-to-code workflows, and Emil Kowalski interaction references are design/review inputs. They do not become runtime dependencies or product authority by being consulted.

## Reference-driven design requirement
For an expressive redesign, words alone are not enough. Build a **reference matrix** before implementation.

For each important interaction, record:
- the RenderLab user task;
- the exact external reference or internal prototype;
- what should be borrowed (for example spring character, object continuity, masking, hover depth, choreography);
- what must not be copied (brand, layout, content, proprietary identity);
- expected desktop and narrow/touch behavior;
- reduced-motion equivalent.

A task may combine different references for navigation, media transitions, drag physics, morphing, scroll behavior, and microinteraction timing. The goal is a coherent RenderLab system, not a visual clone of one site.

## Design-before-code gate
For a meaningful authorized redesign:
1. Audit the current rendered implementation and authoritative behavior contracts.
2. Identify which existing visual decisions are intentionally reopened and which product/engineering decisions remain locked.
3. Create the reference matrix.
4. Produce a complete high-fidelity visual direction for the target surface, including desktop and narrow/mobile states.
5. Write an interaction choreography describing what the user sees and feels, independent of library choice.
6. Build an interactive prototype for signature motion/physics/morphing that static frames cannot prove.
7. Obtain explicit human design approval.
8. Only then expand/merge the implementation phase contract and modify production UI.

A static Penpot/SVG frame can approve layout, typography, palette, spacing, and hierarchy. It **cannot by itself approve a kinetic interaction**.

## Kinetic approval gate
Any task claiming a signature kinetic/morphing/physics interaction must provide reviewable motion evidence before the interaction is called approved.

Acceptable evidence includes a repository-backed interactive prototype, browser-driven recording, deterministic interaction capture, or another reviewable artifact that shows the behavior over time.

The review must include:
- pointer interaction where relevant;
- keyboard behavior for interactive controls;
- touch/narrow equivalent where relevant;
- `prefers-reduced-motion` behavior;
- start, transition, and settled state;
- no clipped content or horizontal overflow;
- no fabricated product state.

Static screenshots remain required for composition and responsive fidelity, but screenshots alone do not close the kinetic gate.

## Implementation fidelity gate
After design approval, the accepted concept/prototype becomes the production visual specification for the approved slice.

Implementation must be compared against it rather than “tastefully reinterpreted” into an easier conventional UI.

Before acceptance, review at least:
- copy and information hierarchy;
- typography and spacing;
- palette, depth, borders, glow/blur treatment;
- component geometry and media framing;
- motion origin/destination, timing, spring character and settled geometry;
- desktop and narrow behavior;
- keyboard/touch/focus parity;
- reduced-motion equivalence.

Functional QA and build success cannot substitute for design-fidelity QA.

## Engineering invariants remain non-negotiable
Authorized visual ambition does not relax engineering quality.

Every implementation must continue to respect:
- existing server/client architecture boundaries;
- verified product/API/ownership/security semantics;
- `src/components/ui` primitive purity requirements;
- WCAG-oriented keyboard/focus/screen-reader behavior;
- touch reachability and no hover-only essential actions;
- `prefers-reduced-motion`;
- responsive no-overflow requirements;
- performance and dependency review;
- exact-head GitHub validation and every attached required workflow;
- configured fixture ownership and cleanup;
- explicit production deployment authorization.

If an accepted visual concept cannot meet these invariants, revise the concept or implementation architecture. Do not waive the invariant to preserve an effect.

## Performance expectations
Performance is part of interaction quality.

Prefer:
- transform/opacity/compositor-friendly animation;
- event-driven interaction over permanent high-frequency loops;
- isolated effects with bounded repaint/layout cost;
- lazy loading/code splitting for heavy public-only visual systems where appropriate;
- native scroll for ordinary application surfaces;
- one motion runtime for ordinary work.

Any second animation runtime, smooth-scroll layer, canvas/WebGL scene, continuous pointer loop, or similarly material effect requires an explicit dependency/performance rationale in the implementation contract and must degrade cleanly.

## First recommended visual R&D task
The first future application of this north star should be a **Create visual R&D prototype**, because Create is RenderLab's signature authoring surface and provides the clearest place to establish the reusable interaction language.

That task should produce an accepted concept/prototype before touching production Create code. Only after explicit approval should a Phase 23/Cycle 5 implementation contract be considered.

This recommendation does not itself create Phase 23, begin Cycle 5, or authorize implementation/deployment.
