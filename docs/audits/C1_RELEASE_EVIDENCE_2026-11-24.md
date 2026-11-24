# C1 app-only release evidence — 24 November 2026

- [H1 #649](https://github.com/faresmohamed260/renderlab/pull/649): exact head 6779f4f5bd68db410194ae4aefdb8319f03ac243, eight checks green. Squash SHA 593095eeabd09791e16e67d3ba9d105a92244949.
- [Exact delta from batch B](https://github.com/faresmohamed260/renderlab/compare/564d0ed0ac677fce301aa94d64f9358e3f9d31ca...593095eeabd09791e16e67d3ba9d105a92244949): only native-generation-lifecycle.ts and reconcile-generation.ts runtime changes, plus docs, tests, retired test scripts and CI (including requirements-ci.txt). No worker runtime or migration changes.
- [Deployment Readiness #45319050068](https://github.com/faresmohamed260/renderlab/actions/runs/45319050068) passed 03:23:00Z; last required check 03:24:05Z. IDs in manifest.
- Independent team read-back: deployment dpl_5DugposwdpcoLui6XWdx3RnyScNr, created 2026-11-24T03:24:55.046Z, READY 03:25:15.742Z, alias assigned 2026-11-24T03:25:42.900Z; rollback dpl_A7eduj9tRV6k2Lvq5DC2Ly1qUGZP at 564d0ed0ac677fce301aa94d64f9358e3f9d31ca. No Modal deployment, renderer v10 and gateway/dispatcher v11 remain. Migration 0034 already installed.
- Site/health 200, FIBO available, invalid request 400 invalid_request. Pre-fixture active jobs, held reservations, outbox and request keys all zero; atomic count 3.
- Hosted proof pending: one authorized API generation, 22-minute unpolled wait, one Library load, succeeded, one asset and released reservation, zero residue.
