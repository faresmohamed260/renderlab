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

## Current production and whole-product audit - 2026-10-09
<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: d7571a230b3f1c5719552628db020823adb4da73 -->

**Canonical production manifest:** `docs/production/current.json`. Release qualification completed at `2026-10-09T13:22:15.000Z`; the verified custom-domain cutover occurred at `2026-10-09T13:25:40.464Z`.

**Deployment:** `PRODUCTION-LIVE`. **Verification:** `PRODUCTION-VERIFIED`.

- Exact current production source is `d7571a230b3f1c5719552628db020823adb4da73` at READY deployment `dpl_5LZbW2kA6bFZpYvy2p8bFXzZ2ABF` (`https://renderlab-de7i5y37u-faresmohamed260-6733s-projects.vercel.app`), explicitly serving `renderlab.faresuniform.uk`.
- Release qualification passed Deployment Readiness `37930497565` and Release Candidate Matrix `37934750620` attempt 1 on the exact production source; the matrix accepted all 23 configured children.
- The immediately previous verified live deployment `dpl_4E38yZarWfooA4wfEuW5USmPnNsN` at source `bcb2de305b15f4be15ed42674d22998c30b8c811` remains the immediate rollback anchor.
- All completed application/runtime changes through the exact production source are `PRODUCTION-LIVE`, including the accepted whole-product hierarchy corrections. Repository `main` may be newer because documentation, verification, CI/tooling and other non-deployed commits do not automatically change production.
- Automatic Git → Vercel deployment remains disabled; future production releases remain separately explicit.

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

## Proposed next phase — FIBO Studio visual port for Create

**Execution:** `IN PROGRESS`. Initial WANDA implementation: full-width docked three-panel desktop workspace, route-wide ambient glow and canvas-first responsive arrangement over the existing RenderLab composer and result state. The history panel routes to Activity and Library; it does not implement FIBO run-history tiles. Desktop panel geometry was checked against live FIBO at 1280 px and 900 px. Create uses a transparent header with the centered FIBO Text to Image / Image Editing switch; the existing Image / Video output selector remains in the composer. Image Editing requires a source and uses the existing RenderLab image request. Switching to Text to Image does not discard attached sources. On WANDA, Edge confirmed switch geometry within 1 CSS pixel at 1280 px, default and changed selections, Video access, and mobile placement. The Create header also exposes a Render queue menu for the current workspace job, with a link to Activity, and a centered, FIBO-styled glass keyboard-shortcuts dialog with grouped keycaps and only supported RenderLab actions. WANDA browser checks covered opening and switching menus by click and keyboard, typing in the prompt without shortcut interference, mobile queue access, and Library isolation. Provider-backed generation was not exercised. Mobile still shows the full RenderLab composer and History inline rather than the FIBO compact dock and History popover. Control, effect and interaction parity is not verified. The verified production baseline remains unchanged.

- **Goal:** Match the live FIBO Studio design in the RenderLab web Create workspace. Port the desktop and mobile layout, canvas background effects, controls, motion and interactions. Keep navigation and other routes intact.
- **Starting point:** WANDA RenderLab checkout at main 985deda. The Next.js route resolves account state and owner-scoped recipes and continuations before rendering the React workspace. The live FIBO reference is 127.0.0.1:7865, served from B:/ComfyUI/Fibo-2.0-Local/upstream/studio.html with studio.py adaptations. Use the served page for fidelity, including the gradient canvas, Edit and Text to Image, settings, queue and history.
- **Boundary:** Use scoped styles and React components with approved primitives; no iframe or embedded Python app. Preserve access, ownership, durable uploads, job lifecycle, results, recipes, continuations, image and video behavior. Map FIBO controls to actual supported operations and account for controls that have no RenderLab equivalent. No new provider, API, schema or credentials; no separate workflow-canvas route, history import, production change or deployment.
- **Validation:** Capture live reference on WANDA, verify reuse rights before copying upstream assets or code, and compare the rendered derivatives at desktop and mobile widths. Validate keyboard, touch, reduced motion, inputs, settings, queue, error, result and history states with existing test fixtures and affected CI. No production credentials for visual comparison.
- **Exit:** Review visual and motion evidence, record verified gaps and the exact rollback reference, update screen registry and affected UI decisions when verified. GitHub remains authoritative even when WANDA is the development and comparison machine.

## Historical evidence

The complete pre-separation UI migration journal is preserved as a content snapshot in `docs/archive/UI_MIGRATION_PRE_HISTORY_SEPARATION_2026-10-10.md`. It contains the Phase 0–29 chronology, corrective-maintenance records, closure-time statuses, exact run IDs, artifact digests and earlier production pointers that previously occupied this current tracker.

Completed implementation contracts remain historical evidence after their bounded work closes unless `docs/ui/UI_DECISIONS.md`, `docs/ui/UI_SYSTEM.md`, `docs/ui/SCREEN_REGISTRY.md` or another current authority explicitly carries a constraint forward. Their location alone does not make them current execution scope.
