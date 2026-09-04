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
**Status: `IN PROGRESS — PHASE 14 COMPLETE / VERIFIED; PHASE 15 CONTRACT ACCEPTED / IMPLEMENTATION NOT STARTED`.**

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
- **Phase 15 — Generation Control & Maintenance: `CONTRACT ACCEPTED / NOT STARTED`.** Add safe owner-scoped native-generation cancellation on top of Phase 14 lifecycle claims, plus narrowly bounded maintenance for proven stale staging and pending media purges. Production rollout/scheduling remains separate.
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
**Execution contract:** accepted below. Implementation has not started.

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
Phase 15 now has an accepted execution contract. The next implementation session must:
1. start from current `main` and re-read the required governance/architecture documents;
2. implement **Phase 15 — Generation Control & Maintenance** exactly within the accepted contract below;
3. preserve Phase 14 reconciliation/output-slot/admission invariants and the existing no-deployment/no-production-scheduler boundary;
4. keep Phase 16+ at roadmap level until Phase 15 is complete/verified;
5. never infer that contract acceptance authorizes a Vercel production deployment, Supabase scheduler activation or destructive cleanup outside the explicit eligibility rules.

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

Phase 15 now has an accepted execution contract but implementation has not started. Phase 14 itself did not add user-facing Cancel, a general maintenance sweeper, creative iteration features or a production rollout.

## Phase 14 Post-Merge Closure — 2026-09-04
PR #93 merged Phase 14 to `main` as `abdadf36c52e37756dcb62dd696b97a72448f94b` from exact final PR head `3df73ff212abb6fbf8dd0cd7a85232804dc5e4dd`.

Merged-main push validation passed all five path-triggered gates: Generation Reconciliation `33904575007`, Reference Upload Integration `33904574913`, Video Generation Integration `33904574912`, Generation Integration `33904575065`, and UI Shell Validation `33904574999`. The configured Image and REDGraft Video/Animate suites completed against real provider infrastructure and their cleanup completed successfully.

Final shared-resource audit after those runs found zero RenderLab fixture Auth users, jobs, media assets, or generation-admission reservations; zero active reconciliation claims; zero duplicate indexed generation output slots; and generation defaults restored to enabled / 1 active / 12 hourly / `updated_by=null`. The two historical succeeded jobs with one noncanonical extra linked media row each remain deliberately preserved, with exactly two historical `generation_output_index = NULL` extras.

Production state did not change: `pg_cron` and `pg_net` remain disabled, Vercel recorded zero RenderLab deployments created since the Phase 14 merge, and no production reconciliation schedule/secret was activated. Phase 15 is the next implementation phase; its execution contract is accepted below, but implementation has not started.


---

# Phase 15 Execution Contract — Generation Control & Maintenance
**Status: `ACCEPTED / IMPLEMENTATION NOT STARTED`.**

## Goal / user value
Give an account owner one safe way to stop an active RenderLab-native generation and add narrowly bounded server maintenance for proven stale staging/purge residue without risking durable history, reusable media or future Retry inputs.

The cancellation promise is deliberately precise:

> If RenderLab accepts Cancel before durable result persistence begins, that attempt will never later publish a durable result. If durable persistence has already begun, the result wins and Cancel is no longer available.

`cancelled` is a RenderLab product terminal state. Provider compute may already be in flight; the product guarantee is that accepted cancellation prevents later RenderLab failover/finalization/publication for that attempt while the server also makes a bounded best-effort provider cancellation request.

