# Frontend Architecture

This document defines the approved RenderLab frontend architecture and records the verified implementation state of the fresh build.

## Verified Scaffold
The application is scaffolded and remotely verified through GitHub Actions.

Installed versions from `package.json`:
- Next.js `16.3.3`
- React `19.2.8`
- React DOM `19.2.8`
- TypeScript `7.0.2`
- Tailwind CSS `4.3.3`
- Lucide React `1.34.0`
- Playwright `1.62.1`
- AWS SDK S3 client `3.1116.0`
- AWS SDK S3 request presigner `3.1116.0`

The production build and responsive Create/shell checks pass in GitHub Actions. The verified public routes are `/`, `/library`, `/library/[assetId]`, `/activity`, and `/settings`. Product API routes currently include generation submission plus reference-upload ticket/completion boundaries.

## Framework
**Framework:** Next.js `16.3.3` with React `19.2.8` and the App Router  
**Language:** TypeScript `7.0.2`  
**Routing:** Next.js file-system routing via `src/app/`  
**Rendering model:** Server Components by default; Client Components only for interactive creative/workspace behavior  
**Styling:** Tailwind CSS `4.3.3` + project semantic design tokens  
**Component foundation:** shadcn/ui/Radix for conventional primitives plus approved motion/component ecosystems documented in `docs/ui/UI_SYSTEM.md` and `docs/ui/COMPONENT_CATALOG.md`

## Why Next.js
Next.js is selected because RenderLab targets Vercel and requires more than a static SPA:
- first-class application routing without recreating Saga's manual hash navigation;
- colocated server and client boundaries;
- route handlers/server-side code for product API boundaries where appropriate;
- strong TypeScript support;
- direct compatibility with the selected Vercel deployment stack;
- layouts and nested routes suitable for the persistent creative application shell;
- ability to keep data-fetching/server concerns out of highly interactive client components;
- straightforward integration with Tailwind and the approved component ecosystem.

The selection does **not** mean RenderLab should become server-rendered everywhere. The creation workspace, media interactions, upload controls, live job state, dialogs, and other interaction-heavy features intentionally use Client Components where required.

## Routing Architecture
Approved and currently scaffolded routes:

```text
/                  Create
/library           Library
/library/[assetId] Media Viewer / deep-linked asset view
/activity          Activity
/settings          Settings
```

Current product API boundaries:

```text
GET/POST /api/generation/jobs
GET/POST /api/assets/reference/upload-tickets
POST     /api/assets/reference/upload-completions
```

Rules:
- `Create` remains the default route.
- Image, Video, Edit, Animate, models, and workflows are not separate top-level routes by default.
- Adding a backend workflow does not create a route automatically.
- Context such as selected operation, asset, filters, or continuation source may use URL/search state when sharing/bookmarking meaningfully benefits the user.
- Do not encode transient implementation state into URLs merely because routing makes it possible.

## Current Directory Structure and Ownership
Verified implementation now includes:

```text
src/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx
│   ├── api/
│   │   ├── generation/jobs/route.ts
│   │   └── assets/reference/
│   │       ├── upload-tickets/route.ts
│   │       └── upload-completions/route.ts
│   ├── library/
│   │   ├── page.tsx
│   │   └── [assetId]/page.tsx
│   ├── activity/page.tsx
│   └── settings/page.tsx
├── components/
│   └── shell/
│       ├── app-shell.tsx
│       └── route-placeholder.tsx
├── features/
│   └── create/
│       └── create-workspace.tsx
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
    │   └── submit-generation.ts
    ├── media/
    │   └── reference-uploads.ts
    └── storage/
        └── r2.ts

supabase/
└── migrations/
    └── 0001_generation_sources.sql
```

Future ownership boundaries should follow this model only as code actually requires them:

```text
src/
├── components/
│   ├── ui/                         # approved primitives / normalized external components
│   ├── shell/                      # navigation, app shell, global status
│   ├── media/                      # reusable media presentation/actions
│   └── feedback/                   # shared progress/error/empty/loading patterns
├── features/
│   ├── create/
│   ├── library/
│   ├── activity/
│   └── settings/
├── lib/
│   ├── capabilities/               # workflow/capability contracts and resolution
│   ├── api/                        # typed product API contracts/clients
│   ├── validation/
│   └── utils/
├── server/
│   ├── generation/                 # orchestration/application service boundaries
│   ├── media/                      # media/source application services
│   ├── storage/                    # R2/provider-specific storage implementation
│   └── data/                       # Supabase/repository access
└── types/
```

