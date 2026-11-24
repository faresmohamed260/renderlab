# Phase 6 approved visual direction (static comps)

**Status:** owner-approved visual direction, 2026-11-25. These are **static design comps, not implementation and not motion approval.** The repository code and `docs/ui/**` remain authoritative; a decision here only becomes binding once `docs/ui/UI_DECISIONS.md` records it (Phase 6 P6-03 task).
Images are placeholders and copy is illustrative. Sizes and colours are approximate until re-derived as tokens and contrast-checked in the revised `DESIGN_LANGUAGE_V2.md`.

## What is approved
- **Look:** dark only. "Violet Studio" atmosphere (soft violet/pink glow) plus Apple-style translucent glass panels (blur ~30px, saturate ~1.5, panel fill white ~5.5%, hairline white ~9% border), large radii (28-36px panels, 18-24px controls), violet accent (#7c6cf2 to #b05cf0) used sparingly, filled soft controls with **no outlined boxes**, Inter/system type. This **supersedes the flat-opaque-surface default** in the first `DESIGN_LANGUAGE_V2.md`.
- **Create, desktop (`renders/create-desktop.png`):** three columns. Left: **This session** results and searchable **Prompt history** (click to reuse). Centre: image stage, actions (Compare, Reuse settings, Edit this image, Favorite, Download), prompt used for the result. Right: all controls (mode, prompt, references with Select region, shape, expanded Advanced, Generate with shortcut hint). Shortcuts shown on tools: `/` prompt, `Ctrl Enter` generate, `[` `]` step through results, `Ctrl K` search actions.
- **Library, desktop (`renders/library-desktop.png`):** its own layout. Left: search, All media / Favorites / Uploads, Collections. Centre: grid with multi-select and a floating selection bar. Right: inspector (Open in Create, Reuse settings, Edit image, Favorite, Download, Delete, rename).
- **Phone app pattern:** header = app logo (opens the navigation sidebar) and a History button. The image fills the screen; one floating glass composer holds [+ references] [mode] [shape] [Advanced settings icon] [Generate]. **No bottom tab bar.**
  - `navigation-sidebar-phone.png`: Create, Library, owner-only Admin, **profile card pinned at the bottom**.
  - `advanced-sheet-phone.png`: Advanced as a bottom sheet (seed, steps, own structured prompt, reset).
  - `history-sheet-phone.png`: jobs (running with Cancel; failed with Retry/Reuse), this session, prompt history.
- **No Activity tab or route** (owner decision). Its functions (job status, Cancel, Retry, failure reason, Reuse settings) move into **History** and the **Queue** popover. Existing Activity behaviour decisions (UI-035, UI-050, UI-055) must be carried over, not lost.
- **Admin** is visible in navigation only for the owner/admin account.
- **Truthful controls only:** show only capabilities the hosted worker really supports. Reserved, hidden-until-supported slots: **image count** (multi-output) and an **Inspiration** tile in References. **Negative prompt is parked** (local Fibo 2.0 Studio test, 2026-11-25, showed no reliable effect on Edit Turbo).
- **Loading:** `*-skeleton.png`. App chrome (header, nav, composer shell) renders instantly; only content areas show a shimmer skeleton. Skeletons never imply job progress (UI-019). Reduced motion: static placeholder, no shimmer.

## Not decided here
Motion choreography and spring assignments (needs reviewable motion evidence), Landing, Settings, the Admin dashboard, and the exact Activity-replacement edge cases. Phone variants of Library are not drawn yet.

## Files
`renders/*.png` (1x) are the primary references; `html/*.html` are the same comps as plain HTML for inspection (they load Inter from Google Fonts if online).
