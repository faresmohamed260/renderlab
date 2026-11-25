# RenderLab Design Language V2

**2026-11-25 — owner-approved static visual direction; P6-03 planning revision.** The flat-boxed #706 prototype is rejected. The [approved comps](https://github.com/faresmohamed260/renderlab/tree/claude/renderlab-adr005-handoff-zsbdq7/design/approved/2026-11-25-phase6) govern visual intent; exact tokens and motion assignments below are candidates pending composited browser and human temporal review. No runtime implementation or release is authorized by this documentation.

## 1. Authority, purpose and provenance

**[RL]** Make the dark-only RenderLab experience feel like one responsive creative instrument: familiar controls, soft material, consistent geometry, immediate feedback and spring-led continuity. Preserve product behavior (except explicitly approved Activity route retirement and navigation changes), API, durable data, ownership/security, authentication/MFA, admin permissions, existing capability gating and accessibility. Preserve LOCKED brand geometry and Landing quarter-circle; do not copy proprietary assets. Settings/Admin remain the calmest. No light mode, theme switch, or automatic light palette. Existing Phase 5 correctness work remains Integration Mode; its P5-03 Admin Health rendering is deferred to the separately authorized future Admin phase. No implementation starts before separate design/contract review.

Rule labels used throughout:
- **[HIG]** paraphrased public Apple Human Interface Guidelines principles (adapted to the web, not Apple design values).
- **[RL]** RenderLab-specific decisions and first-principles proposals informed by HIG, accessibility and product intent; existing source values are audit inputs only. **[RL/WCAG]** denotes RenderLab acceptance based on WCAG 2.2, not an Apple standard.
- No claimed Meta guidelines or private design system; no Apple platform font/assets required.

