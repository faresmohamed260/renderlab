# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json identifies source `aeb43cb508297e22c52d87de4df747cbd7c8516a`, READY deployment `dpl_7Q8CbxmgWJW5qmizzHtBXcoNP8HY` (`https://renderlab-34wskn7jz-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681` at `2026-11-24T05:56:36.063Z` (independent team-account alias read-back). Deployment Readiness #45336488371 passed at `2026-11-24T05:54:30Z`; all six exact-source protected checks passed: quality 138247489140, governance 138247488114, unit-coverage 138247488518, javascript-typescript 138247488189, clean-room (ubuntu-latest) 138247488374, clean-room (windows-latest) 138247488166. Qualified at `2026-11-24T05:54:30.000Z`, before cutover. Rollback anchor: `dpl_52LrtHNSYLVtfXhQ3eaRQUcnpQG1` at source `6f3b1ee7b4b5109816a082ca8cccb4f92263a8bf`.

Batch D: ordered #654/#655/#657/#658/#659, then qualified TLS #653 after successful one-shot canary. Additive 0036 installed (ledger 20261124054825, 05:48:25Z); zero eligible historical outbox rows, existing terminalize signature and service-only grants unchanged, no-op not_found, unstarted outbox closure and canonical asset guard present. Reviewed public Supabase Root 2021 CA downloaded 2026-11-24, SHA-256 700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7, verify-full canary passed. Real Vercel environment preflight passed. Renderer v12 at 05:57:29Z, gateway/dispatcher v13 at 05:57:33Z, tag aeb43cb, worker tree 0ff15d97fac3c7b24268236212f26febd4148c47; rollback renderer v11/gateway v12. Scheduled heartbeat continued at 05:58:01Z. Site/health/capabilities and invalid-request checks passed. One authorized hosted smoke and headerless server-key witness pending. Historical batch C evidence: `docs/audits/BATCH_C_RELEASE_EVIDENCE_2026-11-24.md`. Batch D evidence: `docs/audits/BATCH_D_RELEASE_EVIDENCE_2026-11-24.md`.


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