## Verified starting state — 2026-09-04
1. Phase 14 is merged/verified on `main`: lifecycle reconciliation uses server-only claim token + lease state, generated output slot `0` is idempotent, terminal admission settlement is fixed, and browser polling is observational rather than a correctness dependency.
2. `GenerationJobStatus` and the database already recognize terminal `cancelled`, but there is no `cancelling` state, no owner-facing Cancel API and no Cancel control. Activity can render `Cancelled`; failed-job Retry remains the only Activity mutation.
3. Native active reconciliation serializes `queued|preparing|running|persisting` through the Phase 14 claim. Poll-time failover and durable finalization therefore have one existing server-owned mutual-exclusion boundary that Phase 15 can reuse.
4. `persisting` means durable result finalization has begun. Phase 15 must not attempt to reverse a job once that transition wins.
5. Current FLUX and REDGraft gateway implementations advertise `cancel_jobs=true` and expose `DELETE /jobs/{call_id}`. Qwen reference infrastructure also advertises cancellation, but Qwen is not the current user-facing Image/Edit route.
6. The optional authenticated external RenderLab generation backend has submit/poll contracts but no currently verified cancellation contract. Phase 15 v0.1 therefore does not advertise Cancel for external-backend work.
7. Shared-state maintenance audit found exactly four non-fixture `generation_sources`, all older than 24 hours: two `pending` and unreferenced; one `ready` and unreferenced; one `ready` and referenced by persisted job intent. The referenced source is protected because current Retry can still depend on ready temporary-source history.
8. The same audit found `0` `media_upload_sessions`; all 12 tombstoned media assets already have `purged_at` set, with `0` pending media purges. These zero backlogs are evidence against a broad speculative sweeper.
9. `pg_cron` and `pg_net` remain disabled; no production reconciler/maintenance schedule or secret is active; automatic Git → Vercel deployment remains disabled.

## Required invariants
- **One lifecycle writer:** Cancel, provider polling, failover, finalization and cancellation reconciliation must serialize through the Phase 14 lifecycle claim or an equivalently strict claim-token compare-and-set guard.
- **Persistence wins once started:** `persisting|succeeded|failed|cancelled` are never cancellable. A race that reaches `persisting` before Cancel acquires the lifecycle claim returns current truth rather than undoing durable work.
- **Cancel wins before persistence:** once an eligible job is atomically moved to `cancelling`, ordinary provider polling/failover/finalization must never adopt a later result or create a durable output for that attempt.
- **No failover after cancellation intent:** `cancelling` jobs retry cancellation against the currently recorded provider call only; they never submit a standby replacement.
- **Admission stays conservative:** a `cancelling` job remains capacity-active until it terminalizes `cancelled`; bound admission is released exactly when terminal cancellation is recorded.
- **Unknown history is not garbage:** maintenance never deletes job history, durable media, referenced temporary sources or unknown R2 objects merely because they are old.

## In scope
### 15A — Native cancellation state and owner API
- Add a normalized intermediate `cancelling` generation status between active work and terminal `cancelled`.
- Add owner-scoped `POST /api/generation/jobs/[jobId]/cancel`. The browser supplies only the historical job ID; it never supplies worker ID, provider call ID, storage identity or execution payload.
- Expose a product-level `canCancel` capability on Activity rows rather than making the client infer provider/backend details.
- v0.1 cancellation eligibility is limited to RenderLab-native jobs whose current state is `queued`, `preparing` or `running` and whose server-owned dispatch identity is sufficient to cancel safely. `persisting` and all terminal states are not cancellable.
- Missing/foreign jobs preserve the existing not-found privacy boundary. Repeated Cancel requests are idempotent and return/refresh current product truth rather than starting another execution action.
- Optional external-backend jobs remain non-cancellable in v0.1 unless a separately authenticated external cancel contract is implemented and verified during this phase. Do not fabricate support from a local status alone.

### 15B — Cancellation/provider race semantics
- Acquire the Phase 14 lifecycle claim before accepting cancellation intent, then re-read current state under that claim.
- Transition to `cancelling` only through a claim-token/CAS-guarded mutation from eligible active states.
- Attempt `DELETE /jobs/{providerJobId}` only against the currently recorded native worker. Bound each provider cancellation request with an explicit timeout.
- A confirmed provider cancellation terminalizes the RenderLab job as `cancelled`, sets ordinary terminal timestamps and releases admission.
- A recognized provider-not-running/expired response may terminalize as `cancelled` only while the job is still claim-owned `cancelling` and no durable indexed output exists.
- Ambiguous/transient cancellation failures leave the job `cancelling`; server-owned cancellation reconciliation retries the same provider call. It never reassigns the job or resumes ordinary result persistence.
- Cancellation reconciliation must be bounded. If provider acknowledgement remains unavailable beyond the accepted retry/grace policy, RenderLab may terminalize locally as `cancelled` while recording internal diagnostics, because the product has already committed to discarding any late result. User-facing copy must not claim that provider compute stopped instantaneously.
- If `persisting` wins before cancellation intent is accepted, the durable-result path continues and Cancel fails closed with refreshed current state.

