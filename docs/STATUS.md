# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json records source a450a95996329a4508883ab77996016cd27fbd86 and deployment dpl_BGgjGSbpX87LhkYY7w6HXt6hvw5D (https://renderlab-r3r4ky55h-faresmohamed260-6733s-projects.vercel.app) as the assigned production release for renderlab.faresuniform.uk. At 2026-11-20T21:45:14Z both the custom domain and exact deployment URL returned HTTP 402 with Vercel `X-Vercel-Error: DEPLOYMENT_DISABLED`; the application is not currently reachable. This supersedes the earlier availability read-back without changing the recorded release identity or alias cutover at 2026-11-20T15:59:40.628Z. Production Modal `main` retains the same five-app topology and gateway app `ap-UfrkwIijsdz6xiGiQwtMlB`; the gateway now runs both the durable dispatcher and the CPU-only owner health monitor. Recovery migration 20261120050006, heartbeat migration 20261120110737 and alert-resolution migration 20261120155628 are applied. A controlled 245-second heartbeat-age injection produced one bounded unhealthy event and one accepted owner notification; the next scheduled completion restored healthy state and the alert resolved. Read-back then showed zero active jobs, incomplete dispatches, expired claims or unresolved work. Existing matched-release smokes 44679882865 and 44680785603 plus lifecycle runs 44722092155 and 44722444992 retain their render, Library, queue, warm-reuse, cancellation, recovery and cleanup evidence.

Exact-source CI completed at 2026-11-20T15:56:01.000Z: Deployment Readiness 44767876962; protected check runs 136397291512, 136397291772, 136397292617, 136397292551, 136397292299, 136397291909.

Rollback anchor: dpl_GNAGLCFnynWUdMEtiYDgX9oXeNrb at source d9f9bd4e12103e3524b02e6d4d188ddf9b3ba882. Restore that application and redeploy its matching gateway source if the owner-monitor release must be rolled back. Automatic Git-to-production deployment remains disabled. Hosted missed-wake/lost-response/overlap recovery and replay-retention are production-verified in `docs/audits/ADR005_DURABLE_RECOVERY_PRODUCTION_2026-11-20.md`; the owner Modal usage alert is verified in `docs/audits/ADR005_MODAL_USAGE_ALERT_PRODUCTION_2026-11-20.md`. Hosted timeout/process-exit recovery is the only open ADR-005 evidence; this production pointer does not claim that gate complete.

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
