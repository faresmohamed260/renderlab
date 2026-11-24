# RenderLab Design Language V2

**2026-11-24 — Phase 6 P6-01 design-only specification, for head-engineer review.** Owner authorization reopens the whole-site visual and motion system in Authorized Redesign Mode. Create is messy and unfinished: its intended direction is an input, not a finished reference, approved look or standard. It is the first surface to redesign after shared primitives. This document proposes exact values for review; it is not evidence that new tokens are implemented or rendered/kinetically approved. No production implementation, dependency change, release or new capability is authorized by its acceptance.

## 1. Authority, purpose and provenance

**[RL]** Make the dark-only RenderLab experience feel like one responsive creative instrument: familiar controls, soft material, consistent geometry, immediate feedback and spring-led continuity. Preserve product behavior, route/IA, API, durable data, ownership/security, authentication/MFA, admin permissions, existing capability gating and accessibility. Preserve LOCKED brand geometry and Landing quarter-circle; do not copy proprietary assets. Settings/Admin remain the calmest. No light mode, theme switch, or automatic light palette. Existing Phase 5 correctness work remains Integration Mode; its P5-03 Admin Health rendering is deferred to the separately authorized future Admin phase. No implementation starts before separate design/contract review.

Rule labels used throughout:
- **[HIG]** paraphrased public Apple Human Interface Guidelines principles (adapted to the web, not Apple design values).
- **[RL]** RenderLab-specific decisions and first-principles proposals informed by HIG, accessibility and product intent; existing source values are audit inputs only. **[RL/WCAG]** denotes RenderLab acceptance based on WCAG 2.2, not an Apple standard.
- No claimed Meta guidelines or private design system; no Apple platform font/assets required.

