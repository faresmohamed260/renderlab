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

For ordinary application changes, run at minimum:

```bash
npm ci
npm run lint
npm run typecheck
npm run test:unit
npm run verify:ui-purity
npm run build
```

Feature-specific browser, integration, lifecycle, cleanup, and production-verification workflows may also be required.

## Licensing

Submitting code or assets does not change the repository's licensing terms. See [LICENSE](LICENSE).
