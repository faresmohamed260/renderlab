# ENT-002 — CI and supply-chain hardening reassessment

Date: 2026-10-05
Status: post-implementation assessment / superseded for current dependency baseline by ENT-003
Current follow-on assessment: `ENT_003_NEXTJS_SECURITY_PATCH_ASSESSMENT.md` (8.2/10 after Next.js 16.3.8 security patch)
Implementation PR: #330
Implementation merge: `99a8db8c8038262114d5b5da535cf2e7dea56ad1`
Prior authoritative score: **8.1/10** after ENT-001

## Executive result

ENT-002 closes three of the highest-value post-ENT-001 CI/supply-chain findings without changing application runtime behavior, product UX, shared Supabase/R2 topology, provider routing, secrets, scheduler state, or production deployment.

The verified repository now has:

- deterministic root dependency installation through `npm ci --no-audit --no-fund` across applicable GitHub Actions workflows;
- immutable 40-character commit-SHA pins for every current external GitHub Action reference in `.github/workflows`;
- readable major-version comments beside the reviewed pins;
- monthly Dependabot maintenance for the `github-actions` ecosystem retained;
- dedicated CodeQL JavaScript/TypeScript analysis on pull requests and `main` pushes;
- Engineering Quality regression checks that reject executable workflow `npm install`, non-immutable external action references, removal of Dependabot GitHub Actions maintenance, or drift in the CodeQL language/permission contract.

My conservative post-ENT-002 enterprise-engineering assessment is **8.2/10**, up from **8.1/10** after ENT-001 and **7.8/10** at the original audit baseline.

The increase is intentionally small. ENT-002 materially improves software-supply-chain integrity and CI reproducibility, but it does not address the current lowest-scoring enterprise areas: operations/disaster recovery, observability, maintainability, developer portability, conventional coverage measurement, or the remaining request-admission/origin-security controls.

> This assessment is for repository state. ENT-002 was not deployed and contains no application/runtime behavior change, so there is no production rollout to credit.

## What changed

### Deterministic workflow installs

Applicable workflows now consume the checked-in root lockfile with `npm ci --no-audit --no-fund` instead of mutable `npm install` resolution. The existing Node versions, cache configuration, workflow inputs, fixture ownership, cleanup semantics, and verification commands were preserved.

Engineering Quality now scans the workflow estate and fails if executable `npm install` is reintroduced.

### Immutable GitHub Action references

Current external Actions were pinned to reviewed immutable commits while retaining human-readable major-version comments:

- `actions/checkout` v4 → `11d5960a326750d5838078e36cf38b85af677262`;
- `actions/setup-node` v4 → `49933ea5288caeca8642d1e84afbd3f7d6820020`;
- `actions/setup-python` v5 → `a26af69be951a213d495a4c3e4e4022e16d87065`;
- `actions/upload-artifact` v4 → `ea165f8d65b6e75b540449e92b4886f43607fa02`;
- `github/codeql-action` v4 → `2892aa5e19bbd11bc0cff5427e3b750a04d9e3c2`.

Dependabot's existing monthly `github-actions` stream remains enabled so the immutable references can still receive reviewable maintenance updates.

### CodeQL

A dedicated least-privilege CodeQL workflow now analyzes JavaScript/TypeScript on pull requests and protected-main pushes. It grants `contents: read` and `security-events: write`, without unrelated repository write permissions.

### Regression enforcement

`scripts/verify-engineering-quality.mjs` now statically verifies:

- no executable workflow line contains `npm install`;
- external workflow actions use full 40-character SHA revisions unless they are repository-local or `docker://` references;
- `.github/dependabot.yml` retains the `github-actions` ecosystem;
- the CodeQL workflow targets `javascript-typescript`;
- CodeQL retains the required `security-events: write` publication permission.

## Verification evidence

The exact implementation head was `8ea553579c801d25fb3de23739d4d53803020851`.

At that head:

- local lint passed with the repository's existing **17 warnings / 0 errors**;
- local TypeScript checking passed;
- local production build passed;
- static workflow audit reported **0 executable `npm install`** and **0 unpinned external actions**;
- `git diff --check` passed;
- exact-head **Engineering Quality** passed;
- exact-head **CodeQL JavaScript/TypeScript** passed;
- the release-candidate matrix and its exact-SHA children completed successfully;
- all **68** same-head workflow runs, including provider-backed Video Generation Integration, completed successfully with **0 failures**.

PR #330 squash-merged as `99a8db8c8038262114d5b5da535cf2e7dea56ad1`.

Merged-main verification on that exact SHA also passed:

- Engineering Quality run `37289968963` — success;
- CodeQL run `37289968955` — success.

The protected `main` branch still requires the `quality` check.

No application code, Supabase schema/RLS/Auth policy, Cloudflare R2 resource configuration, provider/worker routing, secrets, scheduler, or production deployment changed in ENT-002.

## Before/after scorecard

