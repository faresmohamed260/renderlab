# RenderLab deployment notes

RenderLab production is intended to run from this repository through GitHub + Vercel, with Supabase for database/auth and Cloudflare R2 for generated media/object storage.

## Required Vercel environment variables

Client-visible:

- `VITE_RENDERLAB_API_PREFIX`
- `VITE_RENDERLAB_API_BASE` when the API is not same-origin

Server-side only:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET`
- `CLOUDFLARE_R2_PUBLIC_BASE_URL`

## Supabase security baseline

- Enable RLS on all exposed tables.
- Do not use `user_metadata` for authorization.
- Keep service-role keys server-side only.
- Use ownership checks in RLS policies instead of broad `TO authenticated` access.

## R2 storage baseline

- Generated images/videos should be stored in R2.
- Browser clients should use signed upload/download flows or application-mediated URLs.
- Do not expose R2 access keys to client-side code.

## Next migration task

Move the `/studio/*` backend contract out of the S.A.G.A. monorepo and into RenderLab-owned Vercel API routes or a RenderLab backend service.

## GitHub Actions deployment secrets

The production deployment workflow expects these GitHub repository secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Create/link the Vercel project to `faresmohamed260/renderlab`, then copy the org/project IDs into the repository secrets. The workflow uses `vercel build` plus `vercel deploy --prebuilt --prod` so CI tests/build and deployment remain reproducible.
