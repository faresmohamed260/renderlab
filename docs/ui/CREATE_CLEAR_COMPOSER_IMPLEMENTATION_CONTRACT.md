# Create Clear Composer Production Implementation Contract

**Phase:** 23 / Cycle 5
**Planned UI record:** UI-073
**Status:** REOPENED FOR VISUAL FIDELITY CORRECTION / CORRECTION IMPLEMENTATION VERIFIED / MERGE ACCEPTANCE PENDING / NOT DEPLOYED
**Approved by user:** 2026-09-11
**Implementation tracker:** GitHub issue #184
**Parent design R&D:** GitHub issue #148 / `design/rd/create-usability-first-v05.md`
**Design review checkpoint:** draft PR #183 — review-only, never the production implementation merge vehicle
**Implementation branch:** `work/phase-23-create-clear-composer`
**Fidelity-correction branch:** `work/phase-23-create-fidelity-correction` / draft PR #188

## Purpose

Implement the explicitly user-approved **Clear Composer v0.5** direction as the production `/create` experience without reinterpreting it back into the previous compact control-deck composition and without changing RenderLab product semantics merely to match a prototype.

This is the production handoff required after the visual-R&D approval gate. It authorizes implementation work on the Phase 23 branch. It does **not** authorize merge to `main` or production deployment.

## Authoritative accepted evidence

The accepted design direction is defined by the repository-backed v0.5 prototype and its reviewed evidence:

- final reviewed prototype/code head: `6237f59351d2cd7b397881f617a483d62d9bf438`;
- Create Usability-First R&D v0.5 run #12: `34613720083` — PASS;
- artifact: `10269841181`;
- digest: `sha256:3d3eec07dc2ff4924deb2ce6739bca420fba88e816665af34c4289ed45aae1c0`;
- reviewed-candidate documentation head: `58d7ee0e5c182c8b77715ae974d99414a819c8b1`;
- run #13: `34614217898` — PASS;
- approval-record head: `703bc5dbcc8e3b6a9236f08a8a62a87238e59bed`;
- approval-record run #14: `34615707963` — PASS;
- Engineering Quality on the same approval head: `34615711036` — PASS.

The governing design rule is:

> Competitors define familiar interaction grammar. The approved Landing defines RenderLab visual language. Expression belongs primarily to media, result and bounded transition behavior; ordinary authoring controls stay obvious.

## Verified production starting point

Current `main` at contract creation is `dd0fcc725c225f2e15a934ad9fe721cb27b96756`. The R&D branch is ahead only with isolated design/prototype/verifier evidence; production Create source remains unchanged.

The current production Create implementation is centered in:

- `src/features/create/create-workspace.tsx`;
- `src/features/create/create-advanced-panel.tsx`;
- `src/features/create/create-reference-mention-menu.tsx`;
- shared visual treatment in `src/app/globals.css`;
- existing maintained primitives under `src/components/ui`;
- existing generation/media/capability/API contracts under `src/lib`, `src/server`, and `/api` routes.

Current verified behavior already includes Image/Create, Image/Edit, Video/Create and Image/Animate; durable reference upload; stable `@imageN` aliases; at most two Image inputs and one Video input; `Original` source geometry; Image model selection; Video resolution/duration/audio; Advanced controls; account/admission/ownership boundaries; truthful asynchronous jobs; durable results; continuation; Upscale 2×; keyboard/touch/reduced-motion behavior.

Phase 23 is a **visual/compositional implementation**, not a product-capability rewrite.

## Composition changes required by the approved design

### 1. Make intent obvious before prompt authoring

Current production places the Image/Video toggle inside the compact footer control deck. Phase 23 must promote Image/Video intent into an immediately legible choice associated with the composer before the user has to decode compact settings.

Requirements:
- selected Image/Video state is visually obvious on desktop and 390px;
- changing mode preserves current validated product semantics and reference-count guardrails;
- mode motion may use the accepted shared-highlight treatment;
- no essential meaning depends on animation.

### 2. Label reference semantics directly

Current production exposes initial reference upload primarily through a compact icon button and describes an attached single image as `Editing this image` / `Animating this image`.

Phase 23 must make the authoring grammar explicit:
- Image: labelled **Add reference** before/adjacent to prompt authoring;
- attached Image inputs: **Primary image** and **Reference image** roles;
- Video: labelled **Start image** semantics, including add/replace state;
- retain stable aliases, prompt mention menu, Make primary, Replace and Remove behavior;
- preserve two-image Image limit and one-image Video limit;
- preserve durable upload transaction, validation, ownership and signed-out/storage-disabled behavior;
- keep 44px+ essential narrow/touch targets.

