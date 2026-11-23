# Migration 0031 — production apply / rollback checklist

**Operator:** worker 1, only after separately recorded production approval. **This document is instructions, not authorization to execute.** No production database changes, tests, deployments or workflow dispatches were performed to prepare it.

**Source of truth:** [merged migration 0031](../../supabase/migrations/0031_atomic_generation_terminalize_release.sql), introduced by [PR #576](https://github.com/faresmohamed260/renderlab/pull/576), merge commit `696ca784759eb94457005381fc34b0509d00e920` (migration Git blob `1e2816cd9f2e6328e3ad6899fe4c370952519ada`). **Do not retype or modify the DDL.** [Application PR #580](https://github.com/faresmohamed260/renderlab/pull/580) remains open/unmerged pending a separately authorized coordinated release. A Git merge does **not** apply Supabase migrations. See [production release runbook](PRODUCTION_RELEASE_RUNBOOK.md) and [P0-07 design](../audits/P0_07_ATOMIC_TERMINALIZE_RELEASE_DESIGN_2026-11-23.md).

## 1. Preflight — read-only; record outputs before changing anything

- [ ] Obtain explicit authority for the *correct production Supabase project*, migration window and approved migration channel. Identify the project and connection role without displaying credentials. Confirm the currently assigned Vercel alias and known-good rollback deployment separately; **do not deploy PR #580** as part of this migration-only step.
- [ ] Pin the exact merged migration file (above), confirm no conflicting in-progress schema operation, and check how the chosen migration channel records applied versions. **Do not use bulk `supabase db push` if any other migration would be applied.** Raw `psql -f` does not itself update the Supabase CLI migration ledger: stop unless ledger reconciliation is explicitly agreed.
- [ ] Run the following read-only SQL against the intended project and retain the timestamped aggregate results. **Stop** if the function already exists, a role/grant is unexpected, or the target is uncertain.

~~~sql
-- Expected: NULL (no function yet). Stop if non-NULL.
SELECT to_regprocedure(
  'public.renderlab_terminalize_generation_and_release(uuid,uuid,text,text,uuid,text,text,uuid,jsonb)'
) AS before_0031;

-- Snapshot; no job IDs, prompts, provider handles or user details.
SELECT now() AS checked_at_utc, status, count(*) AS jobs
FROM public.generation_jobs
GROUP BY status ORDER BY status;

SELECT now() AS checked_at_utc,
  count(*) FILTER (WHERE released_at IS NULL) AS unreleased_total,
  count(*) FILTER (WHERE released_at IS NULL AND job_id IS NOT NULL) AS unreleased_bound,
  count(*) FILTER (WHERE released_at IS NULL AND job_id IS NULL) AS unreleased_unbound,
  count(*) FILTER (WHERE released_at IS NULL AND expires_at <= now()) AS unreleased_expired,
  count(*) FILTER (WHERE released_at IS NOT NULL) AS released_total
FROM public.generation_admission_reservations;

-- Confirm the intended roles and inspect existing related RPC ownership/grants.
SELECT rolname, rolsuper, rolbypassrls, rolcanlogin
FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')
ORDER BY rolname;

SELECT p.oid::regprocedure AS existing_rpc,
  pg_get_userbyid(p.proowner) AS owner, p.prosecdef AS security_definer,
  p.proacl AS recorded_grants
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'renderlab_reserve_generation_admission',
    'renderlab_release_generation_admission',
    'renderlab_cancel_queued_generation_dispatch'
  )
ORDER BY p.proname;
~~~

- [ ] Confirm that the **no-op sentinel job ID** `00000000-0000-0000-0000-000000000031` does not exist; abort the no-op test if this query is not `true`:

~~~sql
SELECT NOT EXISTS (
  SELECT 1 FROM public.generation_jobs
  WHERE id = '00000000-0000-0000-0000-000000000031'::uuid
) AS sentinel_job_absent;
~~~

## 2. Apply exactly one migration — separately authorized production action

- [ ] With an approved migration executor and recorded project/actor, apply **only** the complete, unedited [0031 file](../../supabase/migrations/0031_atomic_generation_terminalize_release.sql). For a vetted *direct PostgreSQL* migration channel, the exact file application command from the pinned repository checkout is:

~~~sh
psql --dbname="$APPROVED_SUPABASE_DIRECT_DB_URL" \
  -X -v ON_ERROR_STOP=1 --single-transaction \
  --file=supabase/migrations/0031_atomic_generation_terminalize_release.sql
~~~

- [ ] If the approved channel instead is the Supabase SQL editor / connected migration executor, submit the **identical full contents** of that file as one controlled migration, not a rewritten function. Record applied version, actor, time, file hash and resulting transaction outcome in the project migration ledger using the channel's approved process. Do not forge a migration-history row or run unrelated pending migrations.
- [ ] On any DDL/privilege error: **stop, do not deploy #580**; investigate transaction outcome read-only. Never use `CASCADE`, change existing functions/grants, or retry blindly.

## 3. Post-apply — read back from the production project

