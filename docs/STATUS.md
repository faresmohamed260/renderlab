# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json identifies source `e28b41922728e1052f9021b36bef67a84684f979`, READY deployment `dpl_HSCgbGPfxTpkGRzuLPEhicaATwX6` (`https://renderlab-qbu4lqk2v-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681` at `2026-11-23T23:25:33.592Z` (independent team-account alias read-back). Deployment Readiness #45287742956 passed at `2026-11-23T23:19:40Z`, after all six exact-source protected checks: quality 138061953720, governance 138061952455, unit-coverage 138061953393, javascript-typescript 138061953311, clean-room (ubuntu-latest) 138061953290, clean-room (windows-latest) 138061953776. Qualified at `2026-11-23T23:19:40.000Z`, before cutover. Rollback anchor: `dpl_2J4BXM3Y4xF9JWo1cdj38Da5CWJR` at source `b548fe40ac274bb4d5bc6d2674ce7bfac556bfcf`.

Batch A: production Supabase migration `0032_verified_email_invitation_claim.sql` (ledger `20261123231737`, `2026-11-23T23:17:37Z`) and `0033_generation_reconciliation_fairness.sql` (ledger `20261123231813`, `2026-11-23T23:18:13Z`) applied and verified. Vercel Production `CRON_SECRET` and `RENDERLAB_GENERATION_RECONCILER_SECRET` were rotated independently as write-only values, with no values retained in documentation. Modal `main`: renderer `renderlab-image-generation` v10 at `2026-11-23T23:29:59Z` and gateway/dispatcher `renderlab-generation-gateway` v11 at `2026-11-23T23:30:29Z`, tagged `e28b419`, worker tree `614ad3132a27b60dee17017462886fae0dec24c7`; rollback renderer v9 and gateway v10 at source `decd2f6`. Post-deploy no-GPU health, capabilities, authorization boundaries and empty-queue checks passed. The **one authorized text-to-image fixture and zero-residue proof are pending**; do not claim them passed until the manual `Production FIBO Smoke` workflow and independent audit succeed. Details: `docs/audits/BATCH_A_RELEASE_EVIDENCE_2026-11-24.md`.


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
