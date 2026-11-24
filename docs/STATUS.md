# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json identifies source `34efe0b84ac1d950581d7b371b65bbf331852e89`, READY deployment `dpl_Fn5yNhNWz7owH9tMqi5cSbs3Y4WE` (`https://renderlab-is4j1xf69-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681` at `2026-11-24T18:21:47.297Z` (independent head-engineer team-account read-back; updatedAt 1795544507297; createdAt unchanged 2026-11-21T02:01:08.378Z). Deployment Readiness #45457731811 passed at `2026-11-24T18:17:02.000Z`; all six exact-source protected checks passed: quality 138664238729, governance 138664240866, unit-coverage 138664238628, javascript-typescript 138664238657, clean-room (ubuntu-latest) 138664239287, clean-room (windows-latest) 138664238543. Qualified at `2026-11-24T18:17:02.000Z`, before cutover. Rollback anchor: `dpl_FLynJG8JYSmFYSJJWaTs3Hg6yU5i` at source `429afee1d1f8ea06f663e96f9c554bf37c5c2ab8`.

Batch G: app-only release of #693 (mask-editor keyboard interaction, focus and announcements) and #694 (narrow composer overflow fix); #682 tests and #692 planning docs also merged. Real Production environment preflight passed; migration 0037 (ledger 20261124090831), Modal renderer v13 and gateway/dispatcher v14, and worker tree 4633471969d96f3b3a861a15edadd835253d85b4 unchanged. No verification generation was run because no backend or request path changed. Live QA: Create loaded; #694 did not remove the 15 CSS px internal overflow at true 200% browser zoom (195 × 421 effective; DIV 194/209, same as Batch F); mounted CI passed, cause unproven. Head engineer accepted the residual limitation; Phase 6 Create carries the requirement. Remaining desktop QA not run due to WANDA preemption. Detailed evidence: `docs/audits/BATCH_G_RELEASE_EVIDENCE_2026-11-24.md`. Prior Batch F evidence: `docs/audits/BATCH_F_RELEASE_EVIDENCE_2026-11-24.md`.


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
