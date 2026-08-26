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
