# RenderLab Status

> **Phase 6 production release (2026-11-26):** The redesigned application is live; the canonical production manifest records the deployed source. Repository closure requires the reviewed documentation update and successful Production Documentation Sync.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json identifies source `fb84c89cb41b42fcceeb0ba0fc132959a1368107`, READY deployment `dpl_FVt77brpWxKkKYJQCjUtLbr9wTcn` (`https://renderlab-djs4imuqi-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681`, project `prj_APU35jTnge27D2MAFjuc7GP0Dd6I` at `2026-11-26T22:43:54.413Z` (independent head-engineer team-account read-back; updatedAt 1795733034413; redirect null; deployment created 2026-11-26T22:38:41.590Z, READY 2026-11-26T22:39:09.330Z). Deployment Readiness #45901479925 passed at `2026-11-26T21:56:50Z` (job 140188038893); all six exact-source protected checks passed: quality 140188039670, governance 140188038887, unit-coverage 140188038526, javascript-typescript 140188038767, clean-room (ubuntu-latest) 140188038681, clean-room (windows-latest) 140188038918. Qualified at `2026-11-26T21:58:03.000Z`, before cutover. Rollback anchor: READY deployment `dpl_Fn5yNhNWz7owH9tMqi5cSbs3Y4WE` at source `34efe0b84ac1d950581d7b371b65bbf331852e89`.

Phase 6: app-only UI redesign, including Landing, Create, Library, Settings, History and scoped Admin presentation; Activity retains its signed-out 200 contract. Production environment inventory 16/16; staged Production build READY. Migration 0037 (ledger 20261124090831), Modal renderer v13 and gateway/dispatcher v14, and worker tree 4633471969d96f3b3a861a15edadd835253d85b4 unchanged. Ordinary generation submit/admission/dispatch/payload paths unchanged; History adds retry/run-again entry points. No verification generation was run (owner authorized zero spend). Head-engineer read-only database evidence: empty outbox, no non-terminal jobs, dispatcher heartbeat with zero unresolved dispatches. Hosted signed-out HTTP run 45905056828 (job 140199724980) passed; local Batch G/candidate comparison and authenticated staged read-back preserved /create, /activity, /library 200 and /admin 404 without Location. Post-promotion cookie-free HTTP and browser checks passed: Landing, Create, Library and Settings 200, Activity 200, Admin 404, no Location; signed-out private-state markers present, Settings sign-in and Create rendered, no runtime error/fatal records, Batch G rollback still READY. No rollback required. Holds #813, #748, #603 and #625 remain. Release source/readiness evidence: `docs/audits/2026-11-26-phase6-production-preflight.md`, `docs/audits/2026-11-26-phase6-final-acceptance.md`, and `docs/audits/2026-11-25-release-readiness-main-0d83c87.md`. Prior Batch G evidence: `docs/audits/BATCH_G_RELEASE_EVIDENCE_2026-11-24.md`. Repository closure remains pending Production Documentation Sync.


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