- [ ] Verify the **exact nine-argument signature**, TABLE return, trusted creating owner, `plpgsql`, `SECURITY DEFINER=true`, and `proconfig` containing `search_path=` (empty). Absence or mismatch blocks application deployment:

~~~sql
SELECT p.oid::regprocedure AS signature,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS returns,
  pg_get_userbyid(p.proowner) AS function_owner,
  l.lanname AS language,
  p.prosecdef AS security_definer,
  p.proconfig AS function_settings
FROM pg_proc p
JOIN pg_language l ON l.oid = p.prolang
WHERE p.oid = to_regprocedure(
  'public.renderlab_terminalize_generation_and_release(uuid,uuid,text,text,uuid,text,text,uuid,jsonb)'
);
~~~

- [ ] Verify **effective** `EXECUTE`: `service_role=true`, `anon=false`, `authenticated=false`, and no grant to `PUBLIC`. Inspect the full grant list: only the trusted function owner (intrinsic) and `service_role` may execute.

~~~sql
WITH f AS (
  SELECT p.oid, p.proowner, p.proacl
  FROM pg_proc p WHERE p.oid = to_regprocedure(
    'public.renderlab_terminalize_generation_and_release(uuid,uuid,text,text,uuid,text,text,uuid,jsonb)'
  )
)
SELECT has_function_privilege('service_role', oid, 'EXECUTE') AS service_role_execute,
       has_function_privilege('anon', oid, 'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated', oid, 'EXECUTE') AS authenticated_execute,
       EXISTS (
         SELECT 1 FROM aclexplode(coalesce(proacl, acldefault('f', proowner))) g
         WHERE g.grantee = 0 AND g.privilege_type = 'EXECUTE'
       ) AS public_execute
FROM f;

SELECT CASE WHEN a.grantee = 0 THEN 'PUBLIC'
            ELSE pg_get_userbyid(a.grantee) END AS grantee,
       a.privilege_type
FROM pg_proc p
CROSS JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
WHERE p.oid = to_regprocedure(
  'public.renderlab_terminalize_generation_and_release(uuid,uuid,text,text,uuid,text,text,uuid,jsonb)'
)
ORDER BY grantee, a.privilege_type;
~~~

- [ ] Execute **one no-op SQL RPC call** with the previously verified nonexistent job and an intentionally nonexistent owner; expect **one row**: `outcome='not_found'`, `job_status=NULL`, `output_asset_ids=NULL`, `reservation_released=false`. No real job or reservation is mutated:

~~~sql
SELECT outcome, job_status, output_asset_ids, reservation_released
FROM public.renderlab_terminalize_generation_and_release(
  '00000000-0000-0000-0000-000000000000'::uuid,
  '00000000-0000-0000-0000-000000000031'::uuid,
  'queued'::text, 'failed'::text
);
~~~

- [ ] Re-run the aggregate job-status and reservation queries from §1; record differences and explain any concurrent normal activity. Confirm the approved PostgREST schema cache recognizes the new RPC **before any app rollout**; SQL catalog visibility alone is insufficient. No real job or provider-backed generation is authorized by this checklist.
- [ ] Preserve evidence and request a **separate head-engineer/owner go-ahead** to merge, qualify and deploy [#580](https://github.com/faresmohamed260/renderlab/pull/580). Apply migration **first**, web-app deployment **second**.

## 4. Compatibility and rollback decision

| State | Behavior |
| --- | --- |
| 0031 absent; current production app | Existing status-conditional job PATCH and separate admission release remain unchanged. |
| 0031 present; current production app | Old app ignores the additive RPC; old-path behavior remains. |
| 0031 absent; **#580 app deployed early** | Adapter attempts the RPC, treats its recognized missing-function error as unavailable and falls back to original status-CAS PATCH plus legacy cleanup. **This is a safety fallback, not the approved rollout order.** |
| 0031 present; **#580 app deployed after authorization** | Converted native completion/failure, stale-dispatch failure, and in-flight cancellation use the one-transaction RPC; `applied` succeeds, `conflict`/`not_found` do not overwrite and trigger owner-scoped reread, other database errors fail closed. Legacy queued outbox cancellation and owner-return cleanup remain exceptions. |

- [ ] **Preferred application rollback:** stop promotion or restore the verified prior Vercel alias, check it, and **leave 0031 installed** while any deployed/in-flight #580 caller might invoke it.
- [ ] **Function-only rollback (separate approval, no active/new #580 callers):** first prove the previous app is live and all consumers drained; then, if removal is explicitly authorized, execute exactly this statement (without `CASCADE`):

~~~sql
DROP FUNCTION public.renderlab_terminalize_generation_and_release(
  uuid, uuid, text, text, uuid, text, text, uuid, jsonb
);
~~~

- [ ] Read back `to_regprocedure(...)` = `NULL`, reconcile the migration ledger via the approved channel, and retain the before/after evidence. **Never drop 0031 merely because an app rollback occurred.** Do not reverse or rewrite historical job/reservation data.
