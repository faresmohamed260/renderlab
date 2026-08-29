# AI Development Instructions

This repository is developed with AI assistance across multiple independent sessions and tools. The `renderlab` repository itself is the persistent and primary source of truth.

## Required Context
Before substantial project work, read:
1. `PROJECT.md`
2. `docs/ui/UI_MIGRATION.md`
3. `docs/ui/UI_DECISIONS.md`

For frontend/UI work also read the relevant current versions of:
- `docs/ui/DESIGN_WORKFLOW.md`
- `docs/ui/UI_SYSTEM.md`
- `docs/ui/COMPONENT_CATALOG.md`
- `docs/ui/SCREEN_REGISTRY.md`

For architectural work also read:
- `docs/architecture/FRONTEND_ARCHITECTURE.md`
- `docs/architecture/PRODUCT_CAPABILITIES.md` when capability/generation behavior is involved
- `docs/architecture/INFRASTRUCTURE.md` when Supabase, R2, deployment secrets, generation adapters, or shared resources are involved

Do not fill unfinished documentation from assumptions. Verify repository state and relevant reference implementation/backend behavior first.

## Source-of-Truth Hierarchy
1. `renderlab` repository code and documentation
2. ChatGPT Project context for supplementary continuity and intent
3. Current chat session as temporary working context

If older Project/chat context conflicts with current repository documentation, follow the repository unless the user explicitly changes the decision.

## Fresh-Build Rule
RenderLab is a new application. The previous Studio implementation in `saga` is **reference material, not the RenderLab specification**.

Use Saga to understand:
- proven product behavior;
- backend/API contracts;
- generation and job lifecycle behavior;
- storage/persistence behavior;
- media actions and continuation flows;
- lessons learned and known problems.

Do not assume Saga's visual design, navigation, routes, component hierarchy, frontend architecture, or implementation patterns should be copied.

## Shared Infrastructure Rule
RenderLab deliberately reuses the existing Saga/Studio Supabase and Cloudflare R2 resources. Reuse is an infrastructure decision, not permission to couple RenderLab to legacy `studio_*` application tables or Saga contracts.

Follow `docs/architecture/INFRASTRUCTURE.md` for the approved shared project, applied RenderLab migrations, required environment variables, and security boundaries.

Do not create replacement Supabase/R2 resources unless the user explicitly changes this decision. Do not mutate or repurpose legacy Saga tables merely because they share the same Supabase project.

## Product UX Rule
**Simple by default, powerful when needed.**

RenderLab should support sophisticated and expanding ComfyUI capabilities without exposing that backend complexity directly to average users.

- Organize the product around user goals and understandable creative operations.
- Use sensible defaults.
- Reveal contextual controls only when relevant.
- Put advanced/model-specific controls behind progressive disclosure when appropriate.
- Do not mirror ComfyUI node graphs or technical workflow terminology into the default UI.
- ComfyUI is the generation engine, not the product interface.
- The visual-quality target is a premium modern creative application. Maintained primitives/libraries provide accessible mechanics, not a visual ceiling: compose them with deliberate spatial transitions, motion and distinctive RenderLab styling when those choices improve understanding or creative flow. Avoid gratuitous effects, preserve performance, and always honor reduced motion.

## Capability Growth
Design internal contracts so new workflows, models, media inputs, parameters, outputs, continuation actions, and post-processing capabilities can be added without repeatedly redesigning the application.

This does not mean exposing every supported capability immediately. Product surfaces must remain curated and intuitive.

## Visual Design Workflow
Penpot is the default ongoing visual design workspace. The previous Figma file is historical reference only. Follow `docs/ui/DESIGN_WORKFLOW.md` for the design → repository → GitHub render-validation loop.

A design-tool artifact is never more authoritative than the repository. Do not mark UI approved because a design exists; implementation requires responsive rendered verification.

## Component Source Policy
Do **not** build generic UI primitives or sophisticated interaction mechanics from scratch when a suitable, production-appropriate implementation exists in an approved source.

