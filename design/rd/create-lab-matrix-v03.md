# Create Lab Matrix Kinetic R&D v0.3

**Status:** EXPERIMENTAL / USER-DIRECTION-ALIGNED / NOT APPROVED  
**Issue:** #148  
**Production authorization:** none

## Why this exists

Instrument Continuum v0.2 was technically validated but rejected by the user because it read as premium AI/SaaS rather than the intended high-value professional creative product. A subsequent exploration also drifted into a new sci-fi/workstation aesthetic and was rejected.

The corrected direction is explicit:

> The approved production Lab Matrix Landing is the visual DNA. Create should use the same design pattern, then add physics, morphing, 2.5D depth, graphics and animation.

Animation is first-class design behavior, not after-the-fact polish. This prototype tests that statement directly and remains isolated from production `/create`.

## Authoritative references

| Create interaction | Exact reference | Borrow | Do not copy / change | Desktop pointer | 390px / touch | Keyboard / focus | Reduced motion |
|---|---|---|---|---|---|---|---|
| Overall spatial field | `src/features/landing/landing-experience.tsx` + `src/features/landing/landing-experience.module.css` | Production Lab Matrix darkness, asymmetric planes, quarter-arc geometry, grid/axes, sparse blue/orange atmosphere, grain, large type and technical metadata | Do not turn Create into a Landing page, marketing composition, decorative scene, or a competing brand skin | Bounded perspective and independent plane response around non-control field areas | Same composition without cursor dependence | Controls remain ordinary reachable semantic controls | Static endpoint composition; no pointer field |
| Image ↔ Video mode morph | `docs/ui/VISUAL_NORTH_STAR.md` + UI-015 in `docs/ui/UI_DECISIONS.md` | Transform existing geometry before replacing it; output media remains the primary explicit choice | Do not expose backend workflow taxonomy or invent a second workspace | Existing planes resize/reposition with shared spatial continuity | Same geometry reallocates within one narrow stage | Image/Video remains a radiogroup | Same start/end layouts resolve effectively immediately |
| Reference insertion | `docs/ui/VISUAL_NORTH_STAR.md` + UI-016 in `docs/ui/UI_DECISIONS.md` | Object-like entry, mass, bounded overshoot, settling, and clear reference identity | Do not fabricate upload/generation state or create a new reference semantic model | Object enters from the field edge and damps into a depth slot | Object enters into the same stack; no hover dependency | Add reference is a normal button; reference objects receive visible focus | Object appears directly in its settled slot |
| Reference reorder/removal | UI-016 + rejected historical PR #180 mechanic at `rd/create-interaction-language` / `d30da646ee2e390e1e277e9e3a7e192895fbedd2` | Stable `@imageN` aliases, pointer drag reorder, deterministic `Make primary` equivalent, removable references, motion that preserves object identity | Borrow the mechanic only. Do **not** borrow Instrument Continuum v0.2 glass/pill/card visual language; it was explicitly rejected | Drag one reference onto the other exchanges primary/secondary depth slots and settles | `Make primary` is the deterministic touch equivalent; remove remains explicit | `Make primary` and Remove are real buttons; aliases remain stable | Reorder/removal resolve directly to final order without travel/overshoot |
| Advanced disclosure | `docs/ui/VISUAL_NORTH_STAR.md` + `docs/ui/DESIGN_WORKFLOW.md` | Disclosure grows from owned geometry and reallocates surrounding space | Do not add a detached settings form or modal-like second surface | Advanced borrows width from adjacent field geometry | Reference and Advanced stay independently reachable with no overlap | Trigger owns `aria-expanded` and visible focus | Open/closed geometry resolves immediately |
| Generate actuation | Production Landing quarter-arc grammar + UI-019 in `docs/ui/UI_DECISIONS.md` | Deliberate high-importance actuator, brief compression/energy, clear response | No fake percentage, ETA, queue position, provider stage, worker state or completion | Bounded field energy reinforces one user action | Same actuator remains touch reachable | Normal button/focus semantics | No looping energy; state advances directly |
| Generation → Result continuity | `docs/ui/VISUAL_NORTH_STAR.md` + UI-019 | Media-first takeover; latent media plane becomes dominant Result while authoring controls settle into support | Do not append a generic result card or imply completion before durable Result truth | Result owns the stage after actuation | Result is first in reading/visual order; copy/actions must not collide | Result actions remain reachable after transition | Same final hierarchy with no spatial travel |

The rejected PR #180 is retained only as a mechanical research source for reference ordering accessibility. It is not visual authority and is not implementation authorization.

## Visual DNA preserved from the production Landing

- dark restrained field;
- asymmetric media planes;
- sparse electric-blue and warm-orange atmosphere;
- faint 64px grid and long registration axes;
- oversized tight typography plus tiny technical metadata;
- grain/noise;
- mixed straight, shallow-radius and quarter-arc geometry;
- media-first composition;
- shallow perspective and independent plane displacement.

## Interaction choreography

