# Create Cinematic Stage R&D v0.4

**Status:** EXPERIMENTAL / DESIGNER-SELECTED DIRECTION / NOT APPROVED  
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
Advanced/model-specific controls live in an edge-attached contextual inspector. Closed, it is a thin perimeter rail. Open, it borrows stage width on desktop and becomes a stage-attached lower tray on 390px. It is not a detached settings card.

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
| Viewport + contextual tools | Spline v2/current editor UI | Dominant creative viewport with properties/context around it | Do not copy 3D editor chrome, object tree or toolbars | Inspector borrows width from the stage rather than overlaying the work | Inspector becomes attached lower tray | Inspector trigger owns expanded state and focus | Open/closed endpoints resolve immediately |
| References | Existing RenderLab Create + v0.3 proven mechanics | Stable `@imageN`, direct media objects, explicit reorder/remove equivalents | Do not carry v0.3 panel composition | Drag media body to exchange primary/secondary dock depth | Explicit Make primary / Remove | Real buttons; visible focus | Immediate final ordering |
| Mode morph | RenderLab North Star + production Create semantics | Transform the same stage frame and safe-area guides between Image/Video | Do not introduce separate Image/Video workspaces | Shared geometry rebalances | Stage changes aspect and control tray composition | Radiogroup semantics | Immediate endpoint |
| Advanced | RenderLab North Star + Spline contextual properties | Precision controls emerge from stage perimeter and borrow space | No detached modal/settings card | Right-edge inspector expands; stage shifts/scales slightly | Stage-attached lower tray | `aria-expanded`, visible focus | Immediate open/closed geometry |
| Generate tactility | RenderLab quarter-arc brand geometry | One important actuator with physical compression/release and field response | No playful bounce, magnetic ordinary controls, fake progress | Press compresses actuator and nearby field | Same reachable 44px+ action | Normal button behavior | Brief/no compression; no looping energy |
| Result continuity | RenderLab North Star | Existing stage becomes result media viewport | No appended result card | Masked stage reveal and perimeter recession | Full-width media stage first, controls below/around | Result actions enter focus order after truth exists | Direct final stage |

## Interaction choreography

### Stage depth
**Origin:** quiet matte field.  
**Transformation:** pointer movement biases only non-control stage layers by a few pixels and <1.2° perspective. Reference objects respond slightly more than the stage frame.  
**Response:** targeting a control neutralizes local movement so controls never become evasive.  
**Settled:** pointer leave returns the field to zero.  
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
**Origin:** 40–48px stage-edge rail.  
**Transformation:** desktop stage translates/scales left by a small amount as the inspector claims real layout width. On narrow screens the lower edge unfolds into a tray while the stage shortens above it.  
**Response:** controls reveal progressively by relevance.  
**Settled:** stage remains primary.  
**Reduced motion:** no travel; endpoint snaps into layout.

### Generate → Result
**Origin:** authoring stage.  
**Transformation:** quarter-arc actuator compresses; field lines converge; composer reduces emphasis; result aperture opens from the existing stage; media takes over; context moves to perimeter.  
**Response:** only truthful `GENERATING` and `RESULT` labels appear.  
**Settled:** media dominates; prompt/references remain available for iteration.  
**Interruption:** reset returns to authoring fixture state; no fake cancel/provider behavior is invented.  
**Reduced motion:** truthful state change followed by direct final layout.

## Desktop composition

- Keep the production application rail conceptually intact and visually subordinate.
- Create header is compact; no redundant top context bar.
- Stage occupies roughly 72–80% of the usable width and most of the viewport height.
- Prompt strip anchors inside the lower stage edge.
- References dock to the left stage edge, partly outside the media aperture.
- Inspector owns the right edge and expands only when requested.
- Generate quarter-arc is integrated into the lower-right stage boundary, not floating as another button/card.

## 390px composition

- Compact brand/header above one dominant stage.
- Output mode sits at the stage top edge.
- References become a shallow horizontal/overlapping source strip rather than narrow vertical cards.
- Prompt is a full-width lower stage strip.
- Generate is a compact quarter/circular-edge actuator with a full readable label or icon + accessible name.
- Precision opens as an attached lower tray; the stage shortens above it rather than being covered.
- Result media is first and largest; continuation actions follow without colliding with fixed navigation.

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

The v0.4 prototype is worth presenting only if human review confirms:
- the media stage is unmistakably the hero;
- the interface reads as one premium creative product, not a design experiment;
- the signature Generate→Result transition has a genuine cinematic wow factor;
- reference physics/morphing support the task rather than call attention to themselves;
- desktop and 390px feel deliberately designed;
- controls remain readable, accessible and truthful;
- reduced motion retains the same hierarchy;
- there is no visible clipping/overflow or evasive pointer behavior.

User approval is still required before #148 can close or any production implementation contract can be expanded.
