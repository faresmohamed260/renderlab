# Engineering practices and evidence

RenderLab is a **source-visible, single-maintainer, invitation-only beta**, not a public open-source service. The current supported generation surface is **FIBO image creation/editing**, including qualified masked editing; additional models, utilities, video and audio are planned or historical, **not publicly available**. See the [product charter](PRODUCT_CHARTER.md), [technical claims](TECHNICAL_CLAIMS.md), [current capabilities](architecture/PRODUCT_CAPABILITIES.md), and [restrictive license](../LICENSE).

This is a review/navigation guide. It does **not** supersede architectural contracts, authorize a new feature or deployment, or establish production state; always check the [production manifest](production/current.json) for the deployed source.

## What a reviewer can verify

| Practice | Source and concrete evidence | Boundary / what it does **not** prove |
| --- | --- | --- |
| **Exact-head protected CI** | [Required-context registry](governance/github-protection.json); [Engineering Quality](../.github/workflows/engineering-quality.yml), [Unit Coverage](../.github/workflows/unit-coverage.yml), [Documentation Governance](../.github/workflows/docs-governance.yml), [CodeQL](../.github/workflows/codeql.yml), and [Ubuntu/Windows clean-room](../.github/workflows/developer-portability.yml). | The six protected check contexts require a passing PR head before merge; passing a check does **not** authorize deployment or paid provider work. [Decision rights](../GOVERNANCE.md). |
| **CodeQL and dependency hygiene** | [CodeQL JavaScript/TypeScript workflow](../.github/workflows/codeql.yml), [monthly grouped Dependabot](../.github/dependabot.yml) and [GitHub Actions policy](../AGENTS.md). | Static analysis is not a penetration test. Dependency PRs are reviewed and subject to the same CI; no auto-merge or new production credential is implied. |
| **Typed startup/configuration** | [Runtime configuration design](architecture/RUNTIME_ENV_CONFIGURATION.md), [typed environment module](../src/lib/config/runtime-env.ts), [offline config tests](../tests/unit/runtime-env-contract.test.mjs) and [build preflight](../scripts/verify-vercel-env.mjs). | Secret-free local builds exercise simulated configuration. A live production value is **not** proven by a docs-only check. |
| **Owner isolation and trust boundaries** | [P0-03 principal/permission contract](architecture/P0_03_TRUST_BOUNDARIES_AND_OWNER_ISOLATION_CONTRACT.md), [owner negative tests](../tests/unit/owner-isolation-families.test.mjs), [privileged error sanitization tests](../tests/unit/privileged-error-sanitization.test.mjs), and [security reporting](../SECURITY.md). | Supabase service-role bypasses RLS: privileged server paths require explicit owner filtering; negative tests are scoped rather than proof of universal penetration resistance. |
| **Explicit job state policy** | [P0-04 eight-state inventory](architecture/P0_04_GENERATION_STATE_MACHINE_SPEC.md), [pure transition module](../src/lib/capabilities/generation-job-state-machine.ts) and [64-edge tests](../tests/unit/generation-job-state-machine.test.mjs). | The pure policy is **not** a global database trigger; inspect the latest SQL test results and the [backend overview](architecture/BACKEND_ARCHITECTURE_OVERVIEW.md) for remaining limitations. |
| **Deterministic job/recovery proof** | [Critical-path tests](../tests/unit/generation-critical-path-offline.test.mjs), [repeatability verifier](../tests/helpers/verify-generation-critical-path-determinism.mjs) and [Unit 5 test map](audits/P0_05_DETERMINISTIC_CRITICAL_PATH_TEST_MAP_2026-11-23.md). | Dispatch continues without a browser; **result finalization usually depends on owner return**, not guaranteed always-on settlement. [Technical claims](TECHNICAL_CLAIMS.md). |
| **Disposable PostgreSQL conformance** | [Database conformance gate](operations/DATABASE_CONFORMANCE_GATE.md), [optional path-filtered workflow](../.github/workflows/database-conformance.yml), [verification script](../scripts/verify-database-conformance.mjs) and [SQL fixture](../tests/fixtures/database-conformance.sql). | Runs on its own disposable PostgreSQL 17 service, not the hosted Supabase project. It reports named expected transaction/transition gaps; it is not an end-to-end Supabase or production concurrency certification. |
| **Provider growth without claiming new availability** | [Provider-adapter design](architecture/PROVIDER_ADAPTER_BOUNDARY.md), [unwired interface](../src/server/generation/adapters/provider-adapter.ts), [shared conformance tests](../tests/unit/provider-adapter-conformance.test.mjs). | FIBO remains the only currently available generation provider; fake utility adapter tests **do not** ship a new model/operation or alter current routing. |
| **Release, rollback, incident response** | [Release and rollback runbook](operations/PRODUCTION_RELEASE_RUNBOOK.md), [incident runbook](operations/INCIDENT_RESPONSE_AND_RECOVERY.md), [current production record](production/current.json), [human-readable status](STATUS.md), [release-history navigation](../CHANGELOG.md) and [dated audits](audits/). | `main` can be newer than the live deployment. Release qualification, operator approval, deployment read-back, rollback anchor and Production Documentation Sync are separate from PR checks. |

## Reproduce the secret-free quality path

The supported toolchain is [Node 24](../.nvmrc) and [npm 11](../package.json) (the repository pins npm 11.6.2). Run this from a clean checkout; [CONTRIBUTING.md](../CONTRIBUTING.md) and the [backend demo guide](operations/LOCAL_BACKEND_DEMO.md) explain the first hour.

```sh
npm run doctor
npm run verify:text-policy
npm run verify:docs-governance
npm ci --no-audit --no-fund
npm run lint
npm run typecheck
npm run test:unit
npm run verify:ui-purity
npm run verify:engineering-quality
npm run build
```

Use `npm run test:unit:coverage` and `npm run verify:unit-coverage` for the Node-only unit coverage denominator ([coverage workflow](../.github/workflows/unit-coverage.yml)); use `npm run demo:backend` for the [seven-scenario offline walkthrough](operations/LOCAL_BACKEND_DEMO.md). The optional disposable-database test has its own [isolation and execution contract](operations/DATABASE_CONFORMANCE_GATE.md); **do not point it at production**. Hosted tests, authenticated production probes, provider-backed generation and deploys have distinct gates and explicit authorization.

## Review and reporting

[Contributing rules](../CONTRIBUTING.md), [PR checklist](../.github/PULL_REQUEST_TEMPLATE.md), and [non-sensitive issue templates](../.github/ISSUE_TEMPLATE/) guide ordinary changes. Report possible security issues **privately** under [SECURITY.md](../SECURITY.md), never in a public issue. [GOVERNANCE.md](../GOVERNANCE.md) assigns merge and release authority; a passing CI run or PR merge is not permission to deploy.
