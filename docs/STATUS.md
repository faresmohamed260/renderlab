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

- Static analysis and TypeScript checks
- Unit and Playwright/browser validation
- Feature-specific integration and lifecycle workflows
- Server-owned job reconciliation, retry, cancellation, and persistence
- Exact-commit production qualification and cleanup evidence

## Enterprise hardening baseline

ENT-001 strengthens application boundaries without changing RenderLab's product flows or shared infrastructure topology:

- Newly completed PNG/JPEG/WebP uploads are read and decoded server-side before they can become durable Library media or ready generation sources. Actual decoded format must match the signed ticket MIME type, animated/multi-page inputs are rejected, and decoded geometry is bounded to 8,192 px per edge and 33,554,432 pixels.
- Width and height for newly completed uploads are derived from decoded bytes on the server; client-submitted geometry remains compatibility input only and is non-authoritative.
- Generation prompt and negative-prompt inputs are bounded to 8,000 characters at the server request contract before persistence or provider dispatch.
- The Next.js application disables `X-Powered-By` and defines CSP, anti-framing, MIME-sniffing, referrer, and permissions-policy headers.
- ENT-001 changes no Supabase schema/Auth policy, Cloudflare R2 resource configuration, provider/worker routing, secrets, scheduler, or production deployment. Production remains whatever exact source is recorded in the authoritative production blocks.

## Known boundaries

- The workspace is not publicly self-service; access requires authorization.
- Provider-backed generation depends on configured production worker/provider availability.
- Some workflows and model routes remain capability-gated until their ownership and production readiness are verified.
- There is no supported public API or community plugin contract at this time.
- The repository is source-visible for evaluation but is not an open-source community project.
- Enterprise-hardening follow-ons remain for CI/workflow simplification, CodeQL/action pinning, conventional coverage measurement, durable observability, operations/disaster-recovery runbooks, and large-module decomposition.

## Current direction

Current work focuses on expanding creative workflows, improving continuation between media operations, strengthening organization/project workflows, and preserving production reliability as provider capability grows.

For detailed implementation history, current phase notes, and operational handoff information, see [`PROJECT.md`](../PROJECT.md).
