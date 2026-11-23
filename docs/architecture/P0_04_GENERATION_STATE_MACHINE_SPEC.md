# P0-04 — Generation job state-machine inventory and conformance

**Status:** P0 Unit 4, behavior-preserving specification and tests only. **Date:** 2026-11-23. **Authority:** [Backend professional baseline P0 contract](BACKEND_PROFESSIONAL_BASELINE_P0_CONTRACT.md). **Scope:** existing FIBO image beta, retained historical operations and existing Supabase SQL; no runtime wiring, schema migration, secrets, provider calls, generations, or release.

**Post-Unit-4 correction, as of 2026-11-23:** P0-06 guarded writes were **merged and production-released**, and P0-07's service-role atomic terminalization RPC (migration 0031) and converted FIBO terminal paths were subsequently released. [P0-06 release evidence](../audits/PHASE3_P0_RELEASE_BACKED_GATE_REASSESSMENT_2026-11-23.md); [Phase 3 closeout](../audits/PHASE3_BACKEND_P0_CLOSEOUT_2026-11-23.md); [P0-07 smoke evidence](../audits/PHASE3_P007_ATOMIC_PRODUCTION_SMOKE_VERIFICATION_2026-11-23.md). The original Unit 4 gap inventory below is **historical, not a description of current unguarded patchJob**. Expected-status CAS is not a global SQL transition trigger; P0-07 conversion is not universal and residual terminal+release exceptions remain.

## Verified status and transition inventory

One generation job has exactly **eight** allowed SQL status *values*. The check constraint allows values, **not transitions**. The new pure model in [generation-job-state-machine.ts](../../src/lib/capabilities/generation-job-state-machine.ts) models observed/intended edges but **is not called by production writers**. The exhaustive [transition tests](../../tests/unit/generation-job-state-machine.test.mjs) assert all 64 state pairs; the [SQL conformance tests](../../tests/unit/generation-job-sql-conformance.test.mjs) compare the actual migrations.

| Current state | Allowed distinct-state successors | Existing performer and condition | Terminal? |
| --- | --- | --- | --- |
| queued | running; cancelling; cancelled; persisting; failed | 2026 dispatch recovery finish RPC conditionally promotes queued to running; cancel endpoint CAS to cancelling; outbox queued-cancel RPC atomically marks cancelled if execution not begun; FIBO poll can see ready result while queued and enter persisting; dispatch failed or stale missing dispatch marks failed | No |
| preparing | running; cancelling; persisting; failed | Retained legacy-compatible status, not a current new FIBO dispatch entry state. Same generic poll, cancellation and stale-failure paths are capable of updating it when a historical row is encountered | No |
| running | cancelling; persisting; failed | Cancellation accepts under reconciliation claim; provider READY transitions to persisting; process-exit, terminal provider failure, stale/unconfirmed responses and fallback paths mark failed. A reassign or pending poll can retain running | No |
| cancelling | cancelled | Claim-serialized provider cancellation; CAS requires status cancelling plus matching reconcile token; a transient provider failure retains cancelling for retry | No |
| persisting | succeeded; failed | Generated media persisted or recovered, then completeJobWithAsset marks succeeded; stale missing-dispatch fallback can mark failed if no usable provider/dispatch handle. Cannot accept a new cancellation | No |
| succeeded | **None** (same-state observation is idempotent) | Complete after durable asset; terminal settlement may still be pending | **Yes** |
| failed | **None** (same-state observation is idempotent) | Failed dispatch, process exit (409 FIBO_PROCESS_EXITED becomes generation_failed), provider failure or stale fallback | **Yes** |
| cancelled | **None** (same-state observation is idempotent) | Cancel queued-before-execution or finish provider cancellation; on replay do not re-open or re-cancel | **Yes** |

An identical-status observation is **not** a new transition or physical database write. The pure model treats it as idempotent and forbids reopening a terminal job. The above table is the desired guarded lifecycle policy, **not proof that every existing database writer enforces it**. Key sources: [canonical TS status union](../../src/lib/capabilities/generation.ts), [native owner-scoped job PATCH](../../src/server/generation/native-generation.ts), [cancel flow](../../src/server/generation/cancel-generation.ts), [owner return](../../src/server/generation/owner-generation-settlement.ts), [reconciliation](../../src/server/generation/reconcile-generation.ts), [admission](../../src/server/generation/generation-admission.ts), [submission](../../src/server/generation/submit-generation.ts).

## Independent dispatch outbox, retries and SQL authorities

