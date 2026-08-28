alter table public.media_assets
  add column deleted_at timestamptz null,
  add column purged_at timestamptz null,
  add constraint media_assets_purged_requires_deleted
    check (purged_at is null or deleted_at is not null);

create index media_assets_owner_active_created_at_idx
  on public.media_assets (owner_id, created_at desc, id desc)
  where deleted_at is null;

create or replace function public.renderlab_enforce_media_asset_deletion_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.deleted_at is not null and new.deleted_at is distinct from old.deleted_at then
    raise exception 'deleted media asset tombstones are immutable';
  end if;

  if old.purged_at is not null and new.purged_at is distinct from old.purged_at then
    raise exception 'purged media asset state is immutable';
  end if;

  if new.purged_at is not null and new.deleted_at is null then
    raise exception 'media asset cannot be purged before it is deleted';
  end if;

  if new.deleted_at is not null then
    new.favorited_at := null;
  end if;

  return new;
end;
$$;

create trigger media_assets_deletion_state_guard
before update of deleted_at, purged_at, favorited_at on public.media_assets
for each row execute function public.renderlab_enforce_media_asset_deletion_state();

create or replace function public.renderlab_cleanup_media_asset_tombstone()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    update public.media_collections
      set updated_at = now()
      where owner_id = new.owner_id
        and id in (
          select collection_id
          from public.media_collection_items
          where owner_id = new.owner_id and media_asset_id = new.id
        );

    delete from public.media_collection_items
      where owner_id = new.owner_id and media_asset_id = new.id;

    delete from public.media_upload_sessions
      where owner_id = new.owner_id and media_asset_id = new.id;
  end if;

  return new;
end;
$$;

create trigger media_assets_tombstone_cleanup
after update of deleted_at on public.media_assets
for each row execute function public.renderlab_cleanup_media_asset_tombstone();

create or replace function public.renderlab_enforce_media_collection_item_owner_links()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.media_collections
    where id = new.collection_id and owner_id = new.owner_id
  ) then
    raise exception 'media collection item collection must have the same owner';
  end if;

  if not exists (
    select 1 from public.media_assets
    where id = new.media_asset_id
      and owner_id = new.owner_id
      and deleted_at is null
  ) then
    raise exception 'media collection item asset must be active and have the same owner';
  end if;

  return new;
end;
$$;

comment on column public.media_assets.deleted_at is
  'Immutable tombstone timestamp. Deleted assets are excluded from product reads/reuse while generation history may retain their opaque ID.';
comment on column public.media_assets.purged_at is
  'Timestamp proving the durable content and optional thumbnail were physically deleted from R2 after tombstoning.';
