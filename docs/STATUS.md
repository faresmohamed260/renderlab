# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json records source 2a64d4ccc03e8f8ce1e415d298687321179efb50 and deployment dpl_7X5xzARHaT7nXkzoHMoHiGxi1xfa (https://renderlab-lm6iyalsg-faresmohamedsalah10-1681.vercel.app) as the assigned production release for renderlab.faresuniform.uk. Production cutover was 2026-11-23T14:16:59.684Z. Deployment Readiness 45191297596 and protected-main check runs 137749633212, 137749633446, 137749634151, 137749633631, 137749633707, 137749634998 qualified this source at 2026-11-23T14:11:26.000Z. The rollback anchor is dpl_ChVfct9Zsy2UY19QKKHYHetER46S at source 30634662fb0319e3b6a943af2c89872ef607104b. The P0-02 typed runtime environment guard and P0-03a sanitized privileged-database failures are production-live; P0-03b owner isolation is blocked until Production Documentation Sync passes. The 16-name Production inventory remains the accepted configuration contract. The Phase 2 oldest-active-job Admin Health and dispatch-health signal is production-live; it adds no generation, schema, secrets, Modal change or scheduled settlement. Hosted ADR-005 process-exit recovery was verified live on application source 2db59d904bd02b8fc6e6d4690d4417f4ba55d176 in [run #45079695192](https://github.com/faresmohamed260/renderlab/actions/runs/45079695192). See the [verification audit](audits/ADR005_PROCESS_EXIT_RECOVERY_VERIFIED_2026-11-22.md).

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
