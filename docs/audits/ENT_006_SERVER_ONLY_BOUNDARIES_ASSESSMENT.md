# ENT-006 — Explicit server-only module boundaries enterprise reassessment

Date: 2026-10-06  
Status: VERIFIED / MERGED / NOT DEPLOYED  
Implementation merge: `6c80535737fb67a0239ac8cc05a2feaf014d49bf` (PR #342)  
Previous authoritative score: **8.5/10** after ENT-005  
Current authoritative score: **8.5/10**

## Reassessment method

This uses the same 18-category enterprise rubric as the ENT-005 assessment. Scores move only where ENT-006 produced verified evidence; unchanged domains retain their prior score. The arithmetic mean is approximately **8.54/10**, which remains **8.5/10** at one decimal place.

| Category | ENT-005 | ENT-006 | Rationale |
| --- | ---: | ---: | --- |
| Architecture | 8.8 | 8.9 | Privileged server ownership is now an explicit build-time and static-analysis boundary. |
| Code quality & maintainability | 8.9 | 8.9 | Useful guardrail added, but large modules/workflow duplication remain. |
| Type safety & correctness | 9.1 | 9.1 | Type-only client contracts are preserved; compiler ownership is unchanged. |
| Automated testing | 8.9 | 8.9 | Negative boundary fixtures strengthen gates, but repository coverage visibility is still limited. |
| Frontend engineering | 8.4 | 8.4 | No product/UI architecture refactor; browser/server import ownership is safer. |
| Backend/API engineering | 8.9 | 8.9 | No route/API behavior change. |
| Database/data modelling | 8.8 | 8.8 | No schema or data-model change. |
| Authentication/identity | 8.6 | 8.6 | Existing auth boundaries preserved. |
| Application security | 9.0 | 9.1 | Credential/data-bearing modules now fail closed against accidental client graph acquisition. |
| Dependency/supply-chain | 9.3 | 9.3 | One exact dev-only parser was added; TypeScript 7 compiler ownership and deterministic lock install are preserved. |
| CI/CD & release safety | 9.4 | 9.4 | Engineering Quality now includes the boundary gate; release process itself is unchanged. |
| Developer experience/local reproducibility | 6.8 | 6.8 | No portability/bootstrap work. |
| Observability & operations | 8.7 | 8.7 | ENT-005 operations capabilities unchanged. |
| Performance | 8.0 | 8.0 | No runtime performance work. |
| Reliability/resilience | 8.6 | 8.6 | Boundary hardening reduces one class of regression but does not change runtime recovery. |
| Disaster recovery/business continuity | 5.9 | 5.9 | Destructive-loss Supabase/R2 RPO/RTO remain unverified. |
| Documentation/onboarding | 8.5 | 8.5 | Boundary rules are now recorded in the existing architecture authorities. |
| Product/admin readiness | 9.0 | 9.0 | No product/admin surface change. |

## Verified gains

- Eleven canonical privileged leaf modules are explicit `server-only` boundaries.
- Client Components are statically blocked from runtime-importing `@/server/*` or `@/lib/supabase/server`; genuine type-only imports remain accepted.
- Covered direct high-risk credential reads in scanned server-owned source require the marker, catching newly privileged modules before merge.
- The verifier is part of Engineering Quality and uses exactly dev-only `@babel/parser@7.29.9`; `typescript@7.0.2` remains the normal compiler and `tsc` owner.
- Exact-head Engineering Quality `37490780105`, CodeQL `37490780138`, the accepted affected workflow set, and merged-main Engineering Quality `37494017112` plus CodeQL `37494017131` passed.

## Remaining enterprise ceilings

1. **Destructive-loss recovery remains the largest weakness.** Supabase and R2 still lack a verified restore path with established RPO/RTO.
2. **Developer portability remains weak.** Local/bootstrap assumptions and shared-environment dependencies still make clean-room development less reproducible than an enterprise target warrants.
3. **Coverage visibility remains limited.** The test matrix is broad, but there is still no mature coverage measurement/gating view proving untested code risk.
4. **Maintainability debt remains.** Workflow duplication and some large mixed-responsibility modules continue to raise change cost.

## Deployment status

**NOT DEPLOYED.** ENT-006 closure changes repository source and documentation truth only. Production must not be credited with these boundaries until a separately authorized exact-SHA release is deployed and verified.
