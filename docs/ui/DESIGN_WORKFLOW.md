# Visual Design Workflow

## Purpose
RenderLab uses a real visual design tool for meaningful UI/UX exploration before implementation when that reduces code churn. The repository remains the authoritative project record.

## Tool Standard
**Primary visual design workspace: Penpot.**

Penpot replaces Figma as the default ongoing design workspace for RenderLab because the project needs a free/open design workflow that is not blocked by a proprietary free-tier MCP/tool-call quota.

Penpot is used for:
- responsive screen exploration;
- component and layout exploration;
- design-system visualization;
- interaction/prototype exploration where useful;
- visual comparison before implementation.

The tool itself is not the source of truth. Accepted design decisions must be written into the appropriate repository documentation.

## Authority Order
1. `renderlab` repository code and documentation
2. Current Penpot visual workspace for working design exploration
3. Historical design artifacts such as the previous Figma file
4. Chat/session context

If Penpot and repository documentation disagree, the repository wins until an explicit design decision updates it.

## Historical Figma Artifact
The existing Figma file `RenderLab Design System` (`PHqgsDctOsEXX4EFR0SS7i`) is retained as **historical reference only**.

It contains useful prior work including:
- Foundation visual exploration;
- Application Shell v0.1/v0.2;
- Create Experience v0.1/v0.2 desktop/mobile explorations.

Previously reviewed decisions derived from those frames remain valid where they are already recorded in the repository. Do not require Figma access to continue the project and do not treat unrecorded Figma content as authoritative.

## Design-to-Implementation Procedure
For a meaningful UI surface:
1. Read the repository decisions, design system, component catalog, and screen registry.
2. Explore or refine the surface in Penpot when visual design work is needed.
3. Review desktop and narrow/mobile states before declaring the design ready.
4. Record durable accepted decisions in repository documentation.
5. Search the approved component ecosystems before implementing generic mechanics.
6. Implement the smallest approved slice.
7. Run the GitHub production build and Playwright/render validation.
8. Inspect actual implementation screenshots at relevant viewports.
9. Reconcile any design/implementation discrepancy deliberately.
10. Update repository status only after verified implementation.

## Remote-First Constraint
RenderLab development must not depend on a local workstation or Vercel preview deployments for ordinary iteration.

The preferred loop is:

`Penpot design → repository decision → GitHub implementation → GitHub Actions/Playwright screenshots → visual review → repository update`

If direct Penpot automation is not available in a given ChatGPT session, that is not permission to invent an unreviewed visual state. Use repository-documented designs plus remote rendered screenshots for implementation validation, and record any visual-design checkpoint that still requires Penpot review.

## Export/Handoff Guidance
When Penpot artifacts need to survive outside the design service, prefer open/interoperable exports such as SVG or PNG and place only genuinely useful handoff assets in the repository. Do not duplicate every working design frame into GitHub.

Repository documentation should describe the design decision, not depend on an opaque design-tool node ID to explain it.

## Approval Language
- `EXPERIMENTAL` — exploration exists but is not accepted.
- `REVIEWED DESIGN CANDIDATE` — visual direction has been reviewed and can be implemented for rendered validation.
- `APPROVED` — implemented surface/component has passed build, responsive render inspection, and documentation review.
- `LOCKED` — intentionally finalized and should not change without explicit product reason.

A Penpot frame alone never makes implementation `APPROVED`.