References checked 2026-11-24: Apple HIG [Color](https://developer.apple.com/design/human-interface-guidelines/color), [Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Typography](https://developer.apple.com/design/human-interface-guidelines/typography), [Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons), [Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), [Feedback](https://developer.apple.com/design/human-interface-guidelines/feedback), [Undo and redo](https://developer.apple.com/design/human-interface-guidelines/undo-and-redo), [Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures), [Design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles). W3C [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow), [Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum). Internal authorities: [UI System](UI_SYSTEM.md), [Visual North Star](VISUAL_NORTH_STAR.md), [Design Workflow](DESIGN_WORKFLOW.md), [Component Catalog](COMPONENT_CATALOG.md), [UI decisions](UI_DECISIONS.md), [Phase 5](../architecture/FRONTEND_PHASE5_POLISH_CONTRACT.md), [technical claims](../TECHNICAL_CLAIMS.md). Baseline source [f7ab311](https://github.com/faresmohamed260/renderlab/tree/f7ab3110942880e6e4be7ebf65b6fcbd8c9ac465); [source-backed consistency audit PR #686](https://github.com/faresmohamed260/renderlab/pull/686), [QA #684](https://github.com/faresmohamed260/renderlab/pull/684). These are design inputs, not provider facts or new capabilities.

## 2. Dark-only Violet Studio + glass [RL]

The approved desktop Create and Library, phone navigation, Advanced and History PNGs establish the visual direction, not pixel-exact runtime geometry or motion approval. The old opaque-first palette and boxed control default are superseded. Preserve a quiet media-first stage, filled soft controls without resting outlined boxes, violet/pink atmosphere, and selective translucent chrome. No light theme or decorative effect that competes with media. [HIG] Materials distinguish chrome and content while preserving legibility; Color uses semantic roles; Layout and Typography prioritize hierarchy and adaptation. Exact values below are RenderLab proposals, not Apple constants.

| Role | V2 candidate [RL] |
| --- | --- |
| canvas | #07060b |
| atmosphere.creative | radial violet rgb(117 94 210 / 38%) upper-right, pink rgb(217 100 160 / 20%) lower-left, indigo rgb(70 90 220 / 18%) lower-center; fixed, bounded to canvas; no pointer loop |
| surface.panel | #201b30 fallback; rgb(255 255 255 / 5.5%) layered; rgb(255 255 255 / 9%) decorative hairline, rgb(255 255 255 / 12%) inset highlight |
| material.panel / shell | blur(30px) saturate(150%); no nested backdrop filters |
| surface.overlay | #201a30 fallback; rgb(32 26 48 / 96%) layered; rgb(7 6 11 / 76%) modal scrim; opaque fallback over arbitrary media |
| material.overlay | blur(30px) saturate(150%) |
| surface.base / raised / high | #191620 / #252134 / #312a40 |
| surface.control / hover / pressed | rgb(255 255 255 / 7%) / rgb(255 255 255 / 10%) / rgb(255 255 255 / 13%) over controlled glass; opaque disabled fallback #252134; never rely on fill alone for selection |
| surface.selected | #403657 / #f5f5f7; visible check, marker or explicit state |
| surface.field-focus | #352a63; actual focus outline immediate |
| text.primary / secondary / quiet | #f5f5f7 / #d5d1e1 / #beb9cc |
| text.placeholder / disabled | #beb9cc / #beb9cc with programmatic disabled semantics, not opacity-only |
| accent.decorative | #7c6cf2 to #b05cf0 (glow/decoration, not a white-text control fill) |
| accent.action / hover / pressed / on-accent | #6d50d1 → #9841bd / #7654d8 → #a045c4 / #6044bd → #8535aa / #ffffff; press darker, not brighter |
| accent.focus / geometry | #e6ddff 2px, 3px offset |
| border.subtle / boundary | rgb(255 255 255 / 9%) decorative / #a9a0bd required when needed |
| border.action-selection | #e6ddff when needed for a distinguishable action/selected state |
| status.success / warning / danger | #76dbb3 / #f0c878 / #ff9ba5; text/icon with status, never color alone |
| radius.micro / control / field / panel / pill | 8 / 18 / 20 / 28 / 999px; adapt panel curvature to small widths |
| radius.sheet | 36px |
| elevation.panel | inset 0 1px 0 rgb(255 255 255 / 12%), 0 30px 90px rgb(0 0 0 / 45%) |
| elevation.overlay | 0 8px 24px rgb(0 0 0 / 45%) |
| elevation.primary | 0 8px 32px rgb(124 108 242 / 25%); bounded glow |
| elevation.flat / focus | none; no focus glow replacing outline |
| spacing | 4/8/12/16/24/32/48/64px modular; wrap before truncation |
| type.family | Inter/system fallback |
| type.body / label / caption | 16/14/12px at default root; 1.5/1.4/1.4 line height, 400/500/400 weight; relative scaling |
| type.section / page / display | 20/28/36px, 600 weight; relative scaling |
| control.visual / effective hit | 32/40/44px visual; 44px preferred effective, 24px absolute project floor |

No nested backdrop filters or animated blur. Use reduced-transparency/high-contrast/unsupported-filter opaque equivalents and dark scrim where arbitrary artwork could bleed through. Quiet labels must be solid semantic colors, not unbounded alpha. The 9% hairline is decorative, never a required non-text boundary; where fill alone cannot convey an essential control/state, use a recognizable glyph, explicit selected text/check, or contrast-tested shared edge. Keep keyboard focus rings distinct even on gradients. No control over unconstrained media without a measured safe surface.

### Contrast evidence and gate [RL/WCAG]

Measured actual composited background pixels from the approved 1440×900 Create PNG (Git blob `e6e9719173f7e438e1b77c3fcf2e9822b04fe1ee`); decoded PNG RGB samples at the coordinates below, WCAG sRGB luminance, ratios against specified foreground colors. These are static render measurements against candidate foregrounds, not glyph sampling or browser interaction proof. **Decision 2026-11-25 (head engineer):** deliberately deviate from the approved comp’s bright #7c6cf2 → #b05cf0 Generate gradient. Adopt #6d50d1 → #9841bd for normal Generate, #7654d8 → #a045c4 for hover, and darker #6044bd → #8535aa for press. White text remains; decorative violet stays bright. The static comp is unchanged.

| Pixel (x,y) / region | Rendered RGB | Foreground | Ratio |
| --- | --- | --- | ---: |
| 1090,835 Generate left | 130,107,242 | white | 3.94 |
| 1375,835 Generate right | 169,94,240 | white | 3.79 |
| 1068,110 top glass | 53,42,99 | #f5f5f7 | 11.60 |
| 1068,110 top glass | 53,42,99 | #beb9cc (candidate quiet sample) | 6.62 |
| 40,840 pink glass | 59,31,50 | #f5f5f7 | 13.51 |
| 40,840 pink glass | 59,31,50 | #beb9cc | 7.70 |
| 1090,214 prompt control | 52,45,85 | #f5f5f7 | 11.67 |
| 1090,214 prompt control | 52,45,85 | #beb9cc | 6.66 |
| 1100,555 Advanced | 34,32,45 | #beb9cc | 8.38 |

Calculated adopted gradient endpoint white-text ratios: normal 5.65/5.49; hover 5.21/5.07. These are numerical endpoint predictions, not rendered proof. All text states (including placeholder and project disabled-legibility target) require ≥4.5:1, large text ≥3:1, necessary component/state/focus boundaries ≥3:1. Test the full gradient, not just endpoints, actual rendered adjacent focus pixels, selected/unselected, error/disabled, hover/press, nested control, pink/violet hotspot, light/dark/saturated artwork behind sheets, opaque/reduced transparency and no-filter fallback. No claimed passing conformance until the new shared primitives are rendered and measured. The retained isolated P6-02a harness is authorized to synchronize with these roles and measure live gradient states; its revised specimen is a test fixture, not approval of the rejected prototype or production implementation. Full arbitrary-media, high-contrast and production shell checks remain P6-03 gates.

## 3. Motion system

**[HIG]** Motion should clarify action, feedback and hierarchy, be comfortable, and adapt to accessibility preferences. **[RL]** UI-083 is the scoped animation standard: use existing React Spring for new/reworked application springs; map canonical stiffness/damping/mass to React Spring tension/friction/mass. Existing Motion for React and CSS remain until a reviewed surface migration; no dependency change in this docs step. One shared named config owner later, not repeated magic numbers. Values are independently chosen RenderLab proposals, not Apple physics constants. [HIG] motion is meaningful, responsive and comfortable; [RL] derive unit-mass candidates from the damped harmonic oscillator, using natural frequency ω = √(k/m) and damping ratio ζ = c/(2√(km)). Prefer near-critical or critically damped small controls for precision, more gently damped slower spatial transitions, and bounded gesture-release response. Choose frequencies and damping by role, then validate settling, velocity and perceived quality in prototypes; the existing ad hoc Create 220/22/1, alternate shell 430/34 and CSS/WAAPI durations are input observations only.

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

### Approved-composition interaction assignments [RL]

| Interaction | Normal | Reduce Motion |
| --- | --- | --- |
| Phone logo navigation sidebar slide / close | smooth, anchored left, scrim opacity; reverse from current position | immediate open/close, same focus trap/return and inert background |
| Advanced and History sheet present / Done, Escape or dismiss | smooth from bottom; drag-release only for optional direct drag, bounded and cancellable | immediate sheet and scrim; equivalent explicit Done/Escape, no drag required |
| Queue and action-search popover | smooth anchored disclosure, focus immediately | immediate visible state and focus |
| Result stepping via brackets, buttons or selection | gentle bounded media transition preserving identity; snappy selected thumbnail | replace image immediately, retain index, selection and announcement |
| Press feedback, mode/shape selection | snappy bounded scale/selection; no delayed submission | static pressed/selected color, glyph, focus |
| Skeleton | short bounded shimmer only during data loading, never job progress | static placeholder, same geometry and actual status |

No gesture is required to dismiss; interruptions, focus restoration, resizing and repeated input must be recorded. Static comps approve no spring behavior.

## 4. Per-surface intensity (unchanged North Star ceilings) [RL]

| Surface | Ceiling | Application of shared language |
| --- | --- | --- |
| Landing | 4/4 | Highest expression; authored hero/scene and bounded choreography; ordinary controls share primitives and static content. Locked brand/quarter-circle untouched. |
| Create | 3/4 | First proving ground after shared primitives: three desktop columns, phone media stage/floating composer, Advanced and History sheets, media-first hierarchy and tactile controls, preserve capability truth. |
| Library | 3/4 | Media-object continuity, selection and reorder feedback, clear action affordance, no decorative chrome competing with media. |
| Viewer | 3/4 | Same media identity, contextual tools and continuation; content-first hierarchy, comparison remains existing contract. |
| History / Queue (Activity successor) | 2/4 | Real status changes, restrained pending energy, settled terminal history. |
| Shell | 2/4 | Shared navigation/selection, soft restrained glass chrome and focus; logo-opened phone sidebar, no bottom tabs. |
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
| Feature-owned compositions | PreviewNavigationShell, Create workspace/stage/mask, Library selection/card, Viewer comparison/actions, Activity state migrating into History/Queue, Settings/Admin register. Keep product-specific data/behavior local; share UI mechanics not a generic global job/media controller. |

Source policy: retain UI-026 and the approved existing-source-first search order. Audit V2-11 shows package/registry discrepancy; P5-04 owns verified correction and licensing, no inferred approval. No new dependency in this step.

## 7. Phase 6 roadmap [RL]

P6-01 planning merged; P6-02a isolated flat prototype #706 rejected by owner, retained as historical R&D evidence, not production design. Owner-approved static comps supersede its visual language. Next: P6-03 shared tokens, primitives and application shell; contract must merge before implementation. Later steps remain roadmap only: Create (desktop three columns; phone floating composer, History/Advanced), Library and contextual Viewer, Landing, Settings, Admin (calm 1/4, no dashboard expansion), cross-product fidelity/accessibility/temporal review and separate release authorization. Activity is retired as a destination only after its functions have verified replacements in History and Queue; no new Activity redesign. Later phase sequencing and cutover details require reviewed contracts. Existing FIBO-only capability, ownership and persisted lifecycle remain binding. No runtime or production claim from static comps.
