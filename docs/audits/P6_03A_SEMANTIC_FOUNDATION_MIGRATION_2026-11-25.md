# P6-03a semantic foundation migration map

Status: additive production token and motion owner; surface adoption and rendered acceptance are subsequent P6-03 work. Authority: [Design Language V2](../ui/DESIGN_LANGUAGE_V2.md) and [P6-03 contract](../ui/P6_03_SHARED_PRIMITIVES_SHELL_CONTRACT.md). The isolated P6-02a fixture stays unchanged and excluded from production.

| Input | Production owner / disposition |
| --- | --- |
| Historical design/system/v2/tokens.css role concepts | src/app/semantic-tokens.css; --rl-* namespace; corrected V2 table, imported once by globals.css. No production import of isolated design code. |
| Canvas / atmosphere | --rl-canvas and --rl-atmosphere-scene; bounded stationary gradient, opt in on approved surfaces only. Existing renderlab-background.css wash and legacy kinetic-app stay intact until shell/surface migration. |
| Glass/material | --rl-surface-panel-layered, --rl-surface-overlay-layered, --rl-material-panel/shell/overlay; opaque default if unsupported, opaque on reduced transparency/high contrast; never nest filters. Use opaque --rl-surface-overlay over arbitrary artwork. |
| Controls, state and text | --rl-surface-control/hover/pressed/disabled/selected/field-focus, --rl-text-*; --rl-border-subtle decorative only, --rl-border-boundary / --rl-border-action-selection for essential edges; focus width/offset separate. |
| Accent and feedback | --rl-gradient-primary/hover/pressed; corrected normal #6d50d1 to #9841bd, white text, decorative accent separate. Status tokens plus text/icon; no reliance on color alone. |
| Geometry/type | --rl-radius-*, --rl-space-*, --rl-type-*, --rl-leading-*, --rl-weight-*, --rl-control-*, --rl-hit-*; later wrapper adoption, no global body/legacy utility restyling in this PR. |
| Legacy globals.css @theme colors/radii, glass variables, kinetic styles; renderlab-background.css and feature CSS | Existing legacy definitions intentionally unchanged and not new semantic-role owners. Replace usages in approved scope only; retire obsolete aliases after parity, not by silently retheming every existing route. |
| Historical springs.ts; local shell/Create 220/22/1, alternate shell 430/34 and other local Motion values | src/lib/ui/spring-roles.ts exports springRoles and springOptions(role,reducedMotion). New/reworked spring consumers use shared roles, legacy interactions remain until scoped migration. |
| CSS feedback timings | --rl-duration-* and --rl-ease-out; zero-duration reduced-motion equivalents. |

The root token declarations do not themselves paint or animate any current surface. Browser contrast, material/no-filter, high-contrast, zoom and temporal acceptance on actual wrappers/shell remain unverified. CI assertions cover role ownership, corrected literals and fallback/motion contract, not rendered conformance. No production release, dependency or feature change.
