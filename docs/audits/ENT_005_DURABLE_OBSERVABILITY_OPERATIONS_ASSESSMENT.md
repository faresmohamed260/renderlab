# ENT-005 — Durable observability and operations hardening assessment

Date: 2026-10-05
Status: AUTHORITATIVE POST-ENT-005 ASSESSMENT / VERIFIED / NOT DEPLOYED

## Executive result

ENT-005 is verified and repository-closed at **8.5/10**, up from the authoritative **8.3/10** post-ENT-004 baseline. The application changes are merged but not production-deployed.

On the same 18-category rubric used by ENT-004, the verified ENT-005 state scores **8.5/10** (arithmetic mean 8.45). This is intentionally conservative: observability improves substantially and operations readiness improves meaningfully, but RenderLab still has no verified destructive-loss database or R2 recovery path.

ENT-005 therefore removes the former “ephemeral logs only / no incident runbook” weaknesses without pretending that documentation, a primary diagnostic table, or an alert email is a backup system.

## Baseline and scope

Baseline: post-ENT-004 **8.3/10**.

ENT-005 implements only the merged contract in `ENT_005_DURABLE_OBSERVABILITY_OPERATIONS_CONTRACT.md`:

- privacy-bounded durable server diagnostics;
- deduplicated high-signal alert state and sanitized existing-Resend notification;
- retained diagnostic/alert visibility inside existing `/admin` Health;
- account-deletion retry diagnostics;
- bounded 30-day retention through existing maintenance;
- an authoritative incident/recovery runbook;
- truthful recovery-objective boundaries.

It does not add a telemetry vendor, client RUM/session replay, new production schedule, plan upgrade, database-backup credential/job, R2 replica/versioning, provider routing change, or production Vercel deployment.

## Verified implementation and closure evidence

### Repository/local evidence

Implementation-head local evidence now includes:

- `git diff --check` passed after restoring repository LF line endings;
- TypeScript no-emit passed;
- Node unit suite passed **87/87** after the later Admin-label and privilege-hardening guards were added;
- Oxlint completed with **0 errors** on the earlier full pre-PR pass;
- `scripts/verify-admin-operations.mjs` and `scripts/verify-operational-observability.mjs` passed syntax validation;
- Next.js 16.3.8 production build passed on the earlier full pre-PR pass;
- the supported Linux/WSL `npm run verify:engineering-quality` gate passed on the earlier full pre-PR pass.

### Shared Supabase evidence

Migration `0028_renderlab_operational_observability.sql` was applied to the already-approved shared project as `20261005181527 renderlab_operational_observability`. A subsequent **effective** role audit found Supabase default grants had left broader `service_role` table privileges than the source migration intended. That discrepancy was corrected forward-only with `0029_renderlab_operational_observability_privilege_hardening.sql`, applied as `20261005202352 renderlab_operational_observability_privilege_hardening`; `0028` was not rewritten.

Post-`0029` live inspection verifies:

- RLS enabled on `renderlab_diagnostic_events` and `renderlab_operational_alerts`;
- no `anon`/`authenticated` direct table access or privileged-RPC execute;
- effective `service_role` table capabilities narrowed to diagnostics `INSERT, SELECT` and alerts `SELECT`;
- diagnostic identity sequence narrowed to `USAGE` for `service_role`;
- prune and alert-record functions are `SECURITY DEFINER`, empty-search-path RPC boundaries executable only by `service_role`;
- configured cleanup uses a separate service-role-only RPC that accepts only exact `test.<namespace>.` prefixes, avoiding general table DELETE capability;
- a live service-role diagnostic insert → alert-record RPC → prefix-cleanup smoke finished with zero diagnostic and alert residue.

A rollback-only database behavior exercise verified:

- a 31-day diagnostic is deleted by bounded retention pruning;
- first alert occurrence claims notification;
- a same-key occurrence one minute later is deduplicated and does not claim another notification;
- occurrence count advances atomically to 2;
- a non-allowlisted raw diagnostic code is rejected by a database CHECK;
- the transaction rolled back, leaving no exercise fixtures.

