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

## Phase 23 Create fidelity correction — 2026-09-12
- Direct user comparison against the explicitly approved Clear Composer v0.5 evidence reopened issue #184 after the first merged Phase 23 implementation proved functionally correct but materially drifted from the approved composition. The binding visual authority remains prototype/code head `6237f59351d2cd7b397881f617a483d62d9bf438`, R&D run `34613720083`, artifact `10269841181` (`sha256:3d3eec07dc2ff4924deb2ce6739bca420fba88e816665af34c4289ed45aae1c0`).
- The user-approved correction implementation head `c786a17fa3a3c7f76dba5a64cb7822926749c1a2` restored the compact horizontal application header, 900px authoring / 1120px result composition, Image/Video-above-composer order, visible `PROMPT` labelling, reference-before-prompt grammar, flat essential-settings footer, visible setting label/value grammar, stable high-contrast Generate, composer-attached Advanced, truthful registration-framed generating state and asymmetric media-first result rail. No schema, worker/provider, routing, auth/admission, ownership, durable-media, storage or deployment contract changed.
- Documentation-final PR head `b6a2590875432ba75c28db9e0f4b465133e1873c` passed all 16 workflows GitHub attached to that exact head. PR #188 then squash-merged to `main` as `3f0d21ed55554b3c48791d35dd17cb6005212076`. The five workflows GitHub actually attached to merged `main` all passed: Engineering Quality `34684825581`, Video Generation Integration `34684825378`, Creative Iteration `34684825592` (unchanged attempt 2 after attempt 1 hit a transient Supabase 504 during fixture inspection), Activity Cancel Visual `34684825420`, and UI Shell Validation `34684825448`.
- Accepted browser evidence remains Clear Composer artifact `10293387664` (`sha256:e4937a16a2fed2bc160634c73c60322b0748ff3eb5d166b44cbc33f894a92915`) and configured Create Lifecycle artifact `10293653778` (`sha256:ba13fc48dcf4d823575b041455d902e48040d2cd554892c0b5b508ee80e88624`). Direct user review approved the real desktop generating/result and mobile result renders on 2026-09-12.
- The stale post-Edit heading assertion was replaced with the actual continuation invariants—Image mode, `Primary image`, and loaded durable reference preview—without weakening generation, persistence, ownership, admission or security checks.
- The fidelity correction no longer blocks the next UI-migration work. The rejected pre-approval Library concept must not be resumed; future Library work restarts from the now-merged approved Create/Landing system.
- Production remains unchanged at source `0173c4c5ba08360b6352331118abc81978cfa774` / READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`. Automatic Git → Vercel deployment remains disabled and no deployment is authorized by this closure.



## Phase 24 Library Gallery Rail v0.3 — implementation closure — 2026-09-12
- The user-approved Library Gallery Rail v0.3 remains the binding design authority: R&D head `ba842e919305e07262ae95c81b3c2063a455b54d`, run `34689164957`, artifact `10296866215` (`sha256:db81c13f34514022f01a9e8998de4c0622ee946e316d02655c70477db1a87d95`). UI-075 and `docs/ui/LIBRARY_GALLERY_RAIL_IMPLEMENTATION_CONTRACT.md` governed the bounded production slice.
- PR #194 implemented Gallery Rail without changing Library routes, URL/server ownership, durable-media identity, upload semantics, current-page selection/batch behavior, account ownership/security, schema, provider/worker, storage or deployment contracts. The definitive exact implementation head was `d0a6f66937986ace109e301913f17410a8e95548`.
- A fresh same-head PR reopen produced the complete 13-workflow acceptance set, and all 13 passed: Engineering Quality `34699147928`, Account Ownership `34699147963`, UI Shell `34699147960`, Integrated Release `34699147916`, Brand / Launch `34699147993`, Library Search `34699148010`, Library Lifecycle `34699147921`, Library History `34699147952`, Library Favorites `34699147991`, Library Collections `34699148071`, Library Batch Delete `34699147966`, Media Delete `34699147951`, and Library Drag Drop `34699148008`. The first Drag Drop attempt on the same SHA was cancelled before job creation by the shared lifecycle concurrency group; the unchanged same-head reopen run executed fully and passed.
- Human fidelity review accepted the real implementation against the approved v0.3 design. History artifact `10298855903` (`sha256:f832cc248f6f88a4caefe6867b12e972b49c08c4b998ab36e5f538d78f7c36d2`) verified settled desktop/390px selection, 0/60/180/360ms transition evidence and reduced motion. Batch Actions artifact `10298746267` (`sha256:363c76df628f3d75b0c9a80a3a54b00c9d029c2dd757647afe56a60c6f835f12`) verified real Organize composition. Drag Drop artifact `10299387838` (`sha256:158f374852709351880767c6780bcc62dd1a87c2fadca8e52a73d06412b92655`) verified desktop drop-active/completed and 390px completed Uploads states.
- Presentation-only verifier corrections were bounded to UI-075 reality: Search targets the new `Search Library` accessible name; History waits for the selection rail to settle before the required mobile selected-state capture; Lifecycle verifies Gallery Rail media-frame fill with `object-fit: cover` while Viewer still verifies the source asset ratio. Product/security assertions were not weakened. One Lifecycle attempt transiently missed the short-lived `Added to Library.` status after upload completion and cleanup; the unchanged retry passed the full verifier.
- PR #194 squash-merged to `main` as `af88b93dcb4fcbca502b42f9ea1186192af48a6a`. GitHub attached exactly two push workflows to that merge SHA and both passed: Engineering Quality `34699439085` and UI Shell Validation `34699439083`.
- Phase 24 repository implementation is therefore user-approved, exact-head verified, merged and merged-main verified. Production remains unchanged at source `0173c4c5ba08360b6352331118abc81978cfa774` / READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`; automatic Git → Vercel deployment remains disabled and no Phase 24 deployment is authorized.

## UI/UX redesign program — continuation roadmap — 2026-09-12
**Status: ACTIVE — Landing, Create and Library completed; remaining product surfaces still require redesign.**

Phase 24 closed the approved Library Gallery Rail slice; it did **not** close the broader RenderLab UI/UX redesign program. The redesign must continue as one coherent system derived from the locked Lab Grid identity, approved Lab Matrix Landing, Clear Composer / UI-074 application language and Gallery Rail / UI-075 media language.

Completed redesign slices:
- **Landing:** approved Lab Matrix public experience, production-live.
- **Create:** approved Clear Composer v0.5 plus UI-074 fidelity correction, merged and verified, not yet deployed.
- **Library:** approved Gallery Rail v0.3 / UI-075, merged and verified, not yet deployed.
- **Media Viewer:** approved Media Register + Source Fold v0.2 / UI-076, merged and merged-main verified, not yet deployed.
- **Application shell:** UI-074 compact horizontal header is the current shared shell geometry and should be maintained/cohered rather than restarted as a competing navigation system.

Remaining redesign roadmap, under progressive phase planning:
1. **Phase 25 — Media Viewer:** USER-APPROVED / EXACT-HEAD VERIFIED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED. Media Register + Source Fold v0.2 is now the repository-authoritative Viewer composition under UI-076. Viewer remains a 3/4-expressiveness surface.
2. **Phase 26 — Activity:** NEXT / ACTIVE R&D. Phase 25 evidence is closed; audit the current Activity desktop/390px real-state lifecycle, then develop same-family concepts at 2/4 expressiveness without weakening Retry / Run Again / Cancel truth or operational clarity. No production Activity implementation should begin before explicit design approval and an implementation contract.
3. **Phase 27 — Settings / account-security flows:** roadmap only. Apply the shared typography, spacing, shell and trust language at 1/4 expressiveness across signed-out, signed-in, access-status, password and recovery states.
4. **Phase 28 — Admin:** roadmap only. Apply the coherent system to the privileged operational surface at 1/4 expressiveness while preserving dense clarity and authorization boundaries.
5. **Phase 29 — whole-product cohesion pass:** roadmap only. Audit the completed system end-to-end for shell/navigation continuity, typography, spacing, responsive behavior, empty/loading/error states, focus/touch semantics, reduced motion and cross-surface transitions before calling the redesign program complete.

Phase 25 is closed. The next session may expand only the immediate Phase 26 Activity R&D slice; Phases 27–29 remain roadmap-level until predecessor evidence exists. Every remaining surface must reuse the established RenderLab visual/interaction family rather than inventing a new theme. Production deployment remains separate and explicit; current production is still source `0173c4c5ba08360b6352331118abc81978cfa774` at READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`, with automatic Git → Vercel deployment disabled.

## Phase 25 Media Viewer Register + Source Fold closure — 2026-09-13
- User approved **Media Register + Source Fold v0.2** from R&D head `639aef25e57e166be8d8b3d226b3e83930e05a25`; design run `34703774288`, artifact `10300577421`, digest `sha256:06cade2dc2e9ce51dc871971530fa9641a7c1ef0cc0271e19763fcebfa8ca2b0`.
- UI-076 plus `docs/ui/MEDIA_VIEWER_REGISTER_FOLD_IMPLEMENTATION_CONTRACT.md` were merged before production work in PR #199 as `a5db944acdefad7b9fcbbedd9d6b521b5a28c576`.
- PR #200 implemented the approved registered media-first Viewer, attached continuation register, local Prompt/Details/Manage disclosures, singular quick/manage action ownership, Result-primary Source Fold, narrow Result→Source stacking, bounded image-only fine-pointer depth, static touch and reduced-motion equivalence while retaining native video and existing continuation/Upscale/security contracts.
- Definitive exact implementation head `3e468ad0abd4f7b6645e86e298ce53a3a8ecf034` passed the complete affected acceptance set. Dedicated Viewer run `34717466185` produced artifact `10304951419`, digest `sha256:d551006acffa260e8bbd83e25c2b156204a4391f1f9b1abcfc4e58aa0cc28e04`; human review accepted desktop, 390px, disclosures, native video, Result-primary Compare, temporal Source Fold, reversal and reduced-motion fidelity against v0.2.
- Successful exact-head coverage included Engineering `34717466149`, Ownership `34717466209`, UI Shell `34717466157`, Search `34717466145`, History `34717466189`, Favorites `34717466126`, Collections `34717466254`, Download `34717466273`, Rename `34717466210`, Media Delete `34717466203`, Library Lifecycle `34717466215`, Batch Delete `34717466200`, Creative Iteration `34717466236`, Upscale Viewer `34717466198`, Image Upscale `34717466222`, Brand / Launch unchanged retry `34717466191`, Integrated Release unchanged retry `34717466228`, and Library Drag Drop fresh same-head run `34718085004`.
- PR #200 merged to `main` as `b672c711f885092c5e92c42824078e7bd5bc691e`. GitHub attached exactly six push workflows to that merge SHA and all six passed: Engineering Quality `34718303036`, UI Shell Validation `34718302987`, Upscale Viewer Visual `34718303044`, Media Viewer Register Fold Visual `34718302986`, Image Upscale Integration `34718302998`, and Creative Iteration `34718303019`.
- Presentation-only verifier migrations were bounded to UI-076 reality; substantive product/security assertions were preserved. No schema/API/provider/worker/R2/auth/admission/ownership/routing/deployment contract changed.
- Production remains unchanged at source `0173c4c5ba08360b6352331118abc81978cfa774` / READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`; automatic Git → Vercel deployment remains disabled.

