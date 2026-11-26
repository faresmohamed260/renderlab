# UI rebuild brief — implement the approved design (branch `ui-rebuild`)

**Status:** active working brief, 2026-11-26. Owner decision: the shipped UI does not follow the approved design. The whole UI is rebuilt to the approved comps on the integration branch `ui-rebuild`. Nothing from this branch returns to `main` until the owner has reviewed and approved the result.

## The one rule
**The approved comps are the specification.** Do not invent, simplify, restyle or "improve" anything. Do not redesign any component: if something in the comp cannot be built truthfully, or you believe the comp is wrong, STOP on that element and report it on the tracking issue; the owner decides. Any visual deviation from the comp is a defect.

## Where the design is (read these, in this order)
1. `design/approved/2026-11-25-phase6/README.md` and `design/approved/2026-11-25-phase6-round3/README.md` — what is approved, the look, the truthful-controls rules.
2. **`design/spec/<name>.json` — the measured spec of each comp** (every visible element: text, x/y/width/height in the comp's own pixel frame, font, color, background, radius, border, shadow, backdrop blur, layout). Build against these numbers. The frame is 1440x900 for desktop comps and 390x844 for phone comps.
3. `design/approved/.../html/<name>.html` — the comp markup and CSS values. `design/approved/.../renders/<name>.png` — the picture (open it if your tools can).
4. `docs/ui/DESIGN_LANGUAGE_V2.md` (token authority), `docs/ui/UI_SYSTEM.md`, `docs/ui/COMPONENT_CATALOG.md`, `docs/ui/UI_DECISIONS.md`.

| Screen | Comp (render / spec / html name) |
| --- | --- |
| Create, desktop | `create-desktop` |
| Create, phone | `create-phone` |
| Create loading | `create-desktop-skeleton`, `create-phone-skeleton` |
| Phone Advanced sheet | `advanced-sheet-phone` |
| Phone History sheet | `history-sheet-phone` |
| Phone navigation sidebar | `navigation-sidebar-phone` |
| Library, desktop | `library-desktop` |
| Library, phone and inspector | `library-phone`, `library-phone-inspector` (round 3) |
| Settings | `settings-desktop`, `settings-phone` (round 3) |
| Admin | `admin-desktop` (round 3; read-only Observe, locked controls) |
| Landing | `landing-desktop`, `landing-phone` (round 3; hero only) |

## The approved look (from the README, applies everywhere)
Dark only. "Violet Studio" atmosphere (soft violet and pink radial glow on near-black `#07060b`). Apple-style translucent **glass** panels: fill white about 5.5%, hairline white about 9% border, backdrop blur about 30px with saturate about 1.5, radii 28-36px on panels and 18-24px on controls. Violet accent `#7c6cf2` to `#b05cf0`, used sparingly; Generate gradient `#6d50d1` to `#9841bd` with white text. **Filled soft controls, no outlined boxes.** Inter. The current flat dark panels, outlined tiles and dropdowns are wrong. Use existing semantic tokens (`--rl-*`) wherever one matches; add a token (in `src/app/semantic-tokens.css`, documented in `docs/ui/UI_SYSTEM.md`) rather than hard-coding a repeated value.

## Owner decisions that apply to everything
- No Activity tab or route link in navigation (the page may still exist; do not link it). Job status, Cancel, Retry, failure reason and Reuse settings live in History and the Queue popover.
- **Header "Search actions Ctrl K": build it fully** (a real command palette). Shortcuts are shown inline as hints (`/` prompt, `Ctrl Enter` generate, `[` `]` step through results, `Ctrl K` search actions); there is no separate "Shortcuts" popover.
- **Negative prompt: removed.** Image-count (multi-output) and Inspiration are **hidden** until the backend supports them (multi-output is being planned separately; do not show a placeholder).
- Truthful controls only: show only what the hosted worker really supports. Keep every existing capability and behavior (mask editor via "Select region", reference mentions `@image1`, drag and drop, hosted capability gating, queue, History state, auth and ownership rules). Presentation and composition change; product behavior, routes, API, data and security contracts do not.
- Any component redesign needs the owner's approval. The comps are the approval; anything beyond them is not.

## Working rules (owner instruction: finish the UI first, then verify)
- **Branch:** all work lands on `ui-rebuild` (create your own branches `rebuild/<role>-<n>` and open pull requests targeting `ui-rebuild`; the UI Lead merges them within minutes). Never target `main`. Never touch production, deployments, workflows, migrations, secrets or settings.
- **No tests, no checks (owner decision):** do not write, run, fix, migrate, skip-mark or delete any test or check, and do not wait for CI. Failing tests and failing optional checks on this branch are expected and are ignored. Nothing is deleted. A separate pass after UI approval migrates the tests.
- **One thing must stay true:** the application must keep compiling (TypeScript and `next build`), because the judge builds the branch to look at it. If the `quality` job on your PR reports a type or lint error in code you wrote, fix it; ignore everything else.
- Compose from approved primitives in `src/components/ui`; no new dependencies without the head engineer's approval (the command palette may use `cmdk`/shadcn Command: pre-approved). No raw native visible controls in `src/features` or `src/components/shell`.
- **File ownership prevents overwrites** (the connector writes whole files). Edit only files in your role's list. If you need a change in another role's file, ask on the tracking issue and wait for that role to make it. The shared monolith `src/features/create/create-preview-workspace.tsx` is edited by the Composer and Create Stage roles in separate regions only; rebase on `ui-rebuild` before every push.
- Keep PRs small and frequent. Say in each PR which comp element (spec path and index) each change implements.

## The judge loop (how work is accepted)
1. You build. Before you post "ready", **self-audit**: go through the spec JSON for your screen element by element (text, order, x/y/size within a few pixels, radius, fill alpha, blur, font weight and size, color) and tick each against your code. Put the audit as a table in the PR: spec element, file and line that implements it, status. Re-read it once more after the last push: **check and recheck until it is correct.**
2. Post on the tracking issue: `READY <role> <screen> <head SHA>`.
3. The judge (Claude) builds that SHA, loads the real page at the comp's frame, screenshots it next to the comp, and compares measured geometry and styles against the spec. The judge replies on the tracking issue with a numbered defect list (what the comp says, what is built, where). Fix **every** item, recheck, and post `READY` again with the new SHA. A screen is accepted only when the judge posts `ACCEPTED <screen>`.
4. When every screen is accepted the judge hands the branch to the owner for review. Only after owner approval do tests get migrated and the branch go to `main`.

## Roles and file ownership
- **UI Lead (Foundation and Shell):** integrates `ui-rebuild`; global tokens, atmosphere and glass material; desktop and phone header; account menu; phone navigation sidebar; command palette (Ctrl K); loading skeleton shells. Files: `src/components/shell/**`, `src/app/semantic-tokens.css`, `src/app/globals.css`, `src/app/renderlab-background.css` (shell and atmosphere regions), new palette files, loading components.
- **Create Rail and Stage:** the left rail (This session list with thumbnails, times and counts; Prompt history with search), the center stage (image stage, action row Compare / Reuse settings / Edit this image / Favorite / Download / counter, "Prompt for this result" card), phone full-screen stage with its action cluster and pager, phone History sheet. Files: `src/features/create/history/**`, `src/features/create/create-preview-stage.tsx`, `src/features/create/create-result-*`, new rail and stage files and CSS modules.
- **Create Composer:** the right column and the phone floating composer: mode toggle, prompt (with `/` hint), References row and Select region, Shape chips, Advanced (expanded block on desktop, bottom sheet on phone), Generate with shortcut hint; the same prompt box position in both modes. Files: the composer region of `create-preview-workspace.tsx`, `create-advanced-panel.tsx`, `create-phone-composer.module.css`, new composer files and CSS modules.
- **Surfaces (Library, Settings, Admin, Landing):** audit each against its comp and spec and fix every deviation: Library desktop, phone, inspector, Viewer; Settings desktop and phone; Admin Observe; Landing hero desktop and phone. Files under `src/features/library/**`, `src/features/account/**`, `src/features/admin/**`, `src/features/landing/**` and their CSS.

## Tracking
One GitHub issue, "UI rebuild: judge's defect log", is the single channel between the judge and the workers. Read it every time before you start work and before you post READY.
