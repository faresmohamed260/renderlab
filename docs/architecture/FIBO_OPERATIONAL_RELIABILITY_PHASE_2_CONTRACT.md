# Phase 2 contract — Operational reliability

**Status:** Owner-approved execution contract, pending merge. The [Phase 1 closeout](../history/contracts/architecture/FIBO_BETA_CORRECTNESS_PHASE_1.md) and [production manifest](../production/current.json) provide the release baseline.

## Goal and starting state

Operators can see whether the FIBO service is healthy, identify a stuck job before it monopolizes admission, and recover from gateway authentication and renderer failures using bounded, repeatable procedures. The production release accepts invite-only image generation and editing, including masks. Owner-scoped settlement has hosted proof from one Library load after a render finished without a client poll. The verified Modal dispatcher schedule handles dispatch recovery. The application has no scheduler for settling finished jobs when owners never return. The historical post-cutover provider alert and gateway-auth notification delivery are separate: repeated 401/403 detection has code and unit evidence, while production email delivery still needs a safe fixture.

## Execution priority and approval boundaries

1. **Oldest-active-job aggregate signal**: implementation, verification and complete production release first.
2. **Gateway-auth delivery**: local mail-sink qualification before the tightly bounded, separately gated live fixture. This contract records the owner''s approval for up to two admin-only synthetic emails, but does not waive fixture-isolation and cleanup prerequisites.
3. **Read-only route latency baseline**: observation and documentation, with no routing changes.

The second-operator ADR-005 rehearsal is explicitly **optional/deferred** and is not an exit gate. Owner-return settlement remains the beta policy, not an open implementation research task.

## Scope and acceptance plan

| Work | Execution and evidence | Exit criterion |
| --- | --- | --- |
| Gateway-auth warning and delivery — second | Prove repeated synthetic 401/403 qualification at **three events within 15 minutes**, alert projection, cooldown, deduplication and recovery offline with a local mail sink first. For live proof only, owner authorization is **at most two emails to the existing admin address**, from a run-owned synthetic fixture isolated from customer routing. Before sending, document run ID, creation, send window, ceiling, cleanup, expected recipient and abort conditions, and show successful offline evidence. No customer prompts, handles, jobs or accounts in the fixture. | Offline proof qualifies at threshold, sends once per cooldown and recovers. If isolation and zero-residue cleanup are guaranteed, record live provider acceptance, inbox receipt if observable, duplicate-burst suppression and cleanup; otherwise stop without sending. |
| Route latency and regions — third | Measure Create, Library, Activity, health and capability with **non-mutating** requests from named observation points. Report environment, exact live SHA, per-route sample counts, p50/p95, cold/warm separation, errors and observed region headers. Record known placement Vercel `iad1` and Supabase `eu-west-1` as facts and distinguish measured headers from configured regions. Do not propose a region change in this phase. | Timestamped, repeatable read-only baseline. Unavailable authenticated measurements are reported rather than simulated or treated as successes. |
| Second ADR-005 operator rehearsal — **deferred, optional** | ADR-005 is already verified. A second independent operator or machine would be needed to rehearse the existing watcher setup with a synthetic marker. This work is not a Phase 2 release prerequisite; any real interruption needs a separate authorization. | Optional future evidence when a second operator/machine is available. Deferral does not block Phase 2 closeout. |
| Oldest active job signal — **first** | Add a bounded, aggregate-only oldest-age signal on operator-only Admin Health and existing dispatch-health alerting. Canonical active statuses: `queued`, `running`, `cancelling`, `persisting`; identify the durable UTC age origin and justify one or multiple threshold bands. Keep job IDs, account IDs, prompts, provider handles and asset IDs out of output. Distinguish this from the dispatch heartbeat. | Tests for empty and populated cases, every status, bounded query cost, no sensitive output, alert behavior, and rendered desktop and 390px reduced-motion evidence if the UI changes. Release through the standard runbook before gateway-auth live proof. |
| Settlement for owners who never return — **decision recorded; no build** | **Retain the already verified on-owner-return settlement for this beta.** The accepted cost is that output for a user who never returns can remain in Modal until its roughly seven-day retention horizon. Do not add a scheduler or new reconciliation infrastructure in Phase 2. Revisit if beta user count materially grows, dormant-result accumulation becomes operationally significant, or Modal result retention threatens user access or correctness. | Decision recorded and monitored by operational signals; no scheduled-settlement implementation required in this phase. |

## Boundaries and dependencies

- This contract covers server/operations behavior and the existing Admin Health surface. Product navigation, layout and generation capabilities stay within the current approved composition.
- Existing Vercel, Supabase, R2 and Modal contracts are the baseline. A proposed schema, secret, regional routing, scheduler or production configuration change needs its own evidence and authorized execution before mutation.
- Provider work, account/credential changes, production email, worker termination and production cutover are scoped separately. Offline test fixtures and read-only observations establish the starting baseline.
- Each implementation PR requires the repository's exact-head checks. Admin-facing changes require rendered desktop and 390px reduced-motion review. Release documentation uses the canonical production manifest and runbook.
- The Phase 2 deliverables are the evidence runs, decision records and operating instructions for these gates. Backend work begins after owner approval and a merged execution contract. Follow-on capability work remains roadmap-level until operational reliability is closed.
