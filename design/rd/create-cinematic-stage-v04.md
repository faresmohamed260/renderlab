# Create Cinematic Stage R&D v0.4

**Status:** REVIEWED DESIGN CANDIDATE / HUMAN APPROVAL PENDING / NOT APPROVED  
**Issue:** #148  
**Production authorization:** none

## Design decision

The next Create direction is **Cinematic Stage**.

The prior v0.3 prototype over-literalized the production Landing's Lab Matrix geometry. It turned the brand language into a matrix of UI panels and made the interface itself the visual subject. v0.4 corrects that by making the user's creative work the visual subject and using Lab Matrix as the structure around it.

The core thesis is:

> RenderLab Create is one adaptive cinematic stage with a restrained control perimeter. Prompt, references, output intent and precision controls attach to the stage and transform around it. The stage owns the composition before, during and after generation.

The design should feel calm and almost sparse at rest, then remarkable during meaningful interaction. 3D, physics and graphics are not decorative features to display. They are invisible forces that give the workspace weight, depth and continuity.

## Why this direction fits RenderLab

- It preserves the locked brand and the production Lab Matrix visual DNA without duplicating the Landing composition.
- It makes media/result dominance literal instead of rhetorical.
- It scales to image, video, references, future continuation/post-processing and richer tools without adding a second product shell.
- It creates one clear signature wow moment: Generate → truthful Result takeover.
- It supports the repository's “simple by default, powerful when needed” rule by moving model/precision complexity into a contextual inspector.
- It lets mobile be designed as a first-class stage + tray experience rather than a compressed desktop matrix.

## Visual hierarchy

### 1. Stage
The stage occupies most of the Create workspace and is the primary visual object. Before a durable result exists it is an intentional dark working field—registration marks, crop guides, prompt intent and attached references—but **not** fake generated media.

When a durable result exists, the same stage becomes the media viewport rather than appending a result card elsewhere.

### 2. Prompt strip
The prompt is a large matte command strip attached to the lower edge of the stage. It is not a rounded floating chat box. The prompt carries real typographic weight and remains readable while secondary generation settings stay visually subordinate.

### 3. Reference dock
References enter as physical media objects docked to the stage's left edge. Primary/secondary identity is spatial and persistent; stable `@imageN` aliases do not change when order changes.

### 4. Precision inspector
Advanced/model-specific controls live in an edge-attached contextual inspector. Closed, it is a thin perimeter rail. Open on desktop, the inspector overlays the stage perimeter while the live pointer-depth camera locks to a stable working plane so precision controls do not distort or displace the work. On 390px it becomes a compact attached lower tray. It is not a detached settings card.

### 5. Generate actuator
Generate is an anchored quarter-arc actuator at the lower-right stage edge. Its shape comes from the Lab Matrix identity. It receives deliberate tactile compression and is the origin of the generation transition.

## Signature wow moment — Generate → Result

The wow moment is not a particle effect. It is a spatial transformation of the entire workspace:

1. **Compression** — Generate depresses; nearby stage graphics and prompt strip compress subtly toward the actuator.
2. **Convergence** — registration axes and crop guides tighten toward the stage's media frame. References settle into low-motion support positions. No fake percentage/queue/provider state appears.
3. **Resolve** — when the prototype's deterministic fixture result becomes truthful, the latent stage aperture opens from the same field using a clipped/masked reveal rather than a new card fading in.
4. **Takeover** — media expands to own the stage. Prompt/reference/precision controls recede to the perimeter without disappearing.
5. **Settle** — the field becomes quiet again. Result copy/actions appear only after the result state exists.

Reduced motion resolves directly from authoring geometry to the same final Result geometry with no spatial travel or looping energy.

## Reference matrix

