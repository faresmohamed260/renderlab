-- Account roadmap E (#219): export, deletion freeze, owner cleanup and retention state.

create table public.renderlab_account_lifecycle (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state text not null default 'deleting' check (state in ('deleting')),
  requested_at timestamptz not null default now(),
  quiescence_until timestamptz not null,
  retry_count integer not null default 0 check (retry_count >= 0),
  last_error_code text null,
  last_attempt_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint renderlab_account_lifecycle_quiescence_check
    check (quiescence_until >= requested_at + interval '6 minutes')
);

create index renderlab_account_lifecycle_state_quiescence_idx
  on public.renderlab_account_lifecycle (state, quiescence_until, requested_at, user_id);

create table public.renderlab_account_exports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'ready', 'failed', 'expired')),
  storage_key text null unique,
  content_type text null,
  size_bytes bigint null check (size_bytes is null or size_bytes >= 0),
  schema_version integer not null default 1 check (schema_version >= 1),
  requested_at timestamptz not null default now(),
  generated_at timestamptz null,
  expires_at timestamptz null,
  error_code text null,
  updated_at timestamptz not null default now(),
  constraint renderlab_account_exports_ready_state check (
    (status = 'ready' and storage_key is not null and generated_at is not null and expires_at is not null)
    or status <> 'ready'
  )
);

create index renderlab_account_exports_owner_requested_idx
  on public.renderlab_account_exports (owner_id, requested_at desc, id desc);

create index renderlab_account_exports_status_updated_idx
  on public.renderlab_account_exports (status, updated_at, id);

create index renderlab_account_exports_expiry_idx
  on public.renderlab_account_exports (expires_at, id)
  where status = 'ready' and expires_at is not null;

alter table public.renderlab_account_lifecycle enable row level security;
alter table public.renderlab_account_exports enable row level security;

revoke all privileges on table public.renderlab_account_lifecycle from public, anon, authenticated;
revoke all privileges on table public.renderlab_account_exports from public, anon, authenticated;
grant select, insert, update, delete on table public.renderlab_account_lifecycle to service_role;
grant select, insert, update, delete on table public.renderlab_account_exports to service_role;

alter table public.renderlab_beta_invitations
  add column deidentified_at timestamptz null;

alter table public.renderlab_beta_invitations
  drop constraint renderlab_beta_invitations_claim_state;

alter table public.renderlab_beta_invitations
  add constraint renderlab_beta_invitations_claim_state check (
    (
      claimed_at is null
      and claimed_user_id is null
      and deidentified_at is null
    )
    or (
      claimed_at is not null
      and claimed_user_id is not null
      and deidentified_at is null
    )
    or (
      claimed_at is not null
      and claimed_user_id is null
      and deidentified_at is not null
    )
  );

create or replace function public.renderlab_reject_deleting_owner_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.renderlab_account_lifecycle as lifecycle
    where lifecycle.user_id = new.owner_id
      and lifecycle.state = 'deleting'
  ) then
    raise exception 'renderlab_account_deleting' using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger generation_sources_deleting_owner_guard
before insert on public.generation_sources
for each row execute function public.renderlab_reject_deleting_owner_insert();

create trigger generation_jobs_deleting_owner_guard
before insert on public.generation_jobs
for each row execute function public.renderlab_reject_deleting_owner_insert();

create trigger media_assets_deleting_owner_guard
before insert on public.media_assets
for each row execute function public.renderlab_reject_deleting_owner_insert();

create trigger media_upload_sessions_deleting_owner_guard
before insert on public.media_upload_sessions
for each row execute function public.renderlab_reject_deleting_owner_insert();

create trigger media_collections_deleting_owner_guard
before insert on public.media_collections
for each row execute function public.renderlab_reject_deleting_owner_insert();

create trigger media_collection_items_deleting_owner_guard
before insert on public.media_collection_items
for each row execute function public.renderlab_reject_deleting_owner_insert();

create trigger generation_admission_reservations_deleting_owner_guard
before insert on public.generation_admission_reservations
for each row execute function public.renderlab_reject_deleting_owner_insert();

create trigger renderlab_account_exports_deleting_owner_guard
before insert on public.renderlab_account_exports
for each row execute function public.renderlab_reject_deleting_owner_insert();

create or replace function public.renderlab_begin_account_deletion(
  p_user_id uuid
)
returns setof public.renderlab_account_lifecycle
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_access public.renderlab_account_access%rowtype;
  v_lifecycle public.renderlab_account_lifecycle%rowtype;
  v_active_admin_count bigint;
