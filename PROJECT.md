# Project

AI image/video generation platform using cloud-hosted ComfyUI workflows as the generation backend.

## Stack
### Frontend
- Use the frontend framework actually present in the repository
- TypeScript
- Tailwind CSS
- shadcn/ui where applicable

### Infrastructure
- Vercel
- Cloudflare R2
- Supabase

### Generation
- Cloud-hosted ComfyUI
- Multiple workflows
- Multiple image/video models

## Product Areas
Create, image generation, video generation, queue, gallery, history, media viewer, models, workflows, and settings.

## Current Priority
Controlled migration of the existing frontend into a reusable, consistent component-based UI system without rebuilding the application.

See `docs/ui/UI_MIGRATION.md`.

## Source of Truth
Conversation history is not authoritative project state. Code and repository documentation are authoritative.
