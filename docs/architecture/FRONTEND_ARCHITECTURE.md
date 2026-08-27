# Frontend Architecture

This document defines the approved RenderLab frontend architecture and records the verified implementation state of the fresh build.

## Verified Scaffold
The application is remotely built and validated through GitHub Actions.

Installed versions from `package.json`:
- Next.js `16.3.3`
- React `19.2.8`
- React DOM `19.2.8`
- TypeScript `7.0.2`
- Tailwind CSS `4.3.3`
- Lucide React `1.34.0`
- Radix Collapsible `@radix-ui/react-collapsible` `1.1.20`
- Playwright `1.62.1`
- AWS SDK S3 client `3.1116.0`
- AWS SDK S3 request presigner `3.1116.0`

The production build and responsive Create/shell checks pass in GitHub Actions. Verified public routes are `/`, `/library`, `/library/[assetId]`, `/activity`, and `/settings`.

## Framework
**Framework:** Next.js `16.3.3` with React `19.2.8` and the App Router  
**Language:** TypeScript `7.0.2`  
**Routing:** Next.js file-system routing via `src/app/`  
**Rendering model:** Server Components by default; Client Components only for interactive creative/workspace behavior  
**Styling:** Tailwind CSS `4.3.3` + project semantic design tokens  
**Component foundation:** existing RenderLab components first, then normalized shadcn/ui/Radix primitives and the approved component ecosystem documented in `docs/ui/COMPONENT_CATALOG.md`.

## Why Next.js
Next.js fits the product because RenderLab requires:
- real application routing instead of Saga-style manual hash navigation;
- colocated server/client boundaries;
- server-side product APIs for generation, uploads, media and orchestration;
- TypeScript-first implementation;
- compatibility with the Vercel deployment target;
- persistent layouts for the application shell;
- ability to keep provider/storage credentials and worker interaction out of browser code.

The creation workspace remains intentionally client-interactive; choosing Next.js does not imply server-rendering every interaction.

## Routing Architecture
Approved routes:

```text
/                  Create
/library           Library
/library/[assetId] Media Viewer
/activity          Activity
/settings          Settings
```

Implemented product API boundaries:

```text
GET/POST /api/generation/jobs
GET      /api/generation/jobs/[jobId]
GET/POST /api/assets/reference/upload-tickets
POST     /api/assets/reference/upload-completions
GET      /api/media/assets/[assetId]
GET      /api/media/assets/[assetId]/content
GET      /api/media/assets/[assetId]/thumbnail
```

Rules:
- Create remains the default route.
- Image, Video, Edit, Animate, models and workflows are not separate top-level routes by default.
- Adding a backend workflow does not create a route automatically.
- Context moves into URLs only when deep linking/shareability provides product value.

## Verified Ownership Structure
Current important implementation boundaries include:

```text
src/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx
│   ├── api/
│   │   ├── generation/jobs/
│   │   ├── assets/reference/
│   │   └── media/assets/
│   ├── library/
│   ├── activity/
│   └── settings/
├── components/
│   ├── shell/
│   │   ├── app-shell.tsx
│   │   └── route-placeholder.tsx
│   └── ui/
│       └── collapsible.tsx
├── features/
│   └── create/
│       ├── create-workspace.tsx
│       └── create-advanced-panel.tsx
├── lib/
│   ├── api/
│   │   ├── generation-contract.ts
│   │   └── reference-upload-contract.ts
│   └── capabilities/
│       └── generation.ts
└── server/
    ├── data/
    │   └── supabase-rest.ts
    ├── generation/
    │   ├── native-generation.ts
    │   ├── worker-fleet.ts
    │   ├── submit-generation.ts
    │   ├── poll-generation.ts
    │   └── studio-compat.ts
    ├── media/
    │   └── media-assets.ts
    └── storage/
        └── r2.ts

supabase/
└── migrations/
    ├── 0001_generation_sources.sql
    └── 0002_generation_jobs_media_assets.sql
```

Future ownership pattern:
- `components/ui` — normalized generic primitives with no feature data contract;
- `components/shell` — persistent navigation/application chrome;
- `components/media` — reusable media presentation/actions when multiple surfaces need them;
- `components/feedback` — shared feedback mechanics when reuse is real;
- `features/<feature>` — product-specific composition/behavior;
- `lib/capabilities` — user-facing capability definitions and resolution;
- `lib/api` — typed product API contracts;
- `server/generation` — orchestration and worker boundaries;
- `server/media` — durable media/source services;
- `server/storage` — R2/storage provider implementation;
- `server/data` — Supabase/repository access.

Do not create empty folders merely to match the future diagram.