begin
  if p_user_id is null then
    raise exception 'renderlab_account_invalid_request' using errcode = '22023';
  end if;

  -- Share the current Admin role/status serialization lock so an Admin mutation
  -- cannot race the last-active-admin self-deletion decision.
  perform pg_catalog.pg_advisory_xact_lock(72144, 10);

  select lifecycle.*
    into v_lifecycle
    from public.renderlab_account_lifecycle as lifecycle
    where lifecycle.user_id = p_user_id
    for update;

  if found then
    return next v_lifecycle;
    return;
  end if;

  select access.*
    into v_access
    from public.renderlab_account_access as access
    where access.user_id = p_user_id
    for update;

  if not found then
    raise exception 'renderlab_account_not_found' using errcode = 'P0002';
  end if;

  if v_access.role = 'admin' and v_access.status = 'active' then
    select count(*)
      into v_active_admin_count
      from public.renderlab_account_access as access
      where access.role = 'admin'
        and access.status = 'active';

    if v_active_admin_count <= 1 then
      raise exception 'renderlab_last_active_admin' using errcode = '23514';
    end if;
  end if;

  insert into public.renderlab_account_lifecycle (
    user_id,
    state,
    requested_at,
    quiescence_until,
    updated_at
  ) values (
    p_user_id,
    'deleting',
    pg_catalog.now(),
    pg_catalog.now() + interval '6 minutes',
    pg_catalog.now()
  )
  returning * into v_lifecycle;

  update public.renderlab_account_access
    set status = 'suspended',
        updated_at = pg_catalog.now()
    where user_id = p_user_id;

  return next v_lifecycle;
end;
$$;

revoke all privileges on function public.renderlab_begin_account_deletion(uuid)
  from public, anon, authenticated;
grant execute on function public.renderlab_begin_account_deletion(uuid)
  to service_role;

create or replace function public.renderlab_finalize_account_product_deletion(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lifecycle public.renderlab_account_lifecycle%rowtype;
  v_count bigint;
  v_counts jsonb := '{}'::jsonb;
begin
  if p_user_id is null then
    raise exception 'renderlab_account_invalid_request' using errcode = '22023';
  end if;

  select lifecycle.*
    into v_lifecycle
    from public.renderlab_account_lifecycle as lifecycle
    where lifecycle.user_id = p_user_id
      and lifecycle.state = 'deleting'
    for update;

  if not found then
    raise exception 'renderlab_account_deletion_not_started' using errcode = '55000';
  end if;

  if pg_catalog.now() < v_lifecycle.quiescence_until then
    raise exception 'renderlab_account_deletion_quiescing' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.generation_jobs as job
    where job.owner_id = p_user_id
      and job.status in ('queued', 'preparing', 'running', 'cancelling', 'persisting')
  ) then
    raise exception 'renderlab_account_jobs_active' using errcode = '55000';
  end if;

  delete from public.media_collection_items where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('mediaCollectionItems', v_count);

  delete from public.media_collections where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('mediaCollections', v_count);

  delete from public.media_upload_sessions where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('mediaUploadSessions', v_count);

  delete from public.media_assets where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('mediaAssets', v_count);

  delete from public.generation_sources where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('generationSources', v_count);

  delete from public.generation_admission_reservations where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('generationAdmissionReservations', v_count);

  delete from public.generation_jobs where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('generationJobs', v_count);

  delete from public.renderlab_account_exports where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('accountExports', v_count);

  update public.renderlab_beta_invitations
    set claimed_user_id = null,
        normalized_email = 'deleted+' || pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '') || '@invalid.renderlab',
        deidentified_at = pg_catalog.now()
    where claimed_user_id = p_user_id
      and claimed_at is not null
      and deidentified_at is null;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('deidentifiedInvitations', v_count);

  update public.renderlab_account_lifecycle
    set last_error_code = null,
        last_attempt_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where user_id = p_user_id;

  return v_counts;
end;
$$;

revoke all privileges on function public.renderlab_finalize_account_product_deletion(uuid)
  from public, anon, authenticated;
grant execute on function public.renderlab_finalize_account_product_deletion(uuid)
  to service_role;

comment on table public.renderlab_account_lifecycle is
  'Server-only irreversible account-deletion control state. Existing owner RESTRICT foreign keys remain intact until product/storage cleanup is proven.';
comment on table public.renderlab_account_exports is
  'Server-only account-data export requests and private R2 artifact metadata. Download authorization remains owner-scoped in the application.';
comment on column public.renderlab_beta_invitations.deidentified_at is
  'When non-null, the claimed invitation has been retained only as non-identifying admission history after account deletion; claimed_user_id is null and normalized_email is a random non-routable marker.';
comment on function public.renderlab_begin_account_deletion(uuid) is
  'Service-role-only irreversible deletion freeze. Serializes with Admin role/status mutation, prevents deleting the last active Admin, suspends product access and starts the six-minute upload-ticket quiescence window.';
comment on function public.renderlab_finalize_account_product_deletion(uuid) is
  'Service-role-only transactional product-row cleanup after application code proves active work settled and all derived owner R2 objects absent. Auth identity deletion remains a separate final provider step.';
