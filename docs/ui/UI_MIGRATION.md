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
- [x] Keep uploaded display identity truthful when Viewer initializes Create continuation.
- [x] Current-state backend integration run `33066999365` passed production build, signed PUT/promotion, Unicode filename preservation, concurrent completion recovery, sequential idempotency, media-list/content behavior and cleanup.
- [x] Current-state production build + credential-free UI/API run `33066999317` passed.
- [x] Current-state Chromium Upload → Library → Viewer → Create continuation passed against shared infrastructure in run `33066999350`.
- [x] R2 bucket CORS was reconciled in `33066999350` through the S3 API using the existing admin-capable R2 access-key token; both localhost origins and both current stable RenderLab Vercel domains passed preflight.
- [x] Desktop/mobile upload-extension screenshots were captured and visually inspected from run `33066999350`.
- [x] Upload fixture cleanup was confirmed by the workflow; prior direct Supabase verification also found `0` upload sessions and `0` uploaded assets after the configured lifecycle.
- [x] Source-of-truth approval docs record the verified implementation and run IDs.
- [ ] Merge PR #9 and verify `main` after the documentation-finalized head is green and mergeable.

**Persistent Library upload extension status: `APPROVED FOR MERGE` pending final documentation-head CI.**

### Browser verification / production-origin boundary
The previous browser-CORS blocker is resolved. The R2 access-key token represented by `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` now has bucket-admin capability, and `scripts/ensure-r2-browser-cors.mjs` successfully reconciles the managed `renderlab-browser-uploads` rule through the R2 S3 API.

The currently managed origins are:
- `http://127.0.0.1:3000`
- `http://localhost:3000`
- `https://renderlab-faresmohamed260-6733s-projects.vercel.app`
- `https://renderlab-git-main-faresmohamed260-6733s-projects.vercel.app`

Run `33066999350` verified successful preflight for all four origins and then ran the real browser lifecycle directly from `http://127.0.0.1:3000`. The temporary Studio-origin TLS/hosts alias used during diagnosis has been removed; configured upload verification no longer depends on the Studio origin string or deployed Studio runtime.

The connected Vercel project remains `live=false`. If a future custom domain or different user-facing production origin is adopted, add that exact origin to the managed R2 CORS rule before serving direct browser uploads there. Do not use a broad wildcard and do not proxy durable uploads through RenderLab merely to avoid correct CORS configuration.

### Still intentionally open after this slice
- [ ] Search and broader history controls.
- [ ] Favorites/collections or another approved organization model.
- [ ] Rename/delete/download/batch management.

These are not implied by persistent upload support and must be designed against explicit RenderLab-owned contracts before implementation.

**Next recommended Phase 4 product task:** define the RenderLab-owned Library search contract against durable `media_assets`, then design the smallest search UI only after that contract is explicit. Do not infer Saga organization schemas.

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
**Verified:** durable upload architecture/migration, filename/race hardening, backend integration, credential-free regressions, admin-capable R2 CORS reconciliation, actual browser direct-R2 upload, Library/Viewer/Create continuation, desktop/mobile screenshots and cleanup.  
**Merge gate:** final documentation-head CI + mergeability only.  
**Deployment note:** the two current stable RenderLab Vercel origins are already in the managed CORS rule; add any future custom/different public origin explicitly before use.  
**Next Phase 4 product slice after merge:** define the durable Library search contract before implementing search UI.

## Session Handoff Rule
Before ending meaningful work, keep this tracker aligned with verified repository state. Do not mark an item complete because it was planned, compiled or partially exercised.
