# ENT-008 — Developer portability and clean-room reproducibility contract

Date: 2026-10-07
Status: COMPLETE / VERIFIED / MERGED / NOT DEPLOYED
Tracking: #354
Baseline `main`: `d7037abf4c4b1e2cbafef9265584f5fae5a9acef`

## Goal

Raise RenderLab's weakest remaining enterprise category by establishing one explicit, secret-free engineering path that is reproducible from a fresh clone on the repository's supported Node/npm toolchain and passes on both GitHub Linux and native Windows.

ENT-008 is developer-tooling hardening. It must not change product behavior, routes, UI, Supabase/R2 state, worker/provider routing, application deployment state, or production configuration.

## User value

A new engineer or AI session should be able to clone the repository, install the declared toolchain, run the ordinary repository quality path, and distinguish local/tooling failures from shared-infrastructure failures without relying on undocumented machine state. Cross-platform repository checks should mean the same thing on Windows and Linux rather than passing only because CI normalizes line endings and shell behavior.

## Verified starting state

- ENT-007 is complete/verified/merged/not deployed. The authoritative enterprise score is **8.7/10** (8.68 arithmetic mean); **Developer experience/local reproducibility is 6.8/10**, the lowest remaining numerical category.
- Baseline `main` is `d7037abf4c4b1e2cbafef9265584f5fae5a9acef`.
- `package.json` declares `packageManager: npm@11.6.2`, `engines.node: >=24 <26`, and `engines.npm: 11.x`. `.nvmrc` and README target Node 24, while all current Node-based GitHub workflows use Node 24. The engine range therefore silently permits Node 25 even though repository documentation and CI do not qualify it.
- A clean native-Windows audit on WANDA used Node `25.2.1` + npm `11.6.2`, which is accepted by the current engine range. `npm ci --no-audit --no-fund` completed and the installed top-level dependency set resolved.
- The repository has no `.gitattributes` or `.editorconfig`. WANDA's global Git configuration has `core.autocrlf=true`; a clean checkout reported **517 tracked text files** as `i/lf w/crlf`.
- On that clean checkout, `npm run lint` and `npm run typecheck` passed, but `npm run test:unit` completed **91/93** because two workflow-contract tests use LF-only regexes against files checked out with CRLF:
  - `tests/unit/production-documentation-sync.test.mjs`;
  - `tests/unit/production-qa005-audit-contract.test.mjs`.
- On the same checkout, `npm run verify:engineering-quality` failed before its negative-fixture assertions with `spawnSync ...\node_modules\.bin\oxlint.cmd EINVAL`. The verifier explicitly selects `.cmd` package shims on `process.platform === "win32"` and passes those shims directly to `spawnSync`.
- Current hosted Engineering Quality and CodeQL run on Linux. There is no Windows clean-room/quality workflow proving the secret-free repository path.
- README documents Node 24/npm 11 and a basic `npm ci` → `npm run dev` path, while CONTRIBUTING lists ordinary quality commands. Neither document currently defines the supported Windows shell/toolchain boundary, a deterministic line-ending policy, or a machine-readable local preflight/doctor.
- The Vercel environment preflight is Vercel-only. Ordinary repository lint/type/unit/build checks are intentionally capable of running without production/shared-resource secrets; provider-backed and configured integration workflows remain separate.

## Supported developer boundary

ENT-008 will define and verify the following supported repository-development boundary:

1. **Canonical Node major: 24.** Repository engines, docs, local preflight, and CI must agree. Node 25 is not part of ENT-008 acceptance merely because it happened to be accepted by the previous broad engine range.
2. **npm 11.** Preserve the existing exact `packageManager` declaration and deterministic `package-lock.json`/`npm ci` install contract. The local preflight must report incompatible npm versions clearly rather than silently continuing.
3. **Supported OS evidence:** GitHub Linux plus native Windows. WSL2 follows the Linux command/tooling path; macOS may remain expected-compatible but is not an ENT-008 exit gate unless independently verified during implementation.
4. **Secret-free engineering path:** fresh clone + declared toolchain + `npm ci` + ordinary static/unit/build gates must require no Supabase, R2, Vercel, Resend, Modal, worker, or production credentials.
5. **Configured/live integrations stay separate:** shared-resource/browser/provider workflows keep their existing secret, fixture, cleanup, and authorization boundaries and are not converted into local bootstrap prerequisites.

## In scope

### 1. Canonical toolchain and developer preflight

