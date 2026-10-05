# RenderLab Status

This page is the concise public status summary. `PROJECT.md` remains the detailed internal handoff/history document.

## Production

- Public product: https://renderlab.faresuniform.uk
- Access model: closed beta / invitation only
- Default branch: `main`
- Production releases are qualified against exact commit SHAs rather than a public semantic-release stream.

## Production capabilities

- Image generation
- Reference-backed image editing
- Image animation and video generation
- Activity/job lifecycle tracking
- Durable uploads and generated-media persistence
- Media Viewer continuation actions
- Library search, favorites, collections, rename, download, and deletion
- Authentication, profile/preferences, sessions, MFA, export, and account deletion
- Administrative closed-beta operations

## Engineering controls

- Static analysis, TypeScript checks, and JavaScript/TypeScript CodeQL scanning
- Unit and Playwright/browser validation
- Feature-specific integration and lifecycle workflows
- Deterministic GitHub Actions dependency installation from the checked-in lockfile
- Immutable SHA-pinned external GitHub Actions with Dependabot maintenance
- Server-owned job reconciliation, retry, cancellation, and persistence
- Exact-commit production qualification and cleanup evidence

## Enterprise hardening baseline

ENT-001 strengthens application boundaries without changing RenderLab's product flows or shared infrastructure topology:

- Newly completed PNG/JPEG/WebP uploads are read and decoded server-side before they can become durable Library media or ready generation sources. Actual decoded format must match the signed ticket MIME type, animated/multi-page inputs are rejected, and decoded geometry is bounded to 8,192 px per edge and 33,554,432 pixels.
- Width and height for newly completed uploads are derived from decoded bytes on the server; client-submitted geometry remains compatibility input only and is non-authoritative.
- Generation prompt and negative-prompt inputs are bounded to 8,000 characters at the server request contract before persistence or provider dispatch.
- The Next.js application disables `X-Powered-By` and defines CSP, anti-framing, MIME-sniffing, referrer, and permissions-policy headers.
- ENT-001 changes no Supabase schema/Auth policy, Cloudflare R2 resource configuration, provider/worker routing, secrets, scheduler, or production deployment. Production remains whatever exact source is recorded in the authoritative production blocks.

ENT-002 strengthens repository CI and software-supply-chain controls without changing application runtime behavior:

- Applicable workflows install root dependencies with `npm ci --no-audit --no-fund` from the checked-in lockfile.
- All current external GitHub Action references under `.github/workflows` are pinned to immutable 40-character commit SHAs, with Dependabot's monthly `github-actions` maintenance retained.
- JavaScript/TypeScript CodeQL runs on pull requests and protected-main pushes with least-privilege publication permissions.
- Engineering Quality rejects executable workflow `npm install`, non-immutable external action references, loss of Dependabot GitHub Actions maintenance, and CodeQL language/permission drift.
- PR #330 merged as `99a8db8c8038262114d5b5da535cf2e7dea56ad1`; all 68 exact-head workflow runs passed, followed by merged-main Engineering Quality `37289968963` and CodeQL `37289968955`.
- The authoritative enterprise reassessment is now **8.2/10**, up from 8.1 after ENT-001 and 7.8 at the original audit baseline. ENT-002 was not deployed and required no application/shared-infrastructure mutation.

ENT-003 restores the current framework security baseline without changing application behavior:

- Next.js is pinned to **16.3.8**, the patched September 2026 Active-LTS security release, with no other direct or development dependency version change.
- PR #333 merged as `2546978ab19a00bc6c76f6273d66d995d4fdc2e8` after all 24 attached PR workflows and the dedicated exact-SHA release-candidate matrix passed; merged-main Engineering Quality `37300494262` and CodeQL `37300494398` also passed.
- The enterprise score remains **8.2/10** because ENT-003 restores required dependency-security currency rather than changing architecture or broader enterprise maturity.
- ENT-003 was not deployed. Production remains whatever exact source is recorded in the authoritative production blocks.

ENT-004 hardens request and upload-admission boundaries without changing provider routing or the signed direct-R2 upload model:

- Persistent Library uploads and temporary generation-reference uploads share one server-owned per-account admission budget: at most 8 unresolved/provisional tickets and 30 ticket grants per rolling 60 minutes, serialized by owner in PostgreSQL with 10-minute provisional leases.
- Stable 429 contracts distinguish active-cap and rolling-rate rejection, and failed signing/preparation paths release provisional capacity while retaining recent admission history.
- Browser-facing state-changing API routes use one same-origin policy based on explicit `Sec-Fetch-Site` / `Origin` metadata; metadata-less server, CLI and CI callers remain compatible, and server-secret internal maintenance/reconciliation routes keep explicit exemptions.
- Engineering Quality statically checks mutation-route guard coverage, while a dedicated configured integration workflow exercises concurrency, shared Library/reference accounting, stale leases, rate history, signing failure, origin rejection and cross-account isolation.
- Shared migrations `20261005113026 renderlab_upload_admission` and `20261005113423 renderlab_upload_admission_account_lifecycle` are applied to the approved Supabase project. The new server-owned table is RLS-enabled/browser-revoked and is included in account export schema v4 plus transactional account deletion.
- ENT-004 application behavior is not production-deployed. Exact-head acceptance and enterprise-score reassessment are recorded only after the implementation merge is verified.

## Known boundaries

- The workspace is not publicly self-service; access requires authorization.
- Provider-backed generation depends on configured production worker/provider availability.
- Some workflows and model routes remain capability-gated until their ownership and production readiness are verified.
- There is no supported public API or community plugin contract at this time.
- The repository is source-visible for evaluation but is not an open-source community project.
- Enterprise-hardening follow-ons remain for server-only module boundaries, cross-platform dev/test parity, conventional coverage measurement, durable observability, operations/disaster-recovery runbooks, CI workflow consolidation, and large-module decomposition.

## Current direction

Current work focuses on expanding creative workflows, improving continuation between media operations, strengthening organization/project workflows, and preserving production reliability as provider capability grows.

For detailed implementation history, current phase notes, and operational handoff information, see [`PROJECT.md`](../PROJECT.md).
