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

## Current production - 2026-11-26
<!-- RENDERLAB_CURRENT_PRODUCTION_SHA: fb84c89cb41b42fcceeb0ba0fc132959a1368107 -->

Canonical record: docs/production/current.json identifies source `fb84c89cb41b42fcceeb0ba0fc132959a1368107`, READY deployment `dpl_FVt77brpWxKkKYJQCjUtLbr9wTcn` (`https://renderlab-djs4imuqi-faresmohamedsalah10-1681.vercel.app`) assigned to `renderlab.faresuniform.uk` on Vercel team `faresmohamedsalah10-1681`, project `prj_APU35jTnge27D2MAFjuc7GP0Dd6I` at `2026-11-26T22:43:54.413Z` (independent head-engineer team-account read-back; updatedAt 1795733034413; redirect null; deployment created 2026-11-26T22:38:41.590Z, READY 2026-11-26T22:39:09.330Z). Deployment Readiness #45901479925 passed at `2026-11-26T21:56:50Z` (job 140188038893); all six exact-source protected checks passed: quality 140188039670, governance 140188038887, unit-coverage 140188038526, javascript-typescript 140188038767, clean-room (ubuntu-latest) 140188038681, clean-room (windows-latest) 140188038918. Qualified at `2026-11-26T21:58:03.000Z`, before cutover. Rollback anchor: READY deployment `dpl_Fn5yNhNWz7owH9tMqi5cSbs3Y4WE` at source `34efe0b84ac1d950581d7b371b65bbf331852e89`.

Phase 6: app-only UI redesign, including Landing, Create, Library, Settings, History and scoped Admin presentation; Activity retains its signed-out 200 contract. Production environment inventory 16/16; staged Production build READY. Migration 0037 (ledger 20261124090831), Modal renderer v13 and gateway/dispatcher v14, and worker tree 4633471969d96f3b3a861a15edadd835253d85b4 unchanged. Ordinary generation submit/admission/dispatch/payload paths unchanged; History adds retry/run-again entry points. No verification generation was run (owner authorized zero spend). Head-engineer read-only database evidence: empty outbox, no non-terminal jobs, dispatcher heartbeat with zero unresolved dispatches. Hosted signed-out HTTP run 45905056828 (job 140199724980) passed; local Batch G/candidate comparison and authenticated staged read-back preserved /create, /activity, /library 200 and /admin 404 without Location. Post-promotion cookie-free HTTP and browser checks passed: Landing, Create, Library and Settings 200, Activity 200, Admin 404, no Location; signed-out private-state markers present, Settings sign-in and Create rendered, no runtime error/fatal records, Batch G rollback still READY. No rollback required. Holds #813, #748, #603 and #625 remain. Release source/readiness evidence: `docs/audits/2026-11-26-phase6-production-preflight.md`, `docs/audits/2026-11-26-phase6-final-acceptance.md`, and `docs/audits/2026-11-25-release-readiness-main-0d83c87.md`. Prior Batch G evidence: `docs/audits/BATCH_G_RELEASE_EVIDENCE_2026-11-24.md`. Repository closure remains pending Production Documentation Sync.


## Current UI foundation

The earlier whole-product redesign/migration program is historical closure evidence; current source has since changed under UI-084 and the merged Phase 5 frontend polish contract. Do not infer full current acceptance from historical verification. `docs/ui/SCREEN_REGISTRY.md` owns exact route/screen maturity, and `docs/ui/UI_DECISIONS.md` owns accepted UI precedents/supersession.

Current product family:
- Landing uses the approved Lab Matrix / Lab Grid identity and composition.
- P5-06 source-authority disposition accepted: `PreviewNavigationShell` is the current production implementation, including Landing; `AppShell` remains reachable in ordinary non-production, non-preview application routes. UI-074 remains approved geometry outside scoped Create; UI-052 separate Landing chrome intent and current wrapper fidelity are unresolved, not retrospectively approved by UI-085. Retain both shells and their historical evidence until the separately reviewed Phase 6 Shell step ([V2 roadmap](DESIGN_LANGUAGE_V2.md)); no deletion or runtime change in P5-06. See [P5-06 shell authority disposition](../audits/P5_06_SHELL_AUTHORITY_PROPOSAL_2026-11-24.md).
- Create uses the production-mode FIBO-only CreatePreviewWorkspace under UI-084. Clear Composer is a retained alternate non-production branch and historical evidence. The Phase 6 composition migration and responsive/interaction acceptance are recorded in the [Phase 6 final acceptance](../audits/2026-11-26-phase6-final-acceptance.md), with one accepted phone-composer deviation (UI-092); full FIBO parity remains open.
- Library uses the approved Gallery Rail family and current server/URL-owned discovery/organization behavior.
- Media Viewer uses the approved Media Register + Source Fold family.
- Activity uses the approved Job Matrix + History Register family.
- Settings uses the approved Trust Register family with the current profile/credential/preferences additions integrated into that system rather than as a competing redesign.
- Admin uses the approved Admin System Continuity family inside the existing access/generation/health hierarchy.

UI-074 through UI-080 remain the historical redesign family where not superseded by UI-084, with later accepted corrections such as UI-081 and UI-082 carrying forward their bounded changes. Historical per-phase `NOT DEPLOYED` labels record closure-time state only; the current-production block above governs present deployment truth.

## Current migration/work state