## Naming Conventions
- React files: `kebab-case.tsx`.
- Hooks: `use-*.ts`.
- Services/libraries: `kebab-case.ts`.
- Next.js reserved route files keep framework names.
- Component exports: `PascalCase`.
- hooks/functions/variables: `camelCase`.
- types: `PascalCase`.
- semantic CSS/Tailwind tokens: lowercase kebab-case.

## Component Architecture
### Reuse before invention
Generic interaction mechanics follow the component sourcing policy in `docs/ui/COMPONENT_CATALOG.md`. Feature code should not casually implement competing dialog/disclosure/menu/selection mechanics.

`src/components/ui/collapsible.tsx` is the first normalized Radix primitive in the repository. It wraps `@radix-ui/react-collapsible` and deliberately contains no Create-specific data or styling logic. Create Advanced composes that maintained disclosure behavior with feature-owned fields.

Native HTML inputs/selects remain valid ordinary form controls; using them is not a license to invent custom interaction engines. New reusable mechanics still follow the approved source search order.

### Server Components by default
Use for route/page/layout composition where browser state is unnecessary.

### Client Components deliberately
Use for:
- Create workspace and prompt state;
- uploads/reference interaction;
- output/operation selection;
- Advanced disclosure and draft parameters;
- live job polling and runtime feedback;
- media actions/continuation;
- dialogs, sheets, popovers and other client interaction primitives when required.

`AppShell` is currently a Client Component because active-route styling uses `usePathname`. Do not add broad `'use client'` boundaries for convenience.

## State Architecture
### URL state
Use only for navigation/deep-link state that benefits from reload/shareability.

### Server state
`generation_jobs`, `media_assets`, `generation_sources` and future persistent product data remain server-owned state accessed through application boundaries.

### Client feature state
Create owns ephemeral state such as:
- prompt draft;
- output kind and essential values;
- local reference preview;
- upload/submission state;
- current job/result state;
- Advanced disclosure visibility;
- separate Image/Video Advanced drafts;
- continuation source selection.

Avoid an ad-hoc global store until multiple features genuinely require one.

## Capability Architecture
Frontend behavior consumes the domain defined in `PRODUCT_CAPABILITIES.md` rather than ComfyUI graph IDs.

```text
Creative Operation
      ↓
Workflow Capability
      ↓
Input Slots + Parameter Definitions
      ↓
Normalized Generation Request
      ↓
Generation Job
      ↓
Persisted Media Asset
      ↓
Continuation Actions
```

Generation inputs bind by product identity:

```text
GenerationInput
  ├── temporary-source { id }
  └── media-asset      { id }
```

R2 keys, workers, providers and ComfyUI graph identifiers remain server-side implementation details.

### Advanced capability boundary
Verified request-level Advanced parameters currently are:
- negative prompt;
- seed;
- steps;
- guidance;
- frame rate for Video.

`src/lib/capabilities/generation.ts` owns the current UI/API capability metadata and validation ranges used by Create and the typed generation request parser. New worker parameters do not automatically become UI controls.

## Native Generation Flow
Current native RenderLab generation path:

```text
Create workspace
  ↓
POST /api/generation/jobs
  ↓
validate normalized request + resolve creative operation
  ↓
create generation_jobs row
  ↓
resolve opaque temporary-source/media-asset inputs
  ↓
submit to compatible primary/standby worker fleet
  ↓
GET /api/generation/jobs/[jobId]
  ↓
poll assigned worker + persist real runtime state
  ↓
persisting
  ↓
write durable output to shared R2
  ↓
create media_assets row
  ↓
job succeeds with outputAssetIds
  ↓
Create loads /api/media/assets/[assetId]
  ↓
render result + capability-derived continuations
```

A worker response is not product completion. `succeeded` occurs only after durable R2 and `media_assets` persistence.

All four initial operations are live-verified. Durable `media-asset` continuation is also live-verified.

## Polling and Worker Reliability
Create client polling:
- normal status polling follows real RenderLab job state;
- transient 408/425/429/5xx/network interruptions retry with bounded exponential backoff;
- repeated client connection failures pause tracking with truthful copy rather than falsely failing the job.

Server worker behavior:
- submission can try compatible primary/standby workers;
- poll-time reassignment is intentionally conservative;
- explicit credit exhaustion or explicit worker-unavailable evidence can be safe to reassign;
- generic 429/5xx/network ambiguity never causes automatic resubmission because the assigned worker may already have accepted/executed the generation;
- failover attempts are persisted in job metadata;
- ambiguous standby submission is not automatically repeated.

Post-merge live generation regression run `33027861292` succeeded after this hardening.

