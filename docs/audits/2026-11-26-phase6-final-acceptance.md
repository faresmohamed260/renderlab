# Phase 6 final acceptance — main d30572ca and polish 9591218a (2026-11-26)

> **Correction (2026-11-27):** the Create rows below that call the desktop composition acceptable, and the accepted phone deviation, were wrong. The shipped Create did not match the approved comps. UI-093 supersedes UI-092; see the [UI rebuild acceptance](2026-11-27-ui-rebuild-acceptance.md).

**Head-engineer acceptance record. It authorizes no production release, deployment, migration, generation spend or Admin control.** Production remains Batch G (`34efe0b84ac1d950581d7b371b65bbf331852e89`, [current.json](../production/current.json)). The [pre-flight checklist](2026-11-26-phase6-production-preflight.md) governs any later release.

## Source and automated evidence

| Item | Evidence |
| --- | --- |
| Final feature main | `d30572ca5ce11602cb04e64c164dc3eba0486fa7` (after #840 and #828) |
| Optional lanes dispatched on that exact SHA | Component review `45890640461`, Axe `45890644948`, Slow 4G `45890649322`, signed-out HTTP `45890653540`, Landing measurement `45890658095` — all success |
| Polish integration | #850 with #851 merged as `9591218a78321db805cdd8a9a6dc255ed3a9e8db`; exact head `4183af4179fa1f95acce4da89d28352f6a52d460` passed all 13 workflows (six required contexts plus mounted, component review, axe, Slow 4G, signed-out HTTP, Landing measurement) |
| Dropped from #851 | Sheet/dialog opacity presence animation: it put a group-opacity animation on the Library phone inspector and made the composited-contrast sample MANUAL in no-preference motion (mounted job `140173405922`, `library-phone-round3`). Sheets keep their existing spring-driven presence |
| Polish scope | Touch-safe `:hover`, shared transform-only press feedback, tabular numerals, `text-wrap`, layering tokens. No layout, spacing or colour change at rest |
| Rest-state regression check | Local production build of the polished head, Chromium: Create and History pixel-identical to the pre-polish build at four sizes; the only visible differences are Landing and Settings line rag from `text-wrap: pretty`, Admin/Library numerals, all localized |

## Local rendered review (head engineer)

Fixture app built from main and screenshotted in Chromium at 1440x900, 390x844 and at the **effective viewports of 200% zoom** (720x450 and 195x422 CSS px, device scale factor 2). This is viewport emulation, not the browser zoom control.

| Surface | Page-level horizontal overflow at 1440 / 390 / 720 / 195 | Rendered review against approved comps |
| --- | --- | --- |
| Landing | none | Desktop hero matches the Round 3 comp closely (headline, CTA, preview, chips) |
| Create | none | Desktop three-column composition acceptable; **phone deviation recorded below** |
| Library | none | Desktop rail, grid and inspector and the phone grid and chips match |
| History (in Create) | none | Overflow checked; not individually reviewed |
| Settings | none | Overflow checked; line rag change reviewed |
| Admin Observe | none | Matches the comp with truthful values and locked controls |

Surfaces marked "overflow checked" were not inspected for clipped text or focus visibility at 200% effective zoom; that remains a manual item. Mounted five-width Create acceptance (#840) covers focus restoration, targets and contrast at 195, 320, 390, 768 and 1440 in both motion modes.

## Accepted deviation: phone Create composer (UI-092)

Measured on main `d30572ca`, Image Editing mode, `/create` fixture: composer 612 px tall at 390x844; prompt top 862, Generate top 1174 (viewport 844); at 320x700 Generate top 1090; at 195x422 Generate top 1033. The Create grid scrolls (scrollHeight 1192, clientHeight 644 at 390), so both stay reachable. The approved phone comp shows a compact composer on the first screen. A CSS-only attempt (#849) collapsed the stage to about 72 px, overflowed the composer and covered Generate; it failed mounted CI and was closed. See UI-092 for the decision and the follow-up scope.

## Vercel and release gate (read-only)

Read through the head engineer's Vercel connector for team `faresmohamedsalah10-1681`: the newest deployment is the Batch G production deployment `dpl_Fn5yNhNWz7owH9tMqi5cSbs3Y4WE` (READY, source `34efe0b8`); alias `renderlab.faresuniform.uk` points at it, matching the manifest; the recorded rollback `dpl_FLynJG8JYSmFYSJJWaTs3Hg6yU5i` (source `429afee1`) is READY. No deployment exists for any commit merged after Batch G, which is consistent with the non-required GitHub status "Vercel - renderlab: Account is blocked". The reason and current account state are **not** established here; only the account owner can clear it. No release can be staged until it is cleared.

## Still open (owner or later work)

- **#813** (Activity 307 redirect): owner approval of the version-aware signed-out HTTP workflow diff.
- **Release**: not authorized; Vercel account state; the pre-flight gates.
- **Held**: #748, #603, #625.
- **Manual accessibility and contrast review rows**: four arbitrary-artwork rows and the axe incomplete nodes remain manual; nothing is suppressed.
- **Optional**: compact phone composer (UI-092); genuine browser-zoom keyboard and focus review of Settings, History and Admin.
