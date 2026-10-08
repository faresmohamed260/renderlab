# ENT-009 — Conventional unit coverage visibility contract

Date: 2026-10-07
Status: COMPLETE / VERIFIED / MERGED / NOT DEPLOYED
Tracking: #358
Baseline `main`: `ec79581136349e7d3866dbdea24a63daeff6eb4a`

## Goal

Add one truthful, repeatable unit-coverage view for RenderLab product source so line/function/branch risk is visible instead of inferred from the size of the existing workflow matrix.

ENT-009 is coverage instrumentation and reporting only. It must not change product behavior, routes, account/security semantics, Supabase/R2 state, worker/provider routing, production configuration, or deployment state.

## User value

A new engineer or AI session should be able to answer two questions from repository-owned evidence:

1. what proportion of the current TypeScript/TSX product source is exercised by the Node unit suite; and
2. which files remain completely or partially uncovered and therefore rely on other verification layers or need future unit tests.

The result must be explicit that unit coverage is one engineering signal. It does not replace RenderLab's configured browser, shared-resource, provider-backed, release-candidate, or production acceptance workflows.

## Verified starting state

- ENT-008 is complete/verified/merged/not deployed. The authoritative enterprise score is **8.8/10** (8.80 arithmetic mean).
- Current `main` is `ec79581136349e7d3866dbdea24a63daeff6eb4a`.
- The repository currently has **185** `src/**` TypeScript/TSX files, **27** `tests/unit/*.test.mjs` files, **97** passing Node unit tests, **60** top-level `scripts/verify-*.mjs` verifiers, and **55** GitHub workflow files.
- `npm run test:unit` runs `node --test tests/unit/*.test.mjs` and currently produces no first-party line/function/branch coverage report or retained artifact.
- Node 24 has native test coverage and LCOV reporting, but its ordinary report covers files loaded by the test process. A planning probe against the current unit suite reported roughly **91.6% lines / 82.2% branches / 87.7% functions** only across loaded files, which is not a truthful repository-wide denominator.
- An exploratory `c8@12.0.0 --all` probe over current `src/**/*.ts` and `src/**/*.tsx` instead reported approximately **5.54% lines/statements, 24.16% functions, and 56.31% branches**. That probe ran on the local unsupported Node 25 machine and is planning evidence only; the accepted ENT-009 baseline must come from exact-head Node 24 CI.
- `c8@12.0.0` is a small ISC-licensed dev tool built on native V8 coverage, supports Node 24 through its declared engine range, can include unexecuted files with `--all`, and can emit text, JSON summary, and LCOV reports.
- Existing enterprise assessments have repeatedly called for coverage **measurement first** and realistic gates only after a baseline is known. ENT-009 follows that order.

## Implementation and closure evidence - PR #360

Implementation PR #360 closed the contract without product/runtime/shared-resource changes. The final exact implementation head `657522dfcd9dfcbdc92d710ec082a62d9fca040e` passed every attached check before merge, including Unit Coverage `37666725572`, Engineering Quality `37666725574`, CodeQL `37666725658`, Developer Portability `37666725517`, and all configured workflows attached to that head. Account Identity, Integrated Release, and Creative Iteration each encountered an infrastructure-only Ubuntu/Azure package-mirror cancellation while installing Chromium dependencies; unchanged same-head reruns passed their real configured verification and cleanup. No code change, head movement, skipped product assertion, or weakened gate was used to obtain acceptance.

The exact-head baseline remained:

- 102/102 Node unit tests passed under coverage;
- 184 tracked eligible `src/**` `.ts`/`.tsx` product files in the denominator after excluding declaration-only `.d.ts`;
- 172 files at zero line coverage;
- statements: 5.54% (1,295/23,357);
- lines: 5.54% (1,295/23,357);
- functions: 24.16% (58/240);
- branches: 56.31% (290/515).

The zero-line distribution is `src/app` 57/57, `src/components` 18/18, `src/features` 37/37, `src/lib` 18/22, and `src/server` 42/50. The earlier 185-file planning count included the declaration-only file excluded from the accepted denominator.

PR #360 squash-merged as `6a4e91973aa0870dfa75b840b28d6860a60825a5`. Contract-required merged-main verification then passed on that exact SHA: Unit Coverage `37673099294`, Engineering Quality `37673099400`, CodeQL `37673099281`, and Developer Portability `37673099239`; Developer Portability again passed both Ubuntu and Windows clean-room jobs.

Merged-main Unit Coverage reproduced the baseline exactly on Node 24.21.0 / npm 11.19.0 and retained artifact `11504874549`, containing only normalized `coverage-summary.json` and `lcov.info` for 14 days (19,253 bytes; SHA-256 `8b8b6d4f999ce6d581c0cefe42b9fb5eb8aff063a9d1a56d3418d7c434e3b0e4`). This is a visibility baseline, not a quality threshold. Browser/configured/shared-resource/provider/release/production workflows remain separate acceptance layers.

