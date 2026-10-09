# Phase 26 — Activity Job Matrix + History Register Implementation Contract

**Status:** EXECUTION CONTRACT — implementation authorized after merge; deployment not authorized  
**Tracker:** issue #203  
**Design R&D:** issue #202 — completed  
**Planning baseline:** `main` `639e84b5198a7b566eb18b3d34cf52b327249fc4`  
**Decision:** UI-077

## Goal

Implement the user-approved **Job Matrix + History Register v0.2** redesign on `/activity` so Activity becomes the quieter lifecycle/history member of the same RenderLab family established by Landing, Clear Composer, Gallery Rail and Media Register, while preserving every existing Activity product, ownership, lifecycle and recovery contract.

This phase changes presentation and local interaction only. It is not a routing, generation, data-model, provider, storage, authorization, admission or infrastructure phase.

## User value

The current Activity surface is functionally mature but visually reads as a stack of independent lifecycle cards/status pills. Phase 26 makes the same real job history easier to scan while extending the approved RenderLab system:

- the newest work has a clear visual center without changing newest-first truth;
- active lifecycle state remains explicit and restrained rather than becoming fake progress;
- older history continues in one attached register rather than another dashboard/table;
- Retry, Run Again and Cancel remain obvious and semantically distinct;
- failures stay local and recoverable without exposing implementation infrastructure;
- narrow/touch users get the same chronology and action hierarchy;
- terminal history visibly settles and then becomes still.

## Verified starting state

At planning start:

- `main`: `639e84b5198a7b566eb18b3d34cf52b327249fc4`;
- UI-074: compact horizontal application header; no persistent desktop rail; no fixed mobile dock;
- UI-075: Gallery Rail is approved, implemented and merged;
- UI-076: Media Register + Source Fold is approved, implemented and merged;
- `src/app/(app)/activity/page.tsx` server-loads the current account-private Activity snapshot and pagination state;
- `src/features/activity/activity-view.tsx` renders newest-first jobs with all eight real lifecycle states plus empty/unavailable/account states, pagination, real result links and server-derived action eligibility;
- `src/features/activity/activity-auto-refresh.tsx` observes only while nonterminal work exists;
- `src/features/activity/activity-retry-button.tsx`, `activity-run-again-button.tsx`, and `activity-cancel-button.tsx` own the current distinct mutation semantics;
- cancellation uses the maintained AlertDialog mechanic and server cancel API, then refreshes server-owned state;
- failed guidance is sanitized product-level copy;
- successful Activity records whose durable output was deleted are omitted by the current server contract;
- production remains source `0173c4c5ba08360b6352331118abc81978cfa774` at READY deployment `dpl_3Smw21pn4PPQ1DzN7aaWmTuuf991`; automatic Git → Vercel deployment remains disabled.

## Binding design authority

The Phase 26 design gate is closed and user-approved.

- direction: **Job Matrix + History Register v0.2**;
- R&D issue: #202 — completed;
- exact reviewed visual head: `13bbfc32e5dabb5944943c1a704058aed6a1befc`;
- design record: `design/rd/activity-system-continuity-v02.md` on that exact R&D head;
- focused browser run: `34722631963` — success;
- artifact: `10307305396`;
- digest: `sha256:5c440d5c1768fa6ea19a67165263c20d701ee9f2b50487e3a87246e7de8a9058`;
- reviewed states include desktop and 390px default, cancellation confirmation and lifecycle transitions, loading, empty, settled terminal history, keyboard focus, touch targets and reduced motion;
- explicit user approval: 2026-09-13.

The production implementation must be compared against that evidence. Activity Lifecycle Register v0.1 and the pre-Phase-26 rounded-card Activity presentation are historical references only where they do not conflict with the accepted v0.2 direction.

## In scope

### Registered Activity composition

Replace the independent rounded-card feed with one registered Activity work object:

- keep the compact UI-074 application header unchanged;
- use the established near-black field, 64px Lab Matrix registration, restrained cool/warm atmosphere, editorial heading hierarchy and technical microtype;
- keep route context concise above the Activity object;
- use one bounded 16–18px stage with precise 1px rules rather than many isolated dashboard cards;
- preserve the approved large quarter-arc as registration/background accent only, never as an ambiguous control.

