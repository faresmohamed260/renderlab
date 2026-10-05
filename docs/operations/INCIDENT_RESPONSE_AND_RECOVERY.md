# RenderLab incident response and recovery

Date: 2026-10-05
Status: operational runbook / current repository and shared-infrastructure truth

## Purpose

This runbook is the operator handoff for RenderLab incidents. It covers detection, containment, verification, rollback and recovery using capabilities that are actually present today. It does not convert an unverified backup path into a recovery guarantee.

The repository is the application source of truth. Production application changes use exact Git SHAs and explicit Vercel deployment/alias operations; Git merge alone is not deployment authorization. The current production SHA remains recorded in the authoritative production blocks in `PROJECT.md`, `docs/ui/UI_MIGRATION.md`, `docs/ui/SCREEN_REGISTRY.md`, and `docs/architecture/INFRASTRUCTURE.md`.

## Severity and triage

Use these as operator priorities, not contractual SLAs:

| Severity | Meaning | Initial operator target |
|---|---|---|
| Critical | Account/security boundary failure, destructive or suspected data loss, credentials exposed, or broad product outage with no safe workaround | Begin triage immediately; contain mutation paths before attempting repair |
| High | Repeated generation/provider failure, stuck account deletion, maintenance failure affecting durable cleanup, Supabase/R2 degradation, or a production release regression | Inspect current alert/diagnostic evidence promptly and choose contain/rollback/monitor |
| Medium | Isolated provider/runtime failure, bounded operational email failure, or non-destructive degraded feature with a safe retry/workaround | Confirm scope, preserve evidence, and resolve during the current operating window |
| Low | Informational/one-off failure with no recurring pattern and no correctness/security impact | Record only when it affects future diagnosis or a durable product decision |

Do not escalate ordinary input validation, per-account admission limits, or expected user-facing rate limits as infrastructure incidents merely because they emit diagnostic events.

## First response checklist

1. Confirm the exact application source currently serving production before assuming repository `main` is live.
2. Inspect `/admin` Health when available: aggregate health, open operational alerts, and retained diagnostics are the RenderLab-owned operator view after ENT-005 is deployed.
3. Inspect Vercel/runtime/provider evidence only for the affected window; do not infer health from an old deployment or unrelated workflow run.
4. Decide whether the incident is availability-only, correctness/security affecting, or suspected destructive data loss.
5. Contain before repairing when credentials, authorization, destructive writes, or unsafe provider behavior are involved.
6. Preserve exact timestamps, alert family, bounded diagnostic correlation, deployment SHA, workflow/run IDs, and operator actions. Do not copy prompts, signed URLs, secrets, raw provider payloads, account emails, or R2 keys into incident notes unless a narrowly authorized forensic workflow requires them.
7. After mitigation, run the smallest authoritative verification that proves the affected boundary and exact fixture cleanup.

## RenderLab durable observability

ENT-005 adds two server-owned Supabase records once the application code is deployed:

- `renderlab_diagnostic_events`: privacy-bounded lifecycle diagnostics retained for 30 days and pruned in bounded maintenance work;
- `renderlab_operational_alerts`: deduplicated high-signal incident state for generation/provider degradation, maintenance failure, and stuck account deletion.

Both tables are RLS-enabled, raw browser access is revoked, and application access is service-role-only. Admin payloads omit retained diagnostic `job_id`. Operational alert email is secondary notification only; persisted alert state and Admin Health are authoritative when Resend is unavailable.

Durable diagnostic persistence is observational. A diagnostic-store or email failure must never be treated as proof that the underlying product mutation failed, and product correctness must never depend on telemetry success.

## Generation/provider degradation

Signals:
- `generation-provider-degradation` operational alert;
- repeated bounded `generation.submission` / `generation.reconciliation` backend, worker, provider-stalled, orchestration or reconciliation failure codes;
- configured/live generation workflow failures on the exact affected source.

Response:
1. Confirm whether failures are one ecosystem/worker or broad across Image/Video/Upscale.
2. Do not alter worker routing from an Admin/browser surface; routing is server-owned repository/infrastructure state.
3. For a suspected worker outage, inspect current registered endpoint health and historical job identity before disabling/replacing a worker. Never reuse an old worker ID for a different provider/workspace if persisted jobs still reference it.
4. If the application release introduced the failure and a known-good production deployment exists, prefer exact alias restoration over speculative code changes.
5. If provider infrastructure alone is degraded, preserve accepted-job reconciliation/cancellation semantics and avoid duplicate-prone resubmission unless the existing failover contract has explicit safe evidence.
6. Verify recovery with the smallest affected generation integration and confirm no run-owned job/media/R2 residue.