## Reference Asset Upload Flow
```text
User selects PNG/JPEG/WebP reference (≤25 MB)
  ↓
POST /api/assets/reference/upload-tickets
  ↓
pending generation_sources row + opaque sourceId
  ↓
short-lived signed Cloudflare R2 PUT
  ↓
browser uploads bytes directly to R2
  ↓
POST /api/assets/reference/upload-completions
  ↓
server HEAD-verifies MIME + size
  ↓
generation_sources becomes ready
  ↓
Create binds { type: "temporary-source", id: sourceId }
```

This path is live-verified against the reused shared Supabase/R2 resources and its integration fixtures self-clean.

## Media Delivery and Continuation
Persisted product media is exposed through stable RenderLab APIs rather than raw R2 identity:
- metadata: `/api/media/assets/[assetId]`;
- content: `/api/media/assets/[assetId]/content`;
- thumbnail: `/api/media/assets/[assetId]/thumbnail`.

Create uses returned `contentUrl` for image/video presentation. Persisted image results expose capability-derived Edit and Animate actions. Continuation rebinds the durable asset as a `media-asset` input. Live run `33027460976` verified `Create Image → persisted media asset → Edit Image` and self-cleaned both output objects/records.

## Supabase Boundary
RenderLab deliberately reuses shared project `AI Studio` (`rashyleshocuvpgcooxy`) while keeping RenderLab tables separate from legacy `studio_*`.

Applied RenderLab tables:
- `generation_sources`;
- `generation_jobs`;
- `media_assets`.

RLS remains enabled. Service-role credentials are server-only.

## Cloudflare R2 Boundary
RenderLab reuses the shared R2 resource by explicit decision.
- Browser uploads use short-lived signed PUT URLs.
- Generated outputs use the `renderlab/` namespace.
- R2 credentials stay server-only.
- R2 storage keys are internal metadata, never frontend generation identity.

## ComfyUI Boundary
- Browser components never call workers directly.
- User-facing operations are distinct from worker/workflow IDs.
- Worker routing/failover remains server-owned.
- Advanced UI remains curated rather than mirroring ComfyUI nodes.

## Styling Architecture
- Tailwind CSS is the primary styling mechanism.
- semantic tokens live in `src/app/globals.css` using Tailwind v4 `@theme` values;
- reusable external primitives are normalized into RenderLab-owned component files;
- feature composition uses semantic tokens rather than external demo styling;
- avoid Saga-style large feature-specific global CSS files.

## Remote Validation Architecture
UI iteration does not require Vercel preview deployments.

`.github/workflows/ui-shell.yml` performs ordinary credential-free validation:
- production `next build`;
- Playwright Chromium against `next start`;
- desktop `1440×1024` checks;
- mobile `390×844` checks;
- generation/reference API validation;
- screenshot artifacts for visual review.

Create Advanced PR #6 was verified in final PR run `33030364272`, including progressive-disclosure interaction, per-output Advanced drafts, invalid Advanced API validation, and reviewed desktop/mobile screenshot artifacts.

Configured real-infrastructure workflows separately verify reference uploads and generation without placing production secrets into ordinary UI CI.

For full Create visual lifecycle verification, `scripts/verify-create-lifecycle.mjs` plus `.github/workflows/create-lifecycle-visual.yml` use the existing server-side infrastructure secrets to:
1. launch the production build;
2. drive Create through Chromium;
3. submit one real Create Image request;
4. wait for durable persistence and the rendered result;
5. capture desktop/mobile result screenshots;
6. select the capability-derived Edit continuation from the persisted asset;
7. capture desktop/mobile continuation screenshots;
8. delete the generated R2 object plus `media_assets`/`generation_jobs` fixture.

GitHub Actions run `33031817744` passed this configured lifecycle check and supplied the final Phase 3 visual approval evidence.

## Error and Loading Architecture
The product distinguishes:
- unavailable environment state;
- upload in progress;
- submission error;
- running/persisting generation;
- transient polling interruption/recovery;
- worker/job failure;
- durable result loading;
- succeeded persisted result.

No synthetic percentage progress is permitted. Recoverable errors preserve prompt/reference/settings/Advanced drafts.

## Current Frontend Status
- AppShell: `APPROVED`.
- Create: `APPROVED` after configured real-lifecycle responsive review in run `33031817744`.
- Library, Media Viewer, Activity and Settings remain planned/placeholder surfaces.
- Current product phase: Phase 4 — Media & Continuation.

## Architecture Rules
- Do not rebuild Saga's frontend architecture.
- Do not expose ComfyUI graph/node complexity in ordinary UI.
- Do not call workers or R2 credentialed APIs from browser components.
- Do not create a route per workflow/model.
- Do not add global state before there is a real cross-feature ownership need.
- Do not make every component a Client Component.
- Do not reinvent generic UI mechanics before checking approved maintained sources.
- Do not promote every worker parameter to default/Advanced UI automatically.
- Do not mark a generation complete before durable persistence.