### Job Matrix — newest three visible jobs

For any page containing at least three visible jobs:

- visible job index `01` is the newest job and receives the dominant left matrix cell;
- visible indices `02` and `03` remain next-newest and stack as smaller related cells;
- index labels are presentation-only chronology, never provider/job identity or execution rank;
- cell size does not encode progress, priority, queue position, expected completion or status;
- each job retains explicit status text, summary, truthful operation/media context, created time and only currently eligible actions;
- active visual energy is subordinate to status text.

For fewer than three visible jobs, preserve newest-first order and the same registered geometry without fabricating placeholder jobs. The implementation may collapse unused cells cleanly rather than rendering fake history.

### Attached History Register

Remaining visible jobs continue directly beneath the matrix:

- the first attached row continues the visible chronology at `04` when three matrix jobs exist;
- rows stay newest-first and are not grouped/reordered by lifecycle state;
- each row carries compact time/state/summary/action information;
- rows are part of the same Activity object, not a second table/dashboard surface;
- existing page-size/pagination truth remains unchanged.

### Lifecycle truth and motion

Support exactly the current real statuses:

- `queued`;
- `preparing`;
- `running`;
- `cancelling`;
- `persisting` (user-facing copy may remain `Saving result` where the current product contract uses it);
- `succeeded` / current user-facing completed wording;
- `failed`;
- `cancelled`.

Motion rules:

- nonterminal state may use a small bounded marker pulse/energy treatment;
- the page-level live indicator appears only while current server truth reports nonterminal work;
- no bar fill, percentage, queue position, countdown, elapsed-progress metaphor, ETA, SLA, provider phase or fabricated hidden stage;
- a real transition into a terminal state may receive one short local settle/wash and then must become still;
- terminal-only history has no ambient lifecycle animation;
- controls remain stationary.

Implementation may use existing Motion for React and CSS only; no new animation runtime is expected or authorized.

### Action ownership and recovery semantics

Keep current server-derived action truth exactly:

- active eligible job: **Cancel**;
- eligible success: **View result** and **Run Again**;
- eligible failed job: **Retry**;
- cancelled/ineligible states: no fabricated action;
- Retry, Run Again and Cancel remain distinct operations that may create/affect different job records under existing server contracts;
- mutation errors remain local and actionable.

Do not duplicate one job action into multiple visual regions merely to fill the matrix/register composition.

### Cancellation confirmation

The approved R&D shows cancellation confirmation spatially attached to the current job. Production must preserve the existing cancellation semantics and maintained-dialog accessibility contract.

Preferred implementation:

- keep `AlertDialog` as the accessible confirmation mechanic;
- style/composition should visually read as belonging to the selected/current job and match the accepted local Activity treatment as closely as the primitive permits;
- do not replace it with an ad-hoc raw-button confirmation surface or client-only cancellation state;
- after accepted cancellation, refresh/reconcile from server truth; the UI may transiently show submitting copy only inside the maintained action, but authoritative `cancelling` / `cancelled` lifecycle comes from server-owned state.

If exact local-inline placement would require weakening AlertDialog semantics, keep the accessible primitive and prioritize the accepted hierarchy/palette/spacing rather than recreating modal mechanics from scratch.

### Failed state

- sanitized server-provided product error remains local to the failed job;
- Retry remains adjacent and distinct;
- no raw provider/worker/storage error detail appears;
- failure styling uses restrained warm/danger registration treatment rather than a disconnected generic alert card where practical.

### Loading / unavailable / signed-out / empty

Preserve every real state while applying the same family:

- loading keeps the Activity stage footprint with structural skeleton/registration only; never fake job labels/progress;
- empty state remains inside the registered Activity stage and points to the truthful Create route;
- signed-out account state remains private-account guidance with Settings/sign-in path as currently supported;
- temporary Activity-unavailable state remains truthful and non-destructive;
- pagination-empty cases keep their current Newer/Older recovery semantics;
- no state becomes a marketing hero or independent SaaS card stack.

### Pagination

- preserve current server-owned `offset`/`limit`/`hasMore` behavior;
- retain Newer/Older navigation semantics and URLs;
- pagination controls remain conventional, keyboard accessible and touch-safe;
- visible chronology numbering restarts for the currently displayed page and is presentation-only; it does not claim a global job ordinal.