The authoritative same-rubric reassessment is `docs/audits/ENT_009_COVERAGE_VISIBILITY_ASSESSMENT.md`. ENT-009 is complete/verified/merged/not deployed and changed no Vercel alias, production application source, Supabase/R2 resource, provider routing, secret, or production configuration.
## Coverage boundary

ENT-009 defines **unit coverage visibility**, not whole-system coverage.

1. **Denominator:** repository product source under `src/**` with `.ts` and `.tsx` extensions.
2. **Zero-covered source counts:** the report must include eligible source files even when the unit process never imports them.
3. **Excluded from the percentage denominator:** declaration-only `.d.ts`, tests, verification scripts, generated build output, `node_modules`, migrations, worker Python, documentation, and workflow YAML.
4. **Metrics:** statements/lines, functions, and branches from V8/Istanbul-compatible reporting.
5. **Execution source:** the existing Node unit suite remains the measured test input. ENT-009 does not instrument Playwright/configured/provider workflows and must not combine unlike test layers into a misleading single percentage.
6. **Canonical accepted baseline:** Node 24 on GitHub-hosted Linux from an exact implementation SHA. Windows/Linux portability of the repository remains guarded independently by ENT-008's Developer Portability workflow.

## In scope

### 1. Pinned coverage tooling

- Add exact dev-only `c8@12.0.0` through normal npm lockfile ownership.
- Keep coverage tooling out of runtime dependencies and production bundles.
- Prefer a repository-owned c8 config file so all-source scope, extensions, reporters, and exclusions are reviewable in one place.
- Do not add a hosted coverage vendor, token, badge service, or public artifact dependency.

### 2. Deterministic unit coverage command

Add one package script such as `npm run test:unit:coverage` that:

- executes the existing `tests/unit/*.test.mjs` suite;
- uses `--all` so unexecuted eligible `src/**` files remain in the report;
- includes `.ts` and `.tsx` product source;
- preserves the existing unit test failure semantics;
- writes deterministic coverage output to a repository-ignored `coverage/` directory;
- emits at minimum text summary, `coverage-summary.json`, and `lcov.info`.

Ordinary `npm run test:unit` must remain available and retain its current fast behavior.

### 3. Coverage-report integrity verifier

Add a small repository-owned verifier that fails when coverage output is structurally incomplete or the configured all-source denominator silently narrows.

At minimum it must verify:

- all four total metrics exist and are finite bounded percentages;
- `coverage-summary.json` contains per-file entries, not only totals;
- the set/count of reported source files matches the repository's eligible `src/**/*.ts(x)` coverage scope after explicit exclusions;
- at least one known currently unexecuted source file is represented rather than omitted, proving `--all` behavior;
- report paths stay repository-relative/safe enough for CI artifact use and do not contain environment secrets.

The verifier is an instrumentation-integrity gate, not a quality-percentage gate.

### 4. Secret-free coverage CI

Add one cheap least-privilege GitHub workflow, for example **Unit Coverage**, on pull requests and protected-main pushes.

The workflow must:

- use the repository's immutable checkout/setup-node action pins;
- run Node 24 and deterministic `npm ci --no-audit --no-fund`;
- require no Supabase, Cloudflare, Resend, Modal, Vercel, worker, provider, or production secrets;
- run the unit coverage command and coverage-report integrity verifier;
- publish a concise coverage table to the GitHub job summary;
- upload `coverage-summary.json` and `lcov.info` as a bounded artifact using the repository's immutable `actions/upload-artifact` pin;
- use `contents: read` only and no deployment/shared-resource mutation capability;
- be safely cancellable because it owns no shared fixtures.

### 5. Baseline visibility, not arbitrary percentage gates

ENT-009 must record the exact Node-24 all-source baseline produced by the final implementation head and again after merge.

Do **not** add `--check-coverage` percentage thresholds in the initial ENT-009 implementation merely to make the score look mature. The current all-source probe is intentionally low and reflects that most RenderLab assurance currently comes from integration/browser/configured workflows rather than Node unit tests.

A later phase may add realistic global/per-file non-regression thresholds or targeted unit-test expansion after the accepted baseline and uncovered-file distribution are reviewed. That decision must not be backfilled into ENT-009 without evidence.

### 6. Documentation

Update README/CONTRIBUTING and the appropriate architecture/status handoff to explain:

- what `npm run test:unit:coverage` measures;
- what it intentionally does not measure;
- where local reports are written;
- where CI publishes the summary/artifact;
- that a low unit-coverage percentage is not equivalent to absence of integration/browser acceptance;
- that coverage visibility is a risk-discovery tool, not permission to weaken existing configured workflows.

## Explicitly out of scope

ENT-009 does **not** authorize:

- browser/Playwright JavaScript coverage collection;
- merging configured/shared-resource/provider workflow results into one synthetic coverage percentage;
- adding a third-party coverage SaaS, token, public badge, or telemetry service;
- arbitrary global or per-file percentage thresholds before the exact Node-24 baseline is measured;
- broad unit-test expansion solely to raise the percentage;
- CI workflow consolidation, reusable-workflow migration, or broad Actions cleanup;
- large-module decomposition, CSS/UI refactoring, or package-architecture cleanup;
- performance/load/capacity benchmarking;
- further DR/provider-plan/backup changes;
- product UI/UX, route/API behavior, Auth/admission, schema/RLS, R2, worker/provider, scheduler, secret, or Vercel production changes;
- deployment or production alias movement.

## Architecture and security implications

- `c8` is dev-only and must not enter the production runtime dependency graph.
- Coverage collection runs against local source/unit processes only; it must not contact shared services.
- Coverage artifacts may contain repository file paths and line/function metadata but must not contain environment-variable values, credentials, fixture secrets, prompts/media, or shared-resource data.
- Existing Engineering Quality, CodeQL, Developer Portability, configured feature workflows, release-candidate gates, and production acceptance remain authoritative for their existing scopes.
- No browser/server trust boundary, data model, or external infrastructure ownership boundary changes.

## UI/UX and responsive review

No product UI change is authorized. Responsive/fidelity review is not required for a strictly tooling/test/CI/documentation implementation.

If implementation unexpectedly changes application source or rendered behavior, that is scope drift and must be removed or split into a separately authorized change with ordinary affected UI gates.

## Validation matrix

### Contract PR

Before this contract merges:

1. documentation-only diff;
2. `git diff --check` passes;
3. Engineering Quality passes on the exact contract head;
4. CodeQL passes on the exact contract head;
5. no production/shared-resource mutation or deployment occurs.

### Implementation PR

ENT-009 implementation may merge only after the exact implementation head proves:

1. `c8@12.0.0` is exact dev-only dependency state and deterministic `npm ci` remains green;
2. all existing 97+ unit tests pass under the coverage command on Node 24;
3. the report includes every eligible `src/**` TS/TSX source file after explicit exclusions, including zero-covered files;
4. statements/lines, functions, and branches are present in `coverage-summary.json` and LCOV is nonempty;
5. the report-integrity verifier fails closed on a deliberately incomplete/narrow fixture in focused unit tests;
6. the coverage workflow is secret-free, least-privilege, immutable-action-pinned, safely cancellable, and uploads only the bounded report artifact;
7. the GitHub job summary shows the exact all-source totals and clearly labels them **unit coverage**;
8. the exact Node-24 baseline and uncovered-file distribution are recorded without introducing arbitrary percentage gates;
9. Engineering Quality and CodeQL pass on the exact implementation head;
10. Developer Portability remains green on the exact implementation head when automatically attached by the dependency/config changes;
11. every automatically attached affected workflow reaches accepted success on that exact head;
12. repository documentation matches the verified coverage boundary;
13. no Vercel deployment/shared-resource mutation/provider-routing change occurs.

### Merged-main closure

After implementation merge:

- merged-main Engineering Quality and CodeQL must pass on the exact merge SHA;
- the new Unit Coverage workflow must pass on the exact merge SHA and publish its summary/artifact;
- Developer Portability must remain green when attached to the merge;
- a same-rubric enterprise reassessment is written only after those merged-main checks complete.

## Documentation outputs on completion

Update existing authorities rather than creating competing truth:

- this contract with exact implementation/merge evidence;
- README and CONTRIBUTING with the local coverage command and interpretation boundary;
- `docs/architecture/FRONTEND_ARCHITECTURE.md` with the verified coverage/validation architecture;
- `docs/STATUS.md` and `PROJECT.md` with exact ENT-009 status;
- a new `docs/audits/ENT_009_COVERAGE_VISIBILITY_ASSESSMENT.md` using the same 18-category rubric only after merged-main verification.

## Exit criteria

ENT-009 is complete when an exact Node-24 CI run publishes truthful all-source unit coverage for every eligible `src/**` TypeScript/TSX file, zero-covered files cannot silently disappear from the denominator, the same machine-readable summary and LCOV report are retained as bounded CI evidence, existing unit/integration/security gates remain intact, and merged-main verification proves the coverage path without production or shared-resource access.

A high percentage over only imported files does not count. A coverage badge without an auditable report does not count. Raising the number by excluding difficult source or weakening configured acceptance does not count.

## Next-phase dependency

After ENT-009 closes and the scorecard is reassessed, choose the next enterprise phase from verified remaining weakness. **Workflow/module maintainability** is the likely repository-local candidate; **performance evidence** and higher-maturity DR remain valid alternatives depending on the updated scorecard and whether provider/plan decisions are authorized. Do not expand those areas into ENT-009 retroactively.
