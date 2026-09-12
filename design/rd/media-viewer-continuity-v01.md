# Media Viewer Continuity v0.1 — Phase 25 R&D

**Status:** EXPERIMENTAL / DESIGN STUDY — NOT APPROVED  
**Tracker:** issue #196  
**Branch:** `rd/media-viewer-continuity-v01`  
**Authoritative starting main:** `0305875688550364a04d0bc7af12e048ef955a7c`  
**Production boundary:** R&D only. This does not authorize production `/library/[assetId]` changes, new product capability, merge of prototype code to `main`, dependency adoption or deployment.

## Why this slice exists

The full-product redesign is still active after Landing, Create and Library. The next surface is Media Viewer because it is the direct continuation of the Gallery Rail: a Library media object becomes the focused object of inspection, comparison and continuation.

Current Viewer behavior is mature, but its visual composition predates the accepted Lab Matrix / Clear Composer / Gallery Rail family. The present desktop structure is still a large media stage beside a conventional bordered ~304px information/action sidebar. Compare Source is truthful and usable, but visually expressed as separate rounded panes with relatively generic layout/fade motion.

Phase 25 does **not** redesign those product actions. It redesigns the hierarchy and spatial continuity around them.

## Coherence inheritance — non-negotiable

The Viewer must look like the next state of the same RenderLab system, not a new theme.

Carry forward:

- the locked Lab Grid identity;
- the compact horizontal UI-074 application header;
- Lab Matrix registration/grid cues used by Landing, Create and Library;
- restrained quarter-arc / registration geometry only where it communicates framing or continuity;
- the established cool/warm atmospheric balance;
- editorial hierarchy plus precise technical microtype;
- media/task-first composition;
- obvious stationary ordinary controls;
- expression concentrated around media, spatial continuity and meaningful state transformation;
- Motion-for-React style timing and bounded depth rather than decorative perpetual motion;
- complete touch/static and `prefers-reduced-motion` equivalents.

Do not introduce:

- a competing neon/glass theme;
- a generic SaaS property inspector;
- a permanent second application sidebar;
- floating tool chrome that competes with the asset;
- hover-only essential actions;
- fabricated zoom/history/version state or unsupported generation metadata.

## Current implementation audit

### `media-viewer.tsx`

Current desktop composition:

- `Back to Library` as an independent ghost button;
- a two-column stage/rail layout (`minmax(0, 1fr)` + roughly 304px);
- large image/video/compare stage at left;
- conventional bordered side rail at right containing:
  - source/kind microcopy;
  - title/date;
  - Prompt;
  - Details;
  - Continue;
  - Actions.

The media is appropriately large, but the information rail reads as a separate dashboard panel rather than an attached state of the media object or Library system.

### `media-viewer-comparison.tsx`

Current behavior is correct and remains locked:

- Result stays primary;
- Source appears only when an eligible active same-owner durable source exists;
- Source exposes only `Open source` into its normal Viewer;
- image geometry uses contain behavior;
- video keeps native controls;
- reduced motion removes animation duration.

The visual opportunity is to make Source emerge from the same inspection frame rather than feeling like a second generic card appearing beside Result.

### Viewer actions

Current semantics are mature and must remain intact:

- Favorite;
- Collections;
- Rename;
- Download;
- permanent Delete with AlertDialog;
- capability-derived Edit / Animate continuation;
- current-valid `Reuse settings`;
- eligible Upscale 2× with real admission/lifecycle semantics.

Phase 25 changes their hierarchy/presentation only after a design is approved; it does not invent replacement product actions.

## Locked product / engineering contracts

Preserve:

- `/library/[assetId]` as the contextual deep-linked Viewer route under the approved application shell;
- one opaque owner-scoped durable `media_asset` identity;
- current owner/tombstone failure behavior;
- truthful source/result media geometry;
- real native video controls;
- truthful prompt and details;
- Favorite / Collections / Rename / Download / Delete semantics;
- capability-derived continuation through current Create intent URLs;
- server-revalidated `Reuse settings` eligibility;
- server-revalidated Compare Source eligibility;
- Result-primary / Source-contextual compare semantics;
- Upscale eligibility, admission and lifecycle semantics;
- maintained primitive purity;
- current API/data/auth/storage/routing ownership;
- keyboard/focus/touch accessibility and reduced motion.