### Responsive behavior

Desktop 1440×1000:

- 1440px shell/workspace cadence and approximately 48px outer rhythm follow the accepted Library/Viewer family;
- newest job is visually dominant without turning Activity into a hero screen;
- matrix + attached register read as one object;
- actions stay obvious and stationary.

390×844:

- UI-074 compact header remains;
- matrix jobs stack vertically in chronological order `01 → 02 → 03`;
- attached register follows in document flow;
- register rows fold into state/time, summary and action bands without horizontal overflow;
- essential actions remain at least 44px effective height where practical;
- no hover dependency.

### Reduced motion

`prefers-reduced-motion` must:

- disable active marker pulse;
- collapse terminal-settle transition duration;
- preserve complete status/action/ordering geometry immediately;
- preserve all keyboard/touch semantics.

## Explicitly out of scope

- Activity route or navigation changes;
- Admin/operations-console features;
- grouping/filtering/search/sort additions;
- new job detail route or modal;
- queue rank, percentage, ETA, SLA or fabricated runtime stages;
- provider/worker/failover/workflow/storage/R2 identity;
- generation lifecycle semantics, retry/run-again/cancel API changes or random-seed changes;
- page-size/pagination contract change;
- ownership/auth/admission/security change;
- schema/database migration;
- Cloudflare R2/Supabase/provider infrastructure change;
- new global state store;
- shell redesign;
- new runtime dependency/GSAP/Lenis/WebGL/canvas/shaders;
- production deployment.

## Architecture and state ownership

Preserve current architecture:

- server route remains the owner of account availability, Activity snapshot, pagination and action eligibility;
- `PublicGenerationActivity` remains the public presentation contract;
- browser state may own only local disclosure/confirmation/submitting/presentation motion state;
- `ActivityAutoRefresh` remains observational and runs only while current server truth says nonterminal work exists;
- retry/run-again/cancel mutations continue through existing product APIs and refresh server state;
- result links continue to use owner-scoped opaque durable media identity;
- provider/worker/storage identities remain internal.

Feature-local composition/CSS/components may be introduced where useful. Do not create a competing generic Activity primitive system. `COMPONENT_CATALOG.md` changes only if a genuinely reusable cross-feature component is added.

## Component and dependency policy

Use, in order:

1. existing Activity components and product contracts;
2. existing RenderLab primitives under `src/components/ui`;
3. existing Motion for React for bounded lifecycle/presence/layout continuity;
4. feature-local composition/CSS.

No dependency addition is expected or authorized. Raw visible native buttons/selects/ordinary inputs/textareas remain prohibited in feature code under UI-026.

## Data / backend / infrastructure implications

None expected: no migration, environment variable, Supabase/R2 change, worker/provider deployment, API route change, lifecycle or admission change.

If implementation discovers a genuine need for one, stop the phase and record a new explicit decision instead of silently expanding scope.

## Security / ownership implications

Existing boundaries remain mandatory:

- signed-out Activity remains protected/private;
- job query remains owner-scoped and newest-first;
- result links remain owner-scoped durable media links;
- deleted-output successful jobs continue to follow current omission behavior;
- retry/run-again/cancel eligibility remains server-derived/revalidated;
- errors stay sanitized;
- no raw storage/provider/worker identifiers appear in presentation.

## Expected implementation files

Likely production changes are bounded to:

- `src/features/activity/activity-view.tsx`;
- `src/features/activity/activity-cancel-button.tsx` only if needed for accepted visual integration without semantic change;
- `src/features/activity/activity-retry-button.tsx` / `activity-run-again-button.tsx` only for presentation/placement consistency if needed;
- Activity-specific styles in `src/app/globals.css` or feature-local styling consistent with the current repository convention;
- `scripts/verify-activity.mjs` and/or dedicated Activity visual verifier only where presentation locators/evidence must migrate;
- `.github/workflows/activity-visual.yml` only if the existing workflow needs bounded evidence additions;
- closure documentation after verified reality.

Do not touch generation APIs/contracts or unrelated feature/shell source merely for visual convenience.

## Validation matrix

### Static / engineering

At the exact candidate head:

- `npm run build`;
- `npm run verify:ui-purity`;
- TypeScript/lint/static gates required by Engineering Quality and repository workflows.

