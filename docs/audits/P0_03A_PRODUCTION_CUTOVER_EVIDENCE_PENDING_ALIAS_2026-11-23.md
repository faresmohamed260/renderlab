# P0-03a production cutover evidence — exact alias timestamp pending

**Observation date:** 2026-11-23 UTC. **Status:** Application deployed to the Vercel custom domain and read-only routes healthy; **production documentation closure incomplete pending independently verified Vercel alias `updatedAt` and immutable deployment-origin read-back**. This is an observational audit, **not** the canonical production record or proof of a passed Documentation Sync.

## Source, tests and qualification

- [PR #548](https://github.com/faresmohamed260/renderlab/pull/548) merged expected-red sentinel regression tests with seven security cases skipped-with-reason and one positive alert case. On the old implementation, enabling those regressions yielded **7 failing cases / 1 passing**.
- [PR #549](https://github.com/faresmohamed260/renderlab/pull/549) merged the fix as exact application SHA `2a64d4ccc03e8f8ce1e415d298687321179efb50`. All 20 dedicated sanitizer cases enabled and passed. Offline test suite **275 passed / zero failed / zero skipped**, production build, typecheck, engineering quality, UI purity and documentation governance passed on WANDA.
- All six merged-main protected checks passed on the deployed SHA. Exact check-run IDs and completion times:

| Required check | GitHub check-run ID | Completed (UTC) |
| --- | ---: | --- |
| governance | 137749634998 | 2026-11-23T14:09:56Z |
| unit-coverage | 137749633446 | 2026-11-23T14:10:09Z |
| clean-room (ubuntu-latest) | 137749633212 | 2026-11-23T14:10:19Z |
| quality | 137749633631 | 2026-11-23T14:10:21Z |
| clean-room (windows-latest) | 137749633707 | 2026-11-23T14:10:36Z |
| javascript-typescript | 137749634151 | 2026-11-23T14:11:26Z |

- [Deployment Readiness run #45191297596](https://github.com/faresmohamed260/renderlab/actions/runs/45191297596) ran on exactly `2a64d4ccc03e8f8ce1e415d298687321179efb50` and completed successfully around **2026-11-23T14:10:39Z**. Combined six-check qualification time for the canonical manifest will be **`2026-11-23T14:11:26.000Z`**.

## Verified Vercel stage and custom-domain promotion

- The signed-in Production project **`faresmohamedsalah10-1681/renderlab`** recognized full application SHA `2a64d4ccc03e8f8ce1e415d298687321179efb50` on `main` in Create Deployment. An authorized browser deployment was initiated and built to **Ready** in **Production / Staged**, with **deployment ID `dpl_7X5xzARHaT7nXkzoHMoHiGxi1xfa`** copied directly from the dashboard's Copy ID control.
- Promotion explicitly included **`renderlab.faresuniform.uk`** and `renderlab-omega.vercel.app`; the signed-in deployment dashboard subsequently displayed **Production / Current**, **Ready**, the custom domain, source branch `main`, and commit `2a64d4c`. [Vercel deployment page](https://vercel.com/faresmohamedsalah10-1681/renderlab/7X5xzARHaT7nXkzoHMoHiGxi1xfa).
- The prior [canonical manifest](../production/current.json) identifies known-good rollback `dpl_ChVfct9Zsy2UY19QKKHYHetER46S` / `30634662fb0319e3b6a943af2c89872ef607104b`. No rollback was performed.
- **Exact Vercel deployment created timestamp, immutable deployment URL string, and custom-domain alias `updatedAt` have NOT yet been independently read back.** Vercel provider API credentials available to the assistant returned 403 for this team and the signed-in desktop browser became user-preempted. No timestamp has been estimated from dashboard relative age or GitHub workflow completion. The canonical manifest and its five mirrors must remain unchanged until values are verified.

## Read-only post-promotion verification

GET `https://renderlab.faresuniform.uk/` **HTTP 200**; GET `/api/generation/jobs` **HTTP 200**, with `fiboAvailable=true` and `fiboMaskAvailable=true`. An intentionally invalid read-only GET to `/api/generation/jobs/not-a-uuid` returned **HTTP 400**, stable `invalid_request`, and the generic `A valid generation job ID is required.` message. No generation, database mutation, provider deployment, credential read-back, or destructive test ran. A fresh uninvited account fixture was **not** tested here; keep invite-only enforcement preflight independently qualified and do not overclaim a full authorization acceptance test.

## Required release-documentation closure before Unit 3b

1. Obtain exact Vercel **deployment `createdAt`** and **custom-domain alias `updatedAt`** from the authenticated Production account for `dpl_7X5xzARHaT7nXkzoHMoHiGxi1xfa`, and immutable deployment URL. Require `updatedAt >= 2026-11-23T14:11:26.000Z`; otherwise stop and report a qualification ordering violation.
2. In this PR or a separate clean replacement, update **`docs/production/current.json`** and all **five human-readable mirrors** with verified deployment, cutover, rollback, exact check IDs and readiness run, never fabricated timestamps. Run offline docs governance/mirror verification and merge only with six protected exact-head checks and CodeQL green.
3. Dispatch the standard **Production Documentation Sync** on the exact deployed SHA `2a64d4ccc03e8f8ce1e415d298687321179efb50` and require GitHub+Vercel read-only provider comparison to pass. Record its run ID.
4. **Unit 3b owner-isolation code/tests are blocked until step 3 succeeds**, per the owner-approved sequence. No new models/frontend or external repositories in scope.

**Release status:** app *live and healthy*; **documentation sync not run**, release record not closed. This file records the partial operational evidence so a future operator can finish accurately without rewriting history.
