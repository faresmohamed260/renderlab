# Library visual R&D — Spatial Archive v0.1

Status: **EXPERIMENTAL CODED DIRECTIONS / HUMAN SELECTION PENDING / PRODUCTION UNCHANGED**

Issue: #187

Branch: `rd/library-spatial-archive-v01`

Starting repository `main`: `240ac42e45ec3f6110ed7b9f0682d96d59a448c0`

Production authorization: **none**

## Why this R&D exists

Phase 23 established the Clear Composer as the approved Create redesign. The next primary application surface is Library. The current Library is functionally mature and already verified, but the rendered composition still distributes attention across several stacked rounded control panels before the media field begins.

This R&D reopens **visual composition and interaction treatment only** for `/library`. It does not reopen Library product semantics, durable identity, routing, ownership, upload behavior, server-owned filtering, collection/favorite semantics, batch-action behavior, or deployment.

## Verified current-state audit

Latest merged-main Library Lifecycle evidence before this R&D:
- run `34645734426` — PASS
- artifact `10281198285`
- digest `sha256:d1d4169746c6aa9d3dfd38069eb7340beefb846106f41f0924869b900c4d1423`

Reviewed current browser states:
- desktop Library grid;
- 390px Library grid;
- desktop/mobile Viewer and Edit handoff as contextual continuity evidence.

Observed presentation issues to explore, without changing behavior:
1. section tabs, type filters, organization controls, search and Select are spread across several stacked rounded containers;
2. on narrow layouts, feature chrome occupies a large share of the first viewport before media starts;
3. the media cards themselves are already media-first, but the surrounding chrome still reads more like a control dashboard than a spatial archive;
4. selection mode currently adds a separate command deck rather than making the discovery surface visibly become the selection surface;
5. the current Kinetic Precision atmosphere is coherent but visually less aligned with the newer Landing/Clear Composer Lab Matrix language.

## Locked product and engineering contracts

These remain authoritative throughout R&D:
- Creatives / Uploads remain origin-scoped URL-addressable views over one durable media identity.
- All / Images / Videos, search, Favorites, Collections, sort and pagination remain URL/server-owned.
- Upload and desktop drag/drop remain Uploads-only; file picker remains keyboard/touch/mobile baseline.
- Selection stays current-page only and existing bounded Organize/Delete semantics stay unchanged.
- Cards remain Viewer destinations and gain no hover-only quick actions.
- Durable media identity, ownership/privacy, API, schema, R2/storage and generation contracts remain unchanged.
- No client-owned media/filter dataset and no global media/navigation state.
- Desktop rail and mobile utility header/bottom dock remain the shell contract.
- The settled `RenderLabBrand` geometry remains locked.
- Existing card information hierarchy (media, title, kind/date, video identity, selection semantics) remains understandable without hover.
- Reduced motion, keyboard/focus, 44px touch targets and no-overflow behavior remain non-negotiable.

## Reference matrix

### Midjourney — Organize
Source: https://docs.midjourney.com/hc/en-us/articles/33329462451469-Organizing-Your-Creations

Borrow:
- image-first scanning as the dominant task;
- selection creates a contextual bulk-action surface rather than permanently exposing management actions on every card;
- filters/folders/search stay discoverable but subordinate to the media field.

Do not copy:
- public/community visibility semantics;
- Midjourney's filter taxonomy, timeline bar, folder model, or image-specific product capabilities;
- card hover quick actions.

RenderLab adaptation:
- current-page Select morphs the same discovery command surface into Organize/Delete commands;
- Favorites/Collections remain current RenderLab server-owned filters rather than a new folder system.

### Runway — Assets
Sources:
- https://help.runwayml.com/hc/en-us/articles/4408611980563-Managing-assets
- https://help.runwayml.com/hc/en-us/articles/23998498329107-How-to-organize-assets

Borrow:
- one durable asset mental model can contain generated and uploaded media while exposing useful origin/context views;
- media management should feel direct and project-like rather than like a settings form;
- drag/drop is an optional efficient path, not the only path.

Do not copy:
- Runway's Projects/Private/Shared folder hierarchy;
- sharing/privacy product semantics;
- any new folder or collaboration capability.

RenderLab adaptation:
- retain Creatives/Uploads and Collections exactly as-is, but compose them as one visual index over the media field.

### Adobe Firefly — Files
Source: https://helpx.adobe.com/firefly/web/access-your-files/files-overview.html

Borrow:
- a central "your creative material" mental model;
- simple sectioning makes a large personal media space legible.

Do not copy:
- Adobe's many file categories, sharing model, deleted-files IA or project model.

RenderLab adaptation:
- keep only the existing Creatives/Uploads, Favorites and Collections product model, with less panel nesting.

