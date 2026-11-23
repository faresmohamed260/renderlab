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
<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: bc3cc27f2d207efdea87bb5d5d57706ba49320ba -->

Canonical record: docs/production/current.json records source bc3cc27f2d207efdea87bb5d5d57706ba49320ba and deployment dpl_AsG9axxT8oe9buUuxrzXYvrB9NXB (https://renderlab-k9e425u5m-faresmohamedsalah10-1681.vercel.app) as the assigned Production release for renderlab.faresuniform.uk. Vercel created the deployment at 2026-11-23T17:32:42.140Z, marked it READY at 2026-11-23T17:33:09.892Z, and assigned the domain alias at 2026-11-23T17:34:36.575Z. Deployment Readiness run 45228447753 and six exact-source protected-main checks qualified the release at 2026-11-23T17:31:13.000Z before cutover: quality 137877226173, governance 137877227697, unit-coverage 137877240912, javascript-typescript 137877228428, clean-room (ubuntu-latest) 137877227394, and clean-room (windows-latest) 137877226827. Rollback anchor: dpl_7X5xzARHaT7nXkzoHMoHiGxi1xfa at source 2a64d4ccc03e8f8ce1e415d298687321179efb50.

Since the prior release, this source includes scoped P0-03 owner-isolation coverage; P0-04 pure eight-state policy; P0-05 deterministic generation critical-path harness; P0-06 native and retained-upscale owner+job+expected-status compare-and-swap with typed already_terminal_or_changed and six race/replay regressions; the backend architecture overview; design-only atomic terminalize-and-release proposal; stale-PR housekeeping triage and conservative Phase 3 P0 scoring; and the seven-scenario offline backend demo (npm run demo:backend) with contributor documentation. The P0-06 application-runtime hardening is production-deployed, while a separate single-generation live fixture remains necessary for hosted acceptance. Previously qualified P0-02 typed runtime configuration, P0-03 privileged-error sanitization, invitation-only enforcement, FIBO mask capability, 16-name Production configuration, and owner-return reconciliation remain applicable. This release made no SQL migration, Modal/worker deployment, new secret, S.A.G.A. change, or resume edit. Atomic terminalization/release and never-return owner settlement remain known limitations; the Phase 3 42/60 gate is not declared met by cutover alone.

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
