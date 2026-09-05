# Media Viewer v0.2 — Compare source checkpoint

**Status: `EXPERIMENTAL / REVIEW REQUIRED / NOT IMPLEMENTATION PERMISSION`**

This package exists only to satisfy the Phase 16 / UI-056 visual checkpoint before any Viewer comparison code is written. It does not change the approved Media Viewer, does not authorize implementation, and does not make the candidate `APPROVED`.

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
The first candidate render exposed two design-artifact defects before implementation: desktop examples stretched media into tall portrait frames, and the narrow artboards cropped the existing Actions section. The refined files correct both problems. This correction is design-only evidence, not approval of the feature.

## Review questions
The checkpoint should explicitly decide these before implementation:

- Is the wide result/source priority strong enough at roughly 60/40, or should the result take more space?
- On narrow screens, should the compact Source card remain immediately below Result as shown, or move below result metadata/Details?
- Is `Open source` useful inside the contextual source card/pane, or should source navigation remain outside the comparison surface?
- Does the low-opacity result accent border communicate primary status without reading as a selected-card state?
- Is **Close comparison** the clearest active-state wording?

## Acceptance boundary
If this direction is accepted, record the accepted decisions in repository UI documentation before implementation. Then implement the smallest Viewer extension and verify image→image plus image→video at desktop/narrow, keyboard navigation and reduced-motion. Until that happens, UI-056 / Phase 16D remains `DESIGN CHECKPOINT PENDING`.
