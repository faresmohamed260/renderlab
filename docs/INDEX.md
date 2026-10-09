# Documentation Index and Authority Taxonomy

Updated: 2026-10-10

This file is the repository-wide navigation and documentation taxonomy for RenderLab. It explains what each class of document means, how apparently conflicting records are resolved, and what does or does not establish backlog authority. It does not replace the domain-specific authorities it points to.

`AGENTS.md` remains the repository-specific AI operating entry point. `PROJECT.md` remains the compact project handoff. This index refines authority **within the repository** so future sessions can distinguish present reality, accepted policy, plans, reference material, and historical evidence.

## Document classes

A document has one **primary class** based on its repository role. Individual sections inside a document can still have different content states; for example, a current-state tracker may preserve historical closure evidence.

| Class | Meaning | Typical RenderLab examples |
| --- | --- | --- |
| **Entry point** | Navigation and handoff material that directs readers to the correct authorities. It should summarize or route, not silently override a more specific domain authority. | `AGENTS.md`, `PROJECT.md`, `docs/INDEX.md` |
| **Normative policy** | Accepted rules, decisions, constraints, implementation contracts, or operating procedures that future work must follow until explicitly superseded. | `docs/ui/UI_DECISIONS.md`, `docs/ui/UI_SYSTEM.md`, `docs/ui/DESIGN_WORKFLOW.md`, `docs/ui/VISUAL_NORTH_STAR.md`, `docs/ui/BRAND_SYSTEM.md`, accepted `*_IMPLEMENTATION_CONTRACT.md` / `*_CONTRACT.md` files, `CONTRIBUTING.md`, `SECURITY.md` |
| **Current-state registry** | Verified inventory or operational record describing what currently exists, is approved, is owned, or is deployed. | `docs/STATUS.md`, `docs/ui/SCREEN_REGISTRY.md`, `docs/ui/COMPONENT_CATALOG.md`, `docs/architecture/PRODUCT_CAPABILITIES.md`, current-state/current-production sections of `docs/architecture/INFRASTRUCTURE.md` |
| **Current-state tracker** | Active sequence/progress record for a migration, roadmap, or bounded workstream. | `docs/ui/UI_MIGRATION.md`, `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md` |
| **Historical evidence** | Provenance, prior state, completed-checkpoint evidence, superseded records, audits, or closure material retained so decisions can be traced. Historical evidence does not become current instruction merely because it remains in the repository. | `docs/archive/**`, dated audit evidence, completed/superseded contract and closure records, historical sections explicitly labeled inside current authorities |
| **Reference guide** | Explanatory research, source lists, examples, media, or background material that helps implementation but does not independently define current state or policy. | `README.md`, `docs/architecture/PASSKEY_WEBAUTHN_RESEARCH.md` unless promoted by a normative authority, `docs/ui/LANDING_MEDIA_SOURCES.md`, `docs/readme/**` assets |

### Mixed and lifecycle-sensitive documents

Some documents legitimately change role over time:

- An accepted implementation contract is **normative policy** for its bounded execution scope while active. After the work closes or the contract is superseded, the contract is primarily **historical evidence**, except for constraints that a current authority explicitly carries forward.
- An audit or assessment is **historical evidence** by default. A current authority may explicitly name a particular assessment as the current accepted finding or score; that reference does not make every older audit current.
- Architecture documents may contain both normative rules and current-state registries. Use the section that is authoritative for the question being answered rather than treating the entire file as one undifferentiated state record.
- A roadmap or tracker can contain historical rows for completed work. Its current-work/current-state section governs active sequencing; old rows remain evidence only.

## Machine-readable governance metadata

`docs/governance/documents.json` is the lint-managed metadata registry for RenderLab's high-authority documentation set. `docs/governance/document-metadata.schema.json` defines the accepted shape and enums. The registry records document kind, authority class, lifecycle, owner role, governance review date/interval, and explicit document-level supersession links.

