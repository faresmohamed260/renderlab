# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json records source 696ca784759eb94457005381fc34b0509d00e920 and deployment dpl_DPm2p2XMTiR7GrMasYPbeAYkvMhJ (https://renderlab-f605c5596-faresmohamedsalah10-1681.vercel.app) as the assigned Production release for renderlab.faresuniform.uk. Vercel created the deployment at 2026-11-23T18:54:51.991Z, marked it READY at 2026-11-23T18:55:18.475Z, and assigned the domain alias at 2026-11-23T18:57:41.196Z. Deployment Readiness run 45242184985 and six exact-source protected-main checks qualified the release at 2026-11-23T18:48:37.000Z before cutover: quality 137926808136, governance 137926808256, unit-coverage 137926809289, javascript-typescript 137926809008, clean-room (ubuntu-latest) 137926808236, and clean-room (windows-latest) 137926808120. Rollback anchor: dpl_AsG9axxT8oe9buUuxrzXYvrB9NXB at source bc3cc27f2d207efdea87bb5d5d57706ba49320ba.

Since the previous release, this Vercel application source includes shared executable generation-request and response schemas, generated private OpenAPI 3.1 and compatibility/fingerprint contracts with CI drift detection (PR #564), and exact old/new acceptance, normalization and sanitized error-code/message agreement across the 1,128-case offline differential corpus. The additive typed provider adapter boundary and fake second-provider conformance are present only as UNWIRED source code (PR #569); no live generation, dispatch, reconciliation or provider route imports the adapter. The seven-scenario credential-free backend demo was already in the previous deployed baseline and remains offline. The additive P0-07 migration 0031 is present in the repository after PR #576 but has NOT been applied to production Supabase; its application caller PR #580 remains pending approval and is NOT included in this deployed SHA. Production verification used no generation: root and health 200, FIBO and mask capabilities available, anonymous invalid/boundary POSTs sanitized 400 with stable invalid_request codes, and signed-out Admin Health 403. The signed-in Admin Health view showed 0 active jobs/reservations and 0 unresolved dispatches; authenticated invalid-request browser verification is tracked separately and not claimed complete by this record. The Phase 3 numeric 42/60 score is a repository assessment, not permission to release migration 0031 or close the broader backend-first gate. No production migration, Modal/worker deployment, new secret, S.A.G.A. change or resume edit was performed for this release.

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
