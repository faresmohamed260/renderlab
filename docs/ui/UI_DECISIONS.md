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
**Reason:** The first Figma shell exploration mixed persistent chrome with Create-specific composition, which would prematurely couple Phase 2 shell implementation to Phase 3 product design. Figma v0.2 separates these concerns.  
**Consequences:** Phase 2 may implement stable shell chrome without locking the Create or Library layout. Idle shell state should not show an unnecessary persistent “ready” status; global status becomes prominent only when user attention is useful.
