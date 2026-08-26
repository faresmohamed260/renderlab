create table if not exists public.generation_sources (
  id uuid primary key default gen_random_uuid(),
  storage_key text not null unique,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  width integer null check (width is null or width > 0),
  height integer null check (height is null or height > 0),
  purpose text not null default 'reference' check (purpose in ('reference')),
  status text not null default 'pending' check (status in ('pending', 'ready', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists generation_sources_status_created_at_idx
  on public.generation_sources (status, created_at desc);

alter table public.generation_sources enable row level security;

comment on table public.generation_sources is
  'Server-owned temporary reference sources uploaded directly to R2 and bound to generation requests by opaque UUID.';
