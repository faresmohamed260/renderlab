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
- [x] Establish application-shell direction and Penpot/open-SVG design handoff.

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
- [x] Complete configured browser lifecycle review in `33031817744` with responsive screenshots and cleanup.
- [ ] Remove the transitional Studio compatibility adapter after migration/debugging dependence is gone.

**Create status: `APPROVED`.**

## Phase 4 — Media & Continuation
**Current phase.** Library and Media Viewer use RenderLab-owned durable media plus the shared continuation capability model.

### Base Library + Viewer
- [x] Library v0.1: newest-first unified durable-media grid, All/Images/Videos filtering, pagination, truthful states and deep links.
- [x] Media Viewer v0.1: responsive durable-media inspection, metadata and capability-derived continuation.
- [x] Viewer → Create durable-media continuation is server-validated.
- [x] Credential-free run `33034606323` passed.
- [x] Configured R2/Supabase lifecycle `33034606396` passed with responsive render review and cleanup.

**Library v0.1 status: `APPROVED`.**  
**Media Viewer v0.1 status: `APPROVED`.**

### Persistent uploads — merged PR #9
UI-022: durable user uploads become ordinary `media_assets`; pending direct transfer belongs to `media_upload_sessions`.

- [x] Uploaded/generated media share opaque `media-asset` identity.
- [x] Keep temporary `generation_sources` separate and do not reuse Saga `studio_uploads`.
- [x] Apply `0003_persistent_media_uploads.sql` as `20260827031630 renderlab_persistent_media_uploads`.
- [x] Implement ticket → signed R2 PUT → completion → HEAD verification → promotion.
- [x] Support PNG/JPEG/WebP ≤25 MB.
- [x] Preserve readable Unicode filenames and recover concurrent completion races.
- [x] Integrate compact native-file-picker Upload without Uploads tab/modal framework.
- [x] Verify uploaded Library → Viewer → Create continuation.
- [x] Final pre-merge runs `33067469516`, `33067469518`, `33067469527` passed.
- [x] PR #9 merged as `d306f2abd1831538c51692545d72db1e5e9e0814`; post-merge main checks passed.

**Persistent upload status: `APPROVED` and merged.**

### Library search v0.1 — merged PR #10
UI-023: search is URL-owned server-side discovery over durable `media_assets`.

- [x] Define shareable `q`, whitespace normalization and 120-character cap.
- [x] Search display name, original uploaded filename and generated prompt as case-insensitive literal substrings.
- [x] Keep punctuation literal and exclude storage/provider/temporary/legacy data.
- [x] Compose with All/Images/Videos and newest-first pagination.
- [x] Add native GET search form, clear action and truthful no-match state.
- [x] Defer relevance ranking/index/search service until real scale justifies it.
- [x] Implementation-head runs `33069004219`, `33069004207`, `33069004227`, `33069004204` passed.
- [x] Four result/no-match desktop/mobile screenshots reviewed; cleanup verified.
- [x] Documentation-finalized runs `33070046222`, `33070046205`, `33070046336`, `33070046186` passed.
- [x] PR #10 merged as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`.
- [x] Post-merge main shell `33070215358` passed.

**Library search v0.1 status: `APPROVED` and merged.**

### Durable media Download v0.1 — merged PR #11
UI-024: Download is a contextual Media Viewer product action over opaque durable media identity.

