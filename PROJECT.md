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

## Current Verified Baseline — 2026-09-06
- Authoritative repository `main` before this Cycle 3 planning change: `61a4882faf89d85b94c5a6955d1bd9a4508d01f0`.
- Cycle 2 — Creative Productivity & Beta Maturity is `COMPLETE / VERIFIED`.
- Phase 13 — Email & Invite Production Hardening is `COMPLETE / VERIFIED`.
- Accepted production application is Post-Cycle 3 stabilization source `71a9034039a64beec66894cc4f79b1f62bfc7bf7` at READY deployment `dpl_Ck2HEMFpt2aRUwSVTrYA6YcFTbbi`; `https://renderlab.faresuniform.uk` aliases that deployment. Prior Cycle 3 production deployment `dpl_6htPrpLMysfqZycZ7wQ5btwejXPA` remains the immediate rollback anchor.
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
**Status: `COMPLETE / VERIFIED THROUGH PHASE 18 / MERGED / PRODUCTION ROLLOUT VERIFIED`.**

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
- **Phase 16 — Creative Iteration: `COMPLETE / VERIFIED`.** Shared current-valid recipe reconstruction, Create Reuse Settings, successful Activity Run Again and conditional durable Viewer Compare source are implemented. Exact implementation head `4d1a495a8145238e1e78756c7b09cdbaee8d8115` passed all 26 affected workflows, including Creative Iteration `33964679539`. Final artifact `9969057974` (`sha256:cc20206371324f0698433731294924105174943cc0176dfd4ce9264fee6e8df5`) was independently hash-checked and human-reviewed across Image→Image and Image→Video desktop/narrow renders; the accepted PR #100 Result-primary/contextual-Source hierarchy, truthful media geometry, `Open source` / `Close comparison` hierarchy, result-owned Prompt/Details/Continue/Actions and narrow no-overflow behavior all matched, with configured verification separately proving preserved native video controls, keyboard activation and reduced-motion. No corrective implementation change was required. Variations remains explicitly deferred because current worker/product execution still returns one output per job and has no approved output-count semantics. Phase 17 subsequently completed and merged; production rollout remains separate and unauthorized by both phase completions.
- **Phase 17 — Observability & Engineering Quality: `COMPLETE / VERIFIED`.** Existing privileged Admin Health and server lifecycle seams now provide privacy-safe structured diagnostics, truthful bounded lifecycle/failure/failover/capacity/backlog aggregates and conventional cheap lint/typecheck/unit feedback without weakening configured browser/live-provider gates or introducing a telemetry vendor/event store. Exact implementation and repository-closure evidence is recorded below; PR #108 was squash-merged as `aaa2dcf06a927b9cbc5fe08dd3af1f47116ce1dd` from definitive exact final head `6c9af34702d8d2fc26d0e5e7d0cca649fde4cf0b` after all 29 attached workflows passed, and the merged-main push set then passed all 11 workflows GitHub actually attached.
- **Phase 18 — Image Upscale v0.1: `COMPLETE / VERIFIED / MERGED`.** Fresh read-only deployed-worker audit `33995223659` / artifact `9977854297` (`sha256:3490b81b9229e048d78829848b8f1c4061aa0082859dd005481604f3881febef`) selected fixed 2× durable-image Upscale. Repository preparation excludes the verified-disabled FLUX/REDGraft primaries from new routing while preserving historical lookup and pins the RenderLab-owned SwinIR 2× worker contract. With explicit user authorization, exact RenderLab source `3b7f4a4dcc27a64e1423cbd2c6d0993b24ceb3e8` was deployed as Modal app `renderlab-image-upscale` in healthy workspace `modal-45`; corrected full live proof `34000980137` passed all 10 acceptance cases and uploaded artifact `9979491468` (artifact ZIP digest `sha256:4a8f2a06b0bcf305eaa9b270bbfbe5937e0f8b5abeb004f5ab57c2665e7e6d04`; evidence JSON `sha256:0ad85f892357f1e6d611b32b27a03fa030eef8df3ffe7afb3dae2950919a1dab`). 18A–18F are complete/verified: the worker is live-proved; the promptless persisted domain/schema is applied; the owner-scoped fixed-2× API/admission/native-dispatch boundary is implemented; and server-owned Upscale reconciliation/finalization, native cancellation, current-source-revalidated failed Retry, truthful Activity `2× upscale` summary, and conditional succeeded-result Compare source are verified. Successful Upscale Run Again/Reuse Settings remain absent. The visible Viewer `Upscale 2×` action is now implemented/render-verified in 18E on implementation head `ac4aed60e64061ee6a911c858cdc032b6f9a7423`; the dedicated end-to-end product/live proof completed in 18F, while production rollout remains a separate explicit operation. Restore, Inpainting/Outpainting, LoRA/model adapters and Director remain deferred.

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
Phase 17 remains fully closed/merged. Phase 18 Image Upscale v0.1 is `COMPLETE / VERIFIED / MERGED / PRODUCTION LIVE`; PR #111 was squash-merged as `b8be87453ba0f98e3cd70a3c16a6ad9c1747b75d`. The Media Viewer exposes server-derived `Upscale 2×` only for eligible durable images; the browser sends no scale/model/workflow/storage payload, duplicate submission is locked locally, accepted work leaves the source Viewer stable and continues through Activity, and rejected starts remain locally retryable. The dedicated Phase 18F product/live proof closed at 32/32 attached workflows successful on exact proof head `fec2ad2762d21cbd92c8db03c8a95130a6b6ecb7`. The later explicit production rollout deployed exact application source `c493eaead6997cce1c22c6835c98177d6346ff41` as READY Vercel deployment `dpl_6htPrpLMysfqZycZ7wQ5btwejXPA` and verified `https://renderlab.faresuniform.uk` through rollout run `34056745193`: durable Create Image success, Run Again admission, failed Retry with immutable historical failure, native Cancel, Viewer `Upscale 2×`, real persisted `8×6 → 16×12` Upscale, exact R2 CORS and zero run-owned residue. Rollout evidence artifact `9996244698` has JSON `sha256:490d14dbe13f6b018deccc28efde78a9fab959ab085138795712ac06b2f4a1a6` and artifact ZIP `sha256:c9e3d8829f4605b8fcb93cc8c4e44b1ca8bae5852934aef88384fd17292db00d`. Rollback to `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2` was not required and the new deployment emitted no error/fatal runtime logs during the rollout audit window. Automatic Git → Vercel deployment remains disabled. No Upscale worker redeployment, Supabase schema change, reconciliation/maintenance scheduler activation, `pg_cron`, `pg_net` or deferred capability expansion occurred.

## Cycle 3 Production Rollout — 2026-09-06
**Status: `COMPLETE / VERIFIED / LIVE`.**

