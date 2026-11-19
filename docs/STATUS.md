# RenderLab Status

> **Create release candidate (2026-11-19):** GitHub main is the development baseline. This candidate makes the Create workspace the production /create UI using existing same-origin account, media, and generation APIs; the private worker remains development-only. This is source state only. The production manifest remains authoritative for the live deployment.

This page is the concise public current-status summary. `PROJECT.md` is the compact internal handoff. Detailed enterprise-hardening, workflow, artifact, PR/merge, and closure chronology is historical evidence under `docs/archive/**` and `docs/audits/**`; the pre-compaction status record is preserved at `docs/archive/STATUS_PRE_PUBLIC_SUMMARY_2026-10-13.md`.

Lifecycle/status terminology follows `docs/INDEX.md`. Exact production identity remains canonical in `docs/production/current.json`.

## Production

Canonical record: docs/production/current.json. Vercel confirms renderlab.faresuniform.uk serves source 86ac1da4b3b91bb259900692a976217c0ff62982 from deployment dpl_1276bdeNZvGzrX8Ahm5dr9zuLLgf (https://renderlab-igrgd8lzh-faresmohamed260-6733s-projects.vercel.app). Alias cutover: 2026-11-19T02:56:17.550Z. This release ships Next.js 16.4.5 and the development-only minimatch advisory fix.

Exact-source CI completed at 2026-11-19T02:50:17.000Z: Deployment Readiness 44446978242; protected check runs 135301382789, 135301383072, 135301383373, 135301383403, 135301383116, 135301382776. Public smoke returned HTTP 200 for /api/health, /create, /library, and /settings. Signed-in generation was not exercised.

Previous alias target: dpl_3TTBYVbtC3cKhcffWZ7Uf5A1FvEP at source 8f913a97fcc03cdfba885a14a4d5e6d51ed7ee13. Restoring it would also restore the older vulnerable Next.js version. Prior release evidence remains in docs/production/2026-11-19-create.json and docs/production/2026-10-09.json. Automatic Git-to-production deployment remains disabled.

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
