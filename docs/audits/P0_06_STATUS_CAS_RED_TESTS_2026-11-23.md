# P0 status-conditional writers: red witness (PR A)

**Date:** 2026-11-23. **Base:** `14e68d4d4bea7b51c72cedcc96e10e0fa6823bb3` (merged Unit 5). **Change type:** tests and fake-I/O fixtures only. No runtime, schema, gateway, secret, production, generation or other-repo modification.

## Writer inventory

- `src/server/generation/native-generation.ts:261-272` has an owner+job filtered **unconditional** generic `patchJob()`; its callers update worker history, reassignment, pending poll, failed state, persisting and succeeded finalization, and are also reached from `upscale-lifecycle.ts`.
- `src/server/generation/submit-upscale.ts:85-98` has another owner+job only `patchUpscaleJob()`, used for legacy upscale submission outcome and submission failure. Though retired for new submissions, its retained writer still needs terminal protection.
- `cancel-generation.ts` has direct status-conditional PATCHes with reconcile token. `reconcile-generation.ts` stale missing-dispatch fallback already filters active statuses. The 2026 outbox dispatch stored procedures and SQL status CHECK are separately governed by the Unit 4 inventory and are **not** replaced here.
- Unit 4's `generation-job-state-machine.ts` pure table is used as the invariant oracle; it was deliberately unwired. No SQL state transition trigger exists.

## Test-first red baseline

The five production-path sentinels in `tests/unit/generation-terminal-cas-sentinels.test.mjs` use the Unit 5 mock PostgREST's interposition hook exactly **between the caller's stale snapshot and the database PATCH**. Each witness simulates a legal concurrent terminal result and then checks that the stale PATCH is rejected. Cases:

1. Cancel wins before a ready provider can mark persisting: prevent cancelled → succeeded plus R2/media effects.
2. Another worker fails the job before late ready provider result: prevent failed → succeeded.
3. Another writer succeeds before late process-exit failure: prevent succeeded → failed.
4. A stale poll attempts a pending/running update after settlement: return the typed `{ok:false,reason:"already_terminal_or_changed",current}` result; no PATCH mutation.
5. Existing durable asset is terminalized during owner-return recovery, then owner returns twice and a stale retry attempts failure: no duplicate mutation, output or release.

**Observed on unchanged runtime:** `RENDERLAB_P0_CAS_WITNESS=1 node --test tests/unit/generation-terminal-cas-sentinels.test.mjs` ⇒ **5 tests, 0 pass, 5 fail, 0 skip**. Failures demonstrated cancelled→succeeded, failed→succeeded, succeeded→failed, absent typed conflict and redundant successful same-state terminal PATCH. This RED outcome is intentional, not an unrelated test failure.

**PR A CI:** To retain exact-head required green checks before the runtime fix, these five sentinels use `test.skip` by default, with the explicit witness environment variable enabling them for independent RED replay. `npm run test:unit` ⇒ **438 total, 433 pass, 0 fail, 5 skipped**. PR B MUST remove the skip gate and make all five tests normal CI requirements; the post-fix full suite must pass all existing 433 unchanged plus new tests.

## Test-double limits

Mock PostgREST must enforce `status=eq.<expected>` in the final fix, exactly as a database conditional PATCH would; it is not a proof of SQL transaction isolation. The fake performs the interleaving before evaluating the filter. PR B needs to return a typed conflict and read the latest owner-scoped job without overwriting it; idempotent callers must not persist bytes or release a reservation on a stale nonterminal result. The schema and SQL RPCs are untouched.

## Gate

PR A must pass exact-head six protected checks + CodeQL and merge; no release for tests-only. PR B is a separate runtime change subject to the production release runbook and explicit disposable-generation approval. In the absence of that approval, stop after PR B merge; do not deploy.
