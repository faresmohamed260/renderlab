# Project

RenderLab is an AI image/video creation platform using cloud-hosted ComfyUI workflows as the generation backend.

## Product Direction
RenderLab is a fresh application, not a direct migration or visual clone of the previous Studio implementation in `saga`.

The previous Studio application is a **reference implementation**. Use it to understand proven behavior, backend integration, generation workflows, persistence, job lifecycle, media actions, and lessons learned. Do not treat its visual design, navigation, component hierarchy, routing, frontend architecture, deployed runtime, or legacy application tables as the RenderLab specification.

**Saga is a reference implementation, not the RenderLab specification.**

RenderLab should be designed for the broader capability of ComfyUI rather than only the workflows that happened to be production-ready in Saga. The architecture should allow new workflows, models, inputs, parameters, outputs, continuation actions, and post-processing capabilities to be added without repeatedly redesigning the application.

At the same time, backend power must not translate into frontend complexity. The default product experience should remain intuitive for an average user.

## Product UX Principle
**Simple by default, powerful when needed.**

Users should interact with goals and understandable creative actions rather than ComfyUI implementation details. Advanced and model-specific controls should be progressively disclosed when useful.

ComfyUI is the generation engine, not the product interface.

## Stack
### Frontend
- Next.js with the App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui/Radix plus the approved modern component ecosystem where appropriate
- Server Components by default; Client Components for interactive creative/workspace behavior

Exact installed package versions are recorded in `docs/architecture/FRONTEND_ARCHITECTURE.md`.

### Infrastructure
- Vercel
- Cloudflare R2
- Supabase
- existing cloud-hosted ComfyUI/Modal worker fleet

RenderLab deliberately reuses the existing Saga/Studio Supabase, R2, and worker resources while keeping RenderLab schema, storage prefixes, orchestration, APIs, and product contracts independently named and owned.

Shared-infrastructure authority: `docs/architecture/INFRASTRUCTURE.md`.

### Generation
- RenderLab server-owned generation orchestration
- cloud-hosted ComfyUI worker ecosystems
- persistent RenderLab `generation_jobs`
- durable RenderLab `media_assets`
- primary/standby worker submission routing
- conservative poll-time reassignment only when explicit evidence makes reassignment safe
- capability-driven workflow contracts designed to grow beyond the initial production workflows

The deployed Studio/Vercel runtime is not intended to be a RenderLab production dependency. A transitional compatibility adapter exists only as a fallback/debugging aid while native RenderLab orchestration is completed and verified.

### Visual Design
- **Penpot** is the preferred richer visual design workspace when available.
- Open SVG design handoff artifacts under `design/penpot/` are the repository-backed interoperable fallback/import source.
- The repository remains authoritative for accepted UI/product decisions.
- The previous Figma `RenderLab Design System` file is historical reference only.
- GitHub Actions + Playwright screenshots provide remote implementation validation without relying on Vercel previews.

See `docs/ui/DESIGN_WORKFLOW.md` for the authoritative design workflow.

## Product Architecture Direction
The internal system models generation around:

`Workflow → Inputs → Parameters → Generation Job → Outputs → Continuation Actions`

A workflow may define supported media inputs, models, required and optional parameters, output types, constraints, advanced controls, and valid continuation actions.

This internal flexibility must not become a generic technical form in the default UI. RenderLab translates backend capabilities into task-oriented experiences such as creating an image, creating a video, editing an image, animating a reference, upscaling, or other understandable creative operations.

Generation inputs use opaque product identities such as temporary-source IDs or durable media-asset IDs. R2 storage keys and worker/provider routing remain server-side implementation details.

## Product Areas
The initial approved information architecture is:
- **Create** — default creative workspace
- **Library** — durable generated and uploaded media
- **Activity** — job/execution utility surface
- **Settings** — application/account preferences as required
- **Media Viewer** — contextual asset detail/continuation surface

Image, Video, Edit, Animate, Models, and Workflows are not separate top-level destinations by default.

## Current Priority
**Phase 4 — Media & Continuation.**

### Verified current state
- application shell is implemented and `APPROVED`;
- Create is implemented and `APPROVED` after the complete configured desktop/mobile lifecycle review in GitHub Actions run `33031817744`;
- the configured lifecycle review exercised one real Create Image request through the browser, waited for durable `media_assets` persistence, rendered the persisted image, verified **Edit** and **Animate**, selected **Edit** from the durable result, captured desktop/mobile result and continuation states, and self-cleaned the generated R2/media/job fixture;
- Image/Video prompt composition, aspect/duration controls, reference preview/removal/replacement, responsive composer behavior, persisted-result presentation, continuation actions, and Advanced disclosure are implemented;
- reference upload is verified end-to-end against the reused shared R2 + Supabase resources and self-cleans;
- RenderLab reuses Supabase project `AI Studio` (`rashyleshocuvpgcooxy`), shared R2, and the existing worker fleet by explicit product decision;
- RenderLab-owned `generation_sources`, `generation_jobs`, and `media_assets` tables are applied with RLS enabled; legacy `studio_*` tables remain separate;
- `POST /api/generation/jobs` and `GET /api/generation/jobs/[jobId]` are the browser-facing RenderLab generation boundaries;
- RenderLab-native worker submission, primary/standby routing, polling, R2 persistence, media records, and private media-delivery APIs are implemented;
- all four initial native operations are verified end-to-end: Create Image, Edit Image, Create Video, and Animate Image;
- transient Create status-poll failures retry automatically with bounded backoff;
- capability-derived continuation actions are implemented centrally and durable `media-asset` continuation is live-verified in run `33027460976`;
- conservative poll-time worker reassignment is implemented and post-merge live generation regression run `33027861292` succeeded;
- Create Advanced v0.3 is implemented from verified capabilities using the normalized Radix Collapsible primitive and was reviewed in run `33030364272`;
- production build/UI validation remains GitHub-based rather than depending on Vercel preview deployments;
- `scripts/verify-create-lifecycle.mjs` plus `.github/workflows/create-lifecycle-visual.yml` provide a repeatable configured real-lifecycle visual check when future Create changes justify rerunning it.

### Current Phase 4 work
1. Design and implement Library against RenderLab-owned `media_assets`, preserving Library as a reusable creative-asset workspace rather than generation history only.
2. Implement the contextual Media Viewer on `/library/[assetId]` using the existing media delivery and capability-derived continuation contracts.
3. Add search/filter/history/metadata/media actions only from actual product requirements and verified data contracts.
4. Keep Create continuation logic centralized so Library/Media Viewer reuse the same capability model rather than hard-coding duplicate action rules.

### Infrastructure cleanup still open
- Decide/remove the transitional Studio compatibility fallback once no migration/debugging requirement still needs it.
- Keep capability definitions and native workflow defaults aligned as capability metadata evolves; do not expose new controls merely because a worker accepts them.

See `docs/ui/UI_MIGRATION.md` for phase status, `docs/ui/DESIGN_WORKFLOW.md` for visual workflow, `docs/architecture/FRONTEND_ARCHITECTURE.md` for frontend architecture, and `docs/architecture/INFRASTRUCTURE.md` for shared-resource and generation ownership rules.

## Source of Truth
The `renderlab` repository is the primary source of truth. ChatGPT Project context is secondary continuity context. Current chat sessions are temporary working context.
