# Phase 23 Clear Composer implementation notes

Status: **IMPLEMENTATION CANDIDATE / VERIFICATION PENDING / NOT MERGE-APPROVED**

Tracker: #184  
Design authority: `design/rd/create-usability-first-v05.md`  
Implementation contract: `docs/ui/CREATE_CLEAR_COMPOSER_IMPLEMENTATION_CONTRACT.md`

## Candidate scope

The production Create implementation now maps the approved v0.5 Clear Composer interaction language onto the existing `CreateWorkspace` rather than introducing a parallel product path.

Implemented composition changes:

- static `Create an image` / `Create a video` context with Landing-derived technical hierarchy;
- prominent maintained Image / Video selector at the top of the composer;
- labelled `Add reference` / `Start image` control with the existing durable upload path;
- explicit `Primary image`, `Reference image`, and `Start image` roles;
- prompt remains the dominant authoring surface;
- essential model/ratio/video controls remain adjacent to Generate;
- Advanced remains inline and is now visibly labelled;
- active generation state becomes a truthful media-stage above the persistent composer;
- completed media becomes the dominant result surface with a subordinate continuation rail;
- real video playback controls and capability-derived continuation behavior are preserved;
- desktop media/result treatment uses the 64px Lab Matrix, cool/warm registration atmosphere, quarter-arc framing, precise rules, and bounded media-only depth;
- 390px treatment keeps full-width mode choice, 44px essential targets, wrapping settings, media-first result stacking, and no transformed control hierarchy;
- reduced-motion disables the new registration animation and media transform enhancement.

## Preserved product contracts

No generation API payload, reference identity, upload persistence, admission, auth/ownership, job lifecycle, result persistence, continuation capability, worker/provider, schema, or infrastructure contract is intentionally changed by this candidate.

## Verification boundary

This record does not mark the implementation accepted. The candidate still requires exact-head build/type/lint/UI-purity and affected GitHub workflows, configured Create lifecycle evidence, responsive/reduced-motion/temporal review, and human fidelity review against the approved v0.5 artifact before merge can be considered.

Production deployment remains separately unauthorized.
