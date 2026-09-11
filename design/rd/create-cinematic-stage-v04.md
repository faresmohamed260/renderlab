# Create Cinematic Stage R&D v0.4

**Status:** REJECTED / ARCHIVED R&D / NOT APPROVED  
**Issue:** #148  
**Production authorization:** none  
**Review PR:** #182 — closed unmerged

## Rejection record — 2026-09-11

The user rejected v0.4 after reviewing the exact-head evidence. The decisive problem was not implementation quality; it was product comprehension. The composition made the Create workflow too abstract and counter-intuitive for a first-time user. The interface asked the user to understand a spatial “stage” metaphor before it clearly explained the ordinary creation job: choose Image/Video, write a prompt, attach references/frames, choose essential settings, Generate, then continue from the result.

PR #182 was closed without merge and retitled as a rejected R&D archive. No production `/create` source, route, backend/schema contract, infrastructure, or deployment state changed.

The follow-on direction is **v0.5 Clear Composer** on branch `rd/create-usability-first-v05`. v0.5 uses comparable AI creative products for interaction grammar while keeping the approved RenderLab Lab Matrix Landing as the visual source of truth. Do not revive v0.4 as the active Create direction unless the user explicitly reopens it.

## Historical design decision

The v0.4 Create direction was **Cinematic Stage**.

The prior v0.3 prototype over-literalized the production Landing's Lab Matrix geometry. It turned the brand language into a matrix of UI panels and made the interface itself the visual subject. v0.4 attempted to correct that by making the user's creative work the visual subject and using Lab Matrix as the structure around it.

The historical thesis was:

> RenderLab Create is one adaptive cinematic stage with a restrained control perimeter. Prompt, references, output intent and precision controls attach to the stage and transform around it. The stage owns the composition before, during and after generation.

That thesis produced useful motion/result-continuity findings, but it is **not an approved product direction** because the resulting authoring interaction was insufficiently obvious.

## Why this direction was explored

- It preserved the locked brand and the production Lab Matrix visual DNA without duplicating the Landing composition.
- It made media/result dominance literal instead of rhetorical.
- It explored one clear signature motion moment: Generate → truthful Result takeover.
- It tested contextual advanced controls and distinct desktop/touch interaction treatments.

These findings may inform later motion refinement only after the basic Create interaction grammar is already obvious.

## Historical visual hierarchy

### 1. Stage
The stage occupied most of the Create workspace and was the primary visual object. Before a durable result existed it was an intentional dark working field—registration marks, crop guides, prompt intent and attached references—but **not** fake generated media.

When a durable result existed, the same stage became the media viewport rather than appending a result card elsewhere.

### 2. Prompt strip
The prompt was a large matte command strip attached to the lower edge of the stage.

### 3. Reference dock
References entered as physical media objects docked to the stage's left edge. Stable `@imageN` aliases did not change when order changed.

### 4. Precision inspector
Advanced/model-specific controls lived in an edge-attached contextual inspector. Desktop locked pointer depth to a stable working plane; 390px used a compact attached lower tray.

### 5. Generate actuator
Generate used the Landing quarter-arc geometry as an integrated actuator at the lower-right stage edge.

## Historical signature motion — Generate → Result

The explored sequence was:

1. **Compression** — Generate depressed and nearby graphics compressed subtly.
2. **Convergence** — registration axes and crop guides tightened toward the media frame.
3. **Resolve** — the truthful fixture result opened from a bounded stage aperture.
4. **Takeover** — media expanded to own the stage while controls receded.
5. **Settle** — result copy/actions appeared only after the result state existed.

Reduced motion resolved directly to the same final Result geometry.

The continuity principle remains potentially useful. The stage-as-primary-authoring-metaphor does not.

## Historical reference matrix

