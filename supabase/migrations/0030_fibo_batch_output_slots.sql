-- Issue #429: durable owner-scoped FIBO batch output slots.
--
-- This migration is additive and must not be applied merely by merging it.
-- Each slot owns one provider call and one deterministic durable media result;
-- provider identity remains server-only and is never returned to the browser.

create table if not exists public.generation_job_outputs (
  generation_job_id uuid not null references public.generation_jobs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete restrict,
  output_index integer not null check (output_index between 0 and 3),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'persisting', 'succeeded', 'failed', 'cancelled')),
  seed integer not null check (seed between 0 and 2147483647),
  worker_id text null,
  provider_job_id text null,
  worker_state text null,
  output_asset_id uuid null references public.media_assets(id) on delete set null,
  generated_vgl text null check (generated_vgl is null or char_length(generated_vgl) between 2 and 8192),
  error_code text null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz null,
  completed_at timestamptz null,
  primary key (generation_job_id, output_index),
  check ((status = 'succeeded') = (output_asset_id is not null)),
  check ((provider_job_id is null) = (worker_id is null))
);

create unique index if not exists generation_job_outputs_provider_job_unique_idx
  on public.generation_job_outputs (worker_id, provider_job_id)
  where worker_id is not null and provider_job_id is not null;

create index if not exists generation_job_outputs_owner_active_idx
  on public.generation_job_outputs (owner_id, updated_at, generation_job_id, output_index)
  where status in ('queued', 'running', 'persisting');

alter table public.generation_job_outputs enable row level security;
revoke all on table public.generation_job_outputs from public, anon, authenticated;
grant select, insert, update, delete on table public.generation_job_outputs to service_role;

create or replace function public.renderlab_enforce_generation_output_owner_link()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.generation_jobs job
    where job.id = new.generation_job_id and job.owner_id = new.owner_id
  ) then
    raise exception 'generation output slot must have the same owner as its job';
  end if;
  if new.output_asset_id is not null and not exists (
    select 1 from public.media_assets asset
    where asset.id = new.output_asset_id
      and asset.owner_id = new.owner_id
      and asset.generation_job_id = new.generation_job_id
      and asset.generation_output_index = new.output_index
  ) then
    raise exception 'generation output asset must match its owner, job, and slot';
  end if;
  return new;
end;
$$;

create trigger generation_job_outputs_owner_immutable
before update of owner_id on public.generation_job_outputs
for each row execute function public.renderlab_reject_owner_change();

create trigger generation_job_outputs_owner_link
before insert or update of generation_job_id, owner_id, output_index, output_asset_id
on public.generation_job_outputs
for each row execute function public.renderlab_enforce_generation_output_owner_link();

comment on table public.generation_job_outputs is
  'Server-owned durable per-output lifecycle for one 1-4 image generation job.';
comment on column public.generation_job_outputs.provider_job_id is
  'Private provider call identity for this output slot; never browser-visible.';
