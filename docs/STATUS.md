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

## Known boundaries

- The workspace is not publicly self-service; access requires authorization.
- Provider-backed generation depends on configured production worker/provider availability.
- Some workflows and model routes remain capability-gated until their ownership and production readiness are verified.
- There is no supported public API or community plugin contract at this time.
- The repository is source-visible for evaluation but is not an open-source community project.

## Current direction

Current work focuses on expanding creative workflows, improving continuation between media operations, strengthening organization/project workflows, and preserving production reliability as provider capability grows.

For detailed implementation history, current phase notes, and operational handoff information, see [`PROJECT.md`](../PROJECT.md).