- Align `package.json`, `.nvmrc`, README/CONTRIBUTING, and CI statements around the supported Node 24 / npm 11 boundary.
- Add a small repository-owned developer/toolchain preflight (for example `npm run doctor`) that fails with actionable messages for an unsupported Node major or incompatible npm major and reports the supported path without printing environment secrets.
- The preflight must not contact Supabase, Cloudflare, Vercel, Resend, Modal, or any other external service.
- Do not introduce a version manager dependency merely to enforce the contract; developers may use their preferred Node manager so long as the repository can verify the resulting toolchain.

### 2. Deterministic line endings

- Add a repository-level Git text/EOL policy so source, scripts, tests, workflows, configuration, and documentation do not change semantic behavior according to a developer's global `core.autocrlf` setting.
- The default text policy should converge repository text to LF unless a concrete platform file format requires another ending.
- Add a cheap verifier or equivalent acceptance check proving the intended tracked EOL policy rather than relying on one developer's Git configuration.
- Do not mass-reformat unrelated file contents. Any normalization must preserve semantic content and keep the implementation diff reviewable.

### 3. Newline-neutral repository contract tests

- Correct file-content assertions that accidentally depend on checkout EOL. At minimum, the two reproduced Windows failures above must preserve their semantic assertions while accepting the repository's canonical text representation safely.
- Audit similar tests that read workflows/configuration from disk for the same `\n`-only assumption where it can cause platform-dependent results.
- Do not weaken workflow-security, production-documentation, cleanup, or manual-only assertions to obtain portability.

### 4. Portable Engineering Quality subprocess execution

- Replace the current direct Windows `.cmd` spawning seam with a deterministic cross-platform invocation strategy for Oxlint and TypeScript negative fixtures.
- The implementation must preserve the core negative guarantee: intentionally bad lint and type fixtures must still fail and the verifier must fail if either tool unexpectedly accepts them.
- The cross-platform invocation must not use an unbounded shell string assembled from untrusted repository/user input.
- Keep the existing workflow-security, same-origin mutation coverage, and ENT-006 server-boundary checks inside Engineering Quality.

### 5. Cross-platform clean-room CI proof

Add one cheap, secret-free portability workflow or equivalent matrix gate that runs from a fresh GitHub checkout on at least:

- Linux with Node 24; and
- Windows with Node 24.

The matrix must prove the repository-owned secret-free path, including at minimum:

- supported toolchain/preflight;
- deterministic `npm ci --no-audit --no-fund`;
- lint;
- TypeScript no-emit;
- unit tests;
- Engineering Quality including negative fixtures;
- UI purity;
- Modal project-ownership static verification; and
- production build without production/shared-resource secrets.

The portability workflow must have least-privilege permissions, immutable external Action pins, deterministic installs, no shared-resource fixtures, no browser/provider work, and no production deployment behavior.

### 6. Developer documentation

Update README/CONTRIBUTING and the appropriate architecture/status handoff to make clear:

- the canonical Node/npm boundary;
- supported native Windows and Linux/WSL paths;
- the secret-free quality/bootstrap commands;
- which operations require configured shared-resource credentials and explicit authorization;
- that a repository clone is not expected to contain real `.env.local` credentials merely to run quality/build checks.

## Explicitly out of scope

ENT-008 does **not** authorize:

- conventional line/function/branch coverage measurement or coverage gates;
- CI workflow consolidation, reusable-workflow migration, or broad Actions cleanup beyond the one portability gate and narrowly necessary trigger coverage;
- large-module decomposition, CSS/global-style refactoring, or package-architecture cleanup;
- product UI/UX changes, route/API behavior changes, generation capability changes, or provider/worker routing changes;
- Supabase migrations, RLS/Auth changes, Cloudflare R2 resource changes, backup-policy changes, new secrets, or scheduler changes;
- Vercel production deployment, alias movement, environment mutation, or production smoke rollout;
- adding Docker/devcontainer/Nix/asdf tooling merely for breadth unless implementation evidence proves the minimal Node/npm path cannot satisfy the contract;
- guaranteeing native macOS as an exit criterion without actual evidence;
- supporting Node 25 in this phase.

Coverage visibility and maintainability remain separate follow-on enterprise phases after ENT-008 is verified and reassessed.

## Architecture and security implications

- No application/runtime architecture should change. The work belongs to repository tooling, tests, CI, and developer documentation.
- No browser/server ownership boundary changes.
- No database/data-model changes.
- No new credentials are expected.
- The new portability workflow must be credential-free and read-only with respect to shared services.
- Tool invocations must preserve argument boundaries and avoid introducing command-injection risk as a portability shortcut.
- EOL normalization must not alter generated binary assets or provider/model files.

## UI/UX and responsive review

No product UI change is authorized. Rendered responsive/fidelity review is not required for the contract itself or for an implementation that remains strictly tooling/test/documentation-only. If implementation unexpectedly changes production UI/source behavior, that is scope drift and must be split into a separately authorized change with the ordinary affected UI gates.

