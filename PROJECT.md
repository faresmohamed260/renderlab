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
- **Activity:** account-private real job state, failed-job Retry from current-revalidated persisted product intent, and owner-scoped native Cancel before durable persistence begins.
- **Account / Admin:** verified Supabase identity, account ownership, invitation-only admission, password recovery/change, fresh private authorization, privileged Admin account/access controls and transactional generation-admission guardrails.
- **Brand / Release:** public Landing, `/create` application routing, exact release-candidate validation, explicit production rollout, closed-beta enforcement and production custom-domain smoke.
- **Email:** production sender/domain configuration, Resend SMTP, branded invite/recovery templates, token-hash link integrity and bounded external mailbox acceptance.

Detailed historical evidence remains in the archived Project chronology plus `docs/ui/UI_MIGRATION.md`, `docs/ui/UI_DECISIONS.md` and the architecture documents.

## Cycle 3 — Reliability, Creative Iteration & Capability Growth
**Status: `IN PROGRESS — PHASE 16 COMPLETE / VERIFIED; PHASE 17 CONTRACT EXPANSION NEXT`.**

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
- **Phase 15 — Generation Control & Maintenance: `COMPLETE / VERIFIED`.** Owner-scoped native cancellation serializes through the Phase 14 lifecycle claim, and bounded staging/purge maintenance is implemented with race-safe cleanup claims. Production rollout/scheduling remains separate and is not active.
- **Phase 16 — Creative Iteration: `COMPLETE / VERIFIED`.** Shared current-valid recipe reconstruction, Create Reuse Settings, successful Activity Run Again and conditional durable Viewer Compare source are implemented. Exact implementation head `4d1a495a8145238e1e78756c7b09cdbaee8d8115` passed all 26 affected workflows, including Creative Iteration `33964679539`. Final artifact `9969057974` (`sha256:cc20206371324f0698433731294924105174943cc0176dfd4ce9264fee6e8df5`) was independently hash-checked and human-reviewed across Image→Image and Image→Video desktop/narrow renders; the accepted PR #100 Result-primary/contextual-Source hierarchy, truthful media geometry, `Open source` / `Close comparison` hierarchy, result-owned Prompt/Details/Continue/Actions and narrow no-overflow behavior all matched, with configured verification separately proving preserved native video controls, keyboard activation and reduced-motion. No corrective implementation change was required. Variations remains explicitly deferred because current worker/product execution still returns one output per job and has no approved output-count semantics. Phase 17 contract expansion is next; production rollout remains separate and unauthorized by this completion.
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

## Cycle 3 Direction Beyond Phase 14
### Phase 15 — Generation Control & Maintenance
**Status:** COMPLETE / VERIFIED in repository validation. Production rollout remains separate.

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
Phase 16 implementation is active on draft PR #99 / branch `work/phase-16-creative-iteration`. 16A shared recipe reconstruction, 16B Create **Reuse settings**, 16C successful Activity **Run again**, and 16D Media Viewer **Compare source** are implemented. Exact head `4d1a495a8145238e1e78756c7b09cdbaee8d8115` passed the full 26-workflow affected matrix; focused Creative Iteration `33964679539` passed product/privacy/comparison assertions, fixture cleanup and screenshot upload. The approved 16D design came through PR #100 / `6dadc9e1976b976ab4584ce830286ba3a8baead1`. The next task is **not new feature implementation**: inspect the rendered 16D Image→Image and Image→Video desktop/narrow screenshots from artifact `9969057974` (SHA-256 `cc20206371324f0698433731294924105174943cc0176dfd4ce9264fee6e8df5`), fix only a real mismatch if found, then update final Phase 16 docs, mark PR #99 ready and merge only after exact final-head validation remains clean. Keep Variations and Phase 17 out of scope. Do not deploy the application or activate reconciliation/maintenance scheduling without separate authorization.

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
**Status: `COMPLETE / VERIFIED` — implementation evidence recorded below; production rollout remains separate.**

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

## Phase 15 Implementation Verification — 2026-09-05
Phase 15 is `COMPLETE / VERIFIED` in repository and shared validation at implementation head `9cd0528ff50ef55a3ad3e09080980a71234af096`. This completion does **not** mean the Phase 14/15 application or any scheduler has been deployed to production.

