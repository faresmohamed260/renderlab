do $$
begin
  if exists (select 1 from public.generation_sources where owner_id is null) then
    raise exception 'generation_sources contains unowned rows';
  end if;
  if exists (select 1 from public.generation_jobs where owner_id is null) then
    raise exception 'generation_jobs contains unowned rows';
  end if;
  if exists (select 1 from public.media_assets where owner_id is null) then
    raise exception 'media_assets contains unowned rows';
  end if;
  if exists (select 1 from public.media_upload_sessions where owner_id is null) then
    raise exception 'media_upload_sessions contains unowned rows';
  end if;
end
$$;

alter table public.generation_sources alter column owner_id set not null;
alter table public.generation_jobs alter column owner_id set not null;
alter table public.media_assets alter column owner_id set not null;
alter table public.media_upload_sessions alter column owner_id set not null;

create or replace function public.renderlab_reject_owner_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'owner_id is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.renderlab_enforce_owner_links()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'media_assets' and new.generation_job_id is not null then
    if not exists (
      select 1 from public.generation_jobs
      where id = new.generation_job_id and owner_id = new.owner_id
    ) then
      raise exception 'media asset generation job must have the same owner';
    end if;
  elsif tg_table_name = 'media_upload_sessions' and new.media_asset_id is not null then
    if not exists (
      select 1 from public.media_assets
      where id = new.media_asset_id and owner_id = new.owner_id
    ) then
      raise exception 'upload session media asset must have the same owner';
    end if;
  end if;
  return new;
end;
$$;

create trigger generation_sources_owner_immutable
before update of owner_id on public.generation_sources
for each row execute function public.renderlab_reject_owner_change();

create trigger generation_jobs_owner_immutable
before update of owner_id on public.generation_jobs
for each row execute function public.renderlab_reject_owner_change();

create trigger media_assets_owner_immutable
before update of owner_id on public.media_assets
for each row execute function public.renderlab_reject_owner_change();

create trigger media_upload_sessions_owner_immutable
before update of owner_id on public.media_upload_sessions
for each row execute function public.renderlab_reject_owner_change();

create trigger media_assets_owner_link
before insert or update of generation_job_id, owner_id on public.media_assets
for each row execute function public.renderlab_enforce_owner_links();

create trigger media_upload_sessions_owner_link
before insert or update of media_asset_id, owner_id on public.media_upload_sessions
for each row execute function public.renderlab_enforce_owner_links();

comment on column public.generation_sources.owner_id is 'Immutable RenderLab account principal that owns this temporary reference source.';
comment on column public.generation_jobs.owner_id is 'Immutable RenderLab account principal that owns this generation job.';
comment on column public.media_assets.owner_id is 'Immutable RenderLab account principal that owns this durable media asset.';
comment on column public.media_upload_sessions.owner_id is 'Immutable RenderLab account principal that owns this persistent upload session.';
