# CI P1-04 — evidence-only fast path and duplicate Ubuntu build elimination

**2026-11-24; branch implementation awaiting review, merge and exact-head validation.** Inputs: [30-day cost audit](CI_WORKFLOW_COST_AUDIT_2026-11-23.md) and [P5 optional trigger reduction](CI_W4_AUDIT_TRIGGER_SAVINGS_2026-11-23.md). This is repository CI only: no provider, deployment, schema, secret, manual production workflow or GPU work.

## Observed baseline and measurable before/after step contracts

The [one-file audit-evidence PR #620](https://github.com/faresmohamed260/renderlab/pull/620) on 2026-11-23 ran all protected checks (same workflow definitions as the audit baseline). Its completed successful job timestamps and [job-step evidence](https://github.com/faresmohamed260/renderlab/actions/runs/45278071576) provide a real baseline, not a predicted invoice:

| Required job | Historical #620 elapsed (wall) | Before: npm installs / production builds | After: **eligible evidence-only Markdown** | After: runtime/lock/migration/workflow PR |
| --- | ---: | ---: | ---: | ---: |
| Engineering Quality / `quality` | 51 s | 1 / 1 | 0 / 0; run doctor, text policy, docs governance | 1 / 1; unchanged full validation |
| Unit Coverage / `unit-coverage` | 26 s | 1 / 0 | 0 / 0; run docs governance; no misleading coverage artifact | 1 / 0; unchanged all-source coverage/artifact |
| Developer Portability / `clean-room (ubuntu-latest)` | 49 s | 1 / 1 | 0 / 0; doctor, text policy, docs governance | 1 / **0**; keep lint, typecheck, unit tests, negative gates |
| Developer Portability / `clean-room (windows-latest)` | 87 s | 1 / 1 | 0 / 0; doctor, text policy, docs governance | 1 / 1; full independent cross-OS build |
| **Four jobs, one docs-only PR** | **213 elapsed job-seconds** (parallel, not PR latency) | **4 / 3** | **0 / 0** | **4 / 2** |

The Ubuntu Quality job still performs a full production build on every executable change; the independent Windows portability job still builds. The optional Deployment Readiness build, all upstream fixtures, CodeQL and Documentation Governance are untouched. Four installs and three builds avoided per *eligible* docs-only PR, and **one duplicated Ubuntu build** removed for full-code PRs, are verified **workflow step-count changes**, not yet realized runtime/billing savings. They cannot be extrapolated to *all* docs-only PRs: the classifier is deliberately narrower. Historical #620's combined runner-equivalent capacity proxy is approximately 51 + 26 + 49 + 2×87 = **300 weighted seconds** (5 min); no invoice claim.

**Realization gate:** only after a naturally occurring eligible docs-evidence-only PR runs on merged P1-04 may we compare actual elapsed job times, skip reasons, and retained governance/CodeQL outputs against #620. This implementation PR changes workflow/source files, so its runs must take the full path; recording it as a docs-only performance win would be false. Public-repo sampled GitHub billable time was zero in the parent audit. No dollar savings are asserted.

## Scope classifier and fail-closed matrix

`scripts/ci-classify-changes.mjs` operates on the checked-out Git object, validates **40-hex base/head** from the trusted PR/push event, confirms the actual HEAD SHA, loads the exact base commit (fetching only that SHA if absent), uses NUL-separated `git diff --name-only --no-renames`, rejects empty/ambiguous diffs and verifies each changed file is a current **regular 100644** Markdown blob. It additionally rejects any changed pathname explicitly referenced from `.github`, `src`, `scripts` or `tests` in the checked-out tree. Errors, unrecognized events, missing ancestry and failed grep/mode reads all select **full**. No user-provided `paths` value or GitHub PR title can enable the shortcut.

| Changed content / event | Expected path | Why |
| --- | --- | --- |
| Regular `docs/audits/**.md`, `docs/history/**.md`, `docs/archive/**.md` **only**, with no source/test/workflow reference | **docs-only** | Evidence/historical narrative already covered by full Documentation Governance and CodeQL; no runtime/test/config dependency identified |
| Evidence Markdown + `package-lock.json`, `package.json` or `src/**` | **full** | Runtime/dependency drift; preserve real fresh install and builds |
| Evidence Markdown + `supabase/**` migration/SQL | **full** | Conformance/fixture dependency |
| Evidence Markdown + `.github/workflows/**` or `scripts/**` | **full** | Cannot let workflow itself weaken protected checks |
| `docs/architecture/**`, `docs/operations/**`, `docs/ui/**`, `docs/STATUS.md`, `docs/INDEX.md`, root Markdown, JSON status/governance | **full** | Normative / product / public / potentially tested authorities; deliberately no broad docs shortcut |
| Referenced audit file, symlink/executable, unusual path, deletion, base/head mismatch, missing commit, empty diff | **full** | No positive, reviewed evidence-only classification |
| `workflow_dispatch`, unknown event or unsupported Git graph | **full** | Can't infer complete changed-file scope from a manual run |

The positive and negative classifier tests include **real disposable local Git object diffs**, false event SHAs, manually triggered workflows, mixed changes, partial docs, and source reference detection. They use no network or provider. The resulting `docs_only` output controls **individual expensive steps** inside the same required jobs, not workflow or job triggers. On the shortcut all three affected workflows run a credential-free documentation-governance proof; Quality and both portability OS jobs also run doctor and text-policy checks. Documentation Governance and CodeQL remain universal and unchanged.

## Safety, rollback and ownership

- **Protected names unchanged:** `quality`, `governance`, `unit-coverage`, `javascript-typescript`, `clean-room (ubuntu-latest)`, `clean-room (windows-latest)`. All six remain on every PR and main push. No `paths` / `paths-ignore` gates at required-workflow level.
- **Security:** immutable pinned action refs, contents read-only, existing concurrency and cancellation decisions remain unchanged. `npm ci` stays deterministic whenever a runnable source/config/lockfile is involved. No extra artifact, reusable elevated token, shared cache, cross-OS node_modules transplant, or permission expansion. Failed classification only incurs full CI cost, never a false-pass.
- **No production-workflow edits:** Production Documentation Sync, Deployment Readiness, production QA-002–005, FIBO Smoke, Modal deploy, ENT backup/drill and privileged configured integration jobs keep their existing triggers, permissions, artifact and cleanup semantics. The still-enabled CodeQL check never skips analysis.
- **Rollback:** revert the three required workflow YAML edits and both small classifier source files/test. The original complete CI step lists and independent Ubuntu portability build return; no database/provider state to restore. Re-run all six protected checks and CodeQL on exact resulting head.

The audit baseline's **~6,199 runner-equivalent minutes across 4,631 current-workflow historical runs** is not a denominator for P1-04 realized savings; it lacks the eligible-docs PR fraction. Avoid adding P1 and P2 savings together without nonoverlapping actual measurements.