Do not create folders merely to match the future diagram before code needs them. The structure defines ownership, not a requirement for empty scaffolding.

## Naming Conventions
### Files
- React components: `kebab-case.tsx` (`app-shell.tsx`, `media-card.tsx`).
- Hooks: `use-*.ts` (`use-generation-job.ts`).
- Libraries/services/schema modules: `kebab-case.ts`.
- Next.js reserved route files keep framework names (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`).
- Tests follow the source filename plus `.test.ts[x]` or the test framework convention.

### Symbols
- React component exports: `PascalCase` (`AppShell`, `MediaCard`).
- hooks/functions/variables: `camelCase`.
- types/interfaces/schema names: `PascalCase`.
- constants: descriptive `camelCase` by default; use `UPPER_SNAKE_CASE` only for true environment/protocol constants where it improves clarity.
- semantic token names: lowercase kebab-case at the CSS/Tailwind variable boundary.

### Component ownership
- `components/ui`: generic reusable primitives with no feature-specific data contract.
- `components/shell`: persistent application chrome shared across routes.
- `components/media`: reusable asset presentation/actions shared by multiple features.
- `components/feedback`: generic shared state/feedback UI.
- `features/<feature>`: product-specific compositions and feature behavior. Do not promote a feature component globally before a real second reuse case or clear stable primitive role exists.

### External components
Copy-owned registry components are normalized into project-owned files before feature use. Feature code should import the RenderLab wrapper/local component rather than reaching directly into multiple external registries.

Do not preserve demo-library names when the RenderLab role is clearer. Preserve source attribution in `COMPONENT_CATALOG.md`.

## Component Boundaries
### Server Components by default
Use for:
- route/page composition where browser state is unnecessary;
- initial server-side data loading where appropriate;
- metadata/layout composition;
- read-heavy shells that can pass serializable data into interactive children.

### Client Components deliberately
Use for:
- Create composer/workspace;
- prompt and reference interaction;
- uploads and drag/drop;
- operation selection;
- contextual/advanced controls;
- live job status and cancellation interaction;
- media selection/actions;
- dialogs, sheets, popovers, menus and client-only accessibility interactions;
- optimistic interaction where justified.

`AppShell` is currently a Client Component because active route styling uses `usePathname`; feature route pages remain Server Components. Do not add `'use client'` to broad route/page trees just for convenience.

## State Architecture
### URL state
Use for state that benefits from navigation, deep linking, reload persistence, or shareability, such as:
- current route;
- selected media asset via route parameter;
- Library filters/search when product design approves shareable/filterable URLs.

### Server state
Persistent jobs, media, uploads, collections/organization, workflow capability data, and other backend-owned state remain server state.

Preferred principle:
- fetch server-owned data through typed application APIs/services;
- do not duplicate it into ad-hoc global client stores;
- use polling/revalidation/streaming mechanisms according to the actual backend contract rather than pretending generation is synchronous.

The concrete server-state client library is not yet selected. Choose it only when implementation requirements justify it; do not add a dependency by default.

### Client feature state
Keep ephemeral creative state close to the owning feature:
- current prompt draft;
- selected/attached inputs before submission;
- local preview URLs during upload;
- open panels/dialogs;
- local operation selection;
- advanced-control visibility;
- unsaved parameter changes.

Lift state only when multiple feature boundaries genuinely require shared ownership.

### Persistent user preferences
Persistent preferences should have explicit ownership. Do not scatter unrelated raw `localStorage` keys across components as Saga did. Browser-only persistence may use a small typed preference layer; account-backed settings should live in the data layer.

## Capability Architecture
The frontend consumes the domain defined in `PRODUCT_CAPABILITIES.md` rather than hard-coding UI directly around ComfyUI workflow IDs.

```text
Creative Operation
      ↓ resolves against
Workflow Capability Definition
      ↓ defines
Input Slots + Parameter Definitions
      ↓ produces
Normalized Generation Request
      ↓ creates
Generation Job
      ↓ persists
Media Asset(s)
      ↓ enables
Continuation Actions
```

A generation input binds by **product identity**, not storage identity:

```text
GenerationInput
  ├── temporary-source { id }
  └── media-asset      { id }
```

R2 keys are not generation-request identities exposed to feature code. Server services resolve opaque product IDs to provider/storage details.

The UI is free to provide purpose-built experiences for important operations. Capability-driven architecture does not mean rendering generic forms from raw workflow metadata.

## API and Backend Boundary
RenderLab keeps browser code behind stable product-level APIs. The browser must not communicate directly with ComfyUI workers or provider infrastructure.

```text
Browser UI
  ↓ typed RenderLab API/client
Next.js route handler / application service boundary
  ↓
Generation, media, upload, job and capability services
  ↓
Supabase / Cloudflare R2 / workflow orchestration
  ↓
Cloud-hosted ComfyUI worker ecosystem
```

Some backend services may later live outside the Next.js runtime if execution characteristics require it. The frontend contract must not depend on where orchestration is physically hosted.

## Generation Flow
Current product-level generation contract:

```text
Create workspace
  ↓
Resolve creative operation + compatible workflow
  ↓
Validate/bind opaque input source IDs + parameters
  ↓
POST /api/generation/jobs
  ↓
Server generation adapter
  ↓
External orchestration endpoint configured by RENDERLAB_GENERATION_BACKEND_URL
  ↓
Persistent asynchronous Generation Job
  ↓
Real job/runtime state
  ↓
Persist output to R2 + product metadata to Supabase
  ↓
Durable Media Asset
  ↓
Create result / Library / Activity
```

The browser-to-RenderLab boundary is implemented and validated. The actual configured generation backend adapter endpoint and post-submit job synchronization remain open. A provider reporting completion is not product completion until the durable result has been persisted.

## Reference Asset Upload Flow
The reference upload contract deliberately carries forward the proven Saga behavior—direct signed upload plus server verification—without copying Saga's storage-key-facing API.

```text
User selects PNG/JPEG/WebP reference (≤25 MB)
  ↓
POST /api/assets/reference/upload-tickets
  ↓
Server creates pending generation_sources row + opaque sourceId
  ↓
Server issues short-lived signed Cloudflare R2 PUT
  ↓
Browser uploads bytes directly to R2
  ↓
POST /api/assets/reference/upload-completions { sourceId, dimensions? }
  ↓
Server HEAD-verifies exact object size + MIME type
  ↓
Server marks generation_sources row ready
  ↓
Create binds source as { type: "temporary-source", id: sourceId }
  ↓
Image + source resolves Edit; Video + source resolves Animate
```

Rules:
- accepted reference formats are currently PNG, JPEG and WebP;
- maximum source size is currently 25 MB, matching the verified legacy production constraint;
- upload URLs expire after five minutes;
- source IDs are opaque UUIDs; browser feature code never uses an R2 key as product identity;
- server-side completion is idempotent for an already-ready source;
- server verification is authoritative even though the browser validates first for UX;
- failed verification marks the source failed rather than silently accepting mismatched bytes;
- current migration creates a temporary `generation_sources` table with RLS enabled and no browser policies; access is service-role/server-owned.

The code path passes production build and unconfigured-environment API/UI tests. It is **not yet end-to-end production verified** because a dedicated RenderLab Supabase target/R2 configuration has not been established in this repo/session.

## Supabase Boundary
- Supabase is the persistent application data store for jobs, media metadata, source records, organization state, settings/account data as introduced, and other structured product state.
- Service-role/server credentials never enter Client Components or browser bundles.
- `src/server/data/supabase-rest.ts` requires `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`; unlike Saga, there are no repository/default credential fallbacks.
- Browser access, if later used directly for authenticated realtime/read scenarios, must be deliberate and constrained by RLS; it is not assumed by this architecture.
- `supabase/migrations/0001_generation_sources.sql` is committed but has **not been applied to the currently connected legacy `AI Studio` project by assumption**. The only connected project inspected during this implementation contains the legacy `studio_*` tables. Establish the intended RenderLab database target explicitly before applying new RenderLab migrations.

## Cloudflare R2 Boundary
- R2 stores durable media/source objects.
- Browser uploads use short-lived signed upload contracts rather than proxying large media bodies through the web application.
- R2 credentials stay server-only and are required explicitly via `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME`.
- Storage keys/provider details remain internal application data rather than primary user-facing concepts.
- Media access/download URLs should be issued through stable product contracts.
- The new reference path uses `sources/YYYY/MM/<uuid>.<ext>` internally; this format is implementation detail and must not become frontend identity.

## ComfyUI Boundary
- ComfyUI is never called directly by ordinary frontend components.
- Workflow graph/node details remain behind workflow capability/orchestration services.
- The frontend consumes user-facing operation/capability definitions, validated constraints, job state, and outputs.
- Saga's Modal worker fleet remains behavioral/runtime reference for real states, standby routing and safe failover; RenderLab does not expose worker/account infrastructure as ordinary Create controls.

## Styling Architecture
- Tailwind CSS is the primary composition/styling mechanism.
- Initial semantic tokens are implemented in `src/app/globals.css` using Tailwind v4 `@theme` values derived from `docs/ui/UI_SYSTEM.md`.
- RenderLab design tokens define semantic colors, surfaces, spacing, typography, radii, motion, layout and control metrics.
- shadcn/Radix and the approved component ecosystems are implementation starting points, not automatic visual authority.
- App-specific reusable components are promoted into `COMPONENT_CATALOG.md` only after implementation and review.
- Avoid Saga's pattern of large feature-specific global CSS files and repeated inline visual values.

## Remote Validation Architecture
UI development does not depend on Vercel preview deployments for every iteration.

Current GitHub validation:
- `.github/workflows/ui-shell.yml`
- production `next build`
- Playwright Chromium against `next start`
- desktop viewport `1440×1024`
- mobile viewport `390×844`
- generation contract availability/validation checks
- reference-upload contract availability/validation checks
- uploaded screenshot artifact for visual inspection
- path filtering so documentation-only changes do not consume UI CI runs

The reference contract implementation passes CI run `33018346650` at commit `8332597f65aa85725f7395e10407dce4682ac025`; latest desktop/mobile Create screenshots were visually inspected after the change. CI intentionally runs without production Supabase/R2/generation credentials, so availability is expected to be false there.

## Error and Loading Architecture
The product distinguishes:
- initial/loading data state;
- empty state;
- upload-in-progress state;
- recoverable upload/submission error;
- generation/job failure;
- cancelled state;
- worker/runtime transitions that do not require user action.

Do not collapse infrastructure events such as failover into alarming user-facing errors if the system is recovering automatically. Recoverable Create errors preserve prompt, reference and settings.

## Validation and Type Safety
- Product API request/response contracts are typed.
- Current generation and reference-upload boundaries also perform explicit runtime validation at server entry points.
- Backend remains authoritative for limits/defaults/compatibility.
- Frontend validation exists for fast UX, not as the security/integrity boundary.

No runtime schema library has been added yet; the current small contracts use explicit validators. Introduce a schema library only when the number/complexity of contracts justifies it and record the decision.

## Architecture Constraints
1. Do not copy Saga's hash routing or central mega-`App` state container.
2. Do not build a global state store before a verified cross-feature requirement exists.
3. Do not expose service-role credentials or direct worker endpoints to the browser.
4. Do not expose R2 storage keys as generation-input identity.
5. Do not tie product routes to workflow IDs.
6. Do not model generation as a synchronous request.
7. Do not make a generic workflow-form renderer the default Create experience.
8. Do not move all components client-side merely because the application is highly interactive.
9. Keep infrastructure replaceable behind stable product/domain contracts.
10. Do not scatter raw third-party registry imports through feature code; normalize adopted components into RenderLab ownership first.
11. Do not apply RenderLab migrations to a legacy/shared Supabase project merely because it is the only connected project visible to a session.

## Decisions Still Open
These are intentionally deferred until implementation evidence exists:
- dedicated RenderLab Supabase project vs explicitly approved reuse/migration of the existing AI Studio project;
- RenderLab R2 bucket/credential target;
- server-state synchronization library, if any;
- runtime schema/validation library, if any;
- authentication implementation;
- realtime transport vs polling strategy for jobs;
- exact external generation adapter deployment/URL and whether orchestration lives inside or outside Vercel runtime limits.
