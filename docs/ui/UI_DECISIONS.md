# UI Decisions

Records durable UI/UX decisions so independent AI sessions do not reverse them. This is not a general changelog.

## Format
### UI-XXX — Title
**Status:** Proposed | Accepted | Superseded  
**Decision:**  
**Reason:**  
**Consequences:**  
**Supersedes:** optional

---

### UI-001 — Repository is the source of truth
**Status:** Accepted  
**Decision:** Project code and repository documentation—not conversation history—define current UI state.  
**Reason:** Development spans independent AI sessions and tools.  
**Consequences:** Agents inspect the repository and update durable documentation.

### UI-002 — Reuse before invention
**Status:** Accepted  
**Decision:** Existing approved RenderLab component → RenderLab primitive → approved external source → adaptation → new component. Saga components are reference material and are not automatically approved RenderLab components.  
**Reason:** Unconstrained generated UI causes drift and errors, while blindly reusing legacy implementation would carry old constraints into the fresh build.  
**Consequences:** Search approved RenderLab sources before creating UI. Legacy/Saga code may inform behavior but requires deliberate approval before reuse.

### UI-003 — Additions do not imply unrelated redesign
**Status:** Accepted  
**Decision:** Once a RenderLab visual language or surface is approved, feature additions integrate into it unless redesign is explicitly requested or required by an approved product decision.  
**Reason:** Small requests should not cause unrelated visual changes.  
**Consequences:** Keep UI changes scoped while still allowing deliberate redesign during the current fresh-build foundation phase.

### UI-004 — Saga is reference, not specification
**Status:** Accepted  
**Decision:** The previous Studio implementation in `saga` is a behavioral, backend, and lessons-learned reference. Its visual design, navigation, component hierarchy, routing, and frontend architecture are not authoritative for RenderLab.  
**Reason:** RenderLab is a fresh build intended to improve existing UX and support a much broader set of ComfyUI capabilities.  
**Consequences:** Agents may inspect Saga to understand proven behavior and integrations but must not copy its UI or architecture by default.

### UI-005 — Progressive capability disclosure
**Status:** Accepted  
**Decision:** RenderLab may support sophisticated backend workflows, but the default user experience exposes only controls necessary and useful for the current user task. Advanced, technical, and model-specific controls are revealed contextually or through progressive disclosure.  
**Reason:** Backend capability should grow without making the product intimidating for average users.  
**Consequences:** New ComfyUI features must be translated into understandable user-facing tasks and controls instead of directly mirroring workflow/node complexity into the primary UI.

### UI-006 — ComfyUI is the engine, not the interface
**Status:** Accepted  
**Decision:** User-facing information architecture and terminology are organized around creative goals and understandable operations, not ComfyUI nodes, graph structure, or implementation terminology.  
**Reason:** RenderLab should remain intuitive while retaining the flexibility of a powerful ComfyUI backend.  
**Consequences:** Technical workflow concepts may exist internally or in deliberately advanced experiences, but ordinary generation flows should use task-oriented language and sensible defaults.

### UI-007 — Design for capability growth without pre-exposing it
**Status:** Accepted  
**Decision:** RenderLab's internal architecture should anticipate additional workflows, models, media inputs, parameters, outputs, continuation actions, and post-processing capabilities without requiring all of them to appear in the initial UI.  
**Reason:** ComfyUI provides substantial capabilities beyond the currently productionized Saga workflows, and hard-coding the application around today's small workflow set would recreate existing limitations.  
**Consequences:** Architecture should be capability-driven; product surfaces remain intentionally curated and can expose capabilities incrementally as they become production-ready and useful.

### UI-008 — Create and Library are the primary product destinations
**Status:** Accepted  
**Decision:** The initial top-level information architecture centers on `Create` and `Library`. Activity and Settings are utility surfaces; Media Viewer is contextual. Models, workflows, media types, and individual creative operations are not separate top-level destinations by default.  
**Reason:** The primary user loop is creating media and working with durable media. Backend/workflow taxonomy should not dominate navigation.  
**Consequences:** Application-shell design should make Create and Library primary. New backend workflows do not automatically add navigation destinations.

### UI-009 — One creation workspace, multiple creative operations
**Status:** Accepted  
**Decision:** The initial product uses one Create workspace for Create Image, Edit Image, Create Video, and Animate Image rather than four separate applications/screens. Operation resolution may use intent and supplied inputs, with explicit selection available when ambiguity matters.  
**Reason:** These operations share the same core loop—intent, inputs, relevant controls, asynchronous generation, durable result, continuation—and separating them prematurely would fragment the experience.  
**Consequences:** Create must adapt contextually to the resolved operation. Future operations should first be evaluated as additions/continuations within this workspace before receiving dedicated top-level surfaces.

