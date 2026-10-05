# ENT-004 — Request-boundary and upload-admission reassessment

Date: 2026-10-05
Status: post-implementation assessment
Implementation PR: #336
Implementation merge: `fd146a0e411519992f6570bcc6764c2b44e24222`
Prior authoritative score: **8.2/10** after ENT-003

## Executive result

ENT-004 closes the two highest-risk application-boundary items left after ENT-003: unbounded signed upload-ticket admission and the absence of a centralized explicit cross-origin mutation defense. The implementation preserves RenderLab's signed direct-R2 upload architecture, owner/authentication model, provider routing, and product UX while adding database-serialized account-scoped upload admission and a shared browser mutation-origin policy.

The conservative enterprise-engineering score improves from **8.2/10 to 8.3/10**. The gain is deliberately limited: request/storage abuse resistance and application security are materially stronger, but the lowest-scoring enterprise-maturity areas—operations/DR, durable observability, maintainability, developer portability, and conventional coverage visibility—remain unresolved.

> This assessment describes repository and approved shared-Supabase state. ENT-004 was not deployed, so production must not be credited with the new upload-admission or same-origin application behavior until a separately authorized exact-SHA release is completed and verified.

## What changed

- Persistent media and temporary reference upload tickets now share one server-owned per-account admission boundary.
- Admission is serialized per owner in PostgreSQL and enforces at most 8 unresolved/provisional uploads plus 30 granted upload admissions per rolling 60 minutes.
- Provisional reservations use a 10-minute lease; failed preparation/signing releases capacity while recent grant history remains available for rolling-rate enforcement.
- A corrective forward migration closes the staging-row/reservation bind double-count window without weakening conservative protection before a pending row exists.
- Browser-facing state-changing API routes use one reusable same-origin policy. Explicit non-same-origin `Sec-Fetch-Site` or mismatched `Origin` requests fail before mutation logic, while metadata-less server/CLI/CI callers remain compatible.
- The two server-secret internal mutation routes remain explicit exemptions under their existing secret-auth boundaries.
- Engineering Quality statically rejects future browser-facing mutation handlers that omit the shared guard or an approved exemption.
- Account export schema v4 includes sanitized upload-admission history; account deletion transactionally removes upload-admission state.
- A second corrective forward migration restores the latest account-deletion finalizer after verification exposed that the first ENT-004 lifecycle migration had replaced it with an older body that omitted profile/preferences cleanup.

## Shared Supabase state

The approved shared project records all four ENT-004 migrations:

- `20261005113026 renderlab_upload_admission` (`0024`);
- `20261005113423 renderlab_upload_admission_account_lifecycle` (`0025`);
- `20261005150908 renderlab_upload_admission_concurrency_fix` (`0026`);
- `20261005150930 renderlab_upload_admission_account_finalizer_fix` (`0027`).

Live verification confirmed the current reservation function accounts for bound resources without double-counting their surviving pending staging row, and the current deletion finalizer removes upload-admission reservations, account profiles, and account preferences. The reservation table remains RLS-enabled and browser-revoked; privileged mutation remains service-role-only.

## Verification evidence

Exact implementation head: `902f6c43f6ec6d8672297811b246b06d65757997`.

Local verification at the corrective head:

- lint — passed;
- TypeScript checking — passed;
- unit tests — **72/72 passed**;
- production build — passed;
- Engineering Quality verifier — passed in Linux/WSL;
- `git diff --check` — passed.

Repository exact-head verification:

- all **40/40** pull-request-attached workflows reached success on the final implementation SHA;
- Engineering Quality — passed;
- CodeQL JavaScript/TypeScript — passed;
- Upload Admission Integration — passed, including same-owner concurrency, shared media/reference accounting, stale lease recovery, rolling-hour history, signing-failure release, origin rejection, cross-account isolation, and cleanup;
- Persistent Media Upload and Reference Upload — passed;
- Account Ownership, Generation Admission, Account Profile Credential, Maintenance, generation/reconciliation/cancellation, UI and provider-backed video checks — passed;
- Account Data Lifecycle had one first-attempt transient retry-path failure; an unchanged rerun on the exact same SHA passed the complete configured lifecycle, including the injected Auth-deletion retry sequence. No product code was changed for that rerun.

PR #336 squash-merged as `fd146a0e411519992f6570bcc6764c2b44e24222`.

Merged-main verification on that exact SHA:

- Engineering Quality run `37336469452` — success;
- CodeQL run `37336469559` — success;
- Upload Admission Integration run `37336469359` — success;
- Account Data Lifecycle run `37336469375` — success;
- Account Profile Credential run `37336469631` — success;
- Reference Upload, Generation Integration, Generation Cancellation, Generation Reconciliation, Maintenance, UI Shell, Activity Cancel, Image Upscale, Image Model Routing, Creative Iteration and Integrated Release — success.

