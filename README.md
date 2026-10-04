<p align="center">
  <img src="public/renderlab-mark-color.svg" alt="RenderLab mark" width="88" />
</p>

<h1 align="center">RenderLab</h1>

<p align="center">
  A production creative workspace for generating, shaping, animating, organizing, and reusing AI media—without exposing the complexity of the underlying workflow engine.
</p>

<p align="center">
  <a href="https://renderlab.faresuniform.uk"><strong>Explore the live product</strong></a>
  · <a href="PROJECT.md">Project status</a>
  · <a href="docs/architecture/PRODUCT_CAPABILITIES.md">Capabilities</a>
  · <a href="docs/ui/VISUAL_NORTH_STAR.md">Design direction</a>
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white" />
  <img alt="Cloudflare R2" src="https://img.shields.io/badge/Cloudflare-R2-F38020?logo=cloudflare&logoColor=white" />
  <img alt="Vercel" src="https://img.shields.io/badge/Vercel-Production-black?logo=vercel" />
</p>

> **Live status:** RenderLab is a closed-beta, invitation-only product. The public landing page is available; private workspace access requires an authorized account.

## Made with RenderLab

The gallery below comes from real production generations created through RenderLab. The examples deliberately span different visual directions to show the range of the same product surface rather than one hand-picked aesthetic.

<p align="center">
  <img src="docs/readme/showcase-grid.webp" alt="RenderLab production generations: cinematic explorer, white stag fantasy scene, science-fiction courier, surreal observatory, and stylized red-panda astronomer" />
</p>

<p align="center"><em>Cinematic editorial · Painterly fantasy · Graphic sci-fi · Surreal architecture · Stylized 3D</em></p>

These were generated as production media—not mocked product art—so the showcase reflects the same generation pipeline exposed through Create, Activity, Viewer, and Library.

## Product walkthrough

A short walkthrough shows the core user journey inside the live product: upload or create media, submit creative work, follow it through Activity, inspect the durable result, and continue from that asset.

<p align="center">
  <a href="docs/readme/renderlab-product-walkthrough.mp4">
    <img src="docs/readme/renderlab-product-walkthrough-preview.webp" alt="RenderLab walkthrough covering Create, Activity, Media Viewer, Library, and continuation actions" />
  </a>
</p>

<p align="center"><strong><a href="docs/readme/renderlab-product-walkthrough.mp4">Watch the 44-second product walkthrough</a></strong></p>

## From prompt to reusable media

RenderLab is designed around one continuous creative thread. Work begins in Create, becomes a server-owned job, progresses truthfully through Activity, resolves into durable media, and remains reusable from Viewer or Library.

### 1. Create

![RenderLab Create workspace](docs/readme/create.webp)

Create is an adaptive composer for image generation, reference-backed editing, animation, and text-to-video. Controls appear only when they are relevant to the current operation, keeping the default workflow simple while preserving advanced capability.

### 2. Track work in Activity

![RenderLab Activity view](docs/readme/activity.webp)

Activity exposes the real lifecycle of accepted work: queued, preparing, running, persisting, succeeded, failed, or cancelled. Users can cancel eligible jobs, retry failed intent, rerun successful work, and open completed results.

### 3. Inspect and continue from the result

![RenderLab Media Viewer](docs/readme/viewer.webp)

Media Viewer keeps the asset central while preserving prompt context, provenance, and compatible continuation actions. A generated image can become the starting point for another edit, animation, upscale, or related creative step.

### 4. Keep the thread alive in Library

![RenderLab Library](docs/readme/library.webp)

Library combines generated media and uploads in one durable workspace with search, favorites, collections, ordering, rename, download, deletion, and reusable continuation entry points.

## What RenderLab does

RenderLab turns cloud-hosted ComfyUI workflows into a coherent product experience. Users work with understandable creative operations—create an image, shape it with references, animate it, generate video, save the result, and continue from it—while provider identifiers, storage keys, node graphs, retries, and worker routing remain behind server-owned contracts.

The governing product principle is **simple by default, powerful when needed**.

### Core product surfaces

| Surface | Purpose |
| --- | --- |
| **Create** | Generate images and video, edit with references, animate stills, and expose advanced controls only when relevant. |
| **Library** | Search, organize, upload, favorite, collect, and revisit durable creative media. |
| **Media Viewer** | Inspect an asset and continue it through compatible actions such as edit, animate, or 2× upscale. |
| **Activity** | Follow generation state, cancel eligible work, retry failed intent, and run successful work again. |
| **Settings** | Manage identity, profile, preferences, credentials, sessions, MFA, exports, and account lifecycle. |
| **Admin** | Operate the closed beta through fresh-authorized, concealed administrative surfaces. |

## Creative workflow

~~~mermaid
flowchart LR
    A["Idea or media"] --> B["Create"]
    B --> C["Server-owned job"]
    C --> D["Activity lifecycle"]
    D --> E["Durable result"]
    E --> F["Viewer / Library"]
    F --> G["Edit · Animate · Upscale · Reuse"]
~~~

Accepted work does not depend on the initiating browser remaining open. Server-owned reconciliation and idempotent finalization carry jobs to truthful terminal states and durable outputs.

## Product highlights

