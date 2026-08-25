# RenderLab

RenderLab is an image and video generation platform for model-backed creative workflows.

This repository is the standalone home for the RenderLab product. It contains the migrated generation frontend plus the supporting API/runtime slice that used to live inside the old monorepo.

## Stack

- Frontend: Vite + React
- Deployment: Vercel
- Database/Auth: Supabase
- Object storage: Cloudflare R2
- Source of truth: GitHub

## Local frontend development

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

## Local API development

```bash
python -m venv .venv
.\.venv\Scripts\pip install -e ".[dev]"
python -m uvicorn apps.studio_api.app:app --host 127.0.0.1 --port 8685
```

Or launch the frontend and API together on Windows:

```powershell
.\scripts\start_renderlab.ps1
```

## Verification

```bash
npm test
npm run build
python -m pytest tests
```

## Deployment

Vercel should use:

- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`

Production secrets belong in Vercel environment variables and provider dashboards, never in this repo.

## Migration status

This repo now contains the rebranded frontend, API, generation core, ComfyUI/Modal integration, persistence runtime, migration, and focused tests needed for the RenderLab generation surface. The next production hardening step is to connect the backend to RenderLab-owned Supabase/R2 resources and replace any remaining local/test-harness defaults.
