-- ADR-005: atomic generation acceptance, recoverable dispatch and durable attempt identity.

create table public.generation_dispatch_outbox (
  attempt_id uuid primary key,
  job_id uuid not null unique references public.generation_jobs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete restrict,
  backend_key text not null,
  model_key text not null,
  model_version text not null,
  operation text not null check (operation in ('create-image', 'edit-image')),
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'claimed', 'retry_wait', 'dispatched', 'unresolved', 'failed', 'cancelled')),
  claim_token uuid null,
  claim_until timestamptz null,
  delivery_count integer not null default 0 check (delivery_count >= 0),
  next_attempt_at timestamptz not null default now(),
  admission_deadline timestamptz not null,
  dedup_retain_until timestamptz not null,
  provider_job_id text null,
  execution_started_at timestamptz null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  dispatched_at timestamptz null,
  constraint generation_dispatch_claim_pair check (
    (claim_token is null and claim_until is null)
    or (claim_token is not null and claim_until is not null)
  ),
  constraint generation_dispatch_deadlines check (
    admission_deadline > created_at and dedup_retain_until > admission_deadline
  )
);

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'renderlab_modal_dispatcher') then
    create role renderlab_modal_dispatcher nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'renderlab_modal_worker') then
    create role renderlab_modal_worker nologin noinherit;
  end if;
end;
$$;

-- Hosted Supabase migrations run as a CREATEROLE identity rather than a
-- superuser. PostgreSQL reserves even explicitly setting NOSUPERUSER,
-- NOREPLICATION and NOBYPASSRLS for superusers. Fail closed if an existing
-- role has any of those attributes, then alter only attributes the hosted
-- migration identity is allowed to manage. Newly created roles default all
-- three privileged attributes to false.
do $$
begin
  if exists (
    select 1 from pg_roles
    where rolname in ('renderlab_modal_dispatcher', 'renderlab_modal_worker')
      and (rolsuper or rolreplication or rolbypassrls)
  ) then
    raise exception 'RenderLab Modal roles have forbidden privileged attributes';
  end if;
end;
$$;

alter role renderlab_modal_dispatcher with nologin noinherit nocreatedb nocreaterole connection limit 4;
alter role renderlab_modal_worker with nologin noinherit nocreatedb nocreaterole connection limit 2;
grant usage on schema public to renderlab_modal_dispatcher, renderlab_modal_worker;

create index generation_dispatch_due_idx
  on public.generation_dispatch_outbox (next_attempt_at, claim_until, created_at)
  where status in ('pending', 'claimed', 'retry_wait');

alter table public.generation_dispatch_outbox enable row level security;

comment on table public.generation_dispatch_outbox is
  'Service-only transactional generation dispatch intents. Payloads and provider handles are never browser-readable.';
comment on column public.generation_dispatch_outbox.admission_deadline is
  'Immutable deadline inherited by every delivery of this render attempt; redelivery never extends it.';
comment on column public.generation_dispatch_outbox.dedup_retain_until is
  'Earliest cleanup boundary after admission, retry, unresolved, cutover and rollback windows close.';

create or replace function public.renderlab_accept_generation_dispatch(
  p_attempt_id uuid,
  p_owner_id uuid,
  p_operation text,
  p_output_kind text,
  p_prompt text,
  p_workflow_id text,
  p_model text,
  p_ecosystem text,
  p_inputs jsonb,
  p_parameters jsonb,
  p_backend_key text,
  p_model_key text,
  p_model_version text,
  p_payload jsonb,
  p_admission_deadline timestamptz
)
returns setof public.generation_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.generation_jobs;
begin
  if p_attempt_id is null or p_owner_id is null or p_operation not in ('create-image', 'edit-image')
    or p_output_kind <> 'image' or p_backend_key <> 'fibo'
    or p_model_key <> 'fibo-2.0-turbo' or p_model_version <> 'bria-fibo-2.0-turbo'
    or p_payload is null or jsonb_typeof(p_payload) <> 'object'
    or p_admission_deadline <= now() or p_admission_deadline > now() + interval '30 minutes' then
    raise exception 'Invalid durable generation dispatch request';
  end if;

  insert into public.generation_jobs (
    owner_id, status, operation, output_kind, prompt, workflow_id, model, ecosystem, inputs, parameters,
    worker_id, worker_state
  ) values (
    p_owner_id, 'queued', p_operation, p_output_kind, p_prompt, p_workflow_id, p_model, p_ecosystem,
    coalesce(p_inputs, '[]'::jsonb), coalesce(p_parameters, '{}'::jsonb), p_backend_key, 'dispatch_pending'
  ) returning * into v_job;

  insert into public.generation_dispatch_outbox (
    attempt_id, job_id, owner_id, backend_key, model_key, model_version, operation, payload,
    admission_deadline, dedup_retain_until
  ) values (
    p_attempt_id, v_job.id, p_owner_id, p_backend_key, p_model_key, p_model_version, p_operation, p_payload,
    p_admission_deadline, p_admission_deadline + interval '7 days'
  );

  return next v_job;
