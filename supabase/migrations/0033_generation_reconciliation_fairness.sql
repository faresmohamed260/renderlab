-- R2/R3 review follow-up: durable fairness without mutating job status or updated_at.
-- Apply BEFORE deploying reconcile-generation.ts that orders by last_reconciled_at.
ALTER TABLE public.generation_jobs
  ADD COLUMN IF NOT EXISTS last_reconciled_at timestamptz NULL;

COMMENT ON COLUMN public.generation_jobs.last_reconciled_at IS
  'Timestamp of the last successful owner-scoped reconciliation claim; active jobs with no prior claim sort first.';

CREATE INDEX IF NOT EXISTS generation_jobs_reconcile_fairness_idx
  ON public.generation_jobs (last_reconciled_at ASC NULLS FIRST, updated_at ASC, id ASC)
  WHERE status IN ('queued', 'preparing', 'running', 'cancelling', 'persisting');

CREATE INDEX IF NOT EXISTS generation_jobs_reconcile_fairness_owner_idx
  ON public.generation_jobs (owner_id, last_reconciled_at ASC NULLS FIRST, updated_at ASC, id ASC)
  WHERE status IN ('queued', 'preparing', 'running', 'cancelling', 'persisting');

-- Replace only the existing claim RPC: the new timestamp is written in the
-- exact same owner+job+token guarded UPDATE that acquires its 600s lease.
-- This guarantees fairness even when a pending 202 does not touch updated_at
-- or the provider throws before the post-claim poll completes.
CREATE OR REPLACE FUNCTION public.renderlab_claim_generation_reconciliation(
  p_owner_id uuid,
  p_job_id uuid,
  p_token uuid,
  p_lease_seconds integer DEFAULT 600
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated integer;
  v_lease_seconds integer;
BEGIN
  IF p_owner_id IS NULL OR p_job_id IS NULL OR p_token IS NULL THEN
    RETURN false;
  END IF;

  v_lease_seconds := least(greatest(coalesce(p_lease_seconds, 600), 30), 1800);

  UPDATE public.generation_jobs job
  SET reconcile_token = p_token,
      reconcile_lease_until = now() + make_interval(secs => v_lease_seconds),
      last_reconciled_at = now()
  WHERE job.id = p_job_id
    AND job.owner_id = p_owner_id
    AND job.status IN ('queued', 'preparing', 'running', 'cancelling', 'persisting')
    AND (
      job.reconcile_lease_until IS NULL
      OR job.reconcile_lease_until <= now()
      OR job.reconcile_token = p_token
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;

REVOKE ALL ON FUNCTION public.renderlab_claim_generation_reconciliation(uuid, uuid, uuid, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.renderlab_claim_generation_reconciliation(uuid, uuid, uuid, integer)
  TO service_role;
