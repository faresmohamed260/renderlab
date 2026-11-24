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
<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: 6f3b1ee7b4b5109816a082ca8cccb4f92263a8bf -->

Canonical record: docs/production/current.json identifies source `6f3b1ee7b4b5109816a082ca8cccb4f92263a8bf`, READY deployment `dpl_52LrtHNSYLVtfXhQ3eaRQUcnpQG1` (`https://renderlab-t9lp62erl-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681` at `2026-11-24T04:37:41.196Z` (independent team-account alias read-back). Deployment Readiness #45327110055 passed at `2026-11-24T04:33:17Z`; all six exact-source protected checks passed: quality 138219148837, governance 138219148753, unit-coverage 138219149532, javascript-typescript 138219148452, clean-room (ubuntu-latest) 138219149518, clean-room (windows-latest) 138219149032. Qualified at `2026-11-24T04:34:37.000Z`, before cutover. Rollback anchor: `dpl_5DugposwdpcoLui6XWdx3RnyScNr` at source `593095eeabd09791e16e67d3ba9d105a92244949`.

Batch C: ordered #638/#639/#641/#642/#652/#640 and exact origin correction #660. Additive 0035 installed (ledger 20261124041650, 2026-11-24T04:16:50Z); bounded claim RPC restricted to dispatcher/service role and original claim RPC unchanged. Real Vercel production environment preflight passed. Modal renderer v11 at 04:38:27Z and gateway/dispatcher v12 at 04:38:30Z, release tag 6f3b1ee, worker tree d80febcf2bd7750587914be1f2813ad580aec171; rollback renderer v10/gateway v11. Scheduled heartbeat continued at 04:39:00Z. Site/health/capabilities and invalid-request checks passed. One authorized hosted smoke passed ([#45330349970](https://github.com/faresmohamed260/renderlab/actions/runs/45330349970)): HTTP 202, succeeded, one Library asset, released reservation, stable second load, atomic calls 4 to 5 and zero residue. Renderer v11/gateway v12 corroborated by execution logs and history; scheduled heartbeat 05:04:01Z. Allowance consumed. Production Documentation Sync #45330273477 passed. Admin page loaded; preferences and malformed non-FIBO keyed API probes skipped after repeated WANDA preemption (no new job; identity of preemptor not exposed). TLS and batch D excluded. Historical C1 evidence: `docs/audits/C1_RELEASE_EVIDENCE_2026-11-24.md`. Batch C evidence: `docs/audits/BATCH_C_RELEASE_EVIDENCE_2026-11-24.md`.


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