For conventional visible controls, this is now an enforceable implementation rule, not merely a preference:
- feature and shell code must compose approved shared primitives from `src/components/ui` rather than hand-styling raw native controls;
- raw visible `<button>`, `<select>`, `<textarea>`, and ordinary visible `<input>` elements are not allowed in `src/features` or `src/components/shell`;
- native `file` and `hidden` inputs may remain as browser/form plumbing when a maintained primitive would not replace the underlying platform behavior;
- use the maintained primitive's semantics rather than forcing legacy DOM semantics when the maintained component provides the correct accessible contract (for example, Radix single-choice ToggleGroup uses radiogroup/radio semantics);
- local wrappers may normalize RenderLab tokens, variants, spacing, semantic elements, and product-required accessibility behavior without reimplementing the underlying mechanic;
- a new generic primitive/mechanic built from scratch requires a concrete repository-documented reason that approved maintained sources do not satisfy the requirement.

`npm run verify:ui-purity` enforces the current native-control boundary and runs in UI Shell CI. Shared primitive/config/package changes must remain covered by the affected screen lifecycle workflows.

Default approved ecosystems:
1. **shadcn/ui + Radix primitives** — foundational accessible application UI such as buttons, dialogs, menus, popovers, tabs, forms, selects, sheets, tooltips, and related primitives.
2. **Motion for React** — underlying animation/gesture/layout-motion engine for deliberate custom interaction when a prebuilt component is not the right abstraction.
3. **Motion Primitives** — preferred source for reusable application-friendly motion patterns such as Magnetic, Morphing Dialog/Popover, Transition Panel, animated groups/backgrounds, toolbars, carousel, cursor, progressive blur, tilt, spotlight, and related motion primitives.
4. **Aceternity UI** — approved source for modern interactive/motion components and selected shadcn-compatible blocks when they fit the product experience.
5. **Magic UI** — approved source for selected animated React/Tailwind/Motion components and effects; use carefully because much of its catalog is marketing-oriented.
6. **React Bits** — approved source for selected creative interactions, galleries, navigation, cards, morphing/physics-like effects, and other advanced components when they are suitable for a production creative application.

These sources are peers in the approved toolkit, not a requirement to use every library on every screen. Choose the smallest suitable dependency/component for the interaction.

### Component sourcing priority
1. Existing approved RenderLab component
2. Existing RenderLab primitive
3. Suitable component from the approved ecosystems above
4. Adapt/wrap an approved-source component to RenderLab tokens and behavior
5. Compose a RenderLab-specific product component from approved primitives
6. Build interaction mechanics from scratch only when no suitable implementation exists and the product requirement justifies the maintenance/debugging cost

### Source evaluation
Before adopting a third-party/copy-owned component, verify:
- compatibility with the current Next.js/React/TypeScript/Tailwind stack;
- keyboard and screen-reader behavior for interactive controls;
- reduced-motion behavior where motion is involved;
- responsive behavior;
- performance and bundle/dependency impact;
- that its license/usage terms are acceptable;
- that the component can be brought under RenderLab tokens and visual language;
- that it is suitable for an application workspace rather than merely visually impressive in a marketing demo.

Prefer official documentation/registries for installation and implementation. Do not recreate a library component from memory when its maintained source can be used.

Saga/legacy components do not enter this priority automatically. They are references until deliberately approved or reimplemented for RenderLab.

## Approved UI Is Authoritative
During the fresh-build foundation phase, the old Saga design is not authoritative. Once a RenderLab component, pattern, or surface is explicitly approved and documented, do not casually redesign it, introduce competing styles, or change its interaction behavior without a product reason or explicit user request.

## Before Creating a Component
Search in this order:
1. approved RenderLab components;
2. RenderLab primitives;
3. shadcn/ui/Radix;
4. Motion Primitives / Motion;
5. Aceternity UI;
6. Magic UI;
7. React Bits;
8. only then consider a custom implementation.

If the requested UI is a conventional control already represented by `src/components/ui`, use that primitive instead of writing a raw visible native control in feature/shell code. If a maintained source provides the mechanic but needs RenderLab styling or semantics, adapt the local wrapper rather than rebuilding it feature-by-feature.

