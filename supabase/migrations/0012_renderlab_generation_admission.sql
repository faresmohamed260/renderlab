-- Phase 10C: typed closed-beta generation defaults and atomic admission reservations.

create table if not exists public.renderlab_beta_settings (
  singleton_id smallint primary key default 1 check (singleton_id = 1),
  generation_enabled boolean not null default true,
  max_active_jobs integer not null default 1 check (max_active_jobs between 1 and 4),
  max_jobs_per_hour integer not null default 12 check (max_jobs_per_hour between 1 and 120),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.renderlab_beta_settings (singleton_id)
values (1)
on conflict (singleton_id) do nothing;

create table if not exists public.generation_admission_reservations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  admitted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  job_id uuid,
  released_at timestamptz,
  constraint generation_admission_reservations_expiry_check check (expires_at > admitted_at),
  constraint generation_admission_reservations_release_check check (released_at is null or released_at >= admitted_at)
);

create index if not exists generation_admission_owner_admitted_idx
  on public.generation_admission_reservations (owner_id, admitted_at desc);

create index if not exists generation_admission_owner_active_idx
  on public.generation_admission_reservations (owner_id, expires_at)
  where released_at is null;

create unique index if not exists generation_admission_job_unique_idx
  on public.generation_admission_reservations (job_id)
  where job_id is not null;

alter table public.renderlab_beta_settings enable row level security;
alter table public.generation_admission_reservations enable row level security;

revoke all on table public.renderlab_beta_settings from public, anon, authenticated;
revoke all on table public.generation_admission_reservations from public, anon, authenticated;
grant select, insert, update, delete on table public.renderlab_beta_settings to service_role;
grant select, insert, update, delete on table public.generation_admission_reservations to service_role;

create or replace function public.renderlab_reserve_generation_admission(
  p_owner_id uuid
)
returns table (
  reservation_id uuid,
  effective_generation_enabled boolean,
  effective_max_active_jobs integer,
  effective_max_jobs_per_hour integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_access public.renderlab_account_access%rowtype;
  v_settings public.renderlab_beta_settings%rowtype;
  v_active_count integer;
  v_hour_count integer;
  v_generation_enabled boolean;
  v_max_active_jobs integer;
  v_max_jobs_per_hour integer;
  v_reservation_id uuid;
begin
  select * into v_access
  from public.renderlab_account_access
  where user_id = p_owner_id
  for update;

  if not found or v_access.status <> 'active' then
    raise exception using message = 'renderlab_generation_access_denied';
  end if;

  select * into v_settings
  from public.renderlab_beta_settings
  where singleton_id = 1
  for update;

  if not found then
    raise exception using message = 'renderlab_generation_settings_unavailable';
  end if;

  v_generation_enabled := coalesce(v_access.generation_enabled, v_settings.generation_enabled);
  v_max_active_jobs := coalesce(v_access.max_active_jobs, v_settings.max_active_jobs);
  v_max_jobs_per_hour := coalesce(v_access.max_jobs_per_hour, v_settings.max_jobs_per_hour);

  if not v_generation_enabled then
    raise exception using message = 'renderlab_generation_disabled';
  end if;

  update public.generation_admission_reservations reservation
  set released_at = now()
  where reservation.owner_id = p_owner_id
    and reservation.released_at is null
    and reservation.job_id is not null
    and exists (
      select 1
      from public.generation_jobs job
      where job.id = reservation.job_id
        and job.owner_id = p_owner_id
        and job.status in ('succeeded', 'failed', 'cancelled')
    );

  select count(*)::integer into v_active_count
  from public.generation_admission_reservations reservation
  where reservation.owner_id = p_owner_id
    and reservation.released_at is null
    and reservation.expires_at > now();

  if v_active_count >= v_max_active_jobs then
    raise exception using message = 'renderlab_generation_active_limit_reached';
  end if;

  select count(*)::integer into v_hour_count
  from public.generation_admission_reservations reservation
  where reservation.owner_id = p_owner_id
    and reservation.admitted_at > now() - interval '60 minutes';

  if v_hour_count >= v_max_jobs_per_hour then
    raise exception using message = 'renderlab_generation_rate_limit_reached';
  end if;

  insert into public.generation_admission_reservations (
    owner_id,
    expires_at
  ) values (
    p_owner_id,
    now() + interval '30 minutes'
  )
  returning id into v_reservation_id;

  return query select v_reservation_id, v_generation_enabled, v_max_active_jobs, v_max_jobs_per_hour;
end;
$$;

create or replace function public.renderlab_bind_generation_admission(
  p_owner_id uuid,
  p_reservation_id uuid,
  p_job_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.generation_admission_reservations
  set job_id = p_job_id,
      expires_at = greatest(expires_at, now() + interval '2 hours')
  where id = p_reservation_id
    and owner_id = p_owner_id
    and released_at is null
    and job_id is null;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.renderlab_release_generation_admission(
  p_owner_id uuid,
  p_reservation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.generation_admission_reservations
  set released_at = now()
  where id = p_reservation_id
    and owner_id = p_owner_id
    and released_at is null
    and job_id is null;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.renderlab_admin_set_beta_settings(
  p_actor_user_id uuid,
  p_generation_enabled boolean,
  p_max_active_jobs integer,
  p_max_jobs_per_hour integer
)
returns public.renderlab_beta_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.renderlab_account_access%rowtype;
  v_row public.renderlab_beta_settings%rowtype;
begin
  select * into v_actor
  from public.renderlab_account_access
  where user_id = p_actor_user_id
  for update;

  if not found or v_actor.role <> 'admin' or v_actor.status <> 'active' then
    raise exception using message = 'renderlab_admin_required';
  end if;

  if p_generation_enabled is null
     or p_max_active_jobs is null
     or p_max_active_jobs not between 1 and 4
     or p_max_jobs_per_hour is null
     or p_max_jobs_per_hour not between 1 and 120 then
    raise exception using message = 'renderlab_admin_invalid_request';
  end if;

  select * into v_row
  from public.renderlab_beta_settings
  where singleton_id = 1
  for update;

  if not found then
    raise exception using message = 'renderlab_generation_settings_unavailable';
  end if;

  update public.renderlab_beta_settings
  set generation_enabled = p_generation_enabled,
      max_active_jobs = p_max_active_jobs,
      max_jobs_per_hour = p_max_jobs_per_hour,
      updated_by = p_actor_user_id,
      updated_at = now()
  where singleton_id = 1
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.renderlab_reserve_generation_admission(uuid) from public, anon, authenticated;
revoke all on function public.renderlab_bind_generation_admission(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.renderlab_release_generation_admission(uuid, uuid) from public, anon, authenticated;
revoke all on function public.renderlab_admin_set_beta_settings(uuid, boolean, integer, integer) from public, anon, authenticated;

grant execute on function public.renderlab_reserve_generation_admission(uuid) to service_role;
grant execute on function public.renderlab_bind_generation_admission(uuid, uuid, uuid) to service_role;
grant execute on function public.renderlab_release_generation_admission(uuid, uuid) to service_role;
grant execute on function public.renderlab_admin_set_beta_settings(uuid, boolean, integer, integer) to service_role;
