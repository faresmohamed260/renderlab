# Phase 28 Admin Operations Register v0.1 — render review

This note belongs to design R&D only. It is not production authority.

## Baseline comparison

Current configured Admin baseline: Account/Admin Operations run `34768896750`, artifact `10321451087` (`sha256:5cc3f27623356e874c865112d50a708ffc0ba4dd70f2c87f336cd5a8f8565c3f`).

Initial Operations Register render: run `34770577431`, artifact `10321812550` (`sha256:cc2f487024bba86fa56372c87a45a1489ab883156a6470c3fba234be282e72bd`). Automated evidence reported desktop full-page height `2428px` and 390px height `4431px`, with no horizontal overflow; reduced-motion 390px settled to the same `4431px` static composition.

Human review of that initial render found the intended structural improvement: desktop reads as one operator field instead of repeated rounded cards, global generation defaults visibly dominate overrides, Health reads as one bounded matrix/register, and the 390px reading path is materially less repetitive than the current baseline while retaining all controls.

## Corrective note

The first prototype shell approximated the RenderLab mark with CSS geometry. That is not allowed under locked UI-072 identity authority. Commit `e1b95bfa0a9265da2d78b7bfd2f207decfa01738` replaces the approximation with the checked-in production asset `public/renderlab-mark-white.svg`. The Admin redesign does not reopen brand geometry.

A fresh focused render after this correction is required before v0.1 is presented for user approval.
