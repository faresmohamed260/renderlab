# Project

RenderLab is an AI image/video creation platform using cloud-hosted ComfyUI workflows as the generation backend.

## Product Direction
RenderLab is a fresh application, not a direct migration or visual clone of the previous Studio implementation in `saga`.

Saga is reference material for proven behavior, backend integration, workflow capability, persistence, job lifecycle and lessons learned. Its UI, navigation, component hierarchy, routing, deployed runtime and legacy tables are not the RenderLab specification.

## Product UX Principle
**Simple by default, powerful when needed.**

Users interact with understandable creative goals rather than ComfyUI graphs, worker routing or storage implementation. Advanced/model-specific controls are progressively disclosed only when useful.

## Stack
### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui/Radix plus the approved maintained component ecosystem
- Server Components by default; Client Components for interactive feature behavior

### Infrastructure
- Vercel deployment target
- Cloudflare R2
- Supabase
- existing cloud-hosted ComfyUI/Modal worker fleet

RenderLab deliberately reuses Saga/Studio infrastructure resources while keeping RenderLab schema, storage prefixes, orchestration, APIs and product contracts independently named and owned. See `docs/architecture/INFRASTRUCTURE.md`.

## Product Architecture Direction
Generation is modeled as:

`Workflow → Inputs → Parameters → Generation Job → Outputs → Continuation Actions`

Generation inputs use opaque product identities such as temporary-source IDs and durable media-asset IDs. R2 storage keys, provider IDs and worker routing remain server-side implementation details.

## Product Areas
Primary:
- **Create** `/`
- **Library** `/library`

Contextual/utility:
- **Media Viewer** `/library/[assetId]`
- **Activity** `/activity`
- **Settings** `/settings`

Image, Video, Edit, Animate, Models and Workflows are not separate top-level destinations by default.

## Current Priority
**Phase 4 — Media & Continuation.**

### Approved product state
- Application shell: `APPROVED`.
- Create: `APPROVED`; configured complete browser lifecycle approval run `33031817744`.
- Library v0.1: `APPROVED`; credential-free run `33034606323`, configured R2/Supabase lifecycle run `33034606396`.
- Media Viewer v0.1: `APPROVED`; generated and uploaded continuation behavior is live verified.
- Persistent Library upload extension: `APPROVED`, merged through PR #9 as `d306f2abd1831538c51692545d72db1e5e9e0814`.
- Library search v0.1: `APPROVED`, merged through PR #10 as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`; post-merge main shell run `33070215358` passed.
- Durable Media Viewer Download v0.1: functionally and visually `APPROVED FOR MERGE` in PR #11, pending only final documentation-head CI.
- Create supports Create Image, Edit Image, Create Video and Animate Image.
- Durable generated and uploaded media use RenderLab `media_assets`, product media APIs and opaque `media-asset` identity.
- Viewer/Create continuation is capability-derived and server-validates durable asset identity/action compatibility.

Do not redesign these approved surfaces merely because new media capabilities are added.

## Persistent Media Upload Contract
UI-022 defines the approved durable upload model.

- Durable user uploads are ordinary `media_assets` with `origin = uploaded`.
- Pending direct-to-R2 transfer state belongs to server-side `media_upload_sessions`.
- After verification, uploads participate in Library, Media Viewer and Create through ordinary opaque `media-asset` identity.
- `generation_sources` remains temporary generation/reference state; legacy Saga `studio_uploads` is not reused.
- Migration `supabase/migrations/0003_persistent_media_uploads.sql` is applied as `20260827031630 renderlab_persistent_media_uploads`.
- Browser upload is ticket → signed R2 PUT → completion → server HEAD verification → durable asset promotion.
- PNG/JPEG/WebP up to 25 MB are supported.
- Unicode filenames are preserved after control/path cleanup and length bounding.
- Concurrent completion races recover to the unique durable asset winner.

Final pre-merge upload evidence included UI Shell `33067469516`, backend integration `33067469518`, Library lifecycle `33067469527`, responsive screenshot review and cleanup. PR #9 then merged and `main` remained green.

## Library Search v0.1 Contract
UI-023 defines durable-media discovery.

- Search state is the shareable Library URL parameter `q`.
- Search is server-owned against durable `media_assets`, not a client-only current-page filter.
- Queries are whitespace-normalized and capped at 120 characters.
- Matching is case-insensitive literal substring search across `display_name`, `original_filename`, and generated `provenance.prompt`.
- User punctuation is literal text, not PostgREST/regex syntax.
- Search combines with `All / Images / Videos`, keeps newest-first ordering, resets offset when search/kind changes and preserves `q` through pagination/kind links.
- v0.1 adds no relevance ranking, model/date filters, command palette, collection schema or search service/index.

