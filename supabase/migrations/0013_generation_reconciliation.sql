-- Phase 14: autonomous generation reconciliation and idempotent durable output slots.
--
-- This migration is intentionally additive. Existing production application code can
-- continue inserting generated media without generation_output_index until the Phase 14
-- application candidate is explicitly deployed. Canonical historical outputs are
-- backfilled from generation_jobs.output_asset_ids; historical extra linked assets are
-- preserved with a null output index rather than being silently deleted or reclassified.

alter table public.generation_jobs
  add column if not exists reconcile_token uuid null,
  add column if not exists reconcile_lease_until timestamptz null;

alter table public.generation_jobs
  drop constraint if exists generation_jobs_reconcile_lease_pair_check;

alter table public.generation_jobs
  add constraint generation_jobs_reconcile_lease_pair_check
  check (
    (reconcile_token is null and reconcile_lease_until is null)
    or (reconcile_token is not null and reconcile_lease_until is not null)
  );

create index if not exists generation_jobs_reconcile_active_idx
  on public.generation_jobs (reconcile_lease_until, updated_at, id)
  where status in ('queued', 'preparing', 'running', 'persisting');

alter table public.media_assets
  add column if not exists generation_output_index integer null
    check (generation_output_index is null or generation_output_index >= 0);

alter table public.media_assets
  drop constraint if exists media_assets_generation_output_requires_job_check;

alter table public.media_assets
  add constraint media_assets_generation_output_requires_job_check
  check (generation_output_index is null or generation_job_id is not null);

with canonical_outputs as (
  select
    job.id as generation_job_id,
    output.asset_id,
    (output.ordinality - 1)::integer as generation_output_index
  from public.generation_jobs job
  cross join lateral unnest(job.output_asset_ids) with ordinality as output(asset_id, ordinality)
)
update public.media_assets asset
set generation_output_index = canonical.generation_output_index,
    updated_at = asset.updated_at
from canonical_outputs canonical
where asset.id = canonical.asset_id
  and asset.generation_job_id = canonical.generation_job_id
  and asset.generation_output_index is null;

create unique index if not exists media_assets_generation_output_slot_unique_idx
  on public.media_assets (generation_job_id, generation_output_index)
  where generation_job_id is not null and generation_output_index is not null;

comment on column public.generation_jobs.reconcile_token is
  'Short-lived server-only claim token preventing concurrent lifecycle reconciliation for one generation job.';
comment on column public.generation_jobs.reconcile_lease_until is
  'Expiry of the current server-only generation reconciliation claim. Browser clients never receive this value.';
comment on column public.media_assets.generation_output_index is
  'Zero-based durable output slot within one generation job. Null is retained only for pre-Phase-14 historical/noncanonical generated rows and non-generated media.';

create or replace function public.renderlab_claim_generation_reconciliation(
  p_owner_id uuid,
  p_job_id uuid,
  p_token uuid,
  p_lease_seconds integer default 600
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
  v_lease_seconds integer;
begin
  if p_owner_id is null or p_job_id is null or p_token is null then
    return false;
  end if;

  v_lease_seconds := least(greatest(coalesce(p_lease_seconds, 600), 30), 1800);

  update public.generation_jobs job
  set reconcile_token = p_token,
      reconcile_lease_until = now() + make_interval(secs => v_lease_seconds)
  where job.id = p_job_id
    and job.owner_id = p_owner_id
    and job.status in ('queued', 'preparing', 'running', 'persisting')
    and (
      job.reconcile_lease_until is null
      or job.reconcile_lease_until <= now()
      or job.reconcile_token = p_token
    );

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.renderlab_release_generation_reconciliation(
  p_owner_id uuid,
  p_job_id uuid,
  p_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.generation_jobs job
  set reconcile_token = null,
      reconcile_lease_until = null
  where job.id = p_job_id
    and job.owner_id = p_owner_id
    and job.reconcile_token = p_token;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.renderlab_claim_generation_reconciliation(uuid, uuid, uuid, integer)
  from public, anon, authenticated;
revoke all on function public.renderlab_release_generation_reconciliation(uuid, uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.renderlab_claim_generation_reconciliation(uuid, uuid, uuid, integer)
  to service_role;
grant execute on function public.renderlab_release_generation_reconciliation(uuid, uuid, uuid)
  to service_role;