- `lastReviewed` means the document's governance role/lifecycle/ownership classification was reviewed on that date. It does **not** silently re-verify every historical evidence statement or external-provider fact inside the document.
- Current managed documents have a bounded `reviewIntervalDays`; `npm run verify:docs-governance` fails when that governance review becomes stale.
- Document-level `supersedes` / `supersededBy` links must be reciprocal. UI decision-level supersession is also linted from the explicit fields in `docs/ui/UI_DECISIONS.md`.
- The managed registry is intentionally narrower than the complete historical corpus. Historical evidence remains governed by the taxonomy in this index until it is explicitly cataloged or archived; metadata absence does not promote historical text into current authority.
- Physical history/archive separation is a separate repository-organization concern; this linting layer does not move files merely to satisfy metadata.

The credential-free verifier also checks canonical structured status enums, closed-contract unchecked task boxes, duplicate normalized `Current ...` H2 sections, broken local documentation references, and consistency between `docs/production/current.json` and all five human production mirrors. The dedicated **Documentation Governance** workflow runs the same command on documentation/governance pull requests and pushes to `main` with `contents: read` only and no protected service credentials.

## Content-state vocabulary

Use these terms when writing or interpreting repository documentation:

- **Normative** — accepted policy, decision, constraint, or contract that future work is required to follow until it is explicitly changed or superseded.
- **Current state** — verified present repository, product, operational, or deployment reality. A current-state claim must be supportable from the repository and, when applicable, exact production evidence.
- **Historical** — prior state, provenance, completed-checkpoint evidence, or a superseded decision kept for traceability. Historical text must not be used as a current instruction when a newer current authority supersedes it.
- **Future intent** — proposed, planned, deferred, or recommended work. Future intent is not evidence that implementation exists, is accepted, is merged, or is deployed.
- **Advisory/reference** — explanatory or research material that can inform work but cannot override implementation reality, current-state authorities, or normative decisions.

These content-state labels are independent from workflow lifecycle labels such as implementation/verification/merge/deployment status.

## Canonical lifecycle/status vocabulary

Current-state authorities must separate **execution**, **repository**, **verification**, **deployment**, and **UI/design maturity** instead of chaining unrelated terms into one ambiguous status phrase. Historical records may retain their original wording when they are clearly identified as historical or closure-time evidence.

### Execution state

Use one execution state for a bounded work item:

- `PLANNED` — accepted scope exists and implementation has not started.
- `IN PROGRESS` — implementation or acceptance work is actively underway.
- `IMPLEMENTED` — the intended change exists at a candidate repository state, but required acceptance/closure is not yet complete.
- `COMPLETE` — the bounded scope and its required acceptance work are closed.
- `DEFERRED` — accepted future intent exists, but execution is intentionally inactive.
- `SUPERSEDED` — a newer authority replaces this work item or state for current interpretation.
- `CANCELLED` — the work item was intentionally abandoned and is not a current plan.

`COMPLETE` is an execution/closure statement only. It does not imply merge or deployment.

### Repository state

Use repository state separately when it is relevant:

- `UNMERGED` — the candidate exists only outside protected `main`.
- `MERGED` — the accepted change is present on protected `main`.

`MERGED` does not imply production deployment.

### Verification qualifiers

Verification terms describe evidence, not lifecycle position:

- `EXACT-HEAD VERIFIED` — required acceptance checks passed on the exact candidate head.
- `MERGED-MAIN VERIFIED` — required post-merge checks passed on the exact protected-`main` merge SHA.
- `PRODUCTION-VERIFIED` — required acceptance evidence was observed against the exact current production source/environment.
- `HUMAN-REVIEWED` — required human evidence review passed.
- `USER-APPROVED` — the user explicitly approved the relevant design/product result.
- `DOCUMENTATION-SYNC VERIFIED` — the release documentation synchronization gate passed.

Avoid bare `VERIFIED` in new **current-state status labels** when the evidence scope can be stated precisely. Historical text may preserve the older shorthand.

### Deployment state

Use one deployment state only when deployment is meaningful for the work item:

- `NOT DEPLOYED` — an application/runtime change is not included in the current production application source.
- `PRODUCTION-LIVE` — the exact current production application source includes the application/runtime change and the release was verified.
- `NOT APPLICABLE` — the work item is documentation, research, CI/tooling, or another change for which application deployment is not a meaningful lifecycle step.

`PRODUCTION-VERIFIED` and `PRODUCTION-LIVE` are different: the former describes evidence; the latter describes current application deployment state. A workstream can also have live external resources (for example a worker or recovery bucket) without making its RenderLab application change `PRODUCTION-LIVE`; name that resource-specific live state in prose.

