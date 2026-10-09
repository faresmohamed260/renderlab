# ENT-010 — CI workflow maintainability contract

Date: 2026-10-09
Status: COMPLETE / VERIFIED / MERGED / PRODUCTION-LIVE VIA CUMULATIVE 2026-10-09 ROLLOUT
Tracking: #362
Baseline `main`: `5ffb0ea2631a1ded4bb3481c4c3765a15252fe49`

## Goal

Reduce duplicated GitHub Actions mechanics in a bounded first cohort while preserving the exact validation, security, fixture-ownership, cleanup and cancellation semantics that make RenderLab's configured workflows trustworthy.

ENT-010 is repository/CI maintainability work only. It must not change product behavior, routes, account/security semantics, Supabase/R2 state, worker/provider routing, production configuration or deployment state.

## User value

A new engineer or AI session should be able to change the supported Node/npm setup or configured-app startup mechanics in one reviewed place instead of editing many near-identical workflow copies, without losing the workflow-specific controls that protect shared resources and test fixtures.

The result must reduce maintenance drift, not reduce validation depth. Fewer duplicated lines do not justify combining unrelated fixtures, weakening cleanup, changing concurrency, broadening permissions or skipping configured acceptance.

## Verified starting state

- ENT-009 is complete/verified/merged/not deployed. The authoritative enterprise score remains **8.8/10** (8.81 arithmetic mean).
- Current `main` is `5ffb0ea2631a1ded4bb3481c4c3765a15252fe49`.
- The repository currently has **56** files under `.github/workflows` and no `.github/actions` directory.
- The current configured browser workflows repeatedly spell out the same mechanical setup: SHA-pinned checkout, SHA-pinned `actions/setup-node`, Node 24, npm cache, `npm ci --no-audit --no-fund`, production build, Chromium installation, background Next.js startup, bounded health polling, failure-log output, verifier execution, cleanup and artifact upload.
- Four verified representative workflows are the first bounded cohort: `.github/workflows/create-lifecycle-visual.yml`, `.github/workflows/activity-visual.yml`, `.github/workflows/library-lifecycle-visual.yml`, and `.github/workflows/account-identity-visual.yml`.
- Those workflows are mechanically similar but **not semantically interchangeable**. They have different pull-request path filters, shared-resource secrets, health routes, verifier commands, cleanup commands, artifact contracts and concurrency policies. Library Lifecycle uses the non-cancellable shared group `renderlab-library-lifecycle-shared`; Activity uses `renderlab-activity-${{ github.ref }}` with `cancel-in-progress: false`; the other cohort workflows intentionally have their own current scheduling behavior.
- Existing Engineering Quality enforces immutable external GitHub Action references. Any local composite action introduced by ENT-010 must not create a blind spot where external actions inside `.github/actions/**` escape that rule.
- Application-module maintainability remains a separate measured problem. Current large hotspots include `src/features/create/create-workspace.tsx` at **1,306 lines**, `src/server/generation/native-generation.ts` at **939 lines**, `src/server/account/account-data-lifecycle.ts` at **763 lines**, and `src/features/library/library-batch-selection.tsx` at **546 lines**. ENT-010 deliberately does not decompose them.

## Audit conclusion

The safest first maintainability slice is **CI mechanics**, not application-module decomposition.

The four cohort workflows prove there is reusable setup/startup behavior, while their fixture and shared-resource differences prove that replacing them with one broad generic workflow would be unsafe. ENT-010 therefore centralizes only the smallest mechanically identical boundaries and leaves workflow ownership visible at each caller.

## In scope

### 1. Repository-local Node/npm setup action

Introduce one local composite action at `.github/actions/setup-node-project/action.yml` that owns only the repeated supported toolchain setup after checkout:

- use the repository's current immutable `actions/setup-node` SHA pin;
- select Node 24;
- retain the existing npm cache behavior and dependency-path contract;
- run `npm ci --no-audit --no-fund`;
- require no secrets and grant no permissions of its own.

Checkout remains caller-owned so each workflow keeps explicit source/ref semantics and immutable checkout pinning.

The action must not run build, install Chromium, start the app, create fixtures, access shared services, mutate data, upload artifacts or perform cleanup.

