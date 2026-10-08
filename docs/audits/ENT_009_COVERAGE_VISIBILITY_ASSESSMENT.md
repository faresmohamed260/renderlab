# ENT-009 - Conventional unit coverage visibility enterprise reassessment

Date: 2026-10-07
Status: AUTHORITATIVE POST-ENT-009 ASSESSMENT / VERIFIED / MERGED / NOT DEPLOYED
Implementation PR: #360
Implementation head: `657522dfcd9dfcbdc92d710ec082a62d9fca040e`
Implementation merge: `6a4e91973aa0870dfa75b840b28d6860a60825a5`
Previous authoritative score: **8.8/10** after ENT-008
Current authoritative score: **8.8/10**

## Executive result

ENT-009 closes RenderLab's conventional unit-coverage **visibility** gap without claiming broad new test execution. The repository now owns a repeatable Node-24 all-source unit coverage command, a fail-closed denominator/integrity verifier, bounded machine-readable CI evidence, and explicit documentation separating Node unit coverage from the existing browser/configured/provider acceptance matrix.

The measured baseline is intentionally sobering: 172 of 184 eligible product-source files currently have zero line coverage in the Node unit suite. That is useful evidence, not a reason to reinterpret the independent configured workflows as unit coverage or to hide difficult source from the denominator. The same 18-category rubric used by ENT-008 yields an arithmetic mean of **8.81/10**, which still rounds to the authoritative score of **8.8/10**. The gain is concentrated in automated-testing evidence and documentation/onboarding; runtime architecture, product behavior, security, operations, performance, and disaster-recovery capability are unchanged.

## Same-rubric scorecard

| Category | ENT-008 | ENT-009 | Rationale |
| --- | ---: | ---: | --- |
| Architecture | 8.9 | 8.9 | Repository-only validation layer; application/runtime topology is unchanged. |
| Code quality & maintainability | 8.9 | 8.9 | Coverage makes risk visible but does not decompose large modules or consolidate duplicated workflows. |
| Type safety & correctness | 9.1 | 9.1 | No type-system or product-contract change. |
| Automated testing | 9.1 | **9.2** | All-source unit coverage, fail-closed denominator verification, retained JSON/LCOV evidence, and exact-merge reproduction add truthful measurement; actual Node-unit breadth remains low. |
| Frontend engineering | 8.4 | 8.4 | No product UI/source behavior change. |
| Backend/API engineering | 8.9 | 8.9 | No backend/API behavior change. |
| Database/data modelling | 8.8 | 8.8 | No database/schema change. |
| Authentication/identity | 8.6 | 8.6 | No Auth/session behavior change. |
| Application security | 9.2 | 9.2 | Existing security gates remain intact; coverage tooling is secret-free and least-privilege. |
| Dependency/supply-chain | 9.3 | 9.3 | `c8@12.0.0` is exact dev-only lockfile state; runtime dependencies are unchanged. |
| CI/CD & release safety | 9.5 | 9.5 | Unit Coverage is least-privilege and safely cancellable, but release/deployment behavior is unchanged. |
| Developer experience/local reproducibility | 8.5 | 8.5 | ENT-008 portability boundary is preserved; the new local coverage command is additive rather than a portability change. |
| Observability & operations | 8.9 | 8.9 | No operational-runtime change. |
| Performance | 8.0 | 8.0 | No performance/capacity baseline or budget work. |
| Reliability/resilience | 8.9 | 8.9 | Runtime reliability is unchanged. |
| Disaster recovery/business continuity | 7.5 | 7.5 | Recovery capability is unchanged; managed PITR/provider independence/repeated objective evidence remain future work. |
| Documentation/onboarding | 8.9 | **9.0** | README/CONTRIBUTING, architecture, status and audit docs now explain the coverage command, denominator, artifacts and interpretation boundary. |
| Product/admin readiness | 9.0 | 9.0 | No product/admin surface change. |