### UI/design maturity is separate

`APPROVED`, `LOCKED`, and comparable UI/design labels describe accepted design maturity or change control, not implementation, merge, or deployment. `docs/ui/SCREEN_REGISTRY.md` owns its screen-maturity vocabulary. Never infer `PRODUCTION-LIVE` from `APPROVED` or `LOCKED`.

### Status-writing rules

For new or edited current-state blocks:

1. State only the dimensions that apply, preferably as explicit fields such as `Execution:`, `Repository:`, `Verification:`, and `Deployment:`.
2. Do not use `LIVE` alone for the RenderLab application; use `PRODUCTION-LIVE`. For a worker/provider/resource, name the resource explicitly.
3. Do not use `NOT DEPLOYED by that workstream` as current deployment state. That phrase is closure provenance; label it `Closure-time status` and use the current-production authority for present deployment truth.
4. Do not treat `MERGED-MAIN VERIFIED`, `HUMAN-REVIEWED`, `USER-APPROVED`, or `DOCUMENTATION-SYNC VERIFIED` as lifecycle stages.
5. Preserve historical wording when changing it would rewrite provenance; add a current or closure-time label rather than silently changing what was true at the time.
6. When a later cumulative release supersedes an earlier `NOT DEPLOYED` closure record, keep the closure record historical and state present deployment separately as `PRODUCTION-LIVE`.
7. GitHub Issue open/closed state is not a lifecycle authority unless a repository authority explicitly delegates that bounded meaning.

Canonical examples:

- `Execution: COMPLETE; Repository: MERGED; Verification: EXACT-HEAD VERIFIED, MERGED-MAIN VERIFIED; Deployment: NOT DEPLOYED.`
- `Execution: COMPLETE; Repository: MERGED; Verification: PRODUCTION-VERIFIED; Deployment: PRODUCTION-LIVE.`
- `Execution: DEFERRED.`

## Repository source precedence

Use the following precedence when resolving claims about repository or product state. Always prefer the authority closest to the question's domain, and investigate discrepancies rather than silently choosing a convenient source.

1. **Repository implementation and configuration** — source code, migrations, checked-in configuration, workflows, and tests establish what is implemented in the repository.
2. **Exact current-production manifest and verified release evidence** — establish what application source/configuration is actually deployed. `docs/production/current.json` is the canonical machine-readable production record. The `RENDERLAB_CURRENT_PRODUCTION_SHA` blocks in `PROJECT.md`, `docs/ui/UI_MIGRATION.md`, `docs/ui/SCREEN_REGISTRY.md`, and `docs/architecture/INFRASTRUCTURE.md`, plus `docs/STATUS.md`, are validated human-readable mirrors/consumers of that manifest rather than independent production facts. The permanent Production Documentation Sync additionally compares the manifest read-only against Vercel/GitHub before release-documentation closure.
3. **Current-state registries** — establish the current approved/operational inventory for their domain when consistent with verified implementation and production evidence.
4. **Current-state trackers** — establish active migration/roadmap progress and sequencing for their bounded workstream.
5. **Normative policy and decision documents** — establish accepted constraints and intended rules for current/future work. If implementation violates a still-current normative rule, record and resolve the discrepancy; do not reinterpret the implementation as silently superseding the rule.
6. **Architecture/domain registries and accepted domain records not already covered above** — establish scoped ownership/capability facts where explicitly authoritative.
7. **Reference guides and research** — explanatory aid only unless a normative/current authority explicitly promotes a finding.
8. **Historical evidence** — provenance and verification history only; never a competing current authority.
9. **GitHub Issues** — optional execution/task tracking only where a repository authority explicitly references or delegates to them.

This order answers **what is true now**. For the separate question **what rules must a new change follow**, current normative policy is binding even when old implementation patterns differ. When documentation and implementation disagree materially, audit the implementation and update the appropriate authoritative repository record; do not fill the gap from chat history or assumption.

## Backlog and sequencing authority

GitHub Issues are **not** independent architecture, migration, deployment, or backlog authority.

