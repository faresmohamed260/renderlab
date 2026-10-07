# ENT-007 — Destructive-loss recovery enterprise reassessment

Date: 2026-10-07
Status: AUTHORITATIVE POST-ENT-007 ASSESSMENT / VERIFIED / MERGED / NOT DEPLOYED
Implementation PR: #352
Implementation merge: `7f7a95a21f403e99095a19b94db39255311cf4d3`
Previous authoritative score: **8.5/10** after ENT-006
Current authoritative score: **8.7/10**

## Executive result

ENT-007 closes the former absence of any verified destructive-loss recovery path. RenderLab now has retained encrypted logical database/Auth generations, a protected R2 recovery destination, isolated database and object restore procedures, cross-store coherence verification, measured recovery observations, and bounded retention/deletion semantics.

The same 18-category rubric used by ENT-006 yields an arithmetic mean of approximately **8.68/10**, supporting the rounded enterprise score of **8.7/10**. The score intentionally remains below mature-enterprise recovery territory because Supabase stays on Free: recovery is logical rather than managed physical backup/PITR, it does not recreate the complete Supabase project or active session/MFA continuity, the R2 recovery destination remains in the same Cloudflare account/provider, and the current RPO/RTO figures are observations from bounded drills rather than published objectives backed by repeated scheduled evidence.

## Same-rubric scorecard

| Category | ENT-006 | ENT-007 | Rationale |
| --- | ---: | ---: | --- |
| Architecture | 8.9 | 8.9 | Recovery composes existing repository, Supabase and R2 ownership rather than redesigning application topology. |
| Code quality & maintainability | 8.9 | 8.9 | Recovery code is bounded and tested, but broader large-module/workflow maintainability debt remains. |
| Type safety & correctness | 9.1 | 9.1 | No material type-system change. |
| Automated testing | 8.9 | **9.0** | Real retained backup, isolated PostgreSQL restore, R2 restore, cross-store verification and account/storage lifecycle checks now exercise destructive-loss behavior. |
| Frontend engineering | 8.4 | 8.4 | No UI/product-surface change. |
| Backend/API engineering | 8.9 | 8.9 | Recovery uses CI/operator tooling rather than changing product API semantics. |
| Database/data modelling | 8.8 | 8.8 | The checked-in migration chain becomes restore authority, but no data-model redesign was required. |
| Authentication/identity | 8.6 | 8.6 | Bounded Auth identity recovery is proved, but active sessions and MFA continuity intentionally remain out of scope. |
| Application security | 9.1 | **9.2** | Encrypted snapshots, masked secrets, fail-closed promotion, 7-day immutability and one-hour bucket-scoped temporary R2 credentials strengthen recovery-secret handling. |
| Dependency/supply-chain | 9.3 | 9.3 | Existing deterministic/pinned dependency policy is unchanged. |
| CI/CD & release safety | 9.4 | 9.4 | Scheduled/manual recovery workflows respect least privilege and exact-head discipline; application release mechanics are unchanged. |
| Developer experience/local reproducibility | 6.8 | 6.8 | Clean-room bootstrap and Windows/Linux parity remain the weakest numerical category. |
| Observability & operations | 8.7 | **8.9** | The incident runbook now points to a real retained recovery path with operator authorization and deletion/reconciliation safeguards. |
| Performance | 8.0 | 8.0 | No product/runtime performance phase. |
| Reliability/resilience | 8.6 | **8.9** | Destructive-loss recovery is no longer theoretical: both stores and their relationship were restored and verified independently. |
| Disaster recovery/business continuity | 5.9 | **7.5** | Retained encrypted logical DB/Auth + protected R2 recovery and isolated cross-store restore are proven; managed PITR/full-project recovery, provider/account independence and repeated objective evidence remain absent. |
| Documentation/onboarding | 8.5 | **8.7** | Recovery architecture, retention/privacy semantics, operator runbook, exact evidence and limitations are synchronized in repository authorities. |
| Product/admin readiness | 9.0 | 9.0 | No product/admin surface change. |

