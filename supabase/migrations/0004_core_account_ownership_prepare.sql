alter table public.generation_sources
  add column if not exists owner_id uuid null references auth.users(id) on delete restrict;

alter table public.generation_jobs
  add column if not exists owner_id uuid null references auth.users(id) on delete restrict;

alter table public.media_assets
  add column if not exists owner_id uuid null references auth.users(id) on delete restrict;

alter table public.media_upload_sessions
  add column if not exists owner_id uuid null references auth.users(id) on delete restrict;

create index if not exists generation_sources_owner_created_at_idx
  on public.generation_sources (owner_id, created_at desc, id desc);

create index if not exists generation_jobs_owner_created_at_idx
  on public.generation_jobs (owner_id, created_at desc, id desc);

create index if not exists media_assets_owner_created_at_idx
  on public.media_assets (owner_id, created_at desc, id desc);

create index if not exists media_upload_sessions_owner_created_at_idx
  on public.media_upload_sessions (owner_id, created_at desc, id desc);

-- Raw core records contain internal storage/provider metadata and remain server-owned.
-- RLS stays enabled, but browser roles receive no direct table privileges; product
-- routes enforce owner scope while using the server-only service role.
revoke all privileges on table public.generation_sources from anon, authenticated;
revoke all privileges on table public.generation_jobs from anon, authenticated;
revoke all privileges on table public.media_assets from anon, authenticated;
revoke all privileges on table public.media_upload_sessions from anon, authenticated;

comment on column public.generation_sources.owner_id is
  'RenderLab account principal that owns this temporary reference source. Prepared nullable for rolling deployment; tightened after owner-aware application code is live.';
comment on column public.generation_jobs.owner_id is
  'RenderLab account principal that owns this generation job. Prepared nullable for rolling deployment; tightened after owner-aware application code is live.';
comment on column public.media_assets.owner_id is
  'RenderLab account principal that owns this durable media asset. Prepared nullable for rolling deployment; tightened after owner-aware application code is live.';
comment on column public.media_upload_sessions.owner_id is
  'RenderLab account principal that owns this persistent upload session. Prepared nullable for rolling deployment; tightened after owner-aware application code is live.';
