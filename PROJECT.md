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
- Create is implemented and remains `MIGRATING` until continuation UX and final responsive lifecycle review are complete;
- Image/Video prompt composition, aspect/duration controls, reference preview/removal/replacement, and responsive composer behavior are implemented;
- reference upload is verified end-to-end against the reused shared R2 + Supabase resources and self-cleans;
- RenderLab reuses Supabase project `AI Studio` (`rashyleshocuvpgcooxy`), the shared R2 resource, and the existing worker fleet by explicit product decision;
- RenderLab-owned `generation_sources`, `generation_jobs`, and `media_assets` tables are applied with RLS enabled; legacy `studio_*` tables remain separate;
- `POST /api/generation/jobs` and `GET /api/generation/jobs/[jobId]` are the browser-facing RenderLab generation boundaries;
- RenderLab-native worker submission, primary/standby routing, polling, R2 persistence, media records, and private media-delivery APIs are implemented;
- **native Create Image is verified end-to-end**, including persisted `media_assets` + R2 output and self-cleaning integration;
- **native reference-driven Edit Image is verified end-to-end** in GitHub Actions run `33021843503` (commit `f374d711f99b2a68c0e7ea43cbce42052380b0cb`);
- **native Create Video and reference-driven Animate Image are both verified end-to-end** in GitHub Actions run `33021977765` (commit `638e312fdbbf5aa126faa9d2a91dbca68b026d48`); the workflow's `Verify Create Video and Animate Image` step completed successfully and the integration self-cleans;
- Create now loads the persisted RenderLab `media_assets` result after a successful job and renders the real image/video through the product media API boundary;
- persisted-result code passed production build + Playwright shell validation in PR #1 before merge; final real-result responsive visual review is still required before Create approval;
- production build/UI validation remains GitHub-based rather than depending on Vercel preview deployments.

### Still open
1. Add capability-derived continuation actions to the persisted Create result.
2. Make transient Create polling/network failures retry with bounded backoff (implementation is currently under validation; do not treat complete until merged and green).
3. Reintroduce proven safe poll-time reassignment only where there is strong evidence no worker accepted the job; do not risk duplicate generations.
4. Introduce Advanced controls only from verified capability definitions.
5. Perform final desktop/mobile Create review with the real persisted-result lifecycle visible.
6. Remove the Studio compatibility fallback after native operation coverage is sufficient.

See `docs/ui/UI_MIGRATION.md` for phase status, `docs/ui/DESIGN_WORKFLOW.md` for visual workflow, `docs/architecture/FRONTEND_ARCHITECTURE.md` for frontend architecture, and `docs/architecture/INFRASTRUCTURE.md` for shared-resource and generation ownership rules.

## Source of Truth
The `renderlab` repository is the primary source of truth. ChatGPT Project context is secondary continuity context. Current chat sessions are temporary working context.
