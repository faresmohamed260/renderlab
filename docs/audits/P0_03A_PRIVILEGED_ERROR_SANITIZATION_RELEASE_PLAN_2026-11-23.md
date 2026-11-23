# P0-03a — Sanitized privileged database failures: validation and release plan

**Scope:** Owner-approved runtime remediation after test-only [PR #548](https://github.com/faresmohamed260/renderlab/pull/548). Follow [P0-03 security contract](../architecture/P0_03_TRUST_BOUNDARIES_AND_OWNER_ISOLATION_CONTRACT.md). Not complete until Vercel cutover and Production Documentation Sync pass. Date: 2026-11-23.

## Verified pre-fix baseline and implementation

Before the fix, enforced offline fake-failure tests recorded **7 failing security cases and 1 passing alert case**. PR #548 merged those seven as explicitly skipped-with-reason; this runtime PR activates all seven and adds further media/collections routes and safe Postgres classification tests. All tests use synthetic SQL, token and owner sentinels, fake PostgREST replies and fake storage/signing failures. No production or provider calls.

The service-role wrapper now returns a typed error with a stable supabase_backend_unavailable code, bounded numeric upstream HTTP status, random correlation ID, and generic public-safe message. It retains only a strict allowlist of internal domain classifications and 5-character SQLSTATE codes; never the upstream response body, arbitrary details or credentials. Existing admission, admin, collection uniqueness and account-deletion classifications use the safe code field instead of parsing Error.message. Generation, media and collection handlers return generic stable messages at unchanged failure statuses, with known safe validation domain errors preserved. Download/content/thumbnail return a stable media_unavailable code while retaining the legacy string error field. Failed upload signing stores upload_signing_failed only; alerts must not forward database errors.

## Offline validation matrix

| Boundary | Test and result required |
| --- | --- |
| PostgREST | Fake HTTP 503 body containing SQL_DETAIL_SENTINEL, PRIVILEGED_TOKEN_SENTINEL, OWNER_B_SENTINEL; no leaked output, a typed error/status/correlation |
| Database semantics | Safe generation/admission codes and 23505 uniqueness retain their typed distinction, arbitrary upstream values are not reflected |
| Generation GET | Existing HTTP 503, generation_backend_unavailable, generic message |
| Media asset/list/rename/delete/favorite | Existing HTTP 503, media_unavailable, no upstream text |
| Content, download, thumbnail | No signed URL on failure; 503, stable code, generic message |
| Collections and membership | 503 media_unavailable on privileged failure; safe typed validation remains 400 |
| Media upload signed ticket | Persist signingError code only, never raw signing exception |
| Alert fanout | Fake privileged DB failure never becomes an outbound message or a log |
| Whole app | Node unit suite, build, typecheck, UI purity, docs governance, exact-head six protected checks and CodeQL |

## Production release and rollback

1. Merge the runtime PR on all required exact-head checks green. Test-only/docs-only PRs do not release.
2. Run Deployment Readiness on the exact merged SHA, confirm qualification precedes the cutover, retain six protected check IDs and qualifiedAt.
3. Deploy that exact application SHA through the owner-authorized Vercel Production dashboard, reading back names and feature flag effective state only. Closed beta enforcement and FIBO mask must stay ON. Never reveal or change secret values.
4. Upon READY and custom-domain assignment, get deployment ID, immutable origin, creation timestamp, provider alias updatedAt and rollback anchor. Open the production-record PR **in the same sitting**, updating canonical current.json and the five required human mirrors, and merge on green exact-head checks.
5. Run Production Documentation Sync for the exact application SHA, require provider read-back success **before starting 3b**.
6. Verify public root and capability GET both HTTP 200, FIBO and mask capability true, invite-only enforcement still ON per safe inventory/preflight. Issue only an **invalid read-only job ID GET** and verify HTTP 400, stable invalid_request and generic message. No generation, production mutation, secret, schema or Modal change.

**Rollback:** the current known READY deployment is dpl_ChVfct9Zsy2UY19QKKHYHetER46S (application SHA 30634662fb0319e3b6a943af2c89872ef607104b). On startup, auth, mask, or media regression, restore that exact Vercel deployment to the custom domain using the standard release runbook and record the actual alias cutover timestamp. Confirm safe authenticated access after rollback. This plan does not modify S.A.G.A. or resume.

## Verified cutover evidence (pending documentation sync)

- **Application:** 2a64d4ccc03e8f8ce1e415d298687321179efb50 (PR #549). Six protected main checks completed successfully on this SHA, latest at 2026-11-23T14:11:26.000Z; Deployment Readiness [#45191297596](https://github.com/faresmohamed260/renderlab/actions/runs/45191297596) completed successfully at 2026-11-23T14:10:39Z, also on the exact application SHA.
- **Vercel Production deployment:** dpl_7X5xzARHaT7nXkzoHMoHiGxi1xfa at https://renderlab-1m61ya1sg-faresmohamedsalah10-1681.vercel.app, created 2026-11-23T14:13:29.129Z and observed READY. Verified in the authenticated Production dashboard for project prj_APU35jTnge27D2MAFjuc7GP0Dd6I, team team_RwVJPL0rvE91GapkloHiSTXt, source branch main and commit 2a64d4ccc03e8f8ce1e415d298687321179efb50.
- **Production alias:** renderlab.faresuniform.uk mapped to dpl_7X5xzARHaT7nXkzoHMoHiGxi1xfa with provider alias updatedAt 2026-11-23T14:16:59.684Z (dashboard-authenticated read-only response). Qualification preceded cutover by 5 minutes 33.684 seconds.
- **Rollback anchor:** dpl_ChVfct9Zsy2UY19QKKHYHetER46S at 30634662fb0319e3b6a943af2c89872ef607104b, the previous READY/current Production deployment, retained as fallback. No rollback performed.
- **Read-only live checks after cutover:** site HTTP 200, GET /api/generation/jobs HTTP 200 with available=true, fiboAvailable=true, fiboMaskAvailable=true; invalid GET /api/generation/jobs/not-a-valid-uuid HTTP 400 with code invalid_request and generic message. No generations or writes to production.
- **Repository closure:** this docs-only PR updates docs/production/current.json plus five mirrors in the same operator sitting. Once merged with required checks green, dispatch Production Documentation Sync on exact deployed SHA 2a64d4ccc03e8f8ce1e415d298687321179efb50. P0-03b cannot begin until the provider read-back succeeds.

**Provider verification correction:** [Production Documentation Sync #45197603120](https://github.com/faresmohamed260/renderlab/actions/runs/45197603120) initially failed because the immutable deployment URL was transcribed incorrectly. The provider-confirmed URL is https://renderlab-1m61ya1sg-faresmohamedsalah10-1681.vercel.app. This docs-only correction does not change the deployment, cutover time, or application SHA; a subsequent successful provider sync remains required before P0-03b.
