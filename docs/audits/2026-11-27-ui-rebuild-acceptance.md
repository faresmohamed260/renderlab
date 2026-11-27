# UI rebuild acceptance - ui-rebuild (2026-11-27)

**Record only. It authorizes no production release, deployment, migration or generation spend.** Production remains as recorded in [current.json](../production/current.json).

## What happened
The owner found that the Phase 6 UI on main did not follow the approved comps. The UI was rebuilt on `ui-rebuild` against the measured comp specs (`design/spec/*.json`), with the head engineer judging rendered output against each comp and posting numbered defect lists (tracking issue #856) until each screen was accepted. The owner reviewed and approved the result on 2026-11-27 ([UI-093](../ui/UI_DECISIONS.md)).

## Judged screens (rendered, comp frames 1440x900 and 390x844)
Accepted: Landing desktop and phone, Settings desktop and phone, Admin, Library desktop and phone, Create desktop and phone (results fixture), both Create loading skeletons, phone Advanced, History and navigation sheets, and the Ctrl K command palette. Known and accepted differences from the comps are the truthful-data exceptions in UI-093.

## Test migration (tracking #881)
Unit tests (871), typecheck, lint, UI purity, docs governance and text policy pass. The mounted Playwright suite (276 tests) was migrated spec by spec; each spec keeps its behavioral guarantees (focus, keyboard, targets, contrast, overflow, account isolation) and only assertions about removed controls were replaced. Real defects found and fixed in the process include extreme-narrow reflow, account-isolation races and the Advanced Seed field target at 200% zoom.

## Not covered here
Optional lanes (axe, component review, Slow 4G, signed-out HTTP, Landing measurement) and the required protected-main checks run on the pull request into main and must pass there. Open owner items: #813, #748, #603, #625.