[Design Language V2](DESIGN_LANGUAGE_V2.md) sets the dark-only Violet Studio glass direction. Phase 6 implementation proceeds under the bounded contracts below.

- **UI rebuild to the approved comps (UI-093).** On 2026-11-27 the owner approved the rebuilt UI on `ui-rebuild`; mounted browser specs, unit tests, typecheck, lint and UI purity were migrated to it (tracking #881; evidence in [the acceptance audit](../audits/2026-11-27-ui-rebuild-acceptance.md)). It reaches `main` only through the protected-main process and is not in production until a separately authorized release. This replaces earlier statements that Create matched its comps.
- **P6-03 Shell and primitives.** The [shell contract](P6_03_SHARED_PRIMITIVES_SHELL_CONTRACT.md) governs the merged semantic tokens, named spring roles, shared glass wrappers and desktop navigation slice. Phone sidebar and auth-safe loading are merged; phone visible-label accessibility and measured primitive boundary corrections are merged; integrated visual review is recorded in the [Phase 6 final acceptance](../audits/2026-11-26-phase6-final-acceptance.md). Composited contrast, zoom and motion remain governed by the Phase 6 validation lanes.
- **P6-04 Create and History.** Under the [Create contract](P6_04_CREATE_CONTRACT.md), Create now defers loading the mask editor until opened. The History panel, sheet and state hook, owner-scoped prompt-history reader and failed-job draft reconstruction are merged groundwork (#745). Create route wiring and mounted parity, mounted phone target sizing and truthful result pager are merged; auth-safe loading and the mounted zero-overflow ratchet are merged; compact Advanced, phone media stage, labelled mode, result actions, truthful capability visibility and five-width mounted acceptance with Generate sizing/contrast correction are merged; final-main rendered review and page-level overflow at 200% effective zoom are recorded in the [Phase 6 final acceptance](../audits/2026-11-26-phase6-final-acceptance.md); the phone composer keeps its in-flow layout under UI-092 and the approved compact composer is an open follow-up. Activity remains transitional; the separately reviewed 307 compatibility redirect is pending. The merged Activity characterization (#737, #729) covers the current projection, owner recovery and mounted lifecycle expectations for that comparison.
- **P6-05 Library.** The [Library contract](P6_05_LIBRARY_CONTRACT.md) is merged via #763; desktop gallery/inspector and Round 3 phone presentation are merged; auth-safe loading skeleton and visible-label accessible-name corrections are merged; phone/desktop header, selection, toolbar, inspector and Viewer action fidelity corrections are merged; exact integrated review is recorded in the [Phase 6 final acceptance](../audits/2026-11-26-phase6-final-acceptance.md).
- **P6-06 Admin Observe.** The [read-only Observe contract](P6_06_ADMIN_OBSERVE_CONTRACT.md) is merged (#749); the desktop slice and Round 3 truthful-data presentation are merged; final-main lane and rendered verification are recorded in the [Phase 6 final acceptance](../audits/2026-11-26-phase6-final-acceptance.md); release verification remains owner-gated. Admin control remains unauthorized. The slice carries forward deferred P5-03 Health presentation using existing aggregates.

- **Round 3 Landing and Settings.** Approved hero and Settings desktop/phone presentations and Settings avatar and MFA accessible-name corrections are merged; interim accessibility/performance evidence is recorded; final-main qualification is recorded in the [Phase 6 final acceptance](../audits/2026-11-26-phase6-final-acceptance.md); manual axe and arbitrary-artwork contrast review rows remain open. The lower Landing sections and existing account behavior remain unchanged.

The [Phase 5 polish contract](../architecture/FRONTEND_PHASE5_POLISH_CONTRACT.md) governs its correctness scope. The [UI-084 rollout contract](../architecture/FIBO_PRODUCTION_ROLLOUT_CONTRACT.md) separately governs the FIBO rollout.

### Phase 6 validation lanes

These workflows have optional check status. Exact-head protected checks and the evidence required by each surface contract still apply. Responsive rendered fidelity and applicable motion evidence require human review for UI approval.

- [Component Review](../../.github/workflows/phase6-component-review.yml) mounts real components with production stylesheet discovery and staged production assets in an optimized fixture. It gates bundle completeness, material/token and desktop layout sentinels, and browser/resource errors. The bundle supplies geometry, composited contrast and normal/reduced-motion evidence. The [measured stylesheet correction](../../tests/components/OVERFLOW_REBASELINE_731.md) was a one-time overflow rebaseline. Future changes use the shrink-only ratchet.
- [Axe Smoke](../../.github/workflows/phase6-axe-smoke.yml) checks scanner controls, expected mounted scan coverage, fixture isolation and scanner exclusion from production output. Round 3 coverage includes Settings, Admin, phone navigation, Library selection/inspector and Landing. Violation findings are informational and feed accessibility triage; specific corrective assertions and exact release evidence remain separate.
- [Slow 4G Performance](../../.github/workflows/phase6-slow4g-performance.yml) checks throttling calibration, fixture integrity and complete LCP/CLS measurements across cold Create and Library samples. Lab timings and the 4 s LCP reference are advisory pending a repeatable baseline. Field performance and INP require separate evidence.
- [Signed-out Production HTTP](../../.github/workflows/phase6-signed-out-http.yml) compares real loopback production builds of the PR base and candidate. It checks status, Location, HTML and signed-out page markers for Create, Activity and Library, plus the concealed Admin 404. Signed-in ownership, MFA and deployment qualification use separate gates.

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
