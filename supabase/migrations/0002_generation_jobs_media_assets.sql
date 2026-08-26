create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'queued' check (status in ('queued', 'preparing', 'running', 'persisting', 'succeeded', 'failed', 'cancelled')),
  operation text not null check (operation in ('create-image', 'edit-image', 'create-video', 'animate-image')),
  output_kind text not null check (output_kind in ('image', 'video')),
  prompt text not null,
  workflow_id text not null,
  model text not null,
  ecosystem text not null,
  inputs jsonb not null default '[]'::jsonb,
  parameters jsonb not null default '{}'::jsonb,
  worker_id text null,
  provider_job_id text null,
  worker_state text null,
  failover_history jsonb not null default '[]'::jsonb,
  output_asset_ids uuid[] not null default '{}'::uuid[],
  error_code text null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null
);

create index if not exists generation_jobs_status_created_at_idx
  on public.generation_jobs (status, created_at desc);

create index if not exists generation_jobs_provider_job_id_idx
  on public.generation_jobs (provider_job_id)
  where provider_job_id is not null;

alter table public.generation_jobs enable row level security;

comment on table public.generation_jobs is
  'RenderLab-owned asynchronous generation jobs. Worker/provider details are server-side operational metadata.';

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  generation_job_id uuid null references public.generation_jobs(id) on delete set null,
  kind text not null check (kind in ('image', 'video')),
  mime_type text not null,
  storage_key text not null unique,
  thumbnail_storage_key text null,
  width integer null check (width is null or width > 0),
  height integer null check (height is null or height > 0),
  duration_ms integer null check (duration_ms is null or duration_ms >= 0),
  provenance jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_assets_generation_job_id_idx
  on public.media_assets (generation_job_id);

create index if not exists media_assets_created_at_idx
  on public.media_assets (created_at desc);

alter table public.media_assets enable row level security;

comment on table public.media_assets is
  'RenderLab durable generated/uploaded media metadata. R2 storage keys remain server-side product metadata.';
