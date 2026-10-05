-- ENT-004 corrective follow-up: preserve the latest account-deletion finalizer
-- while adding upload-admission cleanup. 0025 accidentally replaced the function
-- with a body that omitted profile and preference deletion added in 0022/0023.

create or replace function public.renderlab_finalize_account_product_deletion(
  p_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lifecycle public.renderlab_account_lifecycle%rowtype;
  v_count bigint;
  v_counts jsonb := '{}'::jsonb;
begin
  if p_user_id is null then
    raise exception 'renderlab_account_invalid_request' using errcode = '22023';
  end if;

  select lifecycle.*
    into v_lifecycle
    from public.renderlab_account_lifecycle as lifecycle
    where lifecycle.user_id = p_user_id
      and lifecycle.state = 'deleting'
    for update;

  if not found then
    raise exception 'renderlab_account_deletion_not_started' using errcode = '55000';
  end if;

  if pg_catalog.now() < v_lifecycle.quiescence_until then
    raise exception 'renderlab_account_deletion_quiescing' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.generation_jobs as job
    where job.owner_id = p_user_id
      and job.status in ('queued', 'preparing', 'running', 'cancelling', 'persisting')
  ) then
    raise exception 'renderlab_account_jobs_active' using errcode = '55000';
  end if;

  delete from public.media_collection_items where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('mediaCollectionItems', v_count);

  delete from public.media_collections where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('mediaCollections', v_count);

  delete from public.media_upload_sessions where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('mediaUploadSessions', v_count);

  delete from public.media_assets where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('mediaAssets', v_count);

  delete from public.generation_sources where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('generationSources', v_count);

  delete from public.upload_admission_reservations where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('uploadAdmissionReservations', v_count);

  delete from public.generation_admission_reservations where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('generationAdmissionReservations', v_count);

  delete from public.generation_jobs where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('generationJobs', v_count);

  delete from public.renderlab_account_exports where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('accountExports', v_count);

  delete from public.renderlab_account_profiles where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('accountProfiles', v_count);

  delete from public.renderlab_account_preferences where owner_id = p_user_id;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('accountPreferences', v_count);

  update public.renderlab_beta_invitations
    set claimed_user_id = null,
        normalized_email = 'deleted+' || pg_catalog.replace(pg_catalog.gen_random_uuid()::text, '-', '') || '@invalid.renderlab',
        deidentified_at = pg_catalog.now()
    where claimed_user_id = p_user_id
      and claimed_at is not null
      and deidentified_at is null;
  get diagnostics v_count = row_count;
  v_counts := v_counts || pg_catalog.jsonb_build_object('deidentifiedInvitations', v_count);

  update public.renderlab_account_lifecycle
    set last_error_code = null,
        last_attempt_at = pg_catalog.now(),
        updated_at = pg_catalog.now()
    where user_id = p_user_id;

  return v_counts;
end;
$$;

revoke all privileges on function public.renderlab_finalize_account_product_deletion(uuid)
  from public, anon, authenticated;
grant execute on function public.renderlab_finalize_account_product_deletion(uuid)
  to service_role;
