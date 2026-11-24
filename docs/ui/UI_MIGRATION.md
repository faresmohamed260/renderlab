# RenderLab Product & UI Foundation

> **History separation:** the full UI migration/phase journal that existed immediately before governance hardening Checkpoint 6 is preserved as a content snapshot in `docs/archive/UI_MIGRATION_PRE_HISTORY_SEPARATION_2026-10-10.md`. It is historical evidence, not a competing current tracker.

## Objective

Build RenderLab as a fresh, extensible product using Saga only as behavioral/backend reference. Preserve proven capabilities where useful; re-evaluate UI, architecture and product structure deliberately.

## Core Principles

- Saga is reference material, not the RenderLab specification.
- Simple by default, powerful when needed.
- Expose user goals, not ComfyUI graph/workflow complexity.
- Reuse approved RenderLab components and maintained interaction mechanics before inventing generic primitives.
- Conventional visible feature/shell controls compose the approved maintained primitive layer under UI-026.
- Validate rendered UI, not only compilation.
- Keep repository documentation synchronized with verified implementation.
- Preserve approved surfaces in Integration Mode unless the user explicitly reopens a named surface for redesign.

## Current production - 2026-11-24
<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: 429afee1d1f8ea06f663e96f9c554bf37c5c2ab8 -->

Canonical record: docs/production/current.json identifies source `429afee1d1f8ea06f663e96f9c554bf37c5c2ab8`, READY deployment `dpl_FLynJG8JYSmFYSJJWaTs3Hg6yU5i` (`https://renderlab-jc1nq0ods-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681` at `2026-11-24T15:33:25.817Z` (independent head-engineer team-account alias read-back; updatedAt 1795534405817; createdAt unchanged 2026-11-21T02:01:08.378Z). Deployment Readiness #45425859929 passed at `2026-11-24T15:28:40.000Z`; all six exact-source protected checks passed: quality 138550768494, governance 138550769724, unit-coverage 138550770654, javascript-typescript 138550770330, clean-room (ubuntu-latest) 138550768513, clean-room (windows-latest) 138550769506. Qualified at `2026-11-24T15:28:40.000Z`, before cutover. Rollback anchor: `dpl_32ns93K9T2tRVQ2azrcBxJBy5238` at source `80194dfe654bd7c34660c4679a8c97542db94387`.

Batch F: app-only release of #681 (hosted capability controls and unsupported negativePrompt sent as empty string), #683 (popovers), #685 (reflow and targets), #689 (Library focus restoration), with docs #684/#686/#688. Real Production environment preflight passed. Migration 0037 (ledger 20261124090831) unchanged; Modal renderer v13 and gateway/dispatcher v14 unchanged, worker tree 4633471969d96f3b3a861a15edadd835253d85b4. Live QA: Create 1440 and 390, 320 CSS px reflow, disclosure targets and popover Escape/focus return passed; true 200% zoom at 390 showed 15 CSS px internal composer overflow (known limitation accepted by head engineer; #694 targets the next release). Verification generation explicitly pending at record merge, 0/1 consumed. Detailed QA and evidence: `docs/audits/BATCH_F_RELEASE_EVIDENCE_2026-11-24.md`. Previous Batch E evidence: `docs/audits/BATCH_E_RELEASE_EVIDENCE_2026-11-24.md`.


## Current UI foundation

The earlier whole-product redesign/migration program is historical closure evidence; current source has since changed under UI-084 and the merged Phase 5 frontend polish contract. Do not infer full current acceptance from historical verification. `docs/ui/SCREEN_REGISTRY.md` owns exact route/screen maturity, and `docs/ui/UI_DECISIONS.md` owns accepted UI precedents/supersession.

Current product family:
- Landing uses the approved Lab Matrix / Lab Grid identity and composition.
- UI-074 remains the accepted application shell geometry outside scoped Create; current production-mode root uses PreviewNavigationShell, including Landing, while app layout bypasses AppShell. P5-06 owns the unresolved source/authority drift.
- Create uses the production-mode FIBO-only CreatePreviewWorkspace under UI-084; Clear Composer is a retained alternate non-production branch and historical evidence. Current Create appearance is unfinished; full FIBO parity and responsive/interaction acceptance remain open.
- Library uses the approved Gallery Rail family and current server/URL-owned discovery/organization behavior.
- Media Viewer uses the approved Media Register + Source Fold family.
- Activity uses the approved Job Matrix + History Register family.
- Settings uses the approved Trust Register family with the current profile/credential/preferences additions integrated into that system rather than as a competing redesign.
- Admin uses the approved Admin System Continuity family inside the existing access/generation/health hierarchy.

UI-074 through UI-080 remain the historical redesign family where not superseded by UI-084, with later accepted corrections such as UI-081 and UI-082 carrying forward their bounded changes. Historical per-phase `NOT DEPLOYED` labels record closure-time state only; the current-production block above governs present deployment truth.

## Current migration/work state

The earlier migration checklist is closed; current Phase 5 frontend polish is governed by [its merged contract](../architecture/FRONTEND_PHASE5_POLISH_CONTRACT.md) and FIBO rollout remains separately bounded by [UI-084 rollout contract](../architecture/FIBO_PRODUCTION_ROLLOUT_CONTRACT.md). Production-live is not full verification or execution completion. Current and future work begins from repository reality, not historical Phase 0–29 checklists.

- Ordinary feature/UI additions use Integration Mode and preserve the accepted family unless a product reason requires an approved bounded change.
- Explicit redesign requests use Authorized Redesign Mode from `AGENTS.md` and `docs/ui/DESIGN_WORKFLOW.md`.
- Screen/route state belongs in `docs/ui/SCREEN_REGISTRY.md`; shared component state belongs in `docs/ui/COMPONENT_CATALOG.md`; durable UI decisions belong in `docs/ui/UI_DECISIONS.md`.
- Account/Settings capability sequencing is independently governed by `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md` and must not be inferred from historical UI phases.
- Production deployment is never implied by a UI implementation/merge state.

## Procedure for the next UI phase

When a new UI phase or redesign is explicitly authorized:
1. Re-establish current repository, production and screen/capability reality.
2. Read the current screen registry, relevant UI decisions/system/workflow documents and affected architecture contracts.
3. Record the immediate bounded scope as a current phase/contract before implementation.
4. Validate exact-head behavior, responsiveness, accessibility/reduced motion and rendered fidelity as applicable.
5. After closure, keep only the current outcome/constraint needed for future work here; move detailed run chronology and closed checklists to historical evidence rather than growing this file into another journal.

## Historical frontend removal

PR #437 removed the web frontend from source. PRs #441 and #443 subsequently restored the web application and made the Create workspace the release UI. This does not imply signed-in flow qualification.

## Historical evidence

The complete pre-separation UI migration journal is preserved as a content snapshot in `docs/archive/UI_MIGRATION_PRE_HISTORY_SEPARATION_2026-10-10.md`. It contains the Phase 0–29 chronology, corrective-maintenance records, closure-time statuses, exact run IDs, artifact digests and earlier production pointers that previously occupied this current tracker.

Completed implementation contracts remain historical evidence after their bounded work closes unless `docs/ui/UI_DECISIONS.md`, `docs/ui/UI_SYSTEM.md`, `docs/ui/SCREEN_REGISTRY.md` or another current authority explicitly carries a constraint forward. Their location alone does not make them current execution scope.