- Owner-facing native Cancel is implemented through `POST /api/generation/jobs/[jobId]/cancel`. The browser supplies only owner-scoped product job identity; server-derived `canCancel` controls Activity exposure and worker/provider/storage identity remains internal.
- `cancelling` is an explicit nonterminal job state. Cancel, ordinary polling, failover, finalization and cancellation reconciliation serialize through the Phase 14 reconciliation claim. If `persisting` wins first, the result path continues. If cancellation intent wins first, no standby failover or durable result publication can later occur for that attempt.
- Provider cancellation targets only the current persisted native call with a bounded request timeout. Confirmed 2xx and recognized 404/410 outcomes terminalize safely; ambiguous failure stays `cancelling` for reconciliation. A bounded ten-minute local grace can terminalize locally while permanently discarding a late result rather than pretending provider compute stopped instantly.
- Terminal cancellation releases bound generation-admission capacity. Repeated/concurrent Cancel and repeated reconciliation converge idempotently; cancelled jobs remain non-retryable.
- Activity uses the maintained Button + AlertDialog primitives. `Activity Cancel Visual` `33939690827` passed desktop/narrow/reduced-motion interaction coverage. The visually identical artifact `9960993664` (`sha256:caa369b98b444f968538584a340739cc5dadf7c4a34eb529b42fc3fbf6bbf699`) was human-reviewed clean for confirmation, `Cancelling`, final `Cancelled`, keyboard dismissal and narrow touch layout.
- `Generation Cancellation` `33939690824` passed exhaustive mock race/fault coverage plus bounded real-provider mapping. The live job (`101234543563`) accepted and cancelled one FLUX Image job and one REDGraft Video job through the ordinary RenderLab product API; each recorded provider cancellation confirmation, reached `cancelled`, released admission and produced zero durable output/media. The verifier rejects the ten-minute local-grace fallback for these live cases.
- Bounded maintenance is implemented behind `POST /api/internal/maintenance`. Migration `20260905020803 renderlab_staging_cleanup_claims` adds internal `cleaning` claims for temporary sources/upload sessions; cleanup uses a 24-hour eligibility threshold plus a 15-minute quiescence/re-reference pass before deleting known row-owned R2 objects. Late job references restore source state; promoted uploads are adopted; R2 deletion failure stays retryable; tombstoned media purges reuse existing idempotent Delete semantics. `Maintenance Integration` `33939690830` passed exact fixture, race and injected-delete-failure coverage.
- Shared migrations applied: `20260905015926 renderlab_generation_cancellation` and `20260905020803 renderlab_staging_cleanup_claims`. Privileged maintenance/reconciliation functions remain server/service-role only with empty search paths; browser table grants were not opened.
- Exact implementation-head regressions all passed: Account Ownership `33939690833`, UI Shell `33939690826`, Maintenance `33939690830`, Generation Cancellation `33939690824`, Generation Reconciliation `33939690871`, Library Lifecycle `33939690848`, Brand/Launch `33939690853`, Activity `33939690846`, Media Delete `33939690847`, Integrated Release `33939690851`, Activity Cancel `33939690827`, Generation Admission `33939690825`, Create Lifecycle `33939690850`, Generation Integration `33939690829`, and Video Generation Integration `33939690835`.
- Final shared-state audit after the suite found zero fixture Auth users, zero active jobs, zero reconciliation claims, zero duplicate **indexed** output slots, zero pending media purges, zero nonterminal upload sessions and generation defaults restored to enabled / 1 active / 12 hourly / `updated_by=null`. Three stale unreferenced temporary sources remain eligible for the verified maintenance contract; one stale referenced source remains deliberately protected.
- Rolling deployment matters: shared schema is ahead of the currently deployed Cycle 2/Phase 13 application. Because migration `0013` intentionally left `generation_output_index` nullable for compatibility, production generations created by the older deployed finalizer can still add unindexed generated-media rows until the Phase 14/15 application is explicitly rolled out. Pre-merge 2026-09-05 audits observed this nullable legacy set continuing to grow while the still-deployed older application served real production generations, including newer Edit history and a duplicate-linked case. The exact count is therefore intentionally **not** a stable invariant until Phase 14/15 is rolled out. These rows are user/product history, not maintenance garbage, and must not be deleted or reclassified; indexed slot uniqueness remains clean.
- Vercel recorded zero RenderLab deployments created on 2026-09-05 during this implementation. Production remains the previously accepted deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; automatic Git deployment remains disabled. Supabase `pg_cron` and `pg_net` remain disabled, and no production reconciliation/maintenance secret or schedule is active.

