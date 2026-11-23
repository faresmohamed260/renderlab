# P0-02 typed runtime config — verified production cutover and documentation closure

**Observed:** 2026-11-23 on WANDA-616, using the signed-in Vercel dashboard and anonymous, read-only production GETs.

**Execution:** The P0-02 application is production-live, with an independently verified exact-head qualification and owner-provided Vercel alias timestamps. The canonical manifest and five mirrors are updated in PR #546; Production Documentation Sync is mandatory after merge and is recorded on the PR.

## Source and deployment

- [P0-02 PR #545](https://github.com/faresmohamed260/renderlab/pull/545) merged to protected main: SHA 30634662fb0319e3b6a943af2c89872ef607104b.
- Authenticated Vercel dashboard showed the new deployment Ready, Current, Production, and linked to renderlab.faresuniform.uk. The exact ID copied from the dashboard was dpl_ChVfct9Zsy2UY19QKKHYHetER46S. [Vercel detail](https://vercel.com/faresmohamedsalah10-1681/renderlab/ChVfct9Zsy2UY19QKKHYHetER46S). Another promotion was intentionally not performed.
- [Merged-main Deployment Readiness #45115997271](https://github.com/faresmohamed260/renderlab/actions/runs/45115997271) succeeded on that SHA. All six protected exact-source contexts passed. [PR #545 checks](https://github.com/faresmohamed260/renderlab/pull/545/checks) including CodeQL passed.
- **Rollback candidate:** previously verified READY release dpl_7ZvwdWi4B7qr1EkTnDYbBWNYPsBZ at application SHA e209bfee430c8e61789aeabc8a63579f05b0435c, as recorded in the [old manifest](../production/current.json). No rollback was performed.
- **Verified cutover timing:** Vercel Production created deployment at 2026-11-23T05:14:42.977Z, then assigned the alias at 2026-11-23T05:18:02.278Z (exact timestamps independently read by the owner from the production account). Its immutable origin is https://renderlab-pvx198rf4-faresmohamedsalah10-1681.vercel.app. Deployment Readiness #45115997271 completed successfully at 05:10:09Z on exact deployed SHA 30634662fb0319e3b6a943af2c89872ef607104b; the latest of the six exact-head protected checks finished at 05:11:13Z. Canonical qualifiedAt is 2026-11-23T05:11:13.000Z, earlier than cutover.

## Production names and test matrix

- WANDA Vercel Production environment dashboard showed all [16 required names](../operations/PRODUCTION_ENV_REQUIRED_NAMES.json), including RENDERLAB_CLOSED_BETA_ACCESS_ENFORCEMENT_ENABLED and RENDERLAB_FIBO_MASK_ENABLED. No variable value was revealed, printed, stored, or modified.
- [Schema](../../src/lib/config/runtime-env.ts) declares 10 Production baseline, 10 conditional feature, 22 optional, 18 test-only entries. Six feature entries are mandatory for this enabled Production beta; optional boolean defaults are false, numeric maintenance batch default 8, and required strings have no invented value. [Per-variable details](../architecture/RUNTIME_ENV_CONFIGURATION.md).
- WANDA offline Node run tests/unit/runtime-env-contract.test.mjs: **12/12 passed**. Covered valid fixture; each of 16 missing required names; malformed settings; enabled/disabled gateway credential combinations; typed flags; sanitized errors; exact bidirectional names; runtime call-site schema coverage; CI fixture; test-only restrictions; closed-beta and mask drift; maintenance default. PR and merged-main quality checks passed.

## Live GET verification

Read-only, anonymous GET to renderlab.faresuniform.uk:

| Path | HTTP | Observation |
| --- | --- | --- |
| / | 200 | Landing reachable |
| /create | 200 | Page reachable, not an invitation-enforcement test |
| /library | 200 | Page reachable |
| /activity | 200 | Page reachable |
| /api/health | 200 | Healthy response |
| /api/generation/jobs | 200 | available=true; fiboAvailable=true; fiboMaskAvailable=true; fiboAutoVglAvailable=false |
| /api/admin/health | 403 | Unauthenticated admin denied |

This demonstrates the mask capability is exposed, and unauthenticated Admin access is denied. It is not a fresh uninvited-user admission fixture; the new Production build preflight and fail-closed code provide the available access-enforcement evidence. All observed x-vercel-id prefixes were fra1::iad1. No generation ran.

## Release trigger provenance and record timing

- Vercel deployment details identify creator faresmohamed260 and source branch main at SHA 30634662fb0319e3b6a943af2c89872ef607104b. PR #545 merged at 2026-11-23T05:09:08Z, deployment was created at 05:14:42.977Z, and the alias was assigned at 05:18:02.278Z.
- The checked-in vercel.json has git.deploymentEnabled=false, so normal automatic Git deployment is disabled. Available metadata does not identify whether the operator invoked a CLI, a dashboard deployment, or another authenticated path. Do not infer the exact trigger command or the operator reason.
- The first release-record draft, PR #546, was created at 2026-11-23T13:06:34Z. This was after the 05:18:02.278Z cutover. Earlier documentation closure was blocked by lack of a verified alias timestamp; the owner supplied the value for this release record. This timing explains the documentation gap but does not independently establish the operator's earlier intent.
- The runbook now requires a production-record PR in the same operator sitting as cutover and a passed Production Documentation Sync before the next phase unit starts.

## Repository documentation closure

- The updated canonical manifest records application SHA 30634662fb0319e3b6a943af2c89872ef607104b, deployment dpl_ChVfct9Zsy2UY19QKKHYHetER46S, rollback dpl_7ZvwdWi4B7qr1EkTnDYbBWNYPsBZ at e209bfee430c8e61789aeabc8a63579f05b0435c, readiness #45115997271, all six check run IDs, qualifiedAt 2026-11-23T05:11:13.000Z, and cutoverAt 2026-11-23T05:18:02.278Z.
- PR #546 carries this audit, the manifest, all five current-production mirrors, and the same-sitting runbook line. Documentation governance and the local production-documentation mirror verifier must pass before merging.
- After the merge, dispatch only the standard Production Documentation Sync with exact deployed SHA 30634662fb0319e3b6a943af2c89872ef607104b; this workflow performs the final read-only Vercel/GitHub provider comparison. Its outcome is linked from PR #546. Do not begin P0-03 until it succeeds.
