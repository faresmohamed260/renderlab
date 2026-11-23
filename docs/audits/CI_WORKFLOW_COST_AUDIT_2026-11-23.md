# RenderLab CI workflow inventory, run cost and consolidation proposals — 2026-11-23

**Status:** evidence and proposals **only**. No workflows, production releases, deployments, secrets, WANDA, Supabase or provider resources were changed. Captured from GitHub connector on **`50473eb5e25f6f0e3ff350420f17db16b1a60e45`**; window **2026-10-25 00:00:00 UTC through 2026-11-23 20:34:46 UTC** (30 UTC calendar dates; final date partial). Preserve the six protected-main required contexts and all production verification workflows. Runtime changes would require a separate proposal, PR and release.

## Method, cost units and blind spots

- Enumerated **26 YAML workflows** in [`.github/workflows`](../../.github/workflows/) on the pinned main commit, inspected `on` triggers, path lists, job OS, steps, credentials and concurrency. The six contexts in [`docs/governance/github-protection.json`](../governance/github-protection.json) are authoritative *repository-declared* requirements: `quality`, `governance`, `unit-coverage`, `javascript-typescript`, `clean-room (ubuntu-latest)`, `clean-room (windows-latest)`. GitHub's live branch-protection REST read returned **403 (integration lacks administration permission)**; no claim of live protection-state read-back.
- Used [GitHub Actions run history](https://github.com/faresmohamed260/renderlab/actions) with REST `GET /repos/faresmohamed260/renderlab/actions/runs?created=...&per_page=100&page=N`. Split high-volume days into separate timestamp ranges to avoid GitHub's **1,000-result filtered search ceiling**; kept November 23's maximum timestamp fixed to prevent pagination drift; read **all 6,349 unique returned runs** across the window. A run from an older workflow counts in history even when its YAML is no longer on main. `run_attempt` reruns are represented by the fetched latest run entry, not separate job attempts.
- **4,631** runs map to today's 26 workflows, while **1,718** belong to older/deleted or dynamically named workflows (not deletion candidates on current main). **4,087** current-workflow runs (88.3%) are Engineering Quality, Unit Coverage, Documentation Governance, CodeQL and Developer Portability.
- Duration proxy: `updated_at - run_started_at` in seconds on completed runs; rounded into **30-second upper-edge bins** for median/p95 (precision about ±0.5 min); mean uses unrounded seconds. **Eight** historical records had elapsed deltas **greater than two hours**, inconsistent with their configured workflow timeouts (including one in each of the five core workflows): excluded **only from duration/cost calculations**, not counts or outcomes. Run wall time can include queue, finalization and post-run metadata updates. A failed preflight that exits early is short; its short duration does not imply a healthy test.
- **Failure rate** = failures + timeouts / (successes + failures + timeouts), **excluding cancelled runs** from this denominator; cancellations are separately counted. No claim that a failed manual fixture equals a production regression. `Avg` and `p95` include cancelled runs where elapsed data is usable.
- **Runner-equivalent minutes** (capacity proxy, not an invoice) = summed eligible run elapsed seconds / 60, × **1** for single Ubuntu jobs, × **3** for Developer Portability's concurrent Ubuntu (1×) and Windows (2×) jobs; sum is rounded **up per workflow**. This deliberately overestimates parallel jobs relative to job-level execution. Example [portability run 45260777231](https://github.com/faresmohamed260/renderlab/actions/runs/45260777231): job intervals were **49 s Ubuntu** and **86 s Windows** (3.68 weighted job-minutes), versus **89 s workflow wall time** (4.45 proxy minutes). Other workflows use one Ubuntu job. No GPU-hosted GitHub runner was declared.
- **GitHub-billed minutes:** repository metadata reports **public**; sampled GitHub [run timing](https://github.com/faresmohamed260/renderlab/actions/runs/45260777231) returned `billable.UBUNTU.total_ms=0` and `billable.WINDOWS.total_ms=0` (Engineering Quality sample also zero). Thus no demonstrated invoiceable GitHub-hosted minutes; **~6,199** below are equivalent *usage*, not charges. Billing/account statements, exact per-job billing for every run, storage/artifact charges, Modal/GPU/provider calls, hosted database requests, R2 I/O and Vercel charges were **not accessible** through this connector and are **not estimated as dollars**. The cost of manual provider workflows may dominate real money despite smaller Actions time.

## Inventory — all 26 current workflows

Legend: **R** = one or more repository-declared required check contexts; **N** = not in declared required contexts. **A** = PR; **P** = push to `main`; **M** = manual dispatch; **C** = reusable workflow call; **S** = schedule. `all` means no `paths` filter. Every runner is GitHub-hosted; `U`=Ubuntu latest, `U24`=Ubuntu 24.04, `U+W`=Ubuntu latest and Windows latest matrix. **External** distinguishes no GPU from possible hosted service usage, not actual provider invoices.

| Workflow (source) | Purpose | Triggers; path scope | Gate | OS | External use / provider or GPU budget |
| --- | --- | --- | --- | --- | --- |
| [Account Ownership](../../.github/workflows/account-ownership.yml) | Two-user owner isolation | A filtered, M | N | U | Hosted Supabase/Auth/R2 fixture; no generation |
| [CodeQL](../../.github/workflows/codeql.yml) | JS/TS security scan | A/P all, M | **R** | U | No provider/GPU |
| [Compromised Password Screening](../../.github/workflows/compromised-password-screening.yml) | Free Pwned Passwords reachability | A filtered, M | N | U24 | External API call; no GPU |
| [Database Conformance](../../.github/workflows/database-conformance.yml) | Disposable PostgreSQL 17 migrations and races | A/P filtered, M | N | U | Local temporary DB; no hosted credentials |
| [Deployment Readiness](../../.github/workflows/deployment-readiness.yml) | Build and Vercel contract preflight | A/P filtered, M | N | U | Offline build; no deploy |
| [Developer Portability](../../.github/workflows/developer-portability.yml) | Linux + Windows clean-room checks | A/P all, M | **R × 2** | U+W | No provider/GPU |
| [Documentation Governance](../../.github/workflows/docs-governance.yml) | Governance registry validation | A/P all, M | **R** | U | No provider/GPU; deliberately lightweight |
| [Engineering Quality](../../.github/workflows/engineering-quality.yml) | Lint, types, tests, backend guard checks and build | A/P all, M | **R** | U | Offline plus read-only reciprocal ownership lookup; no GPU |
| [ENT-007 Recovery Backup](../../.github/workflows/ent007-recovery-backup.yml) | Retained encrypted DB/R2 backup | S daily (02:17 UTC), M | N | U | **Hosted DB/R2/Cloudflare operations**, no GPU |
| [ENT-007 Recovery Drill](../../.github/workflows/ent007-recovery-drill.yml) | Restore into isolated PostgreSQL/R2 prefix | S Mondays (06:47 UTC), M | N | U | **Hosted retained backup/R2 operations**, no GPU |
| [Deploy FIBO Production Worker](../../.github/workflows/fibo-production-deploy.yml) | Modal production deploy | M | N | U | **Modal remote deployment / possible GPU provisioning** |
| [Maintenance Integration](../../.github/workflows/maintenance-integration.yml) | Real configured cleanup/reconciliation fixture | A/P filtered, M | N | U | Hosted Supabase/R2 fixture; no GPU |
| [Persistent Media Upload Integration](../../.github/workflows/media-upload-integration.yml) | Upload and promotion fixture | A filtered, M | N | U | Hosted Supabase/R2 fixture; no GPU |
| [MFA Privileged Step-Up](../../.github/workflows/mfa-privileged-step-up.yml) | Configured Auth/AAL2 check | M only **now** | N | U24 | Hosted Auth fixture; no GPU |
| [Production ADR-005 Worker Lifecycle](../../.github/workflows/production-adr005-worker-lifecycle.yml) | Bounded process-exit/recovery proof | M | N | U | **Up to 2 real FIBO calls; Modal GPU/provider spending** |
| [Production Complete User Journey](../../.github/workflows/production-complete-user-journey.yml) | Full QA-002 browser/generation verification | M | N | U | **Exactly 4 bounded provider generations** |
| [Production Documentation Sync](../../.github/workflows/production-documentation-sync.yml) | Read-only live Vercel/GitHub provenance | M/C | N | U | Remote metadata GET, no provider/GPU |
| [Production FIBO Smoke](../../.github/workflows/production-fibo-smoke.yml) | One-production-generation fixture | M | N | U | **Exactly 1 real FIBO call per accepted run** |
| [QA-003 Activity + Admin Audit](../../.github/workflows/production-qa003-activity-admin.yml) | Browser/Admin + bounded fixture | M | N | U | Possible fixture-owned provider work |
| [QA-004 Account Security Data Audit](../../.github/workflows/production-qa004-account-security-data.yml) | Destructive run-owned account fixture checks | M | N | U24 | Hosted Auth/DB/R2; no required GPU |
| [QA-005 Reconciliation Failure Audit](../../.github/workflows/production-qa005-reconciliation-failure.yml) | Exact app with run-local failed worker | M | N | U24 | Hosted Auth/DB/R2; **zero real provider calls** |
| [Reference Upload Integration](../../.github/workflows/reference-upload-integration.yml) | Signed R2 reference upload, cleanup | A/P filtered, M | N | U | Hosted Supabase/R2 fixture; no GPU |
| [Unit Coverage](../../.github/workflows/unit-coverage.yml) | All-source coverage and evidence artifact | A/P all, M | **R** | U | No provider/GPU |
| [Upload Admission Integration](../../.github/workflows/upload-admission-integration.yml) | Tickets/admission concurrency fixture | A/P filtered, M | N | U | Hosted Supabase/R2 fixture; no GPU |
| [W4 Targeted Risk Coverage](../../.github/workflows/w4-risk-tests.yml) | Batch-one 20× deterministic tests | A filtered (includes audit doc) | N | U | Offline |
| [W4C Risk Boundary Determinism](../../.github/workflows/w4c-risk-tests.yml) | Batch-two 20× deterministic tests | A filtered (includes audit doc) | N | U | Offline |

### Exact path-filter inventory

The five core required workflows (CodeQL, Engineering Quality, Documentation Governance, Developer Portability and Unit Coverage) have **no path filters** on either PR or main push. Manual, schedule and callable-only workflows have **no path-filtered PR/push trigger**. For the other workflows the filters are:

- **Account Ownership (A):** `package.json`, `proxy.ts`, `src/lib/supabase/**`, `src/server/account/**`, `src/app/page.tsx`, `src/app/(app)/create/**`, `src/app/(app)/layout.tsx`, `src/app/(app)/library/**`, `src/app/api/assets/reference/**`, `src/app/api/generation/**`, `src/app/api/media/**`, `src/features/create/**`, `src/features/library/**`, `src/server/data/**`, `src/server/generation/**`, `src/server/media/**`, `src/server/storage/**`, migrations `0004`, `0005`, `0010`, `0011`, `0012` (exact files), `scripts/lib/configured-test-account.mjs`, `scripts/verify-account-ownership.mjs`, and its workflow YAML.
- **Compromised Password Screening (A):** `src/features/account/compromised-password-screening.ts`, `src/features/account/account-password-form.tsx`, `scripts/verify-pwned-passwords-reachability.mjs`, `scripts/verify-account-identity.mjs`, its workflow YAML.
- **Database Conformance (A/P, same):** `supabase/**`, `src/lib/capabilities/generation.ts`, `src/lib/capabilities/generation-job-state-machine.ts`, `tests/fixtures/disposable-supabase-bootstrap.sql`, `tests/fixtures/database-conformance.sql`, `tests/fixtures/atomic-terminalize-conformance.sql`, `scripts/verify-atomic-terminalize-concurrency.mjs`, `scripts/verify-database-conformance.mjs`, its workflow YAML.
- **Deployment Readiness (A/P, same):** `vercel.json`, `next.config.ts`, `package.json`, `scripts/verify-vercel-env.mjs`, `tsconfig.json`, `postcss.config.mjs`, its workflow YAML.
- **Maintenance Integration (A/P, same):** `scripts/lib/configured-test-account.mjs`, `scripts/verify-maintenance.mjs`, `src/server/maintenance/**`, `src/server/observability/**`, `src/server/media/**`, `src/server/storage/**`, `src/app/api/internal/maintenance/**`, exact migrations `0017`, `0028`, `0029`, its workflow YAML.
- **Persistent Media Upload Integration (A):** exact migrations `0003`, `0004`, `0005`, `0017`, `0024`, `0025`, `0026`; `src/lib/api/media-upload-contract.ts`, `src/lib/api/media-assets-contract.ts`, `src/lib/supabase/**`, `src/server/media/media-uploads.ts`, `src/server/media/media-assets.ts`, `src/server/storage/r2.ts`, `src/app/api/media/uploads/**`, configured-test-account helper, upload verifier, its workflow YAML.
- **Reference Upload Integration (A):** its workflow YAML; configured-test-account helper; reference-upload verifier; `src/lib/supabase/**`, `src/app/api/assets/reference/**`, `src/server/media/reference-uploads.ts`, `src/server/storage/**`, `src/server/data/**`, `src/lib/api/reference-upload-contract.ts`, exact migrations `0004`, `0005`, `0017`, `0024`, `0025`, `0026`, `package.json`. **P differs:** same nonmigration paths, but `supabase/migrations/**` (all migrations).
- **Upload Admission Integration (A/P, same):** its workflow YAML; configured-test-account helper; upload-admission verifier; `src/app/api/assets/reference/upload-tickets/route.ts`, `src/app/api/media/uploads/upload-tickets/route.ts`, `src/lib/api/media-upload-contract.ts`, `src/lib/api/reference-upload-contract.ts`, `src/server/data/supabase-rest.ts`, `src/server/media/media-uploads.ts`, `src/server/media/reference-uploads.ts`, `src/server/media/upload-admission.ts`, `src/server/security/**`, `src/server/storage/r2.ts`, exact migrations `0024`–`0027`.
- **W4 Targeted Risk Coverage (A):** `tests/unit/w4-*.test.mjs`, `tests/helpers/w4-*.mjs`, `docs/audits/W4_RISK_BOUNDARY_TEST_EVIDENCE_2026-11-23.md`, its workflow YAML.
- **W4C Risk Boundary Determinism (A):** `tests/unit/w4c-*.test.mjs`, `tests/helpers/w4c-*.mjs`, `docs/audits/W4C_RISK_BOUNDARY_TEST_EVIDENCE_2026-11-23.md`, its workflow YAML.

The reference-upload **main-push broad migration glob** and W4/W4C **audit-doc triggers** are the clearest targeted path-filter review candidates. The five protected workflows run on **every** docs-only PR/main push; no proposal below deletes or skips their required contexts.

## Last-30-calendar-day metrics by current workflow

**Avg/p95 = elapsed workflow minutes**, rounded; **p95 is a 30-second histogram upper edge**. `Fail` is failed among noncancelled finished runs; `Cancelled` is an absolute count. `Eq.min` is estimated GitHub-runner-weighted equivalent use, **not billed minutes or provider spend**.

| Workflow | Runs | Avg min | p95 min | Fail | Cancelled | Eq.min |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Developer Portability | 817 | 1.31 | 2.5 | 10.2% | 178 | 3,206 |
| CodeQL | 817 | 1.29 | 2.5 | 0.2% | 180 | 1,056 |
| Engineering Quality | 818 | 0.77 | 1.5 | 11.7% | 137 | 633 |
| Unit Coverage | 817 | 0.55 | 1.0 | 6.1% | 107 | 449 |
| Documentation Governance | 818 | 0.28 | 0.5 | 1.7% | 54 | 228 |
| Account Ownership | 114 | 1.48 | 5.0 | 19.6% | 12 | 169 |
| Reference Upload Integration | 76 | 1.33 | 4.5 | 35.4% | 11 | 101 |
| Deployment Readiness | 110 | 0.86 | 3.0 | 12.7% | 8 | 96 |
| Production FIBO Smoke | 21 | 2.28 | 3.5 | 28.6% | 0 | 48 |
| Production ADR-005 Worker Lifecycle | 20 | 2.34 | 5.5 | 85.0% | 0 | 47 |
| Maintenance Integration | 28 | 1.34 | 3.0 | 28.6% | 0 | 38 |
| ENT-007 Recovery Backup | 30 | 0.95 | 1.5 | 0.0% | 0 | 29 |
| Upload Admission Integration | 17 | 1.48 | 3.0 | 47.1% | 0 | 26 |
| Production Documentation Sync | 46 | 0.30 | 1.0 | 10.9% | 0 | 14 |
| Persistent Media Upload Integration | 13 | 0.82 | 3.5 | 58.3% | 1 | 11 |
| MFA Privileged Step-Up | 15 | 0.61 | 2.0 | 66.7% | 0 | 10 |
| W4 Targeted Risk Coverage | 11 | 0.67 | 1.5 | 45.5% | 0 | 8 |
| ENT-007 Recovery Drill | 5 | 1.11 | 1.5 | 20.0% | 0 | 6 |
| W4C Risk Boundary Determinism | 10 | 0.56 | 1.0 | 30.0% | 0 | 6 |
| Compromised Password Screening | 11 | 0.37 | 1.0 | 0.0% | 0 | 5 |
| QA-003 Activity + Admin Audit | 1 | 4.07 | 4.5 | 0.0% | 0 | 5 |
| Database Conformance | 9 | 0.48 | 1.0 | 22.2% | 0 | 5 |
| Deploy FIBO Production Worker | 7 | 0.34 | 0.5 | 28.6% | 0 | 3 |
| Production Complete User Journey | **0** | — | — | — | — | 0 |
| QA-004 Account Security Data Audit | **0** | — | — | — | — | 0 |
| QA-005 Reconciliation Failure Audit | **0** | — | — | — | — | 0 |
| **Total currently present** | **4,631** | — | — | — | — | **~6,199** |

**Interpretation:** the five core workflow families contribute **~5,572 of ~6,199 runner-equivalent minutes (~90%)**. Developer Portability contributes **~3,206** largely because of parallel Windows weighting. Historic retired/dynamic workflows contribute **1,718 additional runs** over the same window; they are *excluded* from the current-main equivalence total and must not be represented as presently configured CI. No reliable historical YAML, job-weighted cost or vendor-cost attribution was recoverable for all those removed workflows.

### Duplicate work and unnecessary triggers

1. Every PR (including docs-only) invokes **Engineering Quality + Unit Coverage + Documentation Governance + CodeQL + Developer Portability's two OS jobs**. The four Node jobs in Engineering Quality (Ubuntu), Unit Coverage (Ubuntu), Portability (Ubuntu) and Portability (Windows) each do `npm ci`. Engineering Quality and both Portability jobs repeat `lint`, `typecheck`, unit tests, text-policy checks, ownership checks and a **production build**. Unit Coverage also executes unit tests under instrumentation. For an unchanged SHA the redundancy adds independent clean-room assurance but measurable setup/compute duplication.
2. **Documentation-only example:** [run set for docs-only PR #582](https://github.com/faresmohamed260/renderlab/pull/582) executed every required family, including three production builds and four full dependency installs, even though only a Markdown runbook changed. Required check *names* must remain present; simply applying `paths-ignore: docs/**` to required workflows risks a permanently pending protected check.
3. **Focused workflow overlaps:** Account Ownership, Reference Upload, Media Upload, Maintenance and Upload Admission all build the app after a fresh install and use hosted Supabase/R2 fixtures; where globs overlap they may duplicate startup/build against the same head. Reference Upload's **push** filter `supabase/migrations/**` is broader than its **PR** filter, enabling postmerge runs on unrelated migration changes.
4. **Scope drift:** W4/W4C explicitly trigger their full repeated-test jobs when only their dated audit Markdown changes. Current MFA is manual-only even though the 30-day historical API shows PR-triggered MFA attempts: use **current YAML for intended triggers**, not historical event counts, when proposing changes.
5. **Cancelled work:** the five core workflows recorded **656 cancelled runs** (178 Portability, 180 CodeQL, 137 Engineering Quality, 107 Unit Coverage, 54 Governance), consistent with rapid PR-head churn. This does not measure how many seconds were saved or wasted per cancellation, but confirms that batching connector commits and avoiding intermediate heads is operationally relevant.

### Cancellation and shared-resource safety

Read [AGENTS.md](../../AGENTS.md) ("GitHub Actions Budget Discipline") and [Infrastructure](../architecture/INFRASTRUCTURE.md): a safe interruption requires independently reconstructible cleanup; **never cancel worker-backed generation, serialized singleton/shared-resource operations, or partially reconstructible R2 fixtures solely to save minutes**.

| Existing behavior | Workflow examples | Decision / safety rationale |
| --- | --- | --- |
| `cancel-in-progress: true` | All five required families; Deployment Readiness; W4/W4C; Database Conformance; Production Documentation Sync | Offline, readonly, or **run-owned disposable PostgreSQL**. Keep exact-head final validation; no shared fixture left dirty. |
| `cancel-in-progress: true` | Reference Upload, Persistent Media Upload | Infrastructure explicitly lists these as **cancellation-safe** based on bounded, reconstructible cleanup. Do **not** generalize this exemption to other R2 jobs. |
| `cancel-in-progress: false` | Account Ownership, Maintenance, Upload Admission; ENT backup/drill; FIBO deploy and production provider-backed audits | Shared hosted fixtures, durable artifacts, ordered release/backup/deploy operations, or external worker lifecycle. **Do not change to true**. |
| No auto-cancellation policy / manual-only | MFA Privileged Step-Up, QA-004/QA-005 and other manual-only workflows where none is declared | No automated cancellation assumed; preserve conservative operator-controlled workflow boundaries. |

The production-adjacent manual workflows have variable **provider/GPU cost not inferable from Actions minutes**. ADR-005's **17 failed of 20** manual run attempts need *failure-stage* and confirmed provider-call review before further deliberate fixtures; raw failure rate alone does not authorize disabling a quality gate or repeating a paid generation.

## Ranked **proposals only** (no changes authorized by this audit)

| Priority | Proposal | Potential benefit and measurement to obtain | Risk / safeguards |
| --- | --- | --- | --- |
| **P1 — highest** | Make **docs-only changes cheap inside** the same required check jobs: evaluate an exact-head, reviewed change classifier, keep six context names and successful status reporting, run governance fully, and omit unrelated installs/tests/builds *only when proven safe*. Do **not** add workflow-level path skips to required contexts. | The three broad Node/test workflows (Quality, Coverage, Portability) account for **~4,288 equivalent minutes** total, an *upper ceiling*, **not realized savings**; savings = their docs-only share × avoidable step time. Measure docs-only PRs by changed-file lists on a future review. | **High**: required-check spoof/skip, generated-file changes, security scan gap, a PR event not carrying stable changed-path metadata. Stage negative tests for docs+lockfile, docs+runtime, migrations, workflow changes, fork/sync events; preserve branch rules and CodeQL security coverage. |
| **P2** | Consolidate **duplicate setup/build/test execution** without deleting any required job: explicit shared cache/artifact keyed by lockfile + exact SHA, selective test ownership (Linux authoritative all-source tests/coverage; Windows remains genuine clean-room validation), and reusable setup steps. | Portability is **~3,206 eq.min**, with redundant Linux work and three total builds across core jobs. Sample real job times before modeling savings. **Do not add P1 and P2 upper bounds together**: they overlap. | **Medium–high**: artifact trust, cross-platform contamination, hidden dependency on another job, lost Windows parity, slower failure feedback. Retain every required context and exact-head proof; do not reuse builds across untrusted commits. |
| **P3** | Retain existing safe `cancel-in-progress` and **batch GitHub writes** into a single cohesive final commit, followed by exact-head checks; avoid amend/fix loops and duplicate manual dispatches. | **656 cancelled core runs** indicate churn; quantify wasted setup seconds by job-level history in a follow-up. Reduces Actions queue even for public free runners. | **Low** if no gate waiver; the final exact head still must be green. Do **not** cancel hosted/shared/producer workflows. |
| **P4** | Audit/reconcile **Reference Upload PR vs main-push migration globs** and overlap among hosted upload/account/maintenance integration workflows; use a shared read-only build only if isolated per run. | Reference Upload consumed **~101 eq.min** (76 runs); hosted fixture resource costs unmeasured. Avoid unrelated migration-triggered postmerge work. | **Medium–high**: missing cross-cutting migration impact and fixture deletion. Keep coverage until an explicit affected-path dependency map and cleanup proof are approved. |
| **P5** | Remove audit-Markdown-only triggering from **W4/W4C** *after* confirming the docs are evidence rather than a test input; retain actual test, helper and workflow file triggers. | Only **~14 eq.min** combined over 21 runs. | **Low–medium**; changing evidence might require regeneration, so keep doc governance and a reviewed evidence-integrity rule. |
| **P6 — preserve** | **Do not consolidate, auto-cancel, silently skip, or broaden** provider-backed production proof, deployment, ENT recovery, QA-002–005 or Production Documentation Sync. Instead track future runs' provider-call counts/fixtures/cleanup outcome beside Actions IDs and follow current explicit approvals. | Potential **vendor spend** visibility, *not* proven runner-minutes savings. Production ADR-005's 85% noncancelled failure rate warrants operator diagnosis before any rerun. | **High** external state, GPU charges, partial fixtures and release qualification; existing contracts and manual confirmations remain intact. |

### Next measurement gate before implementation

- [ ] Obtain authorized read-only organization billing/usage export (if available) and run-level **actual job start/end** for a statistically defensible sample; do not infer account invoice from public-repo runner equivalents.
- [ ] Count docs-only vs mixed PR changes and classify cancellation causes; validate duplicate-job execution on a matched SHA.
- [ ] Prove a required-check-preserving matrix for docs-only, workflow, migration, lockfile and runtime changes; confirm live branch protection with an authorized admin reader before changing triggers.
- [ ] Determine fixture-specific costs **from provider billing records**, without running a new provider generation; verify that all production/backup/cleanup workflows remain cancellation safe according to their present semantics.
- [ ] Open separately approved workflow-specific proposals, with tests, a rollback strategy and the normal exact-head checks. **This audit PR makes no workflow or runtime changes.**
