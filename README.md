<p align="center">
  <img src="public/renderlab-mark-color.svg" alt="RenderLab mark" width="88" />
</p>

<h1 align="center">RenderLab</h1>

<p align="center">
  A production-grade creative workspace for generating, shaping, animating, and reusing AI media—without exposing the complexity of the underlying workflow engine.
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

![RenderLab visual atmosphere](public/landing/hero-atmosphere-v2.png)

## What RenderLab does

RenderLab turns cloud-hosted ComfyUI workflows into a coherent creative product. Users work with understandable creative operations—create an image, shape it with references, put it in motion, save it, and continue from it—while worker routing, storage keys, provider identifiers, and node graphs remain behind server-owned contracts.

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
    A["Idea or media"] --> B["Creative operation"]
    B --> C["Server-owned job"]
    C --> D["Durable result"]
    D --> E["Library"]
    E --> F["Continue: edit · animate · upscale · reuse"]
~~~

Accepted work does not depend on the initiating browser remaining open. Server-owned reconciliation and idempotent finalization carry jobs to truthful terminal states and durable outputs.

## Highlights

- Product-level generation contracts over a cloud ComfyUI/Modal worker fleet.
- Image generation, reference-backed editing, video generation, image animation, and contextual model choice.
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
3. Design product behavior and, when authorized, interaction choreography.
4. Implement behind RenderLab-owned domain and authorization boundaries.
5. Validate the exact commit with static, unit, integration, lifecycle, browser, responsive, and cleanup evidence.
6. Update durable documentation before declaring repository closure.
7. Deploy only through a separately authorized guarded rollout.

State labels are used precisely: implemented, validated, merged, deployed, and production-verified are not interchangeable.

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
| src/app | Routes and server/client boundaries |
| src/features | Product features and domain-facing UI |
| src/components/ui | Approved shared primitives |
| workers | Generation adapters and worker entrypoints |
| supabase | RenderLab-owned schema migrations |
| scripts | Verification, maintenance, and operational tooling |
| tests | Unit, integration, and browser contracts |
| docs/ui | Product/UI decisions, system, screens, and migration state |
| docs/architecture | Frontend, capability, infrastructure, and security contracts |

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

## Current direction

The production closed beta already covers the full creative thread, durable media, lifecycle control, closed-beta operations, and account/security foundation. Draft PR #313 adds product contracts and UI support for a MiniMax H3 video workflow, but its real worker deployment is blocked by the tested Modal workspaces' payment-method/spend limits. It is not merged, deployed, or part of the production capability set.

Ongoing work should deepen creative capability and product quality without exposing ComfyUI complexity or weakening ownership, accessibility, cleanup, and exact-head release gates. See [PROJECT.md](PROJECT.md) for the current live SHA and [PR #313](https://github.com/faresmohamed260/renderlab/pull/313) for the blocked draft capability.

---

<p align="center">
  <strong>Render what you imagine. Keep the thread alive.</strong>
</p>