**Phase 25 status: `USER-APPROVED / EXACT-HEAD VERIFIED / MERGED / MERGED-MAIN VERIFIED / NOT DEPLOYED`.**

## Current Verified Baseline — 2026-09-12
- The verified repository application baseline is Phase 25 / PR #200 merge `b672c711f885092c5e92c42824078e7bd5bc691e`; Media Register + Source Fold v0.2 is user-approved, exact-head verified and merged-main verified. Production remains the separately approved source `0173c4c5ba08360b6352331118abc81978cfa774`; no production deployment followed the Phase 25 repository merge.
- Cycle 2 — Creative Productivity & Beta Maturity is `COMPLETE / VERIFIED`.
- Phase 13 — Email & Invite Production Hardening is `COMPLETE / VERIFIED`.
- Accepted production application is source `0173c4c5ba08360b6352331118abc81978cfa774` at READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991` / `https://renderlab-a9ssca2l8-faresmohamed260-6733s-projects.vercel.app`. Explicit alias run `34547608773` moved `https://renderlab.faresuniform.uk` to that deployment and passed root + `/create` + `/library` + `/activity` + `/settings` smoke; independent Vercel checks found no runtime-error clusters and no error/fatal logs after rollout. Prior accepted UI-071 deployment `dpl_5U3URZkAjMqB3gZMS3pnXP7by2Ra` remains a known-good prior deployment for explicit alias restoration if needed.
- Closed-Beta enforcement is active in production. Final guarded Phase 13 cleanup preserved exactly one active admin, zero pending invitations and generation defaults enabled / one active job / 12 admitted per rolling hour / no updater.
- Production Auth invite/recovery mail uses verified Resend custom SMTP with branded token-hash templates and click/open tracking disabled. External Gmail invite/recovery acceptance completed; Outlook-specific rendering was not exercised.
- Automatic Git → Vercel deployment remains disabled. Documentation changes do not authorize or imply a production deployment.
- Application surfaces remain verified through UI-071, while the public `/` surface is now the approved Lab Matrix Landing. UI-068 / PR #138, UI-069 / PR #140, UI-070 / PR #142 and UI-071 / PR #145 remain included in production source `0173c4c5ba08360b6352331118abc81978cfa774`; Landing implementation PR #174 is production-live in READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`. Automatic Git → Vercel deployment remains disabled.
- UI-071 / PR #145 is merged as `be0d2fa23fd16acbd5202e88ba2a09a7d8eefc20`: desktop application routes omit the redundant top context bar, mobile/narrow routes retain account/Settings access, and Create reference-drop copy aligns beside its icon. Exact candidate `c151b0284a29a469b1e89d5f4cd66c55151d1d01` passed all 14 attached workflows and responsive rendered review; all four workflows attached to merged main also passed. UI-071 remains included in current production source `0173c4c5ba08360b6352331118abc81978cfa774`, now served with the Lab Matrix Landing from READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`; its original guarded production rollout evidence remains run `34460364114`. See `docs/ui/UI_MIGRATION.md` for the verification record.
- UI-070 rendered review accepted desktop and 390px selected-card states from tree-identical Library History artifact `10129703554` (`sha256:9d603f1fddbb76f2e25e68fcaf6ae991e700ac0703848d279b72c0c3a7947e06`); configured History also proved the 44×44 maintained checkbox root, 22×22 visual box and metadata integrated inside the media frame. No Library data, route, selection, media, schema or deployment contract changed.
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

## Post-Cycle 3 Corrective Maintenance — Contextual Image Model Choice
**Status: `COMPLETE / VERIFIED / MERGED`.**

The existing Create Image/Edit capability now treats model selection as user-owned product intent rather than an invisible routing choice. Image mode exposes **FLUX.2 Klein 9B** as the default and **Qwen Image Edit 2511** as an explicit alternative; Video remains on its single current REDGraft model and therefore does not gain a redundant selector. The chosen image model is validated at the product request boundary, persisted in existing `generation_jobs.parameters.model`, reconstructed by Reuse Settings / Run Again / failed Retry, and mapped server-side to the matching worker ecosystem. Historical prompt-generation jobs without a persisted model retain the pre-change defaults (Image → FLUX, Video → REDGraft). Qwen keeps its verified fixed 4-step / CFG 1.0 tuning, so FLUX-only configurable Steps/Guidance are not exposed for Qwen. Worker IDs, primary/standby choice, provider IDs and workflow internals remain hidden.

Fresh read-only Qwen readiness audit `34064898642` / artifact `9998623751` (`sha256:5075cdef0ee55cfa7b6649642815fcb2d6f585fc27565d0eb85f6bc9907975af`) verified both registered Qwen gateways ready with the same async multi-reference contract and fixed tuning. Local isolated routing proof `34065515794` verified Qwen/FLUX/default model routing, persisted intent, invalid model/tuning rejection and cleanup without provider generation spend. Exact PR head `d5f80c02f041b645b7a3b1dee13d70d8139cc832` passed all 19 attached workflows, including Image Model Routing, Engineering Quality, Create Lifecycle, Generation/Video integration, Admission/Reconciliation/Cancellation and responsive UI coverage. PR #115 merged to `main` as `e8649ba39e660e2ec98cfd2fd864b22db74e64e3`. No schema migration, worker redeployment, new infrastructure resource, top-level Models screen or production deployment was part of this corrective slice.

## Post-Cycle 3 Corrective Maintenance — Library Creatives / Uploads
**Status: `COMPLETE / VERIFIED / MERGED`.**

Library now separates the existing durable asset set into two same-route user-facing sections without splitting media identity. **Creatives** is the canonical `/library` default and lists `media_assets.origin=generated`; **Uploads** is URL-owned as `?tab=uploads` and lists `origin=uploaded`. Existing All/Images/Videos, search, Favorites, Collections, sort and bounded pagination compose inside the active section; switching sections clears stale pagination. Upload and desktop drag/drop belong to Uploads only, while Viewer/deep-link identity and Favorite/Collection/Rename/Delete/Download/continuation behavior remain origin-agnostic over the same durable media IDs.

`GET /api/media/assets` accepts optional validated `origin=generated|uploaded`; omitting it preserves the existing unified API contract. No schema migration, backfill, R2 change, worker change or new route was introduced. Exact reconciled head `a81c02e82abb0cec6b386e4cfb69f1075f377e33` passed all 30 attached workflows, including Library Search/Lifecycle/Drag Drop, persistent upload, generation/video, ownership, UI shell and affected media regressions. Final desktop and 390px Library artifacts were reviewed clean. PR #116 merged to `main` as `999d32812e74afdba73e3cbaa7607a64ce65d603`, and all nine workflows GitHub attached to that merge SHA completed successfully.

## Post-Cycle 3 Corrective Maintenance — Repository Closure / Deployment Readiness
**Status: `COMPLETE / VERIFIED / MERGED / NOT DEPLOYED`.**

- Authoritative repository `main` is `999d32812e74afdba73e3cbaa7607a64ce65d603` before this documentation-only closure.
- Corrective product PRs #115 and #116 are merged; temporary validation PR #113 is closed without merge; no resolved-work pull request remains open.
- The model-choice exact head passed 19/19 attached workflows, the reconciled Library exact head passed 30/30, and the latest implementation merge passed all nine workflows GitHub attached to `main`.
- Production remains the separately verified application source `71a9034039a64beec66894cc4f79b1f62bfc7bf7` at READY deployment `dpl_Ck2HEMFpt2aRUwSVTrYA6YcFTbbi` / `https://renderlab.faresuniform.uk`. These repository merges are **not deployed**.
- Automatic Git → Vercel deployment remains disabled. No Supabase migration, R2 resource change, worker redeployment or scheduler activation is implied by repository readiness.


## Post-Cycle 3 Corrective Maintenance — Create control density / Advanced parity
**Status: `COMPLETE / VERIFIED / MERGED`.**

- [x] Give Image and Video the same dedicated Advanced disclosure button; remove Advanced from the Video Resolution / Duration / Audio menu.
- [x] Compact the narrow Create control chrome so Image and Video contextual controls stay on one no-wrap row while Generate remains the full-width primary action below on narrow layouts.
- [x] Keep full accessible model naming while shortening the visible Image-model trigger to `FLUX` / `Qwen` so the current productized model choice fits the compact row without hiding it.
- [x] Keep resolution, duration, audio, aspect, model intent, Advanced values, serialization, worker routing and generation capability unchanged.
- [x] Extend configured Create lifecycle verification with dedicated Video Advanced coverage plus 390px one-row/no-overflow assertions for both Image and Video.
- [x] Exact final PR head `4334d76cfaf112c11ba87e961de565673551d500` passed all 11 attached workflows after the stale Creative Iteration verifier was corrected to use the dedicated Advanced button. Create Lifecycle `34073557139` produced artifact `10001298383` (`sha256:621a740704e132223122d79a520f8b56b41b5b9c83ec363478763b843e700996`); desktop and 390px Image/Video artifacts were reviewed clean for the compact no-overflow control row and separate Advanced disclosure. PR #118 squash-merged as `ea88425554a39ab904c56bbeed51ac396e0bfb38`.

No schema migration, worker deployment, provider/routing change, new route, new primitive or production rollout occurred as part of this corrective item. Production rollout remains explicit and separate.


# Cycle 4 — Kinetic Visual Experience
**Status: `COMPLETE / VERIFIED / MERGED / PRODUCTION LIVE`.**
**Planning baseline:** `e85aa633caa25e1bc7fdc529d37f08d10cde3cea`.

## Objective
Make RenderLab visibly feel like a premium next-generation AI creative instrument. This cycle is intentionally about what users can see and feel: spatial continuity, responsive depth, morphing state, spring-like tactile feedback, atmospheric surfaces and highly polished media presentation. It is not a performance-only or backend cycle.

The target is closer to the interaction quality of modern AI model-demo experiences than to a conventional dark dashboard: futuristic, kinetic and memorable without becoming noisy, unreadable or gimmicky.

## Visual thesis — Kinetic Precision
RenderLab keeps its dark-first media-focused foundation but evolves it into a more dimensional system:
- deep near-black canvas with restrained violet/electric spectral light rather than flat charcoal panels;
- translucent elevated chrome with luminous edge response instead of large opaque boxes;
- spring-based spatial transitions and shared-layout morphs so state feels physically connected;
- low-frequency atmospheric motion in the background, with task/media content remaining dominant;
- tactile hover/press/focus feedback, including selective magnetic or depth response where it clarifies interactivity;
- morphing disclosure and navigation selection rather than abrupt swaps;
- later media surfaces may use bounded tilt/depth and card-to-viewer spatial continuity;
- reduced motion always resolves to a complete static experience.

