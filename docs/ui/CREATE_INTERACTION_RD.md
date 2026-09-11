# Create Interaction R&D — Instrument Continuum v0.2

**Status:** `APPROVAL CANDIDATE / USER REVIEW REQUIRED`  
**Issue:** #148  
**R&D baseline:** production application source `0173c4c5ba08360b6352331118abc81978cfa774`; repository planning baseline `dd0fcc725c225f2e15a934ad9fe721cb27b96756`  
**Scope:** visual/interaction research only; no production `/create` source change, route change, product capability change, backend/schema/infrastructure change, production dependency adoption, or deployment

## Purpose
Issue #148 reopens the visual composition and temporal interaction language of **Create** without reopening its product contracts. The goal is to establish a user-approved direction for a future Create redesign before any Phase 23 / Cycle 5 implementation contract exists.

The working direction is **Instrument Continuum**: Create should feel like one adaptive creative instrument whose geometry persists across authoring, reference editing, precision controls, generation, and result inspection. The current Cycle 4 implementation already has strong Kinetic Precision styling and useful local motion; this exploration focuses on the remaining structural discontinuity between those states rather than adding decoration.

## Current rendered audit
The current production Create composition was re-audited from repository source plus exact browser evidence.

### Evidence
- Runtime source audited: `0173c4c5ba08360b6352331118abc81978cfa774`.
- Current implementation: `src/features/create/create-workspace.tsx` and `src/features/create/create-advanced-panel.tsx`.
- Configured Create Lifecycle run: `34539860481` on exact implementation tree `a7f94b77bf1be989c0101376aa0404cbb28b34ae`.
- Screenshot artifact: `10176907429`, digest `sha256:5a33377e0c73238e800abcbe0b560c9bd6ac9d9dfabd43ebd6a065237491b7f9`.
- Reviewed desktop states include active generation, Edit continuation, Qwen model selection, multi-reference attach/picker/reorder, drag/drop, result, Video Advanced, and Video settings.
- Reviewed 390px states include Edit continuation, Image controls/model, multi-reference, result, Video controls/settings, and reduced motion.

### What already works
- The Kinetic Precision shell and composer are visually polished and clearly RenderLab rather than default shadcn UI.
- Image/Video uses shared-layout selection motion and preserves one compact control row at 390px.
- Reference add/remove/reorder already uses Motion layout/presence and stable aliases.
- Advanced is integrated into the composer and honors current model/mode semantics.
- Generate has tactile press/hover treatment and active visual energy derived from real submission/job state.
- Result arrival is reduced-motion aware and durable-media-first.
- Current responsive evidence shows no accepted horizontal overflow at 390px.

### Main design gap
The important states still read as separate vertical blocks:

`headline/support → composer → lifecycle alert → result card`

That separation weakens object continuity at the moment Create matters most. Mode-specific controls mostly fade/scale rather than reshape the instrument. References are readable but still behave visually like compact rows. Advanced expands as a secondary panel. Successful generation appends another result container instead of visibly transforming the authoring instrument into a result workspace.

The R&D direction therefore concentrates expression in one strong idea: **preserve one instrument boundary and rebalance its internal geometry as the task changes.**

## Redesign boundary
The following visual decisions are reopened for R&D:
- Create page composition below the application shell;
- geometry and spatial relationship of prompt, references, precision controls, lifecycle feedback, and result;
- Image/Video visual morphing;
- reference insertion/reorder/removal choreography;
- Advanced disclosure origin/geometry;
- Generate tactile response and active-state presentation;
- generation → durable result spatial transition;
- desktop vs 390px layout adaptation for those visual states.

The following remain authoritative and are not reopened:
- one `/create` workspace;
- current Create Image, Edit Image, Create Video, Animate Image operation model;
- current prompt, output, model, aspect, Resolution, Duration, Audio, Advanced semantics;
- current reference count, stable `@imageN` aliases, semantic roles, ownership, durable upload, and `Original` geometry behavior;
- current account/admission/privacy/ownership boundaries;
- current generation request/API/server ownership and autonomous lifecycle contracts;
- current durable result/media identity and continuation behavior;
- truthful job states only; no fabricated percentage, ETA, queue position, provider stage, or infrastructure state;
- keyboard/focus/touch accessibility, no hover-only essential action, and `prefers-reduced-motion`;
- accepted RenderLab production identity and application-shell boundaries;
- no production dependency/runtime adoption during R&D.

