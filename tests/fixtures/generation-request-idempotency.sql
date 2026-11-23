-- R8 PR A: additive idempotency RPC, ownership, rollback and old/new coexistence.
-- Runs exclusively in a disposable PostgreSQL DB; every row/trigger rolls back.
BEGIN;

CREATE FUNCTION conformance.reject_r8_registry_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $fault$
BEGIN
  IF NEW.request_key = 'r8-fixture-rollback-trigger' THEN
    RAISE EXCEPTION USING MESSAGE = 'r8_fixture_injected_post_bind_failure';
  END IF;
  RETURN NEW;
END;
$fault$;
CREATE TRIGGER conformance_reject_r8_registry_insert
  BEFORE INSERT ON public.renderlab_generation_request_keys
  FOR EACH ROW EXECUTE FUNCTION conformance.reject_r8_registry_insert();

DO $fixture$
DECLARE
  v_owner uuid := 'a1111111-1111-4111-8111-111111111111';
  v_foreign uuid := 'a2222222-2222-4222-8222-222222222222';
  v_absent uuid := 'a3333333-3333-4333-8333-333333333333';
  v_attempt uuid := 'a4444444-4444-4444-8444-444444444444';
  v_other_attempt uuid := 'a5555555-5555-4555-8555-555555555555';
  v_key text := 'r8-fixture-stable-request';
  v_digest text := repeat('a', 64);
  v_row record;
  v_job uuid;
  v_reservation uuid;
  v_deadline timestamptz;
  v_total integer;
  v_term text;
  v_failed boolean;
  v_rpc text := 'public.renderlab_accept_generation_dispatch_idempotent(text,text,uuid,uuid,text,text,text,text,text,text,jsonb,jsonb,text,text,text,jsonb,timestamptz)';
  v_lookup text := 'public.renderlab_lookup_generation_request_acceptance(uuid,text,text)';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.renderlab_generation_request_keys'::regclass
      AND relrowsecurity
  ) THEN RAISE EXCEPTION 'R8 registry must have RLS enabled'; END IF;
  IF to_regprocedure(v_rpc) IS NULL OR to_regprocedure(v_lookup) IS NULL
    OR to_regprocedure('public.renderlab_accept_generation_dispatch(uuid,uuid,text,text,text,text,text,text,jsonb,jsonb,text,text,text,jsonb,timestamptz)') IS NULL
  THEN RAISE EXCEPTION 'R8 or legacy RPC unavailable'; END IF;
  IF has_table_privilege('anon', 'public.renderlab_generation_request_keys', 'SELECT')
    OR has_table_privilege('authenticated', 'public.renderlab_generation_request_keys', 'SELECT')
    OR has_table_privilege('service_role', 'public.renderlab_generation_request_keys', 'SELECT')
    OR has_function_privilege('anon', v_rpc, 'EXECUTE')
    OR has_function_privilege('authenticated', v_lookup, 'EXECUTE')
    OR NOT has_function_privilege('service_role', v_rpc, 'EXECUTE')
    OR NOT has_function_privilege('service_role', v_lookup, 'EXECUTE')
  THEN RAISE EXCEPTION 'R8 service-only grants drifted'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = to_regprocedure(v_rpc)
      AND prosecdef
      AND proconfig && ARRAY['search_path=', 'search_path=""']::text[]
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = to_regprocedure(v_lookup)
      AND prosecdef
      AND proconfig && ARRAY['search_path=', 'search_path=""']::text[]
  ) THEN RAISE EXCEPTION 'R8 RPC must be SECURITY DEFINER with empty search_path'; END IF;

  INSERT INTO auth.users(id,email) VALUES
    (v_owner,'r8owner@example.invalid'),
    (v_foreign,'r8foreign@example.invalid'),
    (v_absent,'r8absent@example.invalid');
  INSERT INTO public.renderlab_account_access(user_id) VALUES
    (v_owner),(v_foreign),(v_absent);

  SELECT * INTO v_row FROM public.renderlab_lookup_generation_request_acceptance(
    v_owner, v_key, v_digest
  );
  IF v_row.outcome <> 'not_found' OR v_row.job_id IS NOT NULL
  THEN RAISE EXCEPTION 'Absent key lookup must be owner-scoped not_found'; END IF;

  SELECT * INTO v_row FROM public.renderlab_accept_generation_dispatch_idempotent(
    v_key, v_digest, v_attempt, v_owner,
    'create-image','image','fixture only','fixture','fibo2-edit-turbo','fibo',
    '[]'::jsonb,'{}'::jsonb,'fibo','fibo-2.0-turbo','bria-fibo-2.0-turbo',
    '{}'::jsonb,now()+interval '10 minutes'
  );
  IF v_row.outcome <> 'accepted' OR v_row.job_id IS NULL OR v_row.reservation_id IS NULL
    OR v_row.attempt_id IS DISTINCT FROM v_attempt
  THEN RAISE EXCEPTION 'R8 first acceptance lacks stable job/attempt/reservation'; END IF;
  v_job := v_row.job_id;
  v_reservation := v_row.reservation_id;
  v_deadline := v_row.admission_deadline;

  IF NOT EXISTS (
    SELECT 1 FROM public.generation_admission_reservations
    WHERE id = v_reservation AND owner_id = v_owner AND job_id = v_job
      AND released_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM public.generation_dispatch_outbox
    WHERE attempt_id = v_attempt AND job_id = v_job AND owner_id = v_owner
      AND admission_deadline = v_deadline AND status = 'pending'
  ) THEN RAISE EXCEPTION 'First accept not atomically bound to admission/outbox'; END IF;

  -- Replaying with a different proposed attempt must return the original one,
  -- without extension, another admission charge, or another dispatch.
  SELECT * INTO v_row FROM public.renderlab_accept_generation_dispatch_idempotent(
    v_key, v_digest, 'a6666666-6666-4666-8666-666666666666', v_owner,
    'create-image','image','fixture only','fixture','fibo2-edit-turbo','fibo',
    '[]'::jsonb,'{}'::jsonb,'fibo','fibo-2.0-turbo','bria-fibo-2.0-turbo',
    '{}'::jsonb,now()+interval '20 minutes'
  );
  IF v_row.outcome <> 'replayed' OR v_row.job_id IS DISTINCT FROM v_job
    OR v_row.attempt_id IS DISTINCT FROM v_attempt
    OR v_row.reservation_id IS DISTINCT FROM v_reservation
    OR v_row.admission_deadline IS DISTINCT FROM v_deadline
  THEN RAISE EXCEPTION 'Same intent replay changed immutable acceptance'; END IF;

  -- An old deadline does not invalidate a replay of a committed intent.
  SELECT * INTO v_row FROM public.renderlab_accept_generation_dispatch_idempotent(
    v_key, v_digest, 'a6767676-6767-4676-8676-676767676767', v_owner,
    'create-image','image','fixture only','fixture','fibo2-edit-turbo','fibo',
    '[]'::jsonb,'{}'::jsonb,'fibo','fibo-2.0-turbo','bria-fibo-2.0-turbo',
    '{}'::jsonb,now()-interval '1 day'
  );
  IF v_row.outcome <> 'replayed' OR v_row.job_id IS DISTINCT FROM v_job
    OR v_row.attempt_id IS DISTINCT FROM v_attempt
    OR v_row.admission_deadline IS DISTINCT FROM v_deadline
  THEN RAISE EXCEPTION 'Expired admission deadline prevented historical replay'; END IF;

  SELECT count(*) INTO v_total FROM public.generation_admission_reservations
    WHERE owner_id = v_owner;
  IF v_total <> 1 THEN RAISE EXCEPTION 'Replay consumed another admission grant'; END IF;
  SELECT count(*) INTO v_total FROM public.generation_dispatch_outbox
    WHERE owner_id = v_owner;
  IF v_total <> 1 THEN RAISE EXCEPTION 'Replay produced duplicate outbox'; END IF;
  SELECT count(*) INTO v_total FROM public.generation_jobs
    WHERE owner_id = v_owner;
  IF v_total <> 1 THEN RAISE EXCEPTION 'Replay produced duplicate job'; END IF;

  SELECT * INTO v_row FROM public.renderlab_accept_generation_dispatch_idempotent(
    v_key, repeat('b',64), 'a7777777-7777-4777-8777-777777777777', v_owner,
    'create-image','image','DIFFERENT','fixture','fibo2-edit-turbo','fibo',
    '[]'::jsonb,'{}'::jsonb,'fibo','fibo-2.0-turbo','bria-fibo-2.0-turbo',
    '{}'::jsonb,now()+interval '10 minutes'
  );
  IF v_row.outcome <> 'conflict' OR v_row.job_id IS NOT NULL
    OR v_row.attempt_id IS NOT NULL OR v_row.reservation_id IS NOT NULL
  THEN RAISE EXCEPTION 'Changed digest must conflict without leaking identity'; END IF;

  SELECT * INTO v_row FROM public.renderlab_lookup_generation_request_acceptance(
    v_owner, v_key, repeat('b',64)
  );
  IF v_row.outcome <> 'conflict' OR v_row.job_id IS NOT NULL
  THEN RAISE EXCEPTION 'Lookup failed to conceal conflicted job'; END IF;
  SELECT * INTO v_row FROM public.renderlab_lookup_generation_request_acceptance(
    v_absent, v_key, v_digest
  );
  IF v_row.outcome <> 'not_found' THEN RAISE EXCEPTION 'Cross-owner lookup leaked acceptance'; END IF;

  -- Same opaque key under a separate owner is independent. No cross-owner reuse.
  SELECT * INTO v_row FROM public.renderlab_accept_generation_dispatch_idempotent(
    v_key, v_digest, v_other_attempt, v_foreign,
    'create-image','image','fixture only','fixture','fibo2-edit-turbo','fibo',
    '[]'::jsonb,'{}'::jsonb,'fibo','fibo-2.0-turbo','bria-fibo-2.0-turbo',
    '{}'::jsonb,now()+interval '10 minutes'
  );
  IF v_row.outcome <> 'accepted' OR v_row.job_id IS NOT DISTINCT FROM v_job
    OR v_row.attempt_id IS DISTINCT FROM v_other_attempt
  THEN RAISE EXCEPTION 'Foreign owner request was not independently accepted'; END IF;

  -- A failure AFTER reserve, job, outbox and bind must rollback all side effects.
  v_failed := false;
  BEGIN
    PERFORM * FROM public.renderlab_accept_generation_dispatch_idempotent(
      'r8-fixture-rollback-trigger', repeat('c',64),
      'a8888888-8888-4888-8888-888888888888', v_absent,
      'create-image','image','triggered rollback','fixture','fibo2-edit-turbo','fibo',
      '[]'::jsonb,'{}'::jsonb,'fibo','fibo-2.0-turbo','bria-fibo-2.0-turbo',
      '{}'::jsonb,now()+interval '10 minutes'
    );
  EXCEPTION WHEN OTHERS THEN
    v_failed := (SQLERRM = 'r8_fixture_injected_post_bind_failure');
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'Injected post-bind failure was not observed'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.renderlab_generation_request_keys
    WHERE owner_id = v_absent
  ) OR EXISTS (
    SELECT 1 FROM public.generation_jobs WHERE owner_id = v_absent
  ) OR EXISTS (
    SELECT 1 FROM public.generation_admission_reservations WHERE owner_id = v_absent
  ) OR EXISTS (
    SELECT 1 FROM public.generation_dispatch_outbox WHERE owner_id = v_absent
  ) THEN RAISE EXCEPTION 'Failed atomic accept left committed partial state'; END IF;

  -- The existing 0031 terminal function still releases only once, while R8
  -- replays the same historical job even after terminalization.
  SELECT outcome INTO v_term FROM public.renderlab_terminalize_generation_and_release(
    v_owner, v_job, 'queued','failed',null,'r8_fixture','fixture error'
  );
  IF v_term <> 'applied' THEN RAISE EXCEPTION '0031 terminalization failed'; END IF;
  SELECT * INTO v_row FROM public.renderlab_accept_generation_dispatch_idempotent(
    v_key, v_digest, 'a9999999-9999-4999-8999-999999999999', v_owner,
    'create-image','image','fixture only','fixture','fibo2-edit-turbo','fibo',
    '[]'::jsonb,'{}'::jsonb,'fibo','fibo-2.0-turbo','bria-fibo-2.0-turbo',
    '{}'::jsonb,now()+interval '10 minutes'
  );
  IF v_row.outcome <> 'replayed' OR v_row.job_id IS DISTINCT FROM v_job
    OR (SELECT released_at FROM public.generation_admission_reservations
        WHERE id = v_reservation) IS NULL
  THEN RAISE EXCEPTION 'Terminal replay re-admitted or failed to retain identity'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.renderlab_generation_request_keys
    WHERE job_id = v_job AND attempt_id = v_attempt
      AND replay_retain_until > now() + interval '29 days'
  ) THEN RAISE EXCEPTION 'R8 identity not retained across 30-day minimum'; END IF;

  RAISE NOTICE 'PASS R8 SQL: owner isolation, replay, mismatch conflict, bound quota, rollback, 0031 and service grants';
END;
$fixture$;

ROLLBACK;
