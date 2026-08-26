# Project

RenderLab is an AI image/video creation platform using cloud-hosted ComfyUI workflows as the generation backend.

## Product Direction
RenderLab is a fresh application, not a direct migration or visual clone of the previous Studio implementation in `saga`.

The previous Studio application is a **reference implementation**. Use it to understand proven behavior, backend integration, generation workflows, persistence, job lifecycle, media actions, and lessons learned. Do not treat its visual design, navigation, component hierarchy, routing, or frontend architecture as the RenderLab specification.

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
- shadcn/ui where applicable
- Server Components by default; Client Components for interactive creative/workspace behavior

Exact package versions are recorded from the repository after scaffolding rather than hard-coded into planning documentation.

### Infrastructure
- Vercel
- Cloudflare R2
- Supabase

### Generation
- Cloud-hosted ComfyUI
- Multiple workflows
- Multiple image/video models
- Capability-driven workflow contracts designed to grow beyond the initial production workflows

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

Verified current state:
- application shell is implemented and `APPROVED`;
- Create is implemented and `MIGRATING`;
- Image/Video prompt composition and essential aspect/duration state are responsive and screenshot-verified;
- typed RenderLab generation/job contracts and `POST /api/generation/jobs` exist;
- a server generation-adapter boundary exists and does not expose worker endpoints to the browser;
- reference source upload/binding contracts exist using signed direct R2 PUTs, server HEAD verification and opaque source IDs;
- Create supports reference preview/removal/replacement and resolves Image + reference → Edit and Video + reference → Animate;
- `supabase/migrations/0001_generation_sources.sql` is committed with server-owned/RLS intent;
- latest production build, Playwright/API checks, and desktop/mobile rendered review pass at CI run `33018346650` / commit `8332597f65aa85725f7395e10407dce4682ac025`;
- CI deliberately runs without production infrastructure credentials, so unavailable controls are truthful rather than simulated.

Current focus:
1. Establish the intended RenderLab Supabase target. The only currently connected project discovered is the legacy `AI Studio` database with `studio_*` tables; do not apply RenderLab migrations there by assumption.
2. Establish the RenderLab R2 target and environment configuration.
3. Establish/connect the real RenderLab generation backend adapter endpoint.
4. Apply the committed source migration only to the approved RenderLab database target.
5. Verify real signed reference upload and text-to-image/text-to-video submission end-to-end.
6. Implement job-state synchronization after submission.
7. Implement persisted result presentation and capability-derived continuation actions.
8. Introduce Advanced controls only from verified capability definitions.
9. Continue validation through GitHub production build + Playwright desktop/mobile screenshots.

See `docs/ui/UI_MIGRATION.md` for current phase status, `docs/ui/DESIGN_WORKFLOW.md` for visual workflow, and `docs/architecture/FRONTEND_ARCHITECTURE.md` for the approved frontend architecture.

## Source of Truth
The `renderlab` repository is the primary source of truth. ChatGPT Project context is secondary continuity context. Current chat sessions are temporary working context.