Do not create a second upload path or change durable media identity.

### 3. Keep prompt dominant

The prompt remains the largest authoring input. The composer must read in the accepted order:

`Image / Video → reference or Start image when useful → Prompt → essential settings → Generate`.

The existing prompt draft, unresolved `@imageN` validation, mention selection, continuation prefill and signed-out drafting behavior must remain intact.

### 4. Keep essential settings visible and conventional

Preserve existing validated product controls:
- Image model;
- aspect ratio including source-aware `Original`;
- Video resolution / duration / audio;
- Advanced disclosure;
- Generate.

The accepted concept does not authorize a provider/workflow console, hidden model mechanics, new capability fields or a generic node/form UI.

Generate remains high-contrast, obvious and spatially stable across mode/reference changes. It may have bounded press feedback but must not become an orbital, magnetic or unconventional control.

### 5. Advanced stays attached to the composer

`CreateAdvancedPanel` remains the product source for current Advanced semantics. Phase 23 may restyle/recompose its disclosure so it reads as part of the Clear Composer, but it must:
- expand inside/below the composer;
- never cover or replace prompt/Generate;
- preserve current Image vs Video field truth;
- preserve reset/validation semantics;
- preserve keyboard/focus behavior;
- avoid introducing inactive Video tuning that the live worker does not support.

### 6. Replace generic lifecycle alert emphasis with truthful media-stage generation treatment

Current production exposes active lifecycle primarily through the separate `kinetic-lifecycle` alert while keeping the composer above a later result card.

The approved design requires a truthful generating **media region above the persistent composer** when a job is active/result is being resolved.

Requirements:
- composer remains visible and stable;
- visible state says only truthful product-level generation state;
- no percentage, ETA, queue position, provider stage or fabricated progress;
- Landing-derived registration axes/quarter-arc/aperture/cool-warm atmosphere may animate in a bounded way;
- status remains accessible to screen readers;
- existing server-owned job polling/reconciliation semantics remain unchanged;
- reduced motion reaches the same complete geometry without running decorative registration motion.

The existing lifecycle alert may be removed, reduced or absorbed only if equivalent accessible status/error truth remains.

### 7. Result becomes media-first above the composer

Current production renders a bordered result article below the composer with a header/action row above the media. The approved v0.5 composition instead makes result media the dominant workspace above the persistent composer, with contextual result information/actions subordinate to it.

Requirements:
- real durable image/video result remains the source of truth;
- actual video remains an accessible `<video controls playsInline>` experience in production; the R&D poster treatment does not remove real playback;
- Image continuation remains capability-derived and explicit;
- **Animate** must switch to Video and bind the durable result as Start image;
- Edit / Use as reference / Upscale 2× must preserve their current product contracts where capability-backed;
- Video must not invent unsupported continuation actions;
- media may use bounded pointer-only depth on capable desktop input;
- composer and ordinary controls never parallax;
- mobile stacks media → metadata/actions → composer with no transformed hit-testing.

### 8. Apply the approved Landing-derived visual language

Create must belong to the same RenderLab product as the production Landing without cloning a marketing layout.

Use:
- near-black canvas;
- faint 64px Lab Matrix grid where practical;
- restrained grain;
- cool-blue / warm-orange atmosphere;
- canonical quarter-arc / large-arc geometry as a visual registration/media accent;
- compressed editorial context heading;
- small uppercase technical metadata;
- precise 1px rules;
- asymmetric result framing/rail;
- shallow media-only depth;
- locked `RenderLabBrand` unchanged.

Do not return to generic SaaS glass-card nesting, purple-everywhere treatment, abstract stage metaphors, giant empty workspaces, 3D controls or decorative physics.

## Existing product behavior that must not change

Phase 23 must preserve current contracts unless a separately explicit product decision changes them:

- `/create` route and application-shell ownership;
- signed-out prompt/settings drafting;
- verified-account requirement for upload/generation/persistent actions;
- account access/admission limits and sanitized errors;
- durable `media-asset` identity and persistent Create upload transaction;
- PNG/JPEG/WebP ≤25 MB reference validation;
- one source Video / two source Image limits;
- stable aliases and unresolved prompt-reference validation;
- source-aware `Original` geometry and curated fixed ratios;
- FLUX/Qwen product model boundary as currently verified;
- Video resolution/duration/audio contract;
- current Advanced capability truth;
- asynchronous generation job lifecycle and autonomous server reconciliation;
- durable persistence before product success;
- current Retry/Cancel/Activity/Library/Viewer behavior;
- capability-derived continuation and Upscale behavior;
- no fabricated runtime truth;
- no schema, worker/provider, storage, routing, auth or ownership change from this visual phase.

