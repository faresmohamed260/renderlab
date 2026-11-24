-- N2: actual SQL on disposable PostgreSQL; no remote/provider effects.
BEGIN;
DO $fixture$
DECLARE
  v_owner uuid := gen_random_uuid();
  v_poison uuid := gen_random_uuid();
  v_healthy uuid := gen_random_uuid();
  v_final uuid := gen_random_uuid();
  v_active uuid := gen_random_uuid();
  v_known uuid := gen_random_uuid();
  v_token uuid := gen_random_uuid();
  v_attempt uuid;
  v_job uuid;
  v_row public.generation_dispatch_outbox;
  v_rpc text := 'public.renderlab_claim_generation_dispatch_bounded(uuid,integer,integer)';
BEGIN
  IF to_regprocedure(v_rpc) IS NULL OR
     NOT has_function_privilege('renderlab_modal_dispatcher', v_rpc, 'EXECUTE') OR
     NOT has_function_privilege('service_role', v_rpc, 'EXECUTE') OR
     has_function_privilege('anon', v_rpc, 'EXECUTE') OR
     has_function_privilege('authenticated', v_rpc, 'EXECUTE') OR
     has_function_privilege('renderlab_modal_worker', v_rpc, 'EXECUTE') THEN
    RAISE EXCEPTION 'N2 bounded claim grants drifted';
  END IF;
  INSERT INTO auth.users(id,email) VALUES(v_owner,'n2-dispatch@example.invalid');
  FOREACH v_attempt IN ARRAY ARRAY[v_poison,v_healthy,v_final,v_active,v_known] LOOP
    SELECT id INTO v_job FROM public.renderlab_accept_generation_dispatch(
      v_attempt,v_owner,'create-image','image','fixture','fixture','fibo2-edit-turbo','fibo',
      '[]'::jsonb,'{}'::jsonb,'fibo','fibo-2.0-turbo','bria-fibo-2.0-turbo',
      '{}'::jsonb,now()+interval '10 minutes');
  END LOOP;
  UPDATE public.generation_dispatch_outbox SET status='claimed',delivery_count=4,
    claim_token=v_token,claim_until=now()-interval '1 second',next_attempt_at=now()-interval '3 minutes'
    WHERE attempt_id=v_poison;
  UPDATE public.generation_dispatch_outbox SET status='claimed',delivery_count=4,
    claim_token=v_token,claim_until=now()+interval '90 seconds'
    WHERE attempt_id=v_active;
  UPDATE public.generation_dispatch_outbox SET status='unresolved',delivery_count=4,
    backend_call_id='fc-'||repeat('a',26),send_reserved_at=now()-interval '2 minutes',
    execution_started_at=now()-interval '1 minute',next_attempt_at=now()-interval '2 minutes'
    WHERE attempt_id=v_known;
  UPDATE public.generation_dispatch_outbox SET delivery_count=3,next_attempt_at=now()-interval '1 minute'
    WHERE attempt_id=v_final;
  SELECT * INTO v_row FROM public.renderlab_claim_generation_dispatch_bounded(gen_random_uuid(),90,1);
  IF v_row.attempt_id IS DISTINCT FROM v_final OR v_row.delivery_count <> 4 THEN
    RAISE EXCEPTION 'N2 fourth delivery must be permitted, older poison must not head-block';
  END IF;
  SELECT * INTO v_row FROM public.renderlab_claim_generation_dispatch_bounded(gen_random_uuid(),90,1);
  IF v_row.attempt_id IS DISTINCT FROM v_healthy OR v_row.delivery_count <> 1 THEN
    RAISE EXCEPTION 'N2 healthy intent must progress behind exhausted row';
  END IF;
  IF EXISTS(SELECT 1 FROM public.generation_dispatch_outbox
    WHERE attempt_id=v_poison AND (status<>'unresolved' OR claim_token IS NOT NULL OR delivery_count<>4))
    OR EXISTS(SELECT 1 FROM public.generation_dispatch_outbox WHERE attempt_id=v_active
      AND (status<>'claimed' OR claim_token IS DISTINCT FROM v_token OR delivery_count<>4))
    OR EXISTS(SELECT 1 FROM public.generation_dispatch_outbox WHERE attempt_id=v_known
      AND (status<>'unresolved' OR backend_call_id IS NULL OR execution_started_at IS NULL OR delivery_count<>4)) THEN
    RAISE EXCEPTION 'N2 cap must preserve active lease and ambiguous execution evidence';
  END IF;
  UPDATE public.generation_dispatch_outbox SET claim_until=now()-interval '1 second'
    WHERE attempt_id=v_final;
  IF EXISTS(SELECT 1 FROM public.renderlab_claim_generation_dispatch_bounded(gen_random_uuid(),90,8)) THEN
    RAISE EXCEPTION 'N2 fifth delivery must not be claimed';
  END IF;
  IF EXISTS(SELECT 1 FROM public.generation_jobs WHERE owner_id=v_owner AND status<>'queued') THEN
    RAISE EXCEPTION 'N2 cap must not declare uncertain work terminal';
  END IF;
  RAISE NOTICE 'PASS N2: capped delivery, healthy progress, active lease and known-call preservation';
END;
$fixture$;
ROLLBACK;
