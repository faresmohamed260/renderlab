# RenderLab Product & UI Foundation

## Objective
Build RenderLab as a fresh, extensible product using Saga only as behavioral/backend reference. Preserve proven capabilities where useful; re-evaluate UI, architecture and product structure deliberately.

## Core Principles
- Saga is reference material, not the RenderLab specification.
- Simple by default, powerful when needed.
- Expose user goals, not ComfyUI graph/workflow complexity.
- Reuse approved RenderLab components and maintained interaction mechanics before inventing generic primitives.
- Validate rendered UI, not only compilation.
- Keep repository documentation synchronized with verified implementation.

## Phase 0 — Product & Capability Baseline
- [x] Audit Saga behavior/backend contracts and UX problems.
- [x] Define RenderLab capability model, progressive-disclosure boundaries and information architecture.
- [x] Establish frontend/infrastructure architecture and durable UI decisions.

## Phase 1 — Design & Frontend Foundation
- [x] Select/document Next.js App Router + React + TypeScript + Tailwind architecture.
- [x] Establish design tokens, component sourcing policy and repository-backed design workflow.
- [x] Establish application-shell direction and replace Figma as an ongoing dependency with Penpot/open SVG handoff.

## Phase 2 — Application Shell
- [x] Scaffold the fresh application.
- [x] Implement responsive shell/navigation and route-content boundary.
- [x] Establish GitHub production-build + Playwright validation.
- [x] Verify primary/utility/contextual routes.

**Application shell status: `APPROVED`.**

## Phase 3 — Creation Experience
- [x] Implement task-oriented Create workspace with Image/Video output intent.
- [x] Implement reference-driven Edit/Animate resolution.
- [x] Implement signed temporary-reference upload and opaque source identity.
- [x] Implement RenderLab-native `generation_jobs` orchestration and durable `media_assets` persistence.
- [x] Verify Create Image, Edit Image, Create Video and Animate Image end-to-end.
- [x] Implement durable `media-asset` continuation and capability-derived Edit/Animate.
- [x] Implement conservative poll-time reassignment and bounded client polling recovery.
- [x] Implement compact Advanced disclosure from verified capability definitions.
- [x] Complete configured browser lifecycle review in run `33031817744` with desktop/mobile screenshots and fixture cleanup.
- [ ] Remove the transitional Studio compatibility adapter after migration/debugging dependence is gone.

**Create status: `APPROVED`.** Phase 3 product/UI work is complete.

## Phase 4 — Media & Continuation
**Current phase.** Library and Media Viewer use RenderLab-owned durable media plus the shared continuation capability model.

### Approved v0.1 surfaces
- [x] Library v0.1: newest-first unified durable-media grid, All/Images/Videos filtering, pagination, truthful empty/unavailable states and deep links.
- [x] Media Viewer v0.1: deep-linked responsive media inspection with basic metadata and capability-derived continuation.
- [x] Viewer → Create durable-media continuation is server-validated before Create initializes.
- [x] Credential-free production/UI validation run `33034606323` passed.
- [x] Configured R2 + Supabase Library → Viewer → Create lifecycle run `33034606396` passed with desktop/mobile rendering, media geometry verification and fixture cleanup.

**Library v0.1 status: `APPROVED`.**  
**Media Viewer v0.1 status: `APPROVED`.**

### Persistent upload contract — PR #9
UI-022 is accepted: durable user uploads become ordinary `media_assets`; pending direct transfer state is isolated in server-owned `media_upload_sessions`.