This direction is intentionally **not** generic neon cyberpunk. Avoid rainbow chrome, constant parallax, cursor followers, perpetual high-amplitude animation, fake particle overload, or visual effects that make prompts/media harder to read.

## Locked cycle roadmap
1. **Phase 19 — Kinetic Foundation & App Shell.** Establish the visual tokens/effect budget and make every application route immediately feel different through atmospheric canvas, glass/depth shell treatment, shared-layout active navigation, tactile feedback and route transitions.
2. **Phase 20 — Create as a Creative Instrument.** Recompose the Create workspace around a more immersive prompt surface, morphing Image/Video context, richer Advanced disclosure, tactile generation controls and expressive but truthful generation/result state motion.
3. **Phase 21 — Library & Viewer Spatial Media Experience.** Elevate Creatives/Uploads browsing and the Viewer with media-first depth, bounded hover/tilt, shared-element/spatial continuity, richer selection/organization feedback and result/source comparison polish.
4. **Phase 22 — Activity, Settings, Landing & System Cohesion.** Give remaining user-facing surfaces the same visual language, add expressive lifecycle/status presentation where useful, and run the final cross-product responsive/accessibility/performance visual audit.

Later phases remain roadmap-level until the immediately preceding phase produces rendered evidence. The cycle does not pre-approve backend capability, schema, worker, routing or deployment changes.

---

# Phase 19 Execution Contract — Kinetic Foundation & App Shell
**Status: `COMPLETE / VERIFIED`.**
**UI decision:** UI-062.

## Goal / user value
The first application viewport should immediately communicate that RenderLab is a futuristic creative system rather than a default component-library application. The change must be obvious before the user opens a menu or starts a generation.

## Verified starting state
- The application shell is approved but not locked and is shared by Create, Library/Viewer, Activity, Settings and Admin.
- Current global styling is a flat dark token set (`canvas`, `surface-1..3`, border, text, accent) with no atmospheric layer or shared effect tokens.
- `motion@13.1.1` is already pinned and approved for reduced-motion-aware layout/presence transitions; no new animation runtime is required for Phase 19.
- The current shell uses conventional opaque sidebar/topbar/mobile-bottom-nav surfaces and static active navigation styling.
- Existing route prefetch/refresh behavior is performance-sensitive and must remain intact.
- Production deployment remains explicit and separate; Phase 19 implementation/merge does not deploy automatically.

## In scope
### 19A — Kinetic visual tokens and effect budget
- Add semantic visual tokens for glass/translucent surfaces, surface highlight, subtle spectral accent, soft glow/elevation and atmospheric background treatment.
- Keep the existing semantic roles intact; new tokens extend the system rather than replacing contrast/status meaning.
- Establish effect intensity rules so glow, blur and gradients are concentrated in shell/interaction emphasis rather than flooding every card.

### 19B — Atmospheric application canvas
- Add a RenderLab-owned application backdrop with layered radial/spectral light and very slow transform/opacity motion.
- Prefer CSS/GPU-friendly transforms and opacity for continuous ambience; avoid a continuous JavaScript animation loop.
- Background motion must be subtle enough that media and text remain the focal point.
- `prefers-reduced-motion` must disable or collapse ambient movement without removing the visual composition.

### 19C — AppShell visual transformation
- Desktop sidebar/top bar become translucent dimensional chrome with controlled backdrop blur, inner highlight and separation from the atmospheric canvas.
- Active navigation uses a shared-layout morphing background/indicator with spring motion; icons/text receive restrained active emphasis rather than a static filled button only.
- Hover/press states gain tactile spring/scale feedback while preserving keyboard/focus semantics.
- Mobile bottom navigation becomes a compact floating dock treatment with safe-area support and the same morphing active state.
- Brand/account/activity affordances retain existing destinations and semantics.

### 19D — Route-content continuity
- Add a small reduced-motion-aware route transition at the shell content boundary so top-level Create / Library / Activity / Settings changes feel spatially connected instead of hard-cutting.
- The transition must not interfere with Next.js navigation, route prefetch, server rendering, focus handling or current refresh behavior.
- Do not animate nested Viewer transitions as if they were top-level section changes; later Phase 21 owns media-specific spatial continuity.

### 19E — Responsive and accessibility behavior
- Preserve desktop and narrow information architecture.
- No essential interaction may depend on hover or pointer motion.
- Focus rings remain high-contrast and visible over translucent/glowing surfaces.
- Text contrast and touch targets remain WCAG-oriented.
- Reduced motion uses static state changes with no transform-dependent meaning.

## Explicitly out of scope
- Internal Create composer redesign beyond shell inheritance (Phase 20).
- Library card/Viewer spatial redesign (Phase 21).
- Activity row or Settings content redesign beyond shell inheritance (Phase 22).
- WebGL/canvas particle engines, shader backgrounds, cursor-following particles, audio-reactive effects or a permanent physics simulation.
- Product capability, generation semantics, model routing, media identity, schema, Supabase, R2, worker/provider or deployment changes.

## Component / architecture direction
- Reuse the existing `AppShell`, `Button`, `RenderLabBrand`, Lucide family and `motion/react` dependency.
- A small shell-owned motion composition may be introduced for shared-layout navigation and route transitions; it must remain UI state only and never become a product/global data store.
- Atmospheric visuals belong to the application-shell visual layer, not to feature data components.
- Prefer CSS custom properties and semantic Tailwind tokens for reusable visual effects.
- Do not add a new third-party package unless implementation proves the existing Motion + CSS stack cannot provide the required effect cleanly.

## Validation matrix
Before Phase 19 can be marked complete:
- `npm run verify:ui-purity`, lint, typecheck, unit tests and production build pass on exact head;
- UI Shell regression passes with existing navigation/prefetch/account semantics;
- affected Create, Library and Activity lifecycle/render workflows pass because the shared shell changes every application route;
- desktop and 390px screenshots are captured for at least Create, Library and Activity;
- visual review confirms the atmospheric canvas, dimensional chrome, morphing active navigation and route transition are materially visible and coherent;
- no horizontal overflow, clipped mobile dock, unreadable text, excessive blur/glow or reduced-motion regression is accepted;
- implementation uses transform/opacity for continuous motion and does not introduce a permanent high-frequency JS animation loop.

## Documentation outputs
On verified implementation update `PROJECT.md`, `docs/ui/UI_MIGRATION.md`, `docs/ui/UI_DECISIONS.md`, `docs/ui/UI_SYSTEM.md`, `docs/ui/COMPONENT_CATALOG.md`, `docs/ui/SCREEN_REGISTRY.md` and `docs/architecture/FRONTEND_ARCHITECTURE.md` where implementation changes durable visual/component/architecture state.

## Exit criteria
Phase 19 is complete only when a user can visibly identify the new visual era on first load, the exact-head functional/regression matrix is green, desktop/mobile renders are reviewed, reduced-motion/accessibility behavior is verified, and authoritative docs match the implementation. Build success alone is insufficient.


## Phase 19 verified implementation evidence — 2026-09-07
- Exact implementation head `ea21d56e4ac643ec32d586759fc48c2ef165e44b` passed Engineering Quality `34094816665`, UI Shell Validation `34094816643`, Create Lifecycle Visual `34094816661`, Brand / Launch Visual `34094816547`, Account/Admin Operations `34094816585`, and Integrated Release `34094816569`.
- UI Shell artifact `10008197585` (`sha256:8d6dfdc25b14b2c276d3893e720a3e81260719555e47a3f34c4119611d042448`) contains reviewed 1440px Create / Library / Activity plus 390px Create and reduced-motion Library evidence.
- Review rejected the first visually conservative candidate and strengthened the final spectral atmosphere, luminous edge separation, floating desktop rail/topbar, shared-layout active state and mobile dock before closure.
- Top-level route entrance motion was tightened to 220ms with only 3px blur / 6px travel so visual continuity does not reintroduce the earlier perception of slow tab switching.
- The implementation preserves explicit full-route prefetch plus section refresh behavior, account/privacy semantics, feature routes and product contracts. No schema, R2, worker/provider, generation capability or deployment change occurred.
- Phase 20 may now be expanded from roadmap level into an execution contract. Production rollout remains explicit and separate.

# Phase 20 Execution Contract — Create as a Creative Instrument
**Status: `COMPLETE / VERIFIED / MERGED`.**
**UI decision:** UI-063.
**Planning baseline:** `83f476c1e0b6b3bffada1300d43f6ef08be5c7ea` (Phase 19 / UI-062 merged).

## Goal / user value
Transform `/create` from a clean generation form into the signature hands-on RenderLab creative instrument. The first viewport must feel more immersive, tactile and alive while preserving every verified generation, ownership and progressive-disclosure contract.

The Phase 20 user promise is visual and interaction-led:

> Prompting, switching Image/Video intent, adding references, opening precision controls, starting generation and receiving a result should feel like operating one coherent creative instrument rather than filling out a stack of unrelated controls.

## Verified starting state — 2026-09-07
- Phase 19 is merged and establishes the Kinetic Precision shell, spectral atmospheric canvas, dimensional glass chrome, shared-layout spring navigation, tactile feedback and reduced-motion baseline.
- `CreateWorkspace` already owns the complete current product intent: prompt, Image/Video mode, explicit Image model choice, aspect ratio, Video Resolution/Duration/Audio, references, Advanced controls, generation submission, lifecycle feedback and result continuation.
- UI-061 has already compacted the primary controls into one 390px-safe row and gives Image and Video one dedicated Advanced disclosure. Phase 20 must preserve that density/availability rather than reintroduce wrapped control chrome.
- Create already uses `motion/react` for context, reference, mode-control, Advanced and result continuity. The next pass is therefore a composition/interaction upgrade, not a new animation-runtime requirement.
- Current composer treatment is still visually conventional: a bounded `surface-1` form with prompt field, compact controls and a separate Generate button. This is the main visual gap Phase 20 owns.
- Existing generation state is truthful but intentionally coarse. Phase 20 may make queued/preparing/running/persisting/succeeded/failed/cancelled feel richer, but it must not fabricate percentages, provider stages, ETA or deterministic progress.
- Production deployment remains explicit and separate. Implementation/merge does not deploy automatically.

## In scope
### 20A — Instrument frame and immersive prompt stage
- Recompose the Create form as a distinctive Kinetic Precision instrument surface: layered translucent depth, restrained spectral rim/highlight, clearer prompt focus and more intentional internal spacing.
- Keep the prompt itself visually dominant. Decorative atmosphere belongs at the frame/edge level rather than behind body text.
- Add focus-within response that makes the instrument feel active without using cursor-following effects or continuous JavaScript physics.
- Preserve the current task heading/supporting copy but integrate it spatially with the instrument rather than leaving the composer feeling like a generic card below a page heading.