### Krea — 2026 redesign
Source: https://www.krea.ai/blog/redesign

Borrow:
- remove navigation/interface elements that interrupt making and revisiting work;
- direct drag/drop continuity between creative contexts;
- mobile deserves a deliberate composition, not desktop chrome stacked vertically.

Do not copy:
- model/tool-centric one-sidebar IA;
- Krea branding, layouts, tool taxonomy or product claims.

RenderLab adaptation:
- compress discovery chrome before reducing media usefulness;
- keep existing shell navigation and make Library feature controls one coherent surface.

## RenderLab visual authority

The approved Landing and Clear Composer define appearance:
- near-black canvas;
- faint 64px Lab Matrix registration;
- cool-blue / warm-orange atmosphere concentrated around media;
- precise 1px rules;
- compressed editorial heading hierarchy;
- uppercase technical microtype;
- quarter-arc / registration marks as media accents, not critical control shapes;
- bounded pointer depth on media only;
- conventional controls remain stationary and understandable.

## Three coded directions

The prototype exposes the same locked Library semantics in three visual compositions. The R&D direction switch is prototype-only and is not a proposed product control.

### A — Index Field

**Idea:** Library behaves like a precision media index. Section, kind, search and organization controls live on one thin index surface. Media begins sooner. The grid owns the canvas.

Signature interaction:
- `Select` transforms the index surface in place into the selection command strip;
- selection handles emerge on cards without changing card geometry;
- pointer-capable cards get shallow media-only depth/spotlight;
- cancelling selection restores the discovery index at the same spatial origin.

Strength:
- clearest continuation of Clear Composer's "one obvious control surface" principle.

Risk:
- the single command surface must wrap deliberately on 390px without becoming another multi-row toolbar wall.

### B — Contact Ledger

**Idea:** Library reads like a professional contact sheet with an editorial ledger. The title/section context and discovery controls form two aligned columns separated by precise rules; the media grid follows the same registration columns.

Signature interaction:
- selection compresses the ledger header and turns its right column into commands;
- card selection is static and unmistakable; movement is limited to short settling/layout response.

Strength:
- strong authored/editorial identity with relatively low decorative chrome.

Risk:
- the ledger split must not slow down common filter/search use on narrow screens.

### C — Archive Lens

**Idea:** Retrieval is the visual center. Search is a wide "lens" across the archive; section/type/context controls sit as narrow rails above/below it. The grid remains media-first.

Signature interaction:
- entering selection collapses the search lens into the selected-count command surface;
- selected cards gain a precise registration frame, not a large accent fill.

Strength:
- excellent for users returning to a growing archive to find a known item.

Risk:
- search may become too visually dominant when the common task is simply scanning recent work.

## Shared prototype product states

Every direction must demonstrate:
- Creatives default;
- Uploads context with Upload action;
- All / Images / Videos;
- Favorites, Collections and sort;
- search;
- default media browsing;
- current-page Select mode;
- multiple selected cards;
- Organize / Select page / Cancel / Delete command availability;
- desktop pointer depth limited to media;
- 390px touch-safe composition;
- reduced-motion complete state;
- no horizontal overflow.

## Interaction choreography

### Discovery → selection
1. User activates `Select`.
2. The current discovery command surface remains the spatial anchor.
3. Its content changes into selected-count and batch commands through bounded layout/clip/opacity support; the surface itself does not fly away.
4. Card selection targets become available in stable top-left hit areas.
5. Selected cards use a static high-contrast registration frame plus short settle response.
6. `Cancel` reverses to discovery without changing media order or scroll meaning.

Reduced motion:
- discovery commands swap immediately for selection commands;
- card transforms/tilt are disabled;
- selected outline/check state remains complete and explicit.

### Card pointer response
- pointer-capable desktop may use shallow tilt/spotlight on the media object only;
- title/metadata and all discovery controls remain stationary;
- touch and reduced-motion variants use static hover/selected geometry.

### Narrow layout
- shell remains compact utility header + bottom dock;
- feature controls prioritize section/type/search before secondary organization controls;
- media begins as early as practical;
- all essential targets are at least 44px;
- selection commands wrap into deliberate full-width groupings;
- no hover-only action or meaning.

## R&D acceptance gate

A direction is not accepted because it is attractive in one screenshot. Human review must select one direction after reviewing:
- desktop default and selected states;
- 390px default and selected states;
- reduced-motion selected state;
- pointer behavior where applicable;
- focus and touch sizing;
- no-overflow evidence;
- consistency with current Library semantics and the approved RenderLab visual language.

Only after explicit user approval may the repository create a new production implementation contract/tracker. This R&D issue does not create or authorize Phase 24 by itself.