When an external component is adopted and becomes part of the product, record the local RenderLab component/wrapper and source in `COMPONENT_CATALOG.md`.

## Design Tokens
Once RenderLab tokens exist, never introduce arbitrary visual values when an appropriate project token exists. Prefer tokens for colors, surfaces, spacing, typography, radii, shadows, control heights, breakpoints, animation timing, and z-index.

## Foundation State
Current product/UI foundation state is tracked in `docs/ui/UI_MIGRATION.md`. Do not restart or reinterpret it from old conversation history. Update it when verified project state changes.

## Progressive Phase Planning
RenderLab uses progressive phase planning for multi-phase development cycles. A cycle roadmap sets direction and order; only the immediate next phase is expanded into an execution-ready contract.

Before any phase begins:
1. Re-establish current repository, production, capability and dependency reality.
2. Expand the immediate next phase into a phase contract covering: goal, user value, verified starting state, in-scope work, explicit out-of-scope work, architecture/contracts affected, UI/UX decisions required, backend/infrastructure dependencies, data/schema implications, security/ownership implications, validation matrix, responsive/visual review requirements, documentation outputs, exit criteria and next-phase dependencies.
3. Merge the phase contract into the repository before implementation starts.
4. Do not fully expand later phases before their predecessors produce the evidence needed to plan them. Keep later phases at roadmap level unless an early cross-phase constraint must be locked.
5. When a phase completes, update the cycle roadmap from verified reality, then expand the next phase. Planning detail is not evidence that work is complete.

Accepting a phase contract does not authorize deployment, does not waive exact-head validation, and does not permit unrelated scope expansion.

## Session Continuity
At the beginning of substantial work:
1. Inspect relevant repository documentation.
2. Inspect relevant source files.
3. Identify the current phase, completed work, open work, and constraints.
4. Use Project context only as supplementary continuity.
5. Continue from verified repository state.

Missing conversation history does not mean the project has no existing decision.

## Documentation Updates
Durable decisions must update the appropriate source-of-truth file. Examples:
- approved reusable component → `COMPONENT_CATALOG.md`
- foundation/migration progress → `UI_MIGRATION.md`
- screen/information architecture → `SCREEN_REGISTRY.md`
- design workflow/tooling → `DESIGN_WORKFLOW.md`
- design-system rule → `UI_SYSTEM.md`
- important product/UI decision → `UI_DECISIONS.md`
- frontend architecture → `FRONTEND_ARCHITECTURE.md`
- infrastructure/resource/secret contract → `docs/architecture/INFRASTRUCTURE.md`

Update existing authoritative documentation rather than creating competing sources of truth.

## Scope Discipline
Follow the user's requested scope precisely. Do not redesign, migrate, refactor, deploy, or expand scope merely because it seems useful. Preserve approved RenderLab behavior unless changing it is required.

## GitHub Actions Budget Discipline
Final exact-head validation remains required; Actions quota, budget pressure, or runner unavailability does not waive a repository validation gate.

- When using connector-driven GitHub writes, batch cohesive multi-file changes into as few commits as practical so intermediate heads do not launch redundant install/build/browser workflows.
- Use `cancel-in-progress` only when interruption is safe and shared-resource cleanup can be reconstructed. The current cancellation-safe workflow contract is documented in `docs/architecture/INFRASTRUCTURE.md`.
- Do not cancel worker-backed generation lifecycles, serialized shared-resource workflows, or partially reconstructible R2 fixture workflows merely to save hosted minutes.
- If workflow behavior, fixture ownership, or cancellation safety changes, update `docs/architecture/INFRASTRUCTURE.md` in the same work.

## Validation
For frontend changes:
1. Verify the application builds.
2. Run `npm run verify:ui-purity` for changes that can affect feature/shell visible controls.
3. Verify affected routes/surfaces render and their existing lifecycle workflows cover shared primitive changes.
4. Check responsive behavior when relevant.
5. Inspect the rendered result.
6. Check reused components for regressions.
7. Confirm documentation reflects verified reality.

Compilation alone does not mean the UI task is complete.
