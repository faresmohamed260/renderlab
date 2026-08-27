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
- shadcn/ui Radix Nova + `radix-ui` through the approved maintained component ecosystem
- RenderLab-owned normalized primitive layer under `src/components/ui`
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

Generation inputs and media actions use opaque product identities. R2 storage keys, provider IDs and worker routing remain server-side implementation details.

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
- Create: `APPROVED`; complete configured browser lifecycle run `33031817744`.
- Library v0.1: `APPROVED`; credential-free run `33034606323`, configured lifecycle `33034606396`.
- Persistent Library upload: `APPROVED`, merged through PR #9 as `d306f2abd1831538c51692545d72db1e5e9e0814`.
- Library search v0.1: `APPROVED`, merged through PR #10 as `7ca965b9637fcdd1dd86a04a73c6f97d09fe7a59`.
- Durable Media Download v0.1: `APPROVED`, merged through PR #11 as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef`.
- Durable Media Rename v0.1: `APPROVED`, merged through PR #12 as `d76f0ce30502e2aff2384dcd168f07b2184768a4` after exact-head six-gate CI and clean shared-resource verification.
- Maintained UI primitive foundation / UI-026: `APPROVED`, merged through PR #13 as `5953934d5f67c16304be7493eda27c88e24c02cc`.
- Create supports Create Image, Edit Image, Create Video and Animate Image.
- Durable generated and uploaded media share RenderLab `media_assets`, product APIs and opaque `media-asset` identity.
- Viewer/Create continuation is capability-derived and server-validates durable asset identity/action compatibility.

Do not redesign these approved surfaces merely because new media capabilities are added.

## Maintained UI Primitive Contract
UI-026 makes maintained conventional controls a repository-enforced frontend foundation rule.

- `components.json` configures shadcn `radix-nova`.
- `src/components/ui` owns normalized Alert, Button, Collapsible, Empty, Field, Input, Label, NativeSelect, Spinner, Textarea, Toggle and ToggleGroup primitives.
- Conventional visible controls in `src/features` and `src/components/shell` compose those approved primitives rather than hand-styled raw native controls.
- Native `file` and `hidden` inputs remain allowed as browser/form plumbing.
- Local wrappers own RenderLab tokens, variants, spacing, required semantic elements and product accessibility adaptations; features should not rebuild the same mechanic independently.
- Correct maintained accessibility semantics are authoritative. Create Image/Video is a required Radix single-choice `radiogroup` with checked `radio` items.
- `npm run verify:ui-purity` rejects raw visible button/select/textarea/ordinary-input controls in feature/shell code and runs in UI Shell CI.
- Shared primitive/config/package changes retrigger the dependent Create, Library Search, Library Lifecycle, Download, Rename and Shell regressions.

PR #13 was foundation-only and preserved approved Create/Library/Viewer/shell product behavior. Implementation head `36ee8e8eb80645d1389afa749a36b493e2abbb61` passed UI Shell `33088086901`, Create Lifecycle `33088086892`, Library Search `33088086914`, Library Lifecycle `33088086872`, Media Download `33088086907`, and Media Rename `33088086871`. Final-code UI Shell and Library lifecycle desktop/mobile screenshots were visually inspected with no unintended hierarchy/layout drift. Library lifecycle verified real Upload → Library → Viewer → Edit continuation, correct Radix Image selection, 400×300 media geometry and self-cleanup.

Final exact PR head `89dc69e394bf467227e0131432c301050d718999` passed UI Shell `33089808029`, Create Lifecycle `33089808086`, Library Search `33089807606`, Library Lifecycle `33089807890`, Media Download `33089807786`, and Media Rename `33089807776`. Create Lifecycle attempt 1 was blocked before browser execution by a transient Microsoft Ubuntu apt-repository 403 during Playwright dependency installation; unchanged attempt 2 completed successfully. Direct pre-merge cleanup found `0` upload sessions, no recent RenderLab-named test media assets and no remaining configured Create lifecycle test job. PR #13 merged as `5953934d5f67c16304be7493eda27c88e24c02cc`; post-merge `main` UI Shell `33092354072` and Reference Upload Integration `33092353971` both passed.

## Persistent Media Upload Contract
UI-022 defines the approved durable upload model.

- Durable user uploads are ordinary `media_assets` with `origin = uploaded`.
- Pending direct-to-R2 transfer state belongs to server-side `media_upload_sessions`.
- `generation_sources` remains temporary generation/reference state; legacy Saga `studio_uploads` is not reused.
- Migration `0003_persistent_media_uploads.sql` is applied as `20260827031630 renderlab_persistent_media_uploads`.
- Browser upload is ticket → signed R2 PUT → completion → server HEAD verification → durable asset promotion.
- PNG/JPEG/WebP up to 25 MB are supported.
- Unicode filenames are preserved after control/path cleanup and length bounding.
- Concurrent completion races recover to the unique durable asset winner.

