# RenderLab Governance

This document defines RenderLab's human decision rights. It is normative policy for repository, architecture, security, infrastructure, and production decisions. Technical access does not by itself grant governance authority, and an AI agent, automation, issue, chat message, or passing CI run cannot self-authorize a protected human decision.

## Governance principles

- The repository is the durable project record; durable decisions must be recorded in the applicable repository authority.
- Merge authority and production authority are separate. Merging to `main` never implies deployment, provider mutation, spend authorization, or alias cutover.
- Decision rights are assigned by role. One person may currently hold multiple roles, but a combined-role decision must not be described as independent or multi-person review.
- Automated checks are acceptance evidence, not human approval.
- Emergency authority is limited to active risk containment and must be reconciled back into normal repository governance after the incident is contained.

## Human roles

| Role | Primary decision rights |
| --- | --- |
| **Project Owner** | Final product stewardship; appointment/delegation of the other human roles; production/deployment authorization; approval of provider-spend actions; approval of destructive or irreversible shared-resource actions; resolution of cross-domain governance conflicts. |
| **Repository Maintainer** | Merge decisions after required checks; repository settings; CI/review policy; documentation-governance maintenance; repository-level exceptions that do not independently change product, architecture, security, infrastructure, or production policy. |
| **Product Authority** | Product behavior, scope, sequencing, capability intent, and user-value decisions within accepted technical/security boundaries. |
| **Product Design Authority** | UI/UX, visual-system, interaction, information-architecture, and user-facing acceptance decisions within accepted product/technical/security boundaries. |
| **Engineering / Architecture Authority** | Application architecture, cross-cutting technical contracts, ownership boundaries, persistence/integration patterns, and architecture exceptions. |
| **Security / Operations Authority** | Authentication, authorization, secrets, privacy/security controls, data exposure, retention/deletion policy, incident response, and security-sensitive operational policy. |
| **Infrastructure Authority** | CI/CD infrastructure, deployment plumbing, shared cloud resources, provider configuration, reliability controls, and infrastructure ownership boundaries. |
| **Production Operator** | Execution of an already-authorized deploy, rollback, cutover, alias/routing change, or other production action using current provider access. Execution authority is not approval authority. |
| **Implementer** | Implementation inside the accepted scope. Implementation alone grants neither merge nor production authority. |

A person may hold several roles. Where this policy requires more than one role and the same person holds them, one explicit decision may exercise those roles together unless repository/provider protection requires independent review. The record must identify the roles exercised and must not claim independent review that did not occur.

## Decision boundaries

| Change | Human authority required before the durable change is accepted |
| --- | --- |
| Routine implementation or documentation within existing policy | Repository Maintainer after required automated checks. |
| Product capability/scope/sequencing change | Product Authority; Repository Maintainer for merge. |
| UI/UX or visual-system policy change | Product Design Authority; add Product Authority when product behavior or scope changes; Repository Maintainer for merge. |
| New or changed architecture boundary, service ownership, persistence model, or integration contract | Engineering / Architecture Authority; Repository Maintainer for merge. |
| Authentication, authorization, secrets, privacy/security controls, data exposure, retention/deletion, or incident-response policy | Security / Operations Authority; add Engineering / Architecture Authority when an architecture boundary changes; Repository Maintainer for merge. |
| CI/CD, provider configuration, shared infrastructure, or deployment-gate policy | Infrastructure Authority; add Security / Operations Authority when the trust/security boundary changes; Repository Maintainer for merge. |
| Governance policy or role assignment | Project Owner plus every domain authority whose decision rights are materially changed; Repository Maintainer for merge. |
| Production deploy/cutover, provider-spend action, destructive shared-resource mutation, or irreversible production operation | Explicit Project Owner authorization. A Production Operator or Infrastructure Authority may execute only after that authorization unless the emergency rule below applies. |
| Production rollback to a known verified anchor | Project Owner authorization in normal operation; emergency containment may use the rule below. |

Repository or provider permissions remain the identity/access source for who can technically perform an action. This policy does not grant credentials or access that the repository/provider has not granted.

## Production and deployment authority

Production state is canonicalized in `docs/production/current.json`; operational deployment constraints remain in `docs/architecture/INFRASTRUCTURE.md`.

1. Production deployment, alias/cutover movement, provider-spend actions, shared-resource mutation, worker redeploy/reset, secret-store changes, and credential rotation remain separately authorized operations even when the implementation is merged.
2. A normal production deploy/cutover requires explicit Project Owner authorization, exact release-candidate identity, successful required qualification, and a known rollback anchor.
3. The Production Operator executes the authorized action and verifies provider read-back. Possession of provider credentials is not permission to broaden the authorized scope.
4. After a successful production change, the canonical production manifest and all required human-readable mirrors must be reconciled to verified provider state before repository closure.
5. Any proposal to enable automatic Git-to-production deployment, broaden production credentials, bypass a release gate, or make production authorization implicit requires Infrastructure Authority, Security / Operations Authority when the trust boundary changes, Project Owner approval, and Repository Maintainer merge acceptance.

## Emergency authority

During an active security or production incident, the Project Owner may authorize immediate containment. A Production Operator or Security / Operations Authority with current provider access may also take the smallest reversible action necessary to prevent material additional harm when waiting for ordinary approval would materially increase active risk.

Emergency actions may include rollback to a known verified anchor, disabling a compromised integration, revoking/rotating a compromised credential, stopping an unsafe mutating workflow, or applying a narrowly scoped protective provider configuration.

Emergency authority does **not** authorize unrelated feature work, convenience refactors, permanent weakening of controls, speculative destructive cleanup, or undocumented architecture changes. After containment, the responsible human must:

1. preserve the incident timeline and exact operator actions in the appropriate evidence/runbook record;
2. reconcile repository implementation, provider state, production pointers, and documentation with reality;
3. run the smallest authoritative verification that proves the affected boundary;
4. obtain the normal domain approvals for any durable follow-up change.

## GitHub review and CODEOWNERS

Current GitHub enforcement was audited on 2026-10-10: the repository has one human collaborator/owner, no repository teams, no required pull-request review, no rulesets, and branch protection requires the Engineering Quality `quality` status check. There is no `CODEOWNERS` file.

A `CODEOWNERS` file is **not appropriate yet** because there is no stable multi-human/team role mapping to route meaningful independent ownership review. Adding a wildcard owner would not create independent governance and could imply review separation that does not exist.

Add `.github/CODEOWNERS` only when a stable role-to-GitHub-user/team mapping exists and the same reviewed change documents the intended branch-protection behavior, including whether code-owner review is actually required and how deadlock/single-maintainer scenarios are handled.

## Governance changes and review

- Governance changes must be made through reviewed repository changes and pass the required exact-head validation.
- `GOVERNANCE.md` is registered in `docs/governance/documents.json` and reviewed at least every 90 days, and sooner when maintainer/provider ownership, deployment authority, security authority, or the review model materially changes.
- `AGENTS.md` governs AI/session operating behavior, but it cannot grant an AI agent any human role defined here.
- `CONTRIBUTING.md` governs contributor workflow; `SECURITY.md` governs vulnerability reporting; `docs/operations/INCIDENT_RESPONSE_AND_RECOVERY.md` governs incident execution. Those documents must remain consistent with this human authority model.