At Phase 15 closure, Phase 16 was still roadmap-only. The authoritative current Phase 16 implementation state and accepted execution contract are recorded below.

## Phase 15 Post-Merge Closure — 2026-09-05
PR #96 merged Phase 15 to `main` as `e4daac8870dead088f19101e3083743a31a692c2` from exact final PR head `ef142d40469eaa781fd0d009ed33652ffd0cb5b2`.

The exact final PR head passed all 17 attached workflows: Reference Upload `33940933416`, Persistent Media Upload `33940933396`, Brand / Launch `33940933393`, Account Ownership `33940933426`, UI Shell `33940933463`, Library Lifecycle `33940933641`, Activity Cancel `33940933484`, Generation Cancellation `33940933399`, Maintenance `33940933497`, Generation Reconciliation `33940933468`, Activity `33940933382`, Create Lifecycle `33940933465`, Integrated Release `33940933431`, Generation Integration `33940933421`, Generation Admission `33940933390`, Video Generation Integration `33940933476`, and Media Delete `33940933453`.

Final shared-resource audit after those runs found zero fixture Auth users, zero active generation jobs, zero active reconciliation claims, zero duplicate indexed output slots, zero pending media purges, zero nonterminal upload sessions and zero orphan admission reservations; generation defaults were restored to enabled / 1 active / 12 hourly / `updated_by=null`. The old temporary-source backlog remains three stale unreferenced rows plus one stale referenced/protected row; no production maintenance sweep was run.

The nullable `generation_output_index` population is a rolling-deployment observation rather than a fixed invariant: pre-merge audits observed it grow from eight to nine as the still-deployed pre-Phase-14 finalizer handled legitimate production Edit work. Those rows remain user/product history and are not cleanup candidates.

No Phase 14/15 application rollout or scheduler activation followed the merge. Vercel still reports accepted production deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; automatic Git deployment remains disabled; Supabase `pg_cron` and `pg_net` remain absent; no production reconciliation or maintenance schedule/secret was activated. Supabase advisors show no new Phase 15-specific finding beyond the already tracked server-owned RLS/no-policy INFO, leaked-password-protection WARN, singleton FK INFO and unused-index INFO.

Phase 16 planning is captured by the accepted execution contract below. Implementation is in progress: 16A shared recipe reconstruction, 16B Reuse Settings, 16C successful Run Again and 16D conditional Viewer Compare source are implemented/configured-verified at exact head `4d1a495a8145238e1e78756c7b09cdbaee8d8115`. Final human render review and repository closure remain. The contract and this implementation evidence do not authorize production deployment or scheduler activation.

---

# Phase 16 Execution Contract — Creative Iteration
**Status: `IN PROGRESS — 16A/16B/16C/16D IMPLEMENTED / CONFIGURED VERIFIED; FINAL HUMAN VIEWER REVIEW / PHASE CLOSURE PENDING`.**