- Exact deployed application source: `c493eaead6997cce1c22c6835c98177d6346ff41`. Vercel production deployment `dpl_6htPrpLMysfqZycZ7wQ5btwejXPA` (`https://renderlab-42skee4j0-faresmohamed260-6733s-projects.vercel.app`) is READY and aliases `https://renderlab.faresuniform.uk`. A later docs-only commit may advance repository `main`; that does not change the deployed application source recorded here.
- Production Vercel environment-key metadata includes the full RenderLab Supabase/R2 contract plus server-only `RENDERLAB_UPSCALE_WORKER_GATEWAY_URL`. The production build executed `scripts/verify-vercel-env.mjs` against actual injected values and printed `Vercel production environment contract is complete.` The Upscale gateway key already existed and was preserved; the existing verified worker passed health before deployment and was not redeployed.
- Definitive rollout workflow `34056745193` passed exact-pristine source verification, READY/exact-SHA deployment metadata, custom-domain Closed-Beta route smoke, exact-origin R2 PUT CORS, authenticated Create Image success, Run Again admission, failed Retry with immutable historical failure, native Cancel, authenticated Viewer `Upscale 2×` visibility and a real slot-0 PNG persisted at exact `8×6 → 16×12` while preserving source bytes.
- Run-owned Auth/access/job/source/media/upload/admission-reservation/R2 fixtures were cleaned to zero. Vercel error/fatal runtime-log audit for the new deployment returned no entries during the rollout window.
- Evidence artifact `9996244698`: JSON `sha256:490d14dbe13f6b018deccc28efde78a9fab959ab085138795712ac06b2f4a1a6`; artifact ZIP `sha256:c9e3d8829f4605b8fcb93cc8c4e44b1ca8bae5852934aef88384fd17292db00d`.
- The previously accepted production deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2` remained the rollback anchor until smoke completed; rollback was not needed. Automatic Git → Vercel deployment remains disabled.
- The rollout did **not** change Supabase schema, redeploy the Upscale worker, activate reconciliation/maintenance scheduling, enable `pg_cron`/`pg_net`, or expand deferred creative capabilities.

## Phase 18F Implementation Verification — 2026-09-06
Phase 18 Image Upscale v0.1 is `COMPLETE / VERIFIED / MERGED`; PR #111 was squash-merged as `b8be87453ba0f98e3cd70a3c16a6ad9c1747b75d`.

- Exact proof head `fec2ad2762d21cbd92c8db03c8a95130a6b6ecb7` closed at **32/32 attached workflows successful**. Library History `34042759009` initially failed before checkout because GitHub could not download Actions dependencies; the unchanged job rerun passed build/browser verification, cleanup and artifact upload.
- Image Upscale Integration `34042759032` passed the complete run-owned product matrix and the already-deployed real-worker product leg. Live evidence persisted one slot-0 PNG at exact `8×6 → 16×12`, preserved the source, and used `renderlab-upscale-01` / `image-upscale-v1`.
- The mock matrix verified fixed-2× promptless intent/admission, browser-independent reconciliation, duplicate-finalization convergence, native cancellation with no late result, failed Retry current-source revalidation and source-delete fail-closed behavior, successful Run Again/Reuse Settings absence, and active-source-only Compare eligibility.
- Artifact `9992236657` independently matches GitHub at `sha256:68e5755c3c32b64e7f6606a7c7c94a8ed0774871975c3cf611759b46dee4eaf9`; live JSON `sha256:70b3c4de9b5355983e54ed0fd7d3744f11721f0ec93df2861d61f75d31b4b447`, mock JSON `sha256:ca9dcf84ebf9dc9c6230eb3745074483638f7cfaa1283ee7a7015479e713e8f8`. Desktop and 390px comparison renders were human-reviewed clean with the accepted Result-primary/contextual-Source hierarchy and no horizontal overflow.
- The public Modal gateway committed in the dedicated CI workflow is a verification fallback only. During Phase 18F verification itself, production RenderLab still required server-only `RENDERLAB_UPSCALE_WORKER_GATEWAY_URL` and no Vercel deployment/environment, worker deployment, scheduler, `pg_cron` or `pg_net` state changed. The later explicit Cycle 3 production rollout is recorded separately below and changed only the production application state; the worker, schema and scheduler boundaries remained unchanged.
- PR #111 was squash-merged as `b8be87453ba0f98e3cd70a3c16a6ad9c1747b75d` from definitive exact head `c40705d760639eb6fffdf9d51fc69ed397fc55a0` after its 32/32 attached PR workflow matrix passed; the review surface was clean at merge.
- Merged-main validation on `b8be87453ba0f98e3cd70a3c16a6ad9c1747b75d` completed all **14 workflows / 15 checks** GitHub attached successfully: Generation Reconciliation `34052332628`, Engineering Quality `34052332629`, UI Shell Validation `34052332633`, Maintenance Integration `34052332651`, Reference Upload Integration `34052332658`, Generation Cancellation `34052332660`, Video Generation Integration `34052332666`, Image Upscale Integration `34052332670`, Deployment Readiness `34052332678`, Generation Integration `34052332689`, Creative Iteration `34052332696`, Upscale Worker Validation `34052332700`, Activity Cancel Visual `34052332702`, and Upscale Viewer Visual `34052332712`. Production rollout remained a separate explicit operation from 18F and was later completed/verified as documented in the rollout closure below.

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

Phase 16 planning is captured by the accepted execution contract below. Phase 16 16A–16D is now `COMPLETE / VERIFIED` in implementation and rendered review: exact implementation head `4d1a495a8145238e1e78756c7b09cdbaee8d8115` passed all 26 affected workflows, Creative Iteration `33964679539` passed focused product/privacy/comparison coverage, and artifact `9969057974` (`sha256:cc20206371324f0698433731294924105174943cc0176dfd4ce9264fee6e8df5`) was independently hash-checked and human-reviewed clean on 2026-09-05 with no corrective implementation change. PR #99 has since completed exact-final-head validation and merged; authoritative Phase 16 post-merge closure is recorded below. This completion does not authorize production deployment or scheduler activation.

---

# Phase 16 Execution Contract — Creative Iteration
**Status: `COMPLETE / VERIFIED` — implementation and rendered review evidence recorded below; production rollout remains separate.**

## Verified implementation progress — 2026-09-05
- **16A shared recipe reconstruction:** owner-scoped historical intent is reconstructed through the current generation contract, including the already-approved narrow legacy Video compatibility, and current input ownership/readiness is revalidated before reuse.
- **16B Reuse Settings:** successful current-valid history can open `/create?recipe=<job-id>` with persisted prompt, output settings, Advanced values, stable input aliases/roles and exact source identity prefilled. Opening the recipe never dispatches generation; edits submit through the ordinary Create boundary.
- **Historical temporary references:** still-ready same-owner `temporary-source` inputs remain reusable through a narrow authenticated product content redirect; R2/storage identity stays server-only and temporary sources are not promoted into a parallel durable-media model.
- **16C Run Again:** successful current-valid Activity rows can submit a distinct new ordinary generation attempt through current admission/routing. Failed Retry, successful Run Again and active Cancel remain separate semantics; the historical successful job is immutable and worker/provider/workflow/model/failover metadata is never replayed.
- **Focused configured verification:** exact head `5c9008c974c9b096fd484b3e5546c613880ff79a` passed Creative Iteration run `33959979016`, including signed-out/foreign privacy, zero implicit dispatch, editable Image/Video/Advanced recipe prefill, stable aliases, ready temporary-source reuse, unavailable-input fail-closed behavior, distinct immutable Run Again attempts, admission denial, exact fixture cleanup and four desktop/narrow screenshots. Artifact `9967633913` has SHA-256 `7fb2906c915390c0b23ae102e2dd06bdbde46736c503d80b0e554d398f660716` and was visually reviewed clean for the implemented 16B/16C surfaces.
- **Full affected regression matrix:** the same exact head passed all 26 affected workflows. Library Collections run `33959978965` completed its product assertions on attempt 1 but hit a Playwright in-flight-route teardown race after success; unchanged attempt 2 passed with cleanup. Key gates include Create Lifecycle `33959978960`, Activity `33959978980`, Generation Admission `33959978976`, Generation Integration `33959978997`, Video Generation `33959978972`, UI Shell `33959978999` and Integrated Release `33959978983`.
- **16D Compare source implemented / configured-verified:** the user-approved PR #100 direction is implemented by the feature-owned Viewer comparison composition. Comparison is offered only when the producing owner-scoped job resolves a current active durable primary `media-asset` source; temporary/deleted/foreign/no-source history fails closed. The default Viewer remains unchanged until Compare source is opened. Wide layout preserves truthful media geometry with Result primary; narrow layout keeps the full-width Result first with compact Source context immediately below; Source exposes only `Open source`; result Prompt/Details/Continue/Actions and video controls remain result-owned; active state uses `Close comparison`. Exact head `4d1a495a8145238e1e78756c7b09cdbaee8d8115` passed Creative Iteration `33964679539` and all 26 affected workflows. Artifact `9969057974` (`sha256:cc20206371324f0698433731294924105174943cc0176dfd4ce9264fee6e8df5`) contains the final desktop/narrow comparison screenshots. Final render review of all four real Image→Image / Image→Video desktop+narrow screenshots passed on 2026-09-05 after independent hash verification: Result remains primary, media geometry is truthful, Source stays contextual with only `Open source`, `Close comparison` hierarchy is appropriate, result-owned Prompt/Details/Continue/Actions remain intact and narrow layouts do not horizontally clip or overflow. Creative Iteration separately verifies preserved native video controls, keyboard activation and reduced-motion. No corrective implementation change was required.
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

## Phase 16 Post-Merge Closure — 2026-09-05
PR #99 squash-merged Phase 16 to `main` as `ad3cf2a987b60098fdc361a7f8fc358ae706aeae` from exact final PR head `2352f150e0528f2ba3396afc46ccab80aec4e05e`.

The final PR head passed the complete 26-workflow affected matrix. Library Lifecycle encountered one transient network `ECONNRESET`/fetch timeout after healthy build/start behavior; exact fixture cleanup completed and the unchanged rerun passed, so no product change was made to manufacture a green result.

Merged-main push validation then passed all nine workflows attached to exact merge SHA `ad3cf2a987b60098fdc361a7f8fc358ae706aeae`: Activity Cancel Visual `33967198561`, Generation Integration `33967198351`, Video Generation Integration `33967198358`, Reference Upload Integration `33967198361`, UI Shell Validation `33967198395`, Generation Reconciliation `33967198451`, Generation Cancellation `33967198513`, Maintenance Integration `33967198402`, and Creative Iteration `33967198317`.

Phase 16 remains `COMPLETE / VERIFIED / MERGED`. Its final rendered evidence remains artifact `9969057974` (`sha256:cc20206371324f0698433731294924105174943cc0176dfd4ce9264fee6e8df5`), with the accepted Result-primary/source-context comparison treatment and no corrective implementation change required.

No production application rollout, reconciliation/maintenance scheduler activation, `pg_cron`/`pg_net` enablement, schema change or provider-routing change followed the Phase 16 merge. Production remains the separately accepted Closed-Beta deployment recorded above. Phase 17 subsequently completed and merged; Phase 18 contract expansion is now the next repository governance step.

---

# Phase 17 Execution Contract — Observability & Engineering Quality
**Status: `COMPLETE / VERIFIED / MERGED` — exact implementation, rendered Admin, exact-final-head and merged-main evidence recorded below.**
**UI decision:** UI-057.
**Planning baseline:** merged `main` `ad3cf2a987b60098fdc361a7f8fc358ae706aeae`.

## Goal / user value
Make RenderLab easier to operate and safer to change without turning observability into another product surface or replacing the high-fidelity configured gates that already protect real account/media/generation behavior.

Phase 17 should provide two complementary improvements:
1. engineers get cheap deterministic feedback for conventional code defects before expensive build/browser/live-provider verification; and
2. a fresh-authorized RenderLab admin can understand lifecycle health, failure/failover pressure, capacity and cleanup backlog from bounded privacy-safe aggregates instead of inspecting raw tables/provider traces by hand.

The phase does **not** promise SLAs, provider cost accounting, deterministic render timing or exhaustive distributed tracing.

## Verified starting state — 2026-09-05
1. **Phase 16 is merged and green on `main`.** PR #99 landed as `ad3cf2a...`; all nine merge-triggered workflows succeeded after the final 26-workflow PR matrix.
2. **TypeScript is already strict but not exposed as a cheap script.** `tsconfig.json` has `strict: true` and `noEmit: true`; `package.json` currently has no `typecheck` script.
3. **There is no conventional lint or focused unit-test script.** Current package scripts are development/build/start, `verify:ui-purity` and Playwright UI verification. UI Shell currently runs UI purity, full Next production build, Chromium install/start and Playwright.
4. **Admin Health already exists as the correct operator surface.** Fresh-active-admin bootstrap returns a bounded 24-hour aggregate with `activeJobs`, status counts, operation counts and sanitized failure codes. It does not expose prompts, media contents, provider/worker IDs or raw provider messages.
5. **Lifecycle/maintenance already expose useful structured seams.** `generation_jobs` owns durable status/timestamps/sanitized error/failover state; admission reservations own bounded capacity state; Phase 15 maintenance already returns bounded source/upload/purge summaries. Phase 17 should derive visibility from those contracts before inventing another event store.
6. **Production is intentionally behind repository capability.** Phase 14–16 repository changes are not implicitly deployed and no production reconciliation/maintenance scheduler is active. Phase 17 implementation/merge must preserve that boundary.
7. **No telemetry vendor is currently required by evidence.** Existing platform/server logs plus durable RenderLab aggregates are enough to start. Sentry, OpenTelemetry, Vercel-native additions or another service require an explicit demonstrated gap, privacy review and cost/fit justification rather than adoption for its own sake.

## Required invariants
- **Observability is observational.** Logging/metrics failure must never become a generation, cancellation, maintenance, upload or account correctness dependency.
- **Product truth remains authoritative.** Admin metrics summarize persisted/current product state; they do not fabricate percentages, queue positions, cost, autoscaling capacity or SLA claims.
- **Privacy is deny-by-default.** Diagnostics must not record prompts/negative prompts, media bytes/content/display names, account email, Auth/session tokens or cookies, signed URLs, R2 keys, service/provider credentials, raw request bodies, or raw provider error bodies.
- **Opaque correlation is not authorization.** Correlation/job IDs may connect internal events, but never grant access and never replace owner/fresh-admin checks.
- **Cheap checks supplement high-fidelity gates.** Lint/typecheck/unit feedback must not replace configured Playwright, shared-resource, reconciliation/cancellation/maintenance or live Image/Video integration when those paths are affected.
- **No new operations product.** Ordinary users continue to see product-level state/errors only. Operator observability extends existing fresh-admin Health rather than creating a provider console or new top-level destination.

## 17A — Cheap conventional engineering feedback
Add conventional package-level scripts with these stable purposes:
- `npm run lint` — maintained repository linting for relevant TypeScript/TSX/JavaScript/config sources;
- `npm run typecheck` — TypeScript checking with no emit against the current Next/TS configuration;
- `npm run test:unit` — deterministic focused tests for pure contracts with no network, shared Supabase/R2, browser or provider requirement.

Implementation may choose the lightest maintained Node-compatible lint/test runner after verifying compatibility with the repository's current Next.js/TypeScript/ESM setup. This contract does not require Jest, Vitest or another brand merely for convention.

Focused unit coverage should target pure/high-risk contracts first: generation request/capability normalization and bounded compatibility helpers; recipe/retry reconstruction rules where isolatable without service calls; sanitized/typed error classification; lifecycle timing/backlog aggregation helpers introduced by this phase; and structured diagnostic event redaction/normalization/correlation behavior.

Add one cheap GitHub engineering-quality gate/workflow so these checks can fail without first installing Chromium or invoking shared cloud/provider fixtures. `verify:ui-purity` remains authoritative for visible primitive policy and may be included in the cheap gate when efficient.

## 17B — Structured server diagnostics and correlation
Introduce one small server-owned diagnostic boundary rather than scattered ad-hoc log payloads. Events use a typed/bounded envelope: event name/level, timestamp, opaque correlation ID, optional opaque RenderLab job ID, product operation/lifecycle phase/status where relevant, typed diagnostic/error code and non-negative duration/count/attempt scalars when meaningful.

Do not add an unrestricted details bag that encourages raw request/provider dumping. Any event-specific fields must be explicit bounded scalars/enums and pass the same redaction policy.

Instrument the highest-value lifecycle boundaries rather than every function call: generation admission/submission outcome; reconciliation claim/provider-ready/failover/finalization outcome; cancellation intent/provider acknowledgement/local terminalization outcome; bounded maintenance pass/category failures; and durable result finalization boundaries where correlation materially helps incident reconstruction.

Correlation IDs are generated/trusted server-side and propagated through internal lifecycle work where useful. A browser-supplied identifier is never trusted for authorization or used to override server correlation state.

## 17C — Privileged Admin Health expansion
Extend the existing `/admin` **Health** section and its fresh-admin server contract; do not add another route or ordinary shell navigation item.

The v0.1 operator view remains bounded and aggregate. From current durable state, expose truthful snapshots/rolling-window summaries where derivable without scanning unbounded history:
- lifecycle outcomes by status/operation and current active state;
- completion timing aggregates or clearly labelled timing bands from persisted timestamps, with sample counts and no SLA language;
- sanitized failure-code counts;
- failover incidence/counts from persisted failover history without worker/provider identity;
- cancellation/cancelling counts where useful;
- stale-active age buckets aligned with existing lifecycle bounds rather than an invented ETA;
- admission/capacity snapshot from current active jobs/reservations and configured limits, without claiming provider autoscaling capacity;
- maintenance backlog for stale/unreferenced/cleaning sources, stale/cleaning uploads and tombstoned pending media purges.

Keep the existing dense/conventional Admin visual language. Prefer compact stat/table composition over a new dashboard framework. If visible Health composition changes, configured Admin verification captures desktop+narrow states and human review confirms readability/no sensitive-data leakage.

The Admin payload remains aggregate and excludes prompts, media content/names, account email/owner identity, R2 identity, provider job IDs, worker IDs, workflow IDs, raw failover payloads and raw provider messages.

## 17D — Typed error classification over text matching
Where current gateway/worker contracts provide stable machine-readable failure categories, normalize them into typed internal diagnostic codes at the adapter boundary and carry only sanitized product codes into user/Admin contracts.

Textual/raw-message classification may remain a compatibility fallback for provider responses that do not yet expose a stable code. Do not break a working gateway or invent a provider code solely to eliminate every string match in one phase.

Any gateway contract change preserves existing product error privacy and is proven by affected Image/Video/reconciliation/cancellation regressions. Provider-specific details stay server-internal and are not added to ordinary Activity/Create/Admin payloads.

## 17E — Telemetry/tooling decision boundary
Start with the repository's existing server/platform logging and database-derived bounded aggregates. Evaluate external telemetry only after structured event/Admin Health implementation demonstrates a concrete unanswered need such as retention/search/cross-request correlation that current tooling cannot satisfy reasonably.

Adopting Sentry, OpenTelemetry, a Vercel observability add-on or another vendor requires a specific gap, current plan/cost/retention fit, server/client collection boundary, explicit redaction fields, secret/config ownership and non-blocking failure behavior. No vendor adoption, client analytics/RUM or persistent event-store schema is a Phase 17 exit requirement.

## Explicitly out of scope
- New top-level Observability/Operations/Workers/Models/Workflows route.
- Ordinary-user provider, worker, queue, failover, cleanup or infrastructure controls.
- Client product analytics, marketing pixels, session replay, prompt/content analytics or behavioral profiling.
- Logging prompts, uploaded/generated media content or names, account email, Auth/session material, signed URLs/R2 keys, credentials or raw provider bodies.
- Billing/credits/provider-cost ledger, GPU utilization claims, exact autoscaling capacity, render-time SLA/ETA or cost promises.
- A generic audit/event-sourcing platform or new durable telemetry table without an audited need and contract amendment.
- Replacing existing Playwright/shared-resource/live-provider gates with unit tests.
- Phase 18 creative capability work, Variations, Director, LoRA/model adapter, Upscale/Restore or Inpaint/Outpaint implementation.
- Production application deployment, production reconciliation/maintenance scheduling, `pg_cron`/`pg_net` activation or unrelated infrastructure mutation.
- UI-054 BIMI/mailbox-avatar implementation or unrelated Auth/email work.

## Architecture / data boundaries
- Existing `generation_jobs`, `generation_admission_reservations`, staging/upload/media tombstone state and Phase 15 maintenance predicates are the first source for operator aggregates.
- Existing Admin fresh-auth/fresh-role boundary remains authoritative. Extend the existing admin contract/service/RPC or use equally bounded server queries; do not grant browsers raw table access.
- A small server observability/diagnostic module may centralize event normalization/redaction/correlation. It stays server-only.
- No schema migration is pre-approved. First prove required v0.1 aggregates from existing timestamps/status/error/failover/reservation/staging fields. If a required metric cannot be derived truthfully and durable new state is genuinely necessary, stop and amend this contract before DDL/event storage.
- Existing RLS/browser-grant revocation and `SECURITY DEFINER` empty-search-path/service-role-only posture remains intact for any changed privileged function.

## Security / privacy implications
Verification explicitly proves diagnostic redaction. Tests seed sentinel prompt/email/storage/provider-error strings and assert they are absent from structured events and Admin responses while expected typed codes/counts remain present.

Logs may use opaque internal job/correlation identity for incident stitching, but account identity is omitted by default. If implementation proves an owner identifier is required for a specific server-only incident use case, it must be explicitly bounded/hashed or separately justified; it does not enter the Admin aggregate contract.

No correlation, telemetry or Admin aggregation endpoint becomes a public data-enumeration surface. Fresh-admin authorization remains required before privileged health reads.

## Required validation matrix
### Cheap quality gate
- lint passes on exact head and its selected config/fixture regression proves violations fail;
- typecheck runs without emit and its selected regression proves type errors fail;
- unit tests run with no network/secrets/browser and cover selected pure contracts;
- the cheap gate does not install Chromium or invoke live providers/shared production fixtures.

### Structured diagnostics
- correlation stays stable across one representative submit/reconcile/finalize lifecycle where propagated;
- separate operations receive distinct correlation IDs;
- typed event names/codes/status/durations are bounded/machine-readable;
- diagnostic emission failure is non-fatal to product correctness;
- seeded prompt/email/signed-URL/R2-key/token/raw-provider sentinels never appear in emitted event payloads.

### Admin Health
Use exact run-owned admin/member/job/reservation/staging/media fixtures and prove signed-out/member/non-admin fail-closed behavior; exact status/operation/failure/failover/timing/stale/capacity/backlog aggregates; no mutation of unrelated history; absence of prohibited identity/content/provider/storage fields; desktop+narrow readability if UI changes; and exact Auth/Supabase/R2/singleton cleanup.

### Lifecycle/provider regressions
Audit path filters and run every affected workflow, expected to include Engineering Quality, Account/Admin Operations, UI Shell when package/config/UI changes, Generation Reconciliation, Generation Cancellation, Maintenance Integration, Generation Admission, Activity when shared job/error serialization changes, and Image/Video Generation when lifecycle adapters/error classification are touched.

Live provider spend is not required merely for logging/Admin aggregation. Existing configured Image/Video live cases become required when provider adapter/error-classification code is changed, and exact cleanup remains mandatory.

## Documentation outputs
On verified implementation, update `PROJECT.md`, `docs/ui/UI_MIGRATION.md`, `docs/ui/UI_DECISIONS.md`, `docs/architecture/FRONTEND_ARCHITECTURE.md` if the server diagnostic/Admin boundary materially changes, `docs/architecture/INFRASTRUCTURE.md` for logging/telemetry/runtime/privileged-function reality, `docs/ui/SCREEN_REGISTRY.md` for actual Admin Health behavior, `COMPONENT_CATALOG.md` only for a real new Admin composition/mechanic, and `PRODUCT_CAPABILITIES.md` only if product-visible generation/error semantics change.

## Exit criteria
Phase 17 is `COMPLETE / VERIFIED` only when:
- conventional `lint`, `typecheck` and focused `test:unit` scripts provide cheap deterministic feedback and an exact-head GitHub quality gate is green;
- structured server diagnostics/correlation cover accepted lifecycle boundaries with explicit redaction and non-fatal emission;
- fresh-admin Health exposes truthful bounded lifecycle timing/failure/failover/capacity/stale/backlog visibility without sensitive product/provider/storage data;
- typed error classification improves adapters that have stable machine-readable evidence while safe compatibility fallbacks remain where needed;
- no telemetry vendor/event-store/schema is introduced without required evidence/contract amendment;
- affected exact-head configured regressions and required Admin desktop/narrow human review pass;
- exact run-owned fixtures clean and existing RLS/grant/privileged-function/singleton invariants remain intact;
- authoritative docs match implementation reality;
- no production deployment or scheduler activation is inferred from implementation/merge.

Phase 17 is now `COMPLETE / VERIFIED / MERGED`; Phase 18 may be expanded into an execution-ready Next Creative Capability contract only from a fresh deployed-worker audit. Phase 18 implementation remains unapproved until that contract is established.


## Phase 17 Implementation Verification — 2026-09-05
Phase 17 is `COMPLETE / VERIFIED / MERGED`. Exact clean implementation head `1ecd46bb809c1953cd24f1eecbd4bbfab7dbd4be` remains the implementation evidence. Definitive tree-identical final PR head `6c9af34702d8d2fc26d0e5e7d0cca649fde4cf0b` passed all 29 attached workflows with zero failures and zero cancellations; PR #108 was then squash-merged with the expected-head guard as `aaa2dcf06a927b9cbc5fe08dd3af1f47116ce1dd`. This verification and repository merge do not authorize production deployment or scheduler activation.

- **17A cheap engineering feedback:** `npm run lint`, `npm run typecheck` and deterministic `npm run test:unit` are established with pinned Oxlint configuration, Node 24 pure unit coverage and negative fixtures proving lint/typecheck rejection. Engineering Quality `33976269957` passed on the exact implementation head without Chromium, shared Supabase/R2 fixtures or live provider work. Legacy pre-existing lint findings remain visible as warnings rather than being hidden or expanded into unrelated cleanup; selected enforceable violations remain fatal.
- **17B structured diagnostics/correlation:** one server-only allowlisted diagnostic boundary emits best-effort non-fatal lifecycle events with opaque server correlation identity and bounded machine fields. Submission, reconciliation/provider-ready/failover/finalization, cancellation and maintenance boundaries are instrumented without arbitrary detail bags. Unit verification seeds prompt/email/token/signed-URL/R2/provider sentinels and proves they are absent from emitted payloads while correlation remains stable where expected and distinct across separate operations.
- **17C privileged Admin Health:** Account/Admin Operations `33976269977` passed exact run-owned fresh-admin/member/privacy fixtures, exact status/operation/sanitized-failure/timing/failover/active-age/capacity and five-category maintenance-backlog assertions, exact singleton restoration/fixture cleanup, and desktop+narrow overflow checks. Artifact `9972464342` (`sha256:f0b26931cb8e5ae574c457cf0f3f1ecff19f04dcde0fc3c390f19bbb57dbbd4c`) was independently hash-checked and human-reviewed clean on 2026-09-05: the existing dense Admin hierarchy remains intact, Health cards/lists are readable on desktop and 390px narrow layout, the accepted-to-terminal timing disclaimer and bounded-scan `+` explanation are legible, and no Health content exposes prompt/media/provider/storage identity. No corrective UI change was required.
- **17D typed worker failure classification:** stable machine-readable worker/provider failure codes now take precedence at the adapter boundary with the existing textual classification retained as compatibility fallback. Ordinary product/Admin contracts remain sanitized. Affected Image/Video/reconciliation/cancellation/admission regressions passed on the exact head.
- **Exact affected matrix:** all 29 workflows attached to `1ecd46bb809c1953cd24f1eecbd4bbfab7dbd4be` passed: Engineering Quality `33976269957`, Account/Admin Operations `33976269977`, Account Ownership `33976269852`, Account Identity Visual `33976270061`, UI Shell `33976269850`, Deployment Readiness `33976269943`, Reference Upload `33976269924`, Generation Admission `33976269950`, Generation Integration `33976269917`, Video Generation Integration `33976269925`, Generation Reconciliation `33976269975`, Generation Cancellation `33976269985`, Maintenance Integration `33976269984`, Activity `33976269895`, Activity Cancel `33976269968`, Creative Iteration `33976269888`, Integrated Release `33976269914`, Brand / Launch `33976270071`, Create Lifecycle `33976269911`, Library Lifecycle `33976269966`, Library Drag Drop `33976269849`, Library Search `33976270034`, Library Collections `33976270120`, Library Favorites `33976269937`, Library History `33976269871`, Library Batch Delete `33976269876`, Media Download `33976269900`, Media Rename `33976269883`, and Media Delete `33976269983`. The four-case live Video run completed its product matrix and exact cleanup before artifact upload.
- **Repository closure:** definitive exact final PR head `6c9af34702d8d2fc26d0e5e7d0cca649fde4cf0b` is a true empty/tree-identical commit on docs-complete tree `c48a1f33e6db512abaa1072b45e4bdd59de7258e`; all 29 attached workflows passed with zero failures/cancellations before PR #108 was marked ready and squash-merged as `aaa2dcf06a927b9cbc5fe08dd3af1f47116ce1dd`.
- **Merged-main push verification:** all 11 workflows GitHub actually attached to merge SHA `aaa2dcf06a927b9cbc5fe08dd3af1f47116ce1dd` passed: Engineering Quality `33992552565`, Deployment Readiness `33992552541`, Reference Upload Integration `33992552558`, Generation Integration `33992552557`, Video Generation Integration `33992552570`, Generation Reconciliation `33992552537`, Generation Cancellation `33992552555`, Maintenance Integration `33992552530`, Activity Cancel Visual `33992552529`, Creative Iteration `33992552596`, and UI Shell Validation `33992552536`. The Video run completed its live four-case product matrix, exact fixture cleanup and artifact upload.
- **Release boundary:** a live Vercel audit after merge found no Phase 17 deployment; production remains accepted candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` at READY deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`. No reconciliation/maintenance scheduler, `pg_cron`/`pg_net`, telemetry vendor/event store, schema migration or production maintenance sweep was activated by repository closure.
- **No speculative infrastructure:** Phase 17 adds no database migration, durable telemetry/event-store table, telemetry vendor, client RUM/session replay, production deployment or reconciliation/maintenance scheduler activation. Existing platform/server logs and current durable RenderLab state remain the v0.1 evidence sources.

That governance step is now complete: read-only worker audit `33995223659` selected the accepted Phase 18 Image Upscale v0.1 contract below. Phase 18 is complete/verified/merged through PR #111 as squash commit `b8be87453ba0f98e3cd70a3c16a6ad9c1747b75d`. This completion does not authorize production application deployment or later deferred capabilities.

# Phase 18 Execution Contract — Image Upscale v0.1
**Status: `COMPLETE / VERIFIED / MERGED`.**
**UI decision:** UI-058.
**Planning baseline:** repository `main` `e0ba6ae3e8eadefbe1a7c1ae6bf37d3fdaec755e` after Phase 17 closure.
**Fresh worker evidence:** read-only audit run `33995223659`, artifact `9977854297`, `sha256:3490b81b9229e048d78829848b8f1c4061aa0082859dd005481604f3881febef`; audit head `a22d2ef9beacfbb836a7585ffd8f0f5333f2277f` was created only to host the GET-only audit workflow and is not a product baseline.

## Goal / user value
Give a user one truthful, low-friction way to turn an existing durable RenderLab image into a new higher-resolution durable image without replacing the source, exposing model/workflow plumbing or forcing a prompt-driven generation form onto a non-prompt task.

The v0.1 user promise is intentionally narrow:

> Upscale this durable image to exactly 2× its source width and height, preserve the source, and track the work as an ordinary RenderLab asynchronous job.

Phase 18 selects **Image Upscale** only. "Restore" is not bundled into the label or implementation because the fresh deployed-worker audit found no distinct restoration contract to map truthfully.

## Verified starting state
The following facts were re-audited before this contract was locked:

1. **Current product operations are prompt-generation operations only.** `CreativeOperation` and the live `generation_jobs.operation` constraint currently allow `create-image`, `edit-image`, `create-video` and `animate-image` only.
2. **The ordinary `GenerationRequest` requires a non-empty prompt and resolves Image + source as Edit Image.** Upscale therefore must not masquerade as Edit or inject a synthetic prompt merely to fit the current parser.
3. **Durable image continuation already exists.** Media Viewer is the contextual asset workspace and continuation actions are capability-derived. The repository growth rule explicitly says Upscale/Restore should first be evaluated as Create additions or continuation actions rather than top-level destinations.
4. **The async lifecycle foundation is already strong.** Admission, owner-scoped jobs, native cancellation, autonomous reconciliation, deterministic output-slot finalization, durable `media_assets`, maintenance and structured diagnostics are verified and must be reused rather than duplicated.
5. **Fresh deployed-worker audit found no Upscale endpoint.** Healthy FLUX exposes `/jobs/edit`; healthy REDGraft exposes `/jobs/video`; healthy Qwen exposes `/jobs/edit`. No healthy registered gateway advertises Upscale, Restore, Inpaint/Outpaint, LoRA selection or Director semantics.
6. **The audit found fleet-registry drift.** `flux-primary-01` and `ltx-primary-01` return Modal workspace-disabled 404s. `flux-standby-01` and `ltx-standby-01` are healthy, and both registered Qwen workers are healthy. Every ecosystem therefore retains at least one ready endpoint, but knowingly probing dead "primary" entries is not an acceptable baseline for adding another worker-backed capability.
7. **No current image-upscale model/runtime is approved for RenderLab.** Saga contains internal resize/latent-upscale mechanics but no deployed RenderLab-compatible image-upscale product API. Model choice must therefore be proved and pinned as infrastructure, not inferred from a node name.
8. **Production application rollout is separate.** The accepted Closed-Beta application remains candidate `d6b8f386db3893e583c99b23fc3397b0eb377d42` / deployment `dpl_CZZvmdN42VHRK7uLVUA9W8kdc7x2`; Phase 17 and this planning work did not deploy a newer application.

## Phase 18A live worker verification — 2026-09-06
Phase 18A is `COMPLETE / LIVE VERIFIED`. At the 18A checkpoint this did **not** mean Phase 18 was complete, and it did not authorize a production RenderLab application deployment.

- Explicit user authorization covered the new Upscale worker deployment only; application/schema/UI coupling remained blocked until live proof succeeded.
- Exact RenderLab source `3b7f4a4dcc27a64e1423cbd2c6d0993b24ceb3e8` was deployed as Modal app `renderlab-image-upscale` in the verified healthy `modal-45` workspace, with worker identity `renderlab-upscale-01`.
- The first live deployment proved health/provenance but exposed a real FastAPI multipart bug: `from __future__ import annotations` turned the route-local `UploadFile` annotation into an unresolved forward reference, so multipart POST requests failed before route execution. The RenderLab worker source was corrected and the permanent offline verifier was strengthened before redeployment.
- Corrected live smoke then proved invalid `scale=4` returns `400` and a real 8×8 RGB request completes through async submit/poll to a 16×16 PNG.
- Corrected full live proof run `34000980137` passed 10 acceptance cases: health/provenance, fixed-scale rejection, geometry-ceiling rejection, RGB exact 2× PNG, alpha exact 2× RGBA PNG, EXIF-orientation normalization, animated/multi-frame rejection, async cancellation with no image result, accepted 4096×1024 → 8192×2048 boundary result transport, and final healthy/sleeping worker state.
- The full proof recorded zero persistent Supabase fixtures and zero R2 fixtures. Evidence artifact `9979491468` has GitHub artifact ZIP digest `sha256:4a8f2a06b0bcf305eaa9b270bbfbe5937e0f8b5abeb004f5ab57c2665e7e6d04`; its `evidence.json` hash is `sha256:0ad85f892357f1e6d611b32b27a03fa030eef8df3ffe7afb3dae2950919a1dab`.
- A later temporary proof-harness health assertion was corrected to read the worker state from the gateway's nested `worker` object; the corrected v2 matrix above is the authoritative acceptance evidence.
- No production RenderLab application deployment, Supabase migration, product routing, scheduler activation, `pg_cron`/`pg_net`, or later capability deployment followed 18A.

**Handoff boundary:** Phase 18A is complete/live-verified and 18B–18E are complete/verified. The fixed-2× Viewer action is now implemented and render-verified on `ac4aed60e64061ee6a911c858cdc032b6f9a7423` without widening the prompt-centric Create contract. Phase 18F is complete/verified; production application rollout remains separate and unauthorized.

## Product selection and v0.1 boundaries
- Creative operation: `upscale-image`.
- Entry point: contextual action on an active same-owner durable image in Media Viewer.
- User-facing action label: **Upscale 2×**.
- Scale: exactly `2` in v0.1; no scale picker.
- Source kinds: active durable `image` assets only; no temporary source identity and no video.
- Source MIME: PNG, JPEG or WebP.
- Source byte ceiling: 25 MB.
- Source geometry ceiling: each edge at most 4096 px and total source pixels at most 4,194,304. The server must inspect trusted decoded geometry when durable metadata is missing; browser-supplied dimensions are never authoritative.
- Output geometry: exactly `sourceWidth × 2` by `sourceHeight × 2`, same orientation/aspect, no crop or canvas expansion; maximum output pixels 16,777,216 and maximum output edge 8192 px.
- Output product format: PNG for v0.1. Alpha-bearing input is allowed only if the approved worker proof preserves alpha through the resulting PNG.
- Source is immutable. The result is a distinct durable `media_asset` linked to a distinct asynchronous job.
- No user-facing model/provider/worker selector, prompt, negative prompt, seed, steps, guidance or generic Advanced panel is part of Upscale v0.1.

## In scope
### 18A — Fleet hygiene and real worker contract prerequisite
Before any product Upscale action is exposed:

1. **Reconcile known registry drift.** Re-audit the six current registrations and remove, replace or repoint the disabled FLUX/REDGraft primary entries so RenderLab does not deliberately begin every affected request with a known-dead endpoint. Do not guess replacement URLs; registry changes require verified live health/OpenAPI evidence.
2. **Select and pin one image-upscale runtime implementation.** Record its source, exact version/revision, immutable artifact/model hash where available, license/usage compatibility and required ComfyUI/runtime dependencies in `INFRASTRUCTURE.md`. No model name becomes ordinary product UI.
3. **Expose an asynchronous worker contract** compatible with RenderLab lifecycle semantics:
   - `GET /health` reports at least `ready`, `cancel_jobs` and `upscale_scales:[2]` or an equivalent typed capability declaration;
   - `POST /jobs/upscale` accepts one multipart `image_file` plus exact integer `scale=2` and rejects other scales;
   - submit returns an opaque `call_id` plus truthful worker state;
   - `GET /jobs/{call_id}` returns `202` + typed state while active and the final `image/png` bytes when ready;
   - `DELETE /jobs/{call_id}` provides idempotent cancellation semantics compatible with Phase 15;
   - worker failure responses expose stable machine codes where practical so Phase 17 typed classification is not regressed.
4. **Prove geometry and alpha behavior live** on small synthetic fixtures before application routing is coupled to the endpoint.
5. The RenderLab registry may model the implementation as a dedicated internal ecosystem such as `image-upscale-v1`; the exact internal name is not user-facing. At least one endpoint must be live/healthy for implementation verification. Any production redundancy decision must be explicit before production rollout.

A worker deployment is an infrastructure operation and is **not authorized merely by merging this contract**. If the implementation session lacks explicit deployment authorization, it may build/test the adapter against a local deterministic worker double but cannot mark 18A or Phase 18 complete.

#### 18A repository preparation checkpoint — `VERIFIED BEFORE DEPLOYMENT`
Repository preparation is verified on the Phase 18 work branch before any Modal deployment:
- `src/server/generation/worker-fleet.ts` now keeps `flux-primary-01` and `ltx-primary-01` resolvable for historical job metadata but marks them disabled for new routing; healthy standbys are the only new-submission routes for those ecosystems. Focused `worker-fleet` unit coverage is included.
- Runtime research rejected Real-ESRGAN x2plus as the production candidate because upstream pretrained-weight commercial licensing remains unresolved. The current predeployment candidate is official SwinIR native 2×: repository/tag `JingyunLiang/SwinIR` `v0.0`, source commit `33f616625268d08ba600f8db89388eec0328edb1`, project license Apache-2.0, release asset `001_classicalSR_DF2K_s64w8_SwinIR-M_x2.pth`, exact size `67,277,475` bytes and independently measured `sha256:2032ebf8f401dd3ce2fae5f3852117cb72101ec6ed8358faa64c2a3fa09ed4ac`.
- Read-only/runtime audit `33997212864` passed Engineering Quality and exact official-asset size/hash verification. Artifact `9978418889` has GitHub digest `sha256:5d6d7ace3384a260bf2e9f59dacea85dfa3fa4e6026af46a825eaca74208dc53`.
- `workers/image-upscale/modal_app.py` defined the RenderLab-owned fixed-2× async contract before deployment, with a lightweight gateway image separated from the CUDA/model image, exact source/weight pinning, PNG output, source/output geometry guards, rectangular tiled inference, alpha preservation path and typed worker failures/cancellation. The corrected source at `3b7f4a4dcc27a64e1423cbd2c6d0993b24ceb3e8` is now the live-verified deployment source recorded above.
- Permanent `Upscale Worker Validation` run `33997784521` passed source syntax, pinned constants, route/cancellation contract, geometry limits and the rectangular-tiling regression check without Modal credentials or provider spend.

This checkpoint was the predeployment gate and did **not** complete 18A by itself. It has since been superseded by the explicitly authorized deployment and corrected full live proof recorded in **Phase 18A live worker verification — 2026-09-06** above. Phase 18B has since added the truthful `upscale-image` domain/schema contract described below; product API/admission/lifecycle/UI coupling remains unstarted and belongs to 18C–18E.

### 18B — Product/domain and schema contract
- Add `upscale-image` to `CreativeOperation` and every typed parser/public contract that legitimately represents persisted jobs.
- Do **not** broaden the ordinary prompt-based `GenerationRequest` just to carry Upscale. Introduce a narrow server product command/request for image upscale with fixed scale 2.
- A v0.1 Upscale job has:
  - `operation = 'upscale-image'`;
  - `output_kind = 'image'`;
  - one durable same-owner image input using opaque `media-asset` identity and `primary-image` semantics;
  - no user prompt;
  - `parameters.upscale.scale = 2` as canonical persisted intent;
  - output slot `0` using the existing deterministic finalization identity.
- Use the smallest compatibility migration, expected to be `0018`, to extend the `generation_jobs.operation` check and permit promptless transform jobs by relaxing `generation_jobs.prompt` nullability. Historical prompt-generation rows are not rewritten.
- Before applying DDL, audit existing rows for operation/prompt assumptions and prove the migration against current schema state. Do not silently weaken owner/RLS/browser-grant or lifecycle constraints.
- `media_assets` remains the output identity. No transform-specific asset table, source overwrite or mutable "current version" pointer is introduced.
- Persisted result provenance may omit `prompt` for Upscale and must retain `operation`, workflow/model internal provenance and the producing job; the source relationship remains recoverable from the owner-scoped job inputs.

#### 18B implementation verification — 2026-09-06
Phase 18B is `COMPLETE / VERIFIED`. This is a domain/schema milestone only; it does not expose Upscale through the RenderLab product yet.

- A fresh shared-state pre-DDL audit confirmed the live `generation_jobs.operation` check still allowed only the four prompt-generation operations, `prompt` was `NOT NULL`, all audited existing prompt rows were non-null/nonblank, core RLS remained enabled, browser table grants remained empty and same-owner generated-media/job links had zero violations. Historical prompt-generation rows were not rewritten.
- `CreativeOperation` now truthfully includes `upscale-image`, while `PromptGenerationOperation` and ordinary `GenerationRequest` remain prompt-only. `resolveCreativeOperation()` still resolves only Create/Edit/Video/Animate; Upscale is not coerced through prompt-generation parsing.
- `src/lib/capabilities/upscale.ts` adds the narrow server-owned `UpscaleImageCommand`: `operation='upscale-image'`, `outputKind='image'`, `prompt=null`, one durable `media-asset` input with `image1` / `primary-image` semantics, and fixed `parameters.upscale.scale=2`. Source ownership/eligibility is intentionally not trusted from this object; 18C subsequently implemented the required current-owner route-asset reload before dispatch.
- Persisted/public job contracts that legitimately represent history now allow `prompt: null`. Shared prompt-recipe reconstruction explicitly rejects non-prompt operations, so a succeeded Upscale row cannot accidentally gain Phase 16 Run Again/Reuse Settings and failed Upscale Retry is not fabricated before 18D. Activity could type the `Upscale image` operation label at 18B closure; the truthful non-prompt `2× upscale` summary was intentionally deferred and subsequently implemented in 18D.
- Repository migration `0018_image_upscale_job_semantics.sql` was applied to shared Supabase as `20260906004810 renderlab_image_upscale_job_semantics`. It adds `upscale-image`, drops column-level prompt `NOT NULL`, and adds an operation-specific prompt check: Upscale requires `NULL` prompt while the four prompt-generation operations still require a non-null, nonblank prompt. No transform table or historical rewrite was introduced.
- Post-DDL audit confirmed the new checks/nullability, zero invalid historical prompt rows, RLS still enabled, zero `anon`/`authenticated` raw-table grants and zero generated-media/job owner-link violations. Supabase Security Advisor reported no new 18B-specific issue; the intentional server-owned RLS/no-policy INFO and unrelated leaked-password-protection warning remain pre-existing tracked posture.
- Exact implementation source `5f9fd7a608df29b1fa25870da369ab55291b875f` passed Engineering Quality, including lint/typecheck/unit tests for the operation split and canonical fixed-2× command. The later definitive tree-identical 18B closure head `8e6e594b3f9aa7372f4fac758d248a75efa17a40` passed all 19 attached workflows, including Generation Admission `34003078656` and Video Generation Integration `34003078685`.
- No Upscale product route, generation-admission dispatch, native Upscale routing/reconciliation/finalization/cancellation/failed Retry, Compare source behavior or Viewer action was added by 18B; those were intentionally deferred and subsequently completed in 18C–18F. Production application deployment, scheduler, `pg_cron` and `pg_net` remain separate and inactive.

### 18C — Server/API and admission boundary
- Add one owner-authorized product route: `POST /api/media/assets/[assetId]/upscale`.
- v0.1 accepts no arbitrary scale/model/workflow/source payload from the browser. The route identity supplies the source; scale is server-fixed to 2.
- Reload the source under the current RenderLab account and require an active durable image. Foreign, deleted, missing or incompatible assets fail closed without revealing foreign existence.
- Validate MIME/bytes/decoded geometry server-side before reserving expensive generation capacity where possible.
- Reuse the existing transactional generation admission semantics. An accepted Upscale job consumes the same active/hourly generation capacity as other GPU work and binds/releases reservations through the same lifecycle rules.
- Keep worker URL, model identity, provider job ID, storage key and credentials server-only.
- Upscale v0.1 uses the native worker path. The existing generic external prompt-generation backend is not silently extended; a future external Upscale backend requires its own typed contract.
- Structured diagnostics may emit the existing opaque job correlation plus operation/phase/status/error code/duration only. Do not log source name, prompt substitute, storage key or image bytes.

#### Phase 18C implementation evidence — verified 2026-09-06
- Owner-scoped `POST /api/media/assets/[assetId]/upscale` accepts no browser settings/body. The server resolves the current RenderLab account, reloads only an active same-owner durable image and keeps foreign/deleted/missing source identity behind the existing not-found privacy boundary.
- Server preflight validates PNG/JPEG/WebP identity across media metadata, R2 HEAD/read content type and decoded Sharp metadata; source bytes, single-frame status, EXIF-oriented geometry, input/output edge ceilings and input/output pixel ceilings are checked before admission. The pure geometry policy is unit-covered and remains fixed at 2×.
- Upscale uses a sibling native submission seam rather than widening prompt-only `GenerationRequest` or the optional external prompt backend. It persists the canonical null-prompt `upscale-image` intent, posts only `image_file` plus server-fixed `scale=2` to `renderlab-upscale-01`, records opaque provider dispatch identity and binds/releases the existing transactional generation-admission reservation.
- `RENDERLAB_UPSCALE_WORKER_GATEWAY_URL` is server-only and is now part of the future Vercel environment preflight; no gateway value is committed and no RenderLab production deployment was performed by 18C.
- Configured Generation Integration `34004300165` passed the existing native Create/Edit ownership suite plus the 18C boundary: browser scale payload rejected before dispatch, foreign source returns private 404, same-owner source produces the exact promptless fixed-2× job/admission/native-worker request, and no durable result is fabricated before 18D. Generation Admission `34004300161`, Engineering Quality `34004300102` and Deployment Readiness `34004300196` also passed with exact fixture cleanup. The obsolete historical Phase-10C changed-file ban was narrowed to protect the completed `0012` migration itself so later legitimate deployment-readiness maintenance does not bypass or disable admission validation.
- 18C added no schema migration, lifecycle polling/finalization/cancellation/failed Retry, Activity Upscale summary/Compare behavior, Viewer action or scheduler/production application rollout. Those product/lifecycle/UI items were intentionally deferred and subsequently completed in 18D–18F; scheduler and production rollout remain separate and inactive.

### 18D — Lifecycle, cancellation, Retry and continuation
- Extend native lifecycle routing/reconciliation/finalization so `upscale-image` is first-class rather than coerced through `requestFromJobRow()` for prompt generation.
- Preserve Phase 14 deterministic output-slot persistence and crash recovery.
- Preserve Phase 15 cancellation: active Upscale jobs are cancellable only where the worker state is safely cancellable; terminal/persisting jobs remain protected by the existing lifecycle claim semantics.
- Failed Upscale jobs may use existing Activity **Retry**, but Retry must reconstruct only persisted owner-scoped source + fixed scale 2, revalidate the current source/limits/backend/admission contract and create a distinct new job. If the source was deleted or became ineligible, Retry is unavailable.
- Successful Upscale jobs do **not** expose Phase 16 `Run again` or `Reuse settings` in v0.1 because there is no editable recipe to reuse. Do not fabricate recipe semantics.
- Activity adds the truthful operation label **Upscale image** and a non-prompt summary such as **2× upscale**. Public activity data must not display "Untitled generation" as if a prompt were missing accidentally.
- Phase 16 **Compare source** should extend to a succeeded Upscale result when its one same-owner durable source remains active. If the source is deleted/unavailable, comparison is absent; history is not resurrected.
- The Upscale result remains an ordinary image asset: Library, Download, Rename, Favorites, Collections, Delete, Edit, Animate and another eligible Upscale may all compose through existing capability rules.

### 18E — Media Viewer UX
- Keep Media Viewer as the only new user-facing entry point in v0.1. Do not add a top-level Upscale route, Library-card quick action, separate post-processing app or new Create mode.
- Add **Upscale 2×** inside the existing Continue hierarchy only when server-derived source/backend eligibility is true.
- Starting the action uses a small feature-owned client mutation with duplicate-submit protection and existing maintained Button/Alert mechanics. No new generic primitive is expected.
- On acceptance, keep the source Viewer stable and show concise local success with an **Open Activity** continuation rather than pretending the result is already ready.
- On rejection/failure to start, show sanitized product feedback without losing Viewer context.
- Existing Edit/Animate hierarchy remains unchanged. Narrow layouts may wrap continuation actions but must not clip, overflow or demote the media itself.
- Before implementation of the visible action, produce a desktop+narrow repository-backed design checkpoint for the existing Viewer Continue cluster with eligible, starting and accepted states. The checkpoint must preserve UI-056 comparison hierarchy and the approved Viewer visual language.

## Explicitly out of scope
- Restore/enhance/face repair or any claim that Upscale repairs damaged content.
- Inpainting, Outpainting, mask/canvas editing, structural guidance or ControlNet-style controls.
- LoRA/model adapters or any user-facing model/workflow selector.
- Director Video or fabricated structured scene/shot semantics.
- Video upscale.
- 4× or arbitrary scale selection, target-dimension entry, batch upscale or Library card bulk actions.
- Prompt-conditioned super-resolution or style/detail-strength controls.
- Variations/multiple outputs per job.
- Replacing the source asset, mutating source R2 bytes or treating Upscale as Rename/metadata mutation.
- A new transform-job table, generic workflow builder or ComfyUI node/graph UI.
- Production application deployment, closed-beta policy changes, scheduler activation or unrelated worker-fleet redesign.

## Security / ownership implications
- The route and all reconstruction paths operate on opaque source asset ID under the current RenderLab account.
- Foreign/missing/deleted source identity must collapse to the same not-available product result.
- Browser requests never contain R2 keys, signed source URLs, worker URLs, provider job IDs or credentials.
- Worker callbacks/polling remain server-to-server; no worker endpoint becomes a browser CORS product API.
- Output ownership follows the accepted job owner and existing same-owner media/job enforcement.
- Retry and Compare source re-resolve the source under current ownership/tombstone state rather than trusting historical browser data.

## Validation matrix
### Worker/fleet proof
- Read-only registry audit must record every configured endpoint and prove no known-dead endpoint remains intentionally ranked as a live primary.
- Live worker contract proof must verify health/capability declaration, `/jobs/upscale`, active polling, exact PNG result geometry and idempotent cancellation semantics.
- Live 2× fixtures must include at least landscape, portrait and alpha-bearing PNG coverage; resulting width/height must be exactly doubled with no crop.
- Record immutable model/runtime provenance and exact audit/run evidence before product exposure.

### Product/domain tests
- Engineering Quality: lint, typecheck and focused unit tests for Upscale eligibility, geometry limits, operation parsing, activity summary and worker response classification.
- Migration validation: current-row pre-audit, clean apply, constraint/nullability inspection, owner/RLS/grant invariants and rollback/retry-safe reasoning.
- API ownership matrix: signed-out, same-owner, foreign, deleted, non-image, unsupported MIME, oversized bytes, over-edge and over-pixel cases.
- Admission matrix: disabled, active-limit and rolling-hour denials occur before worker dispatch; accepted job binds/release semantics remain exact.

### Configured lifecycle integration
Add a dedicated **Image Upscale Integration** workflow using run-owned Auth/Supabase/R2 fixtures and a deterministic test worker override for broad correctness without paid/provider dependency. It must verify:
- source durable image remains byte/row-identical;
- one accepted `upscale-image` job with fixed scale 2;
- exact output slot 0 and exactly doubled dimensions;
- autonomous reconciliation can finalize without browser polling;
- duplicate reconciliation/finalization converges on one output asset;
- cancellation is owner-scoped and source-safe;
- failed-job Retry creates a distinct job only while source remains currently eligible;
- successful Run Again / Reuse Settings remain absent;
- Compare source is present only for the active same-owner source;
- exact database/R2/Auth cleanup.

### Live worker and regression coverage
- After explicit worker-deployment authorization, run at least one small same-owner end-to-end product Upscale against the real deployed worker and verify exact 2× dimensions, PNG MIME, source preservation, durable output and cleanup.
- Existing affected gates must include at minimum Engineering Quality, UI Shell, Account Ownership, Library Lifecycle, Activity, Activity Cancel, Generation Admission, Generation Reconciliation, Generation Cancellation, Creative Iteration, Media Download, Media Rename, Media Delete and the ordinary Image Generation integration wherever shared lifecycle/worker code changes.
- Workflow path filters must include the new upscale adapter/worker-registry/shared lifecycle paths so later edits cannot bypass coverage.

### Rendered review
Configured browser verification must capture at minimum:
- eligible image Viewer desktop with **Upscale 2×** in the existing Continue hierarchy;
- the same eligible state at 390px narrow width;
- accepted/started feedback without fake completion;
- a succeeded Upscale result with Compare source on desktop and narrow layouts.

Human review must confirm media remains primary, continuation hierarchy is not overcrowded, action/feedback text wraps cleanly, source/result geometry is truthful and UI-056 comparison behavior is preserved. Keyboard/focus and reduced-motion behavior remain required where existing Viewer mechanics animate or disclose state.

## Documentation outputs
Phase 18 implementation must keep synchronized, where affected:
- `PROJECT.md`;
- `docs/ui/UI_MIGRATION.md`;
- `docs/ui/UI_DECISIONS.md` / UI-058 implementation evidence;
- `docs/ui/SCREEN_REGISTRY.md`;
- `docs/ui/COMPONENT_CATALOG.md` only if a new reusable component is actually adopted;
- `docs/architecture/FRONTEND_ARCHITECTURE.md`;
- `docs/architecture/PRODUCT_CAPABILITIES.md`;
- `docs/architecture/INFRASTRUCTURE.md` including worker/model hashes, live registry state and any applied migration.

## Exit criteria
Phase 18 is not `COMPLETE / VERIFIED` until all of the following are true:
1. fleet registry drift relevant to routing is reconciled with live evidence;
2. an approved/pinned Upscale worker contract exists and its deployment, if performed, was explicitly authorized and live-verified;
3. `upscale-image` is a truthful persisted product operation with the accepted schema migration applied/audited if required;
4. Viewer submission, admission, lifecycle, cancellation, Retry, Activity and Compare source behavior meet this contract without exposing worker/storage details;
5. source immutability and exact 2× result geometry are proved with run-owned fixtures;
6. configured desktop+narrow artifacts are human-reviewed clean;
7. the complete affected exact-final-head workflow matrix passes with exact cleanup and no weakened gate;
8. authoritative docs reflect verified repository/shared-infrastructure reality;
9. any PR merge is followed by verification of the actually attached `main` push workflows;
10. production application rollout remains a separate explicit operation.

## Deferred next-capability dependencies
Restore remains the first follow-up evaluation only after a real deployed restoration semantic exists. Inpainting/Outpainting still requires a deliberate mask/canvas contract; LoRA/model adapters still require source/version/hash/license/compatibility/cache/safety/persisted-intent contracts; Director remains blocked on structured deployed REDGraft semantics. None of those later capabilities is expanded or implemented by Phase 18.

## Post-Cycle 3 Stabilization — Corrective Maintenance
These fixes correct shipped behavior without opening a new major cycle or expanding creative capability.

### Navigation and Library revisit performance — `COMPLETE / VERIFIED / MERGED / LIVE`
- Persistent app-shell destinations explicitly prefetch their full route payload so normal Create / Library / Activity / Settings tab switches can paint from the client router cache instead of blocking on a fresh server round trip.
- After a real top-level section switch, the shell refreshes that destination in place so prefetched private Library/Activity data cannot remain silently stale.
- Library account/search parsing and owner-scoped collection/media queries remove avoidable sequential waiting; collections and the first media page are fetched concurrently after identity is established.
- Owner-authorized media content/thumbnail redirects may be reused only by the same browser (`Cache-Control: private, max-age=240`), shorter than the existing 300-second signed-read lifetime. No shared/CDN cache of private media is introduced.
- Library image cards prefer `thumbnailUrl` and ordinary new uploaded/generated images persist deterministic max-640px WebP previews under the existing private R2 thumbnail namespace. Preview generation is best-effort and never invalidates the original durable asset; there is no request-time image transformation, schema migration or shared/public media cache.
- PR #112 was merged to `main` as `7798fab8ad8caff19a74005502eb7472297ba7a8` after all 30 workflows attached to exact final head `f9e61a2f06ef4f6ef2ff27f170f50495eeb7647f` completed successfully, including Persistent Media Upload Integration and Generation Reconciliation after their bounded thumbnail regressions were corrected.
- Post-merge legacy thumbnail maintenance run `34062569699` found 13 active image rows with null thumbnail keys, backfilled all 13 successfully, recorded 0 failures and verified an exact remaining count of 0. Evidence artifact `9997940257` has artifact ZIP `sha256:bb02409e57ac2ba0737b72fb9cc848d7974bede01ff181f8ac4e36638f7d4e46`.
- Explicit production rollout run `34063455944` deployed exact source `71a9034039a64beec66894cc4f79b1f62bfc7bf7` as READY deployment `dpl_Ck2HEMFpt2aRUwSVTrYA6YcFTbbi` (`https://renderlab-i8mxlfmki-faresmohamed260-6733s-projects.vercel.app`) and attached `https://renderlab.faresuniform.uk`. Production environment metadata, public routes, exact-origin R2 upload CORS, a real durable image upload, deterministic WebP thumbnail creation, owner-gated signed thumbnail delivery with `private, max-age=240`, Library listing and fixture cleanup all passed. Rollback to `dpl_6htPrpLMysfqZycZ7wQ5btwejXPA` was not required. Evidence artifact `9998223539` has `evidence.json` sha256 `4d4130f6c2a8768b5a4a5f068e1d2d6b182c849ccaf10df229f985c9ebab05fd` and artifact ZIP sha256 `540839b3655089fc9b4c72b7bee0a21280b29dbe377e3b054c295b92737e9bdb`.

## Post-Cycle 3 Corrective Maintenance — Library Creatives / Uploads
**Status: `IMPLEMENTED / STATIC-VALIDATED / EXACT-HEAD PR ACCEPTANCE PENDING`.**

Library now separates the existing durable asset set into two same-route user-facing sections without splitting media identity: **Creatives** is the canonical default and lists `media_assets.origin=generated`; **Uploads** is represented by `tab=uploads` and lists `origin=uploaded`. The existing `kind`, search, Favorites, Collections, sort and bounded pagination state compose inside the active section, while a section switch clears stale pagination. Upload and desktop drag/drop actions are intentionally owned by Uploads so a newly persisted file remains visible in the section where it was added. Viewer routes, Favorite/Collection membership, deletion, download, rename and continuation continue to operate on the same durable asset IDs regardless of origin.

The durable schema already contained the `generated|uploaded` origin field plus `media_assets_origin_created_at_idx`, so this correction requires no Supabase migration, data backfill, R2 change, worker change or new route. The public media-list API gains an optional validated `origin=generated|uploaded` filter; omitting it preserves the existing unified API behavior for compatibility. This is corrective maintenance to the approved Library surface, not a new major product cycle and not a production deployment authorization.
