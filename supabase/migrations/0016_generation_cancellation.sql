-- Phase 15: serialized native generation cancellation.
--
-- `cancelling` is an active server-owned lifecycle state. It participates in the same
-- reconciliation claim used by provider polling, failover and durable finalization so
-- cancellation cannot race those writers independently.

alter table public.generation_jobs
  drop constraint if exists generation_jobs_status_check;

alter table public.generation_jobs
  add constraint generation_jobs_status_check
  check (status in ('queued', 'preparing', 'running', 'cancelling', 'persisting', 'succeeded', 'failed', 'cancelled'));

drop index if exists public.generation_jobs_reconcile_active_idx;

create index generation_jobs_reconcile_active_idx
  on public.generation_jobs (reconcile_lease_until, updated_at, id)
  where status in ('queued', 'preparing', 'running', 'cancelling', 'persisting');

create or replace function public.renderlab_claim_generation_reconciliation(
  p_owner_id uuid,
  p_job_id uuid,
  p_token uuid,
  p_lease_seconds integer default 600
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
  v_lease_seconds integer;
begin
  if p_owner_id is null or p_job_id is null or p_token is null then
    return false;
  end if;

  v_lease_seconds := least(greatest(coalesce(p_lease_seconds, 600), 30), 1800);

  update public.generation_jobs job
  set reconcile_token = p_token,
      reconcile_lease_until = now() + make_interval(secs => v_lease_seconds)
  where job.id = p_job_id
    and job.owner_id = p_owner_id
    and job.status in ('queued', 'preparing', 'running', 'cancelling', 'persisting')
    and (
      job.reconcile_lease_until is null
      or job.reconcile_lease_until <= now()
      or job.reconcile_token = p_token
    );

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.renderlab_claim_generation_reconciliation(uuid, uuid, uuid, integer)
  from public, anon, authenticated;
grant execute on function public.renderlab_claim_generation_reconciliation(uuid, uuid, uuid, integer)
  to service_role;

comment on constraint generation_jobs_status_check on public.generation_jobs is
  'RenderLab generation lifecycle including active cancellation intent before terminal cancelled.';