## Verified implementation progress — 2026-09-05
- **16A shared recipe reconstruction:** owner-scoped historical intent is reconstructed through the current generation contract, including the already-approved narrow legacy Video compatibility, and current input ownership/readiness is revalidated before reuse.
- **16B Reuse Settings:** successful current-valid history can open `/create?recipe=<job-id>` with persisted prompt, output settings, Advanced values, stable input aliases/roles and exact source identity prefilled. Opening the recipe never dispatches generation; edits submit through the ordinary Create boundary.
- **Historical temporary references:** still-ready same-owner `temporary-source` inputs remain reusable through a narrow authenticated product content redirect; R2/storage identity stays server-only and temporary sources are not promoted into a parallel durable-media model.
- **16C Run Again:** successful current-valid Activity rows can submit a distinct new ordinary generation attempt through current admission/routing. Failed Retry, successful Run Again and active Cancel remain separate semantics; the historical successful job is immutable and worker/provider/workflow/model/failover metadata is never replayed.
- **Focused configured verification:** exact head `5c9008c974c9b096fd484b3e5546c613880ff79a` passed Creative Iteration run `33959979016`, including signed-out/foreign privacy, zero implicit dispatch, editable Image/Video/Advanced recipe prefill, stable aliases, ready temporary-source reuse, unavailable-input fail-closed behavior, distinct immutable Run Again attempts, admission denial, exact fixture cleanup and four desktop/narrow screenshots. Artifact `9967633913` has SHA-256 `7fb2906c915390c0b23ae102e2dd06bdbde46736c503d80b0e554d398f660716` and was visually reviewed clean for the implemented 16B/16C surfaces.
- **Full affected regression matrix:** the same exact head passed all 26 affected workflows. Library Collections run `33959978965` completed its product assertions on attempt 1 but hit a Playwright in-flight-route teardown race after success; unchanged attempt 2 passed with cleanup. Key gates include Create Lifecycle `33959978960`, Activity `33959978980`, Generation Admission `33959978976`, Generation Integration `33959978997`, Video Generation `33959978972`, UI Shell `33959978999` and Integrated Release `33959978983`.
- **16D Compare source implemented / configured-verified:** the user-approved PR #100 direction is implemented by the feature-owned Viewer comparison composition. Comparison is offered only when the producing owner-scoped job resolves a current active durable primary `media-asset` source; temporary/deleted/foreign/no-source history fails closed. The default Viewer remains unchanged until Compare source is opened. Wide layout preserves truthful media geometry with Result primary; narrow layout keeps the full-width Result first with compact Source context immediately below; Source exposes only `Open source`; result Prompt/Details/Continue/Actions and video controls remain result-owned; active state uses `Close comparison`. Exact head `4d1a495a8145238e1e78756c7b09cdbaee8d8115` passed Creative Iteration `33964679539` and all 26 affected workflows. Artifact `9969057974` (`sha256:cc20206371324f0698433731294924105174943cc0176dfd4ce9264fee6e8df5`) contains the final desktop/narrow comparison screenshots; human rendered review is still required before Phase 16 closure.
- **No rollout implication:** no schema migration, production deployment, production scheduler activation, provider-routing redesign or historical data rewrite is part of 16A–16D.


## Goal / user value
Turn durable generations into reusable creative starting points without making users reconstruct successful work by hand.

Phase 16 should make three common follow-up intents direct and truthful:
1. **Reuse settings** — open a successful historical recipe in Create, prefilled from persisted product intent, then edit before generating.
2. **Run again** — launch a fresh attempt from a successful historical recipe without editing it first.
3. **Compare source and result** — when a generated result still has an active durable primary source, inspect the source and output together from Media Viewer.

The product promise is reuse of **current-valid product intent**, not replay of historical provider execution. Worker/model/provider identity remains replaceable infrastructure and bit-identical reproduction is not promised.

## Verified starting state — `main` `3624924eb24b5d9375934fadb5050f5f198eb338`
The Phase 16 planning audit re-established the following current facts from repository code plus read-only shared-state aggregates:

