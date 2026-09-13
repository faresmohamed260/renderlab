# Phase 29 — Whole-product Cohesion Implementation Contract

**Status:** Accepted execution boundary pending merge  
**Tracker:** #235  
**Baseline:** `main` `fcab275189089106ee7186e9ddd0b935aa5aeade`  
**Deployment:** Not authorized by this contract

## Goal
Close the current RenderLab UI/UX redesign program with a bounded integration and quality pass over the already approved product surfaces. Phase 29 does not invent another visual direction. It verifies that the independently approved Landing, Create, Library, Media Viewer, Activity, Settings, Admin and shared application shell behave and read as one product when exercised together, then corrects only cohesion defects demonstrated by current implementation or browser evidence.

## User value
A user should move through RenderLab without encountering avoidable changes in shell clearance, interaction reachability, focus treatment, responsive spacing, feedback-state quality or motion behavior that make the product feel assembled from separate phases. Cohesion work must improve continuity without flattening the intentionally different expressiveness levels of creative, operational and trust surfaces.

## Verified starting state
Phase 29 starts after Phase 28 repository closure. The current clean baseline is `fcab275189089106ee7186e9ddd0b935aa5aeade`; Phase 28 production UI merged as `f2eda00362ac2931192428bc18f96b62fd697c43`.

The merged Phase 28 product tree passed Release Candidate Matrix `34783516480` with its complete 23/23 exact-SHA configured child set. Phase 29 uses the real same-product-tree browser artifacts from those children as its initial integrated visual baseline rather than treating prior R&D screenshots as the current app.

Current approved visual authorities remain:
- current Lab Matrix Landing plus locked `RenderLabBrand`;
- UI-074 compact horizontal application shell;
- UI-075 Library Gallery Rail;
- UI-076 Media Viewer Register + Source Fold;
- UI-077 Activity Job Matrix + History Register;
- UI-078 Settings Trust Register;
- UI-079 Admin System Continuity.

`docs/ui/VISUAL_NORTH_STAR.md` expressiveness levels remain intact: Landing 4/4; Create, Library and Viewer 3/4; Activity and shell 2/4; Settings and Admin 1/4. Cohesion does not mean making those surfaces visually identical.

## Work mode
Phase 29 is **Integration Mode**, not Authorized Redesign Mode.

Existing approved compositions, route hierarchy, visual identities, feature ownership and interaction semantics remain authoritative. A correction may adjust spacing, shared presentation, responsive geometry, focus/touch treatment or feedback-state presentation only when the integrated app demonstrates a real inconsistency or defect. It may not use “cohesion” as permission to reinterpret an approved screen.

## In scope
Audit and, where evidence justifies it, correct:

### Shared shell and route continuity
- fixed UI-074 header/content clearance at desktop and narrow viewports;
- active navigation semantics and focus visibility;
- consistent route-change settling with `prefers-reduced-motion` equivalence;
- no reintroduction of a desktop rail, mobile dock or duplicate route context chrome.

### Cross-surface layout and typography
- page-intro clearance and spacing relative to the shared shell;
- accidental typography/spacing drift that is not part of an approved surface’s expressiveness;
- common content-width and responsive-edge behavior where the same shell/content boundary applies;
- preservation of each surface’s approved composition and density.

### Responsive and touch behavior
- 1440px desktop plus 390px narrow/mobile evidence for every primary/current route family;
- no horizontal overflow or clipped primary content;
- practical 44×44 effective touch targets where the existing component contract expects them;
- no essential hover-only action;
- fixed/sticky elements must not contaminate or cover content at initial load or after route navigation.

### Focus, keyboard and feedback states
- visible focus for shell and maintained controls;
- keyboard reachability for existing disclosures/menus/actions;
- consistent use of maintained Alert/Empty/Spinner and current feature-owned states where already appropriate;
- empty/loading/error states must remain truthful and visually attached to the owning surface rather than becoming generic detached cards.

### Reduced motion and transition continuity
- current transitions remain understandable when `prefers-reduced-motion: reduce` is active;
- no essential state depends on animation;
- active lifecycle decoration settles to static meaning under reduced motion;
- no new animation runtime or broad motion redesign.

### Verification and presentation assertions
- stale locators/assertions may be migrated only when the approved current UI changed presentation while the underlying product/security invariant remains the same;
- no assertion may be weakened merely to make a cohesion change pass.

## Known starting audit item
Same-product-tree 390px Create evidence shows a possible fixed-header/content-clearance defect: the Create page title appears visually compromised beneath the UI-074 header in at least one current capture.

This is a **candidate defect, not an assumed implementation diagnosis**. Implementation work must first add/reuse deterministic browser geometry to verify the header bottom and first meaningful Create content top. If the overlap is reproduced, correct the smallest owning boundary and add a regression assertion. Do not change the approved header height solely to solve a feature-content offset.

