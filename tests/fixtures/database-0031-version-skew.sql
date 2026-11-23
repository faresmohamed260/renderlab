-- P1-05: real database old/new/rollback app compatibility with 0031 installed.
-- This fixture is *always* rolled back; no provider access or remote resources.
BEGIN;
DO $p105$
DECLARE
  v_owner uuid := 'b1111111-1111-4111-8111-111111111111';
  v_other uuid := 'b2222222-2222-4222-8222-222222222222';
  v_old uuid := 'b3333333-3333-4333-8333-333333333333';
  v_new uuid := 'b4444444-4444-4444-8444-444444444444';
  v_rollback uuid := 'b5555555-5555-4555-8555-555555555555';
  v_result record;
  v_release_before timestamptz;
  v_release_after timestamptz;
  v_rpc text := 'public.renderlab_terminalize_generation_and_release(uuid,uuid,text,text,uuid,text,text,uuid,jsonb)';
BEGIN
  IF to_regprocedure(v_rpc) IS NULL THEN
    RAISE EXCEPTION 'P1-05: additive 0031 RPC absent';
  END IF;
  IF NOT has_function_privilege('service_role',v_rpc,'EXECUTE')
    OR has_function_privilege('anon',v_rpc,'EXECUTE')
    OR has_function_privilege('authenticated',v_rpc,'EXECUTE')
  THEN RAISE EXCEPTION 'P1-05: 0031 executable role drift'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid=to_regprocedure(v_rpc)
      AND p.prosecdef
      AND p.proconfig && ARRAY['search_path=', 'search_path=""']::text[]
  ) THEN RAISE EXCEPTION 'P1-05: 0031 SECURITY DEFINER / empty search_path drift'; END IF;

  INSERT INTO auth.users(id,email) VALUES
    (v_owner,'p105.owner@example.invalid'),
    (v_other,'p105.foreign@example.invalid');
  INSERT INTO public.renderlab_account_access(user_id) VALUES(v_owner),(v_other);
  INSERT INTO public.generation_jobs(
    id,owner_id,status,operation,output_kind,prompt,workflow_id,model,ecosystem
  ) VALUES
    (v_old,v_owner,'running','create-image','image','synthetic old app','fixture','fibo','fibo'),
    (v_new,v_owner,'running','create-image','image','synthetic new app','fixture','fibo','fibo'),
    (v_rollback,v_owner,'running','create-image','image','synthetic rollback app','fixture','fibo','fibo');
  INSERT INTO public.generation_admission_reservations(owner_id,job_id,expires_at)
  VALUES (v_owner,v_old,now()+interval '1 hour'),
         (v_owner,v_new,now()+interval '1 hour'),
         (v_owner,v_rollback,now()+interval '1 hour');

  -- Old app knows only expected-status SQL/PATCH and separate release.
  -- Installing 0031 has not invalidated that old write path.
  UPDATE public.generation_jobs SET status='failed',error_code='generation_failed',
    error_message='old app fixture' WHERE id=v_old AND owner_id=v_owner AND status='running';
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.generation_admission_reservations
    WHERE job_id=v_old AND released_at IS NULL
  ) THEN RAISE EXCEPTION 'P1-05: old caller path incompatibility / expected non-atomic gap absent'; END IF;
  UPDATE public.generation_admission_reservations SET released_at=now()
  WHERE job_id=v_old AND owner_id=v_owner AND released_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'P1-05: old caller release path broke'; END IF;

  -- New app calls atomic 0031; its first terminal write and reservation
  -- release must commit as one owner-scoped, idempotent result.
  SELECT * INTO v_result FROM public.renderlab_terminalize_generation_and_release(
    v_owner,v_new,'running','failed',NULL,'generation_failed','new app fixture'
  );
  IF v_result.outcome<>'applied' OR v_result.job_status<>'failed'
    OR NOT v_result.reservation_released
  THEN RAISE EXCEPTION 'P1-05: new app 0031 result invalid: %',v_result.outcome; END IF;
  SELECT released_at INTO v_release_before
  FROM public.generation_admission_reservations WHERE job_id=v_new;
  IF v_release_before IS NULL THEN RAISE EXCEPTION 'P1-05: atomic release missing'; END IF;
  SELECT * INTO v_result FROM public.renderlab_terminalize_generation_and_release(
    v_owner,v_new,'running','failed',NULL,'generation_failed','new app fixture'
  );
  SELECT released_at INTO v_release_after
  FROM public.generation_admission_reservations WHERE job_id=v_new;
  IF v_result.outcome<>'already_terminal' OR v_result.reservation_released
    OR v_release_before IS DISTINCT FROM v_release_after
  THEN RAISE EXCEPTION 'P1-05: replay changed terminal/release'; END IF;
  SELECT * INTO v_result FROM public.renderlab_terminalize_generation_and_release(
    v_other,v_new,'running','failed',NULL,'generation_failed','forged owner'
  );
  IF v_result.outcome<>'not_found'
  THEN RAISE EXCEPTION 'P1-05: cross-owner RPC was accepted'; END IF;

  -- Rollback app uses its original generic status mutation with 0031
  -- STILL INSTALLED. Never drop the function during application rollback.
  IF to_regprocedure(v_rpc) IS NULL THEN RAISE EXCEPTION 'P1-05: 0031 vanished'; END IF;
  UPDATE public.generation_jobs SET status='failed',error_code='generation_failed',
    error_message='rollback fixture' WHERE id=v_rollback AND owner_id=v_owner AND status='running';
  IF NOT FOUND THEN RAISE EXCEPTION 'P1-05: rollback-app old SQL path failed'; END IF;
  UPDATE public.generation_admission_reservations SET released_at=now()
  WHERE job_id=v_rollback AND owner_id=v_owner AND released_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'P1-05: rollback-app separate release failed'; END IF;

  -- Existing global SQL transition gap is intentionally observable:
  -- generic UPDATE is not protected by the converted 0031 RPC.
  UPDATE public.generation_jobs SET status='running' WHERE id=v_rollback AND status='failed';
  IF NOT FOUND THEN RAISE EXCEPTION 'P1-05: generic SQL transition gap changed; review contract'; END IF;
  RAISE NOTICE 'P1-05 PASS: old/new/rollback app with installed 0031; service-only grants; one release; owner isolation; expected generic gap';
END
$p105$;
ROLLBACK;
