# Penpot Design Handoff

This directory contains open, versioned visual artifacts that can be imported into Penpot and reviewed without depending on Figma or a proprietary design-tool connector.

## Current files
- `create-v0.2-desktop.svg` — reviewed Create v0.2 desktop states: Create Image, Edit Image, Create Video.
- `create-v0.2-mobile.svg` — revised Create v0.2 narrow/mobile candidate using a two-row composer.
- `create-v0.3-advanced.svg` — reviewed desktop/mobile Advanced-disclosure candidate. The panel stays inside the composer, is collapsed by default, and exposes only currently verified advanced generation parameters.
- `library-v0.1.svg` — approved Phase 4 Library v0.1 direction: media-first newest grid, `All / Images / Videos` filtering, responsive two-column mobile layout and truthful empty states. Favorites, collections, batch actions, density controls and legacy Creatives/Uploads tabs remain intentionally omitted.
- `library-v0.2-upload.svg` — approved repository-backed handoff for the scoped persistent-upload extension: one compact Upload action integrated into the existing Library header, native file picker, existing grid as the durable surface, and concise inline upload/error feedback. It does **not** approve a separate Uploads tab, generic upload modal, favorites, collections, rename/delete/batch management or drag/drop. The implemented extension passed configured browser Upload → Library → Viewer → Create verification and desktop/mobile screenshot review before PR #9 merged.
- `media-viewer-v0.1.svg` — approved Phase 4 contextual Media Viewer v0.1 handoff showing media-primary desktop/mobile layout, secondary prompt/details metadata and Edit/Animate continuation placement. The implementation and server-validated durable-media handoff to Create were approved after configured run `33034606396`; uploaded-media presentation/continuation was approved through PR #9. Download v0.1 (UI-024) and Rename v0.1 (UI-025) are deliberately incremental Viewer actions that preserve this base layout rather than creating a replacement design artifact. Download merged through PR #11; Rename's refined desktop/mobile edit/renamed screenshots from `33074480356` were visually inspected, including the final composition where Rename and Download remain side-by-side and the inline editor expands beneath them.

## Authority
These SVGs are design handoff artifacts, not the project source of truth.

Authority order remains:
1. repository documentation/code;
2. current Penpot workspace when one is available;
3. repository design handoff artifacts in this directory;
4. historical Figma material;
5. chat/session context.

Durable product rules are documented in `docs/ui/UI_DECISIONS.md`. Create behavior is governed especially by UI-015 through UI-019; initial Library/Media Viewer scope by UI-020/UI-021; persistent uploaded-media identity by UI-022; Library search by UI-023; durable Viewer Download by UI-024; and durable display-name Rename by UI-025. Phase status is tracked in `docs/ui/UI_MIGRATION.md`.

## Penpot workflow
1. Create/open the RenderLab Penpot project.
2. Import the SVG file or drag it onto a Penpot board.
3. Keep each named top-level artboard as a separate reference state.
4. Refine components/layout in Penpot if needed.
5. Record accepted decisions back in the repository before implementation.
6. Verify the real responsive rendered implementation before changing a surface/component to `APPROVED`.

Do not treat an imported SVG as an approved implementation.

## Visual baseline
The files intentionally use the repository design-system baseline:
- canvas `#090A0C`
- surface-1 `#111318`
- surface-2 `#171A20`
- surface-3 `#20242C`
- border `#2B303A`
- text `#F4F5F7`
- text-muted `#9CA3AF`
- accent `#7C6CF2`

Typography is represented with Inter/system sans-serif fallbacks.