The dispatch outbox is **not** the generation job state. Migration [0030](../../supabase/migrations/0030_modal_generation_dispatch_outbox.sql) has seven outbox states: pending, claimed, retry_wait, dispatched, unresolved, failed, cancelled. The [2026-11-20 dispatch recovery migration](../../supabase/migrations/20261120022122_modal_dispatch_recovery.sql) supersedes portions of 0030: an ambiguous/unresolved outbox send **retains the job as queued** and sets worker_state to dispatch_unresolved; it does not unconditionally fail the job. A finished dispatch can transition queued→running only with a valid claim and allowed call handle, or remain queued if execution has not yet been confirmed. Outbox retry_wait does not change the job status. Queued cancellation in SQL requires matching owner/job, a cancellable outbox record and execution_started_at IS NULL. A stale replay or lost claim token must not produce a second accepted send.

| Separate contract | SQL / code location | Verified invariant and limitation |
| --- | --- | --- |
| Allowed job status values | [0016_generation_cancellation.sql](../../supabase/migrations/0016_generation_cancellation.sql) CHECK generation_jobs_status_check | Eight values; adds cancelling to original [0002](../../supabase/migrations/0002_generation_jobs_media_assets.sql) status list. **No trigger enforces all eight-by-eight transitions.** |
| Serialized cancellation and reconciliation | 0016 renderlab_claim_generation_reconciliation; [cancel-generation.ts](../../src/server/generation/cancel-generation.ts) | Owner+job+lease claim, status-CAS updates. Cancellation and durable completion should not win the same serialized claim; provider cancellation may remain cancelling until confirmed |
| Durable dispatch | 0030 accept/claim/finish and 20261120 recovery reserve/begin/lookup/finish/cancel | Outbox attempt and admission deadline are durable. Latest begin/finish semantics disallow retry or fail after execution begins without a confirmed result; unresolved keeps queued |
| Durable generated output | [0013_generation_reconciliation.sql](../../supabase/migrations/0013_generation_reconciliation.sql) unique (generation_job_id, generation_output_index); [native-generation.ts](../../src/server/generation/native-generation.ts) | At most one row per job/output index; deterministic asset ID and lookup permit recovery after insert or response loss. **Not proof of one R2 write nor atomic release.** |
| Terminal admission binding | [0015_generation_admission_external_bind.sql](../../supabase/migrations/0015_generation_admission_external_bind.sql) | If a local job is already succeeded/failed/cancelled when bound, released_at is set immediately. Historical external accepted IDs keep bounded reservations. |
| Reservation release | [0012_renderlab_generation_admission.sql](../../supabase/migrations/0012_renderlab_generation_admission.sql), [generation-admission.ts](../../src/server/generation/generation-admission.ts) | Conditional released_at IS NULL update, scoped to owner and reservation: **at most one successful release update**, but retries may call the RPC multiple times |
| Owner-return settlement | [owner-generation-settlement.ts](../../src/server/generation/owner-generation-settlement.ts), [reconcile-generation.ts](../../src/server/generation/reconcile-generation.ts) | Terminal jobs can be checked/released on owner return; repeating settlement is safe. Absent users may not settle immediately; this is not a background-always-on guarantee |
| Provider exit | [native-generation.ts](../../src/server/generation/native-generation.ts) poll response 409, body detail FIBO_PROCESS_EXITED | Maps to terminal failed with generation_failed, not a retryable reassignment |
| Provider ambiguous fallback | native-generation.ts retryableProviderStaleMs = 2h | Unconfirmed provider status stays unchanged until age >=2h, then failed with generation_provider_stalled. |
| Missing-dispatch fallback | [reconcile-generation.ts](../../src/server/generation/reconcile-generation.ts) 15min grace | Can fail active non-cancelling, nonterminal row without a confirmed provider/dispatch; does not unilaterally override cancellation |

## Explicit gaps found *before* implementation

1. **Historical gap at Unit 4; fixed for converted generic writer calls by P0-06/P0-07.** At the Unit 4 checkpoint, [native-generation.ts patchJob](../../src/server/generation/native-generation.ts) filtered only owner+job, not expected status. **Current code** refuses an already-terminal expected status and uses owner+job+expected-status CAS (plus token fencing where applicable); eligible terminal paths call the service-only atomic RPC. SQL CHECK still validates legal **values**, not the complete transition graph. Legacy/dispatcher/upscale paths outside the converted set must be audited separately; the 64-edge pure policy alone never proved a global SQL guarantee.
2. **Terminal + held reservation can be transient.** Complete-job status update and releaseBoundGenerationAdmission may occur in distinct requests/transactions. Existing SQL makes *repeated* release safe and terminal binding immediate when possible, but it does not enforce the stronger invariant that no committed terminal row ever coexists even briefly with an unreleased reservation. This is modeled as a visible consistency warning, not silently asserted as impossible.
3. **Persisting exactly once is a qualified statement.** SQL uniquely indexes a generation output by (job, output index), and native recovery checks existing rows; duplicate callbacks should converge on the same durable asset row. This does not prove exactly one provider invocation or object-storage PUT.
4. **Legacy compatibility:** preparing and earlier non-FIBO model paths are still readable. New submitted FIBO jobs enter queued via durable dispatch. The pure model does not re-enable retired new operations.
5. **Remaining follow-up, not an unimplemented patchJob proposal:** guarded generic writes and a restricted atomic terminalization RPC now exist. The remaining P1 gap is full enumeration/conversion or database enforcement of legacy and dispatcher terminal writers, including the dispatch finish-failed path, queued-cancel reservation release and retired upscale submit-failure path. Any additional runtime or SQL conversion requires independent review and the production release runbook.

