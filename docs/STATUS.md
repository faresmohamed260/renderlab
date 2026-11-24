# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json identifies source `564d0ed0ac677fce301aa94d64f9358e3f9d31ca`, READY deployment `dpl_A7eduj9tRV6k2Lvq5DC2Ly1qUGZP` (`https://renderlab-hdb9susbu-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681` at `2026-11-24T01:08:44.311Z` (independent team-account alias read-back). Deployment Readiness #45302357807 passed at `2026-11-24T01:06:09Z`, after all six exact-source protected checks: quality 138136182053, governance 138136181064, unit-coverage 138136180466, javascript-typescript 138136229714, clean-room (ubuntu-latest) 138136181121, clean-room (windows-latest) 138136181507. Qualified at `2026-11-24T01:06:09.000Z`, before cutover. Rollback anchor: `dpl_HSCgbGPfxTpkGRzuLPEhicaATwX6` at source `e28b41922728e1052f9021b36bef67a84684f979`.

Batch B: additive Supabase migration `0034_generation_request_idempotency.sql` (ledger `20261124010505`, `2026-11-24T01:05:05Z`) applied and verified. Migrations 0032/0033 remain installed. No Modal changes or credential rotations: renderer v10 and gateway/dispatcher v11 in `main`, source `e28b419`, identical worker tree `614ad3132a27b60dee17017462886fae0dec24c7`; these remain the compatible rollback pair. TLS hardening PRs #603/#625 excluded after a failed one-shot qualification without a result marker. Health, capabilities, signed-in Admin Health, malformed idempotency-key rejection and empty-queue checks passed. New operator aggregates available through Admin Health API, not rendered in UI. The one authorized text-to-image fixture passed ([Production FIBO Smoke #45304901061](https://github.com/faresmohamed260/renderlab/actions/runs/45304901061)): 202, succeeded, one Library asset, released reservation, stable second Library load, one atomic terminalization and zero fixture residue. Standing allowance consumed. [Production Documentation Sync #45304819290](https://github.com/faresmohamed260/renderlab/actions/runs/45304819290) passed. Evidence: `docs/audits/BATCH_B_RELEASE_EVIDENCE_2026-11-24.md`.


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