### 20B — Morphing Image / Video context
- Turn the existing accessible Image/Video ToggleGroup into a shared-layout morphing selection with a restrained spring indicator.
- Contextual model/aspect/Video settings continue to enter/leave through spatial continuity rather than hard replacement.
- Mode changes may adjust spectral emphasis, labels and microcopy, but must not create separate Image and Video applications or routes.
- Preserve the 390px one-row control contract and every current accessible name/semantic.

### 20C — Reference media choreography
- Make attached references read as media modules/slots rather than ordinary list rows: stronger thumbnail hierarchy, slot/alias clarity and tactile add/remove/reorder/replace response.
- Existing stable `@imageN` aliases, primary/reference roles, source ownership and operation resolution remain authoritative.
- Animation may clarify insertion/removal/reorder but never hide a required action or make reduced-motion users infer state from motion.

### 20D — Advanced as a precision deck
- Keep one dedicated Advanced control in both modes.
- Recompose `CreateAdvancedPanel` as a coherent precision deck that expands from the instrument rather than reading as an appended settings form.
- Use a transition-panel/morphing-disclosure pattern when it materially improves continuity; maintain the existing fields, model-specific visibility, validation and Reset behavior.
- Do not expose worker/workflow/provider parameters that are not current product intent.

### 20E — Generate actuator and truthful lifecycle energy
- Make Generate the signature tactile actuator: clearer enabled/disabled hierarchy, spring press response, restrained luminous emphasis and a visibly different active-generation state.
- Map visual energy only to real product state. Queued/preparing/running/persisting may use bounded non-percent motion; succeeded/failed/cancelled use their established semantic status roles.
- Do not add fake progress percentages, ETA, provider-stage claims or decorative motion that implies backend progress the product cannot prove.
- Preserve admission-limit, signed-out, upload-unavailable and generation-unavailable feedback exactly at the product-contract level.

### 20F — Result arrival and continuation presentation
- Make result arrival feel spatially connected to the instrument using bounded opacity/blur/scale/layout motion and stronger media-first presentation.
- Preserve durable result identity, native media controls, continuation actions, Reuse Settings and all existing result semantics.
- Result motion must not cause large layout jumps or hide the result/action hierarchy on narrow screens.

### 20G — Responsive, accessibility and effect budget
- 390px narrow layouts must keep the prompt, essential controls, Generate and result reachable with no horizontal overflow.
- Keyboard focus, Radix semantics, screen-reader names and touch targets remain complete.
- `prefers-reduced-motion` keeps the complete visual hierarchy while removing transform-dependent choreography and continuous ambient motion.
- Avoid WebGL, cursor followers, scroll hijacking, permanent particle systems, large-area glow behind copy and multiple competing animation runtimes.

## Optional design / interaction toolbox
The user explicitly suggested the following as optional references/tools, not constraints. Treat them as a toolbox to evaluate against the RenderLab stack and the concrete interaction need:
- **Motion Primitives / Motion for React:** first choice for shared-layout, spring, morphing disclosure, magnetic/tactile and layout-presence work already compatible with RenderLab.
- **React Bits:** candidate source for selected physics-like or creative interaction patterns after accessibility/performance/reduced-motion review.
- **GSAP:** consider only for choreography that is materially clearer or more maintainable than the existing Motion stack; do not introduce a second runtime for ordinary hover/layout transitions.
- **Lenis:** consider only if a later surface needs deliberate smooth-scroll behavior; Phase 20 Create does not require scroll hijacking by default.
- **Watermelon UI / Kaikei.app:** visual/component inspiration and pattern research; adoption requires stack, license, accessibility and token-fit review.
- **Taste skill / Vercel web-design-guideline skill / `awesome-design.md`:** review heuristics when available in the active environment; they are advisory, not repository authority.
- **Image-to-code:** acceleration aid for a specific reviewed visual reference, never a substitute for product semantics or responsive verification.
- **Emil Kowalski design references:** interaction-quality inspiration for timing, tactility and restraint; patterns are adapted to RenderLab rather than copied as a competing visual system.

No item above is mandatory and none becomes a production dependency merely because it appears in this list. Existing RenderLab primitives and Motion remain the default until a concrete gap justifies something else.

## Explicitly out of scope
- New generation capabilities, models, worker/provider routing, workflow selection, LoRA/adapters, Variations or backend parameter expansion.
- New route or separate Image/Video apps.
- Library/Viewer card spatial redesign (Phase 21) or Activity/Settings/Landing internal redesign (Phase 22).
- Schema/Supabase/R2 changes, worker deployment, scheduler changes, billing or deployment.
- WebGL/shader canvas, cursor-following particles, continuous pointer physics, audio-reactive visuals or scroll hijacking.
- Replacing approved shadcn/Radix controls solely for visual novelty.

## Architecture / component boundary
- `CreateWorkspace` remains the single feature owner for Create composition and client interaction state.
- `CreateAdvancedPanel` remains the Advanced field owner; visual restructuring must not duplicate validation/state.
- Shared conventional controls continue through `src/components/ui`; any adopted external mechanic is adapted behind a RenderLab-owned wrapper/composition and recorded in `COMPONENT_CATALOG.md`.
- Motion remains presentation state only. Generation intent, job state, account/access/admission, media identity and server validation stay in their current authoritative boundaries.
- Prefer CSS transforms/opacity/filter and Motion layout/presence. A new runtime dependency requires a documented concrete gap, bundle/performance review and reduced-motion plan before adoption.

## Required validation matrix
Phase 20 final acceptance requires, on one exact implementation head:
- `npm run verify:ui-purity`, lint, typecheck, unit tests and production build;
- Create Lifecycle Visual with desktop and 390px Image + Video states;
- Image Model Routing, Creative Iteration, Generation Admission, Generation Integration and Video Generation Integration because model/mode/Advanced/submit/result composition is affected;
- Create Durable Upload and Reference Upload coverage for reference composition;
- UI Shell and Integrated Release regressions;
- any additional path-triggered account/media tests GitHub attaches;
- rendered review of at least: empty Image, empty Video, reference-attached Edit/Animate, Advanced open, active-generation, durable result, and reduced-motion states across desktop and 390px where applicable;
- explicit no-horizontal-overflow and keyboard/focus checks;
- evidence that no fake progress/ETA/provider detail was introduced.

## Documentation outputs
On verified implementation update `PROJECT.md`, `docs/ui/UI_MIGRATION.md`, `docs/ui/UI_DECISIONS.md`, `docs/ui/UI_SYSTEM.md`, `docs/ui/COMPONENT_CATALOG.md`, `docs/ui/SCREEN_REGISTRY.md` and `docs/architecture/FRONTEND_ARCHITECTURE.md` only where implementation changes durable state. Record any external component/runtime actually adopted, including source and reason.

## Exit criteria
Phase 20 is `COMPLETE / VERIFIED` only when:
- Create is visibly recognizable as the signature Kinetic Precision creative instrument rather than a generic form;
- Image/Video mode, references, Advanced, Generate, active generation and result arrival feel like one coherent spatial system;
- all existing generation/model/reference/admission/ownership semantics are preserved;
- desktop and 390px rendered evidence is visually reviewed and clearly stronger than the Phase 19-inherited baseline;
- reduced motion, keyboard/touch accessibility, control density and overflow remain correct;
- the exact-head functional matrix is green and authoritative docs match verified implementation;
- no production deployment is inferred or performed without separate explicit authorization.

## Phase 20 implementation checkpoint — 2026-09-07
**Status: `IMPLEMENTED IN DRAFT / EXACT-HEAD ACCEPTANCE IN PROGRESS`.**
**Draft PR:** #122 — `Implement Phase 20 Create as a Creative Instrument`
**Base:** `main` `33b44663a6305ddb97122c92a5583658d69dd406`
**Current exact implementation/test head at checkpoint:** `b449cc0fbc4d87758e099b1d1d4afcd4d53595bd`

Verified implementation reality at this checkpoint:
- `/create` is recomposed as a Kinetic Precision instrument surface with layered translucent depth, spectral focus response and a stronger prompt stage while preserving the existing Create route and generation contract.
- Image/Video intent uses a shared-layout spring highlight and bounded contextual presence motion; the established 390px one-row essential-control contract remains authoritative.
- Attached references use elevated media-module styling while preserving stable aliases, roles, ownership and continuation semantics.
- `CreateAdvancedPanel` now renders as an integrated precision deck rather than an appended generic settings card; field visibility/validation and the dedicated Advanced control remain unchanged.
- Generate is a luminous tactile actuator whose active presentation is driven only by real `submitting` / nonterminal job state. The lifecycle strip exposes only real RenderLab job categories and does not invent percentage progress, ETA or provider stages.
- Loading/result surfaces use the same dimensional language and existing durable result/continuation contracts.
- Reduced-motion equivalents remove transform/scan choreography without removing hierarchy or meaning.
- No GSAP, Lenis or other new runtime dependency was added: the current Motion + CSS + RenderLab primitive stack proved sufficient for this slice.
- No generation capability, model routing, worker/provider, schema, Supabase, R2, account/admission or deployment boundary changed.

Validation/evidence so far:
- A real 4px narrow Video control-row overflow introduced by the richer instrument padding was found through the configured Create lifecycle and corrected without shrinking the established controls.
- The first active-generation verifier failure was classified as a stale test locator: the product correctly changes the actuator label from `Generate` to `Generating`, so the verifier now targets the stable `.kinetic-generate` product marker and separately asserts `data-active=true` plus visible `Generating` state.
- Connector-authored tree-identical head `b449cc0fbc4d87758e099b1d1d4afcd4d53595bd` exists specifically so the real PR workflow matrix runs after GitHub Actions-authored helper commits were suppressed as `action_required`.
- Final exact-head acceptance still requires terminal success for all attached workflows plus human review of desktop/390px empty Image/Video, reference, Advanced, active-generation, result and reduced-motion artifacts. Do not merge or mark Phase 20 complete before that evidence exists.

Production remains unchanged. Automatic Git → Vercel deployment is disabled; Phase 20 implementation/merge does not authorize deployment.

## Phase 20 verified closure — 2026-09-07
**Status: `COMPLETE / VERIFIED`.**

Phase 20 functional implementation head `b7358da8f71fd789249515fca87ed01a64789f5f` passed all 17 attached exact-head workflows. Video Generation Integration `34149277852` passed the 1,320-case pure contract, production build and the complete configured live ownership matrix after the separately authorized REDGraft recovery: 480p Create Video produced 854×480 / 5.00s / 24fps / no audio; 1080p Create Video produced 1920×1080 / 5.00s / 24fps / no audio; 720p portrait/audio Create Video produced 720×1280 / 10.00s / 25fps / audio present; and 2K Animate Original produced 2304×1152 / 5.00s / 30fps / no audio. All four jobs reached durable success and exact cleanup completed. Contextual review artifact `10029509695` has ZIP digest `sha256:578216c480ed2cc55acf70167494712995617baba1bdcc10786d0a2d6e0d7dc6`.

