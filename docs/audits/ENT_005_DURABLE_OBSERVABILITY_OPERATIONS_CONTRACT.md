# ENT-005 — Durable observability and operations hardening contract

Date: 2026-10-05
Status: EXECUTION CONTRACT / NOT IMPLEMENTED

## Goal
Raise RenderLab's weakest enterprise-maturity areas by making the existing privacy-safe server diagnostics durable and operator-searchable, adding bounded actionable operational alerting, and documenting an evidence-backed incident/recovery runbook without changing product UX, provider routing, production billing plan, or deployment state.

ENT-005 is intentionally not a generic telemetry-platform project. It extends the already-verified Phase 17 diagnostic/Admin Health seams and keeps RenderLab's current server-owned privacy boundary.

## Verified starting state

- Baseline repository head: `02ea242bba55877dc10ebf926eb263e279cd13b7`.
- Current authoritative enterprise score: **8.3/10** after ENT-004.
- Phase 17 already emits allowlisted structured server diagnostics for generation submission, reconciliation/failover/finalization, cancellation, and maintenance. Events use opaque correlation identity, bounded enum/count fields, and never accept an arbitrary detail bag.
- Current diagnostic emission is best-effort and non-fatal, but it writes only to ordinary platform/server logs. There is no RenderLab-owned durable diagnostic event store.
- `/admin` Health already provides fresh-admin-authorized, bounded aggregate visibility over lifecycle status, failure codes, timing, failover incidence, active-state age, admission/capacity, and maintenance backlog. There is no operator-searchable retained event history or persisted operational-alert state.
- Current Vercel team plan is **Hobby**. Vercel Drains require Pro/Enterprise, so a drain-based retained telemetry design is not available under the current plan and is not authorized by this phase.
- Current Supabase organization plan is **Free**. Managed daily backups/PITR are not available on the current plan; Supabase recommends regular off-site logical exports for Free projects.
- The repository has GitHub/Vercel/Supabase/R2/Resend operational credentials already used by verified workflows, but it does **not** have a `SUPABASE_DB_PASSWORD`/equivalent database-backup credential. ENT-005 must not invent a successful full-database backup/restore exercise without that capability.
- Production already has an existing protected `RESEND_API_KEY` and the application has a verified server-owned Resend notification path. No new mail vendor is needed for bounded operational alerting.
- Production already declares one daily authenticated maintenance cron in `vercel.json`; ENT-005 does not authorize a second production schedule or any `pg_cron`/`pg_net` activation.
- There is no current operations/disaster-recovery runbook that defines provider outage, Vercel/app outage, Supabase outage, R2/storage failure, credential compromise, operational-alert handling, rollback decision points, or truthful RPO/RTO limitations.
- ENT-004 repository behavior is merged but not production-deployed. ENT-005 must not credit production with ENT-004 or ENT-005 behavior unless a later separately authorized exact-SHA rollout occurs.

## User/operator value

After deployment in a separately authorized release, a RenderLab operator should be able to answer:

- what high-value server lifecycle failures occurred recently;
- whether a failure pattern is isolated or recurring;
- whether an operational alert is currently open and how recently it fired;
- whether account-deletion retry or maintenance cleanup is stuck;
- what immediate containment/recovery steps are appropriate for provider, application, database, storage, email, or credential incidents;
- which recovery objectives are actually supported by the current Free/Hobby infrastructure and which remain explicitly unmet.

## In scope

### 1. Server-owned durable diagnostic event store

Add one additive RenderLab-owned Supabase migration for a bounded diagnostic event table.

Required properties:

- server-owned table with RLS enabled;
- no `anon` or `authenticated` table access;
- service-role-only insert/read/prune path;
- append-only event semantics from application code;
- bounded columns matching the existing normalized diagnostic contract: event, level, timestamp, correlation ID, optional job ID, operation, phase, status, code, duration/count/success/failure/attempt fields;
- no prompt text, media contents/name, account email/name, owner ID, R2/storage key, provider job ID, worker/workflow ID, raw exception stack, raw provider message, request headers, IP address, user agent, or arbitrary JSON detail bag;
- indexes only for real operator queries: recent time, event/level/code, and correlation lookup;
- deterministic table check constraints/enums where practical rather than accepting unbounded free-form values.

Retention policy for v0.1 is **30 days**. The existing server-owned maintenance pass may prune diagnostic rows older than that age with an explicit per-pass bound so retention cannot turn maintenance into an unbounded delete.

