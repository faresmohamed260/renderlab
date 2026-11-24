# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json identifies source `429afee1d1f8ea06f663e96f9c554bf37c5c2ab8`, READY deployment `dpl_FLynJG8JYSmFYSJJWaTs3Hg6yU5i` (`https://renderlab-jc1nq0ods-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681` at `2026-11-24T15:33:25.817Z` (independent head-engineer team-account alias read-back; updatedAt 1795534405817; createdAt unchanged 2026-11-21T02:01:08.378Z). Deployment Readiness #45425859929 passed at `2026-11-24T15:28:40.000Z`; all six exact-source protected checks passed: quality 138550768494, governance 138550769724, unit-coverage 138550770654, javascript-typescript 138550770330, clean-room (ubuntu-latest) 138550768513, clean-room (windows-latest) 138550769506. Qualified at `2026-11-24T15:28:40.000Z`, before cutover. Rollback anchor: `dpl_32ns93K9T2tRVQ2azrcBxJBy5238` at source `80194dfe654bd7c34660c4679a8c97542db94387`.

Batch F: app-only release of #681 (hosted capability controls and unsupported negativePrompt sent as empty string), #683 (popovers), #685 (reflow and targets), #689 (Library focus restoration), with docs #684/#686/#688. Real Production environment preflight passed. Migration 0037 (ledger 20261124090831) unchanged; Modal renderer v13 and gateway/dispatcher v14 unchanged, worker tree 4633471969d96f3b3a861a15edadd835253d85b4. Live QA: Create 1440 and 390, 320 CSS px reflow, disclosure targets and popover Escape/focus return passed; true 200% zoom at 390 showed 15 CSS px internal composer overflow (known limitation accepted by head engineer; #694 targets the next release). Verification generation explicitly pending at record merge, 0/1 consumed. Detailed QA and evidence: `docs/audits/BATCH_F_RELEASE_EVIDENCE_2026-11-24.md`. Previous Batch E evidence: `docs/audits/BATCH_E_RELEASE_EVIDENCE_2026-11-24.md`.


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