1. **Create already owns editable generation intent.** `GenerationRequest` persists prompt, output settings, stable input aliases/roles and Advanced parameters. `CreateWorkspace` already supports all four approved operations and lets a terminal form be edited/generated again.
2. **Viewer continuation is media-based, not recipe-based.** Image assets currently expose capability-derived Edit and Animate links through owner-revalidated `source` + `action` navigation. Generated `PublicMediaAsset` already carries `generationJobId`, but Viewer does not load the producing job recipe.
3. **Failed Retry provides the safe reconstruction precedent.** `retryGeneration()` loads one owner-scoped historical job, reconstructs only product intent, strips narrowly documented legacy Video tuning, passes through the current request parser, checks operation/output consistency, revalidates inputs, and submits through the ordinary generation boundary. Historical provider/workflow/worker/failover/error/output execution metadata is not replayed.
4. **Activity keeps successful and failed semantics distinct.** Failed jobs alone expose Retry; successful jobs expose View result. General successful Run Again was intentionally deferred to this phase.
5. **Historical inputs are not guaranteed to survive.** In the planning snapshot, 12 succeeded jobs existed; 11 referenced historical inputs, but only 5 of 11 input references were currently available and only 6 succeeded jobs had all required inputs currently available. Recipe reuse therefore cannot be inferred merely from `status=succeeded`.
6. **Durable source comparison is conditional.** All 11 succeeded Edit/Animate jobs had a primary historical input, but only 4 currently had an active owner-scoped durable primary media source in the audited snapshot. Temporary, deleted or otherwise unavailable sources must not be resurrected merely for comparison.
7. **Multi-output storage is ready, multi-output generation is not.** Phase 14 introduced explicit zero-based output-slot identity and deterministic per-slot persistence. Current native execution still persists only `outputIndex=0`, current worker submit contracts have no output-count/variation-count field, successful jobs in the audit all had exactly one `output_asset_id`, and the maximum indexed output slot observed was `0`.
8. **Production still runs the older Cycle 2/Phase 13 application.** Phase 14/15 repository capability has not been rolled out and no reconciler/maintenance scheduler is active. Phase 16 implementation/merge must not imply production rollout.

## Product decisions locked by this contract
### 16A — One server-owned reusable recipe reconstruction boundary
Create one shared server-owned reconstruction service used by successful Reuse Settings / Run Again and compatible with the existing failed Retry path.

A historical recipe contains only persisted product intent:
- prompt;
- output kind and current-relevant output settings;
- ordered opaque generation inputs with stable aliases and semantic roles;
- Advanced product parameters that remain current-supported.

It explicitly excludes historical:
- workflow/model/ecosystem selection;
- worker/provider IDs or endpoints;
- failover history and worker state;
- raw/backend errors;
- output IDs as execution instructions;
- storage keys or signed URLs.

Reconstruction must:
- load the job under the verified owner;
- apply only the same narrowly documented legacy compatibility already accepted for Retry (for example legacy Video missing resolution normalizing through the current default, while obsolete Video Steps/Guidance are not replayed);
- run the current `parseGenerationRequest` contract;
- prove current resolved operation and output kind still match the historical product operation;
- revalidate every referenced input for current owner, kind, readiness and active/non-tombstoned state;
- fail closed if any required input is unavailable or current capability no longer accepts the recipe;
- never silently drop an input, remove an unresolved `@imageN` mention, substitute a different media item or change the operation to make an old recipe pass.

Prefer extracting/generalizing the current Retry reconstruction implementation rather than creating separate compatibility logic for each action.

### 16B — Reuse Settings opens Create without dispatch
Add one owner-scoped recipe-navigation contract, expected as `/create?recipe=<generation-job-uuid>` unless implementation evidence shows a simpler equally safe shape.

Server behavior:
- treat the query value as untrusted opaque job identity;
- require a verified active account for private recipe loading;
- load/reconstruct/current-validate the historical recipe server-side;
- pass a typed `initialRecipe` into Create; the browser must not reconstruct a job from raw historical JSON;
- malformed, missing, foreign, non-reusable or unavailable-input recipes produce bounded product guidance without leaking whether another owner has the job;
- `recipe` is mutually exclusive with current media continuation `source` + `action`; ambiguous mixed navigation fails boundedly rather than guessing precedence.

Create prefill must preserve current-valid:
- prompt text;
- Image/Video output kind;
- aspect ratio;
- Video resolution, duration and Audio state;
- stable reference aliases, order and semantic roles;
- current-supported Advanced values.

Opening Reuse Settings must **not** submit a job. The user may change any ordinary Create control before Generate, and Generate then follows the exact ordinary current request/admission/routing path.

Primary product surface: generated Media Viewer receives a contextual **Reuse settings** action when its producing job is reconstructable/current-valid. This complements, rather than replaces, media-based Edit/Animate continuation.

