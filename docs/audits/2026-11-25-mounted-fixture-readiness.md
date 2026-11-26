# Mounted fixture readiness audit — 2026-11-25

Historical evidence, not a new policy or backlog. Source snapshot: `ed0abf3c02bcad6608cbb90999cb8998c41d4713`. Static review of initial navigation, interaction and geometry setup; no additional specs changed.

## Observed incidents

- Shell loading (#794): #791 mounted run 45668494080, job 139402801365, `shell-loading.spec.ts:34` compared an apparently unstyled header (8, 8, 1424, 1779.0625) to the styled header (0, 0, 1440, 74). Test-only stylesheet readiness correction passed at `b10751989e079fae651412206538e8ed635cca0f`, run 45673778840/job 139415741584. All three loading outcomes retained the original exact geometry assertion.
- Advanced anchor (#793): initial dialog visibility timeout in run 45668494080/job 139397034402. Thirty cold contexts and ten additional CPU4x contexts did not reproduce it (runs 45672342853/job 139410678308 and 45673903982/job 139416199580). Observed missing fixture responses (capabilities, history, continuation content), inert opener and pre-click displacement; no established causal mechanism. Diagnostic PR closed unmerged.

## Other candidates

All entries below are **potential, unconfirmed** risks, not observed failures. Visibility and Playwright actionability may suffice in practice; neither alone proves application hydration or stylesheet readiness.

| Mounted spec (under `tests/components/`) | Observed setup pattern | Disposition |
| --- | --- | --- |
| `create-advanced-polish.spec.ts:9–13` | Recipe navigation then immediate Advanced click; isolated I/O active but no explicit source-readiness check before activation. | Potential, unconfirmed |
| `create-characterization.spec.ts:38–41` | Recent-prompt disclosure focus/Enter immediately after navigation; capability/history checks occur later. | Potential, unconfirmed |
| `create-keyboard-shortcuts.spec.ts:9–13,123–126` | Immediate mode click or toolbar Enter after navigation, before an explicit hydration/data-ready signal. | Potential, unconfirmed |
| `create-narrow-reflow.spec.ts:68–70` | Narrow prompt/IME case immediately activates mode after navigation. The separate geometry matrix does await capabilities. | Potential, unconfirmed |
| `library-inspector.spec.ts:5–14,46–50` | Panel or card geometry read following visibility/content checks, without an explicit stylesheet/font-readiness check. | Potential, unconfirmed |
| `library-actions.spec.ts:25–28,62–64,96–98` | Collection or selection keyboard activation immediately after navigation or a heading visibility check. | Potential, unconfirmed |
| `shell-navigation.spec.ts:15–25` | Account disclosure activation after navigation and static navigation assertions, without a distinct hydration-ready signal. | Potential, unconfirmed |
| `activity-characterization.spec.ts:76–78,116–117` | Cancel or Retry activation immediately after navigation. | Potential, unconfirmed |

If a candidate reproduces a failure, preserve its original assertions and timeout, identify the missing readiness condition with evidence, and correct setup only where justified. Do not insert blanket sleeps, forced clicks, retries or blanket readiness gates. No recommendation here authorizes altering other specs.