- [x] Decide durable identity: uploaded and generated media share opaque `media-asset` identity.
- [x] Keep temporary `generation_sources` separate from durable Library media.
- [x] Do not reuse Saga `studio_uploads`.
- [x] Add `0003_persistent_media_uploads.sql`.
- [x] Apply migration to shared Supabase as `20260827031630 renderlab_persistent_media_uploads`.
- [x] Verify `media_assets.origin`, `original_filename`, `display_name`, `size_bytes` and `media_upload_sessions`; keep RLS enabled.
- [x] Implement typed upload ticket/completion APIs.
- [x] Implement short-lived signed direct-R2 PUT and server HEAD verification of exact MIME + byte size.
- [x] Support PNG/JPEG/WebP up to 25 MB.
- [x] Preserve human-readable Unicode/non-ASCII original filenames while removing controls/path semantics and bounding length.
- [x] Recover cleanly from concurrent completion races against unique `media_assets.storage_key`.
- [x] Keep uploaded/generated media in one public media contract.
- [x] Integrate one compact native-file-picker Upload action into the existing approved Library; no Uploads tab or generic modal framework.
- [x] Prefer uploaded display names on Library cards.
- [x] Present uploaded media truthfully in Media Viewer.
- [x] Expose capability-derived Edit/Animate for uploaded images.
- [x] Backend configured integration run `33037773016` passed concurrent completion, sequential idempotency, media-list/content visibility, Unicode filename preservation and cleanup.
- [x] Production build + credential-free UI/API run `33037773014` passed on the hardened code head.
- [ ] Real browser Upload → Library → Viewer → Create continuation passes against shared infrastructure.
- [ ] Desktop/mobile upload-extension screenshots are captured and visually inspected.
- [ ] Final upload fixture cleanup is re-confirmed after a successful browser run.
- [ ] PR #9 source-of-truth approval docs are finalized with the successful browser run ID.
- [ ] PR #9 is green on its current head, merged, and `main` is verified.

### Current blocker
Configured browser run `33037773015` used the actual Library Upload control and native file chooser. Ticket creation succeeded, but Chromium could not complete the signed R2 PUT, so the completion endpoint was never reached. The verifier timed out and self-cleaned the upload-session fixture; no screenshots were produced.

The shared RenderLab R2 object credentials return `403 AccessDenied` for bucket CORS management and `CLOUDFLARE_API_TOKEN` is not configured in GitHub Actions. Browser presigned PUT therefore remains blocked until the shared R2 bucket has an appropriate CORS rule for the RenderLab browser origin(s). `scripts/ensure-r2-browser-cors.mjs` can idempotently reconcile that rule when an appropriately scoped admin credential is available; otherwise the workflow skips management and the real browser test remains the authority.

**Do not merge PR #9 while this browser gate is failing.** Do not bypass browser security, proxy the upload through RenderLab merely for CI, or substitute the Node integration for browser proof.

### Still intentionally open after this slice
- [ ] Search and broader history controls.
- [ ] Favorites/collections or another approved organization model.
- [ ] Rename/delete/download/batch management.

These are not implied by persistent upload support and must be designed against explicit RenderLab-owned contracts before implementation.

## Phase 5 — Operational & Secondary Experiences
- [ ] Activity/jobs surface backed by RenderLab `generation_jobs`.
- [ ] Models/workflows only if dedicated user-facing surfaces are justified.
- [ ] Settings backed by real requirements.
- [ ] Additional capability-specific experiences approved during product design.

## Feature/Surface Procedure
1. Establish the user goal and required behavior.
2. Inspect applicable RenderLab decisions/components and architecture.
3. Search approved component sources before implementing generic interaction mechanics.
4. Inspect Saga only when useful as behavioral/backend reference.
5. Inspect the actual backend/capability contract.
6. Decide default vs contextual vs advanced complexity.
7. Use Penpot/open SVG artifacts when visual exploration reduces implementation churn.
8. Implement the smallest coherent experience.
9. Build and visually verify through GitHub.
10. Check responsive/accessibility behavior.
11. Update authoritative documentation from verified reality.

## Current Work
**Current phase:** Phase 4 — Media & Continuation.  
**Current slice:** Persistent uploaded media, PR #9.  
**Verified:** durable upload architecture, migration, backend integration and credential-free UI/build checks.  
**Blocked:** real Chromium direct-R2 upload because shared bucket CORS cannot currently be managed with available credentials.  
**Next required task:** establish the shared R2 browser CORS prerequisite, rerun the actual browser lifecycle, inspect screenshots, confirm cleanup, finish approval docs, then merge only if current-head checks are green.

## Session Handoff Rule
Before ending meaningful work, keep this tracker aligned with verified repository state. Do not mark an item complete because it was planned, compiled or partially exercised.
