# P0-05 — Deterministic critical-path harness: test map and evidence

**Status:** P0-05 test-only candidate; final merge and exact-head CI evidence must be added after independent verification. **Date:** 2026-11-23. **Source:** [P0 contract](../architecture/BACKEND_PROFESSIONAL_BASELINE_P0_CONTRACT.md), [Unit 4 state machine](../architecture/P0_04_GENERATION_STATE_MACHINE_SPEC.md). **Base application/source:** `b98b64c6e21c7f95fd2cd3bcee4ef34570bb1a6a` (merged Unit 4). No runtime, schema, production release, Modal, real generation, secret or other-repository change.

## Recovery and implementation

A prior session left three untracked files in the isolated WANDA worktree `B:\JARVIS\renderlab-p0-05-critical-path` on branch `test/p0-05-deterministic-critical-path`, with no Unit 5 commits, remote branch or PR. They were reviewed, run, and extended with accepted-but-response-lost dispatch, wake-before-send failure, concurrent callbacks and a reproducible 20-process signature verifier. `origin/main` remained at the Unit 4 base before creating this PR.

- `tests/helpers/generation-critical-path-runtime.mjs`: injected loader hooks substitute the network/I/O boundaries, not the production generation modules. Fake PostgREST RPCs and owner filters, guarded reconciliation claims, in-memory outbox/reservations/media rows, fake Modal gateway, in-memory R2 bytes/thumbnail, fixed `Date` and UUIDs, controlled `AbortSignal.timeout` and Next.js `after()`.
- `tests/unit/generation-critical-path-offline.test.mjs`: imports the actual POST API, admission, submission, native dispatch, poll, reconciliation, cancellation, owner-return, and persistence implementations. All unknown fetch origins throw. No external request, real user account, GPU, storage, wall-clock wait, randomness or email is required.
- `tests/helpers/verify-generation-critical-path-determinism.mjs`: spawns **20 independent Node processes**, requires **23/23** tests passed in each with no failure/skip, and compares SHA-256 of the happy-path terminal/job/media/reservation/outbox ordered event record. Ignores nondeterministic runner duration.

This is an **offline application-orchestration harness**, not a real Postgres/SQL transaction or Modal worker test. Fake outbox state transitions and fake RPC semantics model selected production migrations; SQL transaction isolation and multi-process worker behavior cannot be claimed from this test.

## Named critical-module coverage, baseline vs added Unit 5 tests

`c8` all-source Node unit **line coverage**, with source denominator constant across runs. Baseline ran `node_modules/.bin/c8 --config .c8rc.json node --test` on only the **410 tracked pre-Unit-5 tests**; final ran `npm run test:unit:coverage` with **433 tests**, then `npm run verify:unit-coverage`. Both ran locally on the same Unit 4 application source. Branch counters are listed as observed, but the V8 branch denominator can change as tests exercise newly instrumented paths: do not interpret branch numerators as a fixed-denominator regression.

| Production module (under `src/server/generation/`) | Before lines | After lines | New covered lines | Predeclared target | Before → after branches |
| --- | ---: | ---: | ---: | --- | ---: |
| `poll-generation.ts` | 0/49 (0.00%) | 25/49 (51.02%) | +25 | ≥40% **met** | 0/1 → 8/13 |
| `cancel-generation.ts` | 71/387 (18.34%) | 301/387 (77.77%) | +230 | ≥35% **met** | 3/6 → 47/86 |
| `native-generation.ts` | 582/1095 (53.15%) | 658/1095 (60.09%) | +76 | ≥60% **met** | 65/127 → 87/154 |
| `reconcile-generation.ts` | 167/229 (72.92%) | 188/229 (82.09%) | +21 | ≥80% **met** | 37/52 → 48/59 |
| `submit-generation.ts` | 145/246 (58.94%) | 156/246 (63.41%) | +11 | ≥60% **met** | 29/45 → 39/55 |
| `generation-admission.ts` | 102/113 (90.26%) | 102/113 (90.26%) | 0 | Maintain ≥90% **met** | 15/21 → 18/24 |
| `owner-generation-settlement.ts` | 73/75 (97.33%) | 73/75 (97.33%) | 0 | Maintain ≥95% **met** | 25/27 → 26/27 |

