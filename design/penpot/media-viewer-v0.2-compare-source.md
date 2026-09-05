# Media Viewer v0.2 — Compare source checkpoint

**Status: `APPROVED / IMPLEMENTED / RENDER VERIFIED`**

This package records the user-approved Phase 16 / UI-056 visual direction and the final rendered implementation review. Approval was given on 2026-09-05 and design PR #100 merged this package into the Phase 16 implementation branch as `6dadc9e1976b976ab4584ce830286ba3a8baead1`. The real implementation was subsequently configured-verified and its final responsive renders were human-reviewed on 2026-09-05.

## Candidate files
- `media-viewer-v0.2-compare-source-desktop-image.svg` — Image → Image, 1440×1100.
- `media-viewer-v0.2-compare-source-desktop-video.svg` — Image → Video, 1440×1100.
- `media-viewer-v0.2-compare-source-mobile-image.svg` — Image → Image, 390px narrow full-scroll composition.
- `media-viewer-v0.2-compare-source-mobile-video.svg` — Image → Video, 390px narrow full-scroll composition.

## Candidate direction
1. **Default Viewer remains unchanged.** Compare source is progressive disclosure available only for a result whose producing owner-scoped job has a currently active durable primary `media-asset` source.
2. **Result remains primary.** On wide layouts, the active comparison gives the result visibly more area than the source (roughly 60/40 inside the comparison canvas). A restrained low-opacity accent border identifies the result without turning the two panes into a selectable-card group.
3. **Media geometry remains truthful.** Source/result media is contained at its real aspect ratio rather than stretched to equal-height panels. The Image → Image candidate uses square source/result examples; Image → Video uses a 16:9 source and result video.
4. **Narrow layouts stack without creating a second media stage.** Result is first and full-width. Source follows immediately as a compact contextual card with a truthful-aspect thumbnail, source label, and `Open source`. The existing result metadata/Continue/Actions flow stays below it and is fully visible in the review artboard.
5. **Image and video remain truthful.** Image → Image compares two stills. Image → Video keeps normal result-video controls while the source remains a still first-frame/reference image.
6. **Labels are explicit.** `RESULT`, `SOURCE`, or `RESULT VIDEO` identify the panes. The user should never need to infer which side is historical input.
7. **Source is contextual, not a second management surface.** It may expose only `Open source`, linking to the source asset's ordinary Viewer. Rename/Delete/Favorite/Collection management remains owned by that source's own Viewer.
8. **Existing result hierarchy stays intact.** Prompt/Details, Continue actions such as Edit/Animate/Reuse settings, and existing Actions remain result-owned in the established sidebar/flow.
9. **Comparison is reversible.** The refined candidate uses `Close comparison` while active. No separate route or durable comparison state is proposed.
10. **No motion is required.** A static layout change is sufficient; if implementation later adds a transition it must honor reduced-motion and cannot make source access depend on animation.
11. **No backend expansion is implied.** No schema change, source resurrection, temporary-source comparison, provider replay, or new media identity is part of this candidate.

## Render-review correction
The first candidate render exposed two design-artifact defects before implementation: desktop examples stretched media into tall portrait frames, and the narrow artboards cropped the existing Actions section. The refined files correct both problems. This correction was part of the approved design checkpoint.

A second local SVG render/inspection pass on 2026-09-05 found the refined four-case package visually coherent: media geometry is no longer distorted, the result remains clearly primary, the narrow source treatment reads as contextual rather than as a competing Viewer, and existing Actions remain visible. This quality check preceded the explicit user approval recorded above.

## Accepted checkpoint decisions
- Keep the wide result/source priority at roughly 60/40.
- Keep the compact narrow Source card immediately below the full-width Result.
- Keep `Open source` inside the contextual source pane/card.
- Keep the low-opacity result accent treatment.
- Use **Close comparison** for the active-state exit action.

## Final implementation and rendered review
The smallest Viewer extension consistent with these accepted decisions is implemented/configured-verified at exact implementation head `4d1a495a8145238e1e78756c7b09cdbaee8d8115`. Creative Iteration `33964679539` covers Image→Image plus Image→Video at desktop/narrow, keyboard activation, reduced-motion, source eligibility/privacy, `Open source`, result video controls and cleanup; the full 26-workflow affected matrix also passed.

Final artifact `9969057974` has SHA-256 `cc20206371324f0698433731294924105174943cc0176dfd4ce9264fee6e8df5`. The archive hash was independently rechecked before review. Human inspection of all four real implementation screenshots on 2026-09-05 found no design mismatch requiring code changes:
- desktop Image→Image and Image→Video keep Result visibly primary at the accepted wide proportion while Source remains secondary;
- media is contained without stretch/distortion, including the distinct image/video cases;
- narrow Image→Image and Image→Video keep a full-width Result first and a compact contextual Source card immediately below, with no horizontal clipping or overflow;
- Source exposes only `Open source`; management actions remain absent from the Source treatment;
- `Close comparison` is appropriately secondary to the primary creative continuation hierarchy while remaining clear and reachable;
- Prompt, Details, Continue and Actions remain result-owned and intact;
- the configured browser verifier separately exercised preserved result video playback controls, keyboard activation and reduced-motion behavior;
- the ordinary narrow shell's fixed chrome remains present without changing comparison ownership or hiding the required result actions in the full-page review.

The real 16D Viewer implementation therefore matches the accepted PR #100 design direction and is **render verified**. No redesign or corrective implementation change was required. Phase 16 repository/PR closure may proceed, but production deployment remains a separate explicit operation.