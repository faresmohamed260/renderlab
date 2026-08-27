alter table public.media_assets
  add column if not exists origin text not null default 'generated'
    check (origin in ('generated', 'uploaded')),
  add column if not exists original_filename text null,
  add column if not exists display_name text null,
  add column if not exists size_bytes bigint null
    check (size_bytes is null or size_bytes > 0);

create index if not exists media_assets_origin_created_at_idx
  on public.media_assets (origin, created_at desc, id desc);

comment on table public.media_assets is
  'RenderLab durable media identity for generated and persistent uploaded assets. R2 storage keys remain server-side product metadata.';

create table if not exists public.media_upload_sessions (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null unique,
  filename text not null check (char_length(filename) between 1 and 180),
  display_name text not null check (char_length(display_name) between 1 and 240),
  mime_type text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  media_asset_id uuid null unique references public.media_assets(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_upload_sessions_status_created_at_idx
  on public.media_upload_sessions (status, created_at desc);

alter table public.media_upload_sessions enable row level security;

comment on table public.media_upload_sessions is
  'Server-owned staging records for persistent direct-to-R2 uploads. Only verified completions are promoted into public.media_assets.';
