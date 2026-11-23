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

## Current production - 2026-11-23
<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: b548fe40ac274bb4d5bc6d2674ce7bfac556bfcf -->

Canonical record: docs/production/current.json records source b548fe40ac274bb4d5bc6d2674ce7bfac556bfcf and deployment dpl_2J4BXM3Y4xF9JWo1cdj38Da5CWJR (https://renderlab-16s8mm8ew-faresmohamedsalah10-1681.vercel.app) as the assigned Production release for renderlab.faresuniform.uk. The Vercel team authenticated alias read-back confirmed deployment dpl_2J4BXM3Y4xF9JWo1cdj38Da5CWJR and alias assigned at 2026-11-23T20:00:50.248Z. Deployment Readiness run 45252066830 completed successfully at 2026-11-23T19:45:23.000Z; all six exact-source protected-main checks were green by 2026-11-23T19:45:57.000Z (release qualifiedAt), before cutover: quality 137963726407, governance 137963726916, unit-coverage 137963727155, javascript-typescript 137963726466, clean-room (ubuntu-latest) 137963726455, and clean-room (windows-latest) 137963726736. Rollback anchor: dpl_DPm2p2XMTiR7GrMasYPbeAYkvMhJ at source 696ca784759eb94457005381fc34b0509d00e920.

Since the preceding live source 696ca784759eb94457005381fc34b0509d00e920, this production release adds P0-07 application-side atomic terminalization via the already-installed service-only Supabase RPC (PR #580), plus the Admin-only fixed-locale/UTC timestamp formatter (PR #584); no worker/Modal/secret runtime delta. The RPC was applied from exact merged migration 0031 at approximately 2026-11-23T19:30:49Z under Supabase migration version 20261123193049, with postgres ownership, SECURITY DEFINER, private EXECUTE grants and a verified no-op not_found result. The original promotion of dpl_2J4BXM3Y4xF9JWo1cdj38Da5CWJR was rolled back to dpl_DPm2p2XMTiR7GrMasYPbeAYkvMhJ at 2026-11-23T19:54:34.735Z after historical Admin hydration error #418 persisted; owner clarified that the pre-existing hydration message is informational, and dpl_2J4BXM3Y4xF9JWo1cdj38Da5CWJR was re-promoted at 2026-11-23T20:00:50.248Z without a rebuild. Post-repromotion GET site/health/capabilities returned HTTP 200, FIBO/mask were available, sanitized invalid POST was HTTP 400 invalid_request, Admin Health displayed zero active jobs/reservations/dispatches, and no generation had yet been spent at record creation. The one approved disposable FIBO fixture subsequently passed on the exact live release: Production FIBO Smoke #45259301091 returned 202, reached succeeded with one indexed output/Library asset, showed the bound admission reservation released, and proved a second Library load changed nothing. Read-only PostgreSQL statement statistics showed exactly one new PostgREST atomic-RPC invocation (query ID -2583045759348788091, calls=1, rows=1); the one run's independent DB/Auth/R2 cleanup verified zero residue, and 0 active jobs, 0 unreleased reservations, 0 dispatch-outbox rows remained. Full evidence: docs/audits/PHASE3_P007_ATOMIC_PRODUCTION_SMOKE_VERIFICATION_2026-11-23.md. No second generation, retry, worker/Modal, new secret, or S.A.G.A. change was made. A clean signed-in Admin reload did not reproduce #418 during the latest check; the unauthenticated private-window /admin was 404 and is not an equivalent authenticated Admin test. P0-07 production claims should be limited to verified lifecycle results after the fixture; this record does not by itself prove exactly-once settlement. No S.A.G.A., resume, Modal or secret changes.

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
