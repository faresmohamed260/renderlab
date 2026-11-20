# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json. Vercel confirms renderlab.faresuniform.uk serves source d9f9bd4e12103e3524b02e6d4d188ddf9b3ba882 from deployment dpl_GNAGLCFnynWUdMEtiYDgX9oXeNrb (https://renderlab-nalx7qqal-faresmohamed260-6733s-projects.vercel.app). Alias cutover: 2026-11-20T15:32:22.842Z. Production Modal `main` has the private gateway, reusable image worker and three inactive CPU-only workload shells. Recovery migration 20261120050006 and heartbeat migration 20261120110737 are applied. The scheduled gateway now records a durable completion every minute; live health read-back returned scheduledHeartbeatMissing=false, zero due, expired or unresolved dispatch work, and zero active jobs. Matched-release smokes 44679882865 and 44680785603 plus lifecycle runs 44722092155 and 44722444992 retain their render, Library, queue, warm-reuse, cancellation, recovery and cleanup evidence.

Exact-source CI completed at 2026-11-20T15:31:51.000Z: Deployment Readiness 44764107299; protected check runs 136248749299, 136248748864, 136248748690, 136248749275, 136248749859, 136248748775.

Rollback anchor: dpl_ok8kLgcaYAqHZAk2f1m874jotpPp at source c3f92247b21b9761fde6cee610cce2c9084441f8. Restore that application together with its compatible Modal release if heartbeat-aware application health must be rolled back. Automatic Git-to-production deployment remains disabled. Hosted timeout/process-exit recovery, missed-wake/lost-response/overlap recovery, replay-retention, heartbeat/outbox owner-alert delivery and the owner provider-spend alert remain open ADR-005 evidence; this production pointer does not claim those gates complete.

## Product capabilities

- FIBO image generation and reference-backed image editing
- Durable uploads and generated-media persistence
- Activity/job lifecycle tracking
- Media Viewer continuation actions
- Library search, favorites, collections, rename, download, and deletion
- Authentication, profile/preferences, sessions, MFA, export, and account deletion
- Administrative closed-beta operations

## Engineering posture

- Server-side media validation, bounded request contracts, same-origin mutation protection, and explicit server-only privileged-module boundaries are enforced.
- Generation/job processing uses server-owned reconciliation, retry, cancellation, persistence, and retained operational diagnostics rather than depending on an initiating browser tab.
- CI includes static analysis, TypeScript checks, CodeQL, unit coverage reporting, browser/integration lifecycle workflows, deterministic lockfile installs, immutable action pins, and Ubuntu/Windows clean-room portability checks.
- Recovery operations have verified logical database/Auth plus R2 backup/restore evidence; incident and recovery procedures remain governed by `docs/operations/INCIDENT_RESPONSE_AND_RECOVERY.md`.
- Credential-free documentation governance checks metadata/schema, supersession, production-manifest mirrors, lifecycle vocabulary, closed-contract checklists, current-section uniqueness, local references, review-date policy, and the public-documentation audience/compaction boundary.
- The current same-rubric enterprise hardening baseline remains **8.8/10** after ENT-010. Detailed ENT-001 through ENT-010 execution evidence is historical and should be read from the preserved status snapshot and audits, not from this current summary.

## Known boundaries

- The workspace is not publicly self-service; access requires authorization.
- Provider-backed generation depends on configured production worker/provider availability.
- Some workflows and model routes remain capability-gated until ownership and production readiness are verified.
- There is no supported public API or community plugin contract at this time.
- The repository is source-visible for evaluation but is not an open-source community project.
- Large-module decomposition, stronger performance evidence, targeted Node-unit breadth, and higher-maturity disaster recovery remain separate follow-ons. A weekly retained-restore cadence is now configured, but published recovery objectives still require multiple successful scheduled restore runs rather than being inferred from one drill or from configuration alone.

## Current direction

RenderLab is being simplified to one FIBO image-generation path. FLUX, Qwen, LTX, video generation/animation, and image upscale are retired from new work; historical media remains readable.

For capability detail use `docs/architecture/PRODUCT_CAPABILITIES.md`; for infrastructure and operational boundaries use `docs/architecture/INFRASTRUCTURE.md`; for exact historical phase/run chronology use `docs/audits/**` and `docs/archive/**`.