### UI-010 — Library represents reusable creative assets, not only history
**Status:** Accepted  
**Decision:** Library is the durable media workspace for both generated outputs and persistent uploaded assets.  
**Reason:** Verified Saga behavior shows references are reusable assets, and RenderLab's domain model treats media as reusable inputs/outputs rather than disposable generation attachments.  
**Consequences:** Library design should support discovery, organization, inspection, reuse as inputs, and compatible continuation actions; it should not be reduced to a chronological generation-history screen.

### UI-011 — Operational complexity stays secondary
**Status:** Accepted  
**Decision:** Generation jobs and meaningful runtime state remain visible through Activity and global status where useful, but worker/provider/failover infrastructure is not a routine user-facing management surface.  
**Reason:** Asynchronous execution state is valuable to users; infrastructure routing is not part of their creative task.  
**Consequences:** Surface actionable states and failures while keeping worker selection, provider routing, and failover bookkeeping internal.

### UI-012 — Next.js App Router is the frontend foundation
**Status:** Accepted  
**Decision:** RenderLab uses Next.js with React, TypeScript, and the App Router. Server Components are the default composition model; Client Components are introduced deliberately for interactive creative/workspace behavior. Tailwind CSS is the primary styling mechanism and shadcn/ui is an approved primitive source where appropriate.  
**Reason:** The architecture fits the Vercel deployment target, provides real routing/layouts and server/client boundaries, removes the need for Saga-style manual hash routing, and supports a highly interactive application without forcing the entire frontend into a client-only SPA.  
**Consequences:** Public product routes follow the App Router. Product APIs and server-only integrations can be colocated behind stable application boundaries. Broad `'use client'` trees, route-per-workflow design, and direct browser-to-worker integrations are not approved patterns.

### UI-013 — Prefer maintained component mechanics over bespoke reinvention
**Status:** Accepted  
**Decision:** RenderLab defaults to an approved component ecosystem consisting of shadcn/ui + Radix, Motion for React, Motion Primitives, Aceternity UI, Magic UI, React Bits, and individually reviewed shadcn-compatible registries. Custom RenderLab product composition remains expected, but solved generic component/interaction mechanics should not be rebuilt from scratch without a concrete reason.  
**Reason:** Building and debugging generic dialogs, menus, magnetic interactions, morphing transitions, drag physics, animated controls, and similar mechanics from scratch consumes time while mature implementations already exist.  
**Consequences:** Before custom implementation, agents must search the approved sources documented in `COMPONENT_CATALOG.md`. Adopted components are reviewed for accessibility, reduced motion, touch/responsive behavior, performance, licensing, dependency cost, and token compatibility. Once adopted into RenderLab, the project-owned version becomes the reusable authority.

### UI-014 — Persistent shell does not own feature UI
**Status:** Accepted  
**Decision:** The persistent application shell owns navigation, compact route context, account access, lightweight Activity/global-attention access, and the route-content region. Feature-specific UI such as the Create composer, references, generation controls/results, Library grids/cards, and feature toolbars remain owned by their feature surfaces.  
**Reason:** The first historical Figma shell exploration mixed shell and Create UI, which would prematurely couple Phase 2 shell implementation to Phase 3 product design. The reviewed v0.2 refinement separated these concerns before implementation.  
**Consequences:** Phase 2 may implement stable shell chrome without locking the Create or Library layout. Idle shell state should not show an unnecessary persistent “ready” status; global status becomes prominent only when user attention is useful.

### UI-015 — Output media is the primary Create-mode choice
**Status:** Accepted  
**Decision:** The default Create experience presents the primary explicit choice as output media—`Image` or `Video`—rather than exposing backend workflow IDs, model ecosystems, or separate top-level Edit/Animate modes. Image is the initial default output.  
**Reason:** Average users understand the output they want more readily than backend workflow taxonomy, and the same Create workspace can resolve the appropriate operation from output intent plus supplied inputs.  
**Consequences:** The primary composer may expose a compact Image/Video selector. Workflow and model resolution remains behind product capability logic unless a user-facing model choice provides concrete value.

### UI-016 — Reference media resolves Create context
**Status:** Accepted  
**Decision:** Supplying compatible reference media changes the creative operation context without requiring a separate screen: Image output + image reference resolves to image editing; Video output + image reference resolves to image animation/video generation from the reference. The UI must communicate this resolved context and allow the reference to be removed or replaced.  
**Reason:** References are first-class reusable inputs, and automatic contextual resolution keeps the default workflow simple while preserving explicit control over the intended output type.  
**Consequences:** Create should display concise contextual language such as editing/animating the attached reference rather than adding permanent Edit/Animate navigation or mode clutter.

