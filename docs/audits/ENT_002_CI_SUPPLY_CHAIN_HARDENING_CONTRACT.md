# ENT-002 — CI and supply-chain hardening contract

Date: 2026-10-05
Status: COMPLETE / VERIFIED / MERGED / NOT DEPLOYED

## Goal
Reduce RenderLab's CI reproducibility and GitHub Actions supply-chain risk without changing application behavior, product UX, shared infrastructure, provider routing, or deployment state.

## Verified starting state
- Baseline repository head: `956eb9715a92652e0a3e0a614f556300d3d21d18`.
- The repository contains 50 GitHub Actions workflow files.
- 46 workflows still contain `npm install`; Engineering Quality already uses `npm ci --no-audit --no-fund`.
- Current external action references use floating major tags including `actions/checkout@v4`, `actions/setup-node@v4`, `actions/setup-python@v5`, and `actions/upload-artifact@v4` across the workflow estate.
- `.github/dependabot.yml` already includes a monthly `github-actions` update stream.
- JavaScript/TypeScript CodeQL scanning is not currently present.
- ENT-001 closed the five source-level P0 findings and the authoritative reassessment remains 8.1/10; CI simplification, CodeQL, and immutable action pinning are still P1 findings.

## User value
The product gains more reproducible verification, lower workflow supply-chain exposure, and automated JavaScript/TypeScript security scanning while preserving the exact runtime contracts already verified in production and repository integration tests.

## In scope

1. **Deterministic project dependency installation**
   - Replace repository dependency installation in GitHub Actions from `npm install` to `npm ci --no-audit --no-fund` wherever the workflow is consuming the checked-in root `package-lock.json`.
   - Preserve intentional global/tool-specific installs unless they are separately proven compatible with a deterministic alternative.
   - Preserve Node versions, caches, workflow inputs, environment contracts, concurrency, cleanup semantics, and test commands unless a change is required solely to keep the install path equivalent.

2. **Immutable external action references**
   - Replace floating external GitHub Action major tags with full immutable commit SHAs after verifying the selected commits correspond to the currently intended maintained major releases.
   - At minimum cover every current use of `actions/checkout`, `actions/setup-node`, `actions/setup-python`, and `actions/upload-artifact`.
   - Keep a human-readable version comment next to pinned SHAs where practical so review and Dependabot updates remain understandable.
   - Keep the existing Dependabot `github-actions` ecosystem enabled so pin maintenance is automated rather than manual drift.

3. **CodeQL JavaScript/TypeScript scanning**
   - Add a dedicated GitHub Actions workflow for CodeQL analysis of JavaScript/TypeScript.
   - Use least-privilege permissions required by CodeQL (`contents: read` plus the required security-events permission; package access only if proven necessary).
   - Run on pull requests and protected-main pushes unless repository behavior requires a narrower trigger to avoid duplicate or unsafe execution.
   - Pin CodeQL actions to immutable commits under the same external-action policy.

4. **Verification and documentation**
   - Add or extend repository verification so future workflow edits cannot silently reintroduce floating external action tags or root-project `npm install` where `npm ci` is required.
   - Update current engineering/status documentation only with behavior that is actually merged and verified.
   - Record any intentionally exempt install/action reference with a concrete reason instead of weakening the guard globally.

## Explicitly out of scope
- Application/runtime code changes, UI changes, product behavior changes, or deployment.
- Upload admission quotas/rate limiting and retained-storage quotas.
- Origin / `Sec-Fetch-Site` mutation defense.
- `server-only` boundary expansion.
- Coverage collection or coverage gates.
- Cross-platform EOL/dev-environment normalization and `.gitattributes`.
- Durable observability backend or alerting changes.
- Operations/disaster-recovery runbooks, RPO/RTO, restore exercises, or escalation policy.
- Supabase schema/RLS/Auth changes, Cloudflare R2 resource changes, Modal/provider/worker changes, new secrets, or scheduler changes.
- Reusable-workflow/composite-action consolidation beyond what is strictly necessary to implement the three in-scope controls safely.
- Large-module decomposition or CSS refactoring.

