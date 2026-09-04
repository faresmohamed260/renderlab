# Project

RenderLab is an AI image/video creation platform using cloud-hosted ComfyUI workflows as the generation backend.

> Historical note: the detailed Project chronology and exact Phase 0–13 execution evidence that previously lived in this file is preserved verbatim in `docs/archive/PROJECT_PRE_CYCLE3_2026-09-03.md`. That archive is historical evidence, not a competing current source of truth. Current decisions in this file and the current architecture/UI documents take precedence.

## Product Direction
RenderLab is a fresh application, not a direct migration or visual clone of the previous Studio implementation in `saga`.

Saga is reference material for proven behavior, backend integration, workflow capability, persistence, job lifecycle and lessons learned. Its UI, navigation, component hierarchy, routing, deployed runtime and legacy tables are not the RenderLab specification.

## Product UX Principle
**Simple by default, powerful when needed.**

Users interact with understandable creative goals rather than ComfyUI graphs, worker routing or storage implementation. Advanced/model-specific controls are progressively disclosed only when useful.

## Stack
### Frontend
- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui Radix Nova + `radix-ui` through the approved maintained component ecosystem
- Motion for React `13.1.1` for feature-local, reduced-motion-aware interaction continuity
- RenderLab-owned normalized primitive layer under `src/components/ui`
- Server Components by default; Client Components for interactive feature behavior

### Infrastructure
- Vercel deployment target
- Cloudflare R2
- Supabase
- existing cloud-hosted ComfyUI/Modal worker fleet

RenderLab deliberately reuses Saga/Studio infrastructure resources while keeping RenderLab schema, storage prefixes, orchestration, APIs and product contracts independently named and owned. See `docs/architecture/INFRASTRUCTURE.md`.

## Product Architecture Direction
Generation is modeled as:

`Workflow → Inputs → Parameters → Generation Job → Outputs → Continuation Actions`

Generation inputs and media actions use opaque product identities. R2 storage keys, provider IDs and worker routing remain server-side implementation details.

The application must not require a browser session to complete accepted backend work. Once RenderLab accepts a generation, server-owned lifecycle machinery must be able to reconcile it to a truthful terminal state and durable output without relying on the initiating tab remaining open.

## Product Areas
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