end;
$$;

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
    where item.status in ('pending', 'retry_wait', 'claimed')
      and item.next_attempt_at <= now()
      and item.admission_deadline > now()
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
      last_error = left(p_error, 500), claim_token = null, claim_until = null, updated_at = now(),
      dispatched_at = case when p_status = 'dispatched' then now() else item.dispatched_at end
  where item.attempt_id = p_attempt_id and item.claim_token = p_claim_token
  returning item.* into v_row;
  if v_row.attempt_id is null then return false; end if;

  if p_status = 'dispatched' then
    update public.generation_jobs set status = 'running', provider_job_id = p_provider_job_id,
      worker_state = 'queued', started_at = coalesce(started_at, now()), updated_at = now()
    where id = v_row.job_id and status = 'queued';
  elsif p_status in ('failed', 'unresolved') then
    update public.generation_jobs set status = 'failed', error_code = 'generation_dispatch_' || p_status,
      error_message = case when p_status = 'unresolved'
        then 'Generation dispatch requires operator reconciliation.'
        else 'Generation could not be dispatched.' end,
      completed_at = now(), updated_at = now()
    where id = v_row.job_id and status = 'queued';
  end if;
  return true;
end;
$$;

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
    and item.status not in ('cancelled', 'failed');
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.renderlab_lookup_generation_attempt(
  p_attempt_id uuid
)
returns table(status text, provider_job_id text, execution_started_at timestamptz)
language sql
security definer
set search_path = ''
stable
as $$
  select item.status, item.provider_job_id, item.execution_started_at
  from public.generation_dispatch_outbox item
  where item.attempt_id = p_attempt_id
  limit 1;
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
    and item.status in ('pending', 'claimed', 'retry_wait')
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
    where item.dedup_retain_until <= p_now
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

revoke all on table public.generation_dispatch_outbox from public, anon, authenticated;
revoke all on function public.renderlab_accept_generation_dispatch(uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, text, text, text, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.renderlab_claim_generation_dispatch(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.renderlab_finish_generation_dispatch(uuid, uuid, text, text, timestamptz, text) from public, anon, authenticated;
revoke all on function public.renderlab_begin_generation_attempt(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.renderlab_lookup_generation_attempt(uuid) from public, anon, authenticated;
revoke all on function public.renderlab_cancel_queued_generation_dispatch(uuid, uuid) from public, anon, authenticated;
revoke all on function public.renderlab_cleanup_generation_dispatch(timestamptz, integer) from public, anon, authenticated;

grant execute on function public.renderlab_accept_generation_dispatch(uuid, uuid, text, text, text, text, text, text, jsonb, jsonb, text, text, text, jsonb, timestamptz) to service_role;
grant execute on function public.renderlab_claim_generation_dispatch(uuid, integer, integer) to service_role;
grant execute on function public.renderlab_finish_generation_dispatch(uuid, uuid, text, text, timestamptz, text) to service_role;
grant execute on function public.renderlab_begin_generation_attempt(uuid, timestamptz) to service_role;
grant execute on function public.renderlab_lookup_generation_attempt(uuid) to service_role;
grant execute on function public.renderlab_cancel_queued_generation_dispatch(uuid, uuid) to service_role;
grant execute on function public.renderlab_cleanup_generation_dispatch(timestamptz, integer) to service_role;

grant execute on function public.renderlab_claim_generation_dispatch(uuid, integer, integer) to renderlab_modal_dispatcher;
grant execute on function public.renderlab_finish_generation_dispatch(uuid, uuid, text, text, timestamptz, text) to renderlab_modal_dispatcher;
grant execute on function public.renderlab_lookup_generation_attempt(uuid) to renderlab_modal_dispatcher;
grant execute on function public.renderlab_begin_generation_attempt(uuid, timestamptz) to renderlab_modal_worker;
