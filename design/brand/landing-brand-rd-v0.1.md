# Landing Brand Experience R&D 0.1 — Resolved Thread

**Status:** `EXPERIMENTAL` design candidate — human review required  
**Task:** #158  
**Source baseline:** `b55ce6757ed6c1e2a00e5ca0b5c8a562a4ae7047`  
**Production impact:** none; this artifact does not modify `/`, authorize a dependency, or authorize deployment

## Design thesis

**One idea should visibly remain the same creative object while it is created, shaped with references, put in motion, saved, and reopened.**

The current Landing is functionally sound and truthful, but its visual story is still largely a hero plus a static product-preview card, four operation cards, two explanatory cards, and a closing CTA. That makes the page read like polished SaaS documentation. This candidate deliberately reopens only that visual composition and motion language.

The proposed Landing instead behaves like one authored creative scene:
- the locked Lab Grid identity establishes the visual grammar;
- modular cells resolve into rendered media rather than becoming decorative wallpaper;
- a single representative media object persists through the core product story;
- product UI is shown as an instrument around the media rather than as a screenshot inside another card;
- typography and negative space carry the calm state;
- motion is concentrated in the hero and continuous-thread sequence rather than spread across every element.

## Locked product / engineering boundary

This design does **not** reopen:
- `/` as the public Landing and `/create` as the Create application route;
- legacy root `source` / `action` continuation redirect with query preservation;
- `Open Create` → `/create`;
- `Sign in` → `/settings`;
- invitation-only / no-public-signup truth;
- absence of pricing, testimonials, fake metrics, provider/SLA claims, or fabricated runtime state;
- application-shell ownership of application routes only;
- keyboard/focus/touch semantics, reduced motion, responsive no-overflow, or exact-head validation requirements;
- the locked Lab Grid modular `R` geometry, wordmark hierarchy, or color character;
- backend, Auth, schema, storage, generation, ownership, or deployment contracts.

## Static concept

### Hero — Ideas, rendered into reality
A quiet dark environment establishes RenderLab as a creative lab rather than a marketing template. The headline stays stable and readable while three related media planes and a small set of Lab Grid cells imply experimentation resolving into one rendered result.

The hero should feel spatial but not busy. Pointer response is bounded to the visual object; copy and CTA do not chase the pointer.

### 01 — One continuous creative thread
The current four-card operation explanation is replaced by one persistent media object and four truthful steps:
1. **Create** — start from an idea.
2. **Shape** — guide it with a durable reference.
3. **Motion** — reframe the same media into motion.
4. **Keep** — settle into durable Library media ready to reopen.

On desktop, the copy changes while the same media object transforms in place. On narrow/touch layouts, the choreography becomes a clear sequential story rather than requiring a pinned scroll scene.

### 02 — Create is the instrument
The Create product proof is integrated into the composition. Media remains dominant while a compact composer demonstrates Image / Video intent, a reference, prompt, and Generate actuator without pretending to be live generation state.

### 03 — Render + Lab
A large resolved mark explains the brand logic without repeating the logo everywhere. The module/cell idea becomes the visual rule for framing, samples, and transformations.

### Close
A simple invitation-only close: **The creative lab is open.** The page ends with the same calm confidence it began with rather than another feature grid.

## Copy candidate

The following is design copy, not yet locked production copy:
- `A creative lab for what's next`
- `Ideas, rendered into reality.`
- `Create images and video, shape them with references, and keep every result ready for the next move.`
- `Don't start over. Keep moving forward.`
- `Create is the instrument. Your media stays the focus.`
- `Experiment freely. Keep the result.`
- `The creative lab is open.`

## Interaction choreography

### Hero spatial response
**Start:** three closely stacked render planes sit near a settled composition, with three detached Lab Grid cells.  
**Pointer:** the front plane tilts only a few degrees toward the pointer; rear planes separate slightly; cells move at different bounded depths.  
**Scroll away:** the stack resolves closer to a front-facing composition rather than simply fading out.  
**Pointer leave:** all planes settle back toward neutral.  
**Reduced motion:** no pointer transform or scroll-driven transform; show the strong settled stack.

### Continuous-thread transformation
**Start / Create:** the persistent media is portrait-oriented.  
**Shape:** `@image1` resolves into the media context; the object remains the same object.  
**Motion:** the same object widens into a cinematic frame and gains restrained motion-line treatment.  
**Keep:** the frame compacts/settles and a truthful `Saved to Library · Ready to reopen` state appears.  
**Reverse scroll:** geometry and copy reverse coherently rather than jumping between independent cards.  
**Narrow/touch:** no sticky pin is required; the four states are presented sequentially with the same media identity repeated as a clear visual thread.  
**Reduced motion:** skip intermediate scroll choreography and show the resolved Keep state plus all necessary explanatory copy statically.

## Technology hypothesis

No new production dependency is approved by this concept.

The prototype intentionally uses only HTML/CSS/JavaScript so the interaction can be judged without choosing a runtime. If this direction is approved for production:
- first attempt implementation with the already-adopted Motion runtime;
- propose GSAP only if the accepted scroll choreography proves materially clearer/safer as a timeline;
- do not add Lenis unless native-scroll behavior is demonstrably insufficient for the approved feel;
- do not add WebGL merely to make the page look more expensive; a bounded GPU scene would need a separate visual and performance justification.

## Review assets

- `design/prototypes/landing-brand-rd-v0.1/index.html` — canonical responsive concept + temporal prototype source.
- The dedicated `Landing Brand R&D` workflow renders desktop, 390px, mid-story, reverse-scroll and reduced-motion evidence from that exact source.
- High-resolution desktop/mobile concept exports may be used for human review, but the repository-backed prototype source and exact-head workflow artifact are the durable evidence boundary.

Static frames may approve composition, hierarchy, palette, and copy direction only. Signature motion remains `EXPERIMENTAL` until remote temporal verification and human review are complete.

## Acceptance state

- current rendered Landing audit: complete;
- reference matrix: recorded in #158;
- reopened/locked boundary: recorded here and #158;
- desktop static concept: candidate ready for review;
- 390px static concept: candidate ready for review;
- prototype source: candidate ready for remote verification;
- temporal prototype verification: pending;
- human approval: pending;
- production implementation: **not authorized**;
- production deployment: **not authorized**.