Create Lifecycle Visual `34149277859` passed on the same exact head and uploaded artifact `10028815164` (`sha256:88637c653129ed7cdfba38a3b2fd5fc6022ac297cd41d4e09dcc8646cde01f3c`). Human review of its 16 desktop/390px states confirms the prompt remains dominant; Image/Video essential controls stay one-row and unclipped at 390px; the Video settings popover remains in viewport; Advanced is integrated into the instrument; reference alias/role hierarchy remains clear; active generation exposes only truthful `Generating` state; durable results retain clear hierarchy; focus remains visible; and reduced-motion states preserve meaning without transform-dependent motion. No corrective visual iteration is required.

The implementation uses the existing Motion + CSS + RenderLab primitive stack and changes no generation capability, model semantics, media/reference identity, account/admission contract, schema, Supabase or R2 contract. The separately authorized REDGraft recovery and routing correction are recorded in `docs/architecture/INFRASTRUCTURE.md`; historical `-01` LTX registrations remain disabled rather than being repurposed. Production remains unchanged, automatic Git → Vercel deployment remains disabled, and this completion does not authorize deployment. Phase 21 remains roadmap-only until Phase 20 is merged and merged-main verification is complete.

## Phase 20 merged-main verification — 2026-09-07
**Status: `COMPLETE / VERIFIED / MERGED`.**

Final PR head `514193d6f62dd6e574674faa07e58ececa6b11d4` passed all 17 attached exact-head workflows and has tree `c19e45c9ad5fae33f59d75cd715f5ae9352c4551`. Final Create Lifecycle `34155889018` artifact `10031015976` (`sha256:54b060f45f84b5b7eae73a642f1ee0722170579a3a418ea103cf5c10bec4ae59`) was human-reviewed clean across the required desktop/390px and reduced-motion states. Final Video Generation Integration `34155888979` passed the 1,320-case contract and all four real recovered REDGraft Video/Animate cases, with exact cleanup and artifact `10031170247` (`sha256:6c53d7d11d8f74fb23d9555a608bf38fa3d463c7d9b8ef6c893c729f8eeab6de`).

PR #122 squash-merged to `main` as `09ea91f753be5279428ccf25a7b043300678c3f3` with the same tree `c19e45c9ad5fae33f59d75cd715f5ae9352c4551`. Every post-merge check completed successfully: 10 merged-main workflows / 11 check-runs, including Engineering Quality, UI Shell, Creative Iteration, Generation Integration, Generation Reconciliation, Generation Cancellation, Activity Cancel, Image Model Routing, Image Upscale and Video Generation Integration `34156796984`. The merged-main Video check again completed successfully through the recovered REDGraft route.

A live Vercel audit after the merge found no deployment created at or after `09ea91f753be5279428ccf25a7b043300678c3f3`. The newest RenderLab deployment remains `dpl_Ck2HEMFpt2aRUwSVTrYA6YcFTbbi`, created on 2026-09-06 22:15:21 UTC from older commit `71a9034039a64beec66894cc4f79b1f62bfc7bf7`; production therefore remains unchanged.

That Phase 20 closure made Phase 21 the next roadmap phase. Phase 21 has since been implemented and verified as recorded below; production deployment remains separate and unauthorized.
# Phase 21 Execution Contract — Library & Viewer Spatial Media Experience
**Status: `COMPLETE / VERIFIED`.**
**UI decision:** UI-064.
**Design checkpoint:** `design/penpot/phase21-spatial-media-v0.1.md` is `REVIEWED DESIGN CANDIDATE / IMPLEMENTATION READY`; render run `34161759265` and artifact `10040127604` (`sha256:100496dcd72b7cb7705c34443995dfeb29f59cf942299cb923900697c82d8025`) passed human desktop/390px Library, Viewer, Compare and reduced-motion review on 2026-09-08.
**Planning baseline:** `6c57a21514d58924f59623177891b98fff925a8c` (verified Phase 20 merged baseline used to expand this contract; implementation began only after the reviewed design checkpoint merged to `main` as `12bb7133bf6c2686c47ccda9d26fd09b7e36c038`).

**Verified implementation evidence — 2026-09-08:** Exact implementation head `dd43169abae89e7e67267699a05f401370fa70ed` passed all 18 workflows attached to PR #127, including Engineering Quality `34216927811`, UI Shell `34216927963`, Creative Iteration `34216927894`, Library Lifecycle `34216927858`, Library Batch Delete `34216927813`, Upscale Viewer `34216927887` and Image Upscale Integration `34216927808`. The first candidate `780cf227447b1dd60d9d4d7e7298e8dcf7429379` exposed one real close-time Compare regression: the exiting Source panel remained in the DOM after the button had returned to `Compare source`; the one-file presentation fix synchronously unmounts Source on close while preserving bounded entrance motion and reduced-motion behavior. Human review passed exact-head Library Lifecycle artifact `10052255996` (`sha256:1832f1cbf11137d40b093783c3f3ca607fcd4030e33a49f6e624c23435b0b868`), Creative Iteration artifact `10052242923` (`sha256:1aae2d103834cc4b4787abc07b70e46093fd0c78da2881a5869c5249f1e2d3ce`) and Library Batch Actions artifact `10052242904` (`sha256:1dbc8ce827d38049e7d765aa647c9eacd80d1154ec02a69a2081fa7079740e63`). Library media dominance, static selected-state clarity, Viewer stage hierarchy, Result-primary / Source-contextual comparison, native video controls, reduced-motion narrow comparison, desktop/390px no-overflow and existing continuation/action semantics matched UI-064. No API, schema, Supabase/R2, media identity, account/admission, generation capability, worker/provider/routing, infrastructure or deployment behavior changed. Production deployment remains separate and unauthorized.

## Goal / user value
Turn Library and Media Viewer into the spatial media half of Kinetic Precision: browsing should feel like moving through a living creative archive, and opening, selecting, comparing and continuing from media should feel physically connected rather than like moving between flat cards and forms.

The Phase 21 promise is visual and interaction-led. Existing durable-media semantics remain authoritative; the change is how clearly, directly and memorably users perceive and manipulate those media objects.

## Verified starting state — 2026-09-07
- Phase 20 / UI-063 is complete, verified and merged. The current `main` tree contains the closed Phase 20 handoff and no Phase 21 implementation.
- UI-060 already separates `/library` into URL-owned **Creatives** (default generated media) and **Uploads** (`tab=uploads`) over the same durable `media_assets` identity. Kind, search, Favorites, Collections, sort and pagination compose inside either section; Upload/drag-drop belongs only to Uploads.
- `LibraryBatchSelection` already owns transient current-page selection plus bounded Favorite/Collection organization and permanent Delete. Selection is not URL/durable state.
- Current Library cards are a conventional responsive 4:3 grid with media preview, title and kind/date metadata plus a small hover zoom. They are functionally mature but do not yet carry the Kinetic Precision depth/spatial language.
- Media Viewer is already the approved contextual durable-media workspace. It owns media-primary presentation, truthful metadata, capability-derived Edit/Animate, eligible Upscale 2×, Reuse settings, conditional Compare source, Favorite/Collections/Rename/Download/Delete and native video controls.
- UI-056 comparison eligibility is server-derived; Result remains primary, Source is contextual and exposes only `Open source`. UI-058 Upscale eligibility/submission remains server-owned and does not turn Viewer into a job poller.
- `motion@13.1.1` is already present and the UI System explicitly identifies media-card → Viewer spatial continuity as a good motion candidate. Library/Viewer do not need a second animation runtime to begin this phase.
- Production deployment remains explicit and separate; automatic Git → Vercel deployment is disabled.

## In scope
### 21A — Kinetic Library media canvas
- Extend the Phase 19 spectral/glass/elevation language into Library without creating a competing atmosphere.
- Recompose the Library heading, Creatives/Uploads context, media-kind controls, search and organization controls into a clearer media-workspace hierarchy while preserving their current accessible mechanics and URL contracts.
- Creatives/Uploads selection may gain shared-layout/morphing emphasis, but it remains navigation over the existing `tab` contract rather than client-only state.
- Search remains a real GET form and kind/Favorites/Collections/sort remain server-owned navigation state.

### 21B — Media-first cards with bounded depth
- Make media materially more dominant than card chrome: stronger edge/elevation treatment, restrained spectral response and more intentional title/metadata hierarchy.
- Add bounded pointer-capable hover/lift/tilt or spotlight response only where it improves object affordance. Motion must stay subtle enough that a dense media grid remains comfortable to scan.
- Touch and keyboard users receive an equally clear static/focus/pressed hierarchy; no essential action or information may depend on hover or tilt.
- Preserve current card destination, media identity and responsive grid semantics. Do not introduce hover-only management actions or turn cards into miniature Viewer action consoles.
- Selection mode must remain unmistakable: selected media receives a strong static selected layer/check state even when reduced motion is enabled.

### 21C — Library interaction and card → Viewer spatial continuity
- Opening one asset should feel spatially related to the selected media object instead of like an unrelated hard cut.
- Prefer the existing Motion + Next.js boundary. A true cross-route shared element is allowed only if it can be implemented without a global client media/router store, navigation interception, duplicated asset authorization or fragile DOM persistence.
- If literal shared-element continuity is not safe across the current App Router boundary, the accepted implementation is matched media geometry plus a bounded Viewer media-stage entrance that clearly preserves origin/destination continuity. Do not fake a technically brittle shared element merely to satisfy the visual label.
- Library navigation/back behavior, deep links and server ownership must continue to work without animation state.

### 21D — Immersive Viewer media stage
- Give the primary image/video stage dimensional Kinetic Precision treatment while keeping the media itself dominant and undistorted.
- Recompose the current metadata/Continue/Actions rail as subordinate precision chrome rather than a generic opaque side card; existing labels, action availability and product semantics remain intact.
- Native video controls, poster behavior and keyboard/touch media operation remain unchanged.
- Viewer must remain usable when optional metadata is absent and across generated/uploaded Image/Video variants.

### 21E — Spatial comparison choreography
- Keep UI-056 eligibility, source ownership and action hierarchy exactly intact while making default Result → Source/Result comparison feel like one spatial transformation.
- Result remains the visually primary media object on wide and narrow layouts. Source stays contextual, exposes only `Open source`, and never becomes a second management surface.
- Use bounded layout/presence motion for open/close where it clarifies the relationship. Reduced motion must switch between the same complete layouts without transform-dependent meaning.
- Preserve native result-video controls and the existing `Compare source` / `Close comparison` semantics.