Merged-main Video Generation Integration run `37336469427` completed real 480p and 1080p cases on attempt 1, then encountered one transient `generation_backend_unavailable` / `reconciliation_failed` provider-status poll during the 720p audio case. Unchanged attempt 2 passed on exact merge SHA `fd146a0e411519992f6570bcc6764c2b44e24222`, establishing the first failure as transient provider/runtime status noise rather than a deterministic ENT-004 regression. All 19 affected merged-main push workflows therefore have accepted success.

## Scorecard

| Area | Post ENT-003 | Post ENT-004 | Change | Reason |
|---|---:|---:|---:|---|
| Architecture | 8.8 | 8.8 | — | Runtime topology and product architecture remain unchanged. |
| Authentication / identity | 9.1 | 9.1 | — | Existing fresh-auth/MFA/session boundaries are preserved. |
| Authorization / ownership | 8.8 | 8.8 | — | Owner scoping remains unchanged and was broadly reverified. |
| Database security | 8.8 | **8.9** | +0.1 | New server-owned RLS/browser-revoked admission state, service-role-only RPCs, per-owner transactional serialization, and corrected lifecycle cleanup. |
| Generation lifecycle | 9.2 | 9.2 | — | Provider/generation lifecycle semantics were not changed. |
| API/input contracts | 8.7 | **8.9** | +0.2 | Stable upload-admission 429 contracts and centralized explicit origin/fetch-site mutation policy. |
| Media/storage integrity | 8.5 | **8.8** | +0.3 | Signed upload/staging amplification is now bounded across both upload families with race-safe accounting and failure/lease recovery. |
| Dependency security | 9.3 | 9.3 | — | ENT-003 patched dependency posture is preserved. |
| Application security hardening | 8.3 | **8.9** | +0.6 | The two major remaining P1 application-boundary gaps—upload abuse admission and explicit cross-origin browser mutation defense—are closed in repository state. |
| CI/CD | 8.7 | 8.7 | — | ENT-002 deterministic/pinned workflow controls remain intact. |
| Automated testing / verification | 8.4 | **8.6** | +0.2 | Dedicated configured admission integration, mutation-route static coverage, migration regression tests, and full exact-head matrix coverage. |
| Frontend engineering | 8.0 | 8.0 | — | No frontend architecture change. |
| Maintainability | 6.9 | 6.9 | — | Large modules and workflow volume remain. |
| Developer experience | 7.1 | 7.1 | — | Cross-platform/EOL and Windows command-shim debt remain. |
| Observability | 6.7 | 6.7 | — | Structured logs exist, but durable telemetry and actionable alerting remain absent. |
| Operations / DR | 6.1 | 6.1 | — | Restore exercises, RPO/RTO, outage/credential-compromise runbooks and escalation remain open. |
| Documentation | 8.0 | **8.1** | +0.1 | Request/storage contracts, migration history, verification evidence and enterprise reassessment are synchronized. |
| Release governance | 8.2 | 8.2 | — | Exact-head and merged-main qualification remain effective; no deployment is inferred from merge. |

The arithmetic mean rises from approximately **8.20 to 8.28**, supporting the conservative rounded enterprise score of **8.3/10**.

## Remaining P1 work

The highest-value next enterprise cycle should move away from request admission and target the weakest maturity areas:

1. durable server-side telemetry with retained searchable diagnostics and actionable alerting for generation/provider, persistence, auth/data-lifecycle and maintenance failures;
2. operations/disaster-recovery readiness: provider outage, credential compromise, backup/restore verification, RPO/RTO targets, escalation and recovery runbooks;
3. explicit `server-only` boundaries where they materially protect secret/data-bearing modules;
4. cross-platform developer/test parity, including EOL normalization and the Windows command-shim verifier limitation;
5. conventional line/function/branch coverage measurement before selecting realistic coverage gates;
6. CI/workflow consolidation and large-module decomposition after the higher-risk operational controls above.

## Enterprise interpretation

ENT-004 materially improves RenderLab's abuse resistance and authenticated browser request boundary without replacing the existing authentication, ownership, R2, generation, or provider architecture. The phase also demonstrated useful verification discipline: two real defects were discovered before closure and fixed through forward-only migrations, while a separate transient lifecycle failure was proven non-deterministic by an unchanged same-SHA rerun rather than being hidden by a test relaxation.

The next hardening phase should therefore focus on **operational observability and recovery readiness**, not another request-layer expansion. A new execution-ready contract is required before implementation, and production deployment of ENT-004 remains a separate explicit decision.
