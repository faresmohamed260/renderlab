# Architecture Decisions

This file is RenderLab's current authority for durable **non-UI, cross-cutting architecture decisions** and their supersession relationships. It answers why a binding architecture boundary exists and whether that decision is still accepted.

Current implementation, configuration, resource, capability, and deployment truth remains in the domain authority closest to the question, especially `FRONTEND_ARCHITECTURE.md`, `INFRASTRUCTURE.md`, `PRODUCT_CAPABILITIES.md`, and `docs/production/current.json`. Detailed implementation/verification/rollout chronology remains historical evidence under `docs/audits/**`, `docs/history/contracts/**`, or `docs/archive/**`.

`docs/ui/UI_DECISIONS.md` remains the authority for UI/UX, product-interaction, visual-system, and information-architecture decisions. A hybrid decision must have one primary authority based on its dominant concern and may cross-reference the other domain; do not maintain two competing normative copies.

## Record contract

Architecture decision records use `ADR-NNN` identifiers and H3 headings. Each current record contains:
- `Status`: `Proposed`, `Accepted`, or `Superseded`;
- `Scope`: the architecture boundary governed by the record;
- `Decision`: the durable accepted or proposed choice;
- `Rationale`: why the boundary exists;
- `Consequences`: constraints that follow for future work;
- `Current truth`: links to the current repository authorities that describe implementation/configuration reality;
- `Supersedes` / `Superseded by` only when an explicit decision replacement exists.

`Proposed` records are future intent and are not binding architecture authority. `Accepted` records are normative until explicitly superseded. `Superseded` records remain here only for decision traceability; detailed closure evidence belongs in historical evidence rather than this current authority.

### ADR-001 — Reuse shared infrastructure without legacy application coupling
**Status:** Accepted
**Scope:** Shared Supabase and Cloudflare R2 resource ownership
**Decision:** RenderLab may reuse the existing Saga/Studio Supabase project and Cloudflare R2 account/resources, but RenderLab owns independently named application tables, storage prefixes, orchestration, APIs, and product contracts. Legacy Saga/Studio application tables and contracts are reference material and are not RenderLab storage or architecture merely because the physical providers are shared.
**Rationale:** Reusing proven provider resources avoids unnecessary replacement infrastructure while preserving an independently evolvable RenderLab application/data boundary.
**Consequences:** Shared-provider access never authorizes coupling to or repurposing legacy application state. Creating replacement provider resources or changing the shared-resource ownership partition requires a new explicit decision and the applicable infrastructure/security authority.
**Current truth:** [`AGENTS.md`](../../AGENTS.md#shared-infrastructure-rule), [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md#shared-resource-decision).

### ADR-002 — Modal project ownership is explicitly partitioned and fail-closed
**Status:** Accepted
**Scope:** Modal account ownership and credential selection
**Decision:** RenderLab and S.A.G.A. use a reciprocal explicit Modal account partition. RenderLab automation/runtime may use only accounts assigned to RenderLab by the checked-in ownership configuration, and credential selection must fail closed rather than treating an omnibus credential set or historical app name as ownership authority.
**Rationale:** The two repositories share provider history and may temporarily share broad credential storage, so repository-enforced ownership must prevent accidental cross-project deployment or spend even when credentials technically exist.
**Consequences:** New worker/account use must first be assigned in the ownership authority and pass the repository gate. Changing the partition requires an explicit owner decision recorded in both repositories. Worker deployment/reset, credential rotation, secret-store cleanup, and application production deployment remain separate operations.
**Current truth:** [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md#modal-project-ownership-isolation), [`config/modal-project-ownership.json`](../../config/modal-project-ownership.json).

### ADR-003 — Privileged credential-bearing modules are server-only by enforced boundary
**Status:** Accepted
**Scope:** Browser/server module ownership for privileged credentials and data access
**Decision:** Credential/data-bearing privileged modules use explicit server-only boundaries, and client modules must not runtime-import server-owned modules. The boundary is enforced mechanically rather than relying on naming conventions or developer intent.
**Rationale:** A visible file hierarchy is not a sufficient security boundary; build-time and CI enforcement reduce the risk of privileged credentials or data-access code entering the browser graph.
**Consequences:** New directly credential-bearing modules in the governed source boundary must carry the server-only marker, client/server imports must remain compatible with the gate, and pure deterministic server helpers used directly by Node tests are not marked mechanically when they do not own privileged data or credentials.
**Current truth:** [`FRONTEND_ARCHITECTURE.md`](./FRONTEND_ARCHITECTURE.md#explicit-server-only-ownership--ent-006), [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md#credential-bearing-source-boundary--ent-006).

### ADR-004 — Merge and production release are separate explicit operations
**Status:** Accepted
**Scope:** Application release and production cutover
**Decision:** A merge to protected `main` does not deploy RenderLab. Automatic Git-to-Vercel production deployment remains disabled; production deployment/cutover is a separately authorized operation bound to an exact release candidate, required qualification, provider read-back, and a known rollback anchor.
**Rationale:** Separating repository acceptance from production mutation prevents a passing merge from silently changing live application state and preserves an auditable release/rollback boundary.
**Consequences:** Documentation/CI/tooling changes may advance `main` without changing production. Enabling automatic deployment or making production authorization implicit requires a new explicit infrastructure/security/governance decision and the applicable human approvals.
**Current truth:** [`GOVERNANCE.md`](../../GOVERNANCE.md#production-and-deployment-authority), [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md#vercel-deployment-boundary), [`PROJECT.md`](../../PROJECT.md#current-production---2026-10-09).