| Interaction | Exact reference | Borrow | Do not copy | Desktop pointer | 390px / touch | Keyboard / focus | Reduced motion |
|---|---|---|---|---|---|---|---|
| Overall product hierarchy | Production RenderLab Lab Matrix Landing (`src/features/landing/landing-experience.tsx` + CSS) | Darkness, editorial type, sparse grid/registration graphics, asymmetric quarter-form geometry, restrained blue/orange atmosphere, media framing | Do not turn Create into a marketing page or a matrix of decorative cards | Bounded local stage parallax only; controls stay still | Static depth hierarchy, no pointer dependence | Normal semantic controls | Same composition with no pointer field |
| Workspace hierarchy | Krea redesign, March 2026 | Remove UI that gets in the way; keep controls hidden until needed; mobile treated as its own product surface | Do not copy Krea navigation, brand, layout or model taxonomy | Secondary settings stay compact/contextual | Purpose-built stage + tray composition | All controls remain ordinary reachable elements | Same information hierarchy |
| Viewport + contextual tools | Spline v2/current editor UI | Dominant creative viewport with properties/context around it | Do not copy 3D editor chrome, object tree or toolbars | Inspector attaches to the stage perimeter; opening Precision locks pointer depth to a stable camera plane | Inspector becomes attached lower tray | Inspector trigger owns expanded state and focus | Open/closed endpoints resolve immediately |
| References | Existing RenderLab Create + v0.3 proven mechanics | Stable `@imageN`, direct media objects, explicit reorder/remove equivalents | Do not carry v0.3 panel composition | Drag media body to exchange primary/secondary dock depth | Explicit Make primary / Remove | Real buttons; visible focus | Immediate final ordering |
| Mode morph | RenderLab North Star + production Create semantics | Transform the same stage frame and safe-area guides between Image/Video | Do not introduce separate Image/Video workspaces | Shared geometry rebalances | Stage changes aspect and control tray composition | Radiogroup semantics | Immediate endpoint |
| Advanced | RenderLab North Star + Spline contextual properties | Precision controls emerge from the stage perimeter while the work remains geometrically stable | No detached modal/settings card; no perspective distortion while tuning | Pointer depth settles to a fixed working plane; right-edge inspector expands over the perimeter | Stage-attached lower tray | `aria-expanded`, visible focus | Immediate open/closed geometry |
| Generate tactility | RenderLab quarter-arc brand geometry | One important actuator with physical compression/release and field response | No playful bounce, magnetic ordinary controls, fake progress | Press compresses actuator and nearby field | Same reachable 44px+ action | Normal button behavior | Brief/no compression; no looping energy |
| Result continuity | RenderLab North Star | Existing stage becomes result media viewport | No appended result card | Masked stage reveal and perimeter recession | Full-width media stage first, controls below/around | Result actions enter focus order after truth exists | Direct final stage |

## Interaction choreography

### Stage depth
**Origin:** quiet matte field.  
**Transformation:** pointer movement biases only non-control stage layers by a few pixels and <1.2° perspective. Reference objects respond slightly more than the stage frame.  
**Response:** targeting a control neutralizes local movement so controls never become evasive.  
**Settled:** pointer leave returns the field to zero. Opening Precision also settles the stage onto a fixed camera plane.  
**Touch/reduced motion:** no pointer field; depth comes from static occlusion and edge light.

### Reference insertion
**Origin:** stage edge with an empty source dock marker.  
**Transformation:** the reference crosses the stage boundary from a shallow Z/lateral offset, overshoots its dock by a few pixels, then settles. The stage content shifts only enough to acknowledge the new object.  
**Response:** alias appears with the object.  
**Settled:** primary source is closest/brightest; secondary sits behind and offset.  
**Removal/reorder:** objects trade depth/position while aliases remain stable.  
**Reduced motion:** references appear/reorder directly at final positions.

### Image ↔ Video
**Origin:** current stage safe frame.  
**Transformation:** the media aperture and crop/registration frame change aspect while prompt and perimeter controls retain their anchors.  
**Response:** Video-specific duration/resolution/audio controls become available in the same inspector.  
**Settled:** one Create stage, new output geometry.  
**Reduced motion:** aspect geometry resolves immediately.

### Precision inspector
**Origin:** stage-edge trigger/perimeter.  
**Transformation:** desktop pointer depth settles to a flat working plane and the inspector expands over the right perimeter without moving the stage or composer origin. On narrow screens the lower edge unfolds into a compact tray while the stage remains visible above it.  
**Response:** controls reveal progressively by relevance.  
**Settled:** stage remains primary and geometrically stable.  
**Reduced motion:** no travel; endpoint snaps into layout.

### Generate → Result
**Origin:** authoring stage.  
**Transformation:** quarter-arc actuator compresses; field lines converge; composer reduces emphasis; result aperture opens from the existing stage; media takes over; context moves to perimeter.  
**Response:** only truthful `GENERATING` and `RESULT` labels appear.  
**Settled:** media dominates; prompt/references remain available for iteration.  
**Interruption:** reset returns to authoring fixture state; no fake cancel/provider behavior is invented.  
**Reduced motion:** truthful state change followed by direct final layout with Result copy/actions immediately visible rather than inheriting the normal reveal delay.

