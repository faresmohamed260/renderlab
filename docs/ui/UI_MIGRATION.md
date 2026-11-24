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
<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: aeb43cb508297e22c52d87de4df747cbd7c8516a -->

Canonical record: docs/production/current.json identifies source `aeb43cb508297e22c52d87de4df747cbd7c8516a`, READY deployment `dpl_7Q8CbxmgWJW5qmizzHtBXcoNP8HY` (`https://renderlab-34wskn7jz-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681` at `2026-11-24T05:56:36.063Z` (independent team-account alias read-back). Deployment Readiness #45336488371 passed at `2026-11-24T05:54:30Z`; all six exact-source protected checks passed: quality 138247489140, governance 138247488114, unit-coverage 138247488518, javascript-typescript 138247488189, clean-room (ubuntu-latest) 138247488374, clean-room (windows-latest) 138247488166. Qualified at `2026-11-24T05:54:30.000Z`, before cutover. Rollback anchor: `dpl_52LrtHNSYLVtfXhQ3eaRQUcnpQG1` at source `6f3b1ee7b4b5109816a082ca8cccb4f92263a8bf`.

Batch D: ordered #654/#655/#657/#658/#659, then qualified TLS #653 after successful one-shot canary. Additive 0036 installed (ledger 20261124054825, 05:48:25Z); zero eligible historical outbox rows, existing terminalize signature and service-only grants unchanged, no-op not_found, unstarted outbox closure and canonical asset guard present. Reviewed public Supabase Root 2021 CA downloaded 2026-11-24, SHA-256 700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7, verify-full canary passed. Real Vercel environment preflight passed. Renderer v12 at 05:57:29Z, gateway/dispatcher v13 at 05:57:33Z, tag aeb43cb, worker tree 0ff15d97fac3c7b24268236212f26febd4148c47; rollback renderer v11/gateway v12. Scheduled heartbeat continued at 05:58:01Z. Site/health/capabilities and invalid-request checks passed. One authorized hosted smoke passed ([#45337710177](https://github.com/faresmohamed260/renderlab/actions/runs/45337710177)): HTTP 202, succeeded, one Library asset, released reservation, stable second load, atomic calls 5 to 6 and zero residue. Headerless client source and independent fixture SQL confirm one job, one server-generated UUID-v4 key and one correct binding; key rows zero after cleanup. TLS gateway wake dispatched one job without failure; scheduled heartbeat 06:07:01Z. Allowance consumed. Production Documentation Sync #45337643059 passed. Historical batch C evidence: `docs/audits/BATCH_C_RELEASE_EVIDENCE_2026-11-24.md`. Batch D evidence: `docs/audits/BATCH_D_RELEASE_EVIDENCE_2026-11-24.md`.


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
