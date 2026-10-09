# ENT-010 - CI workflow maintainability enterprise reassessment

Date: 2026-10-09
Status: AUTHORITATIVE POST-ENT-010 ASSESSMENT / VERIFIED / MERGED / PRODUCTION-LIVE VIA CUMULATIVE 2026-10-09 ROLLOUT
Implementation PR: #364
Implementation head: `cfbffdb3725f2dd1d862e1a12bccda13d7124b4c`
Implementation merge: `4b38c0d17ff2e03683f5bb160ba5ded2b6d81588`
Previous authoritative score: **8.8/10** after ENT-009
Current authoritative score: **8.8/10**

## Executive result

ENT-010 closes the first bounded CI-workflow-maintainability slice without flattening the distinct fixture, secret, cleanup or concurrency contracts that make RenderLab's configured acceptance trustworthy. Four representative configured workflows now share one secret-free local Node/npm setup action and one fixed-command loopback startup helper. Engineering Quality treats local actions as supply-chain code, scans immutable external action pins in both workflow and local-action trees, and fails closed when the migrated cohort loses required trigger, verifier, cleanup, artifact, secret or protected-concurrency semantics.

The phase improves maintainability and auditability rather than product capability. No `src/**` application/runtime source changed, and no schema/Auth/storage/provider routing or production configuration changed. Large mixed-responsibility product modules remain, the Node-unit baseline remains intentionally sparse, no dedicated performance/capacity evidence was added, and disaster-recovery maturity remains below managed-PITR/provider-independent targets. The same 18-category rubric yields an arithmetic mean of **8.82/10**, which keeps the authoritative rounded score at **8.8/10**.

The subsequent cumulative production rollout strengthens evidence that the scored release-safety, operational and reliability controls work in practice, but it does not add a new control or close any remaining rubric ceiling. Reapplying the same rubric after deployment therefore leaves every category score unchanged: **158.8 / 18 = 8.82**, authoritative **8.8/10**.

## Same-rubric scorecard

| Category | ENT-009 | ENT-010 | Rationale |
| --- | ---: | ---: | --- |
| Architecture | 8.9 | 8.9 | CI plumbing is better bounded; application/runtime topology is unchanged. |
| Code quality & maintainability | 8.9 | **9.0** | Repeated setup/startup mechanics moved behind small audited boundaries while caller-owned workflow semantics remain explicit; large application modules remain. |
| Type safety & correctness | 9.1 | 9.1 | No type-system or product-contract change. |
| Automated testing | 9.2 | 9.2 | 109 Node tests now include startup/CI negative coverage, while the broader testing posture and low product-source unit breadth remain unchanged. |
| Frontend engineering | 8.4 | 8.4 | No product UI/source behavior change. |
| Backend/API engineering | 8.9 | 8.9 | No backend/API behavior change. |
| Database/data modelling | 8.8 | 8.8 | No database/schema change. |
| Authentication/identity | 8.6 | 8.6 | No Auth/session behavior change. |
| Application security | 9.2 | 9.2 | Existing security controls remain intact; the new helper/action are credential-agnostic and bounded. |
| Dependency/supply-chain | 9.3 | **9.4** | Immutable external-action SHA enforcement now explicitly covers repository-local composite actions as well as workflow YAML. |
| CI/CD & release safety | 9.5 | 9.5 | Configured fixture/concurrency/cleanup protections are preserved and machine-checked; release/deployment mechanics themselves are unchanged. |
| Developer experience/local reproducibility | 8.5 | 8.5 | ENT-008 portability remains intact; this phase reduces CI maintenance cost rather than local-runtime friction. |
| Observability & operations | 8.9 | 8.9 | No operational-runtime change. |
| Performance | 8.0 | 8.0 | No performance/capacity baseline or budget work. |
| Reliability/resilience | 8.9 | 8.9 | Runtime reliability is unchanged; configured acceptance remained green after migration. |
| Disaster recovery/business continuity | 7.5 | 7.5 | Recovery capability is unchanged. |
| Documentation/onboarding | 9.0 | 9.0 | Architecture and phase authorities now document the CI ownership boundary; overall score remains mature. |
| Product/admin readiness | 9.0 | 9.0 | No product/admin surface change. |

Arithmetic mean: **8.82**, authoritative rounded score **8.8/10**.

## Verified implementation and merged-main evidence

- PR #364 exact head `cfbffdb3725f2dd1d862e1a12bccda13d7124b4c` passed Engineering Quality `37852283336`, Unit Coverage `37852284599`, Developer Portability `37852283459`, CodeQL `37852284568`, Create Lifecycle Visual `37852283452`, Activity Visual `37852283481`, Library Lifecycle Visual `37852284476`, and Account Identity Visual `37852283390`.
- The implementation squash-merged as `4b38c0d17ff2e03683f5bb160ba5ded2b6d81588`.
- Merged-main Engineering Quality `37857367143`, Unit Coverage `37857367162`, Developer Portability `37857367142`, and CodeQL `37857367144` all passed on the exact merge SHA; portability passed both clean-room operating systems.
- Exact-main configured closure runs passed: Create `37857410281`, Activity `37857413881`, Account Identity `37857420956`, and Library `37857417090`. Library attempt 1 timed out only on the existing visible-status assertion after fixture activity and still completed cleanup; unchanged attempt 2 passed the full verifier and cleanup on the same merge SHA.
- Engineering Quality now scans `.github/workflows/**` and `.github/actions/**` external `uses:` references for immutable 40-character SHA pins and verifies the ENT-010 cohort contract.
- The local setup action remains limited to Node 24, npm cache and `npm ci --no-audit --no-fund`; the startup helper remains fixed-command, loopback-only, bounded and credential-free.