Newly exercised branch paths include owner-scoped poll, queued/running/preparing/cancelling cancel claims, provider HTTP 202/404/409/422/503, terminal/persisting replay, wake failure/response loss, owner-return R2 recovery, and simultaneous callbacks. Aggregate all-source lines also moved from 7,323/28,657 (25.55%) to 7,688/28,657 (26.82%), and 132 of 214 currently tracked eligible files remain zero-line: **not** evidence of comprehensive repository behavior coverage. Separate browser, SQL, hosted, recovery and provider qualifications are outside this numerator.

## Negative/positive matrix (23 tests)

| Boundary | Cases verified by imported runtime modules |
| --- | --- |
| Submit, admission, dispatch, persist, release | API 202, admission reservation, same-intent outbox RPC, Next after-wake, authenticated poll, provider bytes, primary/thumbnail R2 writes, one media row, succeeded and one reservation release |
| Admission and owner-isolation denial | Rate limit HTTP 429 with no job/outbox/provider, foreign owner cannot poll A's job, owner-scoped input/source/mask validity |
| Cancellation at each stage | Queued before dispatch, legacy preparing, running and provider DELETE, cancelling retry/confirmation, persisting refusal, terminal refusal, repeated cancel |
| Provider and ambiguity | 202 pending, retryable 503, terminal 422, exact 409 `FIBO_PROCESS_EXITED`, ambiguous provider 404 up to exact 2h, missing-dispatch 15m fallback |
| Interrupted finalization and owner return | Fail once after primary R2 write; owner return on Activity resumes persisting from durable bytes without a new provider poll; terminal replay releases once |
| Replay and delivery races | Repeated reconcile/poll, two wakes, queued unconfirmed dispatch, response-lost 503 **after dispatch accepted**, wake failure **before acceptance**, overlapping reconciliation callbacks; one durable media row and one release |

**Independent determinism invocation:** `node tests/helpers/verify-generation-critical-path-determinism.mjs`. Observed: **20 independent green processes × 23/23 tests, zero failures/skips**, identical event SHA-256 `342fc383f034ccc2d3ef7bc77409d84ff86cea801d1261fef068db2c47d81598`. The signature encodes ordered DB/provider operations and final status, output IDs, outbox state, media/R2 write counts, and reservation release.

**Local acceptance:** `npm run test:unit:coverage` 433/433; `npm run verify:unit-coverage` pass (214 files); `npm run typecheck`, `npm run lint`, `npm run build`, `npm run verify:engineering-quality`, `npm run verify:ui-purity`, `npm run verify:docs-governance` pass. CI six required exact-head contexts plus CodeQL must be verified **on the PR head** before merge. The non-required blocked Vercel preview does not qualify or block this test-only PR. No production release.

## Exit-gate and limitations

See [same-rubric P0 re-review](PHASE3_P0_EXIT_GATE_REASSESSMENT_2026-11-23.md). The harness supplies real application path tests, not proof of atomic SQL transitions, complete terminal immutability, always-on settlement, a full fresh-database migration run, or a single-command development backend. These remain separate architecture/reliability risks; they cannot be converted into a higher score by repeating the fake harness.

**Follow-ups for independent review only:** (1) status-conditional owner/job/reconciliation-token writes at `patchJob()` and every terminal status writer, with race/CAS tests; (2) atomic database terminalization + admission release RPC, with one-output uniqueness, idempotence, owner and privilege SQL integration tests. Both are production-affecting proposals and require explicit approval, reviewed rollout/rollback and same-sitting runbook release; no implementation in this PR.
