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

Accepted generation dispatch and recovery do not require the initiating browser to remain open. For this beta, a finished job may settle to a durable terminal state on the owner's next Create, Library, Activity or blocked-submit return; owners who never return are not guaranteed unattended finalization. The Phase 2 policy was reaffirmed by the owner at Phase 4 closeout; H1 restores late-return settlement for retained ready results, not a background scheduler. Revisit at materially larger beta user count, significant dormant-result accumulation or retention risk.

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

## Current production - 2026-11-26
<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: fb84c89cb41b42fcceeb0ba0fc132959a1368107 -->

Canonical record: docs/production/current.json identifies source `fb84c89cb41b42fcceeb0ba0fc132959a1368107`, READY deployment `dpl_FVt77brpWxKkKYJQCjUtLbr9wTcn` (`https://renderlab-djs4imuqi-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681`, project `prj_APU35jTnge27D2MAFjuc7GP0Dd6I` at `2026-11-26T22:43:54.413Z` (independent head-engineer team-account read-back; updatedAt 1795733034413; redirect null; deployment created 2026-11-26T22:38:41.590Z, READY 2026-11-26T22:39:09.330Z). Deployment Readiness #45901479925 passed at `2026-11-26T21:56:50Z` (job 140188038893); all six exact-source protected checks passed: quality 140188039670, governance 140188038887, unit-coverage 140188038526, javascript-typescript 140188038767, clean-room (ubuntu-latest) 140188038681, clean-room (windows-latest) 140188038918. Qualified at `2026-11-26T21:58:03.000Z`, before cutover. Rollback anchor: READY deployment `dpl_Fn5yNhNWz7owH9tMqi5cSbs3Y4WE` at source `34efe0b84ac1d950581d7b371b65bbf331852e89`.

Phase 6: app-only UI redesign, including Landing, Create, Library, Settings, History and scoped Admin presentation; Activity retains its signed-out 200 contract. Production environment inventory 16/16; staged Production build READY. Migration 0037 (ledger 20261124090831), Modal renderer v13 and gateway/dispatcher v14, and worker tree 4633471969d96f3b3a861a15edadd835253d85b4 unchanged. Ordinary generation submit/admission/dispatch/payload paths unchanged; History adds retry/run-again entry points. No verification generation was run (owner authorized zero spend). Head-engineer read-only database evidence: empty outbox, no non-terminal jobs, dispatcher heartbeat with zero unresolved dispatches. Hosted signed-out HTTP run 45905056828 (job 140199724980) passed; local Batch G/candidate comparison and authenticated staged read-back preserved /create, /activity, /library 200 and /admin 404 without Location. Post-promotion cookie-free HTTP and browser checks passed: Landing, Create, Library and Settings 200, Activity 200, Admin 404, no Location; signed-out private-state markers present, Settings sign-in and Create rendered, no runtime error/fatal records, Batch G rollback still READY. No rollback required. Holds #813, #748, #603 and #625 remain. Release source/readiness evidence: `docs/audits/2026-11-26-phase6-production-preflight.md`, `docs/audits/2026-11-26-phase6-final-acceptance.md`, and `docs/audits/2026-11-25-release-readiness-main-0d83c87.md`. Prior Batch G evidence: `docs/audits/BATCH_G_RELEASE_EVIDENCE_2026-11-24.md`. Repository closure remains pending Production Documentation Sync.


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

[Phase 1 correctness](docs/history/contracts/architecture/FIBO_BETA_CORRECTNESS_PHASE_1.md), [Phase 2 operational reliability](docs/history/contracts/architecture/FIBO_OPERATIONAL_RELIABILITY_PHASE_2_CONTRACT.md), [Phase 3 backend P0](docs/audits/PHASE3_BACKEND_P0_CLOSEOUT_2026-11-23.md) and [Phase 4 backend P1](docs/audits/PHASE4_BACKEND_P1_CLOSEOUT_2026-11-24.md) are closed with bounded evidence and recorded residual gaps. **On 2026-11-24 the project owner signed off the backend-first gate and authorized frontend work to resume in Integration Mode, not Authorized Redesign Mode.** [Phase 5 frontend polish](docs/architecture/FRONTEND_PHASE5_POLISH_CONTRACT.md) is merged (#677); correctness remains Integration Mode, P5-03 is deferred to later Admin Observe. Human independent engineer review is optional; third AI-assisted verification review result remains separately tracked. The owner subsequently authorized Phase 6 whole-site visual/motion design in Authorized Redesign Mode; [Design Language V2](docs/ui/DESIGN_LANGUAGE_V2.md) expands P6-01 documentation only, with no implementation until explicit design review and separate contract. New capabilities and unrelated backend work require separate scope. No runtime release is implied by a docs-only merge.

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
