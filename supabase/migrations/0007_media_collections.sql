create table public.media_collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index media_collections_owner_normalized_name_idx
  on public.media_collections (owner_id, lower(btrim(name)));

create index media_collections_owner_updated_at_idx
  on public.media_collections (owner_id, updated_at desc, id desc);

create table public.media_collection_items (
  collection_id uuid not null references public.media_collections(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (collection_id, media_asset_id)
);

create index media_collection_items_owner_asset_idx
  on public.media_collection_items (owner_id, media_asset_id, collection_id);

create index media_collection_items_owner_collection_created_at_idx
  on public.media_collection_items (owner_id, collection_id, created_at desc, media_asset_id);

alter table public.media_collections enable row level security;
alter table public.media_collection_items enable row level security;

revoke all privileges on table public.media_collections from anon, authenticated;
revoke all privileges on table public.media_collection_items from anon, authenticated;

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
    where id = new.media_asset_id and owner_id = new.owner_id
  ) then
    raise exception 'media collection item asset must have the same owner';
  end if;

  return new;
end;
$$;

create trigger media_collections_owner_immutable
before update of owner_id on public.media_collections
for each row execute function public.renderlab_reject_owner_change();

create trigger media_collection_items_owner_immutable
before update of owner_id on public.media_collection_items
for each row execute function public.renderlab_reject_owner_change();

create trigger media_collection_items_owner_links
before insert or update of collection_id, media_asset_id, owner_id on public.media_collection_items
for each row execute function public.renderlab_enforce_media_collection_item_owner_links();

comment on table public.media_collections is
  'RenderLab account-owned named collections for durable media organization.';
comment on column public.media_collections.owner_id is
  'Immutable RenderLab account principal that owns this collection.';
comment on table public.media_collection_items is
  'Many-to-many membership between an account-owned RenderLab collection and same-owner durable media assets.';
comment on column public.media_collection_items.owner_id is
  'Immutable RenderLab account principal shared by the collection and durable media asset.';
