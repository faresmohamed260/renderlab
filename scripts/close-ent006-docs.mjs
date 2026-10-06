import fs from "node:fs";

function replaceOnce(file, needle, replacement) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(needle)) throw new Error(`${file}: anchor not found`);
  const first = text.indexOf(needle);
  if (text.indexOf(needle, first + needle.length) !== -1) throw new Error(`${file}: anchor not unique`);
  fs.writeFileSync(file, text.replace(needle, replacement));
}

const contract = "docs/audits/ENT_006_SERVER_ONLY_BOUNDARIES_CONTRACT.md";
replaceOnce(contract, "Status: EXECUTION CONTRACT / IMPLEMENTATION NOT STARTED / NOT DEPLOYED", "Status: COMPLETE / VERIFIED / MERGED / NOT DEPLOYED");
replaceOnce(contract, "## Deployment boundary\n", `## Closure evidence — 2026-10-06

ENT-006 is complete in repository source and remains **not deployed**.

- Implementation PR #342 final head \`8b9d87b9ce70f63f5c755a10de19975d7acdc36a\` passed Engineering Quality run \`37490780105\` and CodeQL run \`37490780138\`.
- Engineering Quality proved deterministic dependency installation, lint, TypeScript no-emit using repository-owned TypeScript \`7.0.2\`, the full unit suite, negative quality fixtures including the server-boundary verifier, and the production Next.js build.
- The final-head Library Lifecycle pull-request run was cancelled before useful execution and was superseded by unchanged exact-head workflow-dispatch run \`37493401969\`, which passed. The remaining affected exact-head integration, lifecycle, account, upload, generation, UI and release-readiness workflows passed.
- PR #342 squash-merged to protected \`main\` as \`6c80535737fb67a0239ac8cc05a2feaf014d49bf\`.
- Merged-main Engineering Quality run \`37494017112\` and CodeQL run \`37494017131\` passed on that exact merge SHA; affected merged-main push workflows were also accepted.
- The implementation pins dev-only \`@babel/parser@7.29.9\`; \`typescript@7.0.2\` remains the normal compiler and owner of \`tsc\`.
- The canonical 11 privileged leaf modules carry the \`server-only\` marker; Client Component runtime imports from server-owned namespaces and unmarked direct high-risk credential reads are statically rejected while genuine type-only imports remain allowed.
- No Supabase/R2 mutation, provider-routing change, credential change, Vercel production deployment, alias movement or other shared-runtime mutation was performed by ENT-006.

The same-rubric reassessment is recorded in \`docs/audits/ENT_006_SERVER_ONLY_BOUNDARIES_ASSESSMENT.md\`. The official rounded enterprise score remains **8.5/10**: ENT-006 materially strengthens architecture and application security, but the dominant score ceilings remain destructive-loss recovery, developer portability, coverage visibility and maintainability debt.

## Deployment boundary
`);

replaceOnce("PROJECT.md", "## Production user audit and current live source — 2026-09-21\n", `## ENT-006 explicit server-only boundaries — closed 2026-10-06

- ENT-006 is **COMPLETE / VERIFIED / MERGED / NOT DEPLOYED**. Implementation PR #342 final head \`8b9d87b9ce70f63f5c755a10de19975d7acdc36a\` passed exact-head Engineering Quality \`37490780105\`, CodeQL \`37490780138\`, and the affected workflow matrix; the cancelled Library Lifecycle PR allocation was superseded by unchanged exact-head run \`37493401969\`, which passed.
- The implementation squash-merged as \`6c80535737fb67a0239ac8cc05a2feaf014d49bf\`. Merged-main Engineering Quality \`37494017112\` and CodeQL \`37494017131\` passed on that exact SHA.
- Eleven credential/data-bearing leaf modules now declare \`import "server-only";\`. Engineering Quality statically rejects Client Component runtime imports from \`@/server/*\` or \`@/lib/supabase/server\`, preserves genuine type-only imports, and rejects direct covered credential reads in scanned server-owned modules unless the module carries the marker.
- The AST verifier uses dev-only \`@babel/parser@7.29.9\`; the ordinary compiler remains exactly \`typescript@7.0.2\` and continues to own \`tsc\`.
- The authoritative enterprise reassessment remains **8.5/10**. ENT-006 improves explicit application boundaries but does not resolve the larger recovery, portability, coverage-visibility or maintainability ceilings.
- ENT-006 did **not** deploy application source, move a Vercel alias, change Supabase/R2 resources, alter provider routing or mutate shared runtime configuration. Production authority remains the separately recorded exact production SHA below.

## Production user audit and current live source — 2026-09-21
`);

