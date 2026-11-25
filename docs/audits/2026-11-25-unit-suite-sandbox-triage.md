# Unit suite sandbox triage — 2026-11-25

Clean base and local `origin/main` both resolved to `2fd33e77fa7167fad278712d49d5ae7c55301022`. The unmodified `npm run test:unit` ran 115 files and returned exit 1 on both Node 24.22.3 (the CI major) and Node 22.23.5. Both runs reported 108 passing files and the same seven failing files.

## Isolated failures

Each row records a separate Node 24 invocation of `node --test --test-isolation=none tests/unit/<file>.test.mjs`. All seven returned exit 1. The counts below are individual tests within each file.

| Unit file | Isolated result | Classification and evidence |
| --- | --- | --- |
| [admin-timestamp-hydration.test.mjs](../../tests/unit/admin-timestamp-hydration.test.mjs#L123) | 0 passed, 1 failed | **Sandbox-only — child stdin.** The parent timed out after 15 seconds in `spawnSync` before the first SSR comparison. It passes SWC-transformed source as `input`, which the child reads from fd 0. A minimal synchronous child that reads fd 0 also timed out. Running the extracted, unmodified render program with shell-redirected input produced byte-identical SSR HTML and empty stderr for all four timezone/locale pairs. Each result contained `UTC` and the `invalid-date` fallback. |
| [backend-demo.test.mjs](../../tests/unit/backend-demo.test.mjs#L24) | 0 passed, 7 failed | **Sandbox-only — synchronous child.** Each case failed with `spawnSync /opt/node24/bin/node EPERM` at the first `execFileSync`, before any lifecycle assertion. Running the offline CLI directly for each of the seven scenarios twice produced identical per-scenario JSON and the expected terminal states. |
| [ci-p1-04-savings.test.mjs](../../tests/unit/ci-p1-04-savings.test.mjs#L64) | 3 passed, 1 failed | **Sandbox-only — fixture signing and nested Git.** The first temporary fixture commit inherited SSH signing, and the sandbox blocked the signer's loopback socket. Disabling signing for one diagnostic invocation reached the classifier and failed the positive docs-only assertion. The unchanged CLI reported `full (mode-or-consumer-uncertain)` on an audit-only temporary Git history. The matching `git grep` probe returned status 1 as expected for an absent reference, plus `error.code=EPERM` through `spawnSync`. The classifier treats that error as uncertain and selects full validation. |
| [docs-governance.test.mjs](../../tests/unit/docs-governance.test.mjs#L31) | 13 passed, 1 failed | **Sandbox-only — synchronous Git.** The complete verifier threw `spawnSync git EPERM` at its tracked-file inventory, before returning governance counts. The negative metadata and reference cases passed. The standalone `npm run verify:docs-governance` hit the same error. |
| [provider-adapter-conformance.test.mjs](../../tests/unit/provider-adapter-conformance.test.mjs#L266) | 13 passed, 1 failed | **Sandbox-only — synchronous child.** The failing case surfaced `spawnSync /opt/node24/bin/node EPERM` when launching UI purity. The standalone purity command passed across 42 feature/shell TSX files. |
| [runtime-env-contract.test.mjs](../../tests/unit/runtime-env-contract.test.mjs#L192) | 16 passed, 1 failed | **Sandbox-only — synchronous child output.** The fixture assertion saw empty stdout. Repeating its exact child invocation from a diagnostic Node parent returned status 0, `error.code=EPERM` and empty stdout/stderr. Running `VERCEL= node scripts/verify-vercel-env.mjs --fixture` directly exited 0 and printed the expected message for 16 synthetic names. |
| [start-ci-app.test.mjs](../../tests/unit/start-ci-app.test.mjs#L19) | 1 passed, 2 failed | **Sandbox-only — loopback listen.** Both integration cases failed at the fixture's `server.listen(0, "127.0.0.1")` with `listen EPERM`, before starting the child app. The configuration validation case passed. |

The reported [FIBO process-exit reconciliation](../../tests/unit/fibo-process-exit-reconciliation.test.mjs#L134) failure did not reproduce on this base. It passed in both full runs and passed all 25 isolated cases. The file mocks `globalThis.fetch` and exercises its HTTP-shaped responses in process.

## Timing and shared state review

| Source | Finding |
| --- | --- |
| [generation-idempotency-app.test.mjs](../../tests/unit/generation-idempotency-app.test.mjs#L226) | **Fixed.** The keyed admission case sampled the wall clock before submission and allowed up to one second of scheduling delay before the RPC deadline was constructed. A temporary 1,100 ms pause after sampling made that assertion fail on unchanged code. With the per-test Date clock frozen, the same pause passed and the assertion required exactly 750,000 ms. The pause was removed and the complete file passed 28/28. |
| [start-ci-app.test.mjs](../../tests/unit/start-ci-app.test.mjs#L19) | The fixture releases its ephemeral port before spawning the listener, leaving a port allocation race. The timeout case also expects the child to log before a 150 ms readiness timeout ([lines 123–147](../../tests/unit/start-ci-app.test.mjs#L123)). A loaded runner could miss that timing window. Isolated execution here stops at the prohibited bind before either risk can be measured. |
| [docs-governance.test.mjs](../../tests/unit/docs-governance.test.mjs#L30) and [external-fact-governance.test.mjs](../../tests/unit/external-fact-governance.test.mjs#L14) | Live registry checks intentionally use the current date to enforce freshness and future-date rules. The documentation metadata cases that exercise age rules use fixed inputs. |
| [fibo-process-exit-reconciliation.test.mjs](../../tests/unit/fibo-process-exit-reconciliation.test.mjs#L17), [generation-idempotency-app.test.mjs](../../tests/unit/generation-idempotency-app.test.mjs#L18), and [w4c-diagnostics-mail.test.mjs](../../tests/unit/w4c-diagnostics-mail.test.mjs#L10) | These fixtures install process-wide import hooks, environment values or fetch overrides. The checked-in suite runs each file in a separate process. Sharing a worker across these files would make fixture setup and module caching order-sensitive. The isolated repro commands each load one file. |

## Verification

- The candidate full unit run retained the clean-base outcome of 108/115 passing files and the same seven sandbox failures.
- `npm run lint`, `npm run verify:ui-purity`, and `npm run typecheck` passed. Lint printed existing warnings.
- `npm run verify:docs-governance` and `npm run verify:text-policy` returned exit 1 with `spawnSync git EPERM`.
- The checkout has no root Playwright config. Bare `npx playwright test --list` returned exit 1 after picking up Node unit files. With `--list -c` and the checked-in configs, discovery passed for component specs (76 in 15 files), axe (3 in 1), component review (12 in 2), performance (4 in 1), and Landing measurement (2 in 1).
- Hosted required checks, complete governance and text policy results, and mounted/browser behavior remain unverified.