## Current Verified Baseline — 2026-09-03
- Authoritative repository `main` before this Cycle 3 planning change: `61a4882faf89d85b94c5a6955d1bd9a4508d01f0`.
- Cycle 2 — Creative Productivity & Beta Maturity is `COMPLETE / VERIFIED`.
- Phase 13 — Email & Invite Production Hardening is `COMPLETE / VERIFIED`.
- Accepted production application remains exact Cycle 2 candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`.
- Closed-Beta enforcement is active in production. Final guarded Phase 13 cleanup preserved exactly one active admin, zero pending invitations and generation defaults enabled / one active job / 12 admitted per rolling hour / no updater.
- Production Auth invite/recovery mail uses verified Resend custom SMTP with branded token-hash templates and click/open tracking disabled. External Gmail invite/recovery acceptance completed; Outlook-specific rendering was not exercised.
- Automatic Git → Vercel deployment remains disabled. Documentation changes do not authorize or imply a production deployment.
- UI-054 mailbox sender-avatar/BIMI work remains research-only and is not a Cycle 3 implementation priority.

## Completed Product Foundation
RenderLab already has a substantial verified core. Cycle 3 must build on it rather than reopening completed phases.

- **Create:** Create Image, Edit Image, Create Video and Animate Image; durable Create uploads; source-aware geometry and curated ratios; stable `@imageN` reference addressing; bounded two-image Image/Edit references; Video audio; 480p/720p/1080p/2K resolution; reduced-motion-aware interaction continuity.
- **Library / Viewer:** durable uploaded/generated media; search; chronological ordering; drag/drop; Download; Rename; Favorites; Collections and collection management; permanent tombstone-first Delete; page-scoped batch Delete and batch organization; capability-derived continuation.
- **Activity:** account-private real job state and failed-job Retry from current-revalidated persisted product intent.
- **Account / Admin:** verified Supabase identity, account ownership, invitation-only admission, password recovery/change, fresh private authorization, privileged Admin account/access controls and transactional generation-admission guardrails.
- **Brand / Release:** public Landing, `/create` application routing, exact release-candidate validation, explicit production rollout, closed-beta enforcement and production custom-domain smoke.
- **Email:** production sender/domain configuration, Resend SMTP, branded invite/recovery templates, token-hash link integrity and bounded external mailbox acceptance.

Detailed historical evidence remains in the archived Project chronology plus `docs/ui/UI_MIGRATION.md`, `docs/ui/UI_DECISIONS.md` and the architecture documents.

## Cycle 3 — Reliability, Creative Iteration & Capability Growth
**Status: `IN PROGRESS — PHASE 14 COMPLETE / VERIFIED; PHASE 15 ROADMAP`.**

### Cycle 3 objective
Make RenderLab independently reliable after a generation is accepted, then turn one-shot generation into a deeper iterative creative workflow before expanding into another major creative capability.

The Cycle 3 order is intentional:
1. fix backend lifecycle correctness before adding more generation complexity;
2. add safe control/maintenance over that lifecycle;
3. improve the create → inspect → remix → refine loop;
4. strengthen observability and cheap engineering feedback;
5. add one evidence-backed new creative capability rather than a bundle of speculative screens.

### Locked Cycle 3 roadmap
- **Phase 13 — Email & Invite Production Hardening: `COMPLETE / VERIFIED`.** Existing production email/Auth evidence remains authoritative.
- **Phase 14 — Autonomous Generation Lifecycle & Durable Finalization: `COMPLETE / VERIFIED`.** Remove browser polling as a correctness dependency, make result finalization idempotent/recoverable and prove accepted jobs can reach durable terminal state with no active user tab.
- **Phase 15 — Generation Control & Maintenance: `ROADMAP`.** Build safe user cancellation only after Phase 14 establishes atomic lifecycle/reconciliation boundaries; add bounded maintenance for stale uploads/sources, pending media purges and other recoverable residue.
- **Phase 16 — Creative Iteration: `ROADMAP`.** Prioritize Remix / Reuse Settings, successful-job Run Again/recipe reuse and source/result comparison; evaluate Variations only after durable output-slot semantics from Phase 14 are known.
- **Phase 17 — Observability & Engineering Quality: `ROADMAP`.** Add structured lifecycle/error/capacity visibility and cheaper conventional static/unit verification without weakening the existing configured end-to-end gates.
- **Phase 18 — Next Creative Capability: `ROADMAP`.** Re-audit current deployed workers and select one coherent capability. Preferred evaluation order is Upscale/Restore, Inpainting/Outpainting, then LoRA/model adapters. Director Video remains blocked until deployed REDGraft exposes real structured Director semantics.

Later phases must be expanded only after their predecessors produce the evidence needed to plan them. This roadmap does not pre-approve every item listed under a later phase.

---

# Phase 14 Execution Contract — Autonomous Generation Lifecycle & Durable Finalization
**Status: `COMPLETE / VERIFIED`.**

## Goal / user value
An accepted RenderLab generation must finish truthfully even if the user closes the tab, loses connectivity or never polls that job again. Durable result persistence must be safe to retry after partial failures without creating duplicate product assets or silently orphaning result state.

The user-visible promise is simple:

> Once RenderLab accepts the job, RenderLab owns finishing and recording it.

This phase is primarily backend/infrastructure correctness. It does not redesign Create or Activity.

## Verified starting state
The following current-state facts were re-audited from `main` before this contract was locked:

1. **Native completion is poll-driven.** `GET /api/generation/jobs/[jobId]` calls `pollGenerationJob()`. Native polling reaches `pollNativeGeneration()`, which checks provider state and, when output is ready, performs the `persisting` transition, downloads the result, writes R2/media state and finally marks the job `succeeded`.
2. **There is no repository-owned autonomous reconciler today.** Current `vercel.json` declares Next.js and disables Git deployment; it defines no cron trigger. No other current repository path provides a server-owned periodic generation finalizer.
3. **Submission itself only reaches running state.** Native submission persists the job, submits to the selected worker and records worker/provider identity; durable output persistence happens later in the polling path.
4. **Current result finalization is not explicitly idempotent.** `persistResult()` creates a fresh random media asset ID and R2 key before inserting `media_assets` and then patching the job to `succeeded`. `media_assets.generation_job_id` is indexed but not a unique output-slot identity. A failure between those steps therefore requires a stronger reconciliation contract before repeated finalization can be considered safe.
5. **Retry already treats history correctly.** Failed-job Retry creates a distinct ordinary job and keeps the historical failed row immutable. Phase 14 must preserve that behavior.
6. **Worker failover already exists.** Native poll-time reassignment is conservative and bounded. Phase 14 must centralize lifecycle ownership without discarding verified failover behavior.
7. **Generation admission is transactional.** Create and Retry share server-enforced admission limits. Reconciliation must leave admission/reservation state truthful when jobs terminalize.
8. **Worker infrastructure reports cancellation capability, but RenderLab exposes no product Cancel contract.** Cancellation remains Phase 15 because atomic cancellation races depend on the lifecycle foundation built here.

## Required invariant
After successful generation admission/submission, browser polling is an optional status/read mechanism only. It must not be required for:
- detecting provider completion;
- persisting the durable result;
- terminalizing the RenderLab job;
- releasing/settling lifecycle state that depends on terminalization.

## In scope
### 14A — Reconciliation ownership and trigger
- Introduce one server-owned reconciliation entry point for active native RenderLab jobs.
- Establish a bounded autonomous trigger appropriate to the existing remote stack. Prefer existing infrastructure and no new paid service. Vercel Cron, Supabase scheduled execution plus a protected RenderLab endpoint, or another already-available remote mechanism may be selected only after verifying current plan/runtime constraints.
- The trigger must be authenticated/internal and must not grant ordinary browsers a new privileged job-management surface.
- Reconciliation must be safe when the same job is encountered repeatedly or concurrently.

### 14B — Idempotent durable finalization
- Define explicit durable output-finalization identity/semantics before changing schema. The contract must support safe retry after partial failure and must not paint the architecture into a one-output-only corner if Variations are later approved.
- Detect an already-persisted output before writing a duplicate product asset.
- Make the sequence across provider result, R2 object, `media_assets` and `generation_jobs` resumable. Re-running finalization after a crash must converge on one truthful product result for the same output slot.
- Preserve tombstone/ownership/history semantics and opaque product identity.
- Do not expose R2 keys, provider IDs or worker credentials through browser contracts.

### 14C — Partial-failure recovery
At minimum, recovery behavior must be defined and tested for failures at these boundaries:
- provider says ready before result download completes;
- R2 primary write succeeds but media metadata persistence does not;
- media metadata exists but job terminal patch does not;
- video poster/thumbnail handling partially fails;
- reconciliation invocation is interrupted and later retried;
- two reconciler invocations race on the same active job.

The accepted design must either clean safe-to-delete partial objects or adopt/reuse them deterministically. Silent duplicate durable assets are not acceptable.

### 14D — Stale-job and terminal-state reconciliation
- Define bounded treatment for jobs that remain nonterminal beyond the normal provider lifecycle without fabricating percentage progress or SLAs.
- Preserve existing safe poll-time worker reassignment semantics or replace them only with an equivalently verified server-owned state machine.
- Reconcile admission reservation/bind/release behavior with terminal state so autonomous completion does not leave artificial active-capacity pressure.
- Keep sanitized product errors separate from provider/internal diagnostics.

### 14E — Existing browser behavior becomes observational
- Create and Activity may continue polling for responsive status updates.
- Browser polling must become a read/refresh accelerator rather than the mechanism that makes backend progress durable.
- No shell-global client job store or broad navigation redesign is part of Phase 14.

## Explicitly out of scope
- User-facing Cancel. Phase 15 owns cancellation after atomic lifecycle behavior is proven.
- General stale upload/source/tombstone-purge cleanup. Phase 15 owns the broader maintenance sweeper; Phase 14 may clean only run-owned/partial artifacts required by generation finalization.
- Remix, Run Again for successful jobs, recipe UI, before/after comparison or Variations. Phase 16 owns creative iteration.
- LoRA/model-adapter productization, Upscale, Restore, Inpainting, Outpainting, structural guidance or Director UI.
- Generic Models/Workflows screens, ComfyUI graph editing, ordinary-user provider/worker controls or arbitrary workflow forms.
- Billing/credits, public signup, public-beta launch, MFA/account deletion or unrelated account work.
- Replacing the entire worker fleet, moving all generation bytes to a new transport architecture or introducing a new queue/service merely because it is fashionable. A larger transport change is allowed only if Phase 14 evidence proves the current Vercel-memory path cannot satisfy the accepted lifecycle safely.
- Production deployment. Implementation/merge does not authorize rollout.

## Architecture / contract boundaries
- `src/server/generation/submit-generation.ts` remains the ordinary product submission boundary shared by Create and Retry.
- `src/server/generation/native-generation.ts` current provider mapping/failover behavior is the starting implementation evidence, not a requirement to keep finalization inside a request handler.
- `src/server/generation/poll-generation.ts` and `GET /api/generation/jobs/[jobId]` must end Phase 14 without being required for correctness.
- `generation_jobs` remains the durable product job identity and history source.
- `media_assets` remains the durable product media identity; generated output reconciliation must integrate with existing owner, Delete, Favorites, Collections, Library and continuation semantics.
- Existing `generation_admission_reservations` semantics remain server-owned and must reconcile correctly with autonomous terminalization.
- Any scheduler/internal endpoint must use server credentials only and a narrow authorization boundary. Do not expose a general service-role execution surface.

## Data / schema implications
Do not assume a migration is required, but do not avoid one if correctness requires it.

Before DDL:
1. audit existing production `generation_jobs` ↔ generated `media_assets` cardinality and any historical anomalies;
2. define the durable output-slot/idempotency key semantics needed for current single-output jobs and possible future Variations;
3. prove upgrade/backfill behavior against existing rows;
4. use the smallest additive migration and preserve rollback/retry safety.

A naive unique constraint on `generation_job_id` is not automatically approved because future multiple-output jobs remain an accepted extensibility category. Prefer a contract that can represent output position/identity explicitly if schema evidence justifies it.

## Security / ownership implications
- Autonomous reconciliation runs with server privileges but remains owner-correct: every persisted output must retain the owning job/account identity already established at submission.
- Ordinary users must not be able to ask the reconciler to process foreign arbitrary job IDs or enumerate active jobs.
- Internal scheduling credentials/tokens must live only in approved secret stores.
- Provider error detail, worker routing and storage identity remain internal.
- Existing raw-table browser revocation/RLS posture must not be weakened to make reconciliation easier.

## Required validation matrix
### Pure/state-machine verification
- repeated reconciliation of a nonterminal job is idempotent;
- concurrent reconciliation of one job converges correctly;
- already-terminal jobs are no-ops;
- stale/missing/invalid worker metadata fails safely;
- current Retry history remains immutable and distinct;
- admission terminalization semantics remain correct.

### Fault-injection verification
Inject deterministic failures around at least:
- after result bytes are available but before R2 commit;
- after R2 primary write but before media commit;
- after media commit but before job success patch;
- thumbnail/poster handling;
- scheduler/reconciler interruption.

A subsequent reconciliation must finish or cleanly fail without duplicate durable media for the same output slot and without unowned/orphan test residue.

### Browser-independence verification
- submit an authenticated run-owned generation through the ordinary product contract;
- stop/avoid browser/job GET polling after acceptance;
- allow only the server-owned reconciliation mechanism to advance the job;
- prove the job reaches truthful terminal state and successful output appears through ordinary Library/Viewer reads;
- prove returning later to Activity/Create reads the already-durable state rather than causing first-time persistence.

Prefer a run-owned mock worker for exhaustive fault/race cases. Keep at least one bounded configured native worker case to prove the selected autonomous path maps correctly to real provider output without turning every race test into generation spend.

### Existing regression gates
At minimum re-run every workflow/path affected by shared generation lifecycle code, including:
- Generation Integration;
- Video Generation Integration;
- Create Lifecycle;
- Activity / Retry;
- Generation Admission;
- Account Ownership;
- Library/Viewer lifecycle where generated output persistence is consumed;
- Media Delete if generated-media finalization semantics change.

Run exact-head production build/static gates required by repository reality. Human UI review is required only if visible Create/Activity/Library states actually change.

### Cleanup / production safety
- exact run-owned Auth/job/media/source/upload/R2/admission fixtures return to baseline;
- no existing user media/history is touched by cleanup;
- Supabase grants/RLS/privileged-function posture remains clean;
- no Vercel production deployment or production scheduler mutation occurs without separate explicit rollout authorization.

## Documentation outputs
On verified Phase 14 completion, update:
- `PROJECT.md` — actual Phase 14 result/evidence and next-phase handoff;
- `docs/architecture/INFRASTRUCTURE.md` — selected autonomous trigger, credentials/scheduling and production operational boundary;
- `docs/architecture/PRODUCT_CAPABILITIES.md` — server-owned asynchronous lifecycle/finalization guarantees;
- `docs/architecture/FRONTEND_ARCHITECTURE.md` only if browser polling/status responsibilities materially change;
- `docs/ui/UI_MIGRATION.md` / `SCREEN_REGISTRY.md` only if visible Activity/Create behavior actually changes;
- migration documentation only if verified implementation adds schema.

## Phase 14 exit criteria
Phase 14 is complete only when all are true:
- an accepted native generation can reach terminal durable success with no browser polling after submission;
- the autonomous reconciliation path is bounded, authenticated and safe under repeated/concurrent invocation;
- durable result finalization is explicitly idempotent/recoverable across verified partial-failure boundaries;
- no duplicate product asset is created for the same reconciled output slot in the verified race/fault matrix;
- existing owner isolation, Retry history, worker failover and generation-admission behavior remain correct;
- exact configured fixtures and partial R2 objects are clean after verification;
- affected exact-head repository gates pass;
- authoritative docs match the verified implementation;
- no deployment is inferred from merge/validation.

Only after Phase 14 is `COMPLETE / VERIFIED` should Phase 15 be expanded into its execution-ready contract.

---

## Later Cycle 3 Direction — Roadmap Level Only
### Phase 15 — Generation Control & Maintenance
Directional goals:
- safe Cancel with atomic `running/cancelling/cancelled` semantics across provider completion, persistence, failover and admission release;
- bounded server maintenance for stale `media_upload_sessions`, temporary `generation_sources`, tombstoned assets with pending R2 purge and other explicitly proven recoverable residue;
- orphan/reconciliation audit tooling that never treats unknown user data as disposable;
- no broad worker/provider administration UI.

### Phase 16 — Creative Iteration
Directional priority:
1. **Remix / Reuse Settings** from persisted normalized generation intent, current-revalidated before submission;
2. successful-job **Run Again** / recipe reuse without pretending historical provider state is replayable;
3. source/result before-after comparison for Edit when the relationship is available;
4. evaluate Variations/multiple outputs after Phase 14 defines durable output-slot semantics;
5. prompt/settings history only if it can be owned cleanly without a premature global preset system.

### Phase 17 — Observability & Engineering Quality
Directional goals:
- structured server lifecycle logs and correlation IDs;
- truthful generation timing/failure/failover/capacity metrics without fake SLA or cost claims;
- operator visibility into stale jobs and cleanup backlog;
- evaluate Sentry/OpenTelemetry/Vercel-native tooling based on current cost/fit rather than adopting telemetry for its own sake;
- add conventional cheap `lint`, `typecheck` and focused unit-test scripts for pure contracts while preserving the existing configured Playwright/live integration gates;
- prefer typed worker/provider error codes over textual failure classification where gateway contracts can be improved safely.

### Phase 18 — Next Creative Capability
Run a fresh deployed-worker capability audit and choose exactly one coherent capability for the phase.

Preferred evaluation order:
1. Upscale / Restore — best fit for current durable-media continuation architecture;
2. Inpainting / Outpainting — high creative value but requires a deliberate mask/canvas interaction contract;
3. LoRA/model adapters — already accepted future direction, but requires source/version/hash/license/compatibility/cache/safety/persisted-intent contracts rather than a cosmetic model dropdown;
4. Director Video only after deployed REDGraft exposes structured scene/shot/action/dialogue/sound/camera semantics. Do not fabricate Director controls over one unstructured prompt.

This ranking is a planning preference, not implementation approval. Phase 18 must re-audit the then-current worker fleet before selection.

## Explicit Cycle 3 non-goals unless separately re-planned
- generic Models or Workflows destinations;
- ComfyUI node/graph editing for ordinary users;
- arbitrary worker/provider selection or raw workflow parameter forms;
- full billing/credits system;
- public self-sign-up or public-beta launch;
- broad cross-page media selection/global media client store;
- BIMI/VMC/CMC mailbox avatar work as a prerequisite for product development;
- claims about exact provider cost, autoscaling capacity, render-time SLA or deterministic model obedience without verified contracts.

Broader-beta account items such as leaked-password protection, MFA, account/data deletion/export and CAPTCHA remain real future considerations, but they are not allowed to displace the locked Phase 14 reliability priority unless the user explicitly changes the operating boundary.

## Phase Planning Protocol
Cycle roadmaps are directional. Before each phase starts, the immediate next phase must be expanded into an execution-ready contract from current repository, production and capability evidence. Later phases remain at roadmap level until predecessors are complete unless an early cross-phase constraint must be locked to avoid rework.

Each phase contract must cover goal, user value, verified starting state, in/out of scope, affected architecture/contracts, UI/UX decisions where relevant, backend/infrastructure dependencies, data/schema and security/ownership implications, validation, documentation outputs, exit criteria and next-phase dependencies.

Accepting a contract does not mark implementation complete, does not waive exact-head validation and does not authorize deployment.

## Immediate Handoff
After Phase 14 merges, the next substantial planning/implementation session must:
1. start from current `main`, not the historical archive or conversation memory;
2. re-read `AGENTS.md`, this `PROJECT.md`, `docs/ui/UI_MIGRATION.md` and the relevant generation/infrastructure architecture docs;
3. verify the merged Phase 14 lifecycle/reconciliation state and shared-resource baseline still match the recorded evidence;
4. expand **Phase 15 — Generation Control & Maintenance** into an execution-ready contract before implementing Cancel or broader maintenance work;
5. keep Phase 16+ at roadmap level and do not activate the Phase 14 production scheduler or deploy a new application candidate without separate explicit authorization.

## Phase 14 Implementation Verification — 2026-09-03
Phase 14 is `COMPLETE / VERIFIED` in the repository and shared validation infrastructure. This does **not** mean the Phase 14 application or scheduler is deployed to production.

Verified implementation head: `1b3927c98be2122fdbd1b5754fc67cddfcf675ca`.

- Native accepted generations can progress through a server-owned protected reconciliation path without the initiating browser remaining open. Browser GET polling now reuses the same reconciliation claim and is observational/accelerating rather than a correctness dependency.
- Active jobs use short-lived owner/job reconciliation claims. Concurrent invocations, abandoned leases and retries converge without producing duplicate durable output slots.
- Generated output identity is deterministic per `generation_job_id + generation_output_index`; the current single output occupies slot `0`, while the schema can represent later multi-output work without a naive one-job/one-asset uniqueness constraint.
- Partial finalization is resumable across provider-ready/download failure, R2-primary-write success before media metadata, media metadata before terminal job patch and interrupted reconciliation. A `persisting` retry first adopts existing canonical media or the deterministic R2 object before requiring provider re-download, so already-owned durable bytes can finish even after provider output expires.
- Optional video poster persistence is non-fatal to a valid primary video result.
- Retryable provider outages have a bounded two-hour stale lifecycle; product-visible errors remain sanitized while worker/provider diagnostics remain server-side.
- Terminalization settles bound admission capacity. The scheduler-vs-bind race is atomic for local terminal jobs, while accepted external-backend job UUIDs without local `generation_jobs` rows retain the established conservative bound reservation behavior.
- Historical duplicate-linked media was audited before DDL. Exactly two succeeded historical jobs had one canonical `output_asset_ids` entry plus one extra linked media row; migration backfill indexed only the canonical slot and preserved each historical extra with `generation_output_index = NULL`. No destructive cleanup was performed.
- Shared Supabase migrations applied: `20260903015917 renderlab_generation_reconciliation`, `20260903053454 renderlab_generation_admission_terminal_bind`, and corrective additive `20260903093654 renderlab_generation_admission_external_bind`.
- Phase 14 privileged RPCs remain `SECURITY DEFINER`, use an empty `search_path`, and are executable by `service_role` only; browser table grants were not opened.
- Supabase Security/Performance Advisor output has no new Phase 14-specific finding. Existing deliberate server-owned RLS/no-policy INFO, leaked-password-protection WARN, singleton `updated_by` FK INFO and low-traffic unused-index INFO remain tracked separately.
- `pg_cron` and `pg_net` are not enabled. The intended eventual autonomous trigger remains Supabase Cron/pg_net calling the protected RenderLab endpoint, but no schedule or production reconciler secret is activated by this implementation.
- The connected Vercel team remains Hobby and created zero RenderLab deployments on 2026-09-03 during Phase 14 implementation. Automatic Git → Vercel deployment remains disabled; production still runs the previously accepted Cycle 2/Phase 13 application.

Exact implementation-head validation:
- Generation Reconciliation: `33739813039`
- Generation Admission: `33739812977`
- Generation Integration: `33739812999`
- Video Generation Integration: `33739813116`
- Create Lifecycle Visual: `33739813138`
- Activity Visual: `33739813077`
- Account Ownership: `33739813067`
- Integrated Release: `33739812996`
- UI Shell Validation: `33739813080`
- Brand / Launch Visual: `33739813036`

Phase 15 remains roadmap-only. Phase 14 does not add user-facing Cancel, a general maintenance sweeper, creative iteration features or a production rollout.