### 15C — Browser/UI behavior
- Activity remains the v0.1 Cancel surface; do not add another top-level destination or shell-global job manager.
- An eligible active row gets a compact Cancel action using the maintained Button + AlertDialog primitives. Confirmation copy states that the attempt cannot be resumed and a late result will not be published if cancellation is accepted.
- `cancelling` is rendered truthfully (for example `Cancelling`) and remains auto-refreshed as active server-owned state. The Cancel action is not repeated while cancellation is already pending.
- Existing `Cancelled`, failed Retry and succeeded View Result behavior remain unchanged. Cancelled jobs do not become Retry-eligible; successful Run Again/recipe reuse remains Phase 16.
- Create may render the new `cancelling` status if it is observing that job, but the cancellation action itself remains Activity-owned in v0.1.
- No provider name, worker identity, queue position, invented percentage or SLA is exposed.

### 15D — Bounded stale staging / purge maintenance
Implement one server-owned bounded maintenance pass with per-category limits; it is not a general database/R2 garbage collector.

**Temporary `generation_sources`:**
- candidate must be at least 24 hours old;
- candidate must be `pending`, `ready` or `failed` staging state that has no persisted `generation_jobs.inputs` reference to that exact temporary-source ID;
- referenced sources are always skipped regardless of age;
- delete the known R2 object first (object already absent counts as success), then delete the staging row; if R2 deletion fails, retain the row for retry.

**`media_upload_sessions`:**
- v0.1 maintenance may clean only old nonterminal `pending`/`failed` sessions at least 24 hours old that are not linked to a promoted durable asset;
- delete the known staging R2 object first, then delete the session row;
- completed/promoted sessions and durable uploaded media are not age-purged.

**Pending media purges:**
- select only assets already tombstoned (`deleted_at IS NOT NULL`) with `purged_at IS NULL`;
- retry the existing primary/thumbnail R2 deletion semantics idempotently;
- set `purged_at` only when every known object deletion succeeds or the object is already absent;
- never hard-delete the durable media row or generation history as part of maintenance.

**Audit-only anomalies:**
- report counts for stale-but-referenced sources and other job/output/history anomalies discovered by maintenance;
- do not automatically delete/reclassify unknown or historically anomalous user data;
- preserve the two known Phase 14 historical noncanonical output rows.

### 15E — Internal execution / scheduling boundary
- Cancellation reconciliation may extend the existing server-owned generation reconciliation path to include `cancelling` jobs, while ordinary active reconciliation continues to exclude them from result persistence/failover.
- Maintenance logic should live in RenderLab server code with a narrow authenticated internal invocation surface if one is required for remote execution. Do not expose service-role capability to ordinary browsers.
- No production scheduler is activated by implementation or merge. `pg_cron`/`pg_net`, any maintenance secret and any periodic schedule remain a separate rollout decision tied to an explicitly deployed application candidate.
- Do not create a new paid queue/service or broad worker administration plane for this phase.

## Explicitly out of scope
- Cancel for the unverified optional external generation backend unless its authenticated cancellation contract is independently proven during Phase 15.
- Cancelling work that has already entered `persisting` or reversing a terminal result.
- Retry of cancelled jobs, successful-job Run Again, Remix/Reuse Settings, recipe UI, Variations or source/result comparison; Phase 16 owns creative iteration.
- Broad R2 prefix scans, age-based durable-media deletion, hard-deleting generation history, cleanup of referenced temporary sources or automatic repair of unknown historical anomalies.
- Generic worker/provider administration, model/workflow screens, ComfyUI graphs, billing/credits or infrastructure controls.
- Production Vercel deployment, production reconciliation/maintenance schedule activation or enabling `pg_cron`/`pg_net`.
- UI-054/BIMI sender-avatar work or unrelated account/email changes.

