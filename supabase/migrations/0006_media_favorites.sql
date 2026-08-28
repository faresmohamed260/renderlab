alter table public.media_assets
  add column if not exists favorited_at timestamptz null;

create index if not exists media_assets_owner_favorite_created_at_idx
  on public.media_assets (owner_id, created_at desc, id desc)
  where favorited_at is not null;

comment on column public.media_assets.favorited_at is
  'Nullable account-private favorite marker for an existing owner-scoped durable media asset. Null means not favorited.';