## Implementation architecture

Default implementation should adapt the existing Create composition rather than create a parallel production workspace.

Expected touched areas:
- `src/features/create/create-workspace.tsx` — main composition/state wiring;
- `src/features/create/create-advanced-panel.tsx` — only where accepted attached-disclosure styling/composition requires it;
- `src/features/create/create-reference-mention-menu.tsx` — only if placement changes require integration adjustment; semantics should remain stable;
- `src/app/globals.css` — replace/normalize Create-specific kinetic styling with the accepted Lab Matrix/Clear Composer treatment while avoiding regressions to other surfaces;
- Create-focused browser verifiers/workflows for the new exact visual/state matrix;
- repository UI docs/tracker/catalog/registry from verified implementation reality.

Small Create-owned presentational subcomponents may be extracted if they materially improve maintainability, for example a result/media stage or reference-row composition. Do not create a generic abstraction merely because the redesign exists.

Use the existing Motion for React runtime. No GSAP, Lenis, WebGL/Three.js, second animation runtime or new visual dependency is justified by the accepted v0.5 prototype.

## Accessibility / responsive contract

- Conventional controls remain maintained primitives with correct semantics.
- Visible keyboard focus is required.
- Image/Video remains a true single-choice control.
- No essential action depends on hover.
- Essential narrow/touch targets remain at least 44×44px where practical.
- 390px must have no document-level horizontal overflow.
- Reference roles and destructive/replace actions remain understandable without color alone.
- Pointer depth is enhancement only and disabled for touch/reduced motion.
- `prefers-reduced-motion: reduce` must immediately reach the same complete authoring/generating/result state with no delayed essential action.
- Real video controls remain keyboard/touch usable.

## Functional verification matrix

At minimum, the implementation candidate must prove on the exact head:

1. Engineering Quality / production build / typecheck / lint / unit gates.
2. `npm run verify:ui-purity` where applicable.
3. UI Shell regression.
4. Configured Create Lifecycle Visual with the complete new state matrix.
5. Create Durable Upload regression.
6. Generation Integration and Video Generation Integration when configured/attached.
7. Account Identity / Account Ownership / Generation Admission where shared boundaries are affected or workflows attach.
8. Creative Iteration / Image Upscale regressions where continuation UI changes can affect them.
9. Release Candidate Matrix / Integrated Release when actually attached by repository workflow policy.
10. Every other workflow GitHub actually attaches to the final PR head.

Do not weaken an existing test to accommodate the redesign. Correct the implementation or update stale assertions only when they encode superseded presentation rather than a valid product invariant.

## Required visual / temporal evidence

The Create lifecycle verifier must capture and the human review must inspect at least:

### Desktop
- initial Image authoring;
- one Image reference;
- two Image references and primary-role change;
- Image Advanced;
- Image truthful generating state;
- Image result + continuation actions;
- Animate continuation into Video + Start image;
- Video authoring;
- Video Advanced;
- Video truthful generating state;
- real Video result/playback surface.

### 390px
- initial Image authoring;
- Image reference action targets;
- Video + Start image;
- Advanced;
- Image result/actions;
- Video result/playback;
- no horizontal overflow.

### Reduced motion
- complete Image result;
- at least one Image↔Video/reference/result continuation path;
- no running registration/parallax animation required to understand state.

### Temporal evidence
Record at least one deterministic browser sequence showing:

`Image authoring → reference/Advanced as appropriate → generating → Image result → Animate → Video + Start image → generating → Video result`.

Review motion origin/destination, settled geometry, composer stability, mode continuity, result reveal, pointer-only media depth and interruption safety where relevant.

## Fidelity gate

Functional correctness and visual fidelity are separate gates.

Before Phase 23 can be accepted, compare real production-browser output against the approved v0.5 evidence for:
- information hierarchy and copy semantics;
- control order and visibility;
- reference/Start image roles;
- typography and spacing;
- Lab Matrix grid, atmosphere, rules and quarter-arc registration geometry;
- media/result dominance and asymmetric framing;
- Generate geometry/stability;
- generating/result transition origin and settled state;
- media-only depth and control immobility;
- desktop vs 390px adaptation;
- reduced-motion equivalence.

