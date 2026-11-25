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
