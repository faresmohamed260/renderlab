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
- Shared migrations `20261005113026 renderlab_upload_admission`, `20261005113423 renderlab_upload_admission_account_lifecycle`, `20261005150908 renderlab_upload_admission_concurrency_fix`, and `20261005150930 renderlab_upload_admission_account_finalizer_fix` are applied to the approved Supabase project. The server-owned reservation table is RLS-enabled/browser-revoked; the corrective forward migrations close the staging/bind accounting race and restore profile/preferences cleanup in the latest account-deletion finalizer.
- PR #336 merged as `fd146a0e411519992f6570bcc6764c2b44e24222` after all 40 exact-head PR workflows reached success. Merged-main Engineering Quality, CodeQL, Upload Admission, Account Data Lifecycle, Account Profile Credential and the broader affected matrix passed on that exact merge SHA. Provider-backed Video Generation Integration run `37336469427` hit one transient status-poll 503 on attempt 1 after two successful real generations; unchanged attempt 2 passed on the same merge SHA, bringing all 19 affected push workflows to accepted success.
- The authoritative post-ENT-004 enterprise reassessment is **8.3/10**, up from 8.2 after ENT-003. The remaining enterprise ceiling is concentrated in durable observability, operations/DR, developer portability, conventional coverage visibility, workflow/module maintainability, and explicit server-only boundaries.
- ENT-004 application behavior is not production-deployed. Production remains the separately recorded exact release; repository merge and shared backward-compatible migrations do not authorize or imply a Vercel rollout.

ENT-005 durable observability and operations hardening is **COMPLETE / VERIFIED / MERGED / NOT DEPLOYED**:

- Shared migrations `20261005181527 renderlab_operational_observability` and forward hardening `20261005202352 renderlab_operational_observability_privilege_hardening` add privacy-bounded 30-day diagnostic retention plus deduplicated operational-alert state. Both tables are RLS-enabled/browser-revoked. Live effective-privilege audit after `0028` found Supabase default grants broader than intended, so `0029` narrows `service_role` to diagnostic `SELECT, INSERT`, diagnostic-sequence `USAGE`, and alert `SELECT`; prune/alert mutation and exact `test.<namespace>.` cleanup are service-role-only `SECURITY DEFINER` RPCs. Live role inspection and run-owned insert → alert → cleanup smoke passed with zero residue.
- The merged implementation preserves immediate structured logging and schedules durable persistence as best-effort Next.js `after()` work. Product correctness does not depend on diagnostic storage or Resend notification success.
- Initial alert families are repeated generation/provider degradation, maintenance failure, and third-retry account deletion stuck. Ordinary input/admission/rate-limit rejection does not alert. Notification fanout reuses active Admin emails and existing Resend infrastructure with sanitized content only.
- Existing `/admin` Health remains the only operator UI and the UI-079 three-row hierarchy is unchanged. ENT-005 adds bounded retained-diagnostic filters and compact operational-alert state inside Health; diagnostic `job_id` remains server-only.
- `docs/operations/INCIDENT_RESPONSE_AND_RECOVERY.md` records current incident handling, exact-SHA rollback discipline, credential-compromise steps, shared-fixture safety and truthful recovery objectives. Supabase/R2 destructive-loss RPO/RTO remain **not established** because no verified recoverable database backup/PITR or R2 replica/version/backup path exists.
- PR #339 exact head `9a52c51339cfbe33b39f2f668e0132e527bd235e` passed all 20 attached PR workflows, and Account/Admin artifact `11371566032` was human-reviewed clean across desktop, 390px and reduced motion. The implementation squash-merged as `895910e0bb1f683202113592f0c03429b87bdde5`; all 14 affected merged-main push workflows reached accepted success, including unchanged retries after one shared provider-availability window. Final run-owned observability/Auth cleanup is zero-residue. The authoritative post-ENT-005 enterprise score is **8.5/10**.
- ENT-005 does not authorize a production Vercel deployment, paid-plan change, new scheduler, database-backup credential/path, R2 replication resource, telemetry vendor, provider-routing change, or broad refactor.

## Known boundaries

- The workspace is not publicly self-service; access requires authorization.
- Provider-backed generation depends on configured production worker/provider availability.
- Some workflows and model routes remain capability-gated until their ownership and production readiness are verified.
- There is no supported public API or community plugin contract at this time.
- The repository is source-visible for evaluation but is not an open-source community project.
- Enterprise-hardening follow-ons remain for explicit server-only module boundaries, cross-platform dev/test parity, conventional coverage measurement, CI workflow consolidation, large-module decomposition, and an actual verified Supabase/R2 backup-and-restore capability. The ENT-005 runbook does not establish destructive-loss RPO/RTO by itself.

## Current direction

Current work focuses on expanding creative workflows, improving continuation between media operations, strengthening organization/project workflows, and preserving production reliability as provider capability grows.

For detailed implementation history, current phase notes, and operational handoff information, see [`PROJECT.md`](../PROJECT.md).
