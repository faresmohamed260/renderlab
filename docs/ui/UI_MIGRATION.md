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
<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: 34efe0b84ac1d950581d7b371b65bbf331852e89 -->

Canonical record: docs/production/current.json identifies source `34efe0b84ac1d950581d7b371b65bbf331852e89`, READY deployment `dpl_Fn5yNhNWz7owH9tMqi5cSbs3Y4WE` (`https://renderlab-is4jlxf69-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681` at `2026-11-24T18:21:47.297Z` (independent head-engineer team-account read-back; updatedAt 1795544507297; createdAt unchanged 2026-11-21T02:01:08.378Z). Deployment Readiness #45457731811 passed at `2026-11-24T18:17:02.000Z`; all six exact-source protected checks passed: quality 138664238729, governance 138664240866, unit-coverage 138664238628, javascript-typescript 138664238657, clean-room (ubuntu-latest) 138664239287, clean-room (windows-latest) 138664238543. Qualified at `2026-11-24T18:17:02.000Z`, before cutover. Rollback anchor: `dpl_FLynJG8JYSmFYSJJWaTs3Hg6yU5i` at source `429afee1d1f8ea06f663e96f9c554bf37c5c2ab8`.

Batch G: app-only release of #693 (mask-editor keyboard interaction, focus and announcements) and #694 (narrow composer overflow fix); #682 tests and #692 planning docs also merged. Real Production environment preflight passed; migration 0037 (ledger 20261124090831), Modal renderer v13 and gateway/dispatcher v14, and worker tree 4633471969d96f3b3a861a15edadd835253d85b4 unchanged. No verification generation was run because no backend or request path changed. Live QA: Create loaded; #694 did not remove the 15 CSS px internal overflow at true 200% browser zoom (195 × 421 effective; DIV 194/209, same as Batch F); mounted CI passed, cause unproven. Head engineer accepted the residual limitation; Phase 6 Create carries the requirement. Remaining desktop QA not run due to WANDA preemption. Detailed evidence: `docs/audits/BATCH_G_RELEASE_EVIDENCE_2026-11-24.md`. Prior Batch F evidence: `docs/audits/BATCH_F_RELEASE_EVIDENCE_2026-11-24.md`.


## Current UI foundation

The earlier whole-product redesign/migration program is historical closure evidence; current source has since changed under UI-084 and the merged Phase 5 frontend polish contract. Do not infer full current acceptance from historical verification. `docs/ui/SCREEN_REGISTRY.md` owns exact route/screen maturity, and `docs/ui/UI_DECISIONS.md` owns accepted UI precedents/supersession.

Current product family:
- Landing uses the approved Lab Matrix / Lab Grid identity and composition.
- P5-06 source-authority disposition accepted: `PreviewNavigationShell` is the current production implementation, including Landing; `AppShell` remains reachable in ordinary non-production, non-preview application routes. UI-074 remains approved geometry outside scoped Create; UI-052 separate Landing chrome intent and current wrapper fidelity are unresolved, not retrospectively approved by UI-085. Retain both shells and their historical evidence until the separately reviewed Phase 6 Shell step ([V2 roadmap](DESIGN_LANGUAGE_V2.md)); no deletion or runtime change in P5-06. See [P5-06 shell authority disposition](../audits/P5_06_SHELL_AUTHORITY_PROPOSAL_2026-11-24.md).
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