A green build with a generic restyle is a failure. Conversely, do not move/hide ordinary controls merely to reproduce spectacle not required by the accepted design.

## Verified implementation record

The production candidate has been implemented and human-reviewed without changing the product/backend boundary described above. Evidence already verified on exact head `a44146bf8e51f165b01e348b7c21621207edfc9e` includes:

- Engineering Quality `34622973715` — PASS;
- Create Clear Composer Visual `34622973510` — PASS; artifact `10272409290`, digest `sha256:119887f24e8b9e82c9a143d64ea0ed04432657d6af8d45ae9f65a7d6dd0c53ac`;
- configured Create Lifecycle Visual `34622973690` — PASS; artifact `10273068411`, digest `sha256:939765825c24e4aa976a318e203785356a2e05c90f6a9b0bc4e5ac7178797a87`;
- Account Ownership `34622973515`, Creative Iteration `34622974023` and Activity Cancel Visual `34622973514` — PASS.

Human evidence review confirmed the approved desktop/390px/reduced-motion authoring hierarchy, truthful active/result composition, media-first result framing and the Phase 23 mobile correction that keeps Image result continuation actions above the fixed mobile dock.

Five other workflows on that earlier head were audited rather than waived. Generation Admission stopped on trailing whitespace in this contract; UI Shell, Create Durable Upload, Library Lifecycle and Integrated Release reached their relevant application behavior but still asserted superseded pre-Clear-Composer heading/copy. Commit `6e9cb6409ce9029e903f0330e099bbcb83bcbc1f` removed the whitespace and updated only those stale presentation assertions to UI-073 semantics while retaining URL, output, durable identity, upload, ownership, generation, persistence, reference and continuation invariants. A later Admin matrix failure was likewise verifier-only: the page legitimately contained more than one pending invitation, so `scripts/verify-admin-operations.mjs` now scopes `Revoke` to the exact fixture invitation row it creates rather than using a page-global strict locator.

Final implementation-verification head `e46d9383dc74878713d0ec4f47aaf6383b266c21` preserves the Phase 23 product tree and includes that verifier-only Admin correction. On that exact head, Engineering Quality `34639132519`, Create Clear Composer Visual `34639132478`, configured Create Lifecycle `34639132510`, Account/Admin Operations `34639132466`, Generation Admission `34639132429`, Account Identity `34639132511` after an unchanged transient retry, live Video Generation `34639132462`, Integrated Release `34639132445` and every other directly attached workflow passed. Release Candidate Matrix `34639132431` also passed all 23 exact-SHA child workflows and uploaded manifest artifact `10279433595` (`sha256:f5d7bbbacfef2fc7774ae0737186534a366bc8ca2dda3ad13bf3a42dff7e8142`). Clear Composer Visual artifact `10279122274` has digest `sha256:43ad135150f687989baafa9c3beb17abf264ef2d994128ba8d3ab69789ba1eba`; configured Create Lifecycle artifact `10279462000` has digest `sha256:eaa1d38e4ec260aa3058e5df773a1cb17182df9eac884095d109233b6a4b5d7c`. Final documentation-complete PR head `428cbd025d9f314f5b8d1582fd6911f1abd5094b` passed all 18 attached workflows, including Release Candidate Matrix `34641160654`. PR #185 then squash-merged to `main` as `d360f60afeca0b6c417ff1c12dec3c7e922c20f7`. Exact merged-main Release Candidate Matrix `34645636285` passed all 23 exact-SHA child workflows and uploaded manifest artifact `10281164476` (`sha256:243bb49e61df0a1f491b0a1fd6b1710bc3045c1afb656e000fb7b0094e252890`). Phase 23 is therefore complete, verified and merged. Production deployment remains separately unauthorized and automatic Git → Vercel deployment remains disabled.

## Documentation requirements

Before merge acceptance, update from verified implementation reality:
- `docs/ui/UI_MIGRATION.md`;
- `docs/ui/UI_DECISIONS.md` — record UI-073 only from actual implementation/accepted evidence;
- `docs/ui/UI_SYSTEM.md` if reusable Create visual/motion rules materially change the system;
- `docs/ui/COMPONENT_CATALOG.md` for `CreateWorkspace` and any real extracted reusable component;
- `docs/ui/SCREEN_REGISTRY.md` for the production Create composition/status;
- `docs/architecture/FRONTEND_ARCHITECTURE.md` only if implementation architecture materially changes;
- this contract with exact heads/runs/artifacts and acceptance status;
- issue #184 with implementation closure evidence.

Do not mark production Create `APPROVED` from plans or R&D evidence. That status requires verified implementation and fidelity review.

