# P0-02 typed runtime config — live release verification (documentation closure pending)

**Observed:** 2026-11-23 on WANDA-616, using the signed-in Vercel dashboard and anonymous, read-only production GETs.

**Execution:** Runtime config code MERGED; live Production deployment observed CURRENT and READY; canonical manifest / Documentation Sync NOT CLOSED because the exact alias updatedAt / cutover time remains unverified. This partial audit does not supersede docs/production/current.json.

## Source and deployment

- [P0-02 PR #545](https://github.com/faresmohamed260/renderlab/pull/545) merged to protected main: SHA 30634662fb0319e3b6a943af2c89872ef607104b.
- Authenticated Vercel dashboard showed the new deployment Ready, Current, Production, and linked to renderlab.faresuniform.uk. The exact ID copied from the dashboard was dpl_ChVfct9Zsy2UY19QKKHYHetER46S. [Vercel detail](https://vercel.com/faresmohamedsalah10-1681/renderlab/ChVfct9Zsy2UY19QKKHYHetER46S). Another promotion was intentionally not performed.
- [Merged-main Deployment Readiness #45115997271](https://github.com/faresmohamed260/renderlab/actions/runs/45115997271) succeeded on that SHA. All six protected exact-source contexts passed. [PR #545 checks](https://github.com/faresmohamed260/renderlab/pull/545/checks) including CodeQL passed.
- **Rollback candidate:** previously verified READY release dpl_7ZvwdWi4B7qr1EkTnDYbBWNYPsBZ at application SHA e209bfee430c8e61789aeabc8a63579f05b0435c, as recorded in the [old manifest](../production/current.json). No rollback was performed.
- **Alias cutover timestamp unverified.** Do not back-calculate it from PR merge times or the dashboard relative-age display. Get provider alias updatedAt before writing canonical cutoverAt.

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

## Pending release documentation closure

1. Reverify exact Vercel alias updatedAt for the observed current deployment (and independently confirm domain target).
2. Update canonical docs/production/current.json with the observed application source, deployment ID and immutable URL, retained rollback deployment, exact six merged-main check-run IDs, qualifiedAt and provider cutoverAt. Synchronize all five human mirrors per AGENTS.md.
3. Run npm run verify:docs-governance, merge its PR on green exact-head checks, and invoke the standard Production Documentation Sync using the exact deployed SHA.

Until these steps finish, **runtime release observed but repository release-documentation closure incomplete**. No extra deploy, production workflow dispatch, secret, schema, Modal or other-repository change was performed when recording this audit.