Arithmetic mean: **8.68**, authoritative rounded score **8.7/10**.

## Verified recovery evidence

- Cloudflare run `37623562234` configured/read back whole-bucket lock `ent007-minimum-7d` at 604,800 seconds on private `renderlab-dr-backup`; run `37629604734` re-verified that lock and configured/read back `ent007-expire-after-8d` for prefix `ent007/` at 691,200 seconds.
- Steady-state backup run `37630201440` created retained encrypted generation `20261007133932-9f1aa3bd`, after verifying both provider policies and minting a one-hour `object-read-write` R2 credential scoped only to the backup bucket. It retained one durable object / 39,974 bytes plus the logical database/Auth snapshot and wrote `complete.json` last.
- Retained recovery run `37630554797` restored that exact generation into isolated PostgreSQL 17 plus an exact run-owned R2 prefix. It restored 10 contracted RenderLab tables, one bounded Auth user/identity and one R2 object; reported zero restored sessions, zero missing RLS, zero browser direct-DML privilege violations, zero tested media/owner orphans, and one coherent cross-store reference; primary-delete simulation and cleanup passed.
- Observed drill measurements were backup age 177 seconds, isolated database verification 2.437 seconds, R2 verification 1.682 seconds and combined retained recovery verification 5.253 seconds. They remain observations, not contractual or published recovery objectives.
- Implementation PR #352 exact head `b6decaa6d895e616436861446cd8bfaaaef7e846` passed Engineering Quality `37632681295`, CodeQL `37632681300`, Account Data Lifecycle `37632910417`, Library Lifecycle Visual `37632916211`, and Media Delete Visual `37632921771` with configured cleanup.
- PR #352 squash-merged as `7f7a95a21f403e99095a19b94db39255311cf4d3`. Merged-main Engineering Quality `37642455946` and CodeQL `37642455870` passed on that exact SHA.
- No Vercel deployment or alias movement occurred. Supabase remained on Free; no PITR/paid-plan change, hosted database reboot/SSL/JIT change, generation/provider routing change, or production application cutover occurred.

## Recovery limitations that remain binding

1. **Logical recovery is not full Supabase platform recovery.** It does not recreate provider project configuration, API keys, provider encryption roots/Vault state, active JWT/session continuity or MFA continuity.
2. **No PITR or managed physical backup.** The selected Free-plan path can recover only from successfully completed retained logical generations.
3. **R2 backup is same-provider/same-account.** Bucket lock and scoped temporary credentials protect against bounded application/credential/primary-object loss but do not establish Cloudflare account/provider-failure independence.
4. **Published RPO/RTO remain deferred.** One successful retained drill provides measured observations; stronger objectives require repeated scheduled evidence.
5. **Retention is bounded but not an exact erasure deadline.** Whole-bucket immutability is at least seven days; `ent007/` lifecycle deletion is requested at object age eight days and provider processing may extend physical presence.

## Remaining enterprise ceilings

The updated scorecard shifts the highest-value follow-on work away from basic destructive-loss capability. The most material remaining weaknesses are now:

1. **developer portability / clean-room reproducibility** — environment/bootstrap and Windows/Linux parity remain weak at 6.8;
2. **recovery maturity beyond the Free-plan path** — repeated scheduled evidence, published objectives when justified, and stronger provider/account independence remain future DR work;
3. **coverage visibility** — the workflow/test matrix is broad, but conventional line/function/branch coverage visibility and baseline gates remain limited;
4. **maintainability** — workflow duplication and large mixed-responsibility modules still increase change cost.

The next enterprise phase should be selected from that updated evidence rather than extending ENT-007 beyond its recovery scope.

## Deployment status

**NOT DEPLOYED.** ENT-007 changes repository recovery tooling, GitHub Actions and authorized Cloudflare recovery resources. It does not make the merged application source production-live. Production remains the exact source recorded by the four `RENDERLAB_CURRENT_PRODUCTION_SHA` authorities until a separately authorized deployment occurs.