### Existing product regressions

Run every workflow GitHub actually attaches because of changed files. Expected substantive coverage, where path filters apply, includes:

- Engineering Quality;
- UI Shell Validation;
- Activity Visual;
- Activity Cancel Visual;
- Creative Iteration / Retry + Run Again behavior where currently covered;
- Account Ownership / account-private Activity behavior;
- Integrated Release / Release Candidate Matrix if attached.

Do not weaken product/security assertions to accommodate presentation. Presentation locators may migrate only to accepted UI-077 semantics while preserving the invariant being tested.

### Dedicated Phase 26 visual/fidelity evidence

Real production-implementation browser evidence must cover:

**Desktop 1440×1000**
- default page containing active, success and failure examples where fixtures permit;
- all eight lifecycle statuses across deterministic fixture/state coverage;
- loading;
- empty;
- terminal-only history with no live treatment;
- failed local guidance + Retry;
- success View result + Run Again;
- active Cancel;
- cancel confirmation;
- pagination when applicable.

**Narrow 390×844**
- default matrix-to-stack composition;
- active/success/failure actions;
- empty;
- terminal-only history;
- no body/document horizontal overflow;
- essential action targets >=44px where practical.

**Temporal lifecycle evidence**
- cancellation request path through confirmation/submitting and server-truth `cancelling`/`cancelled` where deterministic fixture support permits;
- nonterminal → terminal settle captured at start/intermediate/settled frames;
- no perpetual terminal animation.

**Keyboard/touch/reduced motion**
- Cancel/Retry/Run Again/View result remain keyboard reachable with visible focus;
- cancellation confirmation remains accessible;
- touch requires no hover state;
- reduced motion reaches the same complete settled state immediately.

### Fidelity comparison

Human review must compare implementation evidence against accepted artifact `10307305396` for:

- exact UI-074 shell continuity;
- near-black 64px Lab Matrix field and restrained cool/warm atmosphere;
- heading/microtype density;
- one bounded Activity object rather than separate cards;
- asymmetric `01 / 02 / 03` newest-job matrix;
- attached register continuation;
- quarter-arc registration treatment;
- explicit lifecycle text and restrained active energy;
- stationary action hierarchy;
- desktop vs 390px chronology and spacing;
- cancellation/failure integration;
- terminal settling and reduced-motion equivalence.

A technically green candidate that returns to isolated rounded cards/status-pill-led hierarchy, becomes an Admin table, fabricates progress, or materially flattens the accepted composition fails Phase 26 fidelity.

## Documentation outputs

After verified implementation update, from verified reality only:

- `PROJECT.md` — Phase 26 closure + Phase 27 handoff + production pointer unchanged;
- `docs/ui/UI_MIGRATION.md` — exact-head/merged-main/fidelity evidence + Phase 27 handoff;
- `docs/ui/UI_DECISIONS.md` — UI-077 status/evidence from design-approved to implemented/verified/merged;
- `docs/ui/SCREEN_REGISTRY.md` — Activity composition/status/design authority;
- `docs/ui/UI_SYSTEM.md` only if Phase 26 establishes a genuinely reusable system rule beyond the already accepted Activity 2/4 guidance;
- `docs/ui/COMPONENT_CATALOG.md` only if a genuinely reusable cross-feature component/mechanic is added.

## Exit criteria

Phase 26 implementation is complete only when:

1. this contract and UI-077 are merged before production Activity source changes;
2. production Activity implements the approved Job Matrix + History Register direction;
3. no out-of-scope product/backend/security/data/dependency change is introduced;
4. exact-head required/attached workflows pass;
5. desktop + 390px + loading/empty/lifecycle/action/cancellation/temporal/reduced-motion implementation evidence is human-reviewed for fidelity;
6. stale presentation verifiers, if any, are corrected without weakening product/security invariants;
7. implementation PR is merged;
8. every workflow GitHub actually attaches to merged `main` is accounted for and successful before closure is claimed;
9. repository documentation reflects verified reality;
10. issue #203 is closed only after those gates are complete;
11. production remains unchanged unless separately authorized.

## Next-phase dependency

Phase 27 Settings/account-security redesign remains roadmap-only until Phase 26 closes from verified merged reality. Later planning must use what actually merged, not prototype-only assumptions.