replaceOnce("docs/STATUS.md", "## Known boundaries\n", `### ENT-006 — explicit server-only module boundaries

- **Complete / verified / merged / not deployed** as merge SHA \`6c80535737fb67a0239ac8cc05a2feaf014d49bf\` from PR #342.
- Canonical privileged leaf modules are explicitly marked \`server-only\`; Engineering Quality rejects Client Component runtime imports from server-owned namespaces and unmarked direct reads of covered high-risk credentials while permitting erased type-only imports.
- Exact-head Engineering Quality \`37490780105\` and CodeQL \`37490780138\` passed; merged-main Engineering Quality \`37494017112\` and CodeQL \`37494017131\` also passed.
- Dev-only \`@babel/parser@7.29.9\` is the verifier parser. TypeScript remains exactly \`7.0.2\` and retains normal compiler ownership.
- Enterprise score remains **8.5/10**. The largest unresolved enterprise gap remains verified destructive-loss recovery/RPO-RTO for Supabase and R2; developer portability, coverage visibility and maintainability debt also remain material.
- No production deployment or shared-runtime mutation was authorized or performed.

## Known boundaries
`);

replaceOnce("docs/architecture/FRONTEND_ARCHITECTURE.md", "## State Architecture\n", `### Explicit server-only ownership — ENT-006

Privileged server ownership is an enforced module boundary, not a naming convention:

- canonical credential/data-bearing leaf modules declare top-level \`import "server-only";\`;
- a file with a top-level \`"use client"\` directive must not runtime-import \`@/server/*\` or \`@/lib/supabase/server\`, statically or dynamically;
- genuine type-only imports from server-owned modules remain allowed because they erase from the browser graph;
- newly direct credential-bearing modules under the scanned server-owned source boundary must carry the same marker;
- \`scripts/verify-server-boundaries.mjs\`, integrated into Engineering Quality, enforces those rules with \`@babel/parser@7.29.9\` while the repository compiler remains \`typescript@7.0.2\`.

Do not add \`server-only\` mechanically to pure deterministic \`src/server\` helpers intentionally executed directly by Node unit tests. Higher-level server modules inherit the browser build barrier transitively from marked privileged leaves.

## State Architecture
`);

replaceOnce("docs/architecture/INFRASTRUCTURE.md", "## Vercel deployment boundary\n", `## Credential-bearing source boundary — ENT-006

RenderLab treats private environment-variable naming as necessary but insufficient isolation. Credential/data-bearing source modules must also be explicit server-only import-graph boundaries.

- Canonical privileged leaves for Supabase service-role access, account/admin privileged data, generation backend access, operational-alert delivery and Cloudflare R2 access declare \`import "server-only";\`.
- Engineering Quality scans server-owned source for direct reads of \`SUPABASE_SERVICE_ROLE_KEY\`, \`RESEND_API_KEY\`, \`RENDERLAB_GENERATION_BACKEND_TOKEN\`, \`CLOUDFLARE_R2_*\` and compatibility \`R2_*\` names; a covered direct read without the marker fails the gate.
- Client Components cannot acquire runtime imports from \`@/server/*\` or the privileged Supabase server client. Type-only browser contracts remain allowed.
- The boundary verifier depends only on dev-only \`@babel/parser@7.29.9\`; ordinary compilation remains \`typescript@7.0.2\`.
- ENT-006 changed source ownership and repository verification only. It created no schema migration, secret, environment variable, provider route, R2 resource, scheduler, Vercel deployment or alias movement.

## Vercel deployment boundary
`);

fs.writeFileSync("docs/audits/ENT_006_SERVER_ONLY_BOUNDARIES_ASSESSMENT.md", `# ENT-006 — Explicit server-only module boundaries enterprise reassessment

Date: 2026-10-06  
Status: VERIFIED / MERGED / NOT DEPLOYED  
Implementation merge: \`6c80535737fb67a0239ac8cc05a2feaf014d49bf\` (PR #342)  
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

- Eleven canonical privileged leaf modules are explicit \`server-only\` boundaries.
- Client Components are statically blocked from runtime-importing \`@/server/*\` or \`@/lib/supabase/server\`; genuine type-only imports remain accepted.
- Covered direct high-risk credential reads in scanned server-owned source require the marker, catching newly privileged modules before merge.
- The verifier is part of Engineering Quality and uses exactly dev-only \`@babel/parser@7.29.9\`; \`typescript@7.0.2\` remains the normal compiler and \`tsc\` owner.
- Exact-head Engineering Quality \`37490780105\`, CodeQL \`37490780138\`, the accepted affected workflow set, and merged-main Engineering Quality \`37494017112\` plus CodeQL \`37494017131\` passed.

## Remaining enterprise ceilings

1. **Destructive-loss recovery remains the largest weakness.** Supabase and R2 still lack a verified restore path with established RPO/RTO.
2. **Developer portability remains weak.** Local/bootstrap assumptions and shared-environment dependencies still make clean-room development less reproducible than an enterprise target warrants.
3. **Coverage visibility remains limited.** The test matrix is broad, but there is still no mature coverage measurement/gating view proving untested code risk.
4. **Maintainability debt remains.** Workflow duplication and some large mixed-responsibility modules continue to raise change cost.

## Deployment status

**NOT DEPLOYED.** ENT-006 closure changes repository source and documentation truth only. Production must not be credited with these boundaries until a separately authorized exact-SHA release is deployed and verified.
`);