### UI-017 — Default Create controls show useful values, not backend categories
**Status:** Accepted  
**Decision:** Essential controls in the default Create composer should communicate their current user-relevant value (for example `1:1`, `16:9`, `5 s`) instead of abstract category labels such as “Aspect”, “Format”, or “Duration” when the value can be shown directly. Model-specific and technical tuning stays contextual or Advanced.  
**Reason:** Concrete values are faster to understand and reduce the visual/mental cost of the default composer. Historical v0.1 visual review showed category labels created unnecessary indirection.  
**Consequences:** Essential control chips/buttons should display current values and open an appropriate selector when activated. Advanced disclosure must not become a second always-visible settings panel.

### UI-018 — Penpot is the ongoing visual design workspace
**Status:** Accepted  
**Decision:** Penpot is the default ongoing visual UI/UX design workspace for RenderLab when a direct workspace is available. Open SVG handoff artifacts under `design/penpot/` are an approved repository-backed fallback and import source. The previous Figma `RenderLab Design System` file is retained as historical reference only. The repository remains authoritative over every design tool/artifact.  
**Reason:** The project requires a free/open visual-design workflow that does not block progress on proprietary free-tier MCP/tool-call limits or connector availability.  
**Consequences:** New meaningful visual design work should use Penpot when practical or versioned interoperable SVG handoff artifacts when direct Penpot automation is unavailable. Existing repository decisions extracted from Figma remain valid. A design artifact alone still does not make implementation `APPROVED`; real responsive rendered verification remains required.

### UI-019 — Create runtime states reflect real execution and preserve user work
**Status:** Accepted  
**Decision:** Generate is disabled when required task inputs are missing and while a submission is already in progress. Running-state copy/progress must be derived from real job/orchestration state when available rather than fabricated percentage progress. Submission/runtime errors appear locally without clearing the user's prompt, references, or settings. A generation is presented as complete only after the durable media result has been persisted.  
**Reason:** Saga proved that generation is asynchronous and persistence/worker state are meaningful product concepts; fake progress or destructive error handling would reduce trust and make recovery harder.  
**Consequences:** The Create UI must preserve task state across recoverable errors, expose concise actionable failure feedback, surface meaningful runtime state, and transition to result/continuation UI only after persistence succeeds. Result actions are capability-derived rather than hard-coded to one workflow.

### UI-020 — Initial Library stays media-first and contract-driven
**Status:** Accepted  
**Decision:** Library v0.1 is a unified durable-media surface backed by RenderLab `media_assets`. It starts with newest-first browsing, a compact `All / Images / Videos` filter, a responsive media grid, an empty state that points back to Create, and deep links into Media Viewer. Prompt/created-time metadata may be shown when present; optional dimensions/duration must not be required for the layout.  
**Reason:** The current RenderLab media contract reliably owns durable media identity, kind, MIME, creation time, product media URLs, and generation provenance, but does not yet own favorites, collections, persistent-upload names, or a rich searchable organization schema. Saga proves those richer behaviors are useful, but copying its full filter/collection/batch-management surface before RenderLab owns the data would create fake or legacy-coupled product state.  
**Consequences:** Do not add Creatives/Uploads tabs, model/date/favorites filters, density toggles, collections, batch actions, rename, or delete merely because Saga has them. Persistent uploaded assets remain part of Library's accepted long-term purpose under UI-010; introduce them through a RenderLab-owned persistent upload contract rather than legacy `studio_uploads`. The initial grid must work correctly even when the Library is empty or asset dimensions are null.

### UI-021 — Media Viewer is the contextual asset workspace
**Status:** Accepted  
**Decision:** `/library/[assetId]` is the deep-linked Media Viewer for one durable RenderLab asset. Media is visually primary; prompt, creation time, media kind and available dimensions/duration are secondary metadata. Compatible continuation actions come from the shared capability model rather than a Viewer-specific hard-coded action list.  
**Reason:** A stable asset route supports inspection, reuse and future media actions without overloading grid cards or creating modal-only state. The same durable asset identity is already proven as a generation input in Create.  
**Consequences:** Library cards navigate to the route rather than opening a separate legacy-style modal. Viewer actions must use opaque `media-asset` IDs and product APIs. Provider/worker/ecosystem/R2 data remain internal. A cross-route continuation handoff to Create must be implemented as a stable product contract before Viewer buttons are presented as functional; do not render fake Edit/Animate actions.