- [x] Add Viewer-only secondary Download action.
- [x] Add `/api/media/assets/[assetId]/download`; reload durable asset server-side.
- [x] Redirect to short-lived signed R2 GET with attachment `Content-Disposition`; do not proxy bytes through RenderLab.
- [x] Keep raw R2 key/signed URL out of durable product identity.
- [x] Uploaded filename preserves sanitized Unicode basename and canonical extension from MIME.
- [x] Generated filename uses deterministic `renderlab-<kind>-<id-prefix>.<ext>` fallback; no prompt/storage-key filename.
- [x] Dedicated configured Chromium verifier uses real self-cleaning R2-backed uploaded/generated assets.
- [x] Verify uploaded filename `RenderLab-Download-画像.png` and generated deterministic fallback.
- [x] Verify both downloaded files are byte-identical to the durable 68-byte R2 fixtures.
- [x] Verify Cloudflare R2 honors signed `ResponseContentDisposition`.
- [x] Implementation-head UI Shell `33070792349`, Search `33070792317`, Upload Integration `33070792362`, Library Lifecycle `33070792329`, and Media Download Visual `33070792343` passed.
- [x] Three Viewer desktop/mobile screenshots visually inspected; Download remains secondary to Continue.
- [x] Direct cleanup verification found `0` Download fixtures, `0` upload sessions and `0` uploaded test assets.
- [x] Documentation-finalized runs `33071571971`, `33071572092`, `33071571998`, `33071571944`, `33071571912` passed.
- [x] PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`; post-merge main shell/reference-upload runs `33071764713` / `33071764748` passed.

**Durable Media Download v0.1 status: `APPROVED` and merged.**

### Durable media Rename v0.1 — PR #12
UI-025: Rename changes durable human-facing display identity only.

- [x] Add one Viewer-only `Rename` action beside Download.
- [x] Add `PATCH /api/media/assets/[assetId]` against opaque durable media identity.
- [x] Update only `media_assets.display_name`; preserve original filename, MIME, R2 storage key and generated provenance/prompt.
- [x] Remove controls, collapse whitespace, require a non-empty name and cap at 240 characters.
- [x] Keep uploaded/generated Download naming unchanged after Rename.
- [x] Keep Library search immediately discoverable through existing `display_name` search.
- [x] Keep the edit interaction feature-owned and inline; no modal/global management framework.
- [x] Refine Viewer composition so Rename and Download remain side-by-side while the editor expands beneath them.
- [x] Configured Media Rename Visual `33074480356` passed with real R2/Supabase fixtures and Chromium.
- [x] Refined-head UI Shell `33074480462`, Search `33074480419`, Upload Integration `33074480288`, Download `33074480319`, and Rename `33074480356` passed.
- [x] Library Lifecycle `33074480489` passed on rerun after an unrelated stale shared test fixture was identified and removed.
- [x] Four refined desktop/mobile edit/renamed screenshots from `33074480356` were visually inspected.
- [x] Direct cleanup verification found `0` Rename fixtures, `0` Download fixtures, `0` lifecycle-named assets and `0` upload sessions.
- [x] Remove both unrelated stale lifecycle database/R2 fixtures exposed during PR validation; cleanup runs `33075125636` and `33076888858` deleted the exact orphaned objects, with the second run HEAD-verifying absence.
- [x] Serialize the shared configured Library lifecycle workflow with `concurrency: renderlab-library-lifecycle-shared` to avoid overlapping mutable fixture windows.
- [x] Harden `verify-library-lifecycle.mjs` to select the exact durable asset ID returned by its own upload completion while separately asserting the expected display name; fixture-name uniqueness is not assumed.
- [x] Source-of-truth docs record UI-025 and verified implementation state.
- [ ] Merge PR #12 after documentation-finalized exact-head checks are green and GitHub remains mergeable.

**Durable Media Rename v0.1 status: `APPROVED FOR MERGE` pending final documentation-head CI.**

### R2 browser-origin boundary
Direct browser PUT CORS remains exact-origin restricted to the approved localhost CI origins and current stable RenderLab Vercel origins. If a future public origin changes, add it explicitly before direct browser upload use. Download uses product-route → signed-R2 top-level GET navigation and does not add a new upload-CORS requirement. Rename mutates Supabase metadata only and does not rename/move R2 objects or add a new CORS requirement.

### Still intentionally open after Rename
- [ ] Broader history controls where a real product need is defined.
- [ ] Favorites/collections or another approved organization model.
- [ ] Delete and batch management.

These require explicit RenderLab-owned contracts. Do not infer Saga organization/destructive-action schemas automatically.

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
**Current slice:** Durable Media Rename v0.1, PR #12.  
**Verified:** Viewer-only inline Rename, durable `display_name` mutation, input normalization/validation, Search discovery, Download/original/provenance/storage preservation, responsive Viewer review, shared-resource cleanup, exact-ID lifecycle targeting and regression coverage.  
**Merge gate:** documentation-finalized exact-head CI + mergeability only.  
**Next product slice after merge:** select one remaining history/organization/destructive-management need only after its RenderLab-owned contract is explicit.

## Session Handoff Rule
Before ending meaningful work, keep this tracker aligned with verified repository state. Do not mark an item complete because it was planned, compiled or partially exercised.
