# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json identifies source `80194dfe654bd7c34660c4679a8c97542db94387`, READY deployment `dpl_32ns93K9T2tRVQ2azrcBxJBy5238` (`https://renderlab-igi59d5u6-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681` at `2026-11-24T09:16:04.401Z` (independent team-account alias read-back; updatedAt 1795511764401; createdAt unchanged 2026-11-21T02:01:08.378Z). Deployment Readiness #45362418421 passed at `2026-11-24T09:09:32Z`; all six exact-source protected checks passed: quality 138328819253, governance 138328820761, unit-coverage 138328818867, javascript-typescript 138328860614, clean-room (ubuntu-latest) 138328819647, clean-room (windows-latest) 138328820347. Qualified at `2026-11-24T09:09:32.000Z`, before cutover. Rollback anchor: `dpl_7Q8CbxmgWJW5qmizzHtBXcoNP8HY` at source `aeb43cb508297e22c52d87de4df747cbd7c8516a`.

Batch E: all eleven ordered PRs qualified and merged (#678/#679/#680/#676/#671/#669/#672/#670/#673/#675/#674), then docs #684 and #686; #687 deferred. Additive 0037 installed (ledger 20261124090831); bounded dispatch claim signature/defaults and service_role/dispatcher-only grants unchanged, attach-only at cap verified by catalog, jobs 70 and outbox 0 with identical before/after digests. Captured pre-0037 function/ACL rollback text in `docs/audits/BATCH_E_MIGRATION_0037_ROLLBACK_2026-11-24.md`; migration remains installed unless separately authorized. Real production environment preflight passed. Renderer v13 at 09:26:58Z, gateway/dispatcher v14 at 09:27:00Z, tag 80194df, worker tree 4633471969d96f3b3a861a15edadd835253d85b4; rollback renderer v12/gateway v13. Landing/health HTTP 200, Admin fresh heartbeat 35s, zero active jobs/reservations/expired claims/unresolved. FE-01 Edit attaches source and Reuse Settings restores original prompt, seed 1889046298, 4 steps and 1:1 recipe. Preferences MFA and malformed non-FIBO API probes not completed because WANDA was preempted. Verification generation explicitly pending at record merge; 0/1 consumed. Historical Batch D evidence: `docs/audits/BATCH_D_RELEASE_EVIDENCE_2026-11-24.md`. Batch E evidence: `docs/audits/BATCH_E_RELEASE_EVIDENCE_2026-11-24.md`.


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