- Image generation, reference-backed editing, video generation, image animation, and contextual model choice.
- Product-level generation contracts over a cloud ComfyUI/Modal worker fleet.
- Multi-reference addressing with stable media identities instead of provider-specific inputs.
- Durable uploads, generated media, search, favorites, collections, ordering, rename, download, and deletion.
- Browser-independent job reconciliation, bounded maintenance, cancellation, retry, failover, and sanitized failures.
- Owner-scoped authorization across media, jobs, profiles, preferences, invitations, and account lifecycle.
- Closed-beta admission, branded transactional email, MFA, session control, secure email change, data export, and deletion.
- Responsive, reduced-motion-aware **Kinetic Precision** interface built on maintained accessible primitives.
- Production qualification through exact-head CI, browser journeys, fixture cleanup, release manifests, and guarded cutover.

## Architecture

~~~mermaid
flowchart TB
    UI["Next.js App Router<br/>Server Components by default"]
    API["RenderLab domain + API contracts"]
    DB["Supabase<br/>Auth · Postgres · RLS"]
    OBJ["Cloudflare R2<br/>Durable media"]
    JOB["Generation lifecycle<br/>Reconciliation · retry · cancel"]
    GPU["ComfyUI / Modal workers"]

    UI --> API
    API --> DB
    API --> OBJ
    API --> JOB
    JOB --> GPU
    GPU --> JOB
    JOB --> DB
    JOB --> OBJ
~~~

RenderLab deliberately reuses selected Saga-era infrastructure resources while keeping its schema, storage prefixes, orchestration, ownership rules, and product contracts independently named and governed.

## Technology

- **Application:** Next.js 16, React 19, TypeScript 7, Tailwind CSS 4
- **Interface:** Radix/shadcn-derived primitives, Motion for React, Lucide
- **Data and identity:** Supabase Auth, PostgreSQL, RLS
- **Media:** Cloudflare R2 with presigned server-owned delivery boundaries
- **Generation:** curated ComfyUI workflows on a partitioned Modal worker fleet
- **Quality:** Oxlint, TypeScript, Node test runner, Playwright, repository-specific contract verifiers
- **Delivery:** Vercel with explicit, guarded production cutovers

## Engineering method

RenderLab is developed contract-first and evidence-first:

1. Re-establish repository, production, capability, and dependency reality.
2. Define the immediate phase contract and explicit non-goals.
3. Design product behavior and interaction choreography.
4. Implement behind RenderLab-owned domain and authorization boundaries.
5. Validate the exact commit with static, unit, integration, lifecycle, browser, responsive, and cleanup evidence.
6. Update durable documentation before declaring repository closure.
7. Deploy only through a separately authorized guarded rollout.

State labels are used precisely: **implemented**, **validated**, **merged**, **deployed**, and **production-verified** are not interchangeable.

## Local development

A local checkout is suitable for ordinary RenderLab engineering. Production and shared-resource operations require the documented credentials and ownership boundaries.

~~~bash
npm install
npm run dev
~~~

Common checks:

~~~bash
npm run lint
npm run typecheck
npm run test:unit
npm run verify:ui-purity
npm run build
~~~

Do not invent environment values or create replacement Supabase/R2 resources. Start with the infrastructure contract before configuring integrations.

## Repository map

| Path | Owns |
| --- | --- |
| `src/app` | Routes and server/client boundaries |
| `src/features` | Product features and domain-facing UI |
| `src/components/ui` | Approved shared primitives |
| `workers` | Generation adapters and worker entrypoints |
| `supabase` | RenderLab-owned schema migrations |
| `scripts` | Verification, maintenance, and operational tooling |
| `tests` | Unit, integration, and browser contracts |
| `docs/ui` | Product/UI decisions, system, screens, and migration state |
| `docs/architecture` | Frontend, capability, infrastructure, and security contracts |

## Documentation

Start here for substantial work:

1. [AI development instructions](AGENTS.md)
2. [Current project handoff](PROJECT.md)
3. [Product and UI foundation](docs/ui/UI_MIGRATION.md)
4. [Durable UI decisions](docs/ui/UI_DECISIONS.md)
5. [Product capabilities](docs/architecture/PRODUCT_CAPABILITIES.md)
6. [Frontend architecture](docs/architecture/FRONTEND_ARCHITECTURE.md)
7. [Infrastructure and security boundaries](docs/architecture/INFRASTRUCTURE.md)
8. [Visual design workflow](docs/ui/DESIGN_WORKFLOW.md)
9. [Visual north star](docs/ui/VISUAL_NORTH_STAR.md)

## Current status and future work

The production closed beta already covers the full creative thread, durable media, lifecycle control, closed-beta operations, and the account/security foundation.

Current and future work is focused on deepening creative capability rather than exposing more infrastructure:

- broaden supported image and video workflows while keeping one coherent Create experience;
- improve continuation between generated assets, edits, animation, and video;
- deepen media organization and creative project workflows;
- continue refining responsive interaction quality, motion, and accessibility;
- expand worker capability only when provider availability and production ownership boundaries are verified;
- preserve exact-head qualification, cleanup, security, and release evidence as the product grows.

Draft or blocked capabilities are not presented as production features. See [PROJECT.md](PROJECT.md) for the current repository handoff and production state.

---

<p align="center">
  <strong>Render what you imagine. Keep the thread alive.</strong>
</p>
