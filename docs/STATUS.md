# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json identifies source `593095eeabd09791e16e67d3ba9d105a92244949`, READY deployment `dpl_5DugposwdpcoLui6XWdx3RnyScNr` (`https://renderlab-jrpamdrmb-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681` at `2026-11-24T03:25:42.900Z` (independent team-account alias read-back). Deployment Readiness #45319050068 passed at `2026-11-24T03:23:00Z`; six required exact-source checks passed: quality 138192745720, governance 138192745954, unit-coverage 138192745921, javascript-typescript 138192745914, clean-room (ubuntu-latest) 138192745918, clean-room (windows-latest) 138192745493. Qualified at `2026-11-24T03:24:05.000Z`, before cutover. Rollback anchor: `dpl_A7eduj9tRV6k2Lvq5DC2Ly1qUGZP` at source `564d0ed0ac677fce301aa94d64f9358e3f9d31ca`.

C1: app-only H1 (#649); expired FIBO handle gets one bounded observation before deadline terminalization. No migration; 0034 remains installed (ledger 20261124010505). No Modal deployment; renderer v10 and gateway/dispatcher v11 unchanged. Site/health/capabilities and invalid-request checks passed; empty active queue verified. One authorized unpolled late-return fixture passed ([#45320628441](https://github.com/faresmohamed260/renderlab/actions/runs/45320628441)): HTTP 202, 1321 seconds old, zero polls, one Library GET 200, succeeded via server continuation, one durable asset, released reservation, atomic calls 3 to 4, zero residue. Initial HTML did not contain the asset; no second load. Allowance consumed. Production Documentation Sync #45320308656 passed. Batch B historical evidence: `docs/audits/BATCH_B_RELEASE_EVIDENCE_2026-11-24.md`. C1 evidence: `docs/audits/C1_RELEASE_EVIDENCE_2026-11-24.md`.


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