### 21F — Selection, organization and upload feedback
- Improve the spatial entrance/exit and hierarchy of current-page Select mode and its Organize/Delete controls without changing UI-034/UI-049 semantics, 24-item bounds or best-effort behavior.
- Organization feedback must remain truthful to server results; motion may emphasize affected cards but may not imply atomic success when per-item results differ.
- Uploads drag/drop may inherit Kinetic Precision depth/target feedback, but the current single-image direct-upload transaction, keyboard/touch Upload button baseline and rejection behavior remain unchanged.

### 21G — Responsive, accessibility and effect budget
- Desktop and 390px layouts must keep Library navigation/search/organization, selection controls, Viewer media, Continue and Actions reachable without horizontal overflow.
- Keyboard focus must remain high contrast over dimensional/glass surfaces; selection and comparison must be operable without pointer hover.
- `prefers-reduced-motion` removes nonessential transforms/tilt/shared spatial movement while preserving the exact hierarchy, selection state and comparison meaning.
- Continuous high-frequency JavaScript motion, scroll hijacking, cursor followers, full-grid parallax, WebGL/shaders and permanent particle systems are out of scope.
- Keep the existing UI System timing/effect budget: micro feedback 120–180ms, ordinary transitions 180–260ms, larger spatial morphs roughly 260–420ms or a perceptually equivalent bounded spring.

## Required visual design checkpoint before implementation
Before Phase 21 visual implementation begins, create and review repository-backed Penpot/open-SVG design evidence (or direct Penpot frames when available) for at least:
- Library desktop default media view;
- Library 390px default media view;
- Library desktop or 390px selection/organization state;
- Viewer desktop default media stage;
- Viewer 390px default media stage;
- Viewer comparison on desktop and 390px.

The checkpoint must demonstrate media dominance, card depth, selection readability, Viewer hierarchy and the intended card → Viewer continuity. It must explicitly show a reduced-motion/static equivalent for any interaction whose meaning could otherwise depend on motion. Existing `library-v0.1` / `library-v0.2-upload` and Media Viewer v0.1–v0.3 artifacts are historical starting points, not the Phase 21 target.

## Explicitly out of scope
- New media identity, origin semantics, search behavior, sort behavior, Favorites semantics, Collections semantics, pagination, batch bounds, delete semantics or upload transaction behavior.
- A new Library route hierarchy, new Viewer route, modal-only Viewer replacement, third Library section, density-toggle product setting, or parallel media store.
- New generation/post-processing capabilities, Restore, Upscale factors, model/provider controls or changes to Edit/Animate/Upscale/Reuse availability.
- Schema migrations, Supabase/R2 contract changes, account/admission/privacy changes, worker/provider/routing changes or infrastructure recovery/deployment.
- Create, Activity, Settings, Admin or Landing redesign; those are not Phase 21 surfaces.
- Phase 22 implementation.
- Production deployment.

## Architecture / component boundary
- Keep Library data/search/filter/section/pagination state server-owned and URL-addressable. `tab=uploads` remains the only non-default section parameter; Creatives remains canonical when `tab` is omitted.
- Keep `LibraryBatchSelection` (or a deliberate feature-local extraction from it) as the transient current-page client interaction boundary. Motion state must not become selection truth.
- Keep Media Viewer server composition with small client islands for comparison/actions/Upscale. Do not create a global media store, global animation store or client-side duplicate of owner/capability eligibility.
- Motion is presentation state only. Stable media asset ID may key visual continuity but never authorizes access.
- Reuse existing RenderLab primitives, Motion and Phase 19 tokens first. A feature-local media-card/viewer-motion composition may be extracted if implementation genuinely benefits from it; do not create a generic primitive before a real reuse need exists.
- Motion Primitives or React Bits may be adopted only after the existing source/accessibility/reduced-motion/performance/license review. GSAP/Lenis are not approved for ordinary Phase 21 layout/hover continuity.

## Backend / data / security implications
- None are required by the accepted visual contract.
- Durable media identity, owner scoping, tombstones, product content/download routes, R2 privacy and all current server validation remain unchanged.
- Browser animation/card state must not receive worker/provider/storage identity, raw signed URLs or cross-owner data.
- Any implementation evidence that unexpectedly requires schema, route-contract or infrastructure change must stop and amend this contract before that change proceeds.

## Validation matrix
Before Phase 21 can be marked complete:
- `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run verify:ui-purity` and production build pass on the final exact head.
- Every workflow actually attached by the final implementation diff reaches terminal success. Expected minimum coverage for the current feature boundary includes Engineering Quality, UI Shell, Library Lifecycle, Library Search, Library History, Library Drag Drop, Library Favorites, Library Collections, Library Batch Delete, Media Download, Media Rename, Media Delete, Creative Iteration and Upscale Viewer Visual; implementation must audit path filters rather than treating this list as a waiver for additional attached gates.
- Library Lifecycle (or an intentionally extended equivalent) captures final Kinetic Library + Viewer desktop/390px evidence using real owner-scoped durable media and exact cleanup.
- Creative Iteration continues to verify eligible/ineligible comparison, Image→Image and Image→Video, keyboard operation, native video controls and reduced motion after the visual transformation.
- Upscale Viewer continues to verify eligible/start/accepted/error Viewer states without implying job completion.
- Existing Favorites/Collections/selection/Delete/Download/Rename/Upload behavior remains regression-clean after card/rail composition changes.
- Human review covers at minimum desktop + 390px Library default, selection/organization, Viewer image/video, comparison and reduced-motion states. Review must reject clipped controls, hover-only meaning, excessive tilt/glow, media distortion, noisy chrome or a visually timid result that does not materially extend Kinetic Precision.
- No permanent high-frequency animation loop or obvious scroll/layout jank is accepted in the media grid.
- Exact configured Auth/Supabase/R2 fixtures clean after the final run-owned verification set.

## Documentation outputs
On verified implementation, update `PROJECT.md`, `docs/ui/UI_MIGRATION.md`, `docs/ui/UI_DECISIONS.md`, `docs/ui/UI_SYSTEM.md`, `docs/ui/COMPONENT_CATALOG.md`, `docs/ui/SCREEN_REGISTRY.md` and `docs/architecture/FRONTEND_ARCHITECTURE.md` wherever implementation changes durable visual/component/architecture state. Update infrastructure/capability docs only if verified reality actually changes those boundaries.

## Exit criteria
Phase 21 is complete only when Library visibly reads as a Kinetic Precision media workspace, opening/viewing/comparing media has coherent spatial continuity, selection/organization remains clear, every existing media product contract is preserved, exact-head functional gates are green, desktop/390px/reduced-motion renders are human-reviewed, cleanup is exact and authoritative docs match verified implementation.

**Next dependency:** only after Phase 21 is complete/verified/merged and merged-main verification closes may Phase 22 — Activity, Settings, Landing & System Cohesion — be expanded from roadmap level. This contract does not pre-authorize Phase 22 or production deployment.

---

# Phase 22 Execution Contract — Activity, Settings, Landing & System Cohesion
**Status: `COMPLETE / VERIFIED / MERGED`.**
**Planning baseline:** `c17abfef07fbc580c51f458496e4e53502816229` (Phase 21 merged baseline).

## Goal / user value
Complete Cycle 4's Kinetic Precision visual language across the remaining ordinary user-facing surfaces without changing what those surfaces mean or who owns their state. Activity should make real lifecycle state easier to scan, Settings should make identity/security/access state feel trustworthy and deliberate, and Landing should present the actual current RenderLab product with the same premium visual confidence already established in Create and Library/Viewer.

The final phase also owns the cross-product visual-system audit needed to prove that Cycle 4 reads as one coherent product at desktop and 390px, with keyboard/focus/reduced-motion parity and a bounded effect budget.

## Verified starting state
1. **Phase 21 is complete and merged.** PR #127 final documentation head `d14511e60e51dfd7faecc46c95b9c858dbd10b8d` passed a clean 18/18 exact-head matrix. It squash-merged to `main` as `c17abfef07fbc580c51f458496e4e53502816229`; all five merged-main checks GitHub attached passed, including UI Shell, Engineering Quality, Creative Iteration, Viewer and Image Upscale. Vercel reported zero deployments created at or after the merge timestamp, so production remains unchanged.
2. **Activity state is server-owned.** `/activity` resolves the current RenderLab account, server-lists owner-scoped `generation_jobs`, keeps pagination in `offset`, and passes truthful availability / `hasActive` state to `ActivityView`. Auto-refresh is enabled only while real active work exists. Existing rows distinguish queued/preparing/running/cancelling/persisting/succeeded/failed/cancelled and preserve separate succeeded Run Again, failed Retry and active Cancel eligibility.
3. **Settings authorization is server-owned.** `/settings` resolves verified Supabase identity, RenderLab access state and fresh active-admin eligibility before rendering. `AccountSettings` owns only sign-in/recovery/sign-out interaction state. Active/suspended/invitation-required state, password security, recovery and the contextual Admin link must keep their existing authorization semantics.
4. **Landing is public and route-separated.** `/` renders without `AppShell`; `/create` and other product routes remain under the application shell. Root `source`/`action` continuation intent still redirects with the full query to `/create`. Landing is closed-beta truthful and currently uses a static product preview; it has no public registration, pricing, testimonial, fake metric, provider/model or SLA claims.
5. **Kinetic Precision already exists elsewhere.** Phase 19 established the atmospheric/dimensional shell, Phase 20 completed Create as the creative instrument and Phase 21 completed Library/Viewer spatial media presentation. Activity and Settings inherit the shell but their internal surfaces remain materially flatter; Landing predates the Kinetic Precision cycle.
6. **Existing validation is strong and reusable.** Activity Visual and Activity Cancel cover configured job/account states and cleanup. Account Identity Visual and Account Ownership cover configured identity/access/security states. Brand / Launch Visual covers responsive public routing/copy/purity/build behavior. UI Shell, Creative Iteration, Create Lifecycle and Library/Viewer workflows provide cross-product regression coverage when shared styling changes.
7. **No new runtime is justified by current evidence.** Existing RenderLab primitives, semantic tokens, CSS and Motion for React `13.1.1` remain the first implementation choice. GSAP, Lenis, WebGL/shader canvases, global smooth-scrolling and a second animation runtime are not justified for this phase.

## Required design checkpoint before implementation
Before Phase 22 visual implementation begins, create and human-review a repository-backed Penpot/open-SVG checkpoint covering at minimum:
- Activity desktop and 390px with active + succeeded + failed/cancelled truth visible;
- Settings desktop and 390px for signed-out and signed-in/access-state composition, including the password/security continuation hierarchy;
- Landing desktop and 390px with its public hero/product-preview direction and closed-beta CTAs;
- a reduced-motion/static representation for any meaningful animated state;
- enough side-by-side system context to judge that Landing, Activity and Settings belong to the same Kinetic Precision product as Create and Library/Viewer.

The checkpoint must be recorded under `design/penpot/` and reviewed before implementation. A design artifact alone is not implementation approval.

