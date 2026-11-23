# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json records source bc3cc27f2d207efdea87bb5d5d57706ba49320ba and deployment dpl_AsG9axxT8oe9buUuxrzXYvrB9NXB (https://renderlab-k9e425u5m-faresmohamedsalah10-1681.vercel.app) as the assigned Production release for renderlab.faresuniform.uk. Vercel created the deployment at 2026-11-23T17:32:42.140Z, marked it READY at 2026-11-23T17:33:09.892Z, and assigned the domain alias at 2026-11-23T17:34:36.575Z. Deployment Readiness run 45228447753 and six exact-source protected-main checks qualified the release at 2026-11-23T17:31:13.000Z before cutover: quality 137877226173, governance 137877227697, unit-coverage 137877240912, javascript-typescript 137877228428, clean-room (ubuntu-latest) 137877227394, and clean-room (windows-latest) 137877226827. Rollback anchor: dpl_7X5xzARHaT7nXkzoHMoHiGxi1xfa at source 2a64d4ccc03e8f8ce1e415d298687321179efb50.

Since the prior release, this source includes scoped P0-03 owner-isolation coverage; P0-04 pure eight-state policy; P0-05 deterministic generation critical-path harness; P0-06 native and retained-upscale owner+job+expected-status compare-and-swap with typed already_terminal_or_changed and six race/replay regressions; the backend architecture overview; design-only atomic terminalize-and-release proposal; stale-PR housekeeping triage and conservative Phase 3 P0 scoring; and the seven-scenario offline backend demo (npm run demo:backend) with contributor documentation. The P0-06 application-runtime hardening is production-deployed, while a separate single-generation live fixture remains necessary for hosted acceptance. Previously qualified P0-02 typed runtime configuration, P0-03 privileged-error sanitization, invitation-only enforcement, FIBO mask capability, 16-name Production configuration, and owner-return reconciliation remain applicable. This release made no SQL migration, Modal/worker deployment, new secret, S.A.G.A. change, or resume edit. Atomic terminalization/release and never-return owner settlement remain known limitations; the Phase 3 42/60 gate is not declared met by cutover alone.

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
