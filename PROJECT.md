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
- Media Viewer v0.1: `APPROVED`; run `33034606396` verified Library → Viewer → Create Edit continuation.
- Persistent Library upload extension: `APPROVED` and merged through PR #9 as main commit `d306f2abd1831538c51692545d72db1e5e9e0814`; post-merge main checks passed.
- Library search v0.1: implementation and responsive visual states are `APPROVED FOR MERGE` in PR #10, pending only final documentation-head verification.
- Create supports the four initial native operations: Create Image, Edit Image, Create Video and Animate Image.
- Durable generated and uploaded media use RenderLab `media_assets`, product media APIs and opaque `media-asset` continuation identity.
- Viewer/Create continuation is capability-derived and server-validates durable asset identity and action compatibility before initializing Create.

Do not redesign these approved surfaces merely because new media capabilities are added.

## Persistent Media Upload Contract
UI-022 defines the approved durable upload model.

- Durable user uploads are ordinary `media_assets` with `origin = uploaded`.
- Pending direct-to-R2 transfer state is owned by server-side `media_upload_sessions`.
- After verification, uploads participate in Library, Media Viewer and Create through ordinary opaque `media-asset` identity.
- `generation_sources` remains temporary generation/reference input state.
- Legacy Saga `studio_uploads` is not reused.
- There is no parallel public Uploads identity or Uploads tab.
- Migration `supabase/migrations/0003_persistent_media_uploads.sql` is applied to shared Supabase as `20260827031630 renderlab_persistent_media_uploads`.
- Browser upload is ticket → signed R2 PUT → completion → server HEAD verification → durable asset promotion.
- PNG/JPEG/WebP up to 25 MB are supported.
- Unicode/non-ASCII filenames are preserved after control/path cleanup and length bounding.
- Concurrent completion races recover to the unique `media_assets.storage_key` winner.

Final pre-merge upload evidence included UI Shell `33067469516`, backend integration `33067469518`, Library browser lifecycle `33067469527`, visually inspected desktop/mobile screenshots and direct cleanup verification. PR #9 then merged as `d306f2abd1831538c51692545d72db1e5e9e0814`; `main` remained green.

## Library Search v0.1 Contract
UI-023 defines the durable-media search model.

### Product behavior
- Search state is the shareable Library URL parameter `q`.
- Search is server-owned against durable RenderLab `media_assets`, not a client-only filter over the current page.
- Queries are whitespace-normalized and capped at 120 characters.
- Matching is case-insensitive literal substring search across:
  - `display_name`;
  - `original_filename`;
  - generated prompt at `provenance.prompt`.
- User punctuation is literal search text, not PostgREST/regex syntax.
- Search combines with `All / Images / Videos` and keeps newest-first ordering.
- Changing search or kind resets pagination; pagination preserves active search.
- v0.1 does not add relevance ranking, model/date filters, favorites, collections, batch actions, rename/delete/download or a command-palette experience.

### Implementation boundary
- `src/lib/api/media-assets-contract.ts` owns query normalization/limit.
- `GET /api/media/assets?q=...` exposes the product API contract.
- `src/server/media/media-assets.ts` translates literal search into escaped case-insensitive PostgREST regex filters for display name, original filename and prompt.
- `/library` reads `q` server-side and renders one native GET search form integrated into the existing approved Library composition.
- No database migration, `pg_trgm` extension, parallel search service or new generic UI primitive was introduced. Shared Supabase currently has an empty production media corpus, so indexing is deferred until real scale warrants it behind the same product contract.

### Verified approval evidence
Implementation head `ba7508859d665a753221177eb2b93ecd11c4b2fe` passed:
- UI Shell Validation `33069004219` — production build + credential-free Playwright/API regressions;
- Persistent Media Upload Integration `33069004207` — existing upload backend regression;
- Library Lifecycle Visual `33069004227` — existing real upload → Library → Viewer → Create regression;
- Library Search Visual `33069004204` — configured shared Supabase/R2 verification with self-cleaning real media fixtures.

The search lifecycle verified:
- case-insensitive generated-prompt matching;
- case-insensitive Unicode uploaded-filename matching;
- literal punctuation/wildcard-character matching;
- kind + search conjunction;
- URL-owned search and kind-link preservation;
- desktop/mobile result states;
- truthful desktop/mobile no-match states;
- fixture cleanup.

All four search screenshots from `33069004204` were visually inspected and preserve the approved Library hierarchy/grid language. Direct post-run Supabase verification found `0` search fixtures, `0` upload sessions and `0` uploaded test assets.

**PR #10 is functionally and visually approved. Merge only after the documentation-finalized head is green and GitHub still reports it mergeable.**

## R2 Browser CORS State
The R2 access-key token represented by `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` has bucket-admin capability. The managed `renderlab-browser-uploads` rule currently allows direct browser `PUT` with `Content-Type` from:
- `http://127.0.0.1:3000`
- `http://localhost:3000`
- `https://renderlab-faresmohamed260-6733s-projects.vercel.app`
- `https://renderlab-git-main-faresmohamed260-6733s-projects.vercel.app`

The browser verifier runs directly from the local RenderLab origin; RenderLab does not depend on the deployed Studio runtime. If a future custom domain or different user-facing production origin is adopted, add that exact origin to the managed R2 CORS rule before serving direct browser uploads there. Do not use a broad wildcard or replace the approved direct-to-R2 flow with a server proxy merely for convenience.

## Still Open in Phase 4
Search and persistent uploads do **not** complete broader Library organization/management work:
- broader history controls where a real need is defined;
- favorites/collections or another approved organization model;
- rename/delete/download/batch management.

The next Phase 4 product slice must be selected from these remaining needs only after defining a RenderLab-owned contract. Do not infer Saga organization/destructive-action schemas automatically.

## Infrastructure Cleanup Still Open
- Remove the transitional Studio compatibility adapter once no migration/debugging requirement depends on it.
- Keep capability definitions and native workflow defaults aligned as backend capability grows; do not expose controls merely because a worker accepts them.
- If the eventual public RenderLab origin differs from the currently configured stable Vercel domains, add the exact origin to R2 CORS before deployment.

## Source of Truth
The `renderlab` repository is authoritative. ChatGPT Project context is secondary continuity context and current conversations are temporary working context.

See:
- `AGENTS.md`
- `docs/ui/UI_MIGRATION.md`
- `docs/ui/UI_DECISIONS.md`
- `docs/ui/SCREEN_REGISTRY.md`
- `docs/architecture/FRONTEND_ARCHITECTURE.md`
- `docs/architecture/INFRASTRUCTURE.md`
