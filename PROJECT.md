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

Accepted generation dispatch and recovery do not require the initiating browser to remain open. For this beta, a finished job may settle to a durable terminal state on the owner's next Create, Library, Activity or blocked-submit return; owners who never return are not guaranteed unattended finalization. This is a recorded Phase 2 operational decision, not a new background scheduler.

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

## Current production - 2026-11-23
<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: bc3cc27f2d207efdea87bb5d5d57706ba49320ba -->

Canonical record: docs/production/current.json records source bc3cc27f2d207efdea87bb5d5d57706ba49320ba and deployment dpl_AsG9axxT8oe9buUuxrzXYvrB9NXB (https://renderlab-k9e425u5m-faresmohamedsalah10-1681.vercel.app) as the assigned Production release for renderlab.faresuniform.uk. Vercel created the deployment at 2026-11-23T17:32:42.140Z, marked it READY at 2026-11-23T17:33:09.892Z, and assigned the domain alias at 2026-11-23T17:34:36.575Z. Deployment Readiness run 45228447753 and six exact-source protected-main checks qualified the release at 2026-11-23T17:31:13.000Z before cutover: quality 137877226173, governance 137877227697, unit-coverage 137877240912, javascript-typescript 137877228428, clean-room (ubuntu-latest) 137877227394, and clean-room (windows-latest) 137877226827. Rollback anchor: dpl_7X5xzARHaT7nXkzoHMoHiGxi1xfa at source 2a64d4ccc03e8f8ce1e415d298687321179efb50.

Since the prior release, this source includes scoped P0-03 owner-isolation coverage; P0-04 pure eight-state policy; P0-05 deterministic generation critical-path harness; P0-06 native and retained-upscale owner+job+expected-status compare-and-swap with typed already_terminal_or_changed and six race/replay regressions; the backend architecture overview; design-only atomic terminalize-and-release proposal; stale-PR housekeeping triage and conservative Phase 3 P0 scoring; and the seven-scenario offline backend demo (npm run demo:backend) with contributor documentation. The P0-06 application-runtime hardening is production-deployed, while a separate single-generation live fixture remains necessary for hosted acceptance. Previously qualified P0-02 typed runtime configuration, P0-03 privileged-error sanitization, invitation-only enforcement, FIBO mask capability, 16-name Production configuration, and owner-return reconciliation remain applicable. This release made no SQL migration, Modal/worker deployment, new secret, S.A.G.A. change, or resume edit. Atomic terminalization/release and never-return owner settlement remain known limitations; the Phase 3 42/60 gate is not declared met by cutover alone.

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

[Phase 1 correctness](docs/history/contracts/architecture/FIBO_BETA_CORRECTNESS_PHASE_1.md) and [Phase 2 operational reliability](docs/history/contracts/architecture/FIBO_OPERATIONAL_RELIABILITY_PHASE_2_CONTRACT.md) are closed with verification evidence. The current **Phase 3 — Backend professional baseline (P0)** is owner-approved, ordered P0-01 through P0-05, and governed by the [active execution contract](docs/architecture/BACKEND_PROFESSIONAL_BASELINE_P0_CONTRACT.md). It replaces creative productivity as the next implementation phase. **P0-01 and P0-02 are merged; P0-03a sanitized privileged errors is merged and production-live. P0-03b owner-isolation tests may start only after P0-03a Production Documentation Sync passes.** P1 provider/generalization follow-ons and future creative-productivity/frontend work stay deferred, not canceled. No runtime release is implied by a docs-only merge.

This handoff deliberately does **not** restate completed phase journals or infer new authority from historical plans.

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