## Explicitly out of scope

- new creative capabilities;
- new provider/model routing;
- schema/storage changes;
- worker deployment;
- account/admission/auth changes;
- Library/Viewer/Activity/Settings/Admin redesign;
- Landing redesign or locked identity changes;
- a second motion runtime;
- production deployment.

## Merge / deployment boundary

The implementation branch may be developed and validated remotely through GitHub. A production implementation PR may be opened when there is a coherent candidate.

Merge to `main` is a separate guarded operation after final exact-head workflow success, human desktop/390px/reduced-motion/temporal fidelity review and documentation review. Do not infer merge authorization from design approval.

Automatic Git → Vercel deployment remains disabled. Deployment requires a further explicit user authorization after a merged and verified production candidate.

## Exit criteria

Phase 23 is complete only when:
- production `/create` faithfully implements the approved Clear Composer direction;
- existing product/security/data/generation contracts remain intact;
- all required and actually attached exact-head workflows pass;
- desktop, 390px and reduced-motion evidence passes functional and fidelity review;
- temporal evidence passes the kinetic gate;
- no material visual drift from the accepted v0.5 direction remains;
- repository documentation matches the verified implementation;
- the final production implementation candidate is explicitly accepted for merge.

Deployment is not part of this phase exit unless separately authorized.

## Fidelity correction reopening — 2026-09-12

Direct user comparison against the approved v0.5 artifact reopened this contract after the first merged Phase 23 implementation proved functionally correct but materially drifted from the accepted visual composition. The approved evidence did not change: prototype/code head `6237f59351d2cd7b397881f617a483d62d9bf438`, run `34613720083`, artifact `10269841181`, digest `sha256:3d3eec07dc2ff4924deb2ce6739bca420fba88e816665af34c4289ed45aae1c0` remain the binding visual authority.

Issue #184 is reopened and PR #188 / `work/phase-23-create-fidelity-correction` is the correction vehicle. Library R&D #187 remains paused until Create fidelity closes.

The accepted correction restores the approved compact horizontal application header instead of the merged desktop rail/mobile dock geometry; the 900px Create authoring column and 1120px result composition; Image/Video selection above the composer; visible `PROMPT` labelling; reference-before-prompt order; a flat essential-settings footer with visible setting label/value grammar; a conventional high-contrast stable Generate action; Advanced attached flush to the composer; the truthful registration-framed generating stage; and the detailed asymmetric media-first result rail. Existing generation, upload, account/admission, ownership, durable-media, native-video, capability and continuation contracts remain unchanged. No schema, provider/worker, R2/storage, route hierarchy or deployment change is part of the correction.

User-approved exact implementation head `c786a17fa3a3c7f76dba5a64cb7822926749c1a2` passed every workflow GitHub attached directly to that head (16/16): Engineering Quality `34680601598`, Create Clear Composer Visual `34680601776`, Brand / Launch Visual `34680601653`, Account Ownership `34680601582`, Create Durable Upload `34680601647`, UI Shell `34680601708`, Account Identity `34680601778`, Activity Cancel `34680601718`, Library Lifecycle `34680601719`, Activity Visual `34680601683`, Account/Admin Operations `34680601575`, Create Lifecycle `34680601698`, Creative Iteration `34680601697`, Generation Admission `34680601611`, Integrated Release `34680601834`, and Video Generation Integration `34680601661`.

Accepted browser evidence:
- Create Clear Composer Visual artifact `10293387664` — `sha256:e4937a16a2fed2bc160634c73c60322b0748ff3eb5d166b44cbc33f894a92915`;
- configured Create Lifecycle artifact `10293653778` — `sha256:ba13fc48dcf4d823575b041455d902e48040d2cd554892c0b5b508ee80e88624`.

The prior lifecycle red was verifier-only: real generation submission, provider reconciliation and durable persistence completed successfully, then the verifier waited on a superseded large heading. The corrected verifier asserts the actual continuation invariants after Edit: Image mode, `Primary image`, and a loaded durable `Reference preview`. No product behavior or security/ownership assertion was weakened to manufacture a green result.

Direct user review of the real desktop generating/result and mobile result renders approved the corrected appearance on 2026-09-12. Merge of PR #188 is explicitly authorized once the documentation-final exact head passes the repository's normal attached acceptance set. Production deployment is not authorized; automatic Git → Vercel deployment remains disabled. The broader UI migration continues after Create correction closure, with Library work restarting from this approved Create/Landing system rather than the rejected prior Library concept.
