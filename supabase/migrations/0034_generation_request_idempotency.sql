-- R8 PR A (additive, unapplied): owner-scoped, atomic generation request identity.
-- The legacy renderlab_accept_generation_dispatch RPC and every app caller stay
-- unchanged. Only a separately reviewed PR B may begin calling these RPCs.
--
-- The owner ID and canonical SHA-256 digest come from the trusted server after
-- authentication and full request normalization. The SQL treats the digest as
-- an equality commitment, NOT as proof of normalization or authentication.
CREATE TABLE public.renderlab_generation_request_keys (
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_key text NOT NULL
    CHECK (request_key ~ '^[A-Za-z0-9_-]{16,128}$'),
  normalized_request_digest text NOT NULL
    CHECK (normalized_request_digest ~ '^[0-9a-f]{64}$'),
  job_id uuid NOT NULL UNIQUE REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL UNIQUE,
  reservation_id uuid NOT NULL UNIQUE,
  admission_deadline timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  replay_retain_until timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  PRIMARY KEY (owner_id, request_key),
  CONSTRAINT renderlab_generation_request_key_retention
    CHECK (replay_retain_until > created_at)
);

CREATE INDEX renderlab_generation_request_keys_retention_idx
  ON public.renderlab_generation_request_keys (replay_retain_until, owner_id);

ALTER TABLE public.renderlab_generation_request_keys ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.renderlab_generation_request_keys
  FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON TABLE public.renderlab_generation_request_keys IS
  'R8 service-RPC-only acceptance ledger. Job deletion on explicit account erasure cascades; no automatic TTL deletion exists. Retain active entries and at least 30 days after terminalization before a separately reviewed cleanup.';
COMMENT ON COLUMN public.renderlab_generation_request_keys.normalized_request_digest IS
  'Canonical SHA-256 hex of complete normalized intent including model, operation and resolved input identities; server provided, not an authorization credential.';
COMMENT ON COLUMN public.renderlab_generation_request_keys.attempt_id IS
  'Original durable dispatch attempt; retained even if the older outbox item is cleaned up.';

-- Both RPCs serialize by the same owner+key transaction-scoped advisory lock.
-- A digest mismatch never returns the previously accepted identity.
-- Hash collisions only serialize unrelated requests; they cannot alias rows.
CREATE FUNCTION public.renderlab_accept_generation_dispatch_idempotent(
  p_request_key text,
  p_request_digest text,
  p_attempt_id uuid,
  p_owner_id uuid,
  p_operation text,
  p_output_kind text,
  p_prompt text,
  p_workflow_id text,
  p_model text,
  p_ecosystem text,
  p_inputs jsonb,
  p_parameters jsonb,
  p_backend_key text,
  p_model_key text,
  p_model_version text,
  p_payload jsonb,
  p_admission_deadline timestamptz
)
RETURNS TABLE (
  outcome text,
  job_id uuid,
  attempt_id uuid,
  reservation_id uuid,
  admission_deadline timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $accept$
DECLARE
  v_old public.renderlab_generation_request_keys%ROWTYPE;
  v_job_id uuid;
  v_reservation_id uuid;
  v_bound boolean;
BEGIN
  IF p_owner_id IS NULL OR p_attempt_id IS NULL
    OR p_request_key IS NULL OR p_request_key !~ '^[A-Za-z0-9_-]{16,128}$'
    OR p_request_digest IS NULL OR p_request_digest !~ '^[0-9a-f]{64}$'
    OR p_operation IS NULL OR p_operation NOT IN ('create-image', 'edit-image')
    OR p_output_kind IS DISTINCT FROM 'image'
    OR p_backend_key IS DISTINCT FROM 'fibo'
    OR p_model_key IS DISTINCT FROM 'fibo-2.0-turbo'
    OR p_model_version IS DISTINCT FROM 'bria-fibo-2.0-turbo'
    OR p_payload IS NULL OR pg_catalog.jsonb_typeof(p_payload) <> 'object'
    OR p_admission_deadline IS NULL
    OR p_admission_deadline <= pg_catalog.now()
    OR p_admission_deadline > pg_catalog.now() + interval '30 minutes'
  THEN
    RAISE EXCEPTION USING MESSAGE = 'renderlab_idempotency_invalid_request';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text || ':' || p_request_key, 0)
  );
  SELECT existing.* INTO v_old
  FROM public.renderlab_generation_request_keys AS existing
  WHERE existing.owner_id = p_owner_id
    AND existing.request_key = p_request_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_old.normalized_request_digest IS DISTINCT FROM p_request_digest THEN
      RETURN QUERY SELECT 'conflict'::text, NULL::uuid, NULL::uuid,
                          NULL::uuid, NULL::timestamptz;
    ELSE
      -- No new deadline, reservation, job, or provider attempt on replay.
      RETURN QUERY SELECT 'replayed'::text, v_old.job_id, v_old.attempt_id,
                          v_old.reservation_id, v_old.admission_deadline;
    END IF;
    RETURN;
  END IF;

  -- Single SQL transaction: admission capacity/quota, job, durable dispatch,
  -- binding, and acceptance identity commit together or ALL roll back.
  -- Reuse the existing eligibility/settings/account-lock admission RPC.
  SELECT r.reservation_id INTO v_reservation_id
  FROM public.renderlab_reserve_generation_admission(p_owner_id) AS r;

  IF v_reservation_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'renderlab_idempotency_admission_unavailable';
  END IF;

  INSERT INTO public.generation_jobs (
    owner_id, status, operation, output_kind, prompt, workflow_id,
    model, ecosystem, inputs, parameters, worker_id, worker_state
  ) VALUES (
    p_owner_id, 'queued', p_operation, p_output_kind, p_prompt,
    p_workflow_id, p_model, p_ecosystem, coalesce(p_inputs, '[]'::jsonb),
    coalesce(p_parameters, '{}'::jsonb), p_backend_key, 'dispatch_pending'
  ) RETURNING id INTO v_job_id;

  INSERT INTO public.generation_dispatch_outbox (
    attempt_id, job_id, owner_id, backend_key, model_key, model_version,
    operation, payload, admission_deadline, dedup_retain_until
  ) VALUES (
    p_attempt_id, v_job_id, p_owner_id, p_backend_key, p_model_key,
    p_model_version, p_operation, p_payload, p_admission_deadline,
    p_admission_deadline + interval '7 days'
  );

  SELECT public.renderlab_bind_generation_admission(
    p_owner_id, v_reservation_id, v_job_id
  ) INTO v_bound;
  IF v_bound IS DISTINCT FROM true THEN
    RAISE EXCEPTION USING MESSAGE = 'renderlab_idempotency_admission_bind_failed';
  END IF;

  INSERT INTO public.renderlab_generation_request_keys (
    owner_id, request_key, normalized_request_digest, job_id, attempt_id,
    reservation_id, admission_deadline
  ) VALUES (
    p_owner_id, p_request_key, p_request_digest, v_job_id, p_attempt_id,
    v_reservation_id, p_admission_deadline
  );

  RETURN QUERY SELECT 'accepted'::text, v_job_id, p_attempt_id,
                      v_reservation_id, p_admission_deadline;
