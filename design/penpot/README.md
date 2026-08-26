# Penpot Design Handoff

This directory contains open, versioned visual artifacts that can be imported into Penpot and reviewed without depending on Figma or a proprietary design-tool connector.

## Current files
- `create-v0.2-desktop.svg` — reviewed Create v0.2 desktop states: Create Image, Edit Image, Create Video.
- `create-v0.2-mobile.svg` — revised Create v0.2 narrow/mobile candidate using a two-row composer.

## Authority
These SVGs are design handoff artifacts, not the project source of truth.

Authority order remains:
1. repository documentation/code;
2. current Penpot workspace when one is available;
3. repository design handoff artifacts in this directory;
4. historical Figma material;
5. chat/session context.

The durable product rules represented here are documented in `docs/ui/UI_DECISIONS.md` (especially UI-015 through UI-017) and `docs/ui/UI_MIGRATION.md`.

## Penpot workflow
1. Create/open the RenderLab Penpot project.
2. Import the SVG file or drag it onto a Penpot board.
3. Keep each named top-level artboard as a separate reference state.
4. Refine components/layout in Penpot if needed.
5. Record any accepted changes back in the repository before implementation.

Do not treat an imported SVG as an approved implementation. Responsive rendered verification remains required after code implementation.

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
