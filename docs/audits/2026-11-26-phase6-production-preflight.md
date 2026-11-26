# Phase 6 production pre-flight — source main d30572ca (2026-11-26)

**Read-only assessment. No production release, generation, provider mutation, or migration is authorized.** This checklist is a review aid for [the production release runbook](../operations/PRODUCTION_RELEASE_RUNBOOK.md), not a release approval or replacement for provider read-back.

## Recorded starting point

- Candidate source at assessment: `d30572ca5ce11602cb04e64c164dc3eba0486fa7` (#840 integrated as `fd44b7ce67a785dc58fa28692beea8574119dd24`; docs-only #828 followed). Confirm the actual chosen release SHA and requalify that exact SHA if main moves.
- Canonical production record [current.json](../production/current.json): Batch G `34efe0b84ac1d950581d7b371b65bbf331852e89`, READY deployment `dpl_Fn5yNhNWz7owH9tMqi5cSbs3Y4WE`, alias `renderlab.faresuniform.uk`; recorded prior rollback `dpl_FLynJG8JYSmFYSJJWaTs3Hg6yU5i`. These are repository records, not a fresh provider read-back.
- Proposed rollback for a future cutover is the recorded Batch G deployment, **conditional** on independent same-project READY/source/alias/provider verification. Do not confuse Batch G's own older rollback with the next release's rollback anchor.
- Worker state recorded with Batch G: Modal renderer v13, gateway/dispatcher v14, migration 0037 ledger `20261124090831`, worker tree `4633471969d96f3b3a861a15edadd835253d85b4`. No worker or schema change is proposed by this assessment; verify live compatibility independently.
- Holds: #748, #603, #625, #813. Activity still returns signed-out 200; #813's proposed 307 redirect remains owner-blocked. Do not include held work in the release identity.
- The [source-readiness dossier](2026-11-25-release-readiness-main-0d83c87.md) records the exact integration evidence. It states true browser 200% zoom and final-main acceptance are outstanding and preserves informational axe/artwork findings; source readiness is not production readiness.

## Gate before any staging

| Check | Required evidence / failure boundary |
| --- | --- |
| Authorization | Owner authorizes the **exact** release source, components, scope and production action. Separate owner/head-engineer decision for any generation allowance; zero spend by default. |
| Source and protected main | Exact full SHA, six strict required contexts (quality, governance, unit-coverage, javascript-typescript, Ubuntu and Windows clean-room), their check-run IDs, and Deployment Readiness run ID/completion time on the actual release SHA. A docs-only PR head is not a deployed application SHA. |
| Final UI acceptance | Review exact candidate rendered desktop, phone and reduced motion against approved comps with the head engineer; complete genuine 200% browser zoom on Landing, Create, Library, History, Settings and Admin Observe at 1440 and 390 physical viewport widths. Record defects and fixes through exact-head qualification. |
| Optional lanes | Record final-main component review `45890640461`, axe `45890644948`, Slow4G `45890649322`, signed-out HTTP `45890653540`, and final Landing run ID/conclusion when available. These IDs identify dispatches, not an assertion that they passed. Do not rerun unchanged heads under the speed policy. |
| HTTP parity | Compare Batch G and exact candidate with separate credential-free production builds and redirects disabled: /create, /activity, /library → 200; /admin → 404; no Location; private-state markers present and no authenticated content. Preserve run and job IDs. #813's 307 would require separate approved contract/workflow change. |
| Environment | Independently check Production team/project and required variable **names** against `scripts/verify-vercel-env.mjs`, `docs/architecture/RUNTIME_ENV_CONFIGURATION.md`, `docs/operations/PRODUCTION_ENV_REQUIRED_NAMES.json`; verify beta and mask flags true by authorized read-back and behavior. Never expose values. |
| Vercel status | GitHub reported non-required “Vercel - renderlab: Account is blocked” on #840. The GitHub status does **not** establish the reason or current account state. This session's Vercel connector GET on project and Batch G deployment returned HTTP 403 for team `faresmohamedsalah10-1681` (scope access missing), so no live deployment, billing or alias claim is verified here. Owner/operator must obtain team-scoped access, inspect account/billing restriction and project/deployment/alias in Vercel, resolve any block through authorized account channels, then independently prove staging works before promotion. Do not infer that a green required GitHub context clears this block. |
| Rollback and operations | Read back Batch G as same-project READY with exact source and live alias; capture compatible Modal app IDs/versions and check empty queue/unresolved dispatches, service health and authorized access. Stop if identities or compatibility differ. |
| Generation scope | History/recovery action entry is newly reachable although ordinary Create submit/dispatch/payload code is unchanged. Head engineer should propose whether one disposable release-specific smoke is necessary; owner must separately authorize exact spend. No smoke workflow dispatch from this checklist. |

## If separately authorized later

1. Freeze the exact source and capture qualification, owner approval, preflight, live rollback deployment and worker pair. Stage the exact SHA on Vercel **without moving the alias**; independently verify Production target, READY, deployment ID/URL, clean Git provenance and exact SHA. Investigate the account-blocked status before this step.
2. For app-only changes, record no Modal publish and read back existing compatible pair. A worker-changing release requires a separate authorized protected-main workflow and exact resulting app/version evidence. Never apply the held #799 multi-output schema proposal as part of this checklist.
3. Promote only the verified staged deployment under the approved owner instruction. Read back the exact alias target, team/project, source and UTC `updatedAt`; verify health. If a smoke was separately approved, follow the runbook's exclusive-window stage receipt and one-generation reconciliation, or use its record-first path. A possible spent attempt is not retryable without fresh approval.
4. In the same operator sitting, update `docs/production/current.json` and the five human mirrors from provider read-back through a reviewed PR, run documentation governance, then Production Documentation Sync with the **deployed** SHA. Later docs commits may leave main ahead of production. Record any approved live lifecycle evidence and zero residue separately.

## What can break; response

- Vercel team account block or incorrect scope prevents staging/provider read-back: stop before alias movement, have owner inspect account access and restriction.
- Wrong Git ref, READY target, environment variables, invitation/mask flags, or alias source can expose an incompatible or inaccessible app: stop, preserve Batch G alias, verify exact source and scope.
- New History settlement/retry/cancel entry may affect owner jobs even though normal submit is unchanged: check lifecycle and reservation reconciliation under separately approved evidence; never treat a rendered UI as proof.
- Worker or schema incompatibility, active queue or unresolved dispatch blocks safe cutover: stop and reconcile with an authorized operator; no speculative worker reset, migration or token change.
- Failed or ambiguous generation may have spent the allowance: keep the exclusive freeze, reconcile the original fixture and original run ID, seek separate cleanup authorization where needed; no automatic rerun.

**Rollback if authorized:** use the independently reverified Batch G same-project deployment `dpl_Fn5yNhNWz7owH9tMqi5cSbs3Y4WE` as the prospective Vercel rollback target, read back alias assignment time/source and health, then reconcile canonical record and mirrors. If workers changed under a separately authorized release, restore captured compatible exact Modal app versions and verify their new history records. Rollback itself requires owner authorization in normal operation under the runbook.
