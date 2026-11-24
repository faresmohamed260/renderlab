# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json identifies source `6f3b1ee7b4b5109816a082ca8cccb4f92263a8bf`, READY deployment `dpl_52LrtHNSYLVtfXhQ3eaRQUcnpQG1` (`https://renderlab-t9lp62erl-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681` at `2026-11-24T04:37:41.196Z` (independent team-account alias read-back). Deployment Readiness #45327110055 passed at `2026-11-24T04:33:17Z`; all six exact-source protected checks passed: quality 138219148837, governance 138219148753, unit-coverage 138219149532, javascript-typescript 138219148452, clean-room (ubuntu-latest) 138219149518, clean-room (windows-latest) 138219149032. Qualified at `2026-11-24T04:34:37.000Z`, before cutover. Rollback anchor: `dpl_5DugposwdpcoLui6XWdx3RnyScNr` at source `593095eeabd09791e16e67d3ba9d105a92244949`.

Batch C: ordered #638/#639/#641/#642/#652/#640 and exact origin correction #660. Additive 0035 installed (ledger 20261124041650, 2026-11-24T04:16:50Z); bounded claim RPC restricted to dispatcher/service role and original claim RPC unchanged. Real Vercel production environment preflight passed. Modal renderer v11 at 04:38:27Z and gateway/dispatcher v12 at 04:38:30Z, release tag 6f3b1ee, worker tree d80febcf2bd7750587914be1f2813ad580aec171; rollback renderer v10/gateway v11. Scheduled heartbeat continued at 04:39:00Z. Site/health/capabilities and invalid-request checks passed. One authorized hosted smoke passed ([#45330349970](https://github.com/faresmohamed260/renderlab/actions/runs/45330349970)): HTTP 202, succeeded, one Library asset, released reservation, stable second load, atomic calls 4 to 5 and zero residue. Renderer v11/gateway v12 corroborated by execution logs and history; scheduled heartbeat 05:04:01Z. Allowance consumed. Production Documentation Sync #45330273477 passed. Admin page loaded; preferences and malformed non-FIBO keyed API probes skipped after repeated WANDA preemption (no new job; identity of preemptor not exposed). TLS and batch D excluded. Historical C1 evidence: `docs/audits/C1_RELEASE_EVIDENCE_2026-11-24.md`. Batch C evidence: `docs/audits/BATCH_C_RELEASE_EVIDENCE_2026-11-24.md`.


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