### Pointer depth
**Origin:** settled Lab Matrix field.  
**Transformation:** non-control pointer movement slightly biases the instrument and each plane according to bounded depth.  
**Response:** nearer planes move more; controls themselves cause the field to yield back toward neutral so they never become evasive.  
**Settled:** pointer exit or control targeting returns the field to neutral.  
**Interruption/reversal:** target direction may reverse continuously without restarting an entrance animation.  
**Reduced motion / touch:** no cursor field; the same Z hierarchy remains as static geometry.

### Reference insertion
**Origin:** empty reference plane or one-object stack.  
**Transformation:** the new object enters from a lateral/depth offset with momentum, crosses its slot slightly, then damps into place.  
**Response:** reference count and surrounding authoring geometry update with the object.  
**Settled:** one object occupies the primary slot; two objects form a bounded primary/secondary depth stack.  
**Interruption/reversal:** removal may occur after settle; no uncontrolled looping physics.  
**Reduced motion:** object appears directly in the final slot.

### Reference reorder/removal
**Origin:** two stable aliased reference objects.  
**Transformation:** pointer drag or `Make primary` exchanges primary/secondary slots; both objects preserve identity while depth, inset and emphasis trade places. Removal exits one object and lets the survivor settle into primary.  
**Response:** technical role labels and accessible names update to the new order while aliases do not change.  
**Settled:** primary is visually dominant; secondary remains legible and independently removable.  
**Interruption/reversal:** another reorder may reverse the exchange after settle.  
**Reduced motion:** roles/order change without travel.

### Image ↔ Video
**Origin:** current authoring geometry.  
**Transformation:** existing mode, prompt, reference, Advanced and actuator planes change proportion and position; they are not replaced by a new screen.  
**Response:** mode readout changes and Video limits the reference set to the supported one-source concept.  
**Settled:** same Create field, new output geometry.  
**Interruption/reversal:** selecting Image reverses to Image proportions.  
**Reduced motion:** proportions resolve immediately.

### Advanced
**Origin:** compact Advanced plane.  
**Transformation:** Advanced expands by borrowing field area; Generate compresses rather than being covered.  
**Response:** trigger remains spatially attached to the expanded controls.  
**Settled:** reference and Advanced planes do not collide, including at 390px.  
**Interruption/reversal:** trigger folds the plane back into compact geometry.  
**Reduced motion:** same open/closed layouts with no travel.

### Generate → Result
**Origin:** authoring field with prompt/reference context.  
**Transformation:** Generate briefly energizes the field; after the deterministic prototype delay, the latent Result plane becomes the dominant media stage and all authoring planes settle into support positions.  
**Response:** status becomes `RESULT`; no intermediate fake percentage or provider stage is shown.  
**Settled:** Result owns the primary visual stage, including at 390px; Result copy appears only in the truthful Result state.  
**Interruption/reversal:** Reset returns to authoring; Generate-again treatment is visual R&D only.  
**Reduced motion:** energy/travel collapses and Result resolves immediately to the same final hierarchy.

## Effect definitions

### 2.5D depth
Existing planes gain bounded Z hierarchy and pointer-responsive parallax. This is not decorative 3D object rendering. Depth is communicated through occlusion, displacement, perspective, edge light and different response rates.

### Object physics
References use a deliberately bounded physical vocabulary:
- momentum on entry;
- displacement and depth exchange during reorder;
- overshoot followed by damping/settling;
- stable snap targets;
- no permanent free-floating loops.

### Morphing
Important states preserve object identity. Image ↔ Video, Advanced closed ↔ open, authoring ↔ Result and reference reorder reallocate the same geometry instead of swapping unrelated panels.

### Animation
Animation is part of the interaction specification:
- pointer field subtly biases depth on pointer-capable devices;
- references enter, reorder and leave with object continuity;
- Image ↔ Video changes plane proportions and positions;
- Advanced unfolds by borrowing area from adjacent planes;
- Generate briefly compresses/energizes the field;
- Result expands from an existing latent media plane while authoring controls settle into supporting positions.

No animation may fabricate queue progress, provider stages, ETA, completion percentage, availability, authorization or other product truth.

### Graphics
Registration axes, crop marks, technical labels and sparse energy lines extend the Landing's existing graphic instrumentation. They are functional cues, not a new HUD theme.

### Reduced motion
The exact same start/end layouts remain. Spatial travel, overshoot, looping energy and perspective response collapse to effectively instant state resolution.

## Prototype states to verify

1. Image authoring / no reference.
2. First reference enters and settles.
3. Second reference enters; stable aliases remain visible.
4. Pointer reorder exchanges primary/secondary slots.
5. Keyboard/touch `Make primary` reaches the same order semantics.
6. Reference removal settles the survivor.
7. Image → Video shared-geometry morph.
8. Advanced unfolds from the instrument.
9. Generate actuation.
10. Result geometry expansion.
11. 390px equivalents.
12. Keyboard focus.
13. Reduced-motion equivalents.
14. No horizontal overflow or copy/action collisions.

## Important constraint

This prototype is design evidence only. It does not change `src/features/create`, production dependencies, routes, backend behavior, Auth, ownership, storage, generation contracts or deployment. User approval of the complete v0.3 concept + temporal interaction language is still required before any Phase 23 / Cycle 5 implementation contract may be expanded.