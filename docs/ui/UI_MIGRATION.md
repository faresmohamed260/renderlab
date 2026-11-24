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
<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: 80194dfe654bd7c34660c4679a8c97542db94387 -->

Canonical record: docs/production/current.json identifies source `80194dfe654bd7c34660c4679a8c97542db94387`, READY deployment `dpl_32ns93K9T2tRVQ2azrcBxJBy5238` (`https://renderlab-igi59d5u6-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681` at `2026-11-24T09:16:04.401Z` (independent team-account alias read-back; updatedAt 1795511764401; createdAt unchanged 2026-11-21T02:01:08.378Z). Deployment Readiness #45362418421 passed at `2026-11-24T09:09:32Z`; all six exact-source protected checks passed: quality 138328819253, governance 138328820761, unit-coverage 138328818867, javascript-typescript 138328860614, clean-room (ubuntu-latest) 138328819647, clean-room (windows-latest) 138328820347. Qualified at `2026-11-24T09:09:32.000Z`, before cutover. Rollback anchor: `dpl_7Q8CbxmgWJW5qmizzHtBXcoNP8HY` at source `aeb43cb508297e22c52d87de4df747cbd7c8516a`.

Batch E: all eleven ordered PRs qualified and merged (#678/#679/#680/#676/#671/#669/#672/#670/#673/#675/#674), then docs #684 and #686; #687 deferred. Additive 0037 installed (ledger 20261124090831); bounded dispatch claim signature/defaults and service_role/dispatcher-only grants unchanged, attach-only at cap verified by catalog, jobs 70 and outbox 0 with identical before/after digests. Captured pre-0037 function/ACL rollback text in `docs/audits/BATCH_E_MIGRATION_0037_ROLLBACK_2026-11-24.md`; migration remains installed unless separately authorized. Real production environment preflight passed. Renderer v13 at 09:26:58Z, gateway/dispatcher v14 at 09:27:00Z, tag 80194df, worker tree 4633471969d96f3b3a861a15edadd835253d85b4; rollback renderer v12/gateway v13. Landing/health HTTP 200, Admin fresh heartbeat 35s, zero active jobs/reservations/expired claims/unresolved. FE-01 Edit attaches source and Reuse Settings restores original prompt, seed 1889046298, 4 steps and 1:1 recipe. Preferences MFA and malformed non-FIBO API probes not completed because WANDA was preempted. Verification generation explicitly pending at record merge; 0/1 consumed. Historical Batch D evidence: `docs/audits/BATCH_D_RELEASE_EVIDENCE_2026-11-24.md`. Batch E evidence: `docs/audits/BATCH_E_RELEASE_EVIDENCE_2026-11-24.md`.


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