### 2. Repository-owned configured-app startup helper

Add a small cross-platform Node helper at `scripts/start-ci-app.mjs` for the repeated background Next.js startup + bounded readiness polling behavior used by the Linux configured-browser cohort.

The helper must:

- start the configured production server using the existing package command and caller-selected port;
- redirect server output to a caller-selected local log file;
- write the child PID to a caller-selected local PID file when requested;
- poll a caller-provided local health URL/path until success or a bounded timeout;
- fail closed with the captured server log when readiness is not reached;
- reject unsafe/invalid port, URL/path, timeout or output-path inputs rather than passing arbitrary shell fragments through;
- use no network target other than loopback/local configured-app readiness;
- require no credentials and own no fixture or shared-resource cleanup.

The helper is startup plumbing only. Individual verifier scripts continue to own product assertions and fixture lifecycle.

### 3. Bounded first workflow cohort migration

Migrate only these workflows in the initial implementation unless review proves another workflow is byte-for-byte equivalent at the relevant boundaries:

1. Create Lifecycle Visual;
2. Activity Visual;
3. Library Lifecycle Visual;
4. Account Identity Visual.

For each migrated workflow, preserve exactly:

- workflow name and trigger intent;
- pull-request path filters, adding the new local action/helper paths only where necessary so shared CI plumbing changes still trigger verification;
- `permissions`;
- job runner and timeout;
- all environment-variable names and secret references;
- concurrency group and `cancel-in-progress` behavior;
- production-build ordering;
- Chromium installation behavior;
- health target semantics;
- verifier command and arguments;
- `if: always()` cleanup behavior;
- failure-log behavior;
- artifact name, path, missing-file behavior and retention.

ENT-010 does **not** merge the four workflows into one fixture-owning reusable workflow.

### 4. Fail-closed CI contract verification

Extend Engineering Quality or add one repository-owned verifier so the new abstraction remains auditable.

At minimum it must verify:

- external `uses:` references remain immutable 40-character SHAs in both `.github/workflows/**` and `.github/actions/**`;
- local action references use repository-local paths rather than mutable external tags;
- the four cohort workflows use the approved local setup action after checkout;
- each cohort retains its expected verifier and cleanup command;
- cleanup remains guarded by `if: always()`;
- the Library and Activity concurrency contracts remain unchanged;
- the local setup action remains secret-free and contains only the approved setup/install responsibilities;
- shared helper/action paths are included in affected cohort trigger coverage so changes cannot silently bypass those workflows.

Focused unit/negative-fixture tests must prove the verifier rejects at least a mutable external action reference, missing cleanup guard, and lost protected concurrency behavior.

### 5. Startup-helper tests

Add credential-free focused tests for `scripts/start-ci-app.mjs` covering at minimum:

- successful loopback readiness;
- bounded timeout/failure;
- invalid/non-loopback health target rejection;
- invalid port/timeout/path input rejection;
- child-process/log/PID handling without leaving a long-running fixture process behind.

These tests must not require Supabase, R2, providers, Vercel or browser installation.

### 6. Documentation

Update existing repository authorities after implementation to explain:

- what the local setup action owns and deliberately does not own;
- what the configured-app startup helper owns;
- why fixture, secret, concurrency, verifier and cleanup semantics remain caller-owned;
- which workflows have migrated and which remain intentionally unchanged;
- how Engineering Quality prevents local actions from weakening immutable-action pinning.

## Explicitly out of scope

ENT-010 does **not** authorize:

- decomposing `create-workspace.tsx`, `native-generation.ts`, `account-data-lifecycle.ts`, `library-batch-selection.tsx` or other application modules;
- changing product UI/UX, routes, API contracts, Auth/admission behavior, schema/RLS, storage behavior or provider routing;
- replacing all 56 workflows with a new architecture in one phase;
- combining independent fixture workflows into one job merely to reduce YAML line count;
- changing shared-resource concurrency or cancellation safety;
- changing secret names, adding secrets or broadening permissions;
- removing configured/browser/provider acceptance because Unit Coverage exists;
- adding unit-coverage percentage thresholds or a broad coverage-raising campaign;
- performance/load/capacity benchmarking;
- DR/provider-plan/backup changes;
- GitHub-hosted runner policy changes;
- Vercel deployment, production alias movement or shared-resource mutation.

