# P0 status-conditional job writes — PR B qualification and release plan

**Date:** 2026-11-23. **Change category:** application runtime correctness fix, **not yet deployed**. Prerequisite: [PR A red witness evidence](P0_06_STATUS_CAS_RED_TESTS_2026-11-23.md), merged as PR #556 at `7d30d7cd06276a838d300ce9c0a75cd701fee68a`. **Owner's one-disposable-generation approval: NOT RECEIVED.** Do not deploy without that approval; stop after qualified PR B merge.

## Runtime scope

- [`native-generation.ts`](../../src/server/generation/native-generation.ts): `patchJob(owner,job,patch,expectedStatus)` now returns a discriminated `{ok:true,row}` or `{ok:false,reason:"already_terminal_or_changed",current}` result. The PATCH uses owner, job **and expected status** in one conditional database mutation, and it refuses to physically update an already-terminal expected status. `patchJobRow(row,patch)` resolves a current owner-scoped snapshot while retaining an `applied` flag.
- Every generic native caller checks the guarded result. A lost CAS in the provider-ready→persisting path **stops before R2/media side effects**; a lost claim in reassignment **does not dispatch a standby worker**; failed/ready/pending/complete calls observe the actual current state and do not write over it.
- [`upscale-lifecycle.ts`](../../src/server/generation/upscale-lifecycle.ts) uses the same helper for retained legacy paths and stops before persistence on a lost CAS. [`submit-upscale.ts`](../../src/server/generation/submit-upscale.ts) guards its separate job PATCH with owner+job+status and returns typed current state on conflict. Retired Upscale remains retired for new submissions.
- Cancellation's existing status/reconciliation-token CAS, stale missing-dispatch's status-filter PATCH, and SQL outbox RPCs are unchanged. No migration, role grant, new secret, worker change or new surface.
- Reviewed `tests/fixtures/supabase-rest-callsite-registry.json` now captures **140** privileged service-role sites, up from 138: existing line-number changes and two explicitly owner-filtered `generation_jobs` GETs on the retained Upscale conflict path. Registry AST and owner-binding tests must pass.

## Verification and limits

**Local qualification on WANDA (Node 25; GitHub CI Node 24 remains authoritative):** `npm run test:unit` and `npm run test:unit:coverage` passed **439/439**, zero skipped; `npm run verify:unit-coverage` passed with 214 eligible source files. The Unit 5 verifier passed **20 independent processes × 23/23** with unchanged event signature `342fc383f034ccc2d3ef7bc77409d84ff86cea801d1261fef068db2c47d81598`. `npm run typecheck`, `npm run lint`, `npm run build`, `npm run verify:engineering-quality`, `npm run verify:ui-purity`, `npm run verify:docs-governance` and `git diff --check` all passed. The first full test pass exposed a call-site registry drift plus a local startup timing failure; updating the two owner-scoped registry entries and rerunning yielded a full green suite. Exact-head GitHub validation is still required before merge.



PR A produced five intentional RED race/replay witnesses. PR B unskips them and adds a direct-terminal expected-status regression: cancellation wins versus completion, failure wins versus a late ready result, success wins versus a late process-exit, a stale pending poll after terminal, recovery/double owner-return/retry after terminal, and direct terminal expected-status refusal. The existing 433 Node tests must remain unchanged and pass. Include offline Unit 5 20-process determinism verification and targeted owner/cancel/SQL-conformance tests.

**Limit:** Status-only compare-and-swap is not the proposed atomic SQL terminalize-and-release transaction. A same-status concurrent writer may still be serialized only by the separately existing reconciliation claim, and job terminalization plus admission release remain separate operations. The database-backed race/transaction harness is still unbuilt. The state machine's pure module is used for terminal-status evaluation but is not a globally enforced transition table. Do not claim database isolation from fake PostgREST alone.

## Release gates (all future actions; not authorized by merge)

**Production baseline and rollback anchor:** the canonical `docs/production/current.json` names application SHA `2a64d4ccc03e8f8ce1e415d298687321179efb50`, READY Vercel deployment `dpl_7X5xzARHaT7nXkzoHMoHiGxi1xfa` at `renderlab.faresuniform.uk`; existing rollback anchor `dpl_ChVfct9Zsy2UY19QKKHYHetER46S` at `30634662fb0319e3b6a943af2c89872ef607104b`. The **pre-PR-B current deployed version** (`dpl_7X5xzARHaT7nXkzoHMoHiGxi1xfa`) is the preferred rollback target for the PR B runtime change, provided a fresh provider read-back proves READY and correct team/project. No release candidate deployment has been made here.

1. Obtain explicit owner approval for **one** disposable generation with a fixture account, spend bound and complete cleanup, and separately confirm role/approval for production promotion. Without it, **STOP after PR B merge**; never stage/publish/promote.
2. Re-read current manifest, Vercel team/project and same-project READY deployment/alias using authoritative provider state. Check 16 required Production names **without exposing values**, enforce closed-beta and mask flags, and confirm active jobs/outbox queue safe. Set the exact merged PR B SHA, capture expected source, rollback and cutover runbook evidence.
3. Run exact-head six protected CI checks plus CodeQL, and **Deployment Readiness** for the exact PR B merge SHA. Verify READY qualification before any cutover.
4. Use the approved Vercel dashboard redeploy procedure for the exact qualified merge SHA and record source provenance, immutable deployment ID, Vercel READY, alias timestamp, and rollback anchor. **No Modal change.** If dashboard does not prove exact source SHA, stop rather than guessing.
5. After live cutover, perform only the separately approved one disposable fixture generation (submit→settle, cancel race only if feasible within same bound), verify media and admission state, and clean every run-owned job, R2 object and media/temporary fixture. Stop on unexpected provider response. Do not generate more without fresh approval.
6. In the same sitting, open/merge the **production-record PR** updating `docs/production/current.json` and five human mirrors with actual read-back, then run and pass **Production Documentation Sync** against the exact deployed SHA before starting any next phase work.
7. If a regression occurs, restore the verified **pre-PR-B deployed** `dpl_7X5xzARHaT7nXkzoHMoHiGxi1xfa` using the authorized Vercel rollback route, verify alias and access/private fail-closed controls, and make a matching production record/sync. No worker rollback is needed because no worker change is permitted.

**No scheduled release, no automation, and no use of a real provider in PR B validation.** Owner review of the release condition is separate from green code checks.
