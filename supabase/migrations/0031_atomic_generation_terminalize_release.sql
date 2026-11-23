-- P0-07: optional atomic terminalization + bound-admission release.
-- Additive only. Old job PATCH / outbox cancellation / admission RPCs remain unchanged.
-- Apply to hosted Supabase explicitly BEFORE deploying a consumer of this RPC.
--
-- Lock order is always: owner-scoped generation_jobs row, then the matching
-- generation_admission_reservations row. The old bind RPC reads the job before
-- updating the reservation; the reserve RPC locks the account/settings rows,
-- updates terminal reservations and performs only a plain EXISTS job read.
-- No outbox lock is acquired here.
CREATE FUNCTION public.renderlab_terminalize_generation_and_release(
  p_owner_id uuid,
  p_job_id uuid,
  p_expected_status text,
  p_terminal_status text,
  p_asset_id uuid DEFAULT NULL,
  p_error_code text DEFAULT NULL,
  p_error_message text DEFAULT NULL,
  p_reconcile_token uuid DEFAULT NULL,
  p_failover_history jsonb DEFAULT NULL
)
RETURNS TABLE (
  outcome text,
  job_status text,
  output_asset_ids uuid[],
  reservation_released boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_job public.generation_jobs%ROWTYPE;
  v_released integer := 0;
  v_now timestamptz := pg_catalog.now();
BEGIN
  -- No global user can be inferred from a service-role JWT. The authenticated
  -- server caller must derive p_owner_id from the verified session. This RPC
  -- independently verifies the job and any released reservation against it.
  IF p_owner_id IS NULL OR p_job_id IS NULL THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::text, NULL::uuid[], false;
    RETURN;
  END IF;

  SELECT job.* INTO v_job
  FROM public.generation_jobs AS job
  WHERE job.id = p_job_id AND job.owner_id = p_owner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::text, NULL::uuid[], false;
    RETURN;
  END IF;

  -- Same-terminal replay may finish an older app's unreleased reservation.
  -- Different terminal status/asset must never rewrite the first winner.
  IF v_job.status IN ('succeeded', 'failed', 'cancelled') THEN
    IF p_terminal_status IS DISTINCT FROM v_job.status
      OR (v_job.status = 'succeeded' AND p_asset_id IS NOT NULL
          AND (cardinality(v_job.output_asset_ids) <> 1
               OR v_job.output_asset_ids[1] IS DISTINCT FROM p_asset_id))
    THEN
      RETURN QUERY SELECT 'conflict'::text, v_job.status, v_job.output_asset_ids, false;
      RETURN;
    END IF;

    UPDATE public.generation_admission_reservations AS reservation
    SET released_at = v_now
    WHERE reservation.owner_id = p_owner_id
      AND reservation.job_id = p_job_id
      AND reservation.released_at IS NULL;
    GET DIAGNOSTICS v_released = ROW_COUNT;
    RETURN QUERY
      SELECT 'already_terminal'::text, v_job.status, v_job.output_asset_ids, v_released = 1;
    RETURN;
  END IF;

  -- Full status CAS plus the Unit 4 legal *terminal* edge table.
  IF p_expected_status IS DISTINCT FROM v_job.status
    OR NOT (
      (p_terminal_status = 'succeeded' AND v_job.status = 'persisting')
      OR (p_terminal_status = 'cancelled' AND v_job.status IN ('queued', 'cancelling'))
      OR (p_terminal_status = 'failed' AND v_job.status IN
        ('queued', 'preparing', 'running', 'persisting'))
    )
  THEN
    RETURN QUERY SELECT 'conflict'::text, v_job.status, v_job.output_asset_ids, false;
    RETURN;
  END IF;

  -- A current reconciliation claim cannot be bypassed by a stale or absent
  -- token. A supplied token also has to own an unexpired matching claim.
  IF (v_job.reconcile_token IS NOT NULL
      AND v_job.reconcile_lease_until > v_now
      AND p_reconcile_token IS DISTINCT FROM v_job.reconcile_token)
    OR (p_reconcile_token IS NOT NULL
      AND (p_reconcile_token IS DISTINCT FROM v_job.reconcile_token
        OR v_job.reconcile_lease_until IS NULL
        OR v_job.reconcile_lease_until <= v_now))
  THEN
    RETURN QUERY SELECT 'conflict'::text, v_job.status, v_job.output_asset_ids, false;
    RETURN;
  END IF;

  IF p_failover_history IS NOT NULL
    AND pg_catalog.jsonb_typeof(p_failover_history) <> 'array'
  THEN
    RETURN QUERY SELECT 'conflict'::text, v_job.status, v_job.output_asset_ids, false;
    RETURN;
  END IF;

  IF p_terminal_status = 'succeeded' THEN
    -- Never declare success without a previously committed canonical output.
    IF p_asset_id IS NULL OR p_error_code IS NOT NULL OR p_error_message IS NOT NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.media_assets AS asset
        WHERE asset.id = p_asset_id
          AND asset.owner_id = p_owner_id
          AND asset.generation_job_id = p_job_id
          AND asset.generation_output_index = 0
      )
    THEN
      RETURN QUERY SELECT 'conflict'::text, v_job.status, v_job.output_asset_ids, false;
      RETURN;
    END IF;
  ELSIF p_terminal_status = 'failed' THEN
    IF p_asset_id IS NOT NULL OR nullif(pg_catalog.btrim(p_error_code), '') IS NULL
      OR nullif(pg_catalog.btrim(p_error_message), '') IS NULL
    THEN
      RETURN QUERY SELECT 'conflict'::text, v_job.status, v_job.output_asset_ids, false;
      RETURN;
    END IF;
  ELSE
    IF p_asset_id IS NOT NULL OR p_error_code IS NOT NULL OR p_error_message IS NOT NULL
      OR cardinality(v_job.output_asset_ids) <> 0
      OR EXISTS (
        SELECT 1 FROM public.media_assets AS asset
        WHERE asset.generation_job_id = p_job_id AND asset.generation_output_index = 0
      )
    THEN
      RETURN QUERY SELECT 'conflict'::text, v_job.status, v_job.output_asset_ids, false;
      RETURN;
    END IF;
  END IF;

  -- On any exception (including a reservation trigger failure) PostgreSQL
  -- rolls back BOTH updates. No provider or object-storage I/O occurs here.
  UPDATE public.generation_jobs AS job
  SET status = p_terminal_status,
      output_asset_ids = CASE WHEN p_terminal_status = 'succeeded'
        THEN ARRAY[p_asset_id]::uuid[] ELSE job.output_asset_ids END,
      worker_state = CASE
        WHEN p_terminal_status = 'succeeded' THEN 'ready'
        WHEN p_terminal_status = 'cancelled' THEN 'cancelled'
        ELSE job.worker_state END,
      error_code = CASE WHEN p_terminal_status = 'failed' THEN p_error_code ELSE NULL END,
      error_message = CASE WHEN p_terminal_status = 'failed' THEN p_error_message ELSE NULL END,
      failover_history = coalesce(p_failover_history, job.failover_history),
      completed_at = coalesce(job.completed_at, v_now),
      updated_at = v_now
  WHERE job.id = p_job_id AND job.owner_id = p_owner_id;

  UPDATE public.generation_admission_reservations AS reservation
  SET released_at = v_now
  WHERE reservation.owner_id = p_owner_id
    AND reservation.job_id = p_job_id
    AND reservation.released_at IS NULL;
  GET DIAGNOSTICS v_released = ROW_COUNT;

  RETURN QUERY
    SELECT 'applied'::text, p_terminal_status,
      CASE WHEN p_terminal_status = 'succeeded'
        THEN ARRAY[p_asset_id]::uuid[] ELSE v_job.output_asset_ids END,
      v_released = 1;
END;
$$;

-- The creating migration identity owns this SECURITY DEFINER function.
-- Only the independently authenticated backend's service_role may execute it.
REVOKE ALL ON FUNCTION public.renderlab_terminalize_generation_and_release(
  uuid, uuid, text, text, uuid, text, text, uuid, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renderlab_terminalize_generation_and_release(
  uuid, uuid, text, text, uuid, text, text, uuid, jsonb
) TO service_role;

COMMENT ON FUNCTION public.renderlab_terminalize_generation_and_release(
  uuid, uuid, text, text, uuid, text, text, uuid, jsonb
) IS 'P0-07: service-only owner-scoped CAS terminalization and admission release in one transaction; no global SQL trigger.';