END;
$accept$;

-- Unlike an unlocked SELECT, a negative lookup is authoritative against
-- concurrent uncommitted accepts using the same owner+key. If that transaction
-- currently holds the advisory lock, report in_flight rather than not_found.
CREATE FUNCTION public.renderlab_lookup_generation_request_acceptance(
  p_owner_id uuid,
  p_request_key text,
  p_request_digest text
)
RETURNS TABLE (
  outcome text,
  job_id uuid,
  attempt_id uuid,
  reservation_id uuid,
  admission_deadline timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $lookup$
DECLARE
  v_old public.renderlab_generation_request_keys%ROWTYPE;
BEGIN
  IF p_owner_id IS NULL
    OR p_request_key IS NULL OR p_request_key !~ '^[A-Za-z0-9_-]{16,128}$'
    OR p_request_digest IS NULL OR p_request_digest !~ '^[0-9a-f]{64}$'
  THEN
    RAISE EXCEPTION USING MESSAGE = 'renderlab_idempotency_invalid_request';
  END IF;

  IF NOT pg_catalog.pg_try_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text || ':' || p_request_key, 0)
  ) THEN
    RETURN QUERY SELECT 'in_flight'::text, NULL::uuid, NULL::uuid,
                        NULL::uuid, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT existing.* INTO v_old
  FROM public.renderlab_generation_request_keys AS existing
  WHERE existing.owner_id = p_owner_id AND existing.request_key = p_request_key;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::uuid, NULL::uuid,
                        NULL::uuid, NULL::timestamptz;
  ELSIF v_old.normalized_request_digest IS DISTINCT FROM p_request_digest THEN
    RETURN QUERY SELECT 'conflict'::text, NULL::uuid, NULL::uuid,
                        NULL::uuid, NULL::timestamptz;
  ELSE
    RETURN QUERY SELECT 'accepted'::text, v_old.job_id, v_old.attempt_id,
                        v_old.reservation_id, v_old.admission_deadline;
  END IF;
END;
$lookup$;

REVOKE ALL ON FUNCTION public.renderlab_accept_generation_dispatch_idempotent(
  text, text, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb,
  text, text, text, jsonb, timestamptz
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.renderlab_lookup_generation_request_acceptance(
  uuid, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.renderlab_accept_generation_dispatch_idempotent(
  text, text, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb,
  text, text, text, jsonb, timestamptz
) TO service_role;
GRANT EXECUTE ON FUNCTION public.renderlab_lookup_generation_request_acceptance(
  uuid, text, text
) TO service_role;

COMMENT ON FUNCTION public.renderlab_accept_generation_dispatch_idempotent(
  text, text, uuid, uuid, text, text, text, text, text, text, jsonb, jsonb,
  text, text, text, jsonb, timestamptz
) IS 'R8 PR A: additive, service-only owner/key transactionally atomic admission+job+dispatch with digest conflict and replay; old RPC intact.';
COMMENT ON FUNCTION public.renderlab_lookup_generation_request_acceptance(
  uuid, text, text
) IS 'R8 PR A: service-only owner/key serialized acceptance read; in_flight means another transaction holds the key lock; not_found is never inferred during an in-flight accept.';
