-- P0-07 new-RPC conformance; all fixtures and triggers roll back.
-- MODEL_EDGE_ROWS comes from the actual pure Unit 4 module, never hand-copied.
BEGIN;
CREATE TEMP TABLE atomic_model_edges (from_status text, to_status text, decision text);
INSERT INTO atomic_model_edges VALUES
/* MODEL_EDGE_ROWS */;

DO $atomic$
DECLARE
  v_owner uuid := 'a1111111-1111-4111-8111-111111111111';
  v_other uuid := 'a2222222-2222-4222-8222-222222222222';
  v_job uuid;
  v_asset uuid;
  v_reservation uuid;
  v_token uuid := 'a4444444-4444-4444-8444-444444444444';
  v_result record;
  v_before text;
  v_after text;
  v_count integer := 0;
  v_applied integer := 0;
  v_conflicts integer := 0;
  v_already integer := 0;
  r record;
  v_job_with_claim uuid;
BEGIN
  IF to_regprocedure('public.renderlab_terminalize_generation_and_release(uuid,uuid,text,text,uuid,text,text,uuid,jsonb)') IS NULL THEN
    RAISE EXCEPTION 'P0-07 atomic RPC missing after 0031';
  END IF;
  IF has_function_privilege('anon','public.renderlab_terminalize_generation_and_release(uuid,uuid,text,text,uuid,text,text,uuid,jsonb)','EXECUTE')
    OR has_function_privilege('authenticated','public.renderlab_terminalize_generation_and_release(uuid,uuid,text,text,uuid,text,text,uuid,jsonb)','EXECUTE')
    OR NOT has_function_privilege('service_role','public.renderlab_terminalize_generation_and_release(uuid,uuid,text,text,uuid,text,text,uuid,jsonb)','EXECUTE')
  THEN RAISE EXCEPTION 'P0-07 RPC privilege boundary violated'; END IF;

  INSERT INTO auth.users(id,email) VALUES (v_owner, 'atomic.owner@example.invalid'),
    (v_other, 'atomic.other@example.invalid');
  INSERT INTO public.renderlab_account_access(user_id) VALUES (v_owner), (v_other);

  -- The pure state machine has only 8x3 candidate terminal pairs.
  FOR r IN SELECT * FROM atomic_model_edges
    WHERE to_status IN ('succeeded','failed','cancelled')
    ORDER BY from_status,to_status
  LOOP
    v_job:=pg_catalog.gen_random_uuid();
    v_asset:=pg_catalog.gen_random_uuid();
    INSERT INTO public.generation_jobs(
      id,owner_id,status,operation,output_kind,prompt,workflow_id,model,ecosystem
    ) VALUES (
      v_job,v_owner,r.from_status,'create-image','image','atomic fixture','fixture','fibo2-edit-turbo','fibo'
    );
    INSERT INTO public.generation_admission_reservations(owner_id,job_id,expires_at)
      VALUES(v_owner,v_job,pg_catalog.now()+interval '1 hour') RETURNING id INTO v_reservation;

    IF r.to_status = 'succeeded' THEN
      INSERT INTO public.media_assets(id,owner_id,generation_job_id,generation_output_index,
        kind,mime_type,storage_key)
      VALUES(v_asset,v_owner,v_job,0,'image','image/png','test/p007/'||v_job::text);
      IF r.from_status='succeeded' THEN
        UPDATE public.generation_jobs SET output_asset_ids=ARRAY[v_asset] WHERE id=v_job;
      END IF;
    END IF;

    SELECT * INTO v_result FROM public.renderlab_terminalize_generation_and_release(
      v_owner,v_job,r.from_status,r.to_status,
      CASE WHEN r.to_status='succeeded' THEN v_asset ELSE NULL::uuid END,
      CASE WHEN r.to_status='failed' THEN 'generation_failed' ELSE NULL::text END,
      CASE WHEN r.to_status='failed' THEN 'Sanitized fixture failure.' ELSE NULL::text END
    );
    SELECT status INTO v_after FROM public.generation_jobs WHERE id=v_job;

    IF r.decision='allowed' THEN
      IF v_result.outcome<>'applied' OR v_after<>r.to_status OR NOT v_result.reservation_released THEN
        RAISE EXCEPTION 'P0-07 legal % -> % failed: outcome %, final %, released %',
          r.from_status,r.to_status,v_result.outcome,v_after,v_result.reservation_released;
      END IF;
      v_applied:=v_applied+1;
    ELSIF r.decision='idempotent' THEN
      IF v_result.outcome<>'already_terminal' OR v_after<>r.from_status OR NOT v_result.reservation_released THEN
        RAISE EXCEPTION 'P0-07 terminal replay % failed: %, %',
          r.from_status,v_result.outcome,v_after;
      END IF;
      v_already:=v_already+1;
    ELSE
      IF v_result.outcome<>'conflict' OR v_after<>r.from_status OR v_result.reservation_released THEN
        RAISE EXCEPTION 'P0-07 illegal % -> % was accepted: %, %',
          r.from_status,r.to_status,v_result.outcome,v_after;
      END IF;
      v_conflicts:=v_conflicts+1;
    END IF;

    IF ((r.decision='forbidden') <> EXISTS(
      SELECT 1 FROM public.generation_admission_reservations
      WHERE id=v_reservation AND released_at IS NULL
    )) THEN
      RAISE EXCEPTION 'P0-07 atomic reservation diverged for % -> %',r.from_status,r.to_status;
    END IF;
    v_count:=v_count+1;

    -- Exactly-once replay: same terminal never changes timestamps or error payload.
    IF r.decision IN ('allowed','idempotent') THEN
      SELECT completed_at::text||'|'||coalesce(error_code,'')||'|'||coalesce(error_message,'')
      INTO v_before FROM public.generation_jobs WHERE id=v_job;
      SELECT * INTO v_result FROM public.renderlab_terminalize_generation_and_release(
        v_owner,v_job,r.from_status,r.to_status,
        CASE WHEN r.to_status='succeeded' THEN v_asset ELSE NULL::uuid END,
        CASE WHEN r.to_status='failed' THEN 'generation_failed' ELSE NULL::text END,
        CASE WHEN r.to_status='failed' THEN 'Sanitized fixture failure.' ELSE NULL::text END
      );
      SELECT completed_at::text||'|'||coalesce(error_code,'')||'|'||coalesce(error_message,'')
      INTO v_after FROM public.generation_jobs WHERE id=v_job;
      IF v_result.outcome <> 'already_terminal' OR v_result.reservation_released OR v_before IS DISTINCT FROM v_after
      THEN RAISE EXCEPTION 'P0-07 replay rewrote terminal %',r.to_status; END IF;
    END IF;
  END LOOP;
  IF v_count<>24 OR v_applied=0 OR v_conflicts=0 OR v_already<>3 THEN
    RAISE EXCEPTION 'P0-07 24-edge terminal matrix unexpected: % / % / % / %',
      v_count,v_applied,v_conflicts,v_already;
  END IF;

  -- Forged owner/job pair never reveals or mutates another owner's row.
  v_job:=pg_catalog.gen_random_uuid();
  INSERT INTO public.generation_jobs(
    id,owner_id,status,operation,output_kind,prompt,workflow_id,model,ecosystem
  ) VALUES(v_job,v_owner,'running','create-image','image','fixture','fixture','fibo','fibo');
  SELECT * INTO v_result FROM public.renderlab_terminalize_generation_and_release(
    v_other,v_job,'running','failed',NULL,'generation_failed','Sanitized fixture failure.'
  );
  IF v_result.outcome<>'not_found' THEN RAISE EXCEPTION 'Cross-owner forged RPC did not resolve not_found'; END IF;
  SELECT * INTO v_result FROM public.renderlab_terminalize_generation_and_release(
    v_owner,pg_catalog.gen_random_uuid(),'running','failed',NULL,'generation_failed','Sanitized fixture failure.'
  );
  IF v_result.outcome<>'not_found' THEN RAISE EXCEPTION 'Missing job RPC did not resolve not_found'; END IF;

  -- Token-claim fencing: wrong or absent token cannot finalize a claimed job.
  v_job_with_claim:=v_job;
  UPDATE public.generation_jobs
    SET reconcile_token=v_token, reconcile_lease_until=pg_catalog.now()+interval '10 minutes'
  WHERE id=v_job_with_claim;
  SELECT * INTO v_result FROM public.renderlab_terminalize_generation_and_release(
    v_owner,v_job_with_claim,'running','failed',NULL,'generation_failed','failure fixture'
  );
  IF v_result.outcome<>'conflict' THEN RAISE EXCEPTION 'Unclaimed RPC bypassed active token'; END IF;
  SELECT * INTO v_result FROM public.renderlab_terminalize_generation_and_release(
    v_owner,v_job_with_claim,'running','failed',NULL,'generation_failed','failure fixture',pg_catalog.gen_random_uuid()
  );
  IF v_result.outcome<>'conflict' THEN RAISE EXCEPTION 'Stale token was accepted'; END IF;
  SELECT * INTO v_result FROM public.renderlab_terminalize_generation_and_release(
    v_owner,v_job_with_claim,'running','failed',NULL,'generation_failed','failure fixture',v_token
  );
  IF v_result.outcome<>'applied' OR v_result.reservation_released THEN
    RAISE EXCEPTION 'Correct token failed on legacy unbound job'; END IF;

  -- Missing output, invalid error shape, and wrong state do not mutate job/held slot.
  v_job:=pg_catalog.gen_random_uuid();
  INSERT INTO public.generation_jobs(
    id,owner_id,status,operation,output_kind,prompt,workflow_id,model,ecosystem
  ) VALUES(v_job,v_owner,'persisting','create-image','image','fixture','fixture','fibo','fibo');
  INSERT INTO public.generation_admission_reservations(owner_id,job_id,expires_at)
    VALUES(v_owner,v_job,pg_catalog.now()+interval '1 hour');
  SELECT * INTO v_result FROM public.renderlab_terminalize_generation_and_release(
    v_owner,v_job,'persisting','succeeded',pg_catalog.gen_random_uuid()
  );
  IF v_result.outcome<>'conflict' THEN RAISE EXCEPTION 'Missing canonical media index was accepted'; END IF;
  SELECT * INTO v_result FROM public.renderlab_terminalize_generation_and_release(
    v_owner,v_job,'persisting','failed',NULL,NULL,NULL
  );
  IF v_result.outcome<>'conflict' THEN RAISE EXCEPTION 'Invalid failure metadata was accepted'; END IF;
  IF EXISTS(SELECT 1 FROM public.generation_jobs WHERE id=v_job AND status<>'persisting')
  THEN RAISE EXCEPTION 'Rejected RPC mutated job'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.generation_admission_reservations
    WHERE job_id=v_job AND released_at IS NULL)
  THEN RAISE EXCEPTION 'Rejected RPC leaked reservation'; END IF;

  RAISE NOTICE 'P0-07 RPC: %/24 pure-model terminal edges, applied %, already %, conflict %; service grants and replay passed',
    v_count,v_applied,v_already,v_conflicts;
