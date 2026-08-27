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

### Persistent uploads — merged
UI-022 is accepted: durable user uploads become ordinary `media_assets`; pending direct transfer state is isolated in server-owned `media_upload_sessions`.

- [x] Durable uploaded/generated media share opaque `media-asset` identity.
- [x] Temporary `generation_sources` remain separate from durable Library media.
- [x] Saga `studio_uploads` is not reused.
- [x] Migration `0003_persistent_media_uploads.sql` applied as `20260827031630 renderlab_persistent_media_uploads`.
- [x] Typed ticket/completion APIs, signed direct-R2 PUT and server HEAD verification implemented.
- [x] PNG/JPEG/WebP up to 25 MB supported.
- [x] Unicode filename preservation and concurrent completion race recovery verified.
- [x] Compact Upload action integrated without an Uploads tab/modal framework.
- [x] Uploaded Library/Viewer/Create continuation is truthful and capability-derived.
- [x] R2 CORS management verified through the existing admin-capable R2 S3 credentials.
- [x] Final pre-merge runs: UI Shell `33067469516`, backend upload integration `33067469518`, Library browser lifecycle `33067469527`.
- [x] Desktop/mobile screenshots inspected and fixture cleanup confirmed.
- [x] PR #9 merged to `main` as `d306f2abd1831538c51692545d72db1e5e9e0814`.
- [x] Post-merge `main` shell/reference-upload checks passed.

**Persistent Library upload extension status: `APPROVED` and merged.**

### Library search v0.1 — PR #10
UI-023 is accepted: Library search is URL-owned, server-side durable-media discovery.

- [x] Define shareable `q` contract against RenderLab `media_assets`.
- [x] Normalize whitespace and cap queries at 120 characters.
- [x] Search display name, original uploaded filename and generated prompt.
- [x] Keep user punctuation literal rather than exposing PostgREST/regex syntax.
- [x] Combine search with `All / Images / Videos`.
- [x] Preserve newest-first ordering; do not add relevance ranking in v0.1.
- [x] Reset pagination when search/kind changes and preserve `q` across kind/pagination links.
- [x] Add one native GET search form to the existing Library; no command palette or client-only page filter.
- [x] Add truthful no-match state and clear-search path.
- [x] Keep storage/provider/model internals, temporary sources and legacy `studio_*` outside search.
- [x] Do not add a database extension/index prematurely; keep optimization behind the product contract until corpus scale justifies it.
- [x] Credential-free UI/API validation passed in `33069004219`.
- [x] Existing persistent-upload backend regression passed in `33069004207`.
- [x] Existing real upload → Library → Viewer → Create regression passed in `33069004227`.
- [x] Configured Library search lifecycle passed in `33069004204` with real R2-backed media fixtures.
- [x] Prompt, Unicode filename, literal punctuation, kind+search and URL-state behavior verified.
- [x] Four desktop/mobile results/empty screenshots captured and visually inspected.
- [x] Direct cleanup verification found `0` search fixtures, `0` upload sessions and `0` uploaded test assets.
- [x] Source-of-truth docs record UI-023 and verified state.
- [ ] Merge PR #10 after documentation-finalized head checks are green and GitHub remains mergeable.

**Library search v0.1 status: `APPROVED FOR MERGE` pending final documentation-head CI.**

### R2 browser-origin boundary
The R2 access-key token represented by `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` has bucket-admin capability. The managed browser-upload rule currently allows:
- `http://127.0.0.1:3000`
- `http://localhost:3000`
- `https://renderlab-faresmohamed260-6733s-projects.vercel.app`
- `https://renderlab-git-main-faresmohamed260-6733s-projects.vercel.app`

If a future custom/different public RenderLab origin is adopted, add that exact origin before serving direct browser uploads there. Do not use a broad wildcard or proxy uploads merely to avoid correct CORS configuration.

### Still intentionally open after search
- [ ] Broader history controls where a real product need is defined.
- [ ] Favorites/collections or another approved organization model.
- [ ] Rename/delete/download/batch management.

These must be designed against explicit RenderLab-owned contracts. Do not infer Saga organization or destructive-action schemas automatically.

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
**Current slice:** Library search v0.1, PR #10.  
**Verified:** server/API search contract, URL state, responsive search/no-match UI, prompt/name/filename/punctuation semantics, kind composition, existing upload regressions, screenshots and cleanup.  
**Merge gate:** final documentation-head CI + mergeability only.  
**Next product slice:** select one remaining Phase 4 organization/history need only after its RenderLab-owned contract is explicit.

## Session Handoff Rule
Before ending meaningful work, keep this tracker aligned with verified repository state. Do not mark an item complete because it was planned, compiled or partially exercised.
