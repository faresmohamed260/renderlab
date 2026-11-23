# Release history and change notes

RenderLab does **not** use a public semantic-version release stream or GitHub Releases as the authority for what reached production. In this closed beta, merging into `main` is not a deployment.

## Find what actually shipped

| Question | Authoritative record |
| --- | --- |
| What application source, deployment, alias assignment and rollback anchor are live now? | [Canonical production manifest](docs/production/current.json) (machine-readable; updated only after verified cutover) |
| What is the currently supported product surface? | [Status](docs/STATUS.md) and [current capabilities](docs/architecture/PRODUCT_CAPABILITIES.md) |
| What can an employer truthfully claim and where is the evidence? | [Technical claims](docs/TECHNICAL_CLAIMS.md) |
| How was a release qualified, deployed, verified and rolled back? | [Production release runbook](docs/operations/PRODUCTION_RELEASE_RUNBOOK.md) |
| What shipped in previous accepted changes? | Dated [release and verification audits](docs/audits/) and [historical cutover record](docs/operations/MODAL_DIRECT_PRODUCTION_CUTOVER.md), cross-checked against the recorded release SHA |

## Recording the next release

1. **Before cutover:** qualify exact source SHA and required checks, identify rollout authorization and a known-good rollback anchor per the [runbook](docs/operations/PRODUCTION_RELEASE_RUNBOOK.md).
2. **After cutover:** verify the real provider/deployment state, then update [the production manifest](docs/production/current.json) and its mandated human-readable mirrors in the same release sitting; run Production Documentation Sync. Do not use this file to substitute for those records.
3. **For history:** place bounded verification and rollback evidence under [`docs/audits/`](docs/audits/) and link it from the applicable audit or production records. Record whether hosted generation was authorized and cleaned up.
4. **For unshipped work:** PRs, provider-adapter experiments, docs-only commits and planned video/audio remain source history, **not** release entries.

This changelog is a **navigation and release-notes convention**, not a manually maintained second production ledger. It deliberately avoids hand-copying mutable deployment IDs or claiming unreleased code is live.
