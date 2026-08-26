# Frontend Architecture

This document defines the approved RenderLab frontend architecture. It describes the target architecture for the fresh build; no application implementation exists yet beyond repository governance/documentation.

## Framework
**Framework:** Next.js with React and the App Router  
**Language:** TypeScript  
**Routing:** Next.js file-system routing via `app/`  
**Rendering model:** Server Components by default; Client Components only for interactive creative/workspace behavior  
**Styling:** Tailwind CSS + project design tokens  
**Component foundation:** shadcn/ui where appropriate, adapted into approved RenderLab primitives/components rather than treated as the product design itself

Do not pin this document to a framework version until the application is scaffolded and the installed version is verified from `package.json`.

## Why Next.js
Next.js is selected because RenderLab already targets Vercel and requires more than a static SPA:
- first-class application routing without recreating Saga's manual hash navigation;
- colocated server and client boundaries;
- route handlers/server-side code for product API boundaries where appropriate;
- strong TypeScript support;
- direct compatibility with the selected Vercel deployment stack;
- layouts and nested routes suitable for the persistent creative application shell;
- ability to keep data-fetching/server concerns out of highly interactive client components;
- straightforward integration with Tailwind and shadcn/ui.

The selection does **not** mean RenderLab should become server-rendered everywhere. The creation workspace, media interactions, upload controls, live job state, dialogs, and other interaction-heavy features will intentionally use Client Components where required.

## Routing Architecture
Initial approved product routes:

```text
/                 Create
/library          Library
/library/[assetId] Media Viewer / deep-linked asset view
/activity         Activity
/settings         Settings
```

Route groups/layouts may be used internally to organize shared application chrome without changing public URLs.

Rules:
- `Create` remains the default route.
- Image, Video, Edit, Animate, models, and workflows are not separate top-level routes by default.
- Adding a backend workflow does not create a route automatically.
- Context such as selected operation, asset, filters, or continuation source may use URL/search state when sharing/bookmarking meaningfully benefits the user.
- Do not encode transient implementation state into URLs merely because routing makes it possible.

## Proposed Directory Structure
The exact tree may evolve during implementation, but ownership boundaries should follow this model:

```text
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Create
│   ├── library/
│   │   ├── page.tsx
│   │   └── [assetId]/page.tsx
│   ├── activity/page.tsx
│   ├── settings/page.tsx
│   └── api/                        # only product-facing HTTP handlers that belong in the web app
├── components/
│   ├── ui/                         # approved primitives / shadcn-derived components
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
│   ├── api/                        # typed browser/server API clients
│   ├── validation/
│   ├── storage/                    # server-side storage integration only when owned here
│   └── utils/
├── server/
│   ├── generation/                 # orchestration/application service boundaries
│   ├── media/
│   └── data/                       # Supabase/repository access
└── types/
```

Do not create folders merely to match this diagram before code needs them. The structure defines ownership, not a requirement for empty scaffolding.

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

Do not add `'use client'` to broad layout/page trees just for convenience. Keep the interactive boundary as narrow as practical without fragmenting cohesive features into unreadable micro-components.

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
- open panels/dialogs;
- local operation selection;
- advanced-control visibility;
- unsaved parameter changes.

Lift state only when multiple feature boundaries genuinely require shared ownership.

### Persistent user preferences
Persistent preferences should have explicit ownership. Do not scatter unrelated raw `localStorage` keys across components as Saga did. Browser-only persistence may use a small typed preference layer; account-backed settings should live in the data layer.

## Capability Architecture
The frontend must consume the domain defined in `PRODUCT_CAPABILITIES.md` rather than hard-code UI directly around ComfyUI workflow IDs.

Core concepts:

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

The UI is free to provide purpose-built experiences for important operations. Capability-driven architecture does not mean rendering generic forms from raw workflow metadata.

## API and Backend Boundary
RenderLab should keep browser code behind stable product-level APIs.

The browser should not communicate directly with ComfyUI workers or provider infrastructure.

Preferred boundary:

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
```text
Create workspace
  ↓
Resolve creative operation + compatible workflow
  ↓
Validate/bind input assets + parameters
  ↓
Submit normalized generation request
  ↓
Persist asynchronous Generation Job
  ↓
Generation orchestration / ComfyUI worker
  ↓
Real job/runtime state exposed through product API
  ↓
Persist output to R2 + product metadata to Supabase
  ↓
Create durable Media Asset
  ↓
Update Create result / Library / Activity
```

A provider reporting completion is not product completion until the durable result has been persisted.

## Supabase Boundary
- Supabase is the persistent application data store for jobs, media metadata, organization state, settings/account data as introduced, and other structured product state.
- Service-role/server credentials must never enter Client Components or browser bundles.
- Browser access, if later used directly for authenticated realtime/read scenarios, must be deliberate and constrained by RLS; it is not assumed by this architecture.

## Cloudflare R2 Boundary
- R2 stores durable media/source objects.
- Browser uploads should use short-lived signed upload contracts rather than proxying large media bodies through the web application when direct upload is appropriate.
- Storage keys/provider details remain internal application data rather than primary user-facing concepts.
- Media access/download URLs should be issued through stable product contracts.

## ComfyUI Boundary
- ComfyUI is never called directly by ordinary frontend components.
- Workflow graph/node details remain behind workflow capability/orchestration services.
- The frontend consumes user-facing operation/capability definitions, validated constraints, job state, and outputs.

## Styling Architecture
- Tailwind CSS is the primary composition/styling mechanism.
- RenderLab design tokens define semantic colors, surfaces, spacing, typography, radii, motion, layout and control metrics.
- shadcn/ui components are implementation starting points for primitives when suitable, not automatic visual authority.
- App-specific reusable components are promoted into `COMPONENT_CATALOG.md` only after implementation and review.
- Avoid Saga's pattern of large feature-specific global CSS files and repeated inline visual values.

## Error and Loading Architecture
The product must distinguish:
- initial/loading data state;
- empty state;
- recoverable request error;
- generation/job failure;
- cancelled state;
- worker/runtime transitions that do not require user action.

Do not collapse infrastructure events such as failover into alarming user-facing errors if the system is recovering automatically.

## Validation and Type Safety
- Product API request/response contracts should be typed.
- Workflow capability definitions and generation parameters require runtime validation at server boundaries in addition to TypeScript types.
- Backend remains authoritative for limits/defaults/compatibility.
- Frontend validation exists for fast UX, not as the security/integrity boundary.

The specific runtime schema library is not selected yet; choose during implementation and record the decision.

## Architecture Constraints
1. Do not copy Saga's hash routing or central mega-`App` state container.
2. Do not build a global state store before a verified cross-feature requirement exists.
3. Do not expose service-role credentials or direct worker endpoints to the browser.
4. Do not tie product routes to workflow IDs.
5. Do not model generation as a synchronous request.
6. Do not make a generic workflow-form renderer the default Create experience.
7. Do not move all components client-side merely because the application is highly interactive.
8. Keep infrastructure replaceable behind stable product/domain contracts.

## Decisions Still Open
These are intentionally deferred until implementation evidence exists:
- exact Next.js/framework version;
- server-state synchronization library, if any;
- runtime schema/validation library;
- authentication implementation;
- realtime transport vs polling strategy for jobs;
- whether any orchestration service must be deployed outside Vercel runtime limits;
- concrete visual design tokens and component variants.