- An issue may track execution when an accepted repository document explicitly references it or delegates a bounded task to it.
- Issue labels, milestones, titles, or open/closed state do not by themselves create a product phase, authorize deployment, change architecture, or reorder an accepted migration.
- For UI migration/foundation sequencing, `docs/ui/UI_MIGRATION.md` remains the current tracker authority unless a newer normative repository decision explicitly changes that responsibility.
- Domain roadmaps such as `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md` govern only their accepted bounded domain and defer exact deployment truth to the current-production authorities.
- Future work written in a reference guide, historical audit, design artifact, chat, or issue remains future intent until promoted through the appropriate repository authority.

## Primary documentation map

Use this map to find the appropriate current authority without treating every Markdown file as interchangeable.

### Repository entry and handoff

- `AGENTS.md` — repository-specific AI/development operating rules.
- `PROJECT.md` — compact project handoff, product direction, major current-state context, and current-production pointer.
- `docs/INDEX.md` — this taxonomy, source-precedence rule, and backlog semantics.
- `docs/governance/documents.json` — machine-readable governance metadata for the high-authority document set; schema: `docs/governance/document-metadata.schema.json`.
- `CHATGPT_PROJECT_INSTRUCTIONS.txt` — lightweight ChatGPT project bootstrap; it routes back to repository authorities and does not outrank them.

### Product, architecture, infrastructure, and operations

- `docs/architecture/FRONTEND_ARCHITECTURE.md` — frontend architecture authority.
- `docs/architecture/INFRASTRUCTURE.md` — infrastructure/resource/security boundaries plus exact current-production authority.
- `docs/architecture/PRODUCT_CAPABILITIES.md` — capability/current product contract registry.
- `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md` — bounded account/settings roadmap and current workstream tracker.
- `docs/operations/INCIDENT_RESPONSE_AND_RECOVERY.md` — accepted incident/recovery operating procedure.
- `docs/architecture/*_IMPLEMENTATION_CONTRACT.md`, `*_CONTRACT*.md`, and comparable scoped contracts — normative while active; historical evidence after closure/supersession unless a current authority carries a constraint forward.

### UI and design system

- `docs/ui/UI_MIGRATION.md` — current UI migration/foundation tracker and sequencing authority.
- `docs/ui/SCREEN_REGISTRY.md` — current screen/route/viewport registry and UI production-state record.
- `docs/ui/COMPONENT_CATALOG.md` — current approved shared-component registry.
- `docs/ui/UI_DECISIONS.md` — accepted UI decision/precedent log; supersession statements inside it control older decisions.
- `docs/ui/UI_SYSTEM.md` — normative UI-system rules.
- `docs/ui/DESIGN_WORKFLOW.md` — normative design-to-implementation workflow.
- `docs/ui/VISUAL_NORTH_STAR.md` — normative visual direction for authorized redesign work.
- `docs/ui/BRAND_SYSTEM.md` and `docs/ui/CREATIVE_DEVELOPMENT.md` — accepted brand/creative-development guidance within their stated scopes.
- `docs/ui/*_IMPLEMENTATION_CONTRACT.md` and comparable scoped contracts — normative while active; historical evidence after closure/supersession unless explicitly carried forward.

### Status, audits, archives, and supporting material

- `docs/production/current.json` — canonical machine-readable current-production application/deployment record.
- `docs/STATUS.md` — concise current status/deployment summary validated against the production manifest; detailed domain authorities still govern their own non-production facts.
- `docs/audits/**` — evidence and assessments. A current authority must explicitly identify an audit/assessment if its finding is meant to represent current accepted state.
- `docs/archive/**` — historical evidence only.
- `docs/readme/**` — README media/supporting assets, not governance authority.
- Research/source-list/reference documents remain advisory unless a normative/current authority explicitly promotes a finding.

## Conflict handling

When two repository records appear to conflict:

1. Identify whether the question is about implemented repository state, deployed production state, current operational inventory, active sequencing, or normative policy.
2. Use the closest authority from the precedence rules above.
3. Verify important current-state claims against implementation or exact deployment evidence as applicable.
4. Treat explicitly historical/superseded material as provenance, not present instruction.
5. Correct the appropriate authoritative repository document when reality and documentation differ. Do not create another competing source of truth merely to explain the conflict.

ChatGPT Project context and the current chat remain supplementary/temporary continuity only, as defined by `AGENTS.md`; neither can override the repository.
