# ENT-003 — Next.js security patch reassessment

Date: 2026-10-05
Status: post-implementation assessment
Implementation PR: #333
Implementation merge: `2546978ab19a00bc6c76f6273d66d995d4fdc2e8`
Prior authoritative score: **8.2/10** after ENT-002

## Executive result

ENT-003 restores RenderLab to the vendor-patched Next.js 16.3 Active-LTS baseline without changing product behavior, application configuration, shared infrastructure, provider routing, secrets, scheduler state, or production deployment.

The repository moved from Next.js **16.3.6** to **16.3.8**, the September 30, 2026 security release for the 16.3 Active-LTS line. The vendor release addresses one High, five Medium, and one Low severity vulnerabilities. RenderLab did not treat partial applicability as a reason to remain below the patched LTS baseline.

The conservative enterprise-engineering score remains **8.2/10**. ENT-003 removes a current dependency-security regression risk and preserves the 9.3 dependency-security rating established after ENT-002, but it does not improve the lowest-scoring maturity areas enough to change the rounded overall score.

> This assessment describes repository state. ENT-003 was not deployed, so production must not be credited with Next.js 16.3.8 until a separately authorized exact-SHA production release is completed and verified.

## What changed

- `package.json` now pins `next` exactly to `16.3.8`.
- `package-lock.json` resolves the root Next.js package, `@next/env`, and the platform SWC packages to 16.3.8.
- No other direct or development dependency version changed.
- No Next.js configuration, route, API, UI, authentication, authorization, storage, generation, worker, provider, or data-model behavior changed.
- ENT-001 browser-security headers and ENT-002 CI/supply-chain controls remain unchanged.

## Lockfile audit

The dependency update was intentionally constrained after npm on Windows attempted two unrelated lockfile cleanups. The final committed lockfile preserved those unrelated Tailwind WASM entries and applied only the framework patch set.

The semantic dependency audit reported:

- direct dependency changes: `next` only, `16.3.6` → `16.3.8`;
- development dependency changes: none;
- changed lockfile package entries: the root manifest entry, `next`, `@next/env`, and eight platform-specific `@next/swc-*` entries;
- `git diff --check`: clean.

## Verification evidence

Exact implementation head: `5cbc470c05894518da26f74355a4b1a2bdf009c0`.

Local verification at that head:

- `npm ci --no-audit --no-fund` — passed;
- lint — **17 existing warnings / 0 errors**;
- TypeScript checking — passed;
- unit tests — **62/62 passed**;
- production build — passed under Next.js 16.3.8;
- Engineering Quality verifier — passed unchanged in Linux/WSL; direct Windows execution remains affected by the known `.cmd` `spawnSync` portability issue and is not a framework regression.

Repository exact-head verification:

- CodeQL JavaScript/TypeScript — passed;
- Engineering Quality — passed;
- all **24/24** pull-request-attached workflows — passed with 0 failures;
- dedicated Release Candidate Matrix run `37298177693` — passed;
- all **48/48** exact-SHA runs visible during the release-matrix pass, including its configured child workflows and provider-backed video verification, completed successfully with 0 failures.

PR #333 squash-merged as `2546978ab19a00bc6c76f6273d66d995d4fdc2e8`.

Merged-main verification on that exact SHA:

- Engineering Quality run `37300494262` — success;
- CodeQL run `37300494398` — success.

The implementation branch was deleted after merge. The remote branch set returned to protected `main` plus the two legitimate draft heads retained during repository cleanup.

## Scorecard

| Area | Post ENT-002 | Post ENT-003 | Change | Reason |
|---|---:|---:|---:|---|
| Architecture | 8.8 | 8.8 | — | Runtime architecture unchanged. |
| Authentication / identity | 9.1 | 9.1 | — | No auth changes. |
| Authorization / ownership | 8.8 | 8.8 | — | Ownership boundaries unchanged and reverified. |
| Database security | 8.8 | 8.8 | — | No database change. |
| Generation lifecycle | 9.2 | 9.2 | — | Existing lifecycle checks stayed green. |
| API/input contracts | 8.7 | 8.7 | — | No request-contract change. |
| Media/storage integrity | 8.5 | 8.5 | — | ENT-001 upload validation remains intact. |
| Dependency security | 9.3 | **9.3** | — | Vendor-patched Active-LTS status is restored; no maturity uplift is claimed merely for applying the required security patch. |
| Application security hardening | 8.3 | 8.3 | — | Same-origin mutation defense and upload-abuse admission controls remain open. |
| CI/CD | 8.7 | 8.7 | — | ENT-002 controls preserved. |
| Automated testing / verification | 8.4 | 8.4 | — | Broad framework compatibility was reverified; conventional coverage is still absent. |
| Frontend engineering | 8.0 | 8.0 | — | No frontend architecture change. |
| Maintainability | 6.9 | 6.9 | — | Large modules and workflow volume remain. |
| Developer experience | 7.1 | 7.1 | — | Windows `.cmd` verifier portability remains a concrete cross-platform gap. |
| Observability | 6.7 | 6.7 | — | No durable telemetry/alerting work. |
| Operations / DR | 6.1 | 6.1 | — | No restore/RPO/RTO/runbook work. |
| Documentation | 8.0 | 8.0 | — | Security-patch state is recorded without inflating the documentation score. |
| Release governance | 8.2 | 8.2 | — | Exact-head and merged-main qualification remained effective. |

The arithmetic mean therefore remains approximately **8.20**, supporting the unchanged rounded enterprise score of **8.2/10**.

## Remaining P1 work

The next phase should return to the highest-risk application boundary identified after ENT-002:

1. cap concurrent pending upload sessions per account and rate-limit upload-ticket creation;
2. add centralized same-origin mutation defense for cookie-authenticated state-changing routes using Origin / `Sec-Fetch-Site` policy without breaking internal authenticated automation;
3. add explicit `server-only` boundaries where they provide meaningful secret/data isolation;
4. normalize cross-platform dev/test behavior, including the Windows command-shim verifier issue and EOL policy;
5. add conventional coverage measurement before choosing coverage gates;
6. add durable observability/alerting and operations/DR runbooks and exercises;
7. reduce CI/workflow and large-module maintenance cost after the higher-risk controls above.

## Enterprise interpretation

ENT-003 is a security-maintenance checkpoint, not a feature or architecture phase. It demonstrates that the repository can absorb a current framework security patch with broad exact-SHA verification and without weakening gates or widening scope.

The enterprise ceiling remains concentrated in operations/DR, observability, maintainability, developer portability, missing coverage visibility, and the still-open request-admission/origin-security boundary. The next implementation phase should therefore proceed with **upload admission abuse controls plus centralized same-origin mutation defense**, under a new execution contract based on the current `main` state.