## Pure model invariants and deterministic evidence

- All 8 × 8 status pairs have independent expected outcomes: legal, forbidden or idempotent same-state. Terminal-to-other changes are forbidden in the model.
- Success requires a previously indexed durable output. A second finalization with the same asset ID is an idempotent replay; a conflicting output index is rejected. No duplicate durable output row in the model.
- Cancel wins versus provider completion only if it acquires the serialized transition first; completion wins once persisting is reached. A cancelling job cannot persist output under the model.
- Process exit maps failed/generation_failed; ambiguous status becomes failed only at the exact two-hour boundary; missing dispatch takes at least 15 minutes and never short-circuits cancelling.
- A terminal job may temporarily hold a reservation (visible warning). A first owner-return settlement releases once; a second owner-return/release is idempotent. Retry after terminal must create a new job rather than mutate the original.

## SQL conformance decision: static now, disposable Postgres follow-up

**Feasibility assessed 2026-11-23:** WANDA has Docker Engine 29.9.2 and cached postgres:16-alpine, so a local disposable Postgres is possible. However **all 33 migrations in a fresh CI Postgres** involve Supabase auth.users, anon/authenticated/service_role grants, role ownership/CREATEROLE, RLS and extension/setup order; the 0030 migration also manages dedicated dispatch roles. Recreating Supabase bootstrap shims and introducing a Postgres CI service is a distinct integration/change-control task, not cheap for this test-only PR. Chosen method: **static conformance** reads real 0002, 0012, 0013, 0015, 0016, 0030 and 20261120022122 migrations, parses status CHECKs, matches TS status union and active/reconciliation sets, verifies SQL CAS/recovery predicates, output uniqueness and idempotent release. The test fails on enum and key-condition drift. It cannot prove transaction isolation or runtime stored procedure correctness.

**Follow-up (not part of Unit 4):** run all migrations against a disposable Postgres/Supabase emulator with minimal audited schema bootstrap, then test two concurrent cancellation/completion transactions, ambiguous outbox recovery, unique output index, admission binding/release and service-role access. Do not reuse or alter production schema.

## Review/acceptance

Run (1) node --test tests/unit/generation-job-state-machine.test.mjs tests/unit/generation-job-sql-conformance.test.mjs, (2) full npm run test:unit, (3) npm run typecheck, build, verify:ui-purity, verify:docs-governance and engineering-quality, then exact-head six required checks plus CodeQL before a docs/tests/pure-library-only merge. No release. **Unit 5 remains separate and cannot take credit for a runtime wiring change that was not implemented.**

## Post-Unit-4 correctness follow-up: bounded FIBO generation deadline (R2/R3)

The unit inventory above is historical. The subsequent FIBO runtime deadline is
**20 minutes from `generation_jobs.created_at`**: Modal's renderer timeout is
**420 seconds (7 minutes)**, plus **780 seconds (13 minutes)** of bounded allowance
for durable outbox dispatch, GPU queue/startup, return transit and persistence.
Using immutable creation time prevents repeated provider HTTP 202 responses,
reconciliation attempts, or poison output from extending this cutoff.

For a FIBO job in queued, preparing, running or persisting, expiry triggers one
owner-scoped **migration 0031 atomic terminalize-and-release** call with error code
`generation_deadline_exceeded`, before making further provider or storage calls.
A FIBO job already **cancelling** follows the existing legal
`cancelling -> cancelled` SQL edge, still using the same atomic release;
SQL 0031 intentionally does not allow `cancelling -> failed`.
Retired/non-FIBO workflows keep their previous 2-hour ambiguous-response and
15-minute undispatched policies. The cutoff applies even to an unresolved
durable outbox with no backend call ID: both owner-return and global candidate
selectors include aged FIBO rows without handles.

This follow-up requires production schema 0031 before release (already applied,
but worker 1 alone verifies/coordinates runtime deployment). The code refuses
to downgrade deadline settlement to non-atomic PATCH on a missing RPC.
Terminal races remain protected by status + reconciliation-token compare-and-swap.
Tests cover the exact deadline boundary, pending HTTP 202, unresolved queued,
persisting and cancelling, one reservation release and zero new provider calls.
