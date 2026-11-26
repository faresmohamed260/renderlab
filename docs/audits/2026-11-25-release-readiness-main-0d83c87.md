# Phase 6 release-readiness supplement — main 0d83c87

**2026-11-25 — NOT AUTHORIZED.** Historical source inventory, not a release decision or provider read-back. Candidate `0d83c87a981c6d9e4397069810083731872724a4`; recorded Batch G `34efe0b84ac1d950581d7b371b65bbf331852e89`. GitHub compare reports 50 commits and 266 changed paths (below the 300-file compare limit). This supplements the [earlier 33-commit inventory](2026-11-25-release-readiness-main-2fd33e7.md), which retains the detailed pre-2fd33e7 change list and release gates.

## Incremental runtime inventory

| Main change | Runtime impact |
|---|---|
| #768 (764,726) | Create phone composition and auth-safe loading; Activity/Create route boundaries and fallback. |
| #767 | Advanced Sheet teardown and focus restoration; no payload change. |
| #776 (734,752) | Library desktop grid/inspector; contrast/review tooling. |
| #778 (774,769,775) | Menu focus correction and responsive/runtime polish; review the affected shared controls. |
| #787 (724,765) | Phone sidebar, focus/overlay behavior, Create shortcut activation through existing form. |
| #791 | Stable placeholder review; test evidence, not a new generation path. |
| #792 (781,782) | Round 3 Landing hero and Admin Observe data-truthful presentation. |
| #733 | Create desktop three-column composition. |
| #796 (794,795) | Shell-loading setup and mounted-fixture readiness evidence. |
| #747 | Shell navigation contrast/modal isolation. |
| #798 (780,785,786) | Settings, phone Library and review captures. |
| #740 | Mount History in Create; new authenticated server actions and existing job endpoint transport. |