## Architecture and security implications

- Local composite actions are repository code and therefore enter the same review/supply-chain boundary as workflow YAML.
- External actions called from a local action remain third-party code and must stay immutable-SHA pinned.
- The local setup action must be credential-agnostic. Workflow callers remain the only owners of job-level secrets/environment state.
- The startup helper must not accept an arbitrary command string. It owns the fixed RenderLab start command plus validated parameters only.
- Shared-resource fixtures remain isolated by their existing workflow-specific verifier/cleanup contracts.
- No server/client trust boundary, data model, production resource or credential ownership boundary changes.

## UI/UX and responsive review

No product UI change is authorized. Responsive or visual fidelity review is not required for a strictly CI/tooling/documentation implementation.

The migrated configured workflows must still execute their existing visual/browser assertions and produce their existing evidence; those successful runs are regression evidence, not a redesign review.

If implementation changes rendered application source or behavior, that is scope drift and must be removed or split into separately authorized work.

## Validation matrix

### Contract PR

Before this contract merges:

1. documentation-only diff limited to the new contract plus current handoff/status authorities;
2. `git diff --check` passes;
3. repository text policy passes;
4. Engineering Quality passes on the exact contract head;
5. CodeQL passes on the exact contract head;
6. no product/runtime/shared-resource mutation or deployment occurs.

### Implementation PR

ENT-010 implementation may merge only after the exact implementation head proves:

1. the local setup action uses Node 24, deterministic npm install and immutable external action references;
2. the local setup action requires no secret and owns no fixture/shared-resource behavior;
3. the startup helper is fixed-command, loopback-only, bounded and fail-closed;
4. focused helper tests and CI-contract negative fixtures pass;
5. Engineering Quality scans external `uses:` references under both `.github/workflows/**` and `.github/actions/**`;
6. the four cohort workflows preserve their previous permissions, secret references, build/Chromium order, verifier commands, cleanup commands, artifact contracts and health semantics;
7. Library Lifecycle preserves `renderlab-library-lifecycle-shared` with `cancel-in-progress: false`;
8. Activity Visual preserves `renderlab-activity-${{ github.ref }}` with `cancel-in-progress: false`;
9. all four migrated configured workflows pass on the exact implementation head with successful cleanup;
10. Engineering Quality and CodeQL pass on the exact implementation head;
11. Developer Portability remains green when attached by the scripts/config changes;
12. every other automatically attached affected workflow reaches accepted success on the same exact head;
13. no application/runtime source, shared infrastructure, provider routing or production state changes.

### Merged-main closure

After implementation merge:

- merged-main Engineering Quality and CodeQL must pass on the exact merge SHA;
- all four migrated cohort workflows must pass when attached or be explicitly dispatched against the exact merge SHA for closure evidence;
- Developer Portability must remain green when attached;
- shared-resource fixture cleanup must be verified with no new residue;
- a same-rubric enterprise reassessment is written only after merged-main verification completes.

## Documentation outputs on implementation completion

Update existing authorities rather than creating competing truth:

- this contract with exact implementation/merge evidence;
- `docs/architecture/FRONTEND_ARCHITECTURE.md` with the repository CI abstraction boundary if it affects engineering architecture documentation;
- `docs/architecture/INFRASTRUCTURE.md` only if implementation changes documented cancellation/fixture mechanics (the contract does not authorize changing them);
- `docs/STATUS.md` and `PROJECT.md` with exact ENT-010 status;
- a new `docs/audits/ENT_010_CI_WORKFLOW_MAINTAINABILITY_ASSESSMENT.md` using the same 18-category rubric only after merged-main verification.

## Exit criteria

ENT-010 is complete when the bounded cohort uses one audited secret-free Node/npm setup boundary and one validated configured-app startup helper, the existing per-workflow fixture/concurrency/cleanup contracts are unchanged, immutable external-action pinning covers local composite actions, focused negative tests fail closed, exact-head and merged-main configured verification pass, and no product/shared-resource/production mutation occurred.

Reducing YAML while weakening cleanup does not count. Hiding mutable external actions inside a local action does not count. Merging independent fixture lifecycles for cosmetic line reduction does not count.

