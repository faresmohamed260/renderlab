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
  v_attach_token uuid := gen_random_uuid();
  v_reattach_token uuid := gen_random_uuid();
  v_handle text := 'fc-'||repeat('a',26)||'.'||repeat('b',64);
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
  -- F2: an unresolved known call at the send cap is attach-only; it
  -- must be eligible immediately, retain its count/evidence and never reserve a send.
  SELECT * INTO v_row FROM public.renderlab_claim_generation_dispatch_bounded(v_attach_token,90,1);
  IF v_row.attempt_id IS DISTINCT FROM v_known OR v_row.delivery_count <> 4
    OR v_row.backend_call_id IS DISTINCT FROM 'fc-'||repeat('a',26)
    OR v_row.send_reserved_at IS NULL OR v_row.execution_started_at IS NULL THEN
    RAISE EXCEPTION 'F2 known unresolved call must be attach-only at the cap';
  END IF;
  IF public.renderlab_reserve_generation_dispatch_send(v_known,v_attach_token) THEN
    RAISE EXCEPTION 'F2 attach-only claim must not reserve a second send';
  END IF;
  -- A live attach lease must not be stolen, and an expired attach lease
  -- must be recoverable even at the cap without incrementing it.
  SELECT * INTO v_row FROM public.renderlab_claim_generation_dispatch_bounded(gen_random_uuid(),90,1);
  IF v_row.attempt_id IS DISTINCT FROM v_final OR v_row.delivery_count <> 4 THEN
    RAISE EXCEPTION 'N2 fourth delivery must be permitted, older poison must not head-block';
  END IF;
  UPDATE public.generation_dispatch_outbox SET claim_until=now()-interval '1 second'
    WHERE attempt_id=v_known;
  SELECT * INTO v_row FROM public.renderlab_claim_generation_dispatch_bounded(v_reattach_token,90,1);
  IF v_row.attempt_id IS DISTINCT FROM v_known OR v_row.delivery_count <> 4
    OR v_row.claim_token IS DISTINCT FROM v_reattach_token THEN
    RAISE EXCEPTION 'F2 expired known-call lease must be reattachable at cap';
  END IF;
  IF public.renderlab_finish_generation_dispatch(v_known,v_attach_token,'dispatched',v_handle)
    OR public.renderlab_reserve_generation_dispatch_send(v_known,v_reattach_token)
    OR NOT public.renderlab_finish_generation_dispatch(v_known,v_reattach_token,'dispatched',v_handle) THEN
    RAISE EXCEPTION 'F2 current attach lease must finish original call, stale lease and send denied';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.generation_jobs job JOIN public.generation_dispatch_outbox item
      ON item.job_id=job.id WHERE item.attempt_id=v_known
      AND item.status='dispatched' AND item.delivery_count=4
      AND item.provider_job_id=v_handle AND job.provider_job_id=v_handle AND job.status='running') THEN
    RAISE EXCEPTION 'F2 successful attach must record original handle on outbox and job';
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
      AND (status<>'dispatched' OR backend_call_id IS NULL OR execution_started_at IS NULL OR delivery_count<>4)) THEN
    RAISE EXCEPTION 'N2 cap must preserve active lease and ambiguous execution evidence';
  END IF;
  UPDATE public.generation_dispatch_outbox SET claim_until=now()-interval '1 second'
    WHERE attempt_id=v_final;
  IF EXISTS(SELECT 1 FROM public.renderlab_claim_generation_dispatch_bounded(gen_random_uuid(),90,8)) THEN
    RAISE EXCEPTION 'N2 fifth delivery must not be claimed';
  END IF;
  IF EXISTS(SELECT 1 FROM public.generation_jobs WHERE owner_id=v_owner AND id<>(SELECT job_id FROM public.generation_dispatch_outbox WHERE attempt_id=v_known) AND status<>'queued') THEN
    RAISE EXCEPTION 'N2 cap must not declare uncertain work terminal';
  END IF;
  RAISE NOTICE 'PASS N2/F2: capped send delivery, healthy progress, active lease and original-call attachment at cap';
END;
$fixture$;
ROLLBACK;