| Area | Post ENT-001 | Post ENT-002 | Change | Reason |
|---|---:|---:|---:|---|
| Architecture | 8.8 | 8.8 | — | Runtime architecture intentionally unchanged. |
| Authentication / identity | 9.1 | 9.1 | — | No auth changes. |
| Authorization / ownership | 8.8 | 8.8 | — | Owner/service-role boundaries preserved. |
| Database security | 8.8 | 8.8 | — | No schema/RLS/RPC change. |
| Generation lifecycle | 9.2 | 9.2 | — | Durable lifecycle preserved and reverified. |
| API/input contracts | 8.7 | 8.7 | — | No request-contract change. |
| Media/storage integrity | 8.5 | 8.5 | — | ENT-001 media boundary preserved. |
| Dependency security | 8.8 | **9.3** | +0.5 | External Actions are immutable-SHA pinned, Dependabot maintenance remains enabled, and JS/TS CodeQL is active. |
| Application security hardening | 8.3 | 8.3 | — | Same-origin mutation defense remains open. |
| CI/CD | 8.0 | **8.7** | +0.7 | Applicable workflows use deterministic lockfile installs and regression guards prevent supply-chain/install drift. Workflow duplication remains. |
| Automated testing / verification | 8.3 | **8.4** | +0.1 | CodeQL adds repository-wide security analysis; conventional coverage measurement is still absent. |
| Frontend engineering | 8.0 | 8.0 | — | No frontend architecture work. |
| Maintainability | 6.9 | 6.9 | — | Large modules, workflow count, and historical documentation volume remain. |
| Developer experience | 7.1 | 7.1 | — | Cross-platform EOL/dev parity remains open. |
| Observability | 6.7 | 6.7 | — | No durable telemetry backend or alerting work. |
| Operations / DR | 6.1 | 6.1 | — | No restore exercise, RPO/RTO, or incident runbook work. |
| Documentation | 7.8 | **8.0** | +0.2 | The current CI/supply-chain contract, verification evidence, and scorecard are now explicit repository truth. |
| Release governance | 8.0 | **8.2** | +0.2 | Immutable workflow dependencies and exact-head + merged-main CodeQL strengthen release qualification. |

The arithmetic mean moves from approximately **8.11** to **8.20**, supporting the rounded overall reassessment of **8.2/10**.

## Remaining weak points

### P1 — highest-value next work

1. **Upload admission / abuse controls** — cap concurrent pending upload sessions per account and rate-limit upload-ticket creation; consider retained-storage quotas separately.
2. **Centralized same-origin mutation defense** — enforce an Origin / `Sec-Fetch-Site` policy for cookie-authenticated state-changing routes without breaking legitimate same-origin browser flows or internal authenticated automation.
3. **Explicit server-only module boundaries** — add `server-only` to secret/data-bearing modules where it provides a real build-time boundary.
4. **Cross-platform test/dev parity** — normalize EOL behavior, add `.gitattributes`, and document one supported local development mode.
5. **Coverage measurement** — publish line/function/branch coverage and establish realistic gates only after measuring the baseline.
6. **Persistent observability** — route existing structured diagnostics to a durable telemetry backend with actionable alerting.
7. **Operations / disaster recovery** — document and exercise provider outage, credential compromise, backup/restore verification, RPO/RTO, and escalation assumptions.
8. **CI maintainability** — deterministic installs are closed, but the repository still has a large workflow estate; extract reusable setup/workflow blocks only where this can be done without weakening fixture isolation or cancellation safety.

### P2 — maintenance cost reduction

- decompose `create-workspace.tsx` into smaller state/reference/submit/result controllers plus composition;
- split native generation input preparation, routing/transport, normalization, and finalization;
- reduce global CSS to genuinely global concerns;
- continue separating current architecture truth from ADR/history/audit evidence;
- add CODEOWNERS/review governance when a second maintainer meaningfully joins.

## Repository hygiene note

A separate repository-hygiene cleanup immediately before ENT-002 removed **373 obsolete remote branches** from a verified 376-branch starting state, leaving `main` plus the two legitimate active draft heads. That cleanup is useful operationally but is **not credited to the ENT-002 score**, because it was not part of PR #330's implementation scope.

## Enterprise interpretation

RenderLab's CI now has substantially stronger reproducibility and software-supply-chain controls. The project no longer relies on floating major Action tags or `npm install` resolution in normal repository workflows, and JavaScript/TypeScript code scanning is now part of pull-request and protected-main verification.

The remaining enterprise ceiling is no longer primarily the CI supply chain. It is now concentrated in **operations/DR (6.1), observability (6.7), maintainability (6.9), developer experience (7.1), request-admission/origin security, and missing coverage visibility**.

The next hardening phase should therefore avoid further CI churn and target the highest-risk application boundary still open: **upload admission abuse controls plus centralized same-origin mutation defense**, followed by developer parity/coverage and then durable observability/DR. Large-module decomposition should remain after those reliability and security controls unless a specific module becomes an active delivery blocker.