## Product-document discrepancy to reconcile before implementation planning
The current runtime source exposes an Image model selector with FLUX and Qwen states, and the configured Create artifact contains a Qwen model-selection state. Some older capability prose still says Qwen is not selected/exposed as a product choice. For this R&D prototype, the **current rendered implementation is treated as the UI reality**. Before a future implementation contract is authored, `PRODUCT_CAPABILITIES.md` and the current generation capability registry must be re-audited and reconciled so model-selection semantics are stated from current repository reality rather than historical wording.

## Reference matrix
External references are mechanic references only. RenderLab does not copy their brand, layout, content, or product claims.

| RenderLab interaction | Exact reference | Borrow | Do not copy | Desktop/pointer | Touch/narrow | Keyboard/focus | Reduced motion |
|---|---|---|---|---|---|---|---|
| Composer and mode geometry | Motion for React Layout Animations — https://motion.dev/docs/react-layout-animations | `layout` / `layoutId` continuity, interruptible transform-based geometry | demo styling, arbitrary crossfade-only transitions | selected lens and contextual controls reshape one instrument | same state hierarchy; shorter travel and stacked geometry | native ToggleGroup semantics remain authoritative | snap/reflow geometry; preserve selected state without travel |
| Coordinated instrument regions | Motion `LayoutGroup` — https://motion.dev/docs/react-layout-group | coordinate sibling layout changes without product-global state | global shared-element store | prompt/source/control/result regions settle together | stacked regions remain coordinated | DOM/focus order stays stable | instant layout with optional subtle opacity |
| Reference reorder | Motion `Reorder` — https://motion.dev/docs/react-reorder | displacement, spring settling, dragged object staying object-like | drag-only ordering, unconstrained physics | pointer drag is supplementary and shows target displacement | direct drag may be available but explicit action remains baseline | explicit `Make primary` / reorder action remains fully operable | immediate order swap, no displacement animation |
| Advanced disclosure | Motion Primitives Morphing Popover — https://motion-primitives.com/docs/morphing-popover and Disclosure — https://motion-primitives.com/docs/disclosure | disclosure originates from trigger and expands into owned geometry | floating marketing/demo styling; detached modal for ordinary Advanced | precision deck appears attached to control rail | expands inline within the same instrument | trigger/fields remain normal focus order | instant disclosure or brief opacity only |
| Image/Video selection | Motion Primitives Animated Background — https://motion-primitives.com/docs/animated-background | one moving selected lens rather than two unrelated active buttons | registry visual tokens | pointer state reinforces selected lens | touch uses same clear two-choice control | current radiogroup/radio semantics remain | selected background changes instantly |
| Generate tactile response | Emil Kowalski, “You Don't Need Animations” — https://emilkowal.ski/ui/you-dont-need-animations and “7 Practical Animation Tips” — https://emilkowal.ski/ui/7-practical-animation-tips | immediate ~0.97 press response, short purposeful timing | delayed keyboard activation, universal bouncy buttons | press compresses actuator; real active job state changes energy | touch press uses same immediate response | Enter/Space submits without waiting for animation | no transform; semantic active state still visible |
| Origin-aware Advanced/action motion | Emil Kowalski, “Good vs Great Animations” — https://emilkowal.ski/ui/good-vs-great-animations and “Origin-aware animations” — https://emilkowal.ski/ui/origin-aware-animations | movement/scale origin should match trigger geometry | copied dropdown appearance | deck grows from precision control region | origin remains obvious in stacked layout | focus remains on logical trigger/content sequence | no spatial growth required |
| Reference resistance/settling principles | Emil Kowalski, “Building a drawer component” — https://emilkowal.ski/ui/building-a-drawer-component | bounded resistance/settling principle for directly manipulated objects | drawer UI, swipe-to-dismiss semantics | bounded drag feedback only while manipulating a source tile | optional touch drag; explicit reorder action stays available | no dependency on drag | immediate swap |
| Generation → result continuity | Internal prototype `design/prototypes/create-instrument-continuum-v0.1/` | one outer boundary rebalances from authoring to media stage | fake live generation/progress | desktop transitions to intent rail + large media stage | 390px becomes stacked authoring context + media stage | result/actions enter normal DOM/focus sequence | instant state/layout change with complete hierarchy |