### 16C — Successful Run Again is a new attempt, not provider replay
Add an owner-scoped product mutation expected as `POST /api/generation/jobs/[jobId]/run-again`.

Rules:
- available for successful historical jobs only in v0.1;
- browser sends only the opaque job ID;
- use the same shared reconstruction/current-validation/input-preflight boundary as Reuse Settings;
- submit through the ordinary current `submitGeneration()` path, including current account/global admission controls and current internal routing;
- return a distinct new generation job ID;
- never mutate the successful historical job;
- separate explicit Run Again requests may create separate attempts; the client prevents accidental double-click concurrency but v0.1 does not claim durable request idempotency;
- current routing/default implementation may differ from the historical provider execution, so Run Again means “make another attempt from this recipe,” not “replay the same provider call” or “reproduce identical pixels.”

Primary surface: successful Activity rows keep **View result** and gain compact **Run again** only when the server can establish a reusable current recipe. Failed rows keep the existing Retry semantics and active rows keep Cancel where applicable. Do not collapse Retry and Run Again into one ambiguous action.

### 16D — Conditional durable source/result comparison
Generated Media Viewer may offer **Compare source** only when all of the following are true:
- the asset has a producing `generationJobId` owned by the current account;
- the producing operation has a meaningful primary source (currently Edit Image or Animate Image);
- the persisted primary input is a durable `media-asset`, not a temporary source;
- that source still exists, belongs to the same owner, is active/not tombstoned and is readable through the ordinary media product contract.

Do not expose a comparison control when the historical source is missing, temporary, deleted, foreign or otherwise unavailable. Historical intent does not grant permission to revive unavailable media.

Viewer comparison requirements:
- result remains the primary Viewer object and existing Continue/Actions hierarchy stays intact;
- source and result are explicitly labelled;
- wide layouts may show source/result side-by-side; narrow layouts must use a reviewed stacked or simple switching treatment rather than squeezing two unusable panes;
- image→image and image→video comparison must both remain truthful;
- source media uses ordinary product media URLs/opaque identity, never R2 keys or provider metadata;
- source may link to its own Viewer when helpful, but comparison must not create a parallel media-management surface;
- use approved maintained primitives and existing RenderLab motion only when it improves spatial understanding; reduced-motion must remain complete.

Because this changes an approved media-primary surface, implementation requires a desktop + narrow visual design checkpoint before the comparison UI is coded, followed by actual rendered screenshot review.

### 16E — Variations remains deferred
Phase 16 does **not** implement Variations.

Phase 14 solved the persistence prerequisite by giving outputs explicit slots, but current execution evidence does not define a truthful Variations product contract:
- native Image/Video workers currently accept no output-count/variation-count field;
- one provider call currently resolves to one returned image/video body;
- RenderLab finalization currently writes slot `0` only and marks success with one asset;
- the planning production snapshot contained only one output ID per succeeded job.

Do not simulate “Variations” by silently launching several unrelated ordinary jobs behind one button. A later Variations contract must first define provider/workflow cardinality, seed/relationship semantics, admission/cost treatment, multi-output result presentation, per-output persistence/failure behavior and cancellation/retry semantics.

## Explicitly out of scope
- Variations or batch multi-output generation.
- New top-level Recipes, History, Remix or Compare route.
- Durable recipe table, recipe naming/favorites/sharing, public recipe links or cross-account recipe reuse.
- Prompt/version history or a general project/document model.
- Provider/workflow/model selection or replay of historical routing.
- Restoring or cloning deleted/tombstoned/temporary historical source media merely to make a recipe reusable.
- New creative operations such as Upscale/Restore, Inpaint/Outpaint, LoRA/model adapters or Director Video.
- Shell-global generation/media client stores or new cross-route polling architecture.
- Billing/credits/cost estimates or SLA/ETA claims.
- Broad redesign of approved Create, Viewer, Activity, Library or shell surfaces.
- Production application deployment, Phase 14/15 scheduler activation or production maintenance sweeps.