## Architecture / API boundaries
- `src/server/generation/reconcile-generation.ts` remains the lifecycle claim/reconciliation owner. Phase 15 cancellation must reuse its mutual-exclusion invariant rather than creating a second uncoordinated job-state writer.
- `src/server/generation/native-generation.ts` remains the native worker adapter/finalization boundary; cancellation-aware guards must prevent its poll reassignment/persist path from progressing a `cancelling|cancelled` job.
- `src/server/generation/submit-generation.ts` remains ordinary Create/Retry submission. Cancel is a mutation of the accepted job, never a new submission.
- `generation_jobs` remains immutable creative intent/history plus mutable lifecycle state. Cancel does not create a replacement job or erase prompt/input/failover history.
- `generation_admission_reservations` remains server-owned; cancellation settlement uses the same terminal release contract as success/failure.
- `generation_sources`, `media_upload_sessions` and tombstoned `media_assets` keep their existing ownership/storage identity. Maintenance uses only known row-owned storage keys and never infers arbitrary R2 ownership from prefixes.
- Activity remains server-owned data with a small feature-local mutation component; no global client job store is introduced.

## Data / schema implications
A small schema change is expected for correctness:
- extend the `generation_jobs.status` database constraint and TypeScript status union to include `cancelling`;
- update lifecycle indexes/queries only where the new state must be scanned or protected;
- prefer the existing reconciliation token/lease as the synchronization primitive. Do not add a parallel cancellation table, broad event log or generic job-version system unless implementation evidence proves claim-token CAS is insufficient.

No maintenance schema migration is pre-approved merely for age tracking: current `created_at`/`updated_at`, ownership, storage keys, tombstone fields and persisted job inputs are sufficient starting evidence. If implementation discovers a real schema gap, stop and amend this contract before adding unrelated DDL.

Historical rows are not rewritten merely to populate cancellation metadata. Terminal `cancelled` continues to use ordinary job terminal timestamps; provider diagnostics remain server-internal.

## Security / ownership implications
- Cancel requires the same fresh verified account boundary as other private generation mutations and is owner-scoped by job ID.
- Browser-visible `canCancel` is a capability boolean only; worker/provider IDs, cancellation endpoints and service secrets remain server-only.
- Provider cancellation targets are reloaded from the owner-scoped job row; never trust browser-supplied routing identity.
- Foreign/missing jobs collapse to not-found. Race/conflict responses reveal only current product state.
- Maintenance runs with server privilege but must enforce the explicit eligibility predicates above before any R2/row deletion.
- Maintenance never uses age alone as proof of disposability when a persisted job reference exists.
- Existing RLS/browser-grant revocation and privileged-function empty-search-path posture must not be weakened.

## Required validation matrix
### Cancellation state-machine / race verification
Using a run-owned mock worker and deterministic barriers/faults, prove at minimum:
- eligible `queued|preparing|running` native job -> `cancelling` -> `cancelled`;
- `persisting`/terminal jobs reject Cancel without mutation;
- simultaneous Cancel requests converge idempotently;
- Cancel racing an ordinary poll/finalization claim has one winner and no split-brain lifecycle;
- Cancel racing safe standby reassignment either cancels the newly committed current call or loses before cancellation intent; it never spawns another standby after `cancelling`;
- provider completes immediately before/after Cancel: if persistence won, result survives; if cancellation intent won, no durable output slot/media asset is later created;
- transient/ambiguous provider cancel failure remains `cancelling` and bounded cancellation reconciliation retries without failover;
- recognized provider-not-running/expired response resolves without fabricating a durable result;
- admission remains active while `cancelling` and is released exactly once on terminal `cancelled`;
- cancelled jobs stay non-retryable under UI-050.