No R&D concept may require a schema, provider/worker, R2, auth, admission, ownership, capability or routing change just to make the composition work.

## Reference matrix — interaction grammar only

These references are used for interaction principles, not visual cloning.

| Reference | Useful grammar | Do not copy |
|---|---|---|
| Midjourney web Create / Organize / Editor (`docs.midjourney.com`) | Clicking a creation moves naturally into focused creation actions; the selected asset remains the creative object rather than becoming a generic record-detail page. | Midjourney navigation, taxonomy, visual skin, action names or model-centric product structure. |
| Runway Assets / Sessions / Gen-4 (`help.runwayml.com`) | Output remains center of gravity; actions such as continue/use/upscale/download are contextual to that output and do not need equal visual weight. | Runway panes, product taxonomy, provider/tool naming or exact button placement. |
| Krea 2026 redesign + Image Editor (`krea.ai`) | Remove interface that gets in the way; preserve continuity as users move from generation to inspection/refinement; comparison/refinement remains visually tied to the image. | Krea shell, branding, model browser or exact editor layout. |
| Adobe Lightroom Web Detail View (`helpx.adobe.com/lightroom/web`) | Single-asset detail view can keep the media dominant while contextual tools/metadata remain available; comparison/versions is a deliberate inspection state rather than the default page structure. | Photography-specific tool strips, editing controls, terminology or persistent inspector density. |

### Derived Viewer principles

1. The asset is the workspace, not a record shown beside a settings panel.
2. Continuation actions should feel attached to the asset/result state.
3. Prompt/details are discoverable context, not equal-weight permanent chrome.
4. Compare is a mode of inspection that reshapes the media stage.
5. Returning to Library should feel spatially related to the media index, even without a literal shared-element router transition in production.
6. Mobile should preserve the same media-first hierarchy instead of stacking every desktop panel before the media.

## Three same-family composition concepts

All three use the same RenderLab tokens and visual language. They differ in **information topology and spatial behavior**, not theme.

### Concept A — Media Register

**Thesis:** The Gallery Rail card expands into a registered inspection object. Media dominates the workspace; title/context and actions occupy an attached registration band rather than a boxed sidebar.

Desktop:

- compact `LIBRARY / VIEWER` return/context line above the stage;
- large centered media field with subtle Lab Matrix registration marks;
- an attached bottom register directly beneath the media containing title, asset facts and primary continuation actions;
- Prompt / Details / Organize reveal as bounded panels from the same register rather than living persistently beside the media;
- destructive Delete remains secondary and visually separated.

390px:

- media appears immediately after compact context;
- title + primary continue actions below media;
- Prompt/Details/Manage are disclosures below, not a desktop sidebar serialized above media.

Compare:

- Result remains in place;
- Source is introduced as an attached secondary registered frame beside/below Result;
- stage width reallocates smoothly without moving the external application shell.

**Strength:** strongest direct inheritance from Gallery Rail.  
**Risk:** attached register can become too toolbar-like if action density is not controlled.

### Concept B — Inspection Spine

**Thesis:** The media occupies a broad cinematic field while a very narrow technical spine at the media edge carries context and mode controls. Detailed content expands from that spine only when requested.

Desktop:

- media fills most horizontal workspace;
- a 56–72px edge spine is registered to the media frame, not the app viewport;
- spine contains compact labelled triggers for Prompt, Details, Continue and Manage;
- opening a section grows a temporary attached panel from the spine, while media contracts only as much as necessary;
- continuation actions can remain visible in a compact lower strip.

390px:

- vertical spine becomes a horizontal mode strip beneath the media;
- disclosures open in document flow below the strip;
- no fixed bottom tool dock.

Compare:

- Compare transforms the spine from single-media tools to Result/Source inspection context;
- Source occupies a clear secondary frame with no competing action set.

**Strength:** cinematic and compact; minimizes permanent chrome.  
**Risk:** mode triggers must remain self-explanatory and not become icon-only mystery controls.

