create table if not exists public.upload_admission_reservations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  upload_kind text not null check (upload_kind in ('media', 'reference')),
  admitted_at timestamptz not null default now(),
  lease_expires_at timestamptz not null,
  bound_resource_id uuid,
  bound_at timestamptz,
  released_at timestamptz,
  constraint upload_admission_reservations_lease_check check (lease_expires_at > admitted_at),
  constraint upload_admission_reservations_bound_check check (
    (bound_resource_id is null and bound_at is null)
    or (bound_resource_id is not null and bound_at is not null and bound_at >= admitted_at)
  ),
  constraint upload_admission_reservations_release_check check (
    released_at is null or released_at >= admitted_at
  )
);

create index if not exists upload_admission_owner_admitted_idx
  on public.upload_admission_reservations (owner_id, admitted_at desc);

create index if not exists upload_admission_owner_provisional_idx
  on public.upload_admission_reservations (owner_id, lease_expires_at)
  where released_at is null and bound_resource_id is null;

create unique index if not exists upload_admission_bound_resource_unique_idx
  on public.upload_admission_reservations (upload_kind, bound_resource_id)
  where bound_resource_id is not null;

alter table public.upload_admission_reservations enable row level security;

revoke all on table public.upload_admission_reservations from public, anon, authenticated;
grant select, insert, update, delete on table public.upload_admission_reservations to service_role;

create or replace function public.renderlab_reserve_upload_admission(
  p_owner_id uuid,
  p_upload_kind text
)
returns table (
  reservation_id uuid,
  effective_max_active_uploads integer,
  effective_max_uploads_per_hour integer
)
language plpgsql
set search_path = ''
as $$
declare
  v_active_count integer;
  v_hour_count integer;
  v_reservation_id uuid;
  v_max_active_uploads constant integer := 8;
  v_max_uploads_per_hour constant integer := 30;
begin
  if p_upload_kind not in ('media', 'reference') then
    raise exception using message = 'renderlab_upload_admission_invalid_kind';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text, 4014)
  );

  update public.upload_admission_reservations reservation
  set released_at = pg_catalog.now()
  where reservation.owner_id = p_owner_id
    and reservation.released_at is null
    and reservation.bound_resource_id is null
    and reservation.lease_expires_at <= pg_catalog.now();

  delete from public.upload_admission_reservations reservation
  where reservation.owner_id = p_owner_id
    and reservation.admitted_at < pg_catalog.now() - interval '24 hours';

  select (
    (select count(*) from public.media_upload_sessions upload
      where upload.owner_id = p_owner_id and upload.status = 'pending')
    +
    (select count(*) from public.generation_sources source
      where source.owner_id = p_owner_id and source.status = 'pending')
    +
    (select count(*) from public.upload_admission_reservations reservation
      where reservation.owner_id = p_owner_id
        and reservation.released_at is null
        and reservation.bound_resource_id is null
        and reservation.lease_expires_at > pg_catalog.now())
  )::integer into v_active_count;

  if v_active_count >= v_max_active_uploads then
    raise exception using message = 'renderlab_upload_active_limit_reached';
  end if;

  select count(*)::integer into v_hour_count
  from public.upload_admission_reservations reservation
  where reservation.owner_id = p_owner_id
    and reservation.admitted_at > pg_catalog.now() - interval '60 minutes';

  if v_hour_count >= v_max_uploads_per_hour then
    raise exception using message = 'renderlab_upload_rate_limit_reached';
  end if;

  insert into public.upload_admission_reservations (
    owner_id,
    upload_kind,
    lease_expires_at
  ) values (
    p_owner_id,
    p_upload_kind,
    pg_catalog.now() + interval '10 minutes'
  )
  returning id into v_reservation_id;

  return query
    select v_reservation_id, v_max_active_uploads, v_max_uploads_per_hour;
end;
$$;

create or replace function public.renderlab_bind_upload_admission(
  p_owner_id uuid,
  p_reservation_id uuid,
  p_upload_kind text,
  p_resource_id uuid
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.upload_admission_reservations
  set bound_resource_id = p_resource_id,
      bound_at = pg_catalog.now()
  where id = p_reservation_id
    and owner_id = p_owner_id
    and upload_kind = p_upload_kind
    and released_at is null
    and bound_resource_id is null
    and lease_expires_at > pg_catalog.now();

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.renderlab_release_upload_admission(
  p_owner_id uuid,
  p_reservation_id uuid
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.upload_admission_reservations
  set released_at = pg_catalog.now()
  where id = p_reservation_id
    and owner_id = p_owner_id
    and released_at is null;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.renderlab_reserve_upload_admission(uuid, text) from public, anon, authenticated;
revoke all on function public.renderlab_bind_upload_admission(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.renderlab_release_upload_admission(uuid, uuid) from public, anon, authenticated;
grant execute on function public.renderlab_reserve_upload_admission(uuid, text) to service_role;
grant execute on function public.renderlab_bind_upload_admission(uuid, uuid, text, uuid) to service_role;
grant execute on function public.renderlab_release_upload_admission(uuid, uuid) to service_role;

comment on table public.upload_admission_reservations is
  'Server-owned per-account upload admission history and provisional reservation state shared by persistent media and temporary reference upload tickets.';
comment on function public.renderlab_reserve_upload_admission(uuid, text) is
  'Service-role-only race-safe upload admission: max 8 unresolved/provisional uploads and 30 grants per rolling hour per owner.';
