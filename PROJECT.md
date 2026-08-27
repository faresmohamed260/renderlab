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
**Phase 3 — Creation Experience implementation.**

### Verified current state
- application shell is implemented and `APPROVED`;
- Create is implemented and remains `MIGRATING` until final lifecycle review and remaining hardening are complete;
- Image/Video prompt composition, aspect/duration controls, reference preview/removal/replacement, and responsive composer behavior are implemented;
- reference upload is verified end-to-end against the reused shared R2 + Supabase resources and self-cleans;
- RenderLab reuses Supabase project `AI Studio` (`rashyleshocuvpgcooxy`), shared R2, and the existing worker fleet by explicit product decision;
- RenderLab-owned `generation_sources`, `generation_jobs`, and `media_assets` tables are applied with RLS enabled; legacy `studio_*` tables remain separate;
- `POST /api/generation/jobs` and `GET /api/generation/jobs/[jobId]` are the browser-facing RenderLab generation boundaries;
- RenderLab-native worker submission, primary/standby routing, polling, R2 persistence, media records, and private media-delivery APIs are implemented;
- all four initial native operations are verified end-to-end: Create Image, Edit Image, Create Video, and Animate Image;
- Create loads the persisted RenderLab `media_assets` result after success and renders the real image/video through product media APIs;
- transient Create status-poll failures now retry automatically with bounded backoff; PR #2 passed production build + Playwright validation before merge;
- capability-derived continuation actions are implemented centrally: persisted image results expose **Edit** and **Animate**, and the next generation binds the durable result as a `media-asset` input rather than an R2 key; PR #3 passed production build + Playwright validation before merge;
- a live integration specifically verifying `Create Image → persisted media asset → Edit Image` is currently running as GitHub Actions run `33027460976`; do not mark that durable-media continuation path live-verified until the run succeeds and self-cleans;
- production build/UI validation remains GitHub-based rather than depending on Vercel preview deployments.

### Still open
1. Complete and record live durable-media continuation verification from run `33027460976`.
2. Reintroduce safe poll-time worker reassignment only where there is strong evidence the assigned worker did not/ cannot continue; never duplicate a possibly accepted generation on generic network/5xx failures.
3. Introduce Advanced controls only from verified capability definitions.
4. Perform final desktop/mobile Create review with the real persisted-result/continuation lifecycle visible.
5. Remove the Studio compatibility fallback after native operational hardening is sufficient.

See `docs/ui/UI_MIGRATION.md` for phase status, `docs/ui/DESIGN_WORKFLOW.md` for visual workflow, `docs/architecture/FRONTEND_ARCHITECTURE.md` for frontend architecture, and `docs/architecture/INFRASTRUCTURE.md` for shared-resource and generation ownership rules.

## Source of Truth
The `renderlab` repository is the primary source of truth. ChatGPT Project context is secondary continuity context. Current chat sessions are temporary working context.
