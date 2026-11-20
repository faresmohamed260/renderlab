-- Reserve each provider submission before sending it, and persist the provider's
-- own call ID with worker admission so a disconnected dispatcher can reattach.
alter table public.generation_dispatch_outbox
  add column send_reserved_at timestamptz,
  add column backend_call_id text check (backend_call_id ~ '^fc-[A-Za-z0-9]{16,64}$');

create unique index generation_dispatch_backend_call_idx
  on public.generation_dispatch_outbox (backend_call_id)
  where backend_call_id is not null;

create function public.renderlab_reserve_generation_dispatch_send(
  p_attempt_id uuid, p_claim_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  booked boolean;
begin
  update public.generation_dispatch_outbox item
    set send_reserved_at = now(), updated_at = now()
  where item.attempt_id = p_attempt_id
    and item.status = 'claimed'
    and item.claim_token = p_claim_token
    and item.claim_until > now()
    and item.admission_deadline > now()
    and item.send_reserved_at is null
    and item.execution_started_at is null
    and exists (select 1 from public.generation_jobs job where job.id = item.job_id and job.status = 'queued')
  returning true into booked;

  return coalesce(booked, false);
end;
$$;

create function public.renderlab_begin_generation_call(
  p_attempt_id uuid, p_admission_deadline timestamptz, p_backend_call_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_id uuid;
begin
  if p_backend_call_id is null or p_backend_call_id !~ '^fc-[A-Za-z0-9]{16,64}$' then
    return false;
  end if;
  update public.generation_dispatch_outbox item
    set execution_started_at = now(), backend_call_id = p_backend_call_id, updated_at = now()
  where item.attempt_id = p_attempt_id
    and item.admission_deadline = p_admission_deadline
    and item.admission_deadline > now()
    and item.send_reserved_at is not null
    and item.execution_started_at is null
    and (item.provider_job_id is null or split_part(item.provider_job_id, '.', 1) = p_backend_call_id)
    and item.status in ('claimed', 'dispatched', 'unresolved')
    and exists (
      select 1 from public.generation_jobs job
      where job.id = item.job_id and job.status in ('queued', 'running')
    )
  returning item.job_id into v_job_id;

  if v_job_id is null then return false; end if;
  update public.generation_jobs job
  set status = case when job.provider_job_id is null then job.status else 'running' end,
      worker_state = 'generating', started_at = coalesce(job.started_at, now()), updated_at = now()
  where job.id = v_job_id and job.status in ('queued', 'running');
  return true;
end;
$$;

create function public.renderlab_lookup_generation_call(p_attempt_id uuid)
returns table(status text, provider_job_id text, execution_started_at timestamptz,
              backend_call_id text, send_reserved_at timestamptz)
language sql
security definer
set search_path = ''
stable
as $$
  select item.status, item.provider_job_id, item.execution_started_at,
         item.backend_call_id, item.send_reserved_at
  from public.generation_dispatch_outbox item
  where item.attempt_id = p_attempt_id;
$$;

revoke all on function public.renderlab_reserve_generation_dispatch_send(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.renderlab_begin_generation_call(uuid, timestamptz, text)
  from public, anon, authenticated;
revoke all on function public.renderlab_lookup_generation_call(uuid) from public, anon, authenticated;
grant execute on function public.renderlab_reserve_generation_dispatch_send(uuid, uuid)
  to renderlab_modal_dispatcher;
grant execute on function public.renderlab_begin_generation_call(uuid, timestamptz, text)
  to renderlab_modal_worker;
grant execute on function public.renderlab_lookup_generation_call(uuid)
  to renderlab_modal_dispatcher;

create or replace function public.renderlab_claim_generation_dispatch(
  p_claim_token uuid,
  p_lease_seconds integer default 90,
  p_limit integer default 8
)
returns setof public.generation_dispatch_outbox
language sql
security definer
set search_path = ''
as $$
  with due as (
    select item.attempt_id
    from public.generation_dispatch_outbox item
    join public.generation_jobs job on job.id = item.job_id
    where p_claim_token is not null
      and (item.status in ('pending', 'retry_wait', 'claimed')
        or (item.status = 'unresolved' and item.backend_call_id is not null))
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
$$;

create or replace function public.renderlab_finish_generation_dispatch(
  p_attempt_id uuid,
  p_claim_token uuid,
  p_status text,
  p_provider_job_id text default null,
  p_next_attempt_at timestamptz default null,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.generation_dispatch_outbox;
begin
  if p_status not in ('retry_wait', 'dispatched', 'unresolved', 'failed', 'cancelled') then
    return false;
  end if;
  update public.generation_dispatch_outbox item
  set status = p_status,
      provider_job_id = case when p_status = 'dispatched' then p_provider_job_id else item.provider_job_id end,
      next_attempt_at = case when p_status = 'retry_wait' then p_next_attempt_at else item.next_attempt_at end,
      send_reserved_at = case when p_status = 'retry_wait' then null else item.send_reserved_at end,
      last_error = left(p_error, 500), claim_token = null, claim_until = null, updated_at = now(),
      dispatched_at = case when p_status = 'dispatched' then now() else item.dispatched_at end
  where item.attempt_id = p_attempt_id and item.claim_token = p_claim_token
    and item.status = 'claimed' and item.claim_until > now()
    and (p_status not in ('retry_wait', 'failed', 'cancelled') or item.execution_started_at is null)
    and (p_status <> 'dispatched' or (p_provider_job_id ~ '^fc-[A-Za-z0-9]{16,64}\.[0-9a-f]{64}$'
      and (item.backend_call_id is null or split_part(p_provider_job_id, '.', 1) = item.backend_call_id)))
  returning item.* into v_row;
  if v_row.attempt_id is null then return false; end if;

  if p_status = 'dispatched' then
    update public.generation_jobs set
      status = case when v_row.execution_started_at is null and v_row.send_reserved_at is not null
                    then 'queued' else 'running' end,
      provider_job_id = p_provider_job_id,
      worker_state = case when v_row.execution_started_at is null then 'queued' else 'generating' end,
      started_at = coalesce(started_at, v_row.execution_started_at,
        case when v_row.send_reserved_at is null then now() end),
      updated_at = now()
    where id = v_row.job_id and status = 'queued';
  elsif p_status = 'unresolved' then
    update public.generation_jobs set worker_state = 'dispatch_unresolved', updated_at = now()
    where id = v_row.job_id and status = 'queued';
  elsif p_status = 'failed' then
    update public.generation_jobs set status = 'failed', error_code = 'generation_dispatch_failed',
      error_message = 'Generation could not be dispatched.', completed_at = now(), updated_at = now()
    where id = v_row.job_id and status = 'queued';
  end if;
  return true;
end;
$$;

create or replace function public.renderlab_cancel_queued_generation_dispatch(
  p_owner_id uuid,
  p_job_id uuid
)
returns setof public.generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.generation_jobs;
begin
  update public.generation_dispatch_outbox item
  set status = 'cancelled', claim_token = null, claim_until = null, updated_at = now()
  where item.job_id = p_job_id and item.owner_id = p_owner_id
    and item.status in ('pending', 'claimed', 'retry_wait', 'unresolved')
    and item.execution_started_at is null;
  if not found then return; end if;
  update public.generation_jobs job
  set status = 'cancelled', worker_state = 'cancelled', completed_at = now(), updated_at = now()
  where job.id = p_job_id and job.owner_id = p_owner_id and job.status = 'queued'
  returning * into v_job;
  if v_job.id is not null then return next v_job; end if;
end;
$$;

create or replace function public.renderlab_cleanup_generation_dispatch(
  p_now timestamptz default now(),
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  with expired as (
    select item.attempt_id
    from public.generation_dispatch_outbox item
    join public.generation_jobs job on job.id = item.job_id
    where greatest(item.dedup_retain_until,
      coalesce(job.completed_at, job.updated_at) + interval '7 days') <= p_now
      and item.status in ('dispatched', 'failed', 'cancelled')
      and job.status in ('succeeded', 'failed', 'cancelled')
    order by item.dedup_retain_until
    for update of item skip locked
    limit least(greatest(coalesce(p_limit, 100), 1), 1000)
  )
  delete from public.generation_dispatch_outbox item
  using expired
  where item.attempt_id = expired.attempt_id;
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create function public.renderlab_generation_dispatch_health()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select jsonb_build_object(
    'oldestDueSeconds', coalesce(floor(extract(epoch from now() - min(item.next_attempt_at)
      filter (where item.status in ('pending', 'retry_wait', 'claimed') and item.next_attempt_at <= now()))), 0),
    'expiredClaims', count(*) filter (where item.status = 'claimed' and item.claim_until <= now()),
    'unresolved', count(*) filter (where item.status = 'unresolved'))
  from public.generation_dispatch_outbox item
  where item.status in ('pending', 'retry_wait', 'claimed', 'unresolved');
$$;

revoke all on function public.renderlab_generation_dispatch_health() from public, anon, authenticated;
grant execute on function public.renderlab_generation_dispatch_health() to service_role;

-- The prior deployment can drain or roll back on the same immutable attempt record.
create or replace function public.renderlab_begin_generation_attempt(
  p_attempt_id uuid,
  p_admission_deadline timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.generation_dispatch_outbox item
  set execution_started_at = now(), updated_at = now()
  where item.attempt_id = p_attempt_id
    and item.admission_deadline = p_admission_deadline
    and item.admission_deadline > now()
    and item.execution_started_at is null
    and item.send_reserved_at is null
    and item.status in ('claimed', 'dispatched')
    and exists (
      select 1 from public.generation_jobs job
      where job.id = item.job_id and job.status in ('queued', 'running')
    );
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;
