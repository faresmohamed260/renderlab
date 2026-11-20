-- Durable ADR-005 dispatcher heartbeat. Browser roles receive no table or RPC access.
create table if not exists public.generation_dispatch_heartbeats (
  environment text primary key check (
    char_length(environment) between 1 and 63
    and environment ~ '^[a-z][a-z0-9-]*$'
  ),
  last_completed_at timestamptz not null,
  last_scheduled_at timestamptz,
  last_trigger text not null check (last_trigger in ('scheduled', 'wake', 'manual')),
  claimed integer not null check (claimed between 0 and 1000),
  dispatched integer not null check (dispatched between 0 and claimed),
  retried integer not null check (retried between 0 and claimed),
  failed integer not null check (failed between 0 and claimed),
  unresolved integer not null check (unresolved between 0 and claimed),
  constraint generation_dispatch_heartbeat_summary_check check (
    dispatched + retried + failed + unresolved = claimed
  )
);

alter table public.generation_dispatch_heartbeats enable row level security;
revoke all on table public.generation_dispatch_heartbeats
  from public, anon, authenticated, service_role, renderlab_modal_dispatcher, renderlab_modal_worker;

create or replace function public.renderlab_record_generation_dispatch_heartbeat(
  p_environment text,
  p_trigger text,
  p_claimed integer,
  p_dispatched integer,
  p_retried integer,
  p_failed integer,
  p_unresolved integer,
  p_completed_at timestamptz default pg_catalog.now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_environment is null
    or char_length(p_environment) < 1
    or char_length(p_environment) > 63
    or p_environment !~ '^[a-z][a-z0-9-]*$'
    or p_trigger not in ('scheduled', 'wake', 'manual')
    or p_completed_at is null
    or p_completed_at > pg_catalog.now() + interval '1 minute'
    or p_claimed not between 0 and 1000
    or p_dispatched not between 0 and p_claimed
    or p_retried not between 0 and p_claimed
    or p_failed not between 0 and p_claimed
    or p_unresolved not between 0 and p_claimed
    or p_dispatched + p_retried + p_failed + p_unresolved <> p_claimed
  then
    raise exception using message = 'renderlab_generation_dispatch_heartbeat_invalid';
  end if;

  insert into public.generation_dispatch_heartbeats as heartbeat (
    environment,
    last_completed_at,
    last_scheduled_at,
    last_trigger,
    claimed,
    dispatched,
    retried,
    failed,
    unresolved
  ) values (
    p_environment,
    p_completed_at,
    case when p_trigger = 'scheduled' then p_completed_at end,
    p_trigger,
    p_claimed,
    p_dispatched,
    p_retried,
    p_failed,
    p_unresolved
  )
  on conflict (environment) do update
  set last_completed_at = greatest(heartbeat.last_completed_at, excluded.last_completed_at),
      last_scheduled_at = case
        when excluded.last_scheduled_at is null then heartbeat.last_scheduled_at
        else greatest(heartbeat.last_scheduled_at, excluded.last_scheduled_at)
      end,
      last_trigger = excluded.last_trigger,
      claimed = excluded.claimed,
      dispatched = excluded.dispatched,
      retried = excluded.retried,
      failed = excluded.failed,
      unresolved = excluded.unresolved
  where excluded.last_completed_at >= heartbeat.last_completed_at;

  return true;
end;
$$;

revoke all on function public.renderlab_record_generation_dispatch_heartbeat(
  text, text, integer, integer, integer, integer, integer, timestamptz
) from public, anon, authenticated, service_role, renderlab_modal_worker;
grant execute on function public.renderlab_record_generation_dispatch_heartbeat(
  text, text, integer, integer, integer, integer, integer, timestamptz
) to renderlab_modal_dispatcher;

create or replace function public.renderlab_generation_dispatch_health()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  with dispatch as (
    select
      coalesce(floor(extract(epoch from pg_catalog.now() - min(item.next_attempt_at)
        filter (where item.status in ('pending', 'retry_wait', 'claimed') and item.next_attempt_at <= pg_catalog.now()))), 0)
        as oldest_due_seconds,
      count(*) filter (where item.status = 'claimed' and item.claim_until <= pg_catalog.now()) as expired_claims,
      count(*) filter (where item.status = 'unresolved') as unresolved
    from public.generation_dispatch_outbox item
    where item.status in ('pending', 'retry_wait', 'claimed', 'unresolved')
  ), heartbeat as (
    select last_scheduled_at
    from public.generation_dispatch_heartbeats
    where environment = 'main'
  )
  select pg_catalog.jsonb_build_object(
    'oldestDueSeconds', dispatch.oldest_due_seconds,
    'expiredClaims', dispatch.expired_claims,
    'unresolved', dispatch.unresolved,
    'scheduledHeartbeatAgeSeconds', case
      when heartbeat.last_scheduled_at is null then null
      else greatest(0, floor(extract(epoch from pg_catalog.now() - heartbeat.last_scheduled_at)))
    end,
    'scheduledHeartbeatMissing', heartbeat.last_scheduled_at is null
      or heartbeat.last_scheduled_at <= pg_catalog.now() - interval '3 minutes'
  )
  from dispatch
  left join heartbeat on true;
$$;

revoke all on function public.renderlab_generation_dispatch_health() from public, anon, authenticated;
grant execute on function public.renderlab_generation_dispatch_health() to service_role;

comment on table public.generation_dispatch_heartbeats is
  'Server-only completion heartbeat for ADR-005 dispatch monitoring; contains no user, prompt, media, job or provider identity.';
