# ENT-008 — Developer portability and clean-room reproducibility enterprise reassessment

Date: 2026-10-07
Status: AUTHORITATIVE POST-ENT-008 ASSESSMENT / VERIFIED / MERGED / NOT DEPLOYED
Implementation PR: #356
Implementation head: `82bcf35d7d5ce3f5d3b8309f12457fae9a582d15`
Implementation merge: `e6ea8210c47a2d49531daaa0cd80f7267ff488f4`
Previous authoritative score: **8.7/10** after ENT-007
Current authoritative score: **8.8/10**

## Executive result

ENT-008 closes RenderLab's concrete clean-room portability gap without changing product/runtime behavior. The repository now declares one supported Node 24.x / npm 11.x engineering boundary, owns LF checkout independently of developer Git defaults, runs workflow/configuration contract assertions with newline-neutral semantics, executes Engineering Quality negative fixtures without Windows `.cmd` shims, and proves the full credential-free quality/build path from fresh GitHub-hosted Ubuntu and Windows checkouts.

The same 18-category rubric used by ENT-007 yields an arithmetic mean of exactly **8.80/10**, supporting the rounded authoritative score of **8.8/10**. The uplift is intentionally concentrated in developer experience/local reproducibility, with smaller evidence-backed gains in automated testing, CI/CD safety, and documentation/onboarding. It does not claim macOS verification, containerized development parity, configured-provider portability, conventional coverage measurement, workflow consolidation, or module-decomposition improvements.

## Same-rubric scorecard

| Category | ENT-007 | ENT-008 | Rationale |
| --- | ---: | ---: | --- |
| Architecture | 8.9 | 8.9 | Tooling-only phase; application/runtime topology is unchanged. |
| Code quality & maintainability | 8.9 | 8.9 | Portable invocation and test semantics improve tooling correctness, but large-module/workflow maintainability debt remains. |
| Type safety & correctness | 9.1 | 9.1 | No type-system/product-contract change. |
| Automated testing | 9.0 | **9.1** | The complete secret-free gate now executes from fresh Ubuntu and Windows checkouts; newline-sensitive production-workflow contracts are equivalent across OSes. |
| Frontend engineering | 8.4 | 8.4 | No product UI/source change. |
| Backend/API engineering | 8.9 | 8.9 | No backend/API behavior change. |
| Database/data modelling | 8.8 | 8.8 | No database/schema change. |
| Authentication/identity | 8.6 | 8.6 | No Auth/session behavior change. |
| Application security | 9.2 | 9.2 | Existing security boundaries remain; the workflow-contract assertions are no longer accidentally weaker under CRLF. |
| Dependency/supply-chain | 9.3 | 9.3 | Exact package manager, lockfile, immutable Actions pins and deterministic `npm ci` policy are preserved. |
| CI/CD & release safety | 9.4 | **9.5** | Least-privilege Ubuntu + Windows clean-room verification now guards the secret-free repository path in addition to existing exact-head release discipline. |
| Developer experience/local reproducibility | 6.8 | **8.5** | Node/npm preflight, canonical LF checkout, native-Windows subprocess portability, secret-free docs, and fresh Windows/Linux matrix directly close the reproduced gaps. macOS and configured/live integration portability remain outside the verified boundary. |
| Observability & operations | 8.9 | 8.9 | No operational-runtime change. |
| Performance | 8.0 | 8.0 | No product/runtime performance work. |
| Reliability/resilience | 8.9 | 8.9 | Runtime reliability is unchanged. |
| Disaster recovery/business continuity | 7.5 | 7.5 | ENT-007 recovery capability is unchanged; managed PITR/provider independence/repeated objective evidence remain future work. |
| Documentation/onboarding | 8.7 | **8.9** | README/CONTRIBUTING and architecture/status handoff now define the supported toolchain, OS boundary, LF policy, secret-free commands and configured-workflow separation. |
| Product/admin readiness | 9.0 | 9.0 | No product/admin surface change. |

Arithmetic mean: **8.80**, authoritative rounded score **8.8/10**.

## Verified implementation evidence

