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

## Product Architecture Direction
The internal system should model generation around concepts such as:

`Workflow → Inputs → Parameters → Generation Job → Outputs → Continuation Actions`

A workflow may define supported media inputs, models, required and optional parameters, output types, constraints, advanced controls, and valid continuation actions.

This internal flexibility must not become a generic technical form in the default UI. RenderLab should translate backend capabilities into task-oriented experiences such as creating an image, creating a video, editing an image, animating a reference, upscaling, or other understandable creative operations.

## Product Areas
The initial approved information architecture is:
- **Create** — default creative workspace
- **Library** — durable generated and uploaded media
- **Activity** — job/execution utility surface
- **Settings** — application/account preferences as required
- **Media Viewer** — contextual asset detail/continuation surface

Image, Video, Edit, Animate, Models, and Workflows are not separate top-level destinations by default.

## Current Priority
Phase 1 — Design & Frontend Foundation:
1. Define design tokens and visual foundations.
2. Define core UI primitives and approved component sources.
3. Establish accessibility and responsive expectations.
4. Establish naming/folder conventions.
5. Define the application shell around the approved Create + Library information architecture.
6. Scaffold implementation only after these foundation decisions are recorded.

See `docs/ui/UI_MIGRATION.md` for the current foundation plan and `docs/architecture/FRONTEND_ARCHITECTURE.md` for the approved frontend architecture.

## Source of Truth
The `renderlab` repository is the primary source of truth. ChatGPT Project context is secondary continuity context. Current chat sessions are temporary working context.