Supabase Security Advisor adds only expected `rls_enabled_no_policy` informational notices for the deliberately server-only ENT-005 tables plus previously tracked platform findings. Performance Advisor reports low/unused index informational findings, including new indexes before application traffic; there is no ENT-005 blocker.

## What materially improved

### Durable diagnostics without product coupling

Phase 17 diagnostics were privacy-safe but log-only. ENT-005 preserves immediate structured logging and adds bounded durable persistence scheduled through Next.js `after()` in normal application runtime. The store accepts no arbitrary payload bag and excludes prompt/media/account/provider/worker/storage/secret detail by construction.

Observability failure remains non-fatal: product mutations do not roll back because Supabase diagnostic persistence or Resend notification is unavailable.

### High-signal deduplicated alerting

The first alert families are deliberately narrow:

- repeated generation/provider degradation: at least three qualifying failures in 15 minutes;
- any maintenance category failure;
- account deletion stuck at the third durable retry.

Ordinary input validation, admission rejection and user-facing rate limiting do not alert. Same-family notification is atomic and limited to once per 60 minutes while open unless severity escalates.

### Operator-searchable retained evidence

The existing fresh-active-admin `/admin` Health surface gains bounded retained diagnostics and operational alerts without a new route or dashboard architecture. Event/level/code query inputs are allowlisted; lookback is capped at 30 days and result count at 100. Retained diagnostic `job_id` is intentionally omitted from the browser contract.

### Operations handoff

`docs/operations/INCIDENT_RESPONSE_AND_RECOVERY.md` now provides one repository-authoritative operator path for:

- incident severity/triage;
- generation/provider degradation;
- Vercel/application outage and exact-SHA rollback;
- Supabase/R2/Resend degradation;
- reconciliation/maintenance failure;
- account-deletion stuck handling;
- Supabase/R2/Vercel/Resend/worker/internal-secret compromise;
- exact-fixture safety;
- post-incident verification and documentation handoff.

It distinguishes operator targets from provider SLAs and explicitly refuses unsupported data-recovery claims.

## Category scorecard

| Category | ENT-004 | ENT-005 | Reason |
|---|---:|---:|---|
| Architecture | 8.8 | 8.8 | Durable observability fits existing server-owned boundaries; no topology redesign |
| Authentication / identity | 9.1 | 9.1 | No identity-policy change |
| Authorization / ownership | 8.8 | 8.8 | Fresh Admin and server-only data boundaries preserved |
| Database security | 8.9 | **9.0** | New tables/RPCs are RLS-enabled, browser-revoked, service-role-only and DB-constrained |
| Generation lifecycle | 9.2 | 9.2 | Lifecycle behavior is instrumented, not changed |
| API / input contracts | 8.9 | 8.9 | Admin diagnostic filters are bounded but broader API maturity is unchanged |
| Media / storage integrity | 8.8 | 8.8 | No media-storage contract change |
| Dependency security | 9.3 | 9.3 | No dependency-policy change |
| Application security hardening | 8.9 | 8.9 | Privacy-safe operator visibility improves diagnosis without changing primary controls |
| CI / CD | 8.7 | 8.7 | Dedicated shared-state isolation improves evidence, but workflow consolidation remains debt |
| Automated testing | 8.6 | **8.8** | New privacy/static/unit + configured retention/RLS/dedupe/Admin evidence |
| Frontend engineering | 8.0 | **8.1** | Existing Admin Health gains bounded server-owned operator search without a new client architecture |
| Maintainability | 6.9 | 6.9 | Large-module decomposition remains out of scope |
| Developer experience | 7.1 | 7.1 | Cross-platform command/EOL friction remains real |
| Observability | 6.7 | **8.3** | Durable 30-day evidence, bounded Admin search and high-signal deduplicated alerting replace logs-only state |
| Operations / DR | 6.1 | **6.8** | Incident/credential/rollback runbook now exists, but destructive DB/R2 recovery remains unestablished |
| Documentation | 8.1 | **8.4** | Current architecture, status, assessment and operator runbook are synchronized |
| Release governance | 8.2 | 8.2 | Exact-SHA/no-implicit-deploy discipline unchanged |

