# Landing Section 03 R&D — Living Library v0.1

**Status:** EXPERIMENTAL CODED DIRECTION  
**Parent:** `docs/ui/LANDING_BRAND_RD.md`  
**Base design evidence:** approved Section 01 Lab Matrix v0.3 + approved Section 02 One creative thread  
**Production boundary:** prototype only; production `/` remains untouched

## Purpose
Section 02 ends by resolving the current creative thread into Library. Section 03 should continue from that exact idea rather than reset the page into another marketing block.

The concept is **Living Library**: durable RenderLab media becomes a spatial field of reusable work. The visitor can focus individual media objects and see the truthful next actions that remain available without turning the section into a conventional feature-card grid.

## Inherited visual grammar
Preserve from the approved Landing work:
- dark restrained canvas;
- concise sans typography;
- media dominance over chrome;
- modular/grid geometry informed by the locked Lab Grid `R` without repeating the logo decoratively;
- purposeful depth and motion concentrated on media objects;
- no generic fade-up section choreography;
- deliberate mobile art direction;
- complete reduced-motion state;
- no fabricated metrics, testimonials, provider/model claims or public-admission behavior.

## Composition
### Desktop
- one compact copy block establishes the Library idea;
- a large spatial media field occupies most of the viewport;
- six durable-media examples sit at different scales/positions rather than equal cards;
- one media object is focused at a time;
- focusing a media object brings it forward while neighboring objects yield away from it;
- a compact contextual panel identifies the selected work and truthful compatible next actions;
- the panel and field should read as one working media system, not dashboard chrome.

### Narrow / touch
- do not compress the absolute desktop field;
- use a horizontal snap-like media rail with one dominant card and a visible hint of the next;
- selection remains tap/focus driven;
- contextual details sit below the rail;
- no pointer-only meaning is required.

## Interaction choreography
1. **Rest:** one media object is clearly primary while the surrounding Library remains visible.
2. **Focus:** pointer hover, keyboard focus or activation selects a media object.
3. **Yield:** the active object moves forward; nearby objects shift away from its center rather than merely changing border color.
4. **Context:** the compact metadata/action treatment updates to the selected durable-media example.
5. **Settle:** motion ends quickly and the field remains calm.
6. **Interruption:** changing focus before the prior transition finishes resolves directly toward the new selected object; no queued animation sequence.

The interaction is illustrative design R&D. It must not imply that RenderLab automatically generates variants, branches or lineage that the product does not own.

## Product truth represented
The section may truthfully demonstrate the already-owned concepts of:
- durable generated and uploaded media in Library;
- reusable image references;
- image Edit / Animate continuation where compatible;
- fixed 2× image Upscale where compatible;
- Favorites / Collections / search / rename / download as existing Library/Viewer capabilities;
- video media as durable Library media.

Do not present every capability at once. Contextual next-action labels should remain subordinate to media.

## Media
The prototype uses fixed external R&D photography for deterministic visual comparison. Those photographs are **not production assets** and are not part of the approved brand identity.

A future production Landing should replace prototype media with owned/cleared RenderLab image/video work while preserving the accepted crop, density and interaction intent if this section is approved.

## Reduced motion
Under `prefers-reduced-motion: reduce`:
- no Ken Burns/ambient media animation;
- no animated yielding/scale transition;
- selection may update instantly;
- all content and next-action meaning remain visible and understandable.

## Out of scope
- production `/` changes;
- new Library product behavior;
- automatic version trees or generation lineage claims;
- route/auth/backend/schema/security/infrastructure changes;
- dependency adoption;
- deployment.

## Review gate
Before user review, verify:
- 1440×900 default and changed-focus states;
- pointer selection and neighboring-object yield;
- keyboard focus selection;
- 390×844 touch layout and selection;
- reduced-motion state;
- six media assets load;
- no document-level horizontal overflow;
- no runtime console/page errors.