Do not claim a provider RTO. Provider recovery is an availability dependency and depends on the external worker/runtime state.

## Vercel/application outage or release regression

1. Resolve the custom domain to the currently serving deployment and record its exact Git SHA.
2. Compare that source with the last known-good deployment recorded in Infrastructure/Project docs.
3. If the current deployment is unhealthy and the previous deployment is known-good, restore the custom-domain alias to that deployment using the established guarded deployment workflow/process. Do not assume deep platform rollback is available on the current plan.
4. Smoke the public root plus representative application routes. Preserve the established signed-out `/admin` concealment behavior rather than treating its expected 404 as a generic failure.
5. Check runtime errors for the cutover window where platform capability allows it.
6. Do not mutate Supabase/R2 merely because the application tier is unavailable.

Operator recovery target for source/config tracked in Git: restore service from a known-good exact Vercel deployment/alias during the active incident-response window. This is an operator target, not a Vercel SLA.

## Supabase outage or database degradation

1. Treat authentication, account authorization, durable product state and service-role application access as affected until proven otherwise.
2. Prefer fail-closed behavior for private/authenticated mutations; do not bypass owner/access checks or expose raw browser table access to keep the product partially available.
3. Do not apply speculative schema repairs during a provider outage. Confirm current migration history and advisor/privilege state first.
4. If the issue is a bad RenderLab migration, use forward-compatible repository-authorized correction rather than silently rewriting migration history already applied to the shared project.
5. If destructive database loss is suspected, stop destructive recovery claims and move to the recovery-objectives section below. The current Free-plan project has no verified recoverable database snapshot/PITR path in RenderLab operations.

## Cloudflare R2/storage failure

1. Distinguish signed-URL/CORS/credential failure from object absence before changing storage state.
2. Keep opaque product media identity authoritative; never promote raw R2 keys or signed URLs into user-facing durable identity.
3. For temporary staging or tombstoned-media cleanup, use only the established row-owned object contract and idempotent maintenance/delete semantics. Never sweep arbitrary prefixes during an incident.
4. For suspected credential failure, rotate/restore credentials through the approved secret stores and verify only exact-origin/private object operations needed by RenderLab.
5. If durable object loss is suspected, do not claim recovery from Supabase metadata. The current R2 resource has no independently verified replica/version/backup restore path.

## Resend/operational email outage

- Treat failed operational email as notification degradation only. The operational-alert row remains authoritative.
- Inspect `/admin` Health directly.
- Do not retry unbounded email fanout or add a second mail provider during an incident.
- If the Resend credential is suspected compromised, rotate it, update the approved server secret stores, and verify bounded delivery/authentication without copying the secret into repository/chat/log evidence.
- Existing product/Auth mail configuration and operational-alert mail are separate concerns; avoid changing hosted Auth templates/routes unless they are actually implicated.

## Maintenance or reconciliation execution failure

- Generation reconciliation and maintenance are server-owned internal boundaries; ordinary browsers must never receive their secrets.
- Maintenance failures open the `maintenance-failure` alert family when a category reports failures. Diagnostic retention is itself bounded maintenance work.
- A failed maintenance pass does not authorize broad cleanup. Re-run only after the underlying R2/Supabase fault is understood; eligibility predicates for staging and tombstoned media remain authoritative.
- Reconciliation failure must preserve duplicate-avoidance and claim/lease semantics. Do not manually patch a job to succeeded/cancelled without the existing lifecycle invariants and durable-output evidence.
- ENT-005 adds no second schedule and does not activate `pg_cron`/`pg_net`.

## Account deletion stuck

- A third durable deletion retry for the same one-way opaque account-lifecycle correlation opens the `account-deletion-stuck` critical alert.
- Do not reverse the deletion freeze merely to clear the alert.
- Inspect which bounded deletion stage remains retryable (storage, database finalization, Auth deletion, notification) using the existing account-lifecycle verifier/service evidence.
- Never place raw user UUID/email into the diagnostic store or operational-alert record.
- Recovery is successful only when the existing deletion lifecycle proves convergence and residue checks pass.

## Credential compromise

For every credential incident: contain use first, rotate/revoke through its authoritative provider, update only approved secret stores, verify the least necessary product boundary, then invalidate stale local/operator copies. Do not commit replacement values or paste them into incident evidence.

