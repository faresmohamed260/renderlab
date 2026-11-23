# Batch A production release evidence — 24 November 2026

**State: production cutover completed; canonical repository record and hosted fixture verification NOT YET CLOSED.** This is a provisional, sanitized operator audit. Do not merge this record until the verified alias timestamp is supplied, the canonical manifest and its five mirrors are updated, the documentation sync passes, and the approved one-call fixture is independently verified.

## Exact boundaries

- Released Git SHA: `e28b41922728e1052f9021b36bef67a84684f979` (clean checkout). Baseline: `b548fe40ac274bb4d5bc6d2674ce7bfac556bfcf`.
- Worker tree: `614ad3132a27b60dee17017462886fae0dec24c7`; renderer-specific dependency `native_graph.py` changed. `FiboInputRejected` extends `ValueError`.
- New Production Vercel deployment: `dpl_HSCgbGPfxTpkGRzuLPEhicaATwX6`, `https://renderlab-qbu4lqk2v-faresmohamedsalah10-1681.vercel.app`, READY and marked Current for `renderlab.faresuniform.uk`. Deployment was staged before promotion with automatic custom-domain assignment disabled.
- Previous known-good Vercel deployment and rollback anchor: `dpl_2J4BXM3Y4xF9JWo1cdj38Da5CWJR`, SHA `b548fe40ac274bb4d5bc6d2674ce7bfac556bfcf`.
- **Pending read-back:** Vercel alias `updatedAt` in canonical UTC; do not infer from build/deploy times.

## Additive migrations and credentials

- Vercel Production `RENDERLAB_GENERATION_RECONCILER_SECRET` rotated to an independently RNG-generated 64-character write-only value at approximately `2026-11-23T23:14:45Z`. `CRON_SECRET` rotated likewise at approximately `2026-11-23T23:16:42Z`. No secret values were recorded or exported. Manual verification scripts must receive these credentials at invocation time.
- `0032_verified_email_invitation_claim.sql` applied `2026-11-23T23:17:37Z`, Supabase ledger `20261123231737`; signature and verified-email guard present, service-role EXECUTE true, anon/authenticated false, null-input no-op returned no rows. Existing single admin access remained `admin/active` across the migration.
- `0033_generation_reconciliation_fairness.sql` applied `2026-11-23T23:18:13Z`, ledger `20261123231813`; last-reconciled column, both indexes and atomic claim-function update present, grants restricted to service role, null claim returned false.

## Qualification and application cutover

- Protected-main exact-head required check run IDs: quality `138061953720`; governance `138061952455`; unit coverage `138061953393`; javascript-typescript `138061953311`; Ubuntu clean-room `138061953290`; Windows clean-room `138061953776`; all passed.
- Deployment Readiness: [run 45287742956](https://github.com/faresmohamed260/renderlab/actions/runs/45287742956), completed green `2026-11-23T23:19:40Z` for exact released SHA.
- Modal renderer `renderlab-image-generation` app `ap-wS5WKruuipwssNGHf7Eo6k`: v10, deployed `2026-11-23T23:29:59Z`, tag `e28b419`; rollback renderer v9 tagged `decd2f6`.
- Modal gateway plus dispatcher `renderlab-generation-gateway` app `ap-UfrkwIijsdz6xiGiQwtMlB`: v11, deployed `2026-11-23T23:30:29Z`, tag `e28b419`; rollback gateway v10 tagged `decd2f6`.
- Both Modal apps matched expected IDs in environment `main`; no other Modal deployment was performed.

## Live no-GPU checks

- `/` 200, `/api/health` 200 with `status=ok`, `GET /api/generation/jobs` 200 with `available=true`, `fiboAvailable=true`, `fiboMaskAvailable=true`.
- Invalid same-origin generation POST returned sanitized HTTP 400 `invalid_request`; signed-out Admin Health returned sanitized HTTP 403 `admin_access_required`.
- Privileged read-only Admin/dispatch RPCs reported **0 active jobs, 0 unresolved dispatches, 0 expired claims, 0 held active reservations**, and a healthy scheduled heartbeat (18 seconds old when measured). This is not a substitute for a signed-in browser Admin Health session.
- **Not yet proven:** authenticated gateway invalid-status poll, the one approved FIBO generation, one atomic terminalization call, unchanged second Library load, fixture cleanup and zero residue, and the canonical documentation sync.

## Release stop state

No further merges or unrelated PRs are included. **Batch B and TLS canary remain blocked pending batch A record closure and verified hosted acceptance.** On a real runtime/auth/data/dispatch regression, stop without repeating provider work, roll back the web deployment and restore the previous renderer then gateway versions; installed additive migrations remain.
