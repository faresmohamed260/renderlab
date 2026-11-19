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
**Consequences:** New worker/account use must first be assigned in the ownership authority and pass the repository gate. Required RenderLab Engineering Quality reads S.A.G.A.'s protected `main` ownership manifest and fails if the two repository partitions are no longer reciprocal or complete. Changing the partition requires an explicit owner decision recorded in both repositories and coordinated manifest updates. Worker deployment/reset, credential rotation, secret-store cleanup, and application production deployment remain separate operations.
**Current truth:** [`INFRASTRUCTURE.md`](./INFRASTRUCTURE.md#modal-project-ownership-isolation), [`config/modal-project-ownership.json`](../../config/modal-project-ownership.json), [`scripts/verify-modal-cross-repo-ownership.mjs`](../../scripts/verify-modal-cross-repo-ownership.mjs).

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

### ADR-005 — Separate Modal workloads and recover durable generation dispatch
**Status:** Accepted
**Scope:** Modal service and environment boundaries, generation dispatch ownership, durable attempt state, and cutover compatibility.
**Decision:** Keep a private gateway separate from workload-specific GPU workers. Select and bind the exact model/backend before dispatch and share model-neutral worker contracts across workloads. Commit the accepted job and dispatch intent atomically. A dedicated CPU-only dispatcher in the Modal gateway app reads the durable outbox, with a best-effort post-commit wake and a Modal-managed recurring schedule for recovery without web traffic. Retries and reconciliation reuse the original attempt identity; recoverable claims, durable deduplication, and admission expiry prevent a delayed delivery from starting a second render. Make the gateway and worker independently deployable per Modal environment with no production fallback.
**Rationale:** API requests and browser sessions are not durable execution owners. Separating the worker allows its lifecycle and capacity to evolve independently, while environment isolation and persisted attempt identity protect production and let in-flight jobs survive restarts, cutover, and rollback.
**Consequences:** The [Modal workload foundation contract](./MODAL_WORKLOAD_FOUNDATION_CONTRACT.md) defines the bounded implementation and verification requirements. The project owner approved this decision and contract on 2026-11-19. The contract governs implementation only once the approved records merge to protected main. Preserve ADR-002 ownership gates and ADR-004's separate release authority. Approval does not create a staging environment, authorize provider mutations or GPU spend, or establish that any runtime change is live. On 2026-11-20 the owner approved the direction, but not execution, for the one-time planned-outage exception recorded in the contract and [`MODAL_DIRECT_PRODUCTION_CUTOVER.md`](../operations/MODAL_DIRECT_PRODUCTION_CUTOVER.md). That exception does not weaken future separate-environment deployability and expires after the bounded operation closes or is abandoned. The first execution preflight then established that hosted Supabase publishable/secret API keys resolve only to built-in roles and cannot assume the two custom least-privilege roles. The owner authorized the repository correction on 2026-11-20. Modal therefore reaches those custom login roles through separate TLS-required PostgreSQL credentials, never through a Supabase API key, service-role credential, browser, or shared database login. This correction requires a new exact-source approval before hosted execution resumes.
**Current truth:** [Infrastructure](./INFRASTRUCTURE.md), [Modal project isolation contract](./MODAL_PROJECT_ISOLATION_CONTRACT.md), and [current production release](../production/current.json).