### 2. Non-blocking persistence semantics

Diagnostics remain observational and must never become a product-correctness dependency.

Implementation must preserve immediate structured console/platform logging and add durable persistence as best-effort background work after the application response when running inside a Next.js request lifecycle.

- Prefer the stable Next.js `after()` request-lifetime mechanism for background diagnostic persistence.
- Persistence failure must not fail generation, upload, cancellation, account, Admin, or maintenance product behavior.
- A durable-write failure may emit one bounded console-only diagnostic, but it must not recursively attempt to persist its own persistence failure.
- Unit tests and direct server-module tests must be able to inject a sink without requiring a Next.js request context.
- Do not add a queue, paid telemetry service, client analytics SDK, session replay, or browser RUM.

### 3. High-signal operational alert incidents

Add a second small server-owned operational-alert state table or an equivalently atomic persisted representation. The purpose is deduplication/state, not a generic incident-management product.

An operational alert record must contain only sanitized operational metadata such as:

- stable alert family/key;
- severity (`warning` or `critical`);
- open/resolved state;
- first/last seen timestamps;
- occurrence count;
- last notification timestamp;
- last bounded diagnostic event/code family.

It must not store account identity, prompt/media data, provider/raw failure text, storage identity, secrets, or arbitrary payloads.

Alert evaluation must be intentionally conservative so ordinary user validation/rate-limit events do not page operators.

Initial v0.1 alert families:

1. **generation/provider degradation** — open only after a repeated high-signal backend/reconciliation failure threshold (default: at least **3** qualifying failures within **15 minutes**), covering backend unavailable/submission failure, orchestration/provider stalled, worker unavailable/credit exhausted, and reconciliation failure classes;
2. **maintenance failure** — open when an authenticated maintenance category reports `failureCount > 0`;
3. **account deletion stuck** — instrument the existing deletion retry path with a privacy-safe account-lifecycle diagnostic and open a critical alert when the same opaque lifecycle correlation reaches at least the **third** retry without completion;
4. **diagnostic persistence degradation** remains console/platform-log only to avoid recursive dependence on the diagnostic store itself.

Repeated events for an already-open alert update counters/timestamps atomically. Notification fanout is rate-limited to at most once per alert family per **60 minutes** while it remains active unless severity escalates.

Alert resolution may occur automatically only when a later verified healthy condition exists for that family; otherwise the persisted alert remains open for operator inspection. Do not fabricate recovery from absence of events alone.

### 4. Bounded operational email notification

Reuse the existing Resend infrastructure; do not add another mail provider or new secret.

- Resolve recipients server-side from current **active Admin** accounts with a verified Auth email.
- Send only sanitized operational content: alert family, severity, first/last seen time, bounded occurrence count, and a link/instruction to inspect `/admin` Health.
- Do not include prompts, media, account identities, job IDs, correlation IDs, provider/worker/storage identity, raw error text, or secrets in alert mail.
- If Resend is unavailable/unconfigured, the alert record remains authoritative and Admin Health must still expose it; notification failure never rolls back alert state or product behavior.
- Do not create a new user-facing notification-preferences system in this phase.

### 5. Operator-searchable Admin Health diagnostics

Extend the existing fresh-active-admin Health surface rather than creating a new Observability/Operations route.

The server contract may return a bounded recent diagnostic list in addition to existing aggregates.

Allowed browser-visible event fields:

- timestamp;
- event;
- level;
- operation;
- phase;
- status;
- code;
- duration/count/success/failure/attempt values;
- opaque correlation ID when needed for incident stitching.

Explicitly omit internal job ID even though it may be retained server-side.

Supported query/filter dimensions are bounded to allowlisted values and a bounded time window, for example:

- event;
- level;
- code;
- since/lookback with a maximum **30-day** range;
- result limit with maximum **100** rows.

Admin Health must also expose a compact operational-alert summary/list with severity/state/family/timestamps/counts only.

No generic SQL/query console, arbitrary text search, client-side event warehouse, new top-level route, or infrastructure-control UI is authorized.

### 6. Account-data-lifecycle diagnostics

Instrument only the operationally important account-deletion lifecycle seams needed by this phase:

- deletion retry;
- deletion completion;
- notification failure only if it is already represented by a bounded product-level code and useful for operational diagnosis.

