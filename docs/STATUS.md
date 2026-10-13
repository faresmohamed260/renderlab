# RenderLab Status

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

**Deployment:** `PRODUCTION-LIVE`. **Verification:** `PRODUCTION-VERIFIED`.

- Public product: https://renderlab.faresuniform.uk; access is closed beta / invitation only.
- Canonical production manifest: `docs/production/current.json`; exact application source `d7571a230b3f1c5719552628db020823adb4da73`.
- READY deployment: `dpl_5LZbW2kA6bFZpYvy2p8bFXzZ2ABF` at `https://renderlab-de7i5y37u-faresmohamed260-6733s-projects.vercel.app`; public domain `renderlab.faresuniform.uk`.
- Release qualification passed Deployment Readiness `37930497565` and Release Candidate Matrix `37934750620`; qualification completed at `2026-10-09T13:22:15.000Z`, and the verified cutover occurred at `2026-10-09T13:25:40.464Z`.
- Immediate verified rollback anchor: deployment `dpl_4E38yZarWfooA4wfEuW5USmPnNsN` at application source `bcb2de305b15f4be15ed42674d22998c30b8c811`.
- Protected `main` may be newer because documentation, CI/tooling, and verification-only changes do not automatically deploy. Automatic Git -> Vercel deployment remains disabled.

## Product capabilities

- Image generation and reference-backed image editing
- Image animation and video generation
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
- Credential-free documentation governance checks metadata/schema, supersession, production-manifest mirrors, lifecycle vocabulary, closed-contract checklists, current-section uniqueness, local references, and review-date policy.
- The current same-rubric enterprise hardening baseline remains **8.8/10** after ENT-010. Detailed ENT-001 through ENT-010 execution evidence is historical and should be read from the preserved status snapshot and audits, not from this current summary.

## Known boundaries

- The workspace is not publicly self-service; access requires authorization.
- Provider-backed generation depends on configured production worker/provider availability.
- Some workflows and model routes remain capability-gated until ownership and production readiness are verified.
- There is no supported public API or community plugin contract at this time.
- The repository is source-visible for evaluation but is not an open-source community project.
- Large-module decomposition, stronger performance evidence, targeted Node-unit breadth, and higher-maturity disaster recovery remain separate follow-ons. Published recovery objectives still require repeated scheduled evidence rather than being inferred from one drill.

## Current direction

Current work focuses on expanding creative workflows, improving continuation between media operations, strengthening organization/project workflows, and preserving production reliability as provider capability grows.

For internal project handoff and current execution context, see [`PROJECT.md`](../PROJECT.md). For capability detail use `docs/architecture/PRODUCT_CAPABILITIES.md`; for infrastructure and operational boundaries use `docs/architecture/INFRASTRUCTURE.md`; for exact historical phase/run chronology use `docs/audits/**` and `docs/archive/**`.