END
$atomic$;

-- Prove rollback of the *job update* if reservation release raises afterward.
CREATE OR REPLACE FUNCTION pg_temp.reject_atomic_reservation_release() RETURNS trigger
LANGUAGE plpgsql AS $reject$
BEGIN
  RAISE EXCEPTION 'synthetic_reservation_update_failure';
END
$reject$;
CREATE TRIGGER conformance_abort_atomic_release
BEFORE UPDATE OF released_at ON public.generation_admission_reservations
FOR EACH ROW EXECUTE FUNCTION pg_temp.reject_atomic_reservation_release();

DO $rollback$
DECLARE
  v_owner uuid:='a1111111-1111-4111-8111-111111111111';
  v_job uuid:=pg_catalog.gen_random_uuid();
  v_failure_seen boolean:=false;
BEGIN
  INSERT INTO public.generation_jobs(
    id,owner_id,status,operation,output_kind,prompt,workflow_id,model,ecosystem
  ) VALUES(v_job,v_owner,'running','create-image','image','rollback fixture','fixture','fibo','fibo');
  INSERT INTO public.generation_admission_reservations(owner_id,job_id,expires_at)
    VALUES(v_owner,v_job,pg_catalog.now()+interval '1 hour');
  BEGIN
    PERFORM * FROM public.renderlab_terminalize_generation_and_release(
      v_owner,v_job,'running','failed',NULL,'generation_failed','Sanitized fixture failure.'
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='synthetic_reservation_update_failure' THEN v_failure_seen:=true;
    ELSE RAISE; END IF;
  END;
  IF NOT v_failure_seen THEN RAISE EXCEPTION 'Injected reservation failure was not observed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.generation_jobs WHERE id=v_job AND status='running')
    OR NOT EXISTS(SELECT 1 FROM public.generation_admission_reservations
      WHERE job_id=v_job AND released_at IS NULL)
  THEN RAISE EXCEPTION 'Terminalization and release failed to roll back together'; END IF;
  RAISE NOTICE 'P0-07 injected fault rolled back both the job status and reservation release';
END
$rollback$;
ROLLBACK;
