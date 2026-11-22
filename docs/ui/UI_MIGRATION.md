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

## Current production - 2026-11-22
<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: 4b9773267a4db5dfa4a839e45522662dfcd794ea -->

Canonical record: docs/production/current.json records source 4b9773267a4db5dfa4a839e45522662dfcd794ea and deployment dpl_3iR6p9m6M2wcgV5ru25nhTwTv2x5 (https://renderlab-1got9zfg0-faresmohamedsalah10-1681.vercel.app) as the assigned production release for renderlab.faresuniform.uk. Production cutover: 2026-11-22T04:11:12.524Z; qualified at 2026-11-22T04:04:26.000Z by Deployment Readiness 44983369933. Protected-main check run IDs: 137086357473, 137086357232, 137086357139, 137086357404, 137086357261, 137086357494. Rollback anchor: dpl_FCQcLR7jvfkAmrLNkQp1XeD8NP8r at source 4b9773267a4db5dfa4a839e45522662dfcd794ea. Automatic Git-to-production deployment remains disabled. Hosted process-exit recovery is pending verification.

Exact-source CI completed at 2026-11-22T04:04:26.000Z: Deployment Readiness 44983369933; protected check runs 137086357473, 137086357232, 137086357139, 137086357404, 137086357261, 137086357494.

Rollback anchor: dpl_ALVqmSx8fp1avwu4W3pJbPc6JkT1 at source a450a95996329a4508883ab77996016cd27fbd86. Automatic Git-to-production deployment remains disabled. Hosted missed-wake/lost-response/overlap recovery and replay-retention are production-verified in `docs/audits/ADR005_DURABLE_RECOVERY_PRODUCTION_2026-11-20.md`; the owner Modal usage alert is verified in `docs/audits/ADR005_MODAL_USAGE_ALERT_PRODUCTION_2026-11-20.md`. Hosted timeout/process-exit recovery is the only open ADR-005 evidence; this production pointer does not claim that gate complete.

## Current UI foundation

The whole-product redesign/migration program is closed and production-live. `docs/ui/SCREEN_REGISTRY.md` owns exact route/screen maturity, and `docs/ui/UI_DECISIONS.md` owns accepted UI precedents/supersession.

Current product family:
- Landing uses the approved Lab Matrix / Lab Grid identity and composition.
- Application routes use the approved compact horizontal shell geometry.
- Create uses the approved Clear Composer family and media-first result hierarchy.
- Library uses the approved Gallery Rail family and current server/URL-owned discovery/organization behavior.
- Media Viewer uses the approved Media Register + Source Fold family.
- Activity uses the approved Job Matrix + History Register family.
- Settings uses the approved Trust Register family with the current profile/credential/preferences additions integrated into that system rather than as a competing redesign.
- Admin uses the approved Admin System Continuity family inside the existing access/generation/health hierarchy.

UI-074 through UI-080 remain the accepted redesign family, with later accepted corrections such as UI-081 and UI-082 carrying forward their bounded changes. Historical per-phase `NOT DEPLOYED` labels record closure-time state only; the current-production block above governs present deployment truth.

## Current migration/work state

**Execution:** `COMPLETE`. **Repository:** `MERGED`. **Verification:** `PRODUCTION-VERIFIED`. **Deployment:** `PRODUCTION-LIVE`.

There is no open UI migration checklist in this tracker. Future UI work must begin from current repository reality rather than resume a historical Phase 0–29 or corrective-maintenance checklist.

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
