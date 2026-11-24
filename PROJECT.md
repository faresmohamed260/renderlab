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

## Current production - 2026-11-24
<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: 80194dfe654bd7c34660c4679a8c97542db94387 -->

Canonical record: docs/production/current.json identifies source `80194dfe654bd7c34660c4679a8c97542db94387`, READY deployment `dpl_32ns93K9T2tRVQ2azrcBxJBy5238` (`https://renderlab-igi59d5u6-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681` at `2026-11-24T09:16:04.401Z` (independent team-account alias read-back; updatedAt 1795511764401; createdAt unchanged 2026-11-21T02:01:08.378Z). Deployment Readiness #45362418421 passed at `2026-11-24T09:09:32Z`; all six exact-source protected checks passed: quality 138328819253, governance 138328820761, unit-coverage 138328818867, javascript-typescript 138328860614, clean-room (ubuntu-latest) 138328819647, clean-room (windows-latest) 138328820347. Qualified at `2026-11-24T09:09:32.000Z`, before cutover. Rollback anchor: `dpl_7Q8CbxmgWJW5qmizzHtBXcoNP8HY` at source `aeb43cb508297e22c52d87de4df747cbd7c8516a`.

Batch E: all eleven ordered PRs qualified and merged (#678/#679/#680/#676/#671/#669/#672/#670/#673/#675/#674), then docs #684 and #686; #687 deferred. Additive 0037 installed (ledger 20261124090831); bounded dispatch claim signature/defaults and service_role/dispatcher-only grants unchanged, attach-only at cap verified by catalog, jobs 70 and outbox 0 with identical before/after digests. Captured pre-0037 function/ACL rollback text in `docs/audits/BATCH_E_MIGRATION_0037_ROLLBACK_2026-11-24.md`; migration remains installed unless separately authorized. Real production environment preflight passed. Renderer v13 at 09:26:58Z, gateway/dispatcher v14 at 09:27:00Z, tag 80194df, worker tree 4633471969d96f3b3a861a15edadd835253d85b4; rollback renderer v12/gateway v13. Landing/health HTTP 200, Admin fresh heartbeat 35s, zero active jobs/reservations/expired claims/unresolved. FE-01 Edit attaches source and Reuse Settings restores original prompt, seed 1889046298, 4 steps and 1:1 recipe. Preferences MFA and malformed non-FIBO API probes not completed because WANDA was preempted. Verification generation explicitly pending at record merge; 0/1 consumed. Historical Batch D evidence: `docs/audits/BATCH_D_RELEASE_EVIDENCE_2026-11-24.md`. Batch E evidence: `docs/audits/BATCH_E_RELEASE_EVIDENCE_2026-11-24.md`.


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

[Phase 1 correctness](docs/history/contracts/architecture/FIBO_BETA_CORRECTNESS_PHASE_1.md), [Phase 2 operational reliability](docs/history/contracts/architecture/FIBO_OPERATIONAL_RELIABILITY_PHASE_2_CONTRACT.md), [Phase 3 backend P0](docs/audits/PHASE3_BACKEND_P0_CLOSEOUT_2026-11-23.md) and [Phase 4 backend P1](docs/audits/PHASE4_BACKEND_P1_CLOSEOUT_2026-11-24.md) are closed with bounded evidence and recorded residual gaps. **On 2026-11-24 the project owner signed off the backend-first gate and authorized frontend work to resume in Integration Mode, not Authorized Redesign Mode.** Phase 5 frontend polish is next for progressive planning after the merged frontend QA pass, code audit and test strategy; implementation requires its reviewed, merged contract. Preserve approved surfaces and current backend/API contracts. Human independent engineer review is optional; third AI-assisted verification review result remains pending. New capabilities, redesign, and unrelated backend work require separate scope. No runtime release is implied by a docs-only merge.

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