## In scope
### 22A — Activity as a truthful kinetic lifecycle surface
- Recompose Activity hierarchy so active work, terminal history, operation identity, timestamps and actions scan faster without changing server ordering, pagination or lifecycle semantics.
- Give active statuses restrained dimensional/kinetic emphasis tied only to real `queued|preparing|running|cancelling|persisting` state. Do not invent percent complete, ETA, provider stages, queue position or SLA language.
- Keep success/failure/cancelled meaning explicit without relying on color alone. Terminal rows should settle visually rather than pulse indefinitely.
- Preserve distinct action contracts: succeeded `View result` / conditional `Run again`; failed `Retry`; active `Cancel` only when server-derived `canCancel` is true.
- Preserve the current server-rendered Activity dataset and feature-local auto-refresh boundary; do not move job truth into a client/global store merely to animate rows.
- Preserve narrow action reachability and the existing 20-row URL pagination contract.

### 22B — Settings as a deliberate trust/security surface
- Bring `/settings` and its password/security continuation into Kinetic Precision while keeping identity, access and privilege resolution server-owned.
- Improve visual hierarchy between identity, Closed Beta access state, password/security actions, feedback and the conditional Admin continuation.
- Keep signed-out Sign in + Forgot password simple and obvious; do not introduce public Create account, social auth, profile editing, preferences or account-management concepts that are not already product requirements.
- Keep active / suspended / invitation-required / transition-access semantics and sanitized feedback truthful. Raw Supabase errors, role editing and other-user data remain forbidden.
- The Admin link remains contextual and appears only after the existing fresh active-admin check; Phase 22 does not redesign `/admin` internals.

### 22C — Landing as the public Kinetic Precision expression
- Recompose `/` so the first public impression matches the premium spatial/kinetic character now proven in Create and Library/Viewer rather than reading as a pre-Cycle-4 static marketing shell.
- Preserve `Open Create` and `Sign in` destinations, closed-beta / invitation-only truth and legacy root continuation redirect behavior.
- Replace or materially refine the current static product preview so it reflects current RenderLab visual language and verified product capability without pretending that a decorative preview is live product state.
- Motion may support hierarchy/continuity only when bounded and reduced-motion-safe. Native scrolling remains authoritative; no scroll hijacking, cursor-following field, heavy particle engine, shader canvas or perpetual decorative choreography.
- Keep forbidden public-signup/pricing/testimonial/fake-metric/provider/model/SLA claims absent. Marketing copy may be updated only to describe already-verified product behavior truthfully.

### 22D — Cycle 4 system-cohesion audit
- Review Landing, Create, Library, Viewer, Activity and Settings together at desktop and 390px after implementation; Admin needs only inherited-shell/regression sanity, not an internal redesign.
- Check page-title scale, surface depth, border/translucency usage, status semantics, focus treatment, touch targets, motion timing and reduced-motion/static equivalents for consistency.
- Check horizontal overflow, text clipping, action wrapping, sticky/fixed chrome collisions, safe-area behavior and media/control distortion.
- Check that no completed Create or Library/Viewer surface was weakened merely to make the newer surfaces look consistent.
- Keep the effect budget bounded: no persistent animation should compete with task/media focus, and large visual effects must degrade cleanly on narrow/reduced-motion paths.

## Explicitly out of scope
- New generation or post-processing capabilities, model/workflow selection, Variations, Restore, Inpaint/Outpaint, additional Upscale factors or Director/LoRA productization.
- Generation lifecycle, retry/run-again/cancel semantics, job schema, scheduling, worker/provider routing, worker deployment or infrastructure recovery.
- Supabase/R2 schema/resource changes, account/admission/privacy policy changes, billing/credits, public signup/waitlist or analytics/marketing-cookie work.
- New top-level routes, separate Image/Video/Activity apps, shell-global client job/account stores or a new application/router architecture.
- New Settings preference systems, profile/avatar/account-deletion/MFA work, role editing or Admin operations redesign.
- Reopening Phase 20 Create composition or Phase 21 Library/Viewer composition except for verified shared-system regressions caused directly by Phase 22 changes.
- Production deployment. Phase 22 completion and Cycle 4 completion do not authorize Vercel production rollout.

## Architecture / component boundary
- Keep Server Components as the page/data default. Client Components stay limited to existing interaction needs or deliberate feature-local presentation mechanics.
- Activity job state remains server-owned; `ActivityAutoRefresh` stays an observational refresh accelerator, not a correctness/data store.
- Settings identity/access/admin state remains server-derived before presentation. Client code must not infer role/access from browser metadata.
- Landing remains public and independent of application-shell/account state. Decorative/product-preview state must not become an auth or product-data dependency.
- Use existing RenderLab primitives and Phase 19 tokens first. If a maintained external motion component is genuinely needed, evaluate it under the existing component-source/accessibility/performance rules and document adoption in `COMPONENT_CATALOG.md`; otherwise add no dependency.
- Shared visual changes belong in existing semantic tokens/styles only when they truly apply cross-product; avoid feature-specific values masquerading as global design-system rules.

## Backend / infrastructure / data implications
None are expected. This phase is visual/interaction-only. No migration, Supabase/R2 mutation, worker/provider/routing change, scheduler change, secret change or deployment configuration change is authorized. Any discovered requirement for one of those boundaries must stop and become a separately reviewed scope decision rather than being smuggled into Phase 22.

## Security / ownership invariants
- Activity remains private to the verified RenderLab account and foreign jobs collapse through existing ownership behavior.
- Settings remains available according to current identity/access rules, including suspended-user recovery/sign-out behavior.
- Admin visibility/authorization remains based on fresh server-side active-admin checks.
- Landing exposes no private product/account state.
- Browser motion/presentation state never authorizes access or changes durable truth.

## Validation matrix
Final exact-head acceptance requires, at minimum:
1. `npm run build`, `npm run verify:ui-purity`, type-check/lint/unit gates through Engineering Quality and UI Shell.
2. Activity Visual with configured active/succeeded/failed states, Retry behavior, responsive screenshots and exact cleanup.
3. Activity Cancel Visual with active cancellation eligibility/control behavior and cleanup.
4. Account Identity Visual across signed-out, active/suspended/recovery/password states as currently covered; update screenshot assertions where Phase 22 changes composition.
5. Account Ownership to prove no visual refactor weakened account/privacy boundaries.
6. Brand / Launch Visual for `/`, `/create`, root continuation, forbidden-claim checks, desktop/390px and reduced-motion behavior.
7. Creative Iteration where Activity successful Run Again and Viewer/Create continuation regressions are affected.
8. Create Lifecycle and Library Lifecycle (plus Viewer/Upscale visual coverage where shared global styling changes) as the Cycle 4 cohesion regression set.
9. Every workflow GitHub actually attaches to the final PR head must be green. Exact-head acceptance cannot borrow success from an older SHA.
10. Configured fixture cleanup must succeed; shared-resource cleanup failures remain real gate failures.

No live generation spend is required merely for visual cohesion unless an actually affected existing workflow already requires its bounded provider proof. Do not broaden worker-backed testing solely to make Phase 22 look more comprehensive.

## Responsive / human visual review
Human review is mandatory after configured automation. At minimum inspect:
- Landing: 1440-class desktop + 390px; hero, product preview, CTA hierarchy, footer and reduced-motion/static path.
- Activity: desktop + 390px with simultaneous active, succeeded and failed/cancelled rows; action wrapping; pagination; keyboard focus; reduced-motion active-state equivalent.
- Settings: desktop + 390px signed-out and signed-in access states; suspended/invitation feedback where the fixture supports it; password/security continuation and conditional Admin hierarchy.
- Cross-product: representative Create, Library and Viewer screenshots beside the three Phase 22 surfaces to judge title scale, depth/effect budget, focus semantics and narrow-layout consistency.

Reject a candidate that is technically green but still reads as generic utility/admin UI, as well as one that becomes decorative/noisy, hides status meaning behind motion/color, clips at 390px, or weakens accessibility.

## Documentation outputs
On verified implementation, update:
- `PROJECT.md` and `docs/ui/UI_MIGRATION.md` with exact-head and merged-main evidence;
- `docs/ui/UI_DECISIONS.md` with the accepted Phase 22 visual decision after the design checkpoint is reviewed;
- `docs/ui/UI_SYSTEM.md` for any truly system-wide visual rule/effect-budget change;
- `docs/ui/SCREEN_REGISTRY.md` for verified Activity/Settings/Landing composition/status;
- `docs/ui/COMPONENT_CATALOG.md` only if a reusable component/mechanic is actually adopted;
- `docs/architecture/FRONTEND_ARCHITECTURE.md` only if a verified frontend boundary changes.

Do not update capability/infrastructure/schema docs unless verified reality actually changes those boundaries.

### Phase 22 pre-merge verification — 2026-09-08
Exact implementation head `c081d53afecdd76f8c687cfc950d8f4bb0454a8a` is functionally and visually accepted for PR #130. Thirteen of the fifteen ordinary PR-attached workflows completed successfully; the Account Ownership and Account/Admin Operations PR copies were cancelled before any job started by shared workflow-concurrency churn. Release Candidate Matrix `34270048015` independently checked out the exact implementation SHA, passed whitespace/verifier-syntax/UI-purity/typecheck/production-build preflight, then dispatched the configured 23-workflow exact-SHA child matrix. Every child succeeded, including Account Ownership `34270364557`, Admin Operations `34270414187`, Video Generation Integration `34270379864`, Create Lifecycle `34270381977`, Activity Visual `34270405290`, UI Shell `34270407592` and Brand / Launch `34270409459`. Its run-manifest artifact is `10073980292` (`sha256:714622aa35c930ef65df0505250d30631cbcfc596c202cc7ea5073c73666a782`).

Human review passed the final implementation artifacts: Account Identity `10073476200` (`sha256:d3d7971853a062ce4393662d3a649d3a434f47420350b613c4f92f832b4ea825`), Activity `10073569449` (`sha256:5d63a1013271919fcb9b0fe5926bdd799fad6ed061c560ffdd51ca02c45f0e56`), Brand / Launch `10073485236` (`sha256:97f1b3bd663069b46ef6feecc1319c96c92b703408c2e1904010864726d880f5`), exact-SHA Create Lifecycle `10073636995` (`sha256:09c00d85ca82b9c80bb9dda06197e646f8b418eb6989755a158cbf85f17be1f8`), Library Lifecycle `10073489435` (`sha256:e00f4f6a317d9e782cefbf31c457262d073582af84206bcfa9e5afefd330dbca`) and Creative Iteration / Viewer Compare `10073548921` (`sha256:a74dfffd1e7bdc531ac6564077192c6b44ebb9ec8a5b8a2b426eea990105c262`). Landing, Activity and Settings now belong to the same restrained Kinetic Precision system as Create and Library/Viewer on desktop and 390px; reduced-motion meaning remains static and complete; no fake progress/ETA/provider/SLA state or horizontal overflow was accepted.

