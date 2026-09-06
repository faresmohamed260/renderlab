# Media Viewer v0.3 — Upscale 2× checkpoint

**Status: `REVIEWED DESIGN CANDIDATE — PHASE 18E REPOSITORY-BACKED CHECKPOINT`**

This package records the Phase 18E / UI-058 desktop+narrow design checkpoint required before the visible Media Viewer Upscale action is implemented. Direct Penpot automation is not available in this session, so the checkpoint follows `docs/ui/DESIGN_WORKFLOW.md`: open repository-backed SVG candidates, repository-recorded decisions, then real GitHub/Playwright rendered validation before the surface can be marked approved.

The checkpoint extends the already-approved Viewer rather than redesigning it. `media-viewer-v0.1.svg` remains the base media-primary composition and UI-056's implemented comparison package remains authoritative whenever Compare source is open.

## Candidate files
- `media-viewer-v0.3-upscale-2x-desktop.svg` — desktop state sheet for eligible, starting and accepted states.
- `media-viewer-v0.3-upscale-2x-mobile.svg` — 390px narrow state sheet for the same three states.

## Accepted implementation direction
1. **Media remains primary.** The media stage, title/metadata, Prompt/Details and Actions hierarchy do not move merely because Upscale becomes available.
2. **Existing creative continuation keeps its priority.** `Edit` remains the primary first action and `Animate` remains the adjacent secondary action for an eligible image.
3. **Upscale is contextual and subordinate.** `Upscale 2×` uses a full-width secondary row directly beneath the existing Edit/Animate pair. It does not become a new mode, top-level destination, toolbar or destructive/media-management action.
4. **Eligibility is absence/presence, not a disabled promise.** The action is rendered only when the server derives current source/backend eligibility. Ineligible media does not show a disabled Upscale placeholder.
5. **Starting is spatially stable.** The same full-width control becomes disabled and shows a maintained Spinner with `Starting upscale…`. No result placeholder, progress percentage, ETA or media-stage mutation appears.
6. **Acceptance is not completion.** After HTTP acceptance, the source Viewer stays unchanged. The Upscale row remains locally locked as `Upscale started`, followed by concise status copy: `Upscale started. Track progress in Activity.` and a secondary `Open Activity` continuation.
7. **Errors stay local and recoverable.** A sanitized inline Alert may replace the accepted status area while restoring `Upscale 2×` for another attempt. Viewer context and source media remain intact.
8. **Narrow layout preserves the same 2 + 1 hierarchy.** Edit/Animate remain two practical touch targets on the first row; Upscale and any status/Activity continuation span the full width beneath them. Text may wrap, but controls must not clip or create horizontal overflow.
9. **UI-056 stays untouched.** `Reuse settings`, `Compare source` / `Close comparison`, Result-primary comparison geometry and contextual Source-only `Open source` behavior keep their existing ordering/ownership. This checkpoint does not redesign comparison.
10. **No new generic primitive or decorative motion.** Use the existing maintained Button, Alert and Spinner mechanics. Spinner animation honors reduced motion; no other animation is required.
11. **The browser owns no Upscale settings.** The visible action submits only the current opaque asset route identity to the existing server API. Scale, worker, model, storage and provider identity remain server-owned.

## Review notes
The desktop state sheet deliberately keeps the media stage visually dominant while enlarging the sidebar continuation slice enough to inspect button hierarchy and feedback wrapping. The narrow state sheet uses the repository's 390px review width and shows media before metadata/continuation in every state. The accepted state uses success color only as a semantic status accent rather than recoloring the whole Continue surface.

The candidate is ready for the smallest implementation and real GitHub-render validation. It is **not** an approved implementation by itself; Phase 18E becomes verified only after the real Viewer passes configured desktop+narrow interaction/render review and the affected exact-head regression matrix. Phase 18F remains separate.