Docs-only decisions/proposals and test-only changes are not runtime features. Review actual candidate compare for later merges: [Batch G to candidate](https://github.com/faresmohamed260/renderlab/compare/34efe0b84ac1d950581d7b371b65bbf331852e89...0d83c87a981c6d9e4397069810083731872724a4).

## Request-path assessment

- The only changed files under `src/server/generation/**` are seven additions under `history/`: `failed-reuse-model.ts`, `failed-reuse.ts`, `history-action-origin.ts`, `history-actions.ts`, `history-activity.ts`, `prompt-history-model.ts`, `prompt-history.ts`. Read all seven at the candidate.
- `failed-reuse-model` validates failed FIBO image recipes and owner-scoped references and maps a draft via the existing continuation function; `failed-reuse` binds existing owner-scoped media/reference readers. Neither submits. `prompt-history-model` builds bounded owner-filtered cursor queries; `prompt-history` binds fresh session and GET-only Supabase access. `history-action-origin` denies missing/foreign Origin and cross-site Fetch Metadata. `history-actions` exposes authenticated jobs/prompts/reuse actions; `history-activity` invokes the existing bounded owner settlement lane with the existing activity scope and then the existing owner projection, sanitizing public failure categories. Settlement can mutate existing job state; it is not a read-only path in the database sense.
- **Ordinary generation submit implementation: unchanged.** Exact text comparison of the complete 8,520-character Create `async function submit` block between Batch G and this candidate matched. Same POST /api/generation/jobs, reference/mask upload, payload construction and in-handler guards. Keyboard trigger now routes through the existing form with focus/overlay guards; UI draft selection and Reuse can change user-selected inputs.
- **Admission, dispatch implementation and worker payload construction: unchanged.** No changed production API handlers, core generation server modules, capability/request contracts, or worker files in the cumulative comparison.
- **Broader generation action entry path: changed.** Mounted History now explicitly POSTs opaque job IDs to the existing same-origin cancel/retry/run-again endpoints, validates distinct accepted retry/run-again IDs, and refreshes state. Existing endpoints still own recipe revalidation, admission and dispatch. Reuse alone never generates; the settlement-bearing History read is newly reachable from Create. This is not equivalent to a purely cosmetic release.
- **Smoke recommendation:** consider one release-specific disposable verification generation (ordinary supported FIBO scenario, or another approved scenario as head engineer chooses) because generation-related entry/recovery reachability changed, not because submit/dispatch/payload code changed. A single smoke does not prove every History action. The runbook requires separate exact-release authorization, cleanup and reconciliation; this audit authorizes zero spend. Re-evaluate after Activity removal and remaining merges. See [runbook](../operations/PRODUCTION_RELEASE_RUNBOOK.md).

## Routes and configuration

Changed page/layout entrypoints: root layout, /create, /activity, /library, /admin. Landing hero and Settings presentation change through feature components; Viewer through comparison/actions; shared shell, primitives, tokens, local Inter and loading affect other consumers. Library loads the existing initial recipe for the inspected owner asset. Activity is still present; no redirect in this snapshot. No changed production API handlers, runtime environment configuration files or names identified, Supabase migrations/RPC/index definitions, worker source or Vercel config. Release tooling/workflows and Next packaging changed since Batch G as listed in prior inventory; do not interpret those as new deployment authority.

## Landing review and remaining gates

Approved [round 3 static comp](../../design/approved/2026-11-25-phase6-round3/README.md), merged #792, review fixture `tests/components/round3-landing.review.ts`. Head engineer accepted the bounded hero implementation for integration; exact release-candidate desktop/phone/reduced-motion packet, optimizer variant measurements and real signed-out HTTP evidence remain required. Keep the four-section lower content and locked identity; verify CTA, private-data absence, contrast, image quality, geometry and scroll/focus. #802/#803 accessibility qualification and #789/#801 performance measurement remain pending integration. Create geometry #746/#759/#760, History redirect, remaining accessibility work and registry closure are open. No claim of zero axe findings or field performance.

## Rollback and release gate

Recorded live Batch G deployment `dpl_Fn5yNhNWz7owH9tMqi5cSbs3Y4WE` is the prospective rollback anchor for a future cutover, subject to independent live READY/alias/project/source read-back. Batch G's own recorded rollback is `dpl_FLynJG8JYSmFYSJJWaTs3Hg6yU5i` at `429afee1d1f8ea06f663e96f9c554bf37c5c2ab8`. No provider state was queried or changed. Require exact merged-main protected checks and Deployment Readiness, signed-out HTTP, mounted and review evidence, owner authorization, production preflight, verified rollback anchor, scoped stage/cutover, and production documentation sync. No deployment, migration or smoke is authorized.


## Incremental verified snapshot — main f1b5b38f

**NOT AUTHORIZED.** This is an additional historical snapshot, not the final release candidate. [Batch G to f1b5b38f](https://github.com/faresmohamed260/renderlab/compare/34efe0b84ac1d950581d7b371b65bbf331852e89...f1b5b38f6dc276db1bde131d0520d6761136b396): 54 commits, 269 changed paths; compare below its 300-file limit. The seven History server additions listed above remain the only changed `src/server/**` files. No changed production API handlers, worker paths or Supabase migration/RPC/index source. Incremental main:

| PR | Squash | Evidence |
|---|---|---|
| #811 | `5a75fb478aacaa084d2399aff4e2a8d1bbb8f05f` | Test-only focus synchronization; mounted run 45694229719/job 139487410662, 184 passed, two existing skips. |
| #746 | `71afa2bf09bbb28f92882970dea1d0b5a59a4728` | 11 workflows green; mounted 45696176463/job 139494032410, 188 passed, two existing skips; Text to Image 44×44 and all target hit probes pass at 390/320/195 CSS px. |
| #802 | `fb8741ce7bd4bff70226b8b4c048b17ceb061710` | Nine workflows green; expanded axe scan 45698832248. Informational findings are not a zero-violation claim. |
| #797 | `f1b5b38f6dc276db1bde131d0520d6761136b396` | 11 workflows green; mounted 45700897707; result pager and selected index presentation, not a new generation request. |

### Rejected performance experiments

Neither experiment was integrated. Same reported comparison units: initial compressed JavaScript bytes in isolated production HTTP; lab phone Library CLS, not field metrics.

| Candidate | Create bytes | Library bytes | Landing bytes | Phone Library CLS | Evidence |
|---|---:|---:|---:|---:|---|
| #810 `4ea8873d` | 339915 → 339915 | 315738 → 315738 | 284859 → 284859 | .001036390 → .001997259 | HTTP 45692329954/job 139480736351; Slow-4G 45692330558/job 139480874930. |
| #812 `0f4a4be3` | 339915 → 341339 | 315738 → 316472 | 284859 → 285018 | .001036390 → .001997259 | HTTP 45694389810/job 139487865505; Slow-4G 45694389832/job 139487865729. |

Do not count these rejected changes as production improvements. #789/#801/#817 are measurement/tooling candidates, not evidence of runtime savings until qualified and integrated.

### Activity redirect — outstanding gate, not shipped

#813 is not merged. The proposed fixed relative GET redirect returns 307 to /create?history=jobs, allows only recipe/source/action and normalized offset, and sets private, no-store; current main retains Activity. The third candidate HTTP attempt (head `5cf1c3697648fdc06b2ac8f342a3219626de066c`, run 45700780591/job 139509988661) observed the legacy 200 and candidate 307 with exact relative Location, including malicious external next discarded, but the signed-out History content marker failed. The current workflow also requires identical four-row base and candidate contracts, which cannot represent the intentional 200→307 transition. [Owner-approval escalation](https://github.com/faresmohamed260/renderlab/pull/813#issuecomment-7174678909). Worker 3 must fix the marker; a concrete workflow diff needs separate owner approval. Do not treat the observed redirect alone as qualification. If Activity lands, reassess changed route/server entrypoints, security/characterization, cancellation wording, counts and release smoke scope. No release, generation or migration authorization.


## Integrated geometry snapshot — main c1467888 (2026-11-25 UTC)

**NOT AUTHORIZED.** Interim inventory, not final candidate acceptance. [Batch G comparison](https://github.com/faresmohamed260/renderlab/compare/34efe0b84ac1d950581d7b371b65bbf331852e89...c1467888d55a873ddf125502ea7b0cd39833bcaf): 60 commits, 278 unique changed paths (below compare cap). All seven History server additions above remain the only changed server paths; no changed production API handlers, core admission/dispatch or worker payload source. Re-read the complete ordinary Create submit function on both exact SHAs: identical 8517 characters. History/recovery entry reachability remains changed; Library now streams its authenticated content boundary while keeping settlement before the media list in the real child. A release-specific smoke remains a recommendation, not spend authorization.

| PR | Integrated SHA | Qualification |
|---|---|---|
| #803 | `ebf17ea9ea7575fcf401052e6156f8d3216be8fc` | 11/11; exact phone inspector hydration and Landing axe correction, axe 45703649372. |
| #759 | `01058449a0b2c82edd5bfeb8927107dd794f3e19` | 11/11; shared auth-safe Create skeleton, mounted 45705370334. |
| #824 | `ec48b1760de0f65e93486bd3cf5f9c37c6e3ed54` | 11/11; six source PRs #789/#799/#809/#814/#788/#805, 19 identical source blobs and 100644 modes, tree `bfe1cd570def3d115e2d2e8dfa0a4ad116096119`. Library skeleton and real suspended-child settlement harness; measurement/docs only otherwise. Source closure links on #824 and the six PRs. |
| #801 | `91e579d2c6d0b82252a43128c2b6f580a2f9a7b2` | 10/10; measurement-only bundle graph, HTTP 45708778125. |
| #760 | `99699e3d09b90e2c48ab24347c1640ce27c785c4` | 11/11; mounted 45709832022/job 139541071925: 208 passed, two pre-existing skips, all 48 measured states zero violations and 12 narrow control proofs. Exactly 18 resolved 1440 entries removed. True browser 200% zoom remains a separate acceptance gate. |
| #807 | `c1467888d55a873ddf125502ea7b0cd39833bcaf` | 11/11 on 415704a7; Settings avatar accessibility, mounted 45714570897. |

### Exact integrated geometry dispatch

Head engineer dispatched on `99699e3d09b90e2c48ab24347c1640ce27c785c4` before #807, all five runs passed: review 45714531364/job 139557092726 (25 tests); axe 45714535218/job 139557097766; Slow4G 45714538828/job 139557109168; production HTTP 45714573733/job 139557229850; Landing 45714570329/job 139557216239. These runs do not qualify later main. Signed-out HTTP: Create/Activity/Library 200, concealed Admin 404. Production emitted initial compressed JS: Create 345932 B, Library 315738 B, Landing 284856 B (distinct from fixture transfer). Cold optimized fixture five-run medians, API mocks instantaneous:

| Device | Route | LCP ms | CLS | Selected interaction ms | JS transfer bytes |
|---|---|---:|---:|---:|---:|
| Desktop | Create | 940 | .000781290 | 32 | 244317 |
| Desktop | Library | 956 | .000348587 | 64 | 234932 |
| Desktop | Landing | 992 | .000633113 | unavailable | 297174 |
| Phone 4x CPU | Create | 2488 | .000414646 | 48 | 244317 |
| Phone 4x CPU | Library | 932 | .001997259 | 96 | 234932 |
| Phone 4x CPU | Landing | 992 | .001027433 | unavailable | 297174 |

No field p75/INP or universal contrast claim. Four arbitrary future artwork rows remain MANUAL; axe reports informational findings (not a zero-violation result). No budget changes. Worker 4 owns the detailed performance and remaining manual ledger (#827); candidate-specific Landing interaction measurement #817 remains held pending independent review.

### Further rejected diagnostics

- #804 closed: Library cold fixture JS 234010→233427 B, within variance; desktop LCP 868→904 ms, phone 888→908 ms; interactions 96→112 and 144→160 ms. Slow4G 45681296923/job 139442219306. No merge.
- #816 closed: Landing initial compressed JS 284859→245162 B, but Create 339915→346007 and Library 315738→323637; all six LCP medians worsened beyond baseline range and two mounted signed-in Landing header assertions failed (HTTP 45695959017, Slow4G 45695958942, mounted 45695959131). No merge.
- #820 closed after three failed exact analyzer identity joins: common emitted chunks 71681 + 44294 = 115975 compressed bytes, exact module membership unresolved (jobs 139496755355, 139505826289, 139510715608). No speculative deferral or new instrumentation authorized.

### Activity removal gate remains open

#813 head `c84c34d34601f48b434e57c27526091314913cc7`, HTTP 45703641716/job 139519876394: candidate now passes signed-out History marker and both exact 307 locations; legacy base 200 still fails candidate-only expectations. Existing workflow requires identical four-row contracts and cannot accept intentional 200→307. Concrete owner-approval proposal on #813 (comment 7175919219), not applied. Activity remains on main. Do not rerun the unchanged contract failure, waive the gate, or change workflow before owner approval. Reconcile the latest UI/measurement source and retain characterization before qualifying. Further serial accessibility/Library and design fidelity changes are still outstanding; update this audit and current registries after the queue closes. No release/provider spend authorization.


## Verified source snapshot — main 3ef1d334 (2026-11-25 UTC)

**NOT AUTHORIZED.** [Batch G comparison](https://github.com/faresmohamed260/renderlab/compare/34efe0b84ac1d950581d7b371b65bbf331852e89...3ef1d334e0f95034d925bff748e736a821dedbc4): 61 commits, 278 changed paths, below the 300-file comparison limit. The seven History additions remain the only changed server paths; no changed production API handlers, Supabase or worker source. Ordinary submit, admission, dispatch and payload findings above are unchanged by #808. #808 exact head `ef701049efeace66aba3760f2d10b1f897dea331`, squash `3ef1d334e0f95034d925bff748e736a821dedbc4`: mounted 45715862879/job 139561613335, axe 45715862794/job 139561613199, review 45715862748/job 139561612462, Slow-4G 45715862770/job 139561613150, governance 45715862755/job 139561613698 all passed. Library tile names now include visible title, kind and date; phone Done and Open in Create labels reflect the visible controls; existing durable Viewer and owner-scoped actions retained. #807's avatar role correction is merged as recorded above. Phone shell #806 remains unmerged at `9bacfa194319d51c63ba2bd7904bbfa29879160f`; review 45716862147/job 139565022841 failed the 390px normal-motion Textarea restoration/contrast assertion (MANUAL, not a pass). Preserve the assertion and coordinate deterministic correction; no waiver. #817 remains draft on older base despite green checks; #827 audit is unmerged. Activity #813 remains authorization-blocked. Exact release acceptance, remaining fidelity slices, true zoom and separate release authorization remain open. No provider activity or spend.


## Integrated source closeout — main fd44b7ce (2026-11-26 UTC)

**PRODUCTION RELEASE NOT AUTHORIZED.** This is the source-readiness snapshot before the docs-only #828 squash; final main SHA will be recorded on #828. [Batch G to integrated source](https://github.com/faresmohamed260/renderlab/compare/34efe0b84ac1d950581d7b371b65bbf331852e89...fd44b7ce67a785dc58fa28692beea8574119dd24): 70 commits, 296 changed paths, below the compare cap. Earlier snapshots above are historical, including their then-open items; the following supersedes those dispositions. The seven History server additions remain the only changed server paths; no production API handler, worker or Supabase migration changes. Direct read-back of ordinary Create submit function against Batch G matches exactly (8517 characters); History/recovery entry reachability and authenticated Library streaming remain material changes. No production manifest or mirror change.

| Integration | Qualified head | Squash SHA | Scope and evidence |
| --- | --- | --- | --- |
| #832 | `5d68931ef7d2637c7129e37557e24763d4308bf6` | `4c9df1eff0077f7a1646ff1d7c930683031f1e3b` | #815 phone inspector fidelity, #827 performance audit; mounted 45864785562, review 45864785261. |
| #837 | `c46ef7f8a5704e6498d1c282b676d0513e52813e` | `5b95b5cf7a9b51a199fd8e1c8db6929da7ab74b0` | #818 Generate treatment, #821 Library phone header, #833 Landing review, #834 payload attribution, #830 inspector/Viewer actions; mounted 45868517212, review 45868517286. |
| #838 | `299db66d5804d37ac73851270732434c54596783` | `280fdc1888365d42e48e2d778df6be4045cf8f5e` | #819 labelled mode, #826 selection, #829 Library desktop filter toolbar; mounted 45869663932, review 45869663804. |
| #836 | `b3cb585ebf608a84cd69086c0d1e1139e938d820` | `74f9ae52aff67d2b0e1cc4f6213e69fa82d02b1a` | #817 atomic contrast sampling and Landing interaction measurement; mounted 45870777429, review 45870777202. |
| #841 | `6bdf41f4edaa4d4e2e9588c31de2eec38d90308f` | `f14e1cc369ba17ed7d098caaa542e49a783d1113` | #823 compact phone Advanced; mounted 45871861393, review 45871861476. |
| #845 | `66db9af5fc2b0865acdfafce30f5e04c683ef0dd` | `2efeba99155a00c388459a2d96ff64df52fdab8e` | #844 approved mounted timeout 8→12 minutes; #843 Library hydration-ready wait, no assertion weakening; mounted 45879438947. |
| #846 | `8f1b63db9a38fc23639a5de7faf596979bc9856f` | `4ce7a69acc302cc6c950a6ebf9c771db90e29e83` | #806 shell visible names, #822 phone media stage, #842/#825 result actions; mounted 45880483925, review 45880483961. |
| #847 | `cf73b3e6ae241f3cfa5ad4db7e300d37bafe522d` | `3bd80636cf9836908f727cb05493bb5b138ad19d` | #835 primitive boundaries, #839 accessible names, #831 unsupported controls hidden; truthful phone single-output caption reconciles compact Advanced. Mounted 45884691355, review 45884691534. |
| #840 | `5367290a5d8de76c757d56c8b5af9923ab0707a4` | `fd44b7ce67a785dc58fa28692beea8574119dd24` | Five-width acceptance and three-line **product CSS** correction, not test-only; mounted 45889083371/job 140146996443, review 45889083498; all 11 workflows passed. |

All integrations above passed their applicable exact-head checks before squash. Source closures and source-to-integration patch/blob/mode evidence are retained in each integration PR. #840 preserves the original 153-line test blob `0d76bc1bd851344d5142e870b666fd73938c7667` and both #831 and #840 CSS corrections. Mounted 274 passed, two existing skips, all ten width/motion cells green; the measured enabled Generate contrast at 195/320/390/768/1440 CSS px is 5.5417/5.5826/5.5953/5.5980/5.5953:1 in both motion modes. Generate height 48.28125 at 195, 44 at the other widths; zero overflow, no below-24 targets, no missed critical hit samples, focus restoration and motion assertions passed. This is CSS viewport stress, not true browser 200% zoom. Prior Textarea restoration recurrence on 45882293099 remains disclosed; no unchanged-head retry or waiver. #840 required workflow IDs: quality 45889083375, governance 45889083328, coverage 45889083221, CodeQL 45889083202, portability 45889083330; remaining integrated lanes axe 45889083554, Slow4G 45889083206, signed-out HTTP 45889083344, Landing 45889083427.

### Interim five-lane dispatch and remaining acceptance

Head engineer dispatched on exact main `3bd80636cf9836908f727cb05493bb5b138ad19d` (not the final main; only #840 and docs-only #828 follow). Interim run/job IDs and status at read-back:

| Lane | Run | Job | Status |
| --- | --- | --- | --- |
| Component review | 45889698075 | 140149011517 | In progress |
| Axe | 45889702587 | 140149023266 | Success |
| Slow4G | 45889706719 | 140149038115 | In progress |
| Signed-out HTTP | 45889710807 | 140149052701 | Success |
| Landing measurement | 45889715134 | 140149065345 | Success |

These are interim evidence, not exact-final-main qualification. Record final main required checks, Deployment Readiness, exact final acceptance and signed-out HTTP comparison per runbook before any release; independent visual/motion review and true browser zoom remain separate. Retain informational axe and arbitrary-artwork manual ledger, no claim of zero findings or field p75/INP. Performance audit [#827](PHASE6_PERFORMANCE_2026-11-25.md) and [payload attribution](PHASE6_CREATE_PAYLOAD_ATTRIBUTION_2026-11-26.md) remain historical evidence; prior measured Create growth +6017 compressed bytes is not a final-main measurement or an exact module split. No budget ratchet authorized. GitHub's non-required Vercel status reported account blocked on #840; this is not a required-context failure or deployment read-back and requires separate owner/operator review before any future release.

### Explicit holds and release boundary

- #813 stays open/draft, owner-blocked on intentional signed-out HTTP contract change. Latest exact head `43b4a3d8efdbe7260d108d1d3b1e80b97a0c78ee`: 10/11 workflows passed; HTTP 45878223522/job 140110642157 failed because legacy Activity 200 and candidate exact 307 to /create?history=jobs (including normalized historyOffset=20) cannot share identical contract; signed-out History 200. No workflow edit or waiver. Activity remains on main; signed-out contract remains Create/Activity/Library 200, Admin 404, no Location.
- #748 held (original primitive contrast evidence); #835 superseding bounded evidence is merged, does not authorize closing or merging #748.
- #603 and #625 held; original TLS approach rejected by live read-only canary, no retry or Modal mutation authorized.
- Branch hygiene remains the historical read-only [inventory](2026-11-25-repository-branch-hygiene.md); no branch deletion.
- Recorded production Batch G remains `34efe0b84ac1d950581d7b371b65bbf331852e89`. No new provider verification, release, deploy, migrations, secrets/settings, Admin controls or spend. Recommend separate owner decision on release-specific smoke due to History entry reachability; zero generation authorization here. Production runbook and known rollback anchor remain binding.
