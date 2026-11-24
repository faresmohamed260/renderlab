# Batch E — pre-0037 rollback capture

Release SHA `80194dfe654bd7c34660c4679a8c97542db94387`. Captured live before applying 0037. Evidence only; do not execute without owner rollback authorization. Original owner `postgres`, ACL `{postgres=X/postgres,service_role=X/postgres,renderlab_modal_dispatcher=X/postgres}`, function-definition MD5 `fdc6dd3b7d9e656e20e5c290e8ea2f75`. Original return type explicitly schema-qualified in executable rollback text to make search-path independent. Current v13 `dispatch_supabase.py` calls same signature and reads unchanged outbox type; lookup reads known call before submit and finish preserves claim guard. No data backfill.

```sql
CREATE OR REPLACE FUNCTION public.renderlab_claim_generation_dispatch_bounded(p_claim_token uuid, p_lease_seconds integer DEFAULT 90, p_limit integer DEFAULT 8)
 RETURNS SETOF public.generation_dispatch_outbox
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_claim_token is null then return; end if;

  -- Quarantine exhausted due rows independently of the claim batch, without
  -- touching a live lease or erasing reserved send / worker execution evidence.
  -- An unresolved row with a known call stays unresolved; it is never resent.
  -- Operator/owner reconciliation remains responsible for the final outcome.
  with exhausted as (
    select item.attempt_id
    from public.generation_dispatch_outbox item
    join public.generation_jobs job on job.id = item.job_id
    where item.status in ('pending', 'retry_wait', 'claimed')
      and item.delivery_count >= 4
      and item.next_attempt_at <= now()
      and (item.claim_until is null or item.claim_until <= now())
      and job.status not in ('cancelling', 'cancelled', 'failed', 'succeeded')
    order by item.next_attempt_at, item.created_at
    for update of item skip locked
    limit 32
  )
  update public.generation_dispatch_outbox item
  set status = 'unresolved', claim_token = null, claim_until = null,
      last_error = 'dispatch delivery limit reached; acceptance requires reconciliation',
      updated_at = now()
  from exhausted
  where item.attempt_id = exhausted.attempt_id;

  return query
  with due as (
    select item.attempt_id
    from public.generation_dispatch_outbox item
    join public.generation_jobs job on job.id = item.job_id
    where (item.status in ('pending', 'retry_wait', 'claimed')
        or (item.status = 'unresolved' and item.backend_call_id is not null))
      and item.delivery_count < 4
      and item.next_attempt_at <= now()
      and (item.claim_until is null or item.claim_until <= now())
      and job.status not in ('cancelling', 'cancelled', 'failed', 'succeeded')
    order by item.next_attempt_at, item.created_at
    for update of item skip locked
    limit least(greatest(coalesce(p_limit, 8), 1), 32)
  )
  update public.generation_dispatch_outbox item
  set status = 'claimed', claim_token = p_claim_token,
      claim_until = now() + make_interval(secs => least(greatest(coalesce(p_lease_seconds, 90), 30), 300)),
      delivery_count = item.delivery_count + 1, updated_at = now()
  from due
  where item.attempt_id = due.attempt_id
  returning item.*;
end;
$function$;
ALTER FUNCTION public.renderlab_claim_generation_dispatch_bounded(uuid, integer, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.renderlab_claim_generation_dispatch_bounded(uuid, integer, integer) FROM PUBLIC, anon, authenticated, renderlab_modal_worker, service_role, renderlab_modal_dispatcher;
GRANT EXECUTE ON FUNCTION public.renderlab_claim_generation_dispatch_bounded(uuid, integer, integer) TO service_role, renderlab_modal_dispatcher;
COMMENT ON FUNCTION public.renderlab_claim_generation_dispatch_bounded(uuid, integer, integer) IS 'N2: at most four claims per attempt; skip exhausted due rows and quarantine expired leases as unresolved, preserving possible provider acceptance.';
```

Read-only baseline:

```json
{
  "ledger": [
    {
      "name": "terminal_outbox_and_asset_guard_0036",
      "version": "20261124054825"
    }
  ],
  "outbox_status": null,
  "job_status": {
    "failed": 3,
    "cancelled": 1,
    "succeeded": 66
  },
  "attach_eligible": 0,
  "outbox_count": 0,
  "job_count": 70,
  "outbox_digest": "d41d8cd98f00b204e9800998ecf8427e",
  "job_digest": "315f3ec3d366fd39d7cea808a245ff32"
}
```
