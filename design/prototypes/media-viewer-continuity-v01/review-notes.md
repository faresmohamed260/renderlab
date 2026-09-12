# Media Viewer Continuity v0.1 — browser review notes

## Run 1 — `34700991675`

Exact head: `3fe0a396f49a35d7fcd204d85ba9dd6a971cda67`  
Artifact: `10300352553`  
Digest: `sha256:104d04036e180d8f5745aa4978e9b566d4803ae21d2729141a3c080ab57a56f2`

### What worked

- The UI-074 compact horizontal header and Gallery Rail technical/atmospheric language read as the same RenderLab family rather than a new theme.
- Media Register comparison made Result clearly primary and Source contextual.
- The attached continuation register is a stronger direction than the current production-style boxed 304px sidebar.
- Inspection Spine was visually distinct without becoming a second application sidebar.

### What failed / required correction

1. In the default single-media state, the hidden Source frame still occupied an implicit second CSS-grid row. This created a large empty stage under Result and pushed the attached continuation register too low in the first viewport.
2. The verifier changed disclosure / comparison state and captured only 30ms later. That meant the Spine compare geometry assertion and details screenshots were reading intentional transition frames as though they were settled states.
3. The Spine prototype used single-letter visible triggers without accessible names. Compactness must not become cryptic interaction semantics.

### Refinement applied

Commit `2182195ab3a5199fb087472782597f78bf532c7c`:

- keeps hidden Source in Result's grid cell so it no longer consumes default layout space;
- moves Source to column 2 only in desktop Compare and row 2 only in narrow Compare;
- waits for the bounded transition to settle before state/fidelity assertions while preserving the separate 0/60/180/360ms temporal sequence;
- gives Spine Prompt / Details / Manage / Compare explicit accessible names.

The next exact-head browser pass must verify the corrected first-viewport hierarchy before any concept ranking is treated as review-ready.
