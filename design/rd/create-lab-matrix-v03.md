# Create Lab Matrix Kinetic R&D v0.3

**Status:** EXPERIMENTAL / USER-DIRECTION-ALIGNED / NOT APPROVED  
**Issue:** #148  
**Production authorization:** none

## Why this exists

The user rejected Instrument Continuum v0.2 because it read as premium AI/SaaS rather than the intended high-value creative product. A subsequent exploration also drifted into a new sci-fi/workstation aesthetic and was rejected.

The corrected direction is explicit:

> The approved production Lab Matrix Landing is the visual DNA. Create should use the same design pattern, then add physics, morphing, 2.5D depth, graphics and animation.

This prototype tests that statement directly. It does not invent a competing skin.

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

## Effect definitions

### 2.5D depth
Existing planes gain bounded Z hierarchy and pointer-responsive parallax. This is not literal decorative 3D objects. Depth is communicated through occlusion, displacement, perspective, edge light and different response rates.

### Physics
Manipulated media behaves like an object with mass:
- momentum on entry;
- displacement of neighboring geometry;
- spring attraction to a valid slot;
- one bounded overshoot;
- damping/settling;
- resistance rather than free-floating motion.

### Morphing
Important states preserve object identity. Image ↔ Video, Advanced closed ↔ open, authoring ↔ result reallocate the same geometry instead of swapping unrelated panels.

### Animation
Animation is part of the interaction specification:
- pointer field continuously but subtly biases depth on pointer-capable devices;
- reference insertion carries momentum then settles;
- Image ↔ Video changes plane proportions and positions;
- Advanced unfolds by borrowing area from adjacent planes;
- Generate briefly compresses/energizes the field;
- Result expands from an existing latent media plane while authoring controls settle into supporting positions.

No animation may fabricate queue progress, provider stages, ETA, completion percentage, or other product truth.

### Graphics
Registration axes, crop marks, technical labels and sparse energy lines extend the Landing's existing graphic instrumentation. They are functional cues, not a new HUD theme.

### Reduced motion
The exact same start/end layouts remain. Spatial travel, spring overshoot, looping energy and perspective response collapse to effectively instant state resolution.

## Prototype states to verify

1. Image authoring / no reference.
2. Reference enters and settles.
3. Image → Video shared-geometry morph.
4. Advanced unfolds from the instrument.
5. Generate actuation.
6. Result geometry expansion.
7. 390px equivalents.
8. Keyboard focus.
9. Reduced-motion equivalents.
10. No horizontal overflow.

## Important constraint

This prototype is design evidence only. It does not change `src/features/create`, production dependencies, routes, backend behavior, Auth, ownership, storage, generation contracts or deployment.