| Credential | Containment/recovery |
|---|---|
| Supabase service-role key | Treat all RenderLab server-side database capabilities as compromised; rotate/revoke through Supabase, update Vercel/GitHub secrets that legitimately require it, verify service-only access and browser denial |
| Supabase management/access token | Revoke/rotate management credential; audit hosted Auth/project changes made in the suspected window; it is not an application browser credential |
| R2 access key/secret | Rotate in Cloudflare, update Vercel/GitHub server/CI secrets, verify private GET/PUT/delete and exact-origin upload CORS behavior; do not change bucket policy broadly |
| Vercel token | Revoke/rotate, inspect deployments/aliases/env changes in the incident window, and re-establish the explicit-deploy-only boundary |
| Resend API key | Revoke/rotate, verify current sender/domain settings and bounded server delivery; preserve tracking/template decisions unless separately implicated |
| Worker/provider credential | Revoke/rotate at provider/workspace, verify registered worker health/identity and persisted-job lookup semantics before re-enabling routing |
| Internal reconciliation/maintenance secret | Rotate server-side secret and any authorized scheduler/caller configuration together; never expose a temporary bypass endpoint |

## Exact-fixture and shared-resource safety

- Recovery/verifier fixtures must have deterministic run-owned identities or explicit namespace prefixes.
- Cleanup may delete only exact run-owned Auth/database/R2 state. Never use broad name/prefix matching that can catch legitimate product data.
- Shared Supabase tests that intentionally inject failures must not reuse production operational-alert keys; dedicated observability verification uses a run-owned namespace and explicit cleanup.
- An interrupted configured workflow is not considered clean until its cleanup-only path or direct residue audit proves absence.
- Historical anomalies and user data are evidence, not garbage. Do not delete/reclassify them to make a health query look clean.

## Post-incident validation

At minimum record:
- incident window and severity;
- exact production deployment/SHA before and after mitigation;
- affected alert family/diagnostic correlation where safe;
- containment action;
- exact verification run(s) and result;
- fixture/residue cleanup result;
- whether shared schema, Vercel alias/env, R2 config, worker routing, Auth config, or credentials changed;
- any remaining blocker that needs a separate execution-ready contract.

If the incident changes durable architecture, deployment state, recovery assumptions, credentials/configuration contract, or a material unresolved blocker, update the existing repository authority rather than leaving the decision only in chat or an incident scratchpad.

## Recovery objectives by asset class

These are evidence-backed current objectives, not provider SLAs.

| Asset/state | Current recovery basis | Current objective |
|---|---|---|
| Application source and repository-tracked configuration | Git history + exact-SHA validation + known-good Vercel deployments/explicit alias control | Recoverable in principle; operator target is same-incident-window restoration from a verified known-good deployment |
| Supabase RenderLab data and Supabase Auth data | Primary shared Supabase Free project only; no verified RenderLab-managed logical backup credential/path and no managed PITR/daily-backup guarantee under the current plan | **Destructive-loss RPO: not established. Destructive-loss RTO: not established.** |
| Cloudflare R2 durable media bytes | Primary shared R2 resource; no separately verified versioning/replication/backup restore path | **Destructive-loss RPO: not established. Destructive-loss RTO: not established.** |
| Worker/provider runtime | Repository registration + external provider/workspace deployments; product truth remains in Supabase/R2 | Availability recovery only; no product-data RPO applies. No provider RTO is claimed. |
| Operational diagnostics | 30-day primary Supabase diagnostic store after ENT-005 deployment | Operational evidence only; loss must not affect product correctness and has no product-data RPO promise |

A runbook is not a backup. Do not raise the database/storage recovery assessment merely because incident procedures exist.

## DR maturity promotion gate

RenderLab may claim verified database or object-store destructive-loss RPO/RTO only after a separately authorized phase establishes and tests a real recoverable path. Acceptable directions include:

- a paid managed Supabase backup/PITR capability with verified restore procedure and measured restore evidence; or
- an approved encrypted off-site logical database export workflow with required backup credential, retention, independent restore target and successful restore verification;
- for R2, a separately approved versioning/replication/backup destination with a verified object restore exercise.

Any such phase must define retention, encryption/key ownership, backup credential scope, restore isolation, fixture safety, restore verification, cost, RPO/RTO measurement and operator escalation before being credited as DR maturity.