Those remain follow-on enterprise-hardening work after ENT-002 is verified.

## Architecture and security constraints
- Existing exact-SHA release governance, owner authorization, service-role boundaries, generation lifecycle, fixture cleanup, and shared-resource ownership rules remain unchanged.
- External actions must be pinned to full commit SHAs, not mutable branches or major/minor tags.
- Pinning must not silently upgrade an action across an unreviewed major-version boundary.
- Deterministic install changes must continue consuming the checked-in lockfile and must fail when the lockfile and package manifest disagree.
- CodeQL must not receive write permissions unrelated to security result publication.
- No production deployment is authorized by this contract.

## Data and infrastructure implications
No application database migration, hosted Auth mutation, R2 configuration mutation, worker deployment, provider routing change, or production environment change is planned.

GitHub repository workflow/configuration files are the only intended operational surface. Code scanning results are repository security metadata, not product runtime data.

## Validation matrix
Before implementation closure:
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run build`
- `npm run verify:engineering-quality`
- exact-head Engineering Quality
- exact-head CodeQL JavaScript/TypeScript analysis
- exact-head affected integration/lifecycle workflows required by the repository's existing trigger matrix
- merged-main Engineering Quality and CodeQL after implementation merge

Static repository verification must prove at least:
- no root-project workflow install remains as bare `npm install` when it should use `npm ci`;
- every external GitHub Action reference in `.github/workflows` uses a full 40-character commit SHA unless an explicitly documented repository-local action is used;
- current intended action families remain on their reviewed major releases after pinning;
- Dependabot still owns the `github-actions` update ecosystem;
- the CodeQL workflow targets JavaScript/TypeScript and has no unrelated elevated permissions.

## Documentation outputs
On verified implementation:
- update `docs/STATUS.md` to record the merged CI/supply-chain controls;
- update the authoritative enterprise reassessment/closure record with exact verification evidence and remaining P1/P2 gaps;
- update architecture/infrastructure documentation only if an actually implemented workflow/security contract belongs there.

This contract is execution/history evidence and must not become a competing source for current runtime architecture.

## Exit criteria
ENT-002 is complete only when:
1. root-project dependency installation is deterministic across applicable workflows;
2. current external GitHub Actions are immutable-SHA pinned with intended major-version equivalence verified;
3. CodeQL JavaScript/TypeScript scanning is present and passes at the exact implementation head;
4. repository verification prevents regression of the new workflow rules;
5. relevant exact-head and merged-main checks pass;
6. authoritative documentation reflects verified reality; and
7. no deployment, shared-resource mutation, application behavior change, or unrelated refactor occurred.

After closure, rerun the enterprise scorecard conservatively and plan the next phase from the remaining weakest areas rather than expanding ENT-002 retroactively.

## Verified closure

ENT-002 implementation PR #330 squash-merged as `99a8db8c8038262114d5b5da535cf2e7dea56ad1` after exact implementation head `8ea553579c801d25fb3de23739d4d53803020851` completed all **68** same-head workflow runs successfully, including Engineering Quality, CodeQL JavaScript/TypeScript, the release-candidate matrix and provider-backed Video Generation Integration.

Merged-main verification also passed on the exact merge SHA:

- Engineering Quality `37289968963` — success;
- CodeQL `37289968955` — success.

The implementation closes deterministic root workflow installs, immutable external Action pinning, JavaScript/TypeScript CodeQL, and regression enforcement for those controls. It changed no application/runtime behavior, UI, Supabase schema/RLS/Auth policy, R2 resource configuration, provider/worker routing, secrets, scheduler, or production deployment.

The authoritative detailed post-ENT-002 reassessment is `ENT_002_CI_SUPPLY_CHAIN_HARDENING_ASSESSMENT.md`, which records the conservative enterprise score moving from **8.1/10 to 8.2/10** and lists the remaining P1/P2 gaps. This contract remains execution/history evidence rather than a competing current architecture source.