## Candidate direction — Instrument Continuum v0.2
### One persistent outer instrument
The page retains a small contextual heading, but the primary object is one large instrument frame. Prompt, sources, precision controls, lifecycle feedback, and result are **regions of that same object** rather than independent cards.

### Authoring state
- Prompt occupies the dominant intent plane.
- Image/Video mode is a small shared selected lens in the control rail.
- Contextual model/aspect/video controls reflow within that rail.
- Generate is integrated into the right/end of the rail on desktop and full-width final row on narrow layouts.
- Decorative light is concentrated at edges and active geometry; body copy stays quiet.

### Source/reference state
- References become source tiles in a source dock inside the instrument.
- Stable aliases remain attached to the same media objects while visual order changes.
- Pointer drag may create object displacement/snap, but explicit reorder/Make primary remains the baseline interaction for touch/keyboard parity.
- The source dock expands only as needed; it does not become a permanent asset browser.

### Precision / Advanced state
- Advanced expands from the precision trigger into a deck that shares the instrument edge and surface, rather than introducing a visually unrelated panel.
- The deck preserves current fields and model-specific visibility exactly.
- Reset remains contextual to the deck.

### Generate actuator and real lifecycle state
- The actuator compresses immediately on press and then transitions to a real state label (`Submitting`, `Generating`, etc.) driven by product truth.
- The control rail becomes the primary lifecycle carrier instead of relying on a separate full-width alert as the main visual expression.
- Error/account/admission feedback still uses explicit readable product messaging; visual integration does not hide important notices.

### Durable result state
On success the outer instrument does not append a second card.

**Desktop:** the instrument rebalances into two regions:
- a compact intent/source region preserving the recipe context;
- a dominant media stage for the durable result and continuation actions.

The v0.2 refinement reserves explicit space for the compact result controls and stacks the Generate-again actuator beneath the contextual control row. The source tile, controls, and durable media stage no longer overlap or compete for the same geometry.

**390px:** the same outer frame becomes a vertical continuum:
- compact intent/source context first;
- media stage immediately below inside the same boundary;
- control rail remains scroll-reachable above the persistent mobile dock, with Generate/Generate again available without dock occlusion.

The result is still a durable media object with its current continuation semantics. The visual metaphor is continuity, not an implication that unsaved/live pixels exist inside the composer.

## Interaction choreography
### 1. Image ↔ Video
**Origin:** selected mode lens and contextual control rail.  
**Transformation:** the selected lens slides; the control rail redistributes available width; model controls resolve into Video settings or vice versa. The instrument background emphasis shifts subtly without changing the outer boundary.  
**Settled state:** prompt/source region stays visually anchored.  
**Interruption:** switching back before settling reverses from current geometry.  
**Reduced motion:** selection and controls update immediately with no transform-dependent meaning.

### 2. Add reference
**Origin:** add-source actuator or accepted desktop drop.  
**Transformation:** a source tile resolves into the source dock; existing prompt plane yields only the vertical space required.  
**Settled state:** alias, role, thumbnail, and explicit actions are readable. First source may set `Original` exactly as current product behavior requires.  
**Removal:** tile collapses from its own occupied geometry and neighbors settle.  
**Reduced motion:** tile appears/disappears with immediate layout.

### 3. Reorder / Make primary
**Origin:** manipulated source tile or explicit action.  
**Transformation:** neighboring tiles displace before the moved tile settles; alias stays visually attached to its media object.  
**Settled state:** first visual position communicates primary role and current product order.  
**Keyboard/touch fallback:** explicit Make primary/reorder action performs the same deterministic order change.  
**Reduced motion:** order swaps immediately with an updated role label.