## Architecture / API boundaries
- `generation_jobs` remains the historical product recipe source; do not introduce a recipe table unless implementation audit proves current normalized intent is insufficient.
- `media_assets.generation_job_id` is the durable output→recipe linkage for generated media.
- `/create` remains the only authoring workspace. Recipe navigation prefills it rather than creating a second editor.
- Existing media continuation `source` + `action` remains the contract for “use this result as a new source” (Edit/Animate). Recipe reuse is a separate “use the settings that produced this result” concept.
- Failed Retry and successful Run Again must share reconstruction/current-validation logic but keep separate eligibility/product semantics.
- All submission still flows through ordinary `submitGeneration` and Generation Admission; Phase 16 does not add a provider-direct execution path.
- Viewer comparison data is resolved server-side from owner-scoped asset→job→primary-source relations; do not send raw job JSON or storage metadata to the browser.
- Keep Server Components authoritative for initial Create recipe loading and Viewer comparison resolution. Client Components own only the necessary edit/run-again/disclosure interaction state.

## Data / schema implications
The planning audit found no Phase 16 schema requirement for Reuse Settings, Run Again or comparison:
- normalized recipe intent already lives in `generation_jobs`;
- generated asset→job provenance already lives in `media_assets.generation_job_id`;
- output-slot identity is already available for future multi-output work.

Therefore v0.1 should prefer **no migration**. If implementation discovers a missing durable field required to reconstruct current product intent, stop and amend this contract before adding schema. Do not introduce lineage/recipe tables merely for convenience.

No historical rows should be backfilled, rewritten or reclassified as part of Phase 16.

## Security / ownership implications
- Recipe/job IDs and media IDs are opaque product identities, never authorization.
- Every recipe load, Run Again request and comparison source lookup is owner-scoped behind the fresh RenderLab account boundary.
- Missing and foreign recipe/source identities preserve the existing not-found/privacy behavior.
- Historical references are reauthorized against current durable media/source state before reuse.
- Browser payloads never contain service credentials, R2 keys, worker/provider IDs or historical execution-routing metadata.
- Run Again consumes ordinary current admission policy exactly like Create and failed Retry.
- No browser grants/RLS weakening is permitted for recipe or comparison reads.

## UI / UX requirements
### Reuse Settings / Create
- preserve the approved Create hierarchy; prefilled state should feel like opening an editable starting point, not a new mode or technical recipe editor;
- clearly communicate bounded recipe-unavailable cases without destroying a user’s ordinary new-creation ability;
- stable aliases/order and prompt mentions must remain visibly coherent after prefill;
- existing Image/Video contextual controls, Advanced disclosure, reference replacement/removal/reorder and reduced-motion behavior remain authoritative.

### Activity Run Again
- keep job history/status/prompt hierarchy dominant;
- Run Again is compact and secondary to history, with an in-flight `Running again…`/spinner state and bounded success/error feedback;
- successful rows retain View result; failed Retry and native Cancel retain their distinct state gating;
- narrow layout must wrap actions without reducing touch targets or obscuring prompt/status.

### Viewer comparison
- media remains visually primary;
- comparison is progressive disclosure, not an always-on split-screen tax for every asset;
- source/result labels must be unambiguous;
- the comparison treatment must be reviewed at desktop and narrow sizes before implementation, and actual implementation screenshots must be reviewed before approval.

## Required validation matrix
### Shared recipe reconstruction
- own current-valid succeeded recipe reconstructs exactly the current-valid prompt/output/inputs/Advanced intent;
- malformed/signed-out/missing/foreign identities fail safely without cross-account disclosure;
- current parser/capability mismatch fails closed;
- stable aliases/order/roles and `@imageN` references remain consistent;
- missing/foreign/tombstoned media and missing/not-ready temporary sources make reuse unavailable;
- bounded legacy Video compatibility exactly matches the accepted Retry rules;
- worker/provider/workflow/failover/error/output execution metadata is never replayed.

### Reuse Settings
- opening an eligible generated asset’s recipe prefills Create and performs zero generation submission until the user presses Generate;
- all current-supported output and Advanced settings round-trip visibly;
- references are owner-reloaded and prefilled in the persisted alias/order;
- user edits then submit through ordinary current validation/admission/routing;
- invalid `recipe`, invalid `source`/`action`, and mixed recipe+media-continuation navigation are bounded and non-ambiguous;
- unavailable historical recipes leave Create usable for a new task rather than trapping the user.

