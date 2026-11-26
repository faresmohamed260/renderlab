# Phase 6 round 3: approved visual direction (static comps)

**Status:** owner-approved visual direction, 2026-11-25 (explicit owner approval of the Landing, Settings, Admin dashboard and phone Library comps). These are **static design comps, not implementation and not motion approval.** The repository code and `docs/ui/**` remain authoritative; a decision here becomes binding once `docs/ui/UI_DECISIONS.md` records it. The look is unchanged from round 2 (`../2026-11-25-phase6/README.md`): dark only, Violet Studio atmosphere, Apple-style translucent glass, violet accent, Inter/system type. Names, emails, job numbers and metrics are illustrative placeholders; the Admin comp is tagged "Sample data" for that reason.

## What is approved

- **Settings, desktop (`renders/settings-desktop.png`):** the primary sidebar with the profile card pinned at the bottom, a section list (Account, Security, Sessions, Create defaults, Admin operations), and glass cards for Profile, Sign-in email, Closed Beta access, Multi-factor authentication, Active sessions with "Sign out everywhere", Create defaults and an owner-only Admin link. Existing account behaviour (MFA gating of private profile details, email change keeping the same account and ownership, session list, sign-out everywhere) is unchanged; only the presentation is approved.
- **Settings, phone (`renders/settings-phone.png`):** grouped iOS-style rows under Account, Security and Create, a profile card at the top, "Sign out everywhere" as a destructive action at the end. The logo opens the navigation sidebar (same app pattern as Create).
- **Admin dashboard, desktop (`renders/admin-desktop.png`):** visible only to owner/admin accounts. Tabs: Observe (active), Limits, Access, and a muted "Control · later". Observe shows generation health: active jobs, dispatch latency (median), outbox confirmation timing, terminal reservations (with the lower-bound and unavailable/empty/zero distinctions the Observe contract defines), a dispatch-latency chart and a terminal-reservations table. **Pause generation, Cancel stuck jobs and Adjust limits are drawn locked** (dashed, lock icon) with "Not available. Needs approval". **Approving this comp does not authorize building any Admin control**: see the [pending Admin Control proposal (#772)](https://github.com/faresmohamed260/renderlab/pull/772), where every control is "Not authorized".
- **Library, phone (`renders/library-phone.png`, `renders/library-phone-inspector.png`):** header with the logo and a search button, a title with the item count, horizontally scrolling filter chips (All, Images, Videos, Favorites, Collections), a two-column grid with a selection check on each tile, and a floating glass selection toolbar (Favorite, Download, Delete). Tapping an item opens an inspector bottom sheet: preview with Compare, the prompt, shape and date, and actions Open in Create (primary), Favorite, Download, Delete. Existing Library behaviour (durable Viewer, owner-scoped media, confirmed delete, rename) is unchanged.
- **Landing (`renders/landing-desktop.png`, `renders/landing-phone.png`):** the hero only. Eyebrow "Creative image workspace", headline "Make it. Shape it. Refine it.", the existing supporting line, a primary "Open Create" call to action (Generate gradient `#6d50d1` to `#9841bd`, white text), "Invitation-only Closed Beta", a live-looking Create preview in glass, and the four capability chips. The thread and Living Library sections below the hero are **not** redrawn here and keep their current content until a later round.

## Known comp artifacts (do not copy literally)

- The desktop Settings comp clips its last card and the desktop Admin comp leaves empty space at the bottom: comps are fixed-size; the implementation scrolls and reflows.
- On phone, the Settings last rows and the Landing capability chips continue beyond the fold and scroll; the Library filter chips scroll horizontally.
- Tile colours, the Create preview image and every figure are placeholders. Admin figures must come from real server data and use the Observe contract's truthfulness rules (no invented zeros).

## Not decided here

Motion choreography; Settings sub-pages (profile, email, MFA, password, preferences); Admin Limits and Access; the Landing sections below the hero; the Library desktop inspector's secondary states; any Admin control. No production release or migration authorization is implied by this approval.

## Files

`renders/*.png` (1x) are the primary references; `html/*.html` are the same comps as plain HTML for inspection (they load Inter from Google Fonts if online).

## Admin data-truthfulness addendum (2026-11-25)

The head engineer approved the deviation in [#782](https://github.com/faresmohamed260/renderlab/pull/782): the existing Observe contract exposes recent confirmed-dispatch percentiles (15-minute window), not a 24-hour time series or separate confirmation-latency measurement, and aggregate terminal-reservation status counts, not individual reservation or job identities. Use the real percentile bars, confirmation sample count and status-count table instead of the illustrative chart and job rows; preserve unavailable, empty, measured zero and lower-bound distinctions. Do not introduce queries, endpoints, migrations or Admin controls to fill the gap.
