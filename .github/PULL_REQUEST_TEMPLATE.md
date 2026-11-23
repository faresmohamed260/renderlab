## Change and scope

<!-- State what changed, why, and what is deliberately excluded. Do not include secrets or real user data. -->

## Verification

- [ ] Confirm branch is based on current `main`; rebase before merge when `main` advances.
- [ ] Required **exact PR-head** GitHub checks are green: Engineering Quality (`quality`), Documentation Governance (`governance`), Unit Coverage (`unit-coverage`), CodeQL (`javascript-typescript`), and Developer Portability (`clean-room (ubuntu-latest)`, `clean-room (windows-latest)`).
- [ ] Relevant local/CI checks completed: `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run build`, and `npm run verify:ui-purity` as applicable.
- [ ] `npm run verify:docs-governance` passed for docs or configuration changes.
- [ ] Relevant negative/ownership/recovery cases were checked, or are explicitly not applicable.

## Boundaries and release

- **Runtime or externally observable behavior:** <!-- None / describe and link contract. -->
- **Schema, provider, secrets or infrastructure impact:** <!-- None / describe approval, sequencing and rollback. -->
- **Release plan:** <!-- Not applicable (docs/unwired changes), or link the approved production release runbook and exact-source qualification. -->
- **Rollback and post-release evidence:** <!-- Not applicable, or link verified rollback anchor, smoke/cleanup and production-record sync plan. -->

Passing CI or merging is **not** authorization to deploy, dispatch provider work, or spend. Refer to [GOVERNANCE.md](../GOVERNANCE.md), [CONTRIBUTING.md](../CONTRIBUTING.md), and the [release runbook](../docs/operations/PRODUCTION_RELEASE_RUNBOOK.md).
