-- Phase 15: race-safe claims for bounded staging maintenance.
--
-- Old staging records are first moved into an internal `cleaning` state. Product
-- completion/submission paths no longer accept that staging identity, and a later
-- maintenance pass re-checks durable references before deleting the known R2 object.

alter table public.generation_sources
  drop constraint if exists generation_sources_status_check;

alter table public.generation_sources
  add constraint generation_sources_status_check
  check (status in ('pending', 'ready', 'failed', 'cleaning'));

alter table public.media_upload_sessions
  drop constraint if exists media_upload_sessions_status_check;

alter table public.media_upload_sessions
  add constraint media_upload_sessions_status_check
  check (status in ('pending', 'completed', 'failed', 'cleaning'));

create or replace function public.renderlab_generation_source_is_referenced(
  p_source_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.generation_jobs job
    where job.inputs @> jsonb_build_array(
      jsonb_build_object(
        'source', jsonb_build_object(
          'type', 'temporary-source',
          'id', p_source_id::text
        )
      )
    )
  );
$$;

create or replace function public.renderlab_claim_generation_source_cleanup(
  p_source_id uuid,
  p_cutoff timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select source.status into v_status
  from public.generation_sources source
  where source.id = p_source_id
    and source.created_at <= p_cutoff
    and source.status in ('pending', 'ready', 'failed')
  for update;

  if not found then
    return null;
  end if;

  if public.renderlab_generation_source_is_referenced(p_source_id) then
    return null;
  end if;

  update public.generation_sources source
  set status = 'cleaning',
      metadata = coalesce(source.metadata, '{}'::jsonb)
        || jsonb_build_object('cleanupPreviousStatus', v_status),
      updated_at = now()
  where source.id = p_source_id;

  return v_status;
end;
$$;

create or replace function public.renderlab_restore_generation_source_cleanup(
  p_source_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.generation_sources source
  set status = case source.metadata ->> 'cleanupPreviousStatus'
        when 'pending' then 'pending'
        when 'failed' then 'failed'
        else 'ready'
      end,
      metadata = coalesce(source.metadata, '{}'::jsonb) - 'cleanupPreviousStatus',
      updated_at = now()
  where source.id = p_source_id
    and source.status = 'cleaning';

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.renderlab_claim_media_upload_cleanup(
  p_upload_id uuid,
  p_cutoff timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_owner_id uuid;
  v_storage_key text;
begin
  select upload.status, upload.owner_id, upload.storage_key
  into v_status, v_owner_id, v_storage_key
  from public.media_upload_sessions upload
  where upload.id = p_upload_id
    and upload.created_at <= p_cutoff
    and upload.status in ('pending', 'failed')
    and upload.media_asset_id is null
  for update;

  if not found then
    return null;
  end if;

  if exists (
    select 1
    from public.media_assets asset
    where asset.owner_id = v_owner_id
      and asset.storage_key = v_storage_key
  ) then
    return null;
  end if;

  update public.media_upload_sessions upload
  set status = 'cleaning',
      metadata = coalesce(upload.metadata, '{}'::jsonb)
        || jsonb_build_object('cleanupPreviousStatus', v_status),
      updated_at = now()
  where upload.id = p_upload_id;

  return v_status;
end;
$$;

revoke all on function public.renderlab_generation_source_is_referenced(uuid)
  from public, anon, authenticated;
revoke all on function public.renderlab_claim_generation_source_cleanup(uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function public.renderlab_restore_generation_source_cleanup(uuid)
  from public, anon, authenticated;
revoke all on function public.renderlab_claim_media_upload_cleanup(uuid, timestamptz)
  from public, anon, authenticated;

grant execute on function public.renderlab_generation_source_is_referenced(uuid)
  to service_role;
grant execute on function public.renderlab_claim_generation_source_cleanup(uuid, timestamptz)
  to service_role;
grant execute on function public.renderlab_restore_generation_source_cleanup(uuid)
  to service_role;
grant execute on function public.renderlab_claim_media_upload_cleanup(uuid, timestamptz)
  to service_role;

comment on constraint generation_sources_status_check on public.generation_sources is
  'Temporary source lifecycle including internal Phase 15 cleanup claim state.';
comment on constraint media_upload_sessions_status_check on public.media_upload_sessions is
  'Persistent upload staging lifecycle including internal Phase 15 cleanup claim state.';
