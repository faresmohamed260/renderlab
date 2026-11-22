# Project

RenderLab is an AI image creation and editing workspace. The current production generation scope is FIBO-only, backed by cloud-hosted ComfyUI workflows.

> **History separation:** the full Project chronology that existed immediately before governance hardening Checkpoint 6 is preserved as a content snapshot in `docs/archive/PROJECT_PRE_HISTORY_SEPARATION_2026-10-10.md`. Earlier Phase 0–13 chronology remains in `docs/archive/PROJECT_PRE_CYCLE3_2026-09-03.md`. Those files are historical evidence, not current authority.

## Product Direction

RenderLab is a fresh application, not a direct migration or visual clone of the previous Studio implementation in `saga`.

Saga is reference material for proven behavior, backend integration, workflow capability, persistence, job lifecycle and lessons learned. Its UI, navigation, component hierarchy, routing, deployed runtime and legacy tables are not the RenderLab specification.

## Product UX Principle

**Simple by default, powerful when needed.**

Users interact with understandable creative goals rather than ComfyUI graphs, worker routing or storage implementation. Advanced/model-specific controls are progressively disclosed only when useful.

## Stack

### Web and API runtime

Next.js App Router serves the public landing page, authenticated web workspace, and same-origin API and authentication handlers. The Create workspace targets FIBO image generation and editing. Private Studio qualification is not evidence of production worker parity.

### Infrastructure

- Vercel deployment target
- Cloudflare R2
- Supabase
- existing cloud-hosted ComfyUI/Modal worker fleet

RenderLab deliberately reuses Saga/Studio infrastructure resources while keeping RenderLab schema, storage prefixes, orchestration, APIs and product contracts independently named and owned. `docs/architecture/INFRASTRUCTURE.md` owns the detailed shared-resource/security boundary.

## Product Architecture Direction

Generation is modeled as:

`Workflow → Inputs → Parameters → Generation Job → Outputs → Continuation Actions`

Generation inputs and media actions use opaque product identities. R2 storage keys, provider IDs and worker routing remain server-side implementation details.

The application must not require a browser session to complete accepted backend work. Once RenderLab accepts a generation, server-owned lifecycle machinery must be able to reconcile it to a truthful terminal state and durable output without relying on the initiating tab remaining open.

## Web product areas

Public:
- **Brand / Landing** `/`

Primary application:
- **Create** `/create`
- **Library** `/library`

Contextual/utility:
- **Media Viewer** `/library/[assetId]`
- **Activity** `/activity`
- **Settings** `/settings`
- **Admin** `/admin` for fresh-authorized active admins only

Image, Video, Edit, Animate, Models and Workflows are not separate top-level destinations by default.

## Current production - 2026-11-22
<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: 4b9773267a4db5dfa4a839e45522662dfcd794ea -->

Canonical record: docs/production/current.json records source 4b9773267a4db5dfa4a839e45522662dfcd794ea and deployment dpl_3iR6p9m6M2wcgV5ru25nhTwTv2x5 (https://renderlab-1got9zfg0-faresmohamedsalah10-1681.vercel.app) as the assigned production release for renderlab.faresuniform.uk. Production cutover: 2026-11-22T04:11:29.446Z; qualified at 2026-11-22T04:04:26.000Z by Deployment Readiness 44983369933. Protected-main check run IDs: 137086357473, 137086357232, 137086357139, 137086357404, 137086357261, 137086357494. Rollback anchor: dpl_FCQcLR7jvfkAmrLNkQp1XeD8NP8r at source 4b9773267a4db5dfa4a839e45522662dfcd794ea. Automatic Git-to-production deployment remains disabled. Hosted process-exit recovery is pending verification.

Exact-source CI completed at 2026-11-22T04:04:26.000Z: Deployment Readiness 44983369933; protected check runs 137086357473, 137086357232, 137086357139, 137086357404, 137086357261, 137086357494.

Rollback anchor: dpl_ALVqmSx8fp1avwu4W3pJbPc6JkT1 at source a450a95996329a4508883ab77996016cd27fbd86. Automatic Git-to-production deployment remains disabled. Hosted missed-wake/lost-response/overlap recovery and replay-retention are production-verified in `docs/audits/ADR005_DURABLE_RECOVERY_PRODUCTION_2026-11-20.md`; the owner Modal usage alert is verified in `docs/audits/ADR005_MODAL_USAGE_ALERT_PRODUCTION_2026-11-20.md`. Hosted timeout/process-exit recovery is the only open ADR-005 evidence; this production pointer does not claim that gate complete.

## Current product and engineering state

- `docs/STATUS.md` is the concise current product/engineering status summary and owns the current enterprise-hardening overview.
- `docs/architecture/ARCHITECTURE_DECISIONS.md` owns durable non-UI cross-cutting architecture decisions and supersession; current implementation/configuration truth remains in the domain architecture authorities.
- `docs/architecture/PRODUCT_CAPABILITIES.md` owns the current capability/product-contract registry.
- `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md` owns Account & Settings workstream state, accepted deferrals and any future promotion gates.
- `docs/ui/UI_MIGRATION.md` owns only the current UI foundation/migration state; detailed closed phase chronology is historical evidence.
- `docs/ui/SCREEN_REGISTRY.md` owns the current screen/route/maturity inventory.
- `docs/architecture/INFRASTRUCTURE.md` owns current infrastructure/resource/security boundaries and operational deployment details.
- `docs/operations/INCIDENT_RESPONSE_AND_RECOVERY.md` owns incident/recovery procedures and the current recovery limitations.

The repository contains extensive exact-SHA workflow, artifact and rollout evidence under `docs/audits/**`, completed contracts and `docs/archive/**`. That evidence remains valuable for provenance, but it does not create an active phase or override the current authorities above.

## Current work and phase handoff

This handoff deliberately does **not** restate completed phase journals or infer a project-wide active phase from historical plans.

Before starting substantial work:
1. Re-establish current repository and production reality.
2. Read the domain authority closest to the requested change.
3. Treat only an explicitly current tracker/accepted contract as active execution scope.
4. Follow `AGENTS.md` progressive phase planning when a new multi-phase cycle or bounded implementation phase is authorized.
5. Keep deployment separate from implementation/merge acceptance.

If no current repository authority explicitly marks a phase active, do not resume an old archived checklist merely because it contains unfinished-looking prose.

## Historical evidence

The pre-Checkpoint-6 Project journal is preserved as a content snapshot in `docs/archive/PROJECT_PRE_HISTORY_SEPARATION_2026-10-10.md`. The earlier pre-Cycle-3 Project archive remains `docs/archive/PROJECT_PRE_CYCLE3_2026-09-03.md`.

Completed contracts, assessments, exact run IDs, artifact digests and prior production pointers remain historical evidence after closure unless a current authority explicitly carries a constraint forward. Current state should be updated in the appropriate present-tense authority instead of appending another historical journal block here.