### 4. Advanced
**Origin:** precision/ellipsis trigger in the rail.  
**Transformation:** the instrument edge opens into a precision deck from that trigger region; prompt/source geometry remains anchored rather than the page receiving a detached card.  
**Settled state:** current fields and Reset are ordinary accessible controls.  
**Close/reverse:** deck returns toward its trigger geometry.  
**Reduced motion:** deck becomes visible/hidden immediately with normal focus behavior.

### 5. Generate
**Origin:** primary actuator.  
**Response:** immediate tactile compression on pointer/touch only; keyboard activation is not delayed.  
**Transformation:** actuator label/icon and rail energy transition only to real RenderLab lifecycle state. Prompt/sources remain present while accepted work runs.  
**Settled active state:** current truthful lifecycle label remains readable.  
**Failure/cancel:** semantic error/cancelled state settles without pretending a result exists.  
**Reduced motion:** no press transform/scan; state label and semantic styling still change.

### 6. Generation → durable result
**Origin:** existing instrument frame after the job reaches truthful success and the durable output asset is loaded.  
**Transformation:** desktop intent region narrows while a media-stage region grows from available instrument geometry; narrow layout opens the media stage below the authoring context. This is a rebalancing of one boundary, not an appended-card entrance.  
**Settled state:** result dominates; prompt/source/settings context remains available; continuation actions are associated with the durable result.  
**Interruption/error:** no result stage opens until the durable asset is actually available.  
**Reduced motion:** result region appears at final geometry immediately.

## Prototype
Repository-backed prototype:
- `design/prototypes/create-instrument-continuum-v0.1/index.html`
- `design/prototypes/create-instrument-continuum-v0.1/styles.css`
- `design/prototypes/create-instrument-continuum-v0.1/refinements.css`
- `design/prototypes/create-instrument-continuum-v0.1/app.js`

The prototype is design evidence only. Its media/job data is deterministic fixture state and must not be interpreted as live product behavior. It does not import production Create code, call RenderLab APIs, require Supabase/R2/provider credentials, or create a new Next.js route.

Review states:
- `?state=image`
- `?state=video`
- `?state=references`
- `?state=advanced`
- `?state=generating`
- `?state=result`

The prototype also supports direct interaction through mode controls, source add/reorder/remove, Advanced, and Generate. It honors `prefers-reduced-motion`.

## v0.2 verification and human review
Latest interaction/prototype evidence before this documentation record:
- exact prototype/verifier head: `d70ab0f7e8fd18f9ceecec01b3eb77a333cd3704`;
- Create Interaction R&D run: `34551917420` — passed;
- artifact: `10181146920`;
- artifact digest: `sha256:127ec1a5e13b8faff959c9a4ad0d29f886547238cc83863a6b21147f49f6ded6`.

Verified in that run:
- desktop Image, Video, References, Advanced, Generating, and Result states;
- desktop result source/control/media geometry separation with explicit no-overlap assertions;
- pointer reference reorder while preserving stable aliases;
- forward keyboard Tab reachability, visible focus, and Space activation for mode controls;
- temporal recording across mode switch, reference insertion/reorder, Advanced, Generate, and result settlement;
- 390px full-page and viewport evidence for Image, References, Advanced, and Result;
- real touch-context Add reference and Advanced disclosure using Playwright `hasTouch` + `tap()`;
- explicit mobile control-rail clearance above the fixed navigation dock for both authoring and Result states;
- reduced-motion touch path through Advanced → Generate → Result;
- horizontal-overflow assertions.

Human review of the final desktop Result frame confirms the v0.1 overlap is corrected: the source tile sits above a contained two-level control rail, the rail ends before the durable media divider, and the media stage remains dominant. Human review of the control-focused 390px frames confirms Generate / Generate again remain fully visible above the fixed mobile dock while preserving the vertical continuum.

## R&D acceptance gate
This candidate is **not approved yet**. Issue #148 remains open until:
1. the user reviews the complete desktop and 390px visual direction;
2. the user reviews the temporal interaction direction;
3. any requested iteration is completed;
4. the user explicitly approves the concept + interaction language.

The technical/human pre-review required before presenting the candidate is complete. The next step is the explicit user approval checkpoint, not production implementation.

Only after user approval may repository docs extract durable visual/motion rules and an immediate Phase 23 / Cycle 5 implementation contract be expanded. Approval still would not authorize production deployment.
