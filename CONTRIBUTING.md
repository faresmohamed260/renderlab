# Contributing to RenderLab

RenderLab is a source-visible closed-beta product and is not currently maintained as an open-source community project. Contributions are accepted by prior arrangement with the repository owner.

## Bug reports

Public GitHub issues are appropriate for non-sensitive reproducible defects. Include the affected area, reproduction steps, expected behavior, observed behavior, browser/runtime details when relevant, and screenshots or logs with secrets removed.

Security issues must follow [SECURITY.md](SECURITY.md) and must not be reported publicly.

## Development changes

Before proposing a change:

1. Read `AGENTS.md`, `PROJECT.md`, and the relevant architecture/UI contract.
2. Keep changes within RenderLab-owned product and infrastructure boundaries.
3. Do not invent environment values, credentials, provider IDs, or replacement infrastructure.
4. Run the repository quality checks relevant to the change.
5. Keep production deployment and provider-spend actions explicitly authorized.

## Quality checks

The supported local engineering boundary is Node 24.x + npm 11.x on native Windows or Linux/WSL2. Start with the repository-owned preflights, then install from the lockfile:

```bash
npm run doctor
npm run verify:text-policy
npm ci --no-audit --no-fund
```

For ordinary application changes, run the secret-free quality path at minimum:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run verify:engineering-quality
npm run verify:modal-project-ownership
npm run verify:ui-purity
npm run build
```

For Node unit-coverage visibility, run:

```bash
npm run test:unit:coverage
npm run verify:unit-coverage
```

The coverage command includes all tracked eligible `src/**/*.ts` and `src/**/*.tsx` product source in the denominator even when a file is never imported by the unit process; declaration-only `.d.ts` files are excluded. Reports are written under ignored `coverage/`. CI's **Unit Coverage** workflow publishes the same Node 24 unit totals in its job summary and retains only `coverage-summary.json` plus `lcov.info` as bounded evidence.

These commands require no production/shared-resource credentials. Unit coverage is a risk-discovery signal, not a substitute for feature-specific browser, integration, lifecycle, cleanup, provider-backed, release-candidate, or production-verification workflows. Those workflows may require protected credentials and explicit authorization; do not copy real secrets into the repository merely to satisfy local bootstrap, and do not weaken them to raise the unit percentage.

## Licensing

Submitting code or assets does not change the repository's licensing terms. See [LICENSE](LICENSE).