## Explicitly out of scope
Phase 29 does not authorize:
- a new Landing, Create, Library, Viewer, Activity, Settings or Admin design direction;
- changes to locked `RenderLabBrand` geometry or Landing product truth;
- new routes, navigation destinations, product modes or feature capabilities;
- profile/avatar/username/password-reveal UX or any Account & Settings roadmap workstream #215–#221/#223;
- new Admin actions, metrics, charts, account discovery or operator tooling;
- changes to generation capability, workflow/model routing, Retry/Run Again/Cancel/Upscale semantics or media ownership;
- API, database/schema, RLS, Supabase Auth configuration, provider/worker, Cloudflare R2/storage or deployment configuration changes;
- new third-party UI/motion dependencies or runtime frameworks;
- broad refactoring for code cleanliness alone;
- production deployment.

## Route/surface audit matrix
Phase 29 review must cover the current route families and representative states:

| Surface | Required current evidence |
|---|---|
| Landing `/` | desktop + 390px; reduced-motion/static equivalence where configured; public route without AppShell |
| Create `/create` | desktop + 390px authoring; Image/Video mode; current loading/generating/result evidence already exercised by configured lifecycle; reduced motion |
| Library `/library` | desktop + 390px grid/toolbar; current empty/filter/selection/upload states where configured |
| Viewer `/library/[assetId]` | desktop + 390px image/video or current representative asset; continuation/manage disclosure; comparison when configured |
| Activity `/activity` | desktop + 390px; signed-out/empty or current lifecycle states; reduced motion |
| Settings `/settings` | desktop + 390px signed-out and signed-in trust register; access state; conditional Admin continuation when configured |
| Password `/settings/password` | ordinary and verified-recovery contexts from existing account verifier |
| Admin `/admin` | desktop + 390px + reduced motion; Access/Generation/Health; self-admin disabled state |

The existing configured feature workflows remain the behavioral authority for cloud-backed fixture states. Phase 29 may add a small browser-only cohesion verifier where cross-route geometric assertions do not belong to one feature lifecycle.

## Implementation constraints
- Prefer fixes at the true owning boundary: shell, shared primitive, feature-local layout or verifier. Do not paper over a shell problem separately in every feature.
- Conversely, do not modify a shared primitive or shell if only one feature-local approved composition is wrong.
- Preserve maintained UI primitive semantics and pass `npm run verify:ui-purity` for feature/shell changes.
- Do not introduce a reusable component unless at least two real current usages justify it; if one is introduced, update `docs/ui/COMPONENT_CATALOG.md`.
- Keep route/server ownership, authentication/admission and all product contracts unchanged.
- Keep automatic Git → Vercel deployment disabled.

## Validation gate
The final Phase 29 implementation candidate must:
1. pass Engineering Quality and UI Shell Validation on the exact final implementation head;
2. pass every additional workflow GitHub actually attaches to that exact head;
3. run the Release Candidate Matrix when the changed paths trigger it and require its exact-SHA child matrix to succeed;
4. preserve substantive account/security, ownership, generation, Admin and media assertions in affected configured workflows;
5. provide deterministic cross-product desktop/390px browser evidence for the cohesion claims made by the implementation;
6. include reduced-motion evidence for any changed motion/state path;
7. prove no horizontal overflow on reviewed narrow routes;
8. prove the fixed application header does not cover the first meaningful route content for every application surface reviewed;
9. receive human visual review against the currently approved surface authorities, checking for accidental redesign as well as unresolved inconsistency;
10. merge only from a fully verified exact head, then verify every workflow actually attached to merged `main`.

If a Phase 29 correction materially changes a screen’s established composition rather than repairing cohesion, stop and treat it as a separately approved redesign instead of widening this contract.

## Documentation outputs
On verified implementation closure, update from repository reality:
- `PROJECT.md` — redesign program completed/verified/merged state;
- `docs/ui/UI_MIGRATION.md` — Phase 29 completion evidence;
- `docs/ui/UI_DECISIONS.md` — UI-080 implementation evidence;
- `docs/ui/SCREEN_REGISTRY.md` — whole-product cohesion verification notes and any actual shared-boundary correction;
- `docs/ui/COMPONENT_CATALOG.md` only if reusable component state actually changes.

Issue #235 closes only after implementation, fidelity review, merge, merged-main verification and documentation closure are all complete.

## Deployment boundary
Completing Phase 29 completes the **repository UI/UX redesign program**. It does not make the current repository tree production-live automatically. Production rollout of the accumulated not-yet-deployed redesign remains a separate explicit user-authorized operation with its own readiness and post-rollout verification.