### Successful Run Again
- own succeeded reusable job accepted; failed/cancelled/active jobs reject with stable `run_again_not_available` and no submission;
- accepted Run Again returns a distinct job and leaves the original row unchanged;
- ordinary generation admission, generation-disabled, active-limit and rolling-rate responses remain authoritative;
- unavailable current inputs block before backend/provider work;
- repeated explicit successful requests create separate attempts while one client click is guarded in-flight;
- sanitized product errors reveal no provider/routing detail.

### Viewer source/result comparison
- generated Edit/Animate result with active same-owner durable primary source exposes comparison;
- Create Image/Create Video result, uploaded asset, temporary-source history, deleted source, foreign source and missing job/source do not expose it;
- source and result URLs resolve through ordinary authenticated product media boundaries;
- image→image and image→video comparison render correctly;
- desktop, narrow, keyboard and reduced-motion states pass rendered review;
- existing Edit/Animate, Favorite/Collections/Rename/Download/Delete actions remain intact.

### Regression / configured validation
At minimum audit path filters and run every actually affected gate, expected to include:
- UI Shell Validation / UI purity;
- Create Lifecycle;
- Activity Visual;
- Library Lifecycle / Media Viewer coverage;
- Account Ownership;
- Media Delete;
- Generation Admission;
- Generation Integration;
- Video Generation Integration;
- Integrated Release when shared generation/API boundaries are touched.

Use run-owned mock/external-backend fixtures for exhaustive recipe/Run Again validation so most cases spend no provider generation. Keep configured native Image/Video regressions green when shared submission logic changes; add a bounded Phase 16 live case only if mock/current regression evidence cannot prove a provider mapping that the new product contract actually depends on.

Exact Auth/Supabase/R2 fixtures must self-clean. Final exact-head validation remains required.

## Documentation / handoff outputs
Before Phase 16 can be marked complete, update from verified implementation reality:
- `PROJECT.md` — Phase 16 implementation evidence and Phase 17 handoff;
- `docs/ui/UI_MIGRATION.md` — slice/checklist state, exact-head runs, visual review and cleanup;
- `docs/ui/UI_DECISIONS.md` — UI-056 implementation evidence or an explicitly approved amendment;
- `docs/ui/SCREEN_REGISTRY.md` — verified Create recipe, Viewer comparison and Activity Run Again behavior;
- `docs/ui/COMPONENT_CATALOG.md` — any new approved feature composition / reused primitive mechanics;
- `docs/architecture/FRONTEND_ARCHITECTURE.md` — shared reconstruction, recipe navigation, Run Again and comparison server/client boundaries;
- `docs/architecture/PRODUCT_CAPABILITIES.md` — current recipe reuse semantics and explicit Variations deferral;
- `docs/architecture/INFRASTRUCTURE.md` only if implementation changes infrastructure/shared-resource reality.

## Exit criteria
Phase 16 is `COMPLETE / VERIFIED` only when:
- one shared server recipe reconstruction boundary serves successful reuse/run-again semantics without duplicating or weakening failed Retry rules;
- Reuse Settings opens current-valid persisted intent in Create with no implicit dispatch and ordinary editing/submission remains intact;
- successful Run Again creates a distinct ordinary job through current admission/routing while preserving the historical job;
- unavailable/deleted/foreign/current-invalid historical inputs fail closed and are never silently substituted;
- Viewer comparison appears only for an active durable same-owner primary source and passes desktop+narrow rendered review without degrading the existing Viewer action hierarchy;
- Variations remains absent unless this contract is explicitly amended from new provider/product evidence;
- no new recipe/lineage schema is introduced unless an audited need first amends the contract;
- exact-head affected CI/configured verification and exact fixture cleanup pass;
- authoritative repository docs match implementation reality;
- no production deployment or scheduler activation is inferred from implementation/merge.

Only after Phase 16 is `COMPLETE / VERIFIED` should Phase 17 be expanded into its execution-ready Observability & Engineering Quality contract.