## Interpretation boundary

1. **This is maintainability hardening, not a product rewrite.** The four workflow callers retain their own secrets, fixtures, health targets, verifiers, cleanup, artifacts and scheduling semantics.
2. **The abstraction is deliberately small.** ENT-010 does not authorize a generic fixture-owning mega-workflow or migration of all workflow files.
3. **A rerun did not erase failure evidence.** The first merged-main Library attempt is retained as a timing failure with successful cleanup; the unchanged second attempt proves the same exact code can satisfy the original assertion.
4. **Node-unit breadth did not suddenly improve.** The source denominator remains the ENT-009 baseline: 184 eligible product-source files with 172 at zero line coverage; ENT-010's extra tests target repository tooling.
5. **Production status is now reconciled.** ENT-010 repository closure preceded the separately authorized cumulative production rollout. Exact application source `bcb2de305b15f4be15ed42674d22998c30b8c811` is now production-live, while later docs-only repository commits remain newer than the deployed application SHA by design.

## Post-closure production verification

- Repository closure PR #365 merged the assessed source as `bcb2de305b15f4be15ed42674d22998c30b8c811`. Exact-source release qualification then passed Engineering Quality `37858427171`, Unit Coverage `37858427155`, CodeQL `37858427128`, Developer Portability `37858427152`, Deployment Readiness `37858668167`, and Release Candidate Matrix `37858664995` attempt 2 with 23/23 configured child successes. Attempt 1's only blocker was a transient provider-status 503 in Video Generation Integration; the unchanged same-SHA rerun passed before the full second matrix passed.
- READY Vercel deployment `dpl_4E38yZarWfooA4wfEuW5USmPnNsN` was built directly from exact Git SHA `bcb2de305b15f4be15ed42674d22998c30b8c811`. The custom domain remained on the previous known-good deployment until READY, then explicit cutover passed signed-out smoke for root, Create, Library, Activity, Settings, Password, Profile and Preferences; signed-out Admin remained concealed as 404.
- Bounded post-cutover inspection found no runtime-error clusters and no error/fatal logs for the new deployment. No Supabase schema/RLS/Auth-policy, R2 resource configuration, provider/worker routing, scheduler or production environment-variable mutation accompanied the rollout.
- Production-authority synchronization PR #366 merged as docs-only `0b8110976d87ffa1e73e9340d3001386ab81f21f`. Permanent Production Documentation Sync run `37863995081` passed against expected deployed SHA `bcb2de305b15f4be15ed42674d22998c30b8c811`, followed by merged-main Engineering Quality `37863953014`, Unit Coverage `37863953061`, CodeQL `37863953010`, and Developer Portability `37863952997`.
- **Same-rubric result after rollout: unchanged.** The deployment validates previously scored controls but introduces no new architectural, testing, performance, DR, observability or product-readiness capability. Category scores therefore remain exactly those in the table above, arithmetic mean **8.82/10**, authoritative **8.8/10**.

## Remaining enterprise ceilings

1. **Disaster-recovery maturity (7.5)** - managed physical/PITR recovery, provider/account independence and repeated objective evidence remain below mature-enterprise posture.
2. **Performance evidence (8.0)** - no dedicated performance/capacity baseline, product budgets or regression evidence has been established.
3. **Application-module maintainability** - CI duplication is reduced, but large mixed-responsibility modules remain: `create-workspace.tsx` 1,306 lines, `native-generation.ts` 939, `account-data-lifecycle.ts` 763 and `library-batch-selection.tsx` 546.
4. **Node-unit breadth** - 172/184 eligible product-source files remain at zero line coverage, so targeted test expansion and later evidence-based non-regression thresholds remain valid follow-ons.

The natural repository-local maintainability follow-on is bounded application-module decomposition, but performance evidence, targeted Node-unit breadth and higher-maturity DR remain valid alternatives. No next phase is opened by this assessment.

## Deployment status

**PRODUCTION-LIVE VIA THE SEPARATELY AUTHORIZED CUMULATIVE 2026-10-09 ROLLOUT.** Exact application source `bcb2de305b15f4be15ed42674d22998c30b8c811` is live as READY Vercel deployment `dpl_4E38yZarWfooA4wfEuW5USmPnNsN` on `renderlab.faresuniform.uk`. Production-documentation closure is verified by PR #366 / `0b8110976d87ffa1e73e9340d3001386ab81f21f` and Production Documentation Sync run `37863995081`. ENT-010 itself remains repository CI/tooling/tests/documentation work; deployment was a later release operation, not retroactive ENT-010 implementation scope.
