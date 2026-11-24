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

Phases 1–3 are closed with bounded evidence ([Phase 3 closeout](audits/PHASE3_BACKEND_P0_CLOSEOUT_2026-11-23.md)). Phase 4 backend P1 execution is closed with owner-accepted residual evidence gaps; see [Phase 4 closeout](audits/PHASE4_BACKEND_P1_CLOSEOUT_2026-11-24.md) for findings, exact release proof and limitations. On **2026-11-24 the project owner signed off the backend-first gate** and authorized frontend work to resume in **Integration Mode**, not Authorized Redesign Mode. [Phase 5 frontend polish](architecture/FRONTEND_PHASE5_POLISH_CONTRACT.md) is merged (#677); correctness work remains Integration Mode. P5-03 Admin Health presentation is deferred to a later Admin Observe stage. The owner subsequently authorized Phase 6 site-wide visual/motion design only; see [Design Language V2](ui/DESIGN_LANGUAGE_V2.md) and UI-085. No implementation until design review and a separate scoped contract. Future capabilities, new models and creative-productivity expansion remain deferred pending separate approval.

## Backend-first policy and exit gate

The backend-only execution gate for this cycle is **SIGNED OFF (2026-11-24)** by the project owner, following selected P0/P1 work, reviewed lifecycle/security/operational evidence and the two AI-assisted independent review rounds. The owner accepted the residual limits documented in the [Phase 4 exit ledger](audits/PHASE4_BACKEND_P1_CLOSEOUT_2026-11-24.md); a human independent engineer review is optional, not a frontend blocker. The third verification review is in progress and its result must be recorded separately. This is an explicit owner decision, not certification that every possible backend path is verified.

Frontend work resumes integration-first under AGENTS.md and existing approved UI decisions: preserve approved surfaces and behavior, use approved primitives and tokens, validate responsive and accessible rendered results. Authorized Redesign Mode still requires an explicit user request to reopen a named surface. New capabilities and backend changes require their own scope; implementation, merge, production release, migration and provider spend remain separate authorization gates. Owner-return settlement remains the beta policy, with retention/backlog/user-growth revisit triggers; no unattended finalization is promised.
