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
**Reason:** Development spans independent ChatGPT/Codex/Claude sessions.  
**Consequences:** Agents inspect the repository and update durable documentation.

### UI-002 — Reuse before invention
**Status:** Accepted  
**Decision:** Existing approved component → project primitive → approved external source → adaptation → new component.  
**Reason:** Unconstrained generated UI causes drift and errors.  
**Consequences:** Search before creating UI.

### UI-003 — Additions do not imply redesign
**Status:** Accepted  
**Decision:** Feature additions integrate into the established visual language unless redesign is explicitly requested.  
**Reason:** Small requests should not cause unrelated visual changes.  
**Consequences:** Keep UI changes narrowly scoped.