## Desktop composition

- Keep the production application rail conceptually intact and visually subordinate.
- Create header is compact; no redundant top context bar.
- Stage occupies roughly 72–80% of the usable width and most of the viewport height.
- Prompt strip anchors inside the lower stage edge.
- References dock to the left stage edge, partly outside the media aperture.
- Precision owns the right perimeter and locks the pointer-depth camera while open so tuning happens on stable geometry.
- Generate quarter-arc is integrated into the lower-right stage boundary, not floating as another button/card.

## 390px composition

- Compact brand/header above one dominant stage.
- Output mode sits at the stage top edge.
- References become a shallow horizontal source strip with explicit 44px actions rather than desktop depth-based hit targets.
- Prompt is a full-width lower stage strip.
- Generate is a compact quarter/circular-edge actuator with a full readable label or icon + accessible name.
- Precision opens as an attached compact lower tray; the stage remains visible rather than being replaced by settings.
- Result media is first and largest; caption and commands use a deliberate inset and stacked hierarchy so they do not collide or clip.

## Exact reviewed evidence — 2026-09-11

The current candidate was reviewed from the exact GitHub Actions output rather than inferred from source.

- Candidate head: `e330147f126541b8ba865e960ae9e761a1962745`
- Workflow: **Create Cinematic Stage R&D** run `34603173496` / run number 17 — **PASS**
- Artifact: `10264832714` — `renderlab-create-cinematic-stage-v04`
- Artifact digest: `sha256:01dc2e3a53abe68aefdb80e9f60398b09cd9685bf705dd9c720dcf5de9cbf8c8`
- Evidence includes desktop authoring/reference pair/reorder/removal/Video/Precision/generating/Result screenshots, 390px authoring/reference/Precision/Result screenshots, reduced-motion Precision/Result screenshots, and a desktop temporal recording.

Human review of that exact artifact found:
- the stage remains the dominant object through authoring, Video, Precision, generating and Result;
- desktop Precision no longer visually clips the intent/prompt composition and reads as a calm attached instrument rather than another competing card;
- reference objects retain hierarchy without hiding essential actions; touch uses a separate stable 2D treatment;
- the Generate → Result sequence reads as one continuous stage transformation: authoring quiets, the truthful result aperture resolves, then media takes over the same working surface;
- settled desktop Result is media-first and keeps context/actions subordinate;
- 390px Result caption/actions are readable, safely inset and non-overlapping;
- reduced motion reaches the complete settled Result state with no inherited delayed action reveal;
- no accepted horizontal overflow or primary-content clipping remains in the verified matrix.

The desktop Precision evidence deliberately opens the prototype state through deterministic DOM activation after separate real pointer-depth and pointer-drag coverage. This avoids Playwright auto-scroll/hit-testing artifacts created by the intentionally transformed prototype stage; the verifier separately asserts zero horizontal page scroll, stable Precision geometry, real pointer depth, real pointer reference reorder, touch interaction, keyboard/focus visibility and normal Generate interaction.

This evidence promotes v0.4 from `EXPERIMENTAL` to **REVIEWED DESIGN CANDIDATE** only. It does **not** constitute user approval, production authorization, a Phase 23 implementation contract, merge permission, or deployment permission.

## Explicit non-goals

- No production `/create` edit.
- No new product capability or route.
- No fabricated preview/result before truthful result state.
- No WebGL/three.js requirement merely for prestige.
- No global smooth scrolling.
- No matrix of independently styled UI cards.
- No glassmorphism blanket.
- No tiny technical text used to excuse poor readability.

## R&D acceptance target

The reviewed v0.4 candidate satisfies the internal design-review target for presentation:
- the media stage is unmistakably the hero;
- the interface reads as one premium creative product rather than a matrix of design effects;
- the signature Generate→Result transition has a deliberate cinematic takeover rather than an appended result card;
- reference physics/morphing support the task rather than call attention to themselves;
- desktop and 390px are deliberately different where pointer/touch mechanics demand it;
- controls remain readable, accessible and truthful in the reviewed matrix;
- reduced motion retains the same hierarchy;
- no visible clipping/overflow remains in the accepted evidence.

**Human approval is still pending.** User approval is required before #148 can close or any production implementation contract can be expanded.
