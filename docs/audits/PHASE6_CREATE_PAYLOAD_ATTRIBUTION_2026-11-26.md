# Phase 6 — Create production-build payload attribution (2026-11-26)

Historical diagnostic follow-up to #827; proposal only. No product, budget, workflow, dependency or provider change. The measurements below are production-build signed-out HTTP entity bytes, not live production traffic or lab Resource Timing transfer bytes.

## Measured chunk delta

The merged #801 attribution harness reports emitted route graphs, manifest reference associations and marker strings. Compare its historical matched baseline `04cdad4ad0393c5ca337359343dafd26472e6962` ([job 139473863867](https://github.com/faresmohamed260/renderlab/actions/jobs/139473863867)) to integrated main `99699e3d09b90e2c48ab24347c1640ce27c785c4` ([run 45714573733/job 139557229850](https://github.com/faresmohamed260/renderlab/actions/runs/45714573733/job/139557229850)). Each job emitted two matching route graph sets on its SHA.

| Route | Baseline JS wire B | Integrated JS wire B | Delta B |
| --- | ---: | ---: | ---: |
| Create | 339915 | 345932 | +6017 |
| Library | 315738 | 315738 | 0 |
| Landing | 284859 | 284856 | -3 |

Create still has 17 JS resources. Fifteen filenames and wire/raw byte counts are identical; the complete delta is in two replacement chunks. Matching by manifest associations and unchanged marker set, not arbitrary hash similarity:

| Baseline chunk | Integrated chunk | Wire before → after | Delta wire B | Raw before → after |
| --- | --- | ---: | ---: | ---: |
| 29jzauys6ar_o.js | 0wn43lsf0ryby.js | 4656 → 5630 | +974 | 12310 → 16299 |
| 1i74b2lxj22rx.js | 1z1gkacaj143r.js | 38002 → 43045 | +5043 | 123192 → 140930 |
| Remaining 15 | Identical | 297257 → 297257 | 0 | identical |
| Total | | 339915 → 345932 | +6017 | |

Both replacement chunks are associated with `src/features/create/create-preview-workspace.tsx` and `src/features/create/create-workspace.tsx` by the generated client manifest; the larger has the unchanged strings “Create with FIBO”, “Loading mask editor”, “Edit source mask”, “Invalid batch size.” The smaller has no configured marker hits. Associations do not prove individual module membership or compressed byte contributions. React/Next runtime chunks 71681 and 44294 B are byte-count unchanged; shared-chunk decision stays closed.

The later #801 exact-head HTTP [job 139537477277](https://github.com/faresmohamed260/renderlab/actions/jobs/139537477277) already reported Create 345665 and 345932 B in its two graph sets: same +974 B small chunk; large replacement 42778 or 43045 B. #760 exact-head [job 139541072543](https://github.com/faresmohamed260/renderlab/actions/jobs/139541072543) reports 345932 B twice. Therefore the +6017 B does not originate in the subsequent integrated-main run, nor is there evidence of a further JS increase from the #760 CSS-only correction relative to the already observed 345932 B graph.

## Source attribution and approved feature justification

The baseline candidate and integrated commit diverge from common ancestor `29498e27d4a3dabc507b7d3c79846bb8d9af2de4`; do not use a three-dot diff as a direct file comparison. Read both exact recursive trees (not truncated) and the merged PR file lists. Create preview workspace, preview stage, History modules, Create loading and route-loading wrapper blobs differ; the alternative create-workspace.tsx blob is identical on both. The following identifies changed sources that can account for Create bundle growth, not a fictitious exact compressed-byte split per PR.

| Merged PR / integration | Changed relevant files | Justification and attribution boundary |
| --- | --- | --- |
| [#740](https://github.com/faresmohamed260/renderlab/pull/740) / `0d83c87a981c6d9e4397069810083731872724a4` | create-preview-workspace.tsx; history/create-history-panel.tsx, history-contract.ts, history-job-actions.ts, history-state.ts, history-transport.ts, use-create-history.ts; Create route and desktop CSS; server-only history action/projection files | Client History parity is a direct Create-side growth candidate: approved session and prompt history, Cancel/Retry/Reuse and owner-scoped lifecycle replacement. Do not assign server-only files to browser bytes without evidence. |
| [#746](https://github.com/faresmohamed260/renderlab/pull/746) / `71afa2bf09bbb28f92882970dea1d0b5a59a4728` | create-preview-workspace.tsx, renderlab-background.css | Direct client candidate: phone mode/reference target geometry, justified by accessibility and approved composer. CSS changes are not automatically JS bytes. |
| [#797](https://github.com/faresmohamed260/renderlab/pull/797) / `f1b5b38f6dc276db1bde131d0520d6761136b396` | create-preview-stage.tsx, create-preview-workspace.tsx, create-result-pager.module.css | Direct client candidate: truthful selected-result index and phone pager, approved result browsing; preserves actual selection semantics. |
| [#759](https://github.com/faresmohamed260/renderlab/pull/759) / `01058449a0b2c82edd5bfeb8927107dd794f3e19` | create-loading.tsx, route-loading.tsx, renderlab-background.css | Create content skeleton and truthful bounded loading, explicitly approved skeleton comp and UI-090. Client/route boundary contribution is unquantified. |
| [#805](https://github.com/faresmohamed260/renderlab/pull/805) via [#824](https://github.com/faresmohamed260/renderlab/pull/824) / `ec48b1760de0f65e93486bd3cf5f9c37c6e3ed54` | route-loading.tsx/.module.css, Library route and Library loading files | Approved Library skeleton; shared wrapper changed, possible indirect Create contribution, not proven. Library route JS total is unchanged. |
| [#760](https://github.com/faresmohamed260/renderlab/pull/760) / `99699e3d09b90e2c48ab24347c1640ce27c785c4` | renderlab-background.css, shrink-only test baseline | Approved reference tile reflow; CSS-only product change, same maximum Create wire payload already recorded by #801. |
| #801, #802, #803, #789, #811; docs slices of #824 | test/tooling/docs only | No product JS source delta attributable to these slices. |

Exact older HTTP runs for #740 (45692073915/job 139479833731), #746 (45696176605/job 139494034441), #797 (45700897528/job 139510388111), #759 (45705370426/job 139525845634), and #824 (45706731520/job 139530513970) predate the emitted PRODUCTION_ROUTE_GRAPH tooling and contain no comparable chunk graph. The available tooling cannot separate gzip contributions for multiple edits sharing a chunk; no source maps or instrumentation were authorized. No isolated per-PR byte claim is justified. These source contributions are consistent with approved comp features, but a specific PR's byte cost is unmeasured.

## Proposal for owner decision — not applied

Retain approved History parity, target geometry, pager and skeletons. Do not revert, defer, alter budgets or reopen shared-runtime optimization on this evidence. If the owner needs an exact per-PR marginal estimate, authorize a matched, credential-free retrospective production-build experiment on each historical merge tree with the same #801 measurement harness and identical build/runtime settings (no deploy). Report sequential deltas, not per-module gzip sizes; compression and chunk repartition make them order-dependent. Until then the defensible measured attribution is +974 B and +5043 B across the two Create-associated replacement chunks, with contributing source paths above.

Fresh final-main ledger remains a separate exact-head measurement; do not substitute these historical figures for a later merge wave.
