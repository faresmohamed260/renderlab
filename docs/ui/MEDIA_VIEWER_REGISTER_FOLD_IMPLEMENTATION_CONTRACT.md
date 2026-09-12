# Phase 25 — Media Viewer Register + Source Fold Implementation Contract

**Status:** EXECUTION CONTRACT — implementation authorized after merge; deployment not authorized  
**Tracker:** issue #198  
**Design R&D:** issue #196 — completed  
**Planning baseline:** `main` `0305875688550364a04d0bc7af12e048ef955a7c`  
**Decision:** UI-076

## Goal

Implement the user-approved **Media Register + Source Fold v0.2** redesign on `/library/[assetId]` so the Viewer reads as the expanded inspection/continuation state of Gallery Rail media while preserving every mature Viewer product, security, ownership, capability, and lifecycle contract.

This phase changes presentation and local interaction only. It is not a routing, data-model, backend, storage, provider, authorization, admission, or capability phase.

## User value

The current Viewer is functionally mature but visually organized as a large media stage beside a conventional permanent information/action rail. Phase 25 makes the durable asset itself the workspace:

- media remains the immediate center of gravity;
- continuation is visibly attached to the current result;
- Prompt, Details, and Manage stay available without permanently competing with media;
- Compare communicates the Result/Source relationship spatially instead of spawning an unrelated second card;
- narrow/touch users receive the same hierarchy without desktop chrome serialized ahead of the asset;
- the Viewer continues the approved Landing → Create → Gallery Rail family.

## Verified starting state

At planning start:

