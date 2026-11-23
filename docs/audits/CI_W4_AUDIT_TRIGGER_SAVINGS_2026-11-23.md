# CI P5 — prevent W4/W4C audit-Markdown-only reruns

**Date:** 2026-11-23. **Source baseline:** [30-day CI cost and workflow audit](CI_WORKFLOW_COST_AUDIT_2026-11-23.md) at `50473eb5`. **Change scope:** two **optional** test workflow `pull_request.paths` filters; no protected check name, production verification flow, permission, secret, concurrency setting, provider call or application code changed.

## Before / after measurement and evidence boundaries

| Measure | Before this PR | After this PR | Evidence |
| --- | --- | --- | --- |
| W4/W4C workflows matching an **audit-Markdown-only** changed path | 1 per corresponding W4/W4C audit file | **0** | Exact YAML path-filter diff and [unit regression](../../tests/unit/ci-w4-audit-triggers.test.mjs) |
| W4/W4C workflows matching own tests/helpers/workflow YAML | Both preserve own watched paths | **Unchanged** | YAML path-filter diff + unit regression |
| Six protected context names + CodeQL | All always run on every PR | **Unchanged** | [protected policy](../governance/github-protection.json), exact required workflow definitions |
| Historical W4 runs / equivalent runner-minutes (past 30 calendar dates) | 11 runs / ~8 eq.min, mean 0.67 min, p95 1.5 | Not yet comparable | [audit history](CI_WORKFLOW_COST_AUDIT_2026-11-23.md) |
| Historical W4C runs / equivalent runner-minutes (same dates) | 10 runs / ~6 eq.min, mean 0.56 min, p95 1.0 | Not yet comparable | Same audit |
| **Realized billable minutes or vendor savings** | No evidence of positive billed minutes | **Not measurable yet** | Public-repository audit: sampled GitHub billable minutes were zero; worker/provider invoice unavailable |

**Impact interpretation:** the 21 historical W4/W4C runs (~14 equivalent minutes) cover **all** triggering file changes, not just audit-only changes. Therefore 14 minutes is an **absolute upper bound**, not a realized or expected saving. For one future **audit-only** PR, this removes its optional W4 or W4C run (historical mean about 0.67 or 0.56 minutes per run respectively) while all required contexts, CodeQL and docs governance remain. No savings is claimed for ordinary test-change PRs.

## Safety proof and rollback

Reviewed actual [W4](../../tests/helpers/w4-determinism.mjs) / [W4C](../../tests/helpers/w4c-determinism.mjs) deterministic test runners and their [coverage](../../tests/helpers/w4-coverage-report.mjs) / [coverage](../../tests/helpers/w4c-coverage-report.mjs) reports: none reads the dated audit Markdown files as test inputs; they read unit test modules and generated coverage. The dated Markdown evidence remains governed by Documentation Governance on every PR. New static test asserts both workflows still watch their tests, helpers and workflow YAML and retain safe cancellation. The workflows themselves are non-production, opt-in path-filtered and not branch-protection required contexts.

**Rollback:** restore the two evidence Markdown paths in the individual workflow `pull_request.paths` arrays if subsequent audit evidence is found to be executable test input; rerun exact-head required checks/CodeQL. Avoid toggling any protected/production workflow. **Follow-up measurement:** on the next naturally occurring audit-Markdown-only PR, compare the exact change list and actual Actions workflow runs with this filter; no artificial PR or manual workflow dispatch is justified solely for a usage metric.

**Deferred higher-risk proposals:** required-check docs-only short-circuit and shared build artifacts from the audit are *not* implemented here. They need a positive/negative exact-head classifier matrix and cross-OS/source trust proofs before being safe.