Use a deterministic opaque lifecycle correlation derived from the immutable user UUID through a one-way RenderLab namespaced hash. Never persist or expose the raw user ID through the diagnostic event store.

No broader security-activity/event-history product is introduced.

### 7. Operations and disaster-recovery runbooks

Create one authoritative operations/runbook area under `docs/operations/` rather than scattering recovery procedures across audits.

At minimum document:

- incident severity/triage conventions;
- generation/provider outage containment and verification;
- Vercel/application outage and rollback/cutover checks;
- Supabase outage/degraded database behavior;
- R2/storage availability or credential failure;
- Resend notification outage;
- maintenance/reconciliation cron failure;
- credential/token compromise response for Supabase service role/access token, R2 keys, Vercel token, Resend key, and worker credentials;
- exact-fixture safety rules for recovery exercises;
- rollback anchors and the repository's exact-SHA deployment discipline;
- post-incident validation/cleanup expectations;
- escalation assumptions for the current single-operator/small-team reality.

The runbook must distinguish **operator targets** from contractual SLAs.

### 8. Truthful recovery objectives and current-plan blocker

Record recovery objectives by asset class rather than inventing one global RPO/RTO.

At minimum:

- **application source/config tracked in Git:** expected recovery from repository + known-good Vercel deployment/alias is measurable and can have a target RTO;
- **Supabase RenderLab/Auth data:** current Free-plan state has no managed daily backup/PITR and no repository-held DB-password credential for automated logical dump, so a verified recoverable data RPO/RTO is **not yet established**;
- **R2 durable media bytes:** current bucket has no separately verified replication/backup restore path, so destructive object-loss RPO/RTO is **not yet established**;
- **provider workers:** worker outage is availability degradation rather than authoritative product-data loss; recovery follows existing worker/routing runbooks and verified standby behavior.

ENT-005 must not claim a successful database or R2 restore exercise unless a real recoverable snapshot/replica path is first authorized and verified.

The runbook should define the concrete promotion gate for future DR maturity: either a separately approved paid managed backup/PITR/replication path or a separately approved off-site logical backup workflow with the required secret/restore target.

### 9. Verification

Add unit/static coverage for:

- diagnostic normalization still rejects/unsets unknown fields and remains privacy-bounded;
- persistence eligibility/retention logic;
- alert-family classification and thresholds;
- atomic dedupe/cooldown semantics;
- account-lifecycle opaque correlation generation;
- sanitized Admin diagnostic projection omits job ID and other internal fields;
- sanitized alert email body cannot contain prompt/media/account/job/provider/storage detail;
- diagnostics/alerts remain non-fatal when Supabase/Resend persistence/notification is unavailable.

Add configured integration coverage using exact run-owned fixtures for:

- durable event insertion and 30-day pruning behavior;
- event filters/lookback/limit bounds under fresh Admin authorization;
- generation repeated-failure threshold opens one deduplicated alert rather than N alerts;
- maintenance failure opens its alert family;
- account-deletion third retry opens a critical alert without storing raw account identity;
- notification fanout is rate-limited and safe when Resend is intentionally stubbed/failing;
- ordinary rate-limit/input-validation events do not open operational alerts;
- member/signed-out callers cannot access diagnostics/alerts;
- exact database/Auth/R2 fixtures are cleaned.

### 10. Documentation closure and reassessment

After verified implementation, update only the existing authorities that own the changed state:

- `docs/STATUS.md`;
- `docs/architecture/INFRASTRUCTURE.md`;
- `docs/architecture/FRONTEND_ARCHITECTURE.md` for the amended Admin Health diagnostic-row boundary;
- `PROJECT.md` only for durable handoff/phase state;
- `docs/operations/*` runbooks;
- this contract with exact merge/verification evidence;
- a new post-ENT-005 enterprise assessment using the same rubric as ENT-004.

Do not increase Operations/DR to a mature-enterprise score merely because a runbook exists while database/R2 recoverable backups remain unverified.

## Shared Supabase migration boundary

ENT-005 authorizes the smallest additive, backward-compatible RenderLab migration(s) needed for diagnostic events and operational-alert state.

- Do not modify or repurpose Saga/Studio tables.
- RLS stays enabled; `anon`/`authenticated` raw access stays revoked.
- Privileged functions use empty `search_path` and service-role-only execution.
- No existing generation/media/account row is rewritten merely to add observability.
- Applying the migration to the already-approved shared Supabase project is permitted only after contract merge, source/static review, and as required for configured integration verification.
- Migration must be backward-compatible with the currently deployed older application source; applying it alone must not alter current production behavior.
- Verification may create only clearly run-owned diagnostic/alert/account fixtures and must clean them.