### Concept C — Source Fold

**Thesis:** Result is a single registered media sheet. Compare Source does not spawn a separate generic card; the Source appears by spatially unfolding/revealing a secondary sheet from the Result frame. This concept concentrates expression in the media relationship.

Desktop:

- Result fills the central stage;
- title/context and primary actions live in a compact lower register;
- Prompt/Details are quiet disclosures in the register;
- Compare Source triggers a bounded horizontal reveal: Result shifts/scales slightly while Source emerges from the same registration boundary;
- `Open source` belongs only to the Source sheet.

390px:

- Compare unfolds vertically beneath Result with clear Result/Source registration labels;
- both remain truthful aspect-ratio frames;
- no side-by-side squeeze at narrow width.

Reduced motion:

- Source appears immediately in the settled two-object layout; no unfolding transform.

**Strength:** strongest signature comparison language and clearest 3/4-expressiveness opportunity.  
**Risk:** easiest concept to over-choreograph; must remain fast, reversible, reduced-motion complete and subordinate to content.

## Early recommendation

Take **Media Register** as the usability/hierarchy base and test **Source Fold** as its signature Compare behavior. Inspection Spine remains a serious alternate to pressure-test action density and detail disclosure.

This mirrors the successful Library process: choose the most legible base, then concentrate distinctive motion in the interaction that genuinely benefits from it.

## Interaction choreography hypotheses

### Library → Viewer continuity

Production may remain a route navigation, but the Viewer should visually preserve the Library object's language:

- same media-first framing grammar;
- same technical metadata cadence;
- same registration marks / cool-warm atmosphere;
- Viewer settles as an expanded inspection object, not a brand-new dashboard.

A prototype may demonstrate a card-to-stage transform to evaluate continuity, but production adoption depends on whether the route architecture can support it without client-owned media/router state. The visual design must still work with an ordinary route transition.

### Prompt / Details

Origin: attached register/spine.  
Transformation: local bounded expansion from its trigger.  
Settled: media remains visible and dominant.  
Dismissal: returns to the exact prior stage geometry.  
Reduced motion: immediate show/hide with no transform.

### Compare Source

Origin: Result media frame / registration boundary.  
Transformation: Result reallocates stage; Source reveals from the media relationship rather than from page edge.  
Settled: Result primary, Source secondary, each clearly labelled.  
Reverse: Source collapses back into the Result boundary.  
Reduced motion: instant settled layout swap.  
Touch: explicit Compare control; no hover gesture dependency.

### Viewer → Create continuation

Continuation actions remain conventional links/buttons. The visual language should make them feel like the next creative step from the current asset, but must not pretend the Viewer and Create are one client-owned workspace.

## Prototype requirements

The isolated prototype must demonstrate:

- desktop 1440px and 390px layouts;
- image and video inspection states;
- all three concept topologies at least at representative fidelity;
- selected direction carried further through default, details and compare states;
- visible keyboard focus;
- effective 44px touch targets for ordinary actions where practical;
- no body horizontal overflow;
- real aspect-ratio-safe media framing;
- native-looking video control region represented truthfully rather than inventing playback state;
- Compare transition temporal frames;
- touch/static settled Compare state;
- `prefers-reduced-motion` removes meaningful transforms and still communicates Result/Source hierarchy.

## Acceptance gate

Automation only makes a concept reviewable. Phase 25 R&D is not approved until the user explicitly approves the complete visual/interaction direction.

Before approval:

- [x] Current source/product contracts audited.
- [x] Remaining redesign roadmap restored on `main` through PR #197.
- [x] Phase 25 R&D tracker opened as #196.
- [x] Current interaction-reference matrix recorded.
- [x] Three same-family composition hypotheses defined.
- [ ] Complete desktop + 390px concept prototype created.
- [ ] Image/video/default/details/compare states represented.
- [ ] Signature comparison choreography prototyped with temporal evidence.
- [ ] Keyboard/touch/no-overflow/reduced-motion evidence captured.
- [ ] Human visual critique completed.
- [ ] User explicitly approves one direction.

Only after those gates close may an implementation decision / UI-076-style contract be proposed and merged before production Viewer code changes.