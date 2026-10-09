# Closed Execution Contracts

This directory preserves completed bounded implementation/execution contracts as historical evidence. These files document what was authorized and verified at execution time; they are **not active architecture or UI authority** merely because the repository retains them.

- `architecture/` contains closed Account/Settings/security implementation contracts and amendments. Current policy/state lives in `docs/architecture/ACCOUNT_SETTINGS_CAPABILITY_ROADMAP.md`, `PRODUCT_CAPABILITIES.md`, `INFRASTRUCTURE.md`, and other present-tense authorities.
- `ui/` contains closed UI execution contracts. Current UI authority lives in `docs/ui/UI_DECISIONS.md`, `SCREEN_REGISTRY.md`, `UI_SYSTEM.md`, `COMPONENT_CATALOG.md`, and the current-only `UI_MIGRATION.md` tracker.
- `docs/architecture/MODAL_PROJECT_ISOLATION_CONTRACT.md` remains outside this history directory because it is an active cross-repository ownership boundary.

Do not resume an archived contract as active work. If a future change needs an old constraint, verify that a current authority still carries it or explicitly promote the requirement through a new accepted contract/decision.