Implementation-head evidence passed UI Shell `33069004219`, upload backend `33069004207`, Library lifecycle `33069004227` and configured search `33069004204`. The configured lifecycle verified prompt, Unicode filename, literal punctuation, kind+search, responsive result/no-match states and cleanup. The documentation-finalized head then passed UI Shell `33070046222`, Library Search `33070046205`, Library Lifecycle `33070046336` and Persistent Media Upload `33070046186`. PR #10 merged as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`; post-merge main run `33070215358` passed.

## Durable Media Download v0.1 Contract
UI-024 defines Download as a contextual product-media action.

### Product behavior
- Media Viewer exposes one secondary `Download` action for durable generated/uploaded media.
- The action uses `/api/media/assets/[assetId]/download`; storage keys and raw signed URLs are not durable product identity.
- The server reloads the durable asset and redirects to a short-lived signed R2 GET with attachment `Content-Disposition`.
- RenderLab does not proxy media bytes through the application server.
- Uploaded files preserve a sanitized Unicode basename and receive the canonical extension from verified MIME.
- Generated files use deterministic `renderlab-<kind>-<id-prefix>.<ext>` filenames; prompts/storage keys are not used as filenames.
- v0.1 does not add Library-card Download, batch actions, rename/delete, favorites/collections or a new client/store framework.

### Verified approval evidence
Implementation head `6d528c47445b26b5464fa529b9e489e6a7ce87ff` passed:
- UI Shell Validation `33070792349`;
- Library Search Visual `33070792317`;
- Persistent Media Upload Integration `33070792362`;
- Library Lifecycle Visual `33070792329`;
- Media Download Visual `33070792343`.

Configured Download verification used two self-cleaning real R2-backed durable assets and Chromium. It proved:
- uploaded Unicode download filename `RenderLab-Download-画像.png`;
- generated fallback filename `renderlab-image-<id-prefix>.png`;
- downloaded bytes exactly matched the durable 68-byte R2 fixture for both assets;
- R2 accepted the signed `ResponseContentDisposition` override;
- Download uses the product media route;
- desktop/mobile Viewer placement remains visually secondary to Continue;
- cleanup succeeded.

Three Viewer screenshots from `33070792343` were visually inspected. Direct Supabase verification found `0` Download fixtures, `0` upload sessions and `0` uploaded test assets.

**PR #11 is functionally and visually approved. Merge only after the documentation-finalized head is green and GitHub still reports it mergeable.**

## R2 Browser CORS State
The R2 access-key token represented by `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` has bucket-admin capability. The managed browser-upload rule currently allows direct browser `PUT` from:
- `http://127.0.0.1:3000`
- `http://localhost:3000`
- `https://renderlab-faresmohamed260-6733s-projects.vercel.app`
- `https://renderlab-git-main-faresmohamed260-6733s-projects.vercel.app`

Download is different from browser PUT: Media Viewer navigates to a RenderLab product route, which redirects to a short-lived signed R2 GET carrying attachment disposition. No new browser-upload CORS origin is required for this top-level download navigation.

If a future custom domain or different user-facing production origin is adopted, add that exact origin to the managed R2 CORS rule before serving direct browser uploads there. Do not use broad wildcard CORS or replace direct-to-R2 transfers with an application-server proxy merely for convenience.

## Still Open in Phase 4
Completed search/upload/download do **not** approve broader organization or destructive behavior. Still open:
- broader history controls where a real product need is defined;
- favorites/collections or another approved organization model;
- rename/delete/batch management.

The next slice must define a RenderLab-owned contract before implementation. Do not infer Saga organization/destructive-action schemas automatically.

## Infrastructure Cleanup Still Open
- Remove the transitional Studio compatibility adapter once no migration/debugging requirement depends on it.
- Keep capability definitions and native workflow defaults aligned as backend capability grows; do not expose controls merely because a worker accepts them.
- If the eventual public RenderLab origin differs from currently configured stable Vercel domains, add the exact origin to R2 CORS before direct browser upload use.

## Source of Truth
The `renderlab` repository is authoritative. ChatGPT Project context is secondary continuity context and current conversations are temporary working context.

See:
- `AGENTS.md`
- `docs/ui/UI_MIGRATION.md`
- `docs/ui/UI_DECISIONS.md`
- `docs/ui/SCREEN_REGISTRY.md`
- `docs/architecture/FRONTEND_ARCHITECTURE.md`
- `docs/architecture/INFRASTRUCTURE.md`