No replacement Supabase project is authorized.

## Explicitly out of scope

- Production Vercel deployment, production alias changes, or claiming ENT-004/ENT-005 production-live behavior.
- Vercel plan upgrade, Vercel Drains, Sentry, Datadog, Honeycomb, Axiom, OpenTelemetry collector deployment, or any other paid/new telemetry vendor.
- Supabase plan upgrade/PITR enablement.
- Adding a new database-password/backup secret or creating an off-site database backup job in this phase.
- R2 replication/new bucket/new backup storage resource.
- New production cron schedule, `pg_cron`, or `pg_net`; reuse only the existing maintenance execution boundary for retention once the application is later deployed.
- Client analytics, browser RUM, session replay, product analytics, IP/device tracking, or security-activity UX.
- Generic incident-management/ticketing integration.
- Provider/worker/model routing changes or worker redeployment.
- Changing generation admission/upload-admission policy.
- Broad server-only boundary refactor, cross-platform/EOL work, coverage gates, CI consolidation, large-module decomposition, or CSS/UI redesign.

These remain separate follow-on work.

## Architecture and privacy constraints

- Product correctness must not depend on telemetry insert/email success.
- The existing structured diagnostic allowlist remains the source contract; do not introduce arbitrary payload logging.
- Account identity is excluded from stored diagnostics. Account-lifecycle incident stitching uses only a namespaced one-way opaque hash.
- Job ID may be retained only in the server-only durable table for incident reconstruction and must be omitted from browser/Admin payloads.
- Alert classification operates on bounded normalized fields, never raw provider/error text.
- Admin diagnostic/search APIs require the same fresh active-Admin authorization as current Admin Health.
- No browser direct table grants are added.
- Existing ENT-001 through ENT-004 security boundaries remain unchanged.
- No deployment is authorized by contract or implementation merge.

## Validation matrix

Before implementation closure:

- migration/static privilege review;
- `npm run lint`;
- `npm run typecheck`;
- `npm run test:unit`;
- `npm run build`;
- `npm run verify:engineering-quality` in the supported Linux environment if Windows command-shim behavior remains unresolved;
- exact-head Engineering Quality;
- exact-head CodeQL JavaScript/TypeScript;
- exact-head Account/Admin Operations for fresh-admin diagnostic/alert UI/API coverage;
- exact-head Generation Reconciliation, Generation Cancellation, Generation Integration and Video Generation Integration when diagnostic emission paths are touched;
- exact-head Maintenance Integration for retention/failure alerting;
- exact-head Account Data Lifecycle for deletion-retry instrumentation;
- exact-head affected upload/media/generation workflows if shared observability imports alter those server modules;
- merged-main Engineering Quality and CodeQL after implementation merge;
- exact cleanup/advisor review after any shared-Supabase migration.

Human UI review is required only if Admin Health visible composition changes; if it does, review desktop and 390px narrow states and preserve the accepted UI-079/Admin hierarchy.

## Exit criteria

ENT-005 is complete only when:

1. high-value server diagnostics are durably retained for 30 days without becoming a product dependency;
2. a fresh Admin can search a bounded privacy-safe recent diagnostic history and inspect persisted operational alerts from the existing Health surface;
3. repeated provider/generation failures, maintenance failures, and stuck account-deletion retries produce deduplicated thresholded alert state rather than noisy per-event paging;
4. operational email notification is sanitized, rate-limited, uses only existing Resend infrastructure, and failure-safe;
5. retention/pruning is bounded and verified;
6. the operations/recovery runbook accurately covers current provider/app/database/storage/mail/credential incidents and exact-SHA rollback discipline;
7. database/R2 backup limitations under the current Free/Hobby posture are recorded as unresolved recovery blockers rather than falsely marked complete;
8. all affected exact-head and merged-main gates pass with exact fixtures clean;
9. authoritative repository documentation and the post-ENT-005 reassessment match verified reality; and
10. no production deployment, plan upgrade, new backup secret/resource, new production scheduler, or unrelated refactor occurred.

After closure, choose the next enterprise phase from the remaining weakest areas—likely server-only module boundaries + developer parity/coverage, then workflow/module maintainability—based on the updated scorecard rather than expanding ENT-005 retroactively.
