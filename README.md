# RenderLab

RenderLab is an image and video generation platform for model-backed creative workflows.

This repository is the new standalone home for the RenderLab product. It starts from the Studio frontend and removes the old S.A.G.A. monorepo/repository coupling.

## Stack

- Frontend: Vite + React
- Deployment: Vercel
- Database/Auth: Supabase
- Object storage: Cloudflare R2
- Source of truth: GitHub

## Local development

```bash
npm install
npm run dev
```

By default, the frontend calls the API at `/studio/*`. Override this with:

```bash
VITE_RENDERLAB_API_PREFIX=/api
VITE_RENDERLAB_API_BASE=https://your-api-host.example
```

Only `VITE_*` values are exposed to the browser. Keep Supabase service-role keys and R2 credentials server-side.

## Verification

```bash
npm test
npm run build
```

## Deployment

Vercel should use:

- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`

Production secrets belong in Vercel environment variables and provider dashboards, never in this repo.

## Migration status

This repo currently contains the rebranded frontend and deployment scaffolding. The backend/API implementation should be migrated next into Vercel server routes or a dedicated service using Supabase and Cloudflare R2.