- `main`: `0305875688550364a04d0bc7af12e048ef955a7c`;
- UI-074: compact horizontal application header; no persistent desktop rail; no fixed mobile dock;
- UI-075: Gallery Rail v0.3 is approved, implemented, verified, and merged;
- `src/features/library/media-viewer.tsx` owns a media/Compare stage beside a roughly 304px permanent Prompt/Details/Continue/Actions rail;
- `src/features/library/media-viewer-comparison.tsx` already owns truthful Result/Source geometry, Result ownership, Source-only `Open source`, native result-video controls, keyboard activation, and reduced motion;
- `src/features/library/media-viewer-actions.tsx` owns Favorite, Collections, Rename, Download, and permanent Delete mutations;
- `src/features/library/media-viewer-upscale-action.tsx` retains server-derived Upscale 2× eligibility/admission truth;
- production remains source `0173c4c5ba08360b6352331118abc81978cfa774` at READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`; automatic Git → Vercel deployment remains disabled.

## Binding design authority

The Phase 25 design gate is closed and user-approved.

- direction: **Media Register + Source Fold v0.2**;
- exact R&D head: `639aef25e57e166be8d8b3d226b3e83930e05a25`;
- design record: `design/rd/media-viewer-register-fold-v02.md` on that R&D head;
- focused browser run: `34703774288` — success;
- artifact: `10300577421`;
- digest: `sha256:06cade2dc2e9ce51dc871971530fa9641a7c1ef0cc0271e19763fcebfa8ca2b0`;
- reviewed states: 1440px default image, Prompt, Details, Manage, Compare, video, reduced-motion Compare; 390px default, Details, Manage, Compare; Source Fold temporal 0/60/180/360ms;
- explicit user approval: 2026-09-12.

The production implementation must be compared against that evidence. Earlier Viewer visuals, Phase 21 spatial-media artifacts, and v0.1 concept alternatives are historical references only where they do not conflict with v0.2.

## In scope

### Registered Viewer composition

Replace the permanent two-column sidebar composition with the approved media object:

- compact Library/Viewer context and truthful title/media facts above the stage;
- one media-dominant registered stage using the established Lab Matrix/grid/technical-microtype family;
- no persistent second application/sidebar inspector;
- attached continuation register immediately below the media stage;
- at 1440×1000, the beginning of the continuation register remains inside the normal first viewport rather than being displaced by decorative empty stage height.

### Capability-derived continuation

Keep continuation truthful while changing hierarchy:

- Edit/Animate continue to come from `continuationActionsForMedia`;
- current-valid `Reuse settings` remains server-derived;
- Upscale 2× remains server-derived and retains existing admission/lifecycle behavior;
- no action is rendered merely to match the prototype when product truth says it is unavailable;
- the first available continuation may receive primary visual weight without hard-coding unsupported capability.

### Singular action ownership

Do not duplicate actions across regions:

- quick actions: **Favorite**, **Download**;
- Manage disclosure: **Collections**, **Rename**, **Delete**;
- continuation register: Edit/Animate/Reuse settings/Upscale only when eligible;
- Source frame: **Open source** only;
- Compare control: **Compare source / Close comparison** only when eligible.

Existing API calls, mutation ownership, loading/error semantics, and destructive confirmation behavior remain unchanged.

### Local disclosures

Prompt, Details, and Manage disclose from the attached register/strip:

- disclosures remain in Viewer document flow;
- media remains visible and primary;
- disclosure state is local presentation state only;
- closing returns to the same stage geometry;
- Rename keeps accessible inline-edit semantics inside Manage;
- Delete keeps maintained AlertDialog confirmation and current permanent-delete behavior;
- Collections keep current owner-scoped behavior.

### Result-primary Source Fold

Desktop:

1. Result begins as one dominant registered media sheet.
2. Compare activation reallocates the same stage.
3. Result remains materially primary in settled geometry.
4. Source reveals from the media relationship with bounded clipping/translation/layout motion.
5. Source exposes only `Open source`.
6. Closing reverses to the exact single-result geometry without lingering Source UI.

Narrow/touch:

- Result remains first and full-width;
- Source follows below Result;
- no side-by-side squeeze;
- no hover/pointer gesture is required for Compare.

Reduced motion:

- skip spatial unfolding transforms;
- immediately present/remove the complete settled Result/Source layout;
- controls and hierarchy remain identical in meaning.

### Media-local pointer depth

The default single Result may use bounded fine-pointer depth matching Gallery Rail:

- media object only;
- no shell/register/control movement;
- ignore touch input;
- disable while Compare is active;
- reset on pointer leave/interruption;
- disable entirely under `prefers-reduced-motion`.

Depth is optional if real-browser evidence shows it harms image/video usability. Source Fold fidelity is higher priority.

### Image/video truth

- preserve source aspect ratio with contain behavior;
- never crop/stretch real media merely to match prototype art;
- result video retains native controls and keyboard/touch playback behavior;
- Source remains image-only under current Compare eligibility;
- Viewer media IDs/URLs continue to come from current product contracts.

## Explicitly out of scope

- new Viewer route, modal-only Viewer, or route interception requirement;
- cross-route shared-element state requiring a global media/router store;
- new durable comparison state;
- new media capability, versions, zoom history, editor, crop, restore, or arbitrary upscale factor;
- Library card/state changes;
- Create continuation URL/product-intent changes;
- schema/database migration;
- API contract change;
- provider/worker/failover change;
- R2/storage change;
- auth/admission/ownership/authorization change;
- generation lifecycle change;
- new animation runtime, GSAP, Lenis, WebGL/canvas/shader layer;
- shell redesign;
- production deployment.

## Architecture and state ownership

Preserve current architecture:

- `/library/[assetId]` server route continues to owner-load and validate durable media and server-derived eligibility;
- `MediaViewer` receives the same asset, collections, recipe, Compare source, and Upscale eligibility inputs;
- browser state may own only local disclosure/Compare/pointer-motion presentation state;
- authorization and capability truth remain server-derived;
- no global state store is introduced;
- opaque asset IDs remain product identity;
- storage/provider identity remains internal.

Feature-local components/CSS may be introduced where useful. Do not create a competing generic UI system. `COMPONENT_CATALOG.md` remains unchanged unless a genuinely reusable cross-feature component is added.

## Component and dependency policy

Use, in order:

1. existing RenderLab Viewer/actions/components;
2. maintained primitives under `src/components/ui`;
3. existing Motion for React for layout/presence/pointer-safe choreography;
4. feature-local composition/CSS.

No dependency addition is expected or authorized. Raw visible native buttons/selects/ordinary inputs/textareas remain prohibited in feature code under UI-026. Native `<video controls>` remains required platform media behavior.

## Data / backend / infrastructure implications

None expected: no migration, environment variable, Supabase/R2 change, worker/provider deployment, API route change, or lifecycle/admission change.

If implementation discovers a genuine need for one, stop the phase and record a new explicit decision instead of silently expanding scope.

## Security / ownership implications

Existing boundaries remain mandatory:

- signed-out Viewer stays protected by current account behavior;
- foreign/deleted/tombstoned media fail closed;
- Compare source remains active + same-owner + durable + server-resolved;
- Source does not inherit Result actions;
- Favorite/Collections/Rename/Download/Delete remain owner-scoped through current APIs;
- continuation/recipe/Upscale eligibility remains server-revalidated;
- no raw storage/provider identifiers appear in presentation.

## Validation matrix

### Static / engineering

At the exact candidate head:

- `npm run build`;
- `npm run verify:ui-purity`;
- TypeScript/lint/static gates required by Engineering Quality and repository workflows.

### Existing product regressions

Run every Viewer/Library/Create/security workflow GitHub actually attaches because of changed files. Expected substantive coverage, where path filters apply, includes:

- Engineering Quality;
- UI Shell Validation;
- Creative Iteration / configured Viewer Compare + continuation;
- Library Lifecycle;
- Media Download Visual;
- Media Rename Visual;
- Library Favorites;
- Library Collections;
- Media Delete Visual;
- Account Ownership;
- Upscale Viewer Visual;
- Integrated Release / Release Candidate Matrix if attached.

Do not weaken product/security assertions to accommodate presentation. Presentation locators may migrate only to accepted UI-076 semantics while preserving the invariant being tested.

### Dedicated Phase 25 visual/fidelity evidence

Real production-implementation browser evidence must cover:

**Desktop 1440×1000**
- default generated image;
- result video with real native controls visible;
- Prompt disclosure;
- Details disclosure;
- Manage disclosure;
- eligible Compare settled state;
- reduced-motion Compare settled state.

**Narrow 390×844**
- default image;
- Details;
- Manage;
- eligible Compare with Result first / Source below;
- no body/document horizontal overflow;
- quick actions keep accessible names and at least 44×44 effective targets where practical.

**Temporal Source Fold**
- 0ms;
- approximately 60ms;
- approximately 180ms;
- settled approximately 360ms;
- closing/reversal checked so Source does not linger after closed state.

**Pointer/touch**
- fine-pointer depth remains bounded/media-local if implemented;
- attached register/control geometry remains stationary;
- touch remains fully usable without pointer depth.

### Fidelity comparison

Human review must compare implementation evidence against accepted artifact `10300577421` for shell continuity, first-viewport hierarchy, title/context density, stage proportions, attached register geometry, singular action ownership, disclosure origin/settled composition, Result-primary Source Fold, Source-only action ownership, timing/transform character, desktop-vs-390px behavior, and reduced-motion equivalence.

A technically green candidate that restores the old 304px sidebar, turns Compare into two unrelated cards, duplicates actions, obscures native video controls, or materially flattens the accepted composition fails Phase 25 fidelity.

## Documentation outputs

After verified implementation update, from verified reality only:

- `PROJECT.md` — Phase 25 closure + production pointer unchanged;
- `docs/ui/UI_MIGRATION.md` — exact-head/merged-main/fidelity evidence + Phase 26 handoff;
- `docs/ui/UI_DECISIONS.md` — UI-076 status/evidence from design-approved to implemented/verified/merged;
- `docs/ui/SCREEN_REGISTRY.md` — Media Viewer composition/status/design authority;
- `docs/ui/UI_SYSTEM.md` only if Phase 25 establishes a genuinely reusable rule beyond current Viewer 3/4/media-continuity guidance;
- `docs/ui/COMPONENT_CATALOG.md` only if a genuinely reusable component/mechanic is added.

## Exit criteria

Phase 25 implementation is complete only when:

1. this contract and UI-076 are merged before production source changes;
2. production Viewer implements the approved Media Register + Source Fold direction;
3. no out-of-scope product/backend/security/data/dependency change is introduced;
4. exact-head required/attached workflows pass;
5. desktop + 390px + video + disclosure + Compare + temporal + reduced-motion implementation evidence is human-reviewed for fidelity;
6. stale presentation verifiers, if any, are corrected without weakening product/security invariants;
7. implementation PR is merged;
8. every workflow GitHub actually attaches to merged `main` is accounted for and successful before closure is claimed;
9. repository documentation reflects verified reality;
10. issue #198 is closed only after those gates are complete;
11. production remains unchanged unless separately authorized.

## Next-phase dependency

Phase 26 Activity remains roadmap-only until Phase 25 closes from verified merged reality. Later planning must use what actually merged, not prototype-only assumptions.