- PR #356 exact head `82bcf35d7d5ce3f5d3b8309f12457fae9a582d15` passed **27/27 attached checks**.
- Developer Portability run `37654689761` passed both `clean-room (ubuntu-latest)` and `clean-room (windows-latest)` with Node 24. Each fresh checkout ran `npm run doctor`, `npm run verify:text-policy`, deterministic `npm ci --no-audit --no-fund`, lint, typecheck, all unit tests, Engineering Quality negative fixtures, Modal ownership verification, UI purity and production build without shared-resource credentials.
- Exact-head Engineering Quality `37654689460` and CodeQL `37654689450` passed. All package-triggered configured regressions also passed, including Generation Admission `37654689427` with cleanup.
- On native WANDA before hosted acceptance, the implementation fixed the reproduced Windows failure: lint, typecheck, **97/97** unit tests, Engineering Quality, Modal ownership, UI purity and production build passed. `npm run doctor` correctly rejected unsupported Node `25.2.1`.
- A fresh WANDA checkout under machine-wide `core.autocrlf=true` reported **524 tracked text files as LF/LF** and **35 binary files as non-text**; `npm run verify:text-policy` passed. This proves repository attributes, rather than the developer's global Git setting, own the checkout semantics.
- PR #356 squash-merged as `e6ea8210c47a2d49531daaa0cd80f7267ff488f4`.
- Merged-main Engineering Quality `37655904404`, CodeQL `37655904054`, and Developer Portability `37655903920` all passed on that exact merge SHA; the portability run again passed both Ubuntu and Windows clean-room jobs.
- GitHub experienced a same-day Git Operations/Pull Requests/Actions incident and the merge API transiently returned HTTP 500 after verification; the head remained unchanged and `CLEAN`, and the guarded squash merge succeeded once the endpoint recovered. No validation was weakened or rerun via a changed head to work around the service issue.

## Durable developer boundary after ENT-008

1. **Supported toolchain:** Node 24.x + npm 11.x. `packageManager` remains `npm@11.6.2`; `.nvmrc`, engines, docs, `doctor`, and CI agree.
2. **Supported verified OSes:** native Windows and Linux; WSL2 follows the Linux path. macOS remains expected-compatible but unverified as an ENT-008 exit platform.
3. **Repository text semantics:** tracked text is LF through `.gitattributes`; binary media is non-text; `verify:text-policy` fails on index/worktree/attribute drift.
4. **Secret-free bootstrap/quality:** doctor, text policy, install, lint, typecheck, unit tests, Engineering Quality, Modal ownership, UI purity and production build require no production/shared-resource credentials.
5. **Configured work stays separate:** Playwright/provider/shared Supabase/R2/production workflows retain their existing credentials, fixtures, cleanup and authorization requirements.
6. **Portable negative fixtures:** Oxlint and TypeScript are invoked through `process.execPath` plus their package JavaScript entrypoints, not platform package shims or unbounded shell strings.

## Remaining enterprise ceilings

ENT-008 removes developer portability as the lowest score category. The material remaining gaps are now:

1. **disaster-recovery maturity (7.5)** — managed physical/PITR recovery, provider/account independence and repeated objective evidence remain below mature-enterprise posture;
2. **performance evidence (8.0)** — no dedicated performance/capacity baseline phase has established broader product budgets or regression evidence;
3. **conventional coverage visibility** — the test/workflow matrix is broad, but line/function/branch coverage measurement and trend/baseline visibility remain absent;
4. **maintainability** — workflow duplication and large mixed-responsibility modules continue to raise change cost even though current correctness gates are strong.

The next phase should be selected from those verified gaps rather than expanding ENT-008. Coverage visibility remains a practical candidate because it is actionable within the current repository boundary, while stronger DR maturity may require provider/plan decisions and repeated operational evidence.

## Deployment status

**NOT DEPLOYED.** ENT-008 changes repository tooling, tests, CI and developer documentation only. It does not deploy application source, move a Vercel alias, mutate Supabase/R2 resources, change provider routing, add secrets or alter production configuration. Production remains the exact source recorded by the four `RENDERLAB_CURRENT_PRODUCTION_SHA` authorities.
