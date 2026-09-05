# Media Viewer v0.2 — Compare source checkpoint

**Status: `EXPERIMENTAL / REVIEW REQUIRED / NOT IMPLEMENTATION PERMISSION`**

This package exists only to satisfy the Phase 16 / UI-056 visual checkpoint before any Viewer comparison code is written. It does not change the approved Media Viewer, does not authorize implementation, and does not make the candidate `APPROVED`.

## Candidate files
- `media-viewer-v0.2-compare-source-desktop-image.svg` — Image → Image, 1440×1100.
- `media-viewer-v0.2-compare-source-desktop-video.svg` — Image → Video, 1440×1100.
- `media-viewer-v0.2-compare-source-mobile-image.svg` — Image → Image, 390px narrow.
- `media-viewer-v0.2-compare-source-mobile-video.svg` — Image → Video, 390px narrow.

## Candidate direction
1. **Default Viewer remains unchanged.** Compare source is progressive disclosure available only for a result whose producing owner-scoped job has a currently active durable primary `media-asset` source.
2. **Result remains primary.** On wide layouts, the active comparison gives the result visibly more area than the source (roughly 60/40 inside the comparison canvas) and uses a restrained accent border only around the result pane.
3. **Narrow layouts stack instead of squeezing.** Result is first and full-width; Source follows as a shorter contextual pane. Two cramped side-by-side mobile panes are explicitly rejected.
4. **Image and video remain truthful.** Image → Image compares two stills. Image → Video keeps normal result-video controls while the source remains a still first-frame/reference image.
5. **Labels are explicit.** `RESULT`, `SOURCE`, or `RESULT VIDEO` identify the panes. The user should never need to infer which side is historical input.
6. **Source is contextual, not a second management surface.** It may expose only `Open source`, linking to the source asset's ordinary Viewer. Rename/Delete/Favorite/Collection management remains owned by that source's own Viewer.
7. **Existing result hierarchy stays intact.** Prompt/Details, Continue actions such as Edit/Animate/Reuse settings, and existing Actions remain result-owned in the established sidebar/flow.
8. **Comparison is reversible.** The candidate uses `Hide source` while active. No separate route or durable comparison state is proposed.
9. **No motion is required.** A static layout change is sufficient; if implementation later adds a transition it must honor reduced-motion and cannot make source access depend on animation.
10. **No backend expansion is implied.** No schema change, source resurrection, temporary-source comparison, provider replay, or new media identity is part of this candidate.

## Review questions
The checkpoint should explicitly decide these before implementation:

- Is the wide result/source priority strong enough, or should the result take more than the current ~60%?
- Is **Hide source** the clearest active-state wording, or should it be **Close comparison**?
- On narrow screens, should Source remain immediately below Result as shown, or move below result metadata/Details?
- Is `Open source` useful in the comparison pane, or should source navigation remain outside the compare canvas?
- Does the result-side accent border communicate primary status without making comparison feel like a selected-card UI?

## Acceptance boundary
If this direction is accepted, record the accepted decisions in repository UI documentation before implementation. Then implement the smallest Viewer extension and verify image→image plus image→video at desktop/narrow, keyboard navigation and reduced-motion. Until that happens, UI-056 / Phase 16D remains `DESIGN CHECKPOINT PENDING`.