## Verified completion evidence

- Implementation PR #364 exact head `cfbffdb3725f2dd1d862e1a12bccda13d7124b4c` changed only the four audited workflow callers, repository-local CI tooling/tests and frontend-architecture documentation; no `src/**` application/runtime file changed.
- Exact-head PR evidence passed: Engineering Quality `37852283336`, Unit Coverage `37852284599`, Developer Portability `37852283459` (Ubuntu + Windows), CodeQL `37852284568`, Create Lifecycle Visual `37852283452`, Activity Visual `37852283481`, Library Lifecycle Visual `37852284476`, and Account Identity Visual `37852283390`.
- PR #364 squash-merged as `4b38c0d17ff2e03683f5bb160ba5ded2b6d81588`.
- Merged-main evidence passed on that exact SHA: Engineering Quality `37857367143`, Unit Coverage `37857367162`, Developer Portability `37857367142` (Ubuntu + Windows), and CodeQL `37857367144`.
- The four configured cohort workflows were explicitly dispatched against exact merged `main` because their push path filters do not all attach to the squash merge. Create `37857410281`, Activity `37857413881`, and Account Identity `37857420956` passed on attempt 1 with cleanup. Library `37857417090` first reached its real verifier but timed out waiting for the existing `Added to Library.` status assertion; that attempt still completed fixture cleanup successfully. The same job was rerun unchanged against the same merge SHA and passed on attempt 2, including R2 CORS reconciliation, configured upload verification, cleanup and artifact handling.
- The authoritative same-rubric reassessment is `docs/audits/ENT_010_CI_WORKFLOW_MAINTAINABILITY_ASSESSMENT.md`: **8.8/10** authoritative, **8.82** arithmetic mean.
- ENT-010 itself changed no product/runtime behavior, schema/Auth/storage/provider routing, production configuration or deployment state. The later cumulative production rollout is governed and recorded separately by the current-production authorities.

## Post-closure production reconciliation

- Repository closure PR #365 merged the authoritative assessment as `bcb2de305b15f4be15ed42674d22998c30b8c811` before deployment. The later release qualification ran against that exact application source: Engineering Quality `37858427171`, Unit Coverage `37858427155`, CodeQL `37858427128`, Developer Portability `37858427152`, Deployment Readiness `37858668167`, and Release Candidate Matrix `37858664995` attempt 2 all passed; the accepted matrix cohort was 23/23 configured children.
- Vercel deployment `dpl_4E38yZarWfooA4wfEuW5USmPnNsN` reached READY from exact Git source `bcb2de305b15f4be15ed42674d22998c30b8c811` before `renderlab.faresuniform.uk` was reassigned. Signed-out custom-domain smoke returned 200 for `/`, `/create`, `/library`, `/activity`, `/settings`, `/settings/password`, `/settings/profile`, and `/settings/preferences`; `/admin` retained the expected concealed 404 boundary. Bounded post-cutover inspection found no runtime-error clusters and no error/fatal logs for the new deployment.
- Production-documentation PR #366 merged as docs-only `main` `0b8110976d87ffa1e73e9340d3001386ab81f21f`. Permanent Production Documentation Sync run `37863995081` passed with expected production SHA `bcb2de305b15f4be15ed42674d22998c30b8c811`; merged-main Engineering Quality `37863953014`, Unit Coverage `37863953061`, CodeQL `37863953010`, and Developer Portability `37863952997` also passed. The newer docs-only `main` commit is intentionally not the deployed application SHA.
- This later rollout supersedes the contract's closure-time `NOT YET DEPLOYED` status only for current production state. It does not retroactively make deployment part of ENT-010 implementation scope, nor does it weaken the historical evidence that ENT-010 itself performed no deployment/shared-resource mutation.

## Next-phase dependency

After ENT-010 closes and the enterprise score is reassessed, choose the next phase from verified remaining weakness. **Application-module decomposition** becomes the natural maintainability follow-on only after the CI abstraction work proves stable; **performance evidence**, **targeted Node-unit breadth**, and higher-maturity DR remain valid alternatives based on the updated scorecard. Do not expand those scopes into ENT-010 retroactively.