### Maintenance fixture verification
Create exact run-owned database/R2 fixtures and prove:
- stale pending unreferenced temporary source is removed;
- stale ready unreferenced temporary source is removed;
- stale ready **referenced** temporary source is preserved;
- recent unreferenced temporary source is preserved;
- stale pending/failed unpromoted media upload staging is removed;
- completed/promoted upload state and durable media are preserved;
- tombstoned pending-purge asset reaches `purged_at` only after primary/thumbnail objects are absent;
- an injected object-delete failure leaves the purge/staging row retryable rather than claiming cleanup;
- unknown/historical anomalies are reported only;
- bounded per-category limits are respected and repeated maintenance converges idempotently.

### Configured native cancellation verification
Run a bounded exact-head cancellation case against each currently user-facing native ecosystem:
- one FLUX Image/Edit job accepted then cancelled through the RenderLab product API;
- one REDGraft Video/Animate job accepted then cancelled through the same contract;
- verify provider cancellation mapping, terminal `cancelled`, no durable output asset, admission cleanup and exact run-owned Supabase/R2/Auth cleanup.

Keep the live cases intentionally small and cancellation-immediate; exhaustive race/error coverage belongs to the run-owned mock worker rather than provider spend.

### Browser / responsive verification
Activity configured verification must exercise:
- eligible active row with Cancel action;
- confirmation dialog keyboard/pointer behavior;
- accepted `cancelling` feedback and auto-refresh to `Cancelled`;
- Cancel absent for `persisting`, succeeded, failed, cancelled and unsupported/non-cancellable rows;
- unchanged failed Retry and succeeded View Result actions;
- desktop and narrow layouts plus reduced-motion behavior where existing Activity loading motion applies.

### Minimum affected regression gates
At minimum include every path actually touched, expected to cover:
- UI Shell Validation / UI purity;
- Activity;
- Generation Reconciliation;
- Generation Admission;
- Generation Integration;
- Video Generation Integration;
- Account Ownership;
- Create Lifecycle if shared status rendering changes;
- Reference Upload Integration;
- Persistent Media Upload Integration;
- Media Delete;
- Integrated Release when shared lifecycle/internal routing changes warrant it.

Path filters must be audited so the final exact implementation head really triggers the affected matrix. Hosted-minutes pressure does not waive final exact-head validation.

## Documentation / handoff outputs
Before Phase 15 can be marked complete:
- update `PROJECT.md` from this contract to verified implementation/merge evidence;
- record the durable Cancel decision/evidence in `docs/ui/UI_DECISIONS.md`;
- update `docs/ui/UI_MIGRATION.md` Phase 15 checklist/status from actual verification;
- update `docs/ui/SCREEN_REGISTRY.md` only after Activity Cancel is implemented/visually verified;
- update `docs/architecture/PRODUCT_CAPABILITIES.md`, `FRONTEND_ARCHITECTURE.md` and `INFRASTRUCTURE.md` for implemented cancellation/maintenance/schema/internal-trigger reality;
- record exact migrations, workflow run IDs, live provider cases, cleanup counts and production deployment/scheduler state.

## Exit criteria
Phase 15 is `COMPLETE / VERIFIED` only when:
- owner-facing native Cancel is implemented with an intermediate cancellation state and one serialized lifecycle writer;
- race/fault tests prove cancellation cannot resurrect into failover/persistence or create a late durable output after cancellation intent wins;
- `persisting`/terminal result truth cannot be reversed by Cancel;
- cancelled terminalization settles admission correctly and remains browser-independent;
- bounded maintenance cleans only explicitly eligible stale staging/pending purge residue and preserves referenced/unknown history;
- the currently audited old unreferenced temporary-source residue is re-audited and any actual cleanup is performed only through the verified eligibility contract; the referenced historical source remains protected unless its job reference is deliberately removed by a future product decision;
- configured FLUX and REDGraft cancellation mapping passes on the exact implementation head;
- affected exact-head CI/browser gates pass and exact fixtures are clean;
- authoritative docs match implementation reality;
- no production deployment, maintenance/reconciliation schedule or `pg_cron`/`pg_net` activation is inferred from implementation/merge.

Only after Phase 15 is `COMPLETE / VERIFIED` should Phase 16 be expanded into its execution-ready Creative Iteration contract.