Acceptance caught and corrected two classes of issue before this verification: the first implementation candidate retained stale Integrated Release locators for the superseded Landing hero, and pixel review of the next candidate exposed signed-out Settings accidentally rendering the Admin continuation via optional-ID equality plus insufficient mobile bottom clearance around security actions. The final implementation requires a real identity/admin match and verifies signed-out Admin absence plus mobile Change password / Sign out reachability above the floating dock. Configured cleanup passed for Account Identity, Activity, Create Lifecycle, Library Lifecycle and Creative Iteration. No capability, schema, account policy, worker/routing, dependency, infrastructure or deployment contract changed. UI-065 records the accepted Phase 22 visual decision; no new UI-system primitive or frontend architecture boundary was introduced, so UI_SYSTEM, COMPONENT_CATALOG and FRONTEND_ARCHITECTURE require no Phase 22 implementation change.

This is pre-merge verification only. Phase 22 and Cycle 4 remain merge-pending until PR #130 is guarded-merged and the workflows GitHub attaches to merged `main` pass. Production rollout remains a separate explicit operation.

## Exit criteria
Phase 22 is complete only when:
- the required design checkpoint is reviewed before implementation;
- Activity, Settings and Landing visibly belong to Kinetic Precision while preserving their existing product/security semantics;
- the final cross-product desktop/390px/reduced-motion/accessibility/effect-budget audit passes;
- exact final-head minimum/attached workflows and configured cleanup are green;
- human implementation screenshots pass review;
- authoritative repository docs match the verified implementation and merge state;
- merged `main` checks pass after the expected-head guarded merge.

**Cycle 4 closure:** Phase 22 completion closes the Kinetic Visual Experience cycle only after merged-main verification. Production rollout remains a separate explicit operation, and no Phase 23 is implied or pre-authorized by this contract.

### Phase 22 exact-head handoff — 2026-09-09
- Authoritative `main` remains `9b25ba9ec4adff5b6dd8a6bebd185e72cea9b25d`. Draft PR #130 remains open and merge-pending on `work/phase-22-system-cohesion`.
- Final fully validated pre-handoff head `287a3e26eda039cb034492cd8dc872e7731fcd01` passed **all 15 workflows GitHub attached to that exact PR head**: Release Candidate Matrix `34281812498`, Image Upscale `34281812430`, Creative Iteration `34281812537`, Generation Admission `34281812604`, Engineering Quality `34281812500`, Library Lifecycle `34281812524`, Account Identity `34281812399`, Account Ownership `34281812384`, Create Durable Upload `34281812577`, UI Shell `34281812425`, Account/Admin Operations `34281812369`, Brand / Launch `34281812398`, Activity `34281812436`, Activity Cancel `34281812467`, and Integrated Release `34281812664`.
- Release Candidate Matrix `34281812498` also passed candidate identity/whitespace, verifier syntax, UI purity, TypeScript, production build, stale-dispatch quiescence, the same-SHA PR shared-fixture wait, configured child dispatch, and exact-SHA child-success enforcement. Its manifest artifact is `10078464050` with digest `sha256:b1c20572a025e7a43a7a384eaa7d2762afb172d78021719267a0d65fb6d04cc2`.
- The shared Admin/Generation CI scheduling defect is fixed in repository state. Commit `c522cdc57ebbfcb41f542a10da401ec2317a7f71` introduced event-aware scheduling and the matching infrastructure contract; `287a3e26...` corrected two over-escaped jq filters. On the accepted head, attached Admin and Generation Admission both ran real jobs and succeeded instead of cancelling one another, and the release matrix waited for attached PR coverage before dispatching its serialized child fixture window.
- The Phase 22 product/UI implementation remains the previously human-accepted tree rooted at functional head `c081d53afecdd76f8c687cfc950d8f4bb0454a8a`; later commits through `287a3e26...` are documentation/CI-orchestration corrections and do not reopen the accepted Activity, Settings, Landing, Create, Library or Viewer pixels.
- This handoff documentation commit is expected to be a new documentation-only `GITHUB_TOKEN`-authored head. Do **not** merge merely from the older `287a3e26...` green set: create one user/connector-authored tree-identical retrigger (or otherwise obtain ordinary PR workflow execution on the unchanged documentation tree), require every workflow GitHub attaches to that final head to be terminal-success, then mark PR #130 ready and squash-merge with `expected_head_sha`.
- After merge, verify every workflow attached to the exact merged `main` commit and confirm production remains unchanged. Phase 22 and Cycle 4 become `COMPLETE / VERIFIED / MERGED` only after that merged-main verification. No production deployment is authorized by this handoff.

## Phase 22 / Cycle 4 merged-main closure — 2026-09-09
**Status: `COMPLETE / VERIFIED / MERGED`.**

Definitive PR #130 head `7049845b7d2c8e5a7c31c0c1a32a20e665f35b87` was a connector/user-authored tree-identical validation commit on accepted tree `7847166e1f6f301b02572d2b420faa703b62ea67`. All 15 workflows GitHub attached to that exact PR head succeeded. Release Candidate Matrix `34285994347` also passed its exact-SHA 23-child configured matrix and published manifest artifact `10080083708` (`sha256:8d9b4c7c30fa27a1d950cf20eb96a64d72f928c66aa3e697b92d57477f9d3d43`).

PR #130 was marked ready and guarded squash-merged with `expected_head_sha=7049845b7d2c8e5a7c31c0c1a32a20e665f35b87`. The resulting `main` commit is `e29f02a71c051e432b16a4bc34fb755fec4d5d8f` and preserves the exact accepted tree `7847166e1f6f301b02572d2b420faa703b62ea67`.

Every workflow GitHub actually attached to the merged `main` push reached terminal success: Engineering Quality `34287754692`, Image Upscale Integration `34287754640`, Integrated Release `34287754668`, Activity Cancel Visual `34287754684`, Creative Iteration `34287754635`, Release Candidate Matrix `34287754646` and UI Shell Validation `34287754636`. Release Candidate Matrix attempt 1 was not waived: its Generation Bridge child hit a transient Supabase REST 504 while polling an already-running job; unchanged same-SHA attempt 2 completed all 23/23 children and published final manifest artifact `10084078116` (`sha256:89c525e0d5a9f6803e20a8e76b48fad40bbdbd34e53eb4e2f0ffecea191659b9`). The attached UI Shell push run was likewise rerun on the same merge SHA after matrix same-ref concurrency cancelled its first attempt; attempt 2 passed the full shell suite.

No repository-triggered production rollout was performed or authorized. `vercel.json` continues to set `git.deploymentEnabled=false`, automatic Git → Vercel deployment remains disabled, and this closure changes documentation only. Phase 22 therefore closes Cycle 4 as `COMPLETE / VERIFIED / MERGED`. No Phase 23 implementation or production deployment is implied or authorized.


## Cycle 4 production rollout closure — 2026-09-09
**Status: `COMPLETE / VERIFIED / LIVE`.**

- [x] User-authorized rollout deployed exact current `main` `cf3923097fce62edbee643df9b2883bd09210046` through guarded GitHub run `34356155380`. The rollout checked out the exact pristine SHA, verified required production environment-key metadata, built successfully on Vercel, and required Vercel to report the same Git SHA before acceptance.
- [x] New production deployment `dpl_5hA4ihp644VcCzioY66hoTXaP18v` is `READY` at `https://renderlab-91pu92g5z-faresmohamed260-6733s-projects.vercel.app` and is aliased by `https://renderlab.faresuniform.uk`. The custom domain served the accepted Cycle 4 Landing copy (`Create with intent.` / `Keep what matters.`), explicit Closed Beta language and static-product-preview treatment; `/create`, `/library`, `/activity` and `/settings` also passed post-cutover HTTP smoke.
- [x] Exact-origin browser-upload R2 CORS passed for `https://renderlab.faresuniform.uk`. A real run-owned persistent image upload produced its durable media row and WebP thumbnail, appeared through the Library contract and then cleaned its exact fixture successfully.
- [x] Rollback to pre-Cycle-4 READY deployment `dpl_Ck2HEMFpt2aRUwSVTrYA6YcFTbbi` was armed but not required. Vercel reported no runtime errors in the bounded post-rollout window.
- [x] Rollout evidence artifact `10105911082` has ZIP digest `sha256:049d143dab49881beb3ffa60ae2a0c104cd5d646d89b44d69c269098959469b8`; its `evidence.json` SHA-256 is `0b8367f43f87a77ec8444f26c8a5b5fcce04b9bbada165ae61f3dca853f75782`.
- [x] No Supabase schema change, R2 resource-contract change, worker deployment, provider/routing change, reconciliation/maintenance scheduler activation, `pg_cron` or `pg_net` change accompanied the application rollout. Automatic Git → Vercel deployment remains disabled; future production changes remain explicit operations.

Cycle 4 is now complete in both repository and production state. This rollout does not create or authorize Phase 23 / Cycle 5 work.

## Post-Cycle 4 production corrective review — 2026-09-09
**Status: `COMPLETE / VERIFIED / MERGED`.**

The bounded seven-item live-production corrective pass was implemented from baseline `b3aae9d3159aa3daeeff0390b585d010aa6f71c2`, exact-head verified on `522ce855673fdaaf3c174b9b934b320e0744a524`, and guarded squash-merged through PR #135 as `15df50d26d0c3647f9a6f5a7dda87f87dbc87ffd` with accepted tree `c91aec822a87a62ff1c72489a8eca3f8e18ec0c1`. The pass aligns AppShell utilities, de-cramps the narrow Library toolbar and replaces sort-menu interaction with a direct Newest/Oldest toggle, fixes compact Create trigger spacing while preserving the 390px row boundary, adds Advanced seed randomization plus fresh-seed failed Retry, omits succeeded Activity rows after all result media is deleted/unavailable while retaining internal history, and rotates source-free Image Create headlines with reduced-motion-safe static behavior.

All 26 workflows attached to the definitive PR head completed successfully; the same-head Library Lifecycle rerun passed after its first zero-job concurrency cancellation. After merge, all 10 workflows GitHub attached to `15df50d26d0c3647f9a6f5a7dda87f87dbc87ffd` completed successfully, including Video Generation Integration `34399864436` through live Create Video / Animate Image ownership verification and fixture cleanup.

This corrective pass is now **production live** from exact source `0d584c5dab288ad1e99a7b7c1aac2a2ec12bf814` at READY deployment `dpl_BpMCWYggKkzf8FuWpb2vLun46r3M`. Rollout run `34406507461` passed exact-SHA/pristine-source and production-environment guards, public route smoke, exact-origin R2 CORS, a real durable image upload with WebP thumbnail/Library visibility and exact cleanup; bounded Vercel runtime-error review found no runtime errors. Prior deployment `dpl_5hA4ihp644VcCzioY66hoTXaP18v` remains the immediate rollback anchor and rollback was not required. This work is not Phase 23 / Cycle 5 and does not authorize either.