## Validation matrix

### Contract PR

Before this contract merges:

1. documentation-only diff;
2. `git diff --check` passes;
3. Engineering Quality passes on the exact contract head;
4. CodeQL passes on the exact contract head;
5. no production/shared-resource mutation or deployment occurs.

### Implementation PR

ENT-008 implementation may merge only after the exact implementation head proves:

1. repository toolchain declarations/docs agree on Node 24 + npm 11;
2. the local preflight fails closed on unsupported toolchain input and passes on the supported toolchain;
3. deterministic EOL policy is present and verified;
4. the two reproduced Windows CRLF unit-test failures are fixed without weakening their assertions;
5. Engineering Quality negative lint/type fixtures execute and pass their rejection assertions on both Linux and Windows;
6. a fresh Windows Node-24 checkout passes `npm ci`, lint, typecheck, all unit tests, Engineering Quality, UI purity, Modal ownership verification, and production build without shared-resource secrets;
7. a fresh Linux Node-24 checkout passes the same secret-free matrix;
8. Engineering Quality and CodeQL pass on the exact implementation head;
9. every automatically attached affected workflow reaches accepted success on that exact head;
10. repository documentation matches the verified supported-development boundary;
11. no Vercel deployment/shared-resource mutation/provider routing change occurs.

### Merged-main closure

After implementation merge:

- merged-main Engineering Quality and CodeQL must pass on the exact merge SHA;
- the portability matrix must pass on the exact merge SHA if its push trigger is part of the accepted implementation;
- a same-rubric enterprise reassessment is written only after merged-main verification completes.

## Documentation outputs on completion

Update existing authorities rather than creating competing truth:

- this contract with exact implementation/merge evidence;
- README and CONTRIBUTING with supported toolchain/OS/bootstrap guidance;
- `docs/architecture/FRONTEND_ARCHITECTURE.md` or the most appropriate existing engineering authority with the verified local/remote validation boundary;
- `docs/STATUS.md` and `PROJECT.md` with exact ENT-008 status;
- a new post-ENT-008 same-rubric enterprise assessment only after implementation merge and merged-main verification.

## Exit criteria

ENT-008 is complete when a fresh engineer can use the documented Node 24/npm 11 path on native Windows or Linux, install from the lockfile, and run the complete secret-free engineering-quality/build path with equivalent results; repository text behavior no longer depends on a machine's global CRLF checkout setting; Engineering Quality's negative fixtures are portable; and exact-head plus merged-main CI proves those properties without touching production or shared resources.

Passing only on Linux does not count. Making Windows green by weakening workflow/security assertions does not count. A README claim without a clean-room matrix does not count.

## Next-phase dependency

After ENT-008 closes and the scorecard is reassessed, choose the next enterprise phase from verified remaining weakness. **Coverage visibility** is currently the likely candidate, but it stays roadmap-level until ENT-008 evidence shows the new baseline. Do not expand coverage tooling into ENT-008 retroactively.
## Implementation and repository closure — 2026-10-07

- Implementation PR #356 exact head `82bcf35d7d5ce3f5d3b8309f12457fae9a582d15` passed all **27/27 attached checks**. Developer Portability `37654689761` passed fresh Node-24 Ubuntu and Windows clean-room jobs; Engineering Quality `37654689460` and CodeQL `37654689450` passed; every package-triggered configured regression reached accepted success, including Generation Admission `37654689427` with cleanup.
- Native WANDA verification additionally proved the reproduced Windows defects are closed: 97/97 unit tests and Engineering Quality pass, the former `.cmd EINVAL` is gone, and a fresh checkout under global `core.autocrlf=true` reports 524 tracked text files LF/LF plus 35 non-text binaries. `npm run doctor` correctly rejects unsupported Node 25.2.1.
- PR #356 squash-merged as `e6ea8210c47a2d49531daaa0cd80f7267ff488f4`. Merged-main Engineering Quality `37655904404`, CodeQL `37655904054`, and Developer Portability `37655903920` all passed on that exact SHA; the portability run again passed both Windows and Ubuntu jobs.
- The authoritative same-rubric reassessment is `docs/audits/ENT_008_DEVELOPER_PORTABILITY_ASSESSMENT.md`: arithmetic mean **8.80**, authoritative rounded enterprise score **8.8/10**, up from 8.7 after ENT-007.
- No production/shared-runtime mutation occurred. ENT-008 did not deploy Vercel application source, move aliases, mutate Supabase/R2, change provider routing, add secrets, or expand into coverage/CI consolidation/module decomposition.