| Interaction | Exact reference | Borrow | Do not copy | Desktop pointer | 390px / touch | Keyboard / focus | Reduced motion |
|---|---|---|---|---|---|---|---|
| Overall product hierarchy | Production RenderLab Lab Matrix Landing (`src/features/landing/landing-experience.tsx` + CSS) | Darkness, editorial type, sparse grid/registration graphics, asymmetric quarter-form geometry, restrained blue/orange atmosphere, media framing | Do not turn Create into a marketing page or a matrix of decorative cards | Bounded local stage parallax only; controls stay still | Static depth hierarchy, no pointer dependence | Normal semantic controls | Same composition with no pointer field |
| Workspace hierarchy | Krea redesign, March 2026 | Remove UI that gets in the way; keep controls hidden until needed; mobile treated as its own product surface | Do not copy Krea navigation, brand, layout or model taxonomy | Secondary settings stay compact/contextual | Purpose-built stage + tray composition | All controls remain ordinary reachable elements | Same information hierarchy |
| Viewport + contextual tools | Spline v2/current editor UI | Dominant creative viewport with properties/context around it | Do not copy 3D editor chrome, object tree or toolbars | Inspector attaches to the stage perimeter | Inspector becomes attached lower tray | Inspector trigger owns expanded state and focus | Open/closed endpoints resolve immediately |
| References | Existing RenderLab Create + v0.3 proven mechanics | Stable `@imageN`, direct media objects, explicit reorder/remove equivalents | Do not carry v0.3 panel composition | Drag media body to exchange primary/secondary dock depth | Explicit Make primary / Remove | Real buttons; visible focus | Immediate final ordering |
| Mode morph | RenderLab North Star + production Create semantics | Transform the same frame between Image/Video | Do not introduce separate Image/Video workspaces | Shared geometry rebalances | Stage changes aspect and control tray composition | Radiogroup semantics | Immediate endpoint |
| Advanced | RenderLab North Star + Spline contextual properties | Precision controls emerge from the perimeter while work remains stable | No detached modal/settings card | Pointer depth settles to a fixed working plane | Stage-attached lower tray | `aria-expanded`, visible focus | Immediate open/closed geometry |
| Generate tactility | RenderLab quarter-arc brand geometry | One important actuator with physical compression/release | No playful bounce, magnetic ordinary controls, fake progress | Press compresses actuator and nearby field | Same reachable 44px+ action | Normal button behavior | Brief/no compression; no looping energy |
| Result continuity | RenderLab North Star | Existing surface becomes result media viewport | No appended result card | Masked stage reveal and perimeter recession | Full-width media stage first | Result actions enter focus order after truth exists | Direct final stage |

## Exact reviewed evidence — historical only

- Candidate head: `e330147f126541b8ba865e960ae9e761a1962745`
- Workflow: **Create Cinematic Stage R&D** run `34603173496` / run number 17 — **PASS**
- Artifact: `10264832714` — `renderlab-create-cinematic-stage-v04`
- Artifact digest: `sha256:01dc2e3a53abe68aefdb80e9f60398b09cd9685bf705dd9c720dcf5de9cbf8c8`
- Documentation-finalized branch head: `07698c7493d6521ce94637d31b718ca8e6a44bdf`
- Documentation-finalized run: `34603904269` / run number 18 — **PASS**
- Final artifact: `10265822261`
- Final digest: `sha256:b12627cb383218deaf16277e5e7e47991dc5686f45572b6601848136ec2a591f`

These runs prove the historical prototype worked as designed. They do **not** make the rejected design acceptable.

## Durable lessons carried forward

Keep:
- truthful Generate → Result continuity rather than an unrelated appended result card;
- restrained Lab Matrix visual DNA from the approved Landing;
- controls that stay still and readable while media may have bounded motion;
- distinct touch behavior where desktop depth/drag mechanics do not translate;
- reduced-motion endpoints that expose all essential controls immediately.

Reject:
- making the user infer a new spatial metaphor before they can create;
- turning the quarter-arc or 3D treatment into a critical affordance that competes with conventional controls;
- hiding obvious creation steps behind cinematic composition;
- prioritizing wow factor over first-use comprehension.

## Scope boundary

This branch is archived R&D. Do not merge it into production, expand Phase 23 from it, alter `/create`, or deploy it. Active Create R&D continues in `design/rd/create-usability-first-v05.md` on `rd/create-usability-first-v05`.