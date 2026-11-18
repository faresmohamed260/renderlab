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

## Active phase — FIBO-only production Create workspace (2026-11-18)

**Execution:** IN PROGRESS. **Repository:** UNMERGED. **Deployment:** NOT DEPLOYED.

**Normative contract:** docs/architecture/FIBO_PRODUCTION_ROLLOUT_CONTRACT.md supersedes the earlier model-selector-only rollout. The owner directs that /create become the full FIBO image/edit workspace, preserving the WANDA-authored presentation while implementing every image control against the retained production FIBO gateway. No retired generation model, video/animation/upscale, private preview relay or unverified Studio worker is authorized.

**Starting state:** Protected main at 8c02102c6b94be61da04f963b74fac82948c80cb is FIBO-only. The native worker accepts one output and does not implement masks; the API rejects VGL and lacks a multi-output durable job. WANDA feature/fibo-create-port at 09299d3b8aa7e03996a9b576e678752b9d5b25d3 contains reference UI modules but is diverged from main. Use selective import onto current main, not an indiscriminate merge. WANDA-only visual and hosted-relay experiments are preserved at docs/history/ui/FIBO_WANDA_VISUAL_PORT_2026-11-18.md.

**Next gate:** The bounded production contract merged as PR #422 and manual VGL API/persistence merged as PR #423. The native masked-worker implementation is merged in PR #424 and an owner-validated mask upload/submit/retry implementation candidate is in progress, but no hosted or UI-backed mask operation is production-qualified; the remaining work must qualify hosted signed-in generation, masks, generated VGL, inspiration, batch persistence, negative prompting and full FIBO Create lifecycle before enabling those controls. Tests must prove responsive, keyboard, touch, reduced-motion and full worker-backed runtime behavior. Release or provider mutation requires separate owner authorization.

**Reporting:** Keep the implementation inventory and status in the contract and current capability/screen registries; do not turn this tracker into another run journal.

## Historical evidence

The complete pre-separation UI migration journal is preserved as a content snapshot in `docs/archive/UI_MIGRATION_PRE_HISTORY_SEPARATION_2026-10-10.md`. It contains the Phase 0–29 chronology, corrective-maintenance records, closure-time statuses, exact run IDs, artifact digests and earlier production pointers that previously occupied this current tracker.

Completed implementation contracts remain historical evidence after their bounded work closes unless `docs/ui/UI_DECISIONS.md`, `docs/ui/UI_SYSTEM.md`, `docs/ui/SCREEN_REGISTRY.md` or another current authority explicitly carries a constraint forward. Their location alone does not make them current execution scope.