Arithmetic mean: **8.81**, authoritative rounded score **8.8/10**.

## Verified implementation evidence

- PR #360 final exact head `657522dfcd9dfcbdc92d710ec082a62d9fca040e` passed every attached check before merge. Unit Coverage `37666725572`, Engineering Quality `37666725574`, CodeQL `37666725658`, and Developer Portability `37666725517` were green; both portability clean-room jobs passed.
- Infrastructure-only Chromium dependency-install cancellations in Account Identity, Integrated Release, and Creative Iteration were retried without changing the PR head. Their unchanged reruns completed the actual configured product verification and cleanup successfully; no validation requirement was weakened.
- PR #360 squash-merged as `6a4e91973aa0870dfa75b840b28d6860a60825a5`.
- Merged-main Unit Coverage `37673099294` passed on the exact merge SHA under Node 24.21.0 / npm 11.19.0 with **102/102 tests** and the same report-integrity boundary: **184 eligible tracked product-source files**, **172 at zero line coverage**.
- The exact merged baseline is **5.54% statements / 5.54% lines (1,295/23,357), 24.16% functions (58/240), and 56.31% branches (290/515)**. Zero-line distribution is `src/app` 57/57, `src/components` 18/18, `src/features` 37/37, `src/lib` 18/22, and `src/server` 42/50.
- Merged-main artifact `11504874549` contains only normalized `coverage-summary.json` and `lcov.info`, is 19,253 bytes, has SHA-256 `8b8b6d4f999ce6d581c0cefe42b9fb5eb8aff063a9d1a56d3418d7c434e3b0e4`, and is retained for 14 days.
- Merged-main Engineering Quality `37673099400`, CodeQL `37673099281`, and Developer Portability `37673099239` passed on the exact merge SHA; Developer Portability passed both `clean-room (ubuntu-latest)` and `clean-room (windows-latest)`.

## Interpretation boundary

1. **This is Node unit coverage, not whole-system coverage.** Browser/Playwright, configured shared-resource, provider-backed, release-candidate and production workflows remain separate evidence layers.
2. **Zero-covered files stay visible.** The integrity verifier compares the report to tracked eligible source and fails if the denominator silently narrows or a known zero-import source disappears.
3. **No arbitrary threshold was introduced.** ENT-009 records the baseline before deciding whether later non-regression thresholds or targeted unit-test expansion are justified.
4. **Low unit coverage is actionable risk, not a synthetic grade.** 172/184 eligible files at zero line coverage means future maintainability/test work has a concrete map; it does not erase the strong independent integration/configured acceptance matrix.
5. **Coverage evidence is bounded and secret-free.** The workflow uses `contents: read`, no production/shared-resource credentials, and retains only normalized summary/LCOV files.

## Remaining enterprise ceilings

1. **disaster-recovery maturity (7.5)** - managed physical/PITR recovery, provider/account independence and repeated objective evidence remain below mature-enterprise posture;
2. **performance evidence (8.0)** - no dedicated performance/capacity baseline phase has established broader product budgets or regression evidence;
3. **workflow/module maintainability** - duplicated CI mechanics and large mixed-responsibility modules continue to raise change cost;
4. **Node-unit breadth** - the new baseline shows 172/184 eligible files at zero line coverage, so targeted unit-test expansion and later evidence-based non-regression thresholds remain legitimate follow-on work.

The most practical repository-local next phase is workflow/module maintainability because ENT-009 now provides the measurement needed to avoid confusing structural cleanup with coverage improvement. Performance evidence and higher-maturity DR remain valid alternatives when those scopes are explicitly authorized.

## Deployment status

**NOT DEPLOYED.** ENT-009 changes repository tooling, tests, CI and developer documentation only. It does not deploy application source, move a Vercel alias, mutate Supabase/R2 resources, change provider routing, add secrets, or alter production configuration. Production remains the exact source recorded by the four `RENDERLAB_CURRENT_PRODUCTION_SHA` authorities.
