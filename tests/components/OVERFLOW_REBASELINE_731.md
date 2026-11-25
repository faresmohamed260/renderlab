# One-time faithful stylesheet overflow re-baseline — PR #731

Owner explicitly approved this one-time correction after discovering the old fixture compiled incomplete utility CSS. Source: [mounted run 45547940870 job 138981933721](https://github.com/faresmohamed260/renderlab/actions/runs/45547940870/job/138981933721), head 58b156a059d17e91306cd83c03365523d0bde07e. All 48 states emitted geometry; 320 and 390 had zero entries in every state. The old baseline blob is f6377a92fee4c990abbf0babcb30636e93a8f295; replacement 074daad949749ba4cdbcd8b6e0703d7fc6dc6f4e. 195px control hit, keyboard and visibility checks were not relaxed. The 1440 run failed the request guard after the geometry measurements; exact fixture-owned content reads are now served and the unmodified geometry equality assertion must pass again. Zero means the unchanged geometry collector did not measure an overflow entry in that state, not a hidden/removed selector exemption. Prior canvas/stage entries disappeared under the real utility build; the measured Create panel geometry is separately gated. No selector exclusions or blanket I/O allowances. The workflow exception is limited to PR 731 and this exact old/new blob pair; every future PR uses the shrink-only check. Final exact-head measurements must agree before merge.

| Width | State | Selector / kind | Old → new px | Classification | Fix owner |
|---|---|---|---:|---|---|
| 195 | empty/edit | `.preview-navigation-shell` / scroll | 0 → 36 | newly visible | Worker 2 |
| 195 | empty/edit | `input#create-preview-steps` / range-box | 0 → 1 | newly visible | Worker 3 |
| 195 | empty/generate | `.preview-navigation-shell` / scroll | 0 → 36 | newly visible | Worker 2 |
| 195 | empty/generate | `input#create-preview-steps` / range-box | 0 → 1 | newly visible | Worker 3 |
| 195 | empty/recents | `.preview-navigation-shell` / scroll | 0 → 36 | newly visible | Worker 2 |
| 195 | empty/recents | `input#create-preview-steps` / range-box | 0 → 1 | newly visible | Worker 3 |
| 195 | empty/advanced | `.preview-navigation-shell` / scroll | 0 → 36 | newly visible | Worker 2 |
| 195 | empty/advanced | `input#create-preview-steps` / range-box | 0 → 1 | newly visible | Worker 3 |
| 195 | populated/edit | `.preview-navigation-shell` / scroll | 0 → 36 | newly visible | Worker 2 |
| 195 | populated/edit | `input#create-preview-steps` / range-box | 0 → 1 | newly visible | Worker 3 |
| 195 | populated/generate | `.preview-navigation-shell` / scroll | 0 → 36 | newly visible | Worker 2 |
| 195 | populated/generate | `input#create-preview-steps` / range-box | 0 → 1 | newly visible | Worker 3 |
| 195 | populated/recents | `.preview-navigation-shell` / scroll | 0 → 36 | newly visible | Worker 2 |
| 195 | populated/recents | `input#create-preview-steps` / range-box | 0 → 1 | newly visible | Worker 3 |
| 195 | populated/advanced | `.preview-navigation-shell` / scroll | 0 → 36 | newly visible | Worker 2 |
| 195 | populated/advanced | `input#create-preview-steps` / range-box | 0 → 1 | newly visible | Worker 3 |
| 195 | populated-auto-vgl/edit | `.preview-navigation-shell` / scroll | 0 → 36 | newly visible | Worker 2 |
| 195 | populated-auto-vgl/edit | `input#create-preview-steps` / range-box | 0 → 1 | newly visible | Worker 3 |
| 195 | populated-auto-vgl/generate | `.preview-navigation-shell` / scroll | 0 → 36 | newly visible | Worker 2 |
| 195 | populated-auto-vgl/generate | `input#create-preview-steps` / range-box | 0 → 1 | newly visible | Worker 3 |
| 195 | populated-auto-vgl/recents | `.preview-navigation-shell` / scroll | 0 → 36 | newly visible | Worker 2 |
| 195 | populated-auto-vgl/recents | `input#create-preview-steps` / range-box | 0 → 1 | newly visible | Worker 3 |
| 195 | populated-auto-vgl/advanced | `.preview-navigation-shell` / scroll | 0 → 36 | newly visible | Worker 2 |
| 195 | populated-auto-vgl/advanced | `input#create-preview-steps` / range-box | 0 → 1 | newly visible | Worker 3 |
| 1440 | empty/edit | `.create-preview-canvas-upload` / scroll | 3 → 0 | changed (measured zero) | Worker 2 |
| 1440 | empty/edit | `.create-preview-stage-surface` / scroll | 3 → 0 | changed (measured zero) | Worker 2 |
| 1440 | empty/edit | `button[aria-label="Choose reference 2 image"]` / scroll | 0 → 5 | newly visible | Worker 2 |
| 1440 | empty/edit | `button[aria-label="Choose reference 3 image"]` / scroll | 0 → 5 | newly visible | Worker 2 |
| 1440 | empty/edit | `button[aria-label="Choose reference 4 image"]` / scroll | 0 → 5 | newly visible | Worker 2 |
| 1440 | empty/generate | `.create-preview-stage-surface` / scroll | 38 → 0 | changed (measured zero) | Worker 2 |
| 1440 | empty/generate | `button[aria-label="Inspiration unavailable"]` / scroll | 2 → 7 | changed | Worker 2 |
| 1440 | empty/recents | `.create-preview-stage-surface` / scroll | 38 → 0 | changed (measured zero) | Worker 2 |
| 1440 | empty/recents | `button[aria-label="Inspiration unavailable"]` / scroll | 2 → 7 | changed | Worker 2 |
| 1440 | empty/advanced | `.create-preview-stage-surface` / scroll | 38 → 0 | changed (measured zero) | Worker 2 |
| 1440 | empty/advanced | `button[aria-label="Inspiration unavailable"]` / scroll | 2 → 7 | changed | Worker 2 |
| 1440 | populated/edit | `.create-preview-canvas-upload` / scroll | 3 → 0 | changed (measured zero) | Worker 2 |
| 1440 | populated/edit | `.create-preview-stage-surface` / scroll | 3 → 0 | changed (measured zero) | Worker 2 |
| 1440 | populated/edit | `button[aria-label="Choose reference 2 image"]` / scroll | 0 → 5 | newly visible | Worker 2 |
| 1440 | populated/edit | `button[aria-label="Choose reference 3 image"]` / scroll | 0 → 5 | newly visible | Worker 2 |
| 1440 | populated/edit | `button[aria-label="Choose reference 4 image"]` / scroll | 0 → 5 | newly visible | Worker 2 |
| 1440 | populated/generate | `.create-preview-stage-surface` / scroll | 38 → 0 | changed (measured zero) | Worker 2 |
| 1440 | populated/generate | `button[aria-label="Inspiration unavailable"]` / scroll | 2 → 7 | changed | Worker 2 |
| 1440 | populated/recents | `.create-preview-stage-surface` / scroll | 38 → 0 | changed (measured zero) | Worker 2 |
| 1440 | populated/recents | `button[aria-label="Inspiration unavailable"]` / scroll | 2 → 7 | changed | Worker 2 |
| 1440 | populated/advanced | `.create-preview-stage-surface` / scroll | 38 → 0 | changed (measured zero) | Worker 2 |
| 1440 | populated/advanced | `button[aria-label="Inspiration unavailable"]` / scroll | 2 → 7 | changed | Worker 2 |
| 1440 | populated-auto-vgl/edit | `.create-preview-canvas-upload` / scroll | 3 → 0 | changed (measured zero) | Worker 2 |
| 1440 | populated-auto-vgl/edit | `.create-preview-stage-surface` / scroll | 3 → 0 | changed (measured zero) | Worker 2 |
| 1440 | populated-auto-vgl/edit | `button[aria-label="Choose reference 2 image"]` / scroll | 0 → 5 | newly visible | Worker 2 |
| 1440 | populated-auto-vgl/edit | `button[aria-label="Choose reference 3 image"]` / scroll | 0 → 5 | newly visible | Worker 2 |
| 1440 | populated-auto-vgl/edit | `button[aria-label="Choose reference 4 image"]` / scroll | 0 → 5 | newly visible | Worker 2 |
| 1440 | populated-auto-vgl/generate | `.create-preview-stage-surface` / scroll | 38 → 0 | changed (measured zero) | Worker 2 |
| 1440 | populated-auto-vgl/generate | `button[aria-label="Inspiration unavailable"]` / scroll | 2 → 7 | changed | Worker 2 |
| 1440 | populated-auto-vgl/recents | `.create-preview-stage-surface` / scroll | 38 → 0 | changed (measured zero) | Worker 2 |
| 1440 | populated-auto-vgl/recents | `button[aria-label="Inspiration unavailable"]` / scroll | 2 → 7 | changed | Worker 2 |
| 1440 | populated-auto-vgl/advanced | `.create-preview-stage-surface` / scroll | 38 → 0 | changed (measured zero) | Worker 2 |
| 1440 | populated-auto-vgl/advanced | `button[aria-label="Inspiration unavailable"]` / scroll | 2 → 7 | changed | Worker 2 |
