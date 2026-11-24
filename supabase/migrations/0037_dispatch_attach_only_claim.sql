-- F2: replace the bounded claim function without rewriting 0035.
-- Known backend calls are attach-only; do not spend another send delivery
-- or quarantine their expired leases. Preserve all ownership, grants and
-- row locking. Recovery columns are resolved at execution after migrations.
create or replace function public.renderlab_claim_generation_dispatch_bounded(
  p_claim_token uuid,
  p_lease_seconds integer default 90,
  p_limit integer default 8
)
returns setof public.generation_dispatch_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_claim_token is null then return; end if;

  -- Quarantine exhausted due rows independently of the claim batch, without
  -- touching a live lease or erasing reserved send / worker execution evidence.
  -- Known backend calls bypass this send-cap quarantine: they can be
  -- reattached without any new provider send.
  with exhausted as (
    select item.attempt_id
    from public.generation_dispatch_outbox item
    join public.generation_jobs job on job.id = item.job_id
    where item.status in ('pending', 'retry_wait', 'claimed')
      and item.delivery_count >= 4
      and item.backend_call_id is null
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
      and (item.delivery_count < 4 or item.backend_call_id is not null)
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
      delivery_count = case when item.backend_call_id is not null then item.delivery_count
                            else item.delivery_count + 1 end, updated_at = now()
  from due
  where item.attempt_id = due.attempt_id
  returning item.*;
end;
$$;

revoke all on function public.renderlab_claim_generation_dispatch_bounded(uuid, integer, integer)
  from public, anon, authenticated, renderlab_modal_worker;
grant execute on function public.renderlab_claim_generation_dispatch_bounded(uuid, integer, integer)
  to service_role, renderlab_modal_dispatcher;

comment on function public.renderlab_claim_generation_dispatch_bounded(uuid, integer, integer) is
  'F2: cap claims that may send at four; known backend calls are attach-only and may recover an expired lease without consuming another delivery.';