## Library Search v0.1 Contract
UI-023 defines durable-media discovery.

- Search state is shareable URL parameter `q`.
- Search is server-owned against durable `media_assets`, not a client-only current-page filter.
- Queries are whitespace-normalized and capped at 120 characters.
- Matching is case-insensitive literal substring search across `display_name`, `original_filename`, and generated `provenance.prompt`.
- Search composes with All/Images/Videos and newest-first pagination.
- v0.1 adds no relevance ranking, model/date filters, command palette, collection schema or dedicated search service/index.

PR #10 passed implementation and documentation-finalized Search/upload/lifecycle/UI gates before merge. Post-merge main shell `33070215358` passed.

## Durable Media Download v0.1 Contract
UI-024 defines Download as a contextual product-media action.

- Media Viewer exposes one secondary `Download` action for durable generated/uploaded media.
- `/api/media/assets/[assetId]/download` reloads the durable asset and redirects to a short-lived signed R2 GET with attachment `Content-Disposition`.
- RenderLab does not proxy media bytes through the application server and never treats raw R2 identity as product identity.
- Uploaded downloads preserve a sanitized Unicode basename with canonical extension from verified MIME.
- Generated downloads use deterministic `renderlab-<kind>-<id-prefix>.<ext>` names rather than prompts/storage keys.
- v0.1 adds no Library-card Download or batch framework.

PR #11 merged as `ed62700ab0392979bf760f1a7dc49ef434f6a9ef` after implementation and documentation-finalized configured verification; `main` remained green.

## Durable Media Rename v0.1 Contract
UI-025 defines Rename as durable display identity, not file/storage mutation.

### Product behavior
- Media Viewer exposes `Rename` beside Download under secondary **Actions**.
- Rename changes only `media_assets.display_name` through `PATCH /api/media/assets/[assetId]`.
- Names remove control characters, collapse whitespace, must remain non-empty and are capped at 240 characters.
- Original uploaded filename, MIME, R2 storage key, generated provenance/prompt and Download filename semantics remain unchanged.
- Library search immediately discovers the new display name because `display_name` is already part of UI-023.
- The edit UI is feature-owned inline Viewer state; Rename and Download remain side-by-side while the form expands beneath them.
- v0.1 adds no Library-card rename, modal framework, global store, delete, batch actions, favorites/collections or database migration.

### Verified approval evidence
Final exact-head `70cbcc4daeafb9a48c0253df38796811d4cf4f03` passed UI Shell `33077320919`, Library Search `33077320839`, Persistent Media Upload `33077320935`, Media Download `33077320886`, Media Rename `33077321228`, and Library Lifecycle `33077320976`. Direct Supabase cleanup immediately before merge found `0` Rename fixtures, `0` Download fixtures, `0` lifecycle-named assets and `0` upload sessions. PR #12 merged as `d76f0ce30502e2aff2384dcd168f07b2184768a4`.

The configured Library lifecycle is serialized with `concurrency: renderlab-library-lifecycle-shared` and targets the exact durable asset ID returned by its own upload completion while separately asserting the expected human display name. Fixture-name uniqueness is not a correctness assumption.

## R2 Browser CORS State
The admin-capable R2 access-key credentials manage the exact-origin `renderlab-browser-uploads` rule through the S3 API for:
- `http://127.0.0.1:3000`
- `http://localhost:3000`
- `https://renderlab-faresmohamed260-6733s-projects.vercel.app`
- `https://renderlab-git-main-faresmohamed260-6733s-projects.vercel.app`

Download uses product-route → signed-R2 top-level GET navigation. Rename is a server-side Supabase metadata mutation and introduces no R2 object write/move or new CORS requirement.

If a future user-facing production origin changes, add that exact origin before serving direct browser uploads there. Do not use broad wildcard CORS or replace direct-to-R2 transfers with an application-server proxy merely for convenience.

## Still Open in Phase 4
Completed upload/search/download/rename do **not** approve broader organization or destructive behavior. Still open:
- broader history controls where a real product need is defined;
- favorites/collections or another approved organization model;
- delete and batch management.

The next slice must define a RenderLab-owned contract before implementation. Do not infer Saga organization/destructive-action schemas automatically.

## Infrastructure Cleanup Still Open
- Remove the transitional Studio compatibility adapter once no migration/debugging requirement depends on it.
- Keep capability definitions/native workflow defaults aligned as backend capability grows; do not expose controls merely because a worker accepts them.
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