References checked 2026-11-24: Apple HIG [Color](https://developer.apple.com/design/human-interface-guidelines/color), [Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback), [Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo), [Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures), [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles). W3C [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow), [Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum). Internal authorities: [UI System](UI_SYSTEM.md), [Visual North Star](VISUAL_NORTH_STAR.md), [Design Workflow](DESIGN_WORKFLOW.md), [Component Catalog](COMPONENT_CATALOG.md), [UI decisions](UI_DECISIONS.md), [Phase 5](../architecture/FRONTEND_PHASE5_POLISH_CONTRACT.md), [technical claims](../TECHNICAL_CLAIMS.md). Baseline source [f7ab311](https://github.com/faresmohamed260/renderlab/tree/f7ab3110942880e6e4be7ebf65b6fcbd8c9ac465); [source-backed consistency audit PR #686](https://github.com/faresmohamed260/renderlab/pull/686), [QA #684](https://github.com/faresmohamed260/renderlab/pull/684). These are design inputs, not provider facts or new capabilities.

## 2. Intent versus implementation — dark-only foundation

**[RL] Carry forward only the intended direction:** dark layered surfaces, a unified composer with a visible `:focus-within` boundary (individual controls retain necessary focus indication), media-first hierarchy, and tactile, responsive controls. The owner states Create is unfinished. No current grid dimensions, visual overrides, gradients, radii, local springs, popover positioning, tiny reference tags, rich-input quirks, permanent technical-control density, or existing result chrome receive automatic approval. Reflow, target, focus, unsupported-control and continuation defects are expressly excluded. UI-084 is current product/behavior authority, not a declaration that its current look is finished.

**[HIG]** [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles) and [Layout](https://developer.apple.com/design/human-interface-guidelines/layout) establish hierarchy, familiar patterns, consistency and adaptable geometry; [Color](https://developer.apple.com/design/human-interface-guidelines/color) supports semantic, consistent foreground/background and status roles; [Materials](https://developer.apple.com/design/human-interface-guidelines/materials) separates chrome from content without sacrificing legibility and adapts for reduced transparency; [Typography](https://developer.apple.com/design/human-interface-guidelines/typography) supports clear hierarchy, readable type and scaling. [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) calls for recognizable action hierarchy, states and reachable hit regions. These are principles, not published CSS palettes, radii or timings.

**[RL] First-principles candidate construction:** begin with a near-black neutral canvas to recede behind images, progressively lighter neutral surfaces for hierarchy, a single cool accent with adequate contrast for actions/focus, semantic status hues, opaque readable fallback, an even 4px modular spacing rhythm, consistent corner roles, and relative scalable type. Choose dimensions from hierarchy, target size and task density, not from the incidental FIBO stylesheet. These are concrete design hypotheses for prototype/composited contrast review, not Apple values or current implementation. Each semantic role has one owner.

| Role | Proposed V2 candidate [RL] | Existing Create input only (not inherited by default) |
| --- | --- | --- |
| canvas | #0b0c10 | #07070a (background.css:3) |
| surface.base / raised / high | #14161c / #1c2029 / #272c37 | shared #0e1016/#151821/#1d2230 (globals.css:4–7); Create 6→2% panel gradient |
| surface.panel | #14161c opaque baseline; rgb(20 22 28 / 88%) optional layered variant | 6→2% gradient at :362, distinct shadow |
| surface.control / hover / field-focus | #1c2029 / #272c37 / #30364a | white 4.5/5/7/9% washes (:459–481,597) |
| surface.selected | #353052 with #e2ddff foreground | rgb(175 146 255 / 23%) (:337) |
| surface.overlay | #20232e; optional rgb(32 35 46 / 96%) | rgb(32 27 43 / 95%) (:1300) |
| text.primary / secondary / quiet | #f5f6fa / #c9cdd8 / #a4aab9 | #f6f7fb, #dedbed, #bbb4ca and 55% label wash |
| text.placeholder / disabled | #a4aab9 / #a0a6b5 with disabled state semantics | #878794, .68 opacity; do not carry low-contrast opacity-only labels |
| accent.primary / hover / on-accent | #6c5bcc / #7160d0 / #ffffff | #755ed2→#5140aa gradient; not the default V2 actuator |
| accent.focus / geometry | #c6cbff, 2px outline, 3px offset | #a5b4fc, local glow and outlines (:490–492,598,1431–1434) |
| border.subtle / boundary | #343947 / #929bad | borderless washes; shared #2b303a/#40475a. Boundary role only when needed to distinguish controls; subtle separator is not focus. |
| border.action-selection | #d6dbff | Central distinguishing edge for primary/hover and selected controls when fill alone is insufficient; use consistent shared variant, not feature-local exceptions. |
| status.success / warning / danger | #59c79c / #e6b85c / #f08080 | existing theme #3fbf8a/#d9a441/#e06464; accompanying text/icon mandatory |
| atmosphere.creative | optional single cool wash rgb(103 89 196 / 10%), scene only | violet/pink multi-gradient root; no mandatory decorative wash |

### Material and elevation [RL]

| Role | Proposed V2 candidate | Existing input / rationale |
| --- | --- | --- |
| material.none | opaque, no filter | default for readable forms/utility and fallback |
| material.panel | optional 16px backdrop blur, 110% saturation on panel variant | Create 18px/120%; reduce effect intensity, stable material plane |
| material.overlay | 16px blur on overlay variant | Create 18px; separation while preserving readability |
| material.shell | optional 16px blur, 110% saturation on panel variant | Create 20px/165%; no competing shell effect |
| elevation.flat | none | default for controls and calm registers |
| elevation.panel | 0 4px 16px rgb(0 0 0 / 18%) | Create 0 12px 32px /12%; quiet grouping |
| elevation.overlay | 0 8px 24px rgb(0 0 0 / 32%) | Create 0 8px 28px /24%; one elevated contextual layer |
| elevation.primary | none at rest | Create violet glow not inherited; state/press feedback suffices |
| elevation.focus | visible outline only; optional bounded supporting shadow after evidence | Create glow not adequate alone |

**[RL]** Material is a semantic layer, not a look to stamp onto all controls. Prefer opaque fallback when unsupported, reduced transparency/contrast preferences or readability demand it; no nested blur, permanent filter animation or decoration competing with media. Composer focus-within is a shared visible boundary around the unified task, not a replacement for distinguishable focused subcontrols. No automatic 90px atmosphere blur.

### Geometry, type, space and control sizing [RL]

| Role | Proposed V2 candidate and rationale | Current input only |
| --- | --- | --- |
| radius.micro / control / field / panel / pill | 4 / 8 / 12 / 20 / 999px; proportional to element size, pill only for appropriate selection/action semantics | Create 4/7/10/16/17/18/20/24/999px mix |
| spacing | 4/8/12/16/24/32/48/64px modular rhythm; 8px within controls, 12–16px grouped, 24–32px between sections, 16–32px responsive outer gutter; shrink columns before hit areas | 3/5/6/7/9px local gaps and clamped/negative margins; not inherited |
| type.family | Inter with system fallback; monospace only for code/technical identifiers | existing fonts input, no Apple font copying |
| type.body / label / caption | 16/14/12px at default root; 1.5/1.4/1.4 line height, 400/500/400 weight; relative units and wrapping | Create 11–14px compact fields/9px tags; small essential labels not inherited |
| type.section / page / display | 20/28/36px, 600 weight; scalable, content hierarchy over marketing size; Landing may have separately reviewed expressive type | current 14px compact title and disparate surface scale |
| control.visual / effective hit | 32/40/44px visual sizes; 44px effective target preferred, 24px floor; padding/wrap instead of fixed-height clipping | current 32/38px controls, 19px summary rectangles |

**[RL/WCAG]** Measure actual foreground/composited surfaces: normal text ≥4.5:1, large ≥3:1, applicable non-text boundaries/focus ≥3:1. The proposed opaque palette is a starting point; validate interactive states, gradients/materials and contrast against media before adoption. No unmeasured conformance claim. Change a failed token centrally rather than introducing a local exception.

### Central palette contrast gate — corrected 2026-11-24 [RL/WCAG]

Owner correction following P6-02a palette calculation. Four original failing pairs now pass: focus on primary hover **3.12:1** (was 2.96); boundary on focused field **4.29:1** (was 2.99); primary action fill against raised surface **3.11:1** (was 2.73); disabled text on high surface **5.74:1** (was 3.88). Hover fill changed as a central paired state, preserving visible progression and white on-accent contrast (5.24 / 4.90:1). No local color exceptions.

Recalculated all candidate opaque foreground/background combinations below using WCAG sRGB relative luminance (linearization breakpoint 0.04045, coefficients 0.2126/0.7152/0.0722, ratio (Llighter+0.05)/(Ldarker+0.05)); thresholds evaluated before rounding. Normal text ≥4.5, large text and applicable non-text ≥3; disabled text ≥4.5 on neutral backgrounds is a project legibility target (inactive controls are WCAG-exempt). Source: [WCAG contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum), [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast). Numerical design check, not measured rendered conformance.

C canvas #0b0c10; B base/panel #14161c; R raised/control #1c2029; H high/hover #272c37; F field-focus #30364a; S selected #353052; O overlay #20232e; A primary #6c5bcc; AH hover #7160d0.

| Foreground | C | B | R | H | F | S | O | A | AH |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| primary #f5f6fa | 18.10 | 16.74 | 15.10 | 12.95 | 11.10 | 11.47 | 14.50 | 4.85 | 4.54 |
| secondary #c9cdd8 | 12.29 | 11.37 | 10.25 | 8.80 | 7.54 | 7.79 | 9.85 | 3.30 | 3.08 |
| quiet/placeholder #a4aab9 | 8.40 | 7.78 | 7.01 | 6.01 | 5.15 | 5.32 | 6.73 | 2.25 | 2.11 |
| disabled #a0a6b5 | 8.02 | 7.42 | 6.69 | 5.74 | 4.92 | 5.08 | 6.42 | 2.15 | 2.01 |
| selected text #e2ddff | 14.91 | 13.80 | 12.44 | 10.67 | 9.14 | 9.45 | 11.94 | 4.00 | 3.74 |
| on-accent #ffffff | 19.55 | 18.08 | 16.30 | 13.98 | 11.98 | 12.38 | 15.66 | 5.24 | 4.90 |
| focus #c6cbff | 12.46 | 11.53 | 10.39 | 8.91 | 7.64 | 7.89 | 9.98 | 3.34 | 3.12 |
| subtle #343947 | 1.70 | 1.57 | 1.41 | 1.21 | 1.04 | 1.07 | 1.36 | 2.20 | 2.35 |
| boundary #929bad | 6.99 | 6.47 | 5.83 | 5.00 | 4.29 | 4.43 | 5.60 | 1.88 | 1.75 |
| action/selection edge #d6dbff | 14.37 | 13.29 | 11.98 | 10.28 | 8.81 | 9.10 | 11.51 | 3.85 | 3.60 |
| success #59c79c | 9.38 | 8.68 | 7.82 | 6.71 | 5.75 | 5.94 | 7.51 | 2.51 | 2.35 |
| warning #e6b85c | 10.59 | 9.80 | 8.83 | 7.57 | 6.49 | 6.71 | 8.48 | 2.84 | 2.65 |
| danger #f08080 | 7.54 | 6.98 | 6.29 | 5.40 | 4.63 | 4.78 | 6.04 | 2.02 | 1.89 |

**Central semantic role restrictions:** use white on-accent for all text/icons on A/AH (other foregrounds are not interchangeable: secondary, quiet, disabled, selected text and status hues may fail 4.5; even primary text on AH may fail depending on role). Use selected text on S; enabled text and status colors on neutral dark surfaces; disabled text on neutral dark surfaces only. Focus uses the central focus color, not the subtle divider. Subtle border is decorative and never a required control boundary. The neutral boundary is not used against accent fill: use the central action-selection edge instead. Accent and selected fills are not sufficient on all surrounding surfaces; the shared primary and selected variants must provide the central action-selection edge wherever the fill is relied on to distinguish controls, plus text/icon and programmatic selected state. The edge works against both accent interiors (3.85/3.60:1) and adjacent neutral surfaces. No per-feature color overrides.

| Adjacent background | Primary fill | Hover fill | Selected fill | Action/selection edge |
| --- | ---: | ---: | ---: | ---: |
| C | 3.73 | 3.99 | 1.58 | 14.37 |
| B | 3.45 | 3.69 | 1.46 | 13.29 |
| R | 3.11 | 3.33 | 1.32 | 11.98 |
| H | 2.67 | 2.85 | 1.13 | 10.28 |
| F | 2.29 | 2.45 | 1.03 | 8.81 |
| S | 2.36 | 2.53 | 1.00 | 9.10 |
| O | 2.99 | 3.20 | 1.26 | 11.51 |

Translucent variants: simple channel alpha composition before sRGB luminance, panel 88% and overlay 96% over uniform black/white, scene wash 10% on canvas and stress backdrops. These are calculated bounds/inputs, not actual filtered media.

| Foreground | Panel black | Panel white | Overlay black | Overlay white | Wash canvas | Wash white | Wash high | Wash field-focus |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| primary | 17.14 | 11.87 | 14.75 | 12.92 | 16.89 | 1.06 | 11.93 | 10.32 |
| secondary | 11.64 | 8.06 | 10.02 | 8.77 | 11.47 | 1.39 | 8.10 | 7.01 |
| quiet/placeholder | 7.96 | 5.51 | 6.85 | 6.00 | 7.84 | 2.03 | 5.54 | 4.79 |
| disabled | 7.60 | 5.26 | 6.54 | 5.72 | 7.48 | 2.13 | 5.28 | 4.57 |
| selected text | 14.12 | 9.78 | 12.15 | 10.64 | 13.92 | 1.15 | 9.82 | 8.50 |
| on-accent | 18.51 | 12.82 | 15.93 | 13.95 | 18.24 | 1.14 | 12.88 | 11.14 |
| focus | 11.80 | 8.17 | 10.16 | 8.89 | 11.63 | 1.37 | 8.21 | 7.10 |
| subtle | 1.61 | 1.11 | 1.38 | 1.21 | 1.58 | 10.07 | 1.12 | 1.03 |
| boundary | 6.62 | 4.59 | 5.70 | 4.99 | 6.53 | 2.44 | 4.61 | 3.99 |
| action/selection edge | 13.61 | 9.42 | 11.71 | 10.25 | 13.41 | 1.19 | 9.47 | 8.19 |
| success | 8.88 | 6.15 | 7.64 | 6.69 | 8.75 | 1.82 | 6.18 | 5.35 |
| warning | 10.03 | 6.95 | 8.63 | 7.56 | 9.88 | 1.61 | 6.98 | 6.04 |
| danger | 7.14 | 4.95 | 6.15 | 5.38 | 7.04 | 2.26 | 4.97 | 4.30 |

The optional scene wash is restricted to canvas only, never a control background or on light media; other stress columns show why. Use opaque material when actual composited background fails. Panel/overlay ordinary text, status, neutral boundary and focus pass these black/white modeled bounds; decorative divider is not a required boundary. White on accent remains mandatory and colored status stays on neutral backgrounds. Measure actual composited states, adjacent outline pixels and filtered media in prototype before runtime adoption.

## 3. Motion system

**[HIG]** Motion should clarify action, feedback and hierarchy, be comfortable, and adapt to accessibility preferences. **[RL]** UI-083 is the scoped animation standard: use existing React Spring for new/reworked application springs; map canonical stiffness/damping/mass to React Spring tension/friction/mass. Existing Motion for React and CSS remain until a reviewed surface migration; do not add/remove a runtime in P6-01. One shared named config owner later, not repeated magic numbers. Values are independently chosen RenderLab proposals, not Apple physics constants. [HIG] motion is meaningful, responsive and comfortable; [RL] derive unit-mass candidates from the damped harmonic oscillator, using natural frequency ω = √(k/m) and damping ratio ζ = c/(2√(km)). Prefer near-critical or critically damped small controls for precision, more gently damped slower spatial transitions, and bounded gesture-release response. Choose frequencies and damping by role, then validate settling, velocity and perceived quality in prototypes; the existing ad hoc Create 220/22/1, alternate shell 430/34 and CSS/WAAPI durations are input observations only.

| Named spring | Stiffness | Damping | Mass | Interaction / ceiling |
| --- | ---: | ---: | ---: | --- |
| snappy | 400 | 40 | 1 | ω=20 rad/s, ζ=1: critically damped compact press/selection, no bounce. |
| smooth | 256 | 30 | 1 | ω=16, ζ=.938: anchored disclosure/navigation, near-critical for predictable return. |
| gentle | 144 | 24 | 1 | ω=12, ζ=1: slower larger media/context morph with no oscillation; only when justified at 3/4+. |
| drag-release | 324 | 30 | 1 | ω=18, ζ=.833: measured release velocity and modest bounded settling; clamp overshoot at target/viewport boundaries. |

**[RL]** Color/opacity changes use 120ms micro, 160ms normal, 240ms contextual; ease-out cubic-bezier(0.22,1,0.36,1) for entry/settling, ease-in-out only for a justified symmetric bounded effect. Chosen as short feedback budgets based on task importance and perceptual immediacy, not an inheritance of existing Create durations. Geometry transitions use named spring, not a hardcoded timer that disables input. No universal 900ms focus glow; actual focus ring immediate. No required 60fps claim without measured device/browser trace. Prioritize responsive input, compositor-friendly transforms and bounded paint/layout; avoid permanent pointer loops or global scroll interception. Disable offscreen/hidden decorative effects.

| Rule / provenance | Normal motion | Reduced-motion equivalent |
| --- | --- | --- |
| [RL] Interruptible and redirectable | New target uses current position and appropriate current velocity; cancel stale callbacks, reverse mid-open, never block click/key handling until animation settles. | Commit latest state immediately; no stale completion callbacks. |
| [RL] Spatial origin (North Star) | Disclosure starts from trigger; media transition keeps relationship to origin, drag follows pointer then settles. Avoid fake cross-route shared state. | Preserve semantic adjacency, immediate destination with persistent identity/selection, no pan/zoom/scale. |
| [HIG] Feedback / gestures | Immediate visible state on activation; show actual pending/error/success. | Same state text, icon and live-region feedback, no pulse required. |
| [RL] Hover/press/selection | Small purposeful press/selection feedback; no hover-only affordances, pointer-specific depth only on suitable surfaces. | Static pressed/selected state, focus ring, color/outline. |
| [RL] Drag/reorder / mask | Direct tracking, bounded snap, reversible cancel, invalid target feedback. | Same direct action or keyboard equivalent; instant placement/return, no elastic travel. |
| [RL] Popover/dialog/sheet | Anchored smooth entrance/exit; focus, Escape, collision and modality owned by maintained primitive, never timing dependent. | Immediate open/close with identical focus trap/return, text and hit region. |
| [RL] Loading/result | Use real job lifecycle, bounded placeholder and intentional result continuity; never imply estimated progress/provider completion. | Static placeholder plus truthful status; immediate result on arrival. |
| [RL] Scene/scroll effects | Only approved 4/4 scene or bounded 3/4 media effect; no necessary content gated by scroll animation. | Complete static layout/content, no parallax, continuous drift or scroll choreography. |

**[RL]** Test normal, reversal/interruption, rapid repeated input, resizing mid-transition and unmount; no stuck intermediate state, focus theft, duplicate request or invisible hit target. Every new motion in later PR must name role, origin, destination, duration/settle intent, interruption and static equivalent. Prototype signature motion; recordings plus static frames required by Design Workflow.

## 4. Per-surface intensity (unchanged North Star ceilings) [RL]

| Surface | Ceiling | Application of shared language |
| --- | --- | --- |
| Landing | 4/4 | Highest expression; authored hero/scene and bounded choreography; ordinary controls share primitives and static content. Locked brand/quarter-circle untouched. |
| Create | 3/4 | First proving ground after shared primitives: unified composer/focus, media-first hierarchy and tactile controls; redesign current messy layout, preserve capability truth. |
| Library | 3/4 | Media-object continuity, selection and reorder feedback, clear action affordance, no decorative chrome competing with media. |
| Viewer | 3/4 | Same media identity, contextual tools and continuation; content-first hierarchy, comparison remains existing contract. |
| Activity | 2/4 | Real status changes, restrained pending energy, settled terminal history. |
| Shell | 2/4 | Shared navigation/selection, soft restrained chrome and focus, no competing feature-specific shell or route change. |
| Settings | 1/4 | Calm trust/security forms, quiet transitions, visible focus, no spectacle or distracting animated background. |
| Admin | 1/4 | Operational legibility and stable controls; existing access and security behavior. Dashboard is separate later phase, no expansion here. |

**[RL] Deferred Admin context only:** owner’s later stages Observe, User Control, Job Control, Audit, Guards are labels, not implementation packages or new capabilities in Phase 6. Observe must consume existing `generationObservability.available`, `dispatchLatency`, `terminalHeld` in approved diagnostic grouping, with explicit unavailable vs valid zero/empty/truncated semantics (dispatch latency is outbox confirmation, not GPU start; terminal-held counts may be lower bounds). Existing permission gates, data fetch, query, labels and API remain unchanged; P5-03 is deferred here, not implemented by this spec. The later Admin phase must be separately planned and approved.

## 5. Intuitive component checklist — acceptance for EVERY component

- **[HIG]** Visible affordance with recognizable purpose, accessible name, clear feedback on action, predictable interaction across input modes. **[RL]** One obvious primary action per task/context; secondary/destructive actions distinct, no competing accent.
- **[HIG]** Reversible operations where existing behavior permits; easy cancel/undo for local edits. **[RL]** Irreversible actions get clear maintained confirmation and safe focus; never invent server undo or change product semantics.
- **[HIG]** Apple button guidance recommends 44×44 points as a general hit region. **[RL/WCAG]** RenderLab web targets **at least 24×24 CSS px**, aim **44×44 CSS px wherever practical** including icon controls. This is a deliberately conservative project rule; WCAG SC 2.5.8 has spacing/inline/equivalent/UA/essential exceptions, not permission to shrink custom controls by default. Document any truly unavoidable standards exception with measured geometry and owner review. Points are not CSS px. Measure actual effective hit areas, overlap, expanded states and keyboard focus.
- **[RL/WCAG]** Reflow without information/function loss or two-dimensional scrolling at 320 CSS px (SC 1.4.10 for vertically scrolling content, equivalent to 1280 CSS px at 400%); text resize 200% (SC 1.4.4). Additionally test 1440×900 and 390×844, true 200% zoom from both (720/195 effective widths in #684), and 320 CSS px explicitly. 195px stress is stricter than SC 1.4.10, not proof of WCAG failure. No overlapping labels, clipped actions, internal horizontal scroll in ordinary composer/forms/toolbars, or sticky-header focus obstruction; use wrapping, fewer columns and progressive disclosure before shrinking text. Legitimate 2D media/canvas/table exception only for content needing that geometry, not surrounding controls. Verify component scrollWidth/clientWidth and actual hit/clip rectangles, not merely document width. #684's reference overlap/internal scrollbar and Negative prompt/VGL 19px summary targets must be resolved/verified in eventual implementation.
- **[RL/WCAG]** Keyboard/touch/pointer parity, focus visible/not obscured, logical focus order, Escape, modal containment/return or meaningful fallback; non-color-only status, sufficient composited contrast, screen-reader labels/status; no required pointer-only gesture or hover. 
- **[RL]** Idle/hover/focus/pressed/selected/disabled/pending/error/empty/success as applicable; truthful capabilities, no hidden unavailable action, preserve user intent and no duplicate submission. Reduced-motion equivalent and interruption evidence for every motion. Token role and existing primitive provenance recorded; no raw visible native controls contrary to UI-026. Reject a component that meets static visual goals but fails interaction tests.

## 6. Component inventory and gaps [RL]

Paths below are relative to `src/components/ui/`; actual files verified at the source snapshot. “Gap” means no matching dedicated shared file in this inventory, not that behavior is absent or that dependency adoption is authorized. Feature composition remains feature-owned unless actual reuse justifies extraction. Later adoption follows catalog/license/size/dependency and design review.

| Existing maintained file(s) | Shared role / next design consideration |
| --- | --- |
| button.tsx | Button/Link asChild/icon/primary/secondary/destructive; shared material variants, target sizes, busy feedback. |
| input.tsx, textarea.tsx, label.tsx, field.tsx | Form fields, errors/help/labels; wrapping, accessible name, focus, density. Rich prompt composition remains Create-owned; no second generic text engine. |
| checkbox.tsx, toggle.tsx, toggle-group.tsx | Selection/toggle/segmented role, accessible checked/pressed state and smooth active geometry. |
| native-select.tsx | Native choice, preserve semantics and mobile OS behavior. |
| collapsible.tsx | Advanced/attached disclosure; target sizing, focus and motion equivalent. |
| dropdown-menu.tsx | Anchored contextual menu and keyboard/focus/collision mechanics. |
| alert-dialog.tsx | Destructive confirmation and safe focus; do not use for every ordinary disclosure. |
| alert.tsx, empty.tsx, spinner.tsx | Inline feedback, empty/loading states and truthful pending indication. |
| Gap: Popover / Tooltip, ordinary Dialog / Sheet | Dedicated shared files not present; evaluate existing maintained mechanics and actual composer/menu use before proposing a wrapper. |
| Gap: Slider, Switch, Tabs, Progress, Skeleton, Toast | No dedicated files in this inventory. Reuse existing NativeSelect/Toggle/Spinner/Alert and feature controls where semantically correct; introduce only after reviewed real need. |
| Gap: shared motion/token layer | Existing CSS/Tailwind roles and duplicated local spring configs; define one owner and migration map in later contract. |
| Feature-owned compositions | PreviewNavigationShell, Create workspace/stage/mask, Library selection/card, Viewer comparison/actions, Activity state, Settings/Admin register. Keep product-specific data/behavior local; share UI mechanics not a generic global job/media controller. |

Source policy: retain UI-026 and the approved existing-source-first search order. Audit V2-11 shows package/registry discrepancy; P5-04 owns verified correction and licensing, no inferred approval. No new dependency in this step.

## 7. Phase 6 roadmap — only P6-01 expanded

**[RL]** Sequence is binding at the direction level, not implementation authorization. After spec merges, shared primitives first; Create is the signature proving ground and first redesigned surface. Later surfaces follow exactly in the order below. Each needs separate design review/contract and existing behavior evidence. Admin visual-language alignment is a separate later scoped phase at 1/4, not dashboard expansion; its Observe/User Control/Job Control/Audit/Guards remain context only.

| Order | Roadmap only |
| --- | --- |
| 1 | P6-01 audit/spec/UI decision/governance reviewed and merged. |
| 2 | Shared primitives foundation prerequisite to P6-02: reviewed semantic tokens, common controls and named motion roles, accessibility/fidelity prototype; no runtime work until separately authorized. |
| 3 | P6-02 Create redesign — signature proving ground, outline below. |
| 4 | Shell |
| 5 | Library |
| 6 | Viewer |
| 7 | Activity |
| 8 | Settings |
| 9 | Admin — separately scoped calm visual-language alignment, no dashboard expansion. |
| 10 | Landing |
| 11 | Cross-product fidelity/accessibility/temporal acceptance and closure; separate release authorization. |

### P6-02 outline — Create redesign (not expanded contract)

Only expand after P6-01 merges. Shared primitives must be reviewed and ready before Create implementation; use Create to prove them rather than cloning its current styling. Produce a reference matrix, state-by-state desktop/narrow composition and interaction choreography, then reviewable temporal prototype and separate human approval. Preserve UI_DECISIONS current behavior, UI-084/FIBO-only rollout and Phase 5 fixes; honor supersession of UI-015/016 and historical Video/FLUX rules, never reopen capabilities, API, data or security. Use audit #686 decision reconciliation.

| Required state | Design question / existing behavior to preserve |
| --- | --- |
| Empty | Single clear starting action and useful empty media stage; truthful unavailable/admission state. |
| Typing | Unified composer and focus-within; readable prompt, IME/paste, keyboard shortcuts and accessible focus. |
| References | Stable identity/order/roles and prompt addressing, add/remove/replace, supported source geometry and mask eligibility; no overlap or internal horizontal scrolling. |
| Advanced | Progressive disclosure, truthful supported values, no new controls; explicit 24/44px target geometry and anchored popovers. |
| Generating | Real acceptance/running/cancelling state and immediate response; preserve work, no fabricated progress or duplicate submission. |
| Result | Durable media primary; existing history, supported comparison, continuation/settings actions, capability-derived affordances. |
| Error | Recoverable validation/submission errors near source and preserved input, accessible feedback/focus, no silent failure. |
| Failed | Truthful terminal failure with retained recipe/context and existing permitted retry/continuation; no false completion or invented recovery. |

All eight states require narrow/reflow, keyboard/touch/focus, motion interruption and static reduced-motion evidence. This is roadmap scope, not a design or implementation approval; no new features.

### P6-01 contract — documentation-only [RL]

**Goal/user value:** establish a coherent, reviewable first-principles system from owner intent, public HIG and audited drift, so later work does not reinvent controls, weaken accessibility or change product truth.

**Starting state:** Phase 5 #677 merged; current source f7ab311 and production manifest distinguished. Phase 5 fixes and #684 QA evidence remain separate; no claimed Phase 5 completion, no new rendered evidence. Audit #686 reads source and existing QA, not a fresh browser audit. The owner explicitly authorizes design-language redesign now, not code. UI-083 spring direction and North Star ceilings remain.

**Deliverables:** dated consistency audit, this specification (tokens/springs/rules/component inventory, roadmap and contract), UI decision recording owner scope and limits, current index/project/charter handoff and managed governance metadata. Clarify P5-03 deferral to later Admin Observe. No application/test code, dependencies, prototypes, assets, provider/admin/backend implementation or release in this step. No route, API, schema, storage, security, auth or data changes.

**Validation matrix for this step:** read pinned source/authorities and QA; verify all eight surface ceiling values, first-principles token rationale and separate source inputs, exact four spring triples, explicit provenance labels/HIG links, 320 CSS px and true zoom criteria, 24/44 hit targets, complete existing primitive inventory and gaps, Admin deferral and unchanged permissions. Verify Markdown/JSON/decision consistency and run credential-free `npm run verify:docs-governance` through exact-head Documentation Governance; existing required checks plus CodeQL, rebase to main and report actual status. No runtime purity/rendered test result can be claimed for docs. Small PRs; worker 1 merges only; no release.

**Future implementation gate:** before code, accepted reference matrix, desktop/narrow high-fidelity design, choreography and reviewable interactive temporal prototype for signature motion, human approval and next scoped contract per DESIGN_WORKFLOW/AGENTS. Future UI PRs require exact-head checks, `npm run verify:ui-purity`, component-level tests, 1440/390 normal and reduced motion, 320 reflow and true zoom, target/contrast/keyboard checks, rendered and temporal evidence, no real credential/provider access without authorization. Performance evidence must cover actual frame/input behavior, not static images. Separate production release/rollback runbook and single verification generation only when separately ordered for generation-affecting releases.

**Exit:** audit and spec reviewed/merged, governance green, scope and roadmap consistent, no implementation or dependency changes; owner reviews before anything is implemented. Unresolved visual values are recorded for prototype review rather than declared approved runtime UI. Only then expand the P6-02 outline and shared-primitives prerequisite in sequence; do not expand the later Admin phase here.
