# RenderLab — Product Charter

**Role:** Current normative product direction | **Owner:** Product / single maintainer | **Accepted:** 2026-11-23

## Purpose and origin

RenderLab is a personal **generative-media tool suite**, now also an **AI Engineer portfolio project** that the owner can share with friends and demonstrate to employers. It began because a local 12 GB RTX 3060 and ComfyUI were too constrained for newer media models; moving workflows to Modal created the need for a practical web interface. The goal is a dependable, well-engineered product that hides complex inference infrastructure while making its architecture and operational evidence inspectable.

**Audience:** The owner (daily use), a small circle of invited friends (real beta feedback), and hiring teams/engineers assessing the repository (clear evidence of applied AI and backend engineering).

## Product principles

- **Simple by default, powerful when needed.** Offer sensible defaults and progressively disclose relevant advanced parameters; never expose raw ComfyUI graphs as the primary UX.
- **A suite, not a single model.** Define user-level creative operations, typed capabilities and reliable job/media lifecycles independently of providers, model families and media format.
- **Truth before breadth.** Only claim a capability as available after end-to-end evidence on its intended deployment; distinguish current, planned and retired implementations.
- **Operational credibility.** Prefer owner-scoped privacy, predictable costs, explicit failures, bounded retries, traceability, recovery, tests and reproducible releases over feature volume.
- **Readable engineering.** AI-assisted design, implementation and decision documents are welcome; code, tests and evidence must stand on their own for an external reviewer.

## Capability map

| **Supported now — deployed** | **Planned — not yet available** | **Retired history — not offered for new submissions** |
| --- | --- | --- |
| FIBO image creation (text-to-image); image editing with references; source-preserving masked image edits. Generated media can be viewed and managed using existing account-scoped workflows. | Additional image models and utilities: **upscale**, **face swap**, **background removal**; expanded image pipelines; **video creation/editing** and **audio**. Each requires separate technical qualification, cost approval, safety review and truthful UI release. | Earlier **FLUX**, **Qwen** and **REDGraft LTX** workflows; legacy **Video**, **Animate** and **Upscale** submission paths. Existing saved media may remain readable. These retired implementations are history: **video remains a genuine future product goal**, not an abandoned category. |

**Source-of-truth boundary:** This charter determines *where the product is going*. [Product Capabilities](architecture/PRODUCT_CAPABILITIES.md) documents *what actually works now*; the [production manifest](production/current.json) names *what is deployed*. Planned work here is **not** an approved feature implementation or a public availability claim.

## Boundaries and success

**Non-goals:** A large public SaaS, billing/monetization platform, mass onboarding or marketing, and premature multi-tenant scaling. Preserve invitation-only access and reasonable personal-use defaults.

**Hard constraints:** Single maintainer; closed beta; a finite **Modal spending limit** and GPU/runtime availability; no assumption of unlimited worker capacity. Make cost and privacy limits explicit in every future feature contract.

**Portfolio success criteria:** A new engineer can understand the system, run and test its backend, trace a job across services, understand secure configuration, and validate recovery/rollback from checked-in evidence. End-to-end reliability, maintainability, truthful public claims and a professionally defensible architecture matter more than the number of models.

## Near-term roadmap — numbered backend/product reliability cycle

Phase 1 beta correctness and Phase 2 operational reliability are closed. **Phase 3: Backend professional baseline (P0)** is the next owner-approved execution phase, governed by the [five-unit contract](architecture/BACKEND_PROFESSIONAL_BASELINE_P0_CONTRACT.md). Execute Units 1–5 in order: truthful README/claims; typed configuration; threat/owner isolation; deterministic state-machine contracts; deterministic critical-path tests. The previously contemplated **creative productivity** phase is deferred until the full backend-first gate. Subsequent P1 provider abstraction and engineering follow-ons are roadmap-level only and are not authorized by this P0 contract.

## Backend-first policy and exit gate

**Backend only for the next execution cycle.** Do not add new feature UI or redesign surfaces while backend engineering gaps remain; emergency correctness and security repairs are permitted. Use the employer-grade backend assessment to prioritize small, reviewed PRs, per the progressive-phase planning rules in AGENTS.md.

**Frontend work resumes only after:** (1) all **P0 and P1** items selected from the backend assessment are closed with merged exact-head-tested PRs; (2) the backend's **state machine, extensibility boundary, startup configuration, security threat model, critical-path tests, operational recovery and contributor bootstrap** have credible evidence, with no unresolved critical finding; and (3) an owner-reviewed backend gate records what passed and expressly authorizes a new frontend phase. This charter does **not** authorize any implementation, migration, production deployment or new email by itself.
