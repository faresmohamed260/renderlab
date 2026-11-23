# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json records source b548fe40ac274bb4d5bc6d2674ce7bfac556bfcf and deployment dpl_2J4BXM3Y4xF9JWo1cdj38Da5CWJR (https://renderlab-16s8mm8ew-faresmohamedsalah10-1681.vercel.app) as the assigned Production release for renderlab.faresuniform.uk. The Vercel team authenticated alias read-back confirmed deployment dpl_2J4BXM3Y4xF9JWo1cdj38Da5CWJR and alias assigned at 2026-11-23T20:00:50.248Z. Deployment Readiness run 45252066830 completed successfully at 2026-11-23T19:45:23.000Z; all six exact-source protected-main checks were green by 2026-11-23T19:45:57.000Z (release qualifiedAt), before cutover: quality 137963726407, governance 137963726916, unit-coverage 137963727155, javascript-typescript 137963726466, clean-room (ubuntu-latest) 137963726455, and clean-room (windows-latest) 137963726736. Rollback anchor: dpl_DPm2p2XMTiR7GrMasYPbeAYkvMhJ at source 696ca784759eb94457005381fc34b0509d00e920.

Since the preceding live source 696ca784759eb94457005381fc34b0509d00e920, this production release adds P0-07 application-side atomic terminalization via the already-installed service-only Supabase RPC (PR #580), plus the Admin-only fixed-locale/UTC timestamp formatter (PR #584); no worker/Modal/secret runtime delta. The RPC was applied from exact merged migration 0031 at approximately 2026-11-23T19:30:49Z under Supabase migration version 20261123193049, with postgres ownership, SECURITY DEFINER, private EXECUTE grants and a verified no-op not_found result. The original promotion of dpl_2J4BXM3Y4xF9JWo1cdj38Da5CWJR was rolled back to dpl_DPm2p2XMTiR7GrMasYPbeAYkvMhJ at 2026-11-23T19:54:34.735Z after historical Admin hydration error #418 persisted; owner clarified that the pre-existing hydration message is informational, and dpl_2J4BXM3Y4xF9JWo1cdj38Da5CWJR was re-promoted at 2026-11-23T20:00:50.248Z without a rebuild. Post-repromotion GET site/health/capabilities returned HTTP 200, FIBO/mask were available, sanitized invalid POST was HTTP 400 invalid_request, Admin Health displayed zero active jobs/reservations/dispatches, and no generation had yet been spent at record creation. The one owner-approved disposable fixture and atomic exactly-once acceptance remain separate pending verified evidence and mandatory cleanup. A clean signed-in Admin reload did not reproduce #418 during the latest check; the unauthenticated private-window /admin was 404 and is not an equivalent authenticated Admin test. P0-07 production claims should be limited to verified lifecycle results after the fixture; this record does not by itself prove exactly-once settlement. No S.A.G.A., resume, Modal or secret changes.

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