Arithmetic mean: **8.45**, authoritative rounded score **8.5/10**.

The +0.2 rounded improvement is deliberately smaller than the observability category jump because enterprise maturity is still capped by developer portability, coverage visibility, maintainability and—most importantly—unverified destructive data recovery.

## Recovery posture: improved process, unresolved data-loss recovery

### Application source/config

Git history plus exact-SHA Vercel deployment/alias discipline gives RenderLab a real application rollback basis. The runbook defines a same-incident-window operator target, not a provider SLA.

### Supabase database/Auth data

**Destructive-loss RPO: not established.**

**Destructive-loss RTO: not established.**

The current Supabase Free posture has no verified RenderLab-managed logical backup credential/path or successful independent restore exercise, and ENT-005 does not authorize adding one.

### R2 durable media bytes

**Destructive-loss RPO: not established.**

**Destructive-loss RTO: not established.**

No separately verified replica/version/backup destination or restore exercise exists.

### Promotion gate

A future DR phase must separately authorize and verify either managed backup/PITR/replication or an encrypted off-site logical/object backup path, including restore isolation, credential/key ownership, retention, measured recovery evidence and an independent restore target. Until then, the Operations/DR score must remain below mature-enterprise territory.

## Remaining enterprise weaknesses after ENT-005 closure

Highest-value remaining work is expected to be:

1. explicit `server-only` module boundaries for secret/data-bearing server modules;
2. cross-platform developer/test parity, including durable EOL/tool-shim behavior;
3. conventional line/function/branch coverage measurement with realistic baseline gates;
4. CI workflow consolidation/reusable workflow structure where it reduces maintenance without weakening exact-head evidence;
5. decomposition of the largest server/UI modules and continued global-CSS reduction;
6. actual destructive-loss recovery capability for Supabase and R2 through a separately approved backup/restore phase.

The updated scorecard—not phase momentum—should choose the next enterprise contract.

## Verified closure evidence

- Exact implementation head `9a52c51339cfbe33b39f2f668e0132e527bd235e` passed all 20 attached PR workflows, including Engineering Quality, CodeQL, Account/Admin Operations with dedicated observability verification, Maintenance, Account Data Lifecycle, Reconciliation, Cancellation, Generation Integration, Video Generation and Integrated Release.
- Account/Admin screenshot artifact `11371566032` (`sha256:3ec7a23f48aa6a80cbfb1bede284b5cb996d59830044d1d919ea46017e9c4ecb`) was human-reviewed on desktop, 390px and reduced-motion evidence with no corrective UI change required.
- PR #339 squash-merged as `895910e0bb1f683202113592f0c03429b87bdde5`. All 14 affected merged-main push workflows reached accepted success; Engineering Quality `37385805769` and CodeQL `37385805676` are green. Provider-dependent initial failures were rerun unchanged after the shared outage window and passed on the same merge SHA.
- Post-merge shared-state cleanup is exact: the one stale namespace from failed PR run `37367463510` attempt 2 was removed through the constrained cleanup RPC (9 diagnostics, 3 alerts), after which `test.*` diagnostic rows, `test.*` alerts, and ENT-005 observability/Admin/video fixture Auth users all count zero.
- Live migration history includes `20261005181527 renderlab_operational_observability` and forward hardening `20261005202352 renderlab_operational_observability_privilege_hardening`; post-hardening effective privileges and empty-search-path `SECURITY DEFINER` RPC boundaries were reverified.
- No Vercel production deployment, paid-plan upgrade, production scheduler, backup/replication resource, telemetry vendor, or provider-routing change occurred. Supabase/R2 destructive-loss RPO/RTO remain explicitly unestablished.
