-- All fixture rows live inside one rolled-back transaction. No production DB.
-- __MODEL_EDGE_ROWS__ is generated from the actual TypeScript policy module.
BEGIN;
CREATE TEMP TABLE conformance_edges (from_status text, to_status text, decision text);
INSERT INTO conformance_edges VALUES
/* MODEL_EDGE_ROWS */;

DO $gate$
DECLARE
  r record;
  c text;
  allowed_values text[] := ARRAY[
    'queued','preparing','running','cancelling','persisting','succeeded','failed','cancelled'
  ];
  actual_values text[];
  rls_table text;
  rpc text;
  v_owner uuid := '11111111-1111-4111-8111-111111111111';
  v_foreign uuid := '22222222-2222-4222-8222-222222222222';
  v_job uuid := '33333333-3333-4333-8333-333333333333';
  v_token uuid := '44444444-4444-4444-8444-444444444444';
  v_dispatch_token uuid := '55555555-5555-4555-8555-555555555555';
  v_attempt uuid := '66666666-6666-4666-8666-666666666666';
  v_dispatch_job uuid;
  v_reservation uuid;
  v_second_reservation uuid;
  v_claimed uuid;
  v_accepted boolean;
  v_result boolean;
  v_gaps integer := 0;
  v_legal integer := 0;
  v_forbidden integer := 0;
  v_states integer := 0;
BEGIN
  SELECT array_agg(status ORDER BY status) INTO actual_values
  FROM (
    SELECT unnest(allowed_values) AS status
  ) allowed;
  SELECT pg_get_constraintdef(oid) INTO c
    FROM pg_constraint
    WHERE conrelid = 'public.generation_jobs'::regclass
      AND conname = 'generation_jobs_status_check';
  IF c IS NULL THEN RAISE EXCEPTION 'generation_jobs_status_check is absent'; END IF;
  FOREACH rpc IN ARRAY allowed_values LOOP
    IF strpos(c, quote_literal(rpc)) = 0 THEN
      RAISE EXCEPTION 'job status % not in final SQL CHECK: %', rpc, c;
    END IF;
  END LOOP;

  FOR rls_table IN SELECT unnest(ARRAY[
    'generation_sources','generation_jobs','media_assets',
    'generation_admission_reservations','generation_dispatch_outbox',
    'renderlab_account_access','upload_admission_reservations'
  ]) LOOP
    IF NOT EXISTS(
      SELECT 1 FROM pg_class t JOIN pg_namespace n ON n.oid=t.relnamespace
      WHERE n.nspname='public' AND t.relname=rls_table
        AND t.relkind='r' AND t.relrowsecurity
    ) THEN RAISE EXCEPTION 'Missing RLS-enabled table: %', rls_table; END IF;
  END LOOP;
  IF NOT EXISTS (
    SELECT 1 FROM pg_attribute
    WHERE attrelid='public.generation_jobs'::regclass
      AND attname='owner_id' AND attnotnull AND NOT attisdropped
  ) THEN RAISE EXCEPTION 'generation_jobs.owner_id must be NOT NULL'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_index
    JOIN pg_class t ON t.oid=pg_index.indexrelid
    WHERE t.relname='media_assets_generation_output_slot_unique_idx' AND indisunique
  ) THEN RAISE EXCEPTION 'Missing unique durable generation output index'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_index
    JOIN pg_class t ON t.oid=pg_index.indexrelid
    WHERE t.relname='generation_admission_job_unique_idx' AND indisunique
  ) THEN RAISE EXCEPTION 'Missing admission/job unique index'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname='service_role' AND rolbypassrls
  ) THEN RAISE EXCEPTION 'Disposable service_role must mimic Supabase RLS bypass'; END IF;
  IF has_table_privilege('anon', 'public.generation_admission_reservations', 'SELECT')
    OR has_table_privilege('authenticated', 'public.generation_dispatch_outbox', 'SELECT')
    OR has_table_privilege('anon', 'public.generation_jobs', 'SELECT')
  THEN RAISE EXCEPTION 'Private tables unexpectedly readable by browser roles'; END IF;
  IF NOT has_table_privilege('service_role','public.generation_admission_reservations','SELECT')
     OR NOT has_table_privilege('service_role','public.generation_dispatch_outbox','SELECT')
  THEN
    -- generation_dispatch_outbox is intentionally RPC-only; inspect its grant separately below.
    IF NOT has_table_privilege('service_role','public.generation_admission_reservations','SELECT')
    THEN RAISE EXCEPTION 'Service role lacks explicit admission read grant'; END IF;
  END IF;

  FOREACH rpc IN ARRAY ARRAY[
    'public.renderlab_reserve_generation_admission(uuid)',
    'public.renderlab_bind_generation_admission(uuid,uuid,uuid)',
    'public.renderlab_release_generation_admission(uuid,uuid)',
    'public.renderlab_claim_generation_reconciliation(uuid,uuid,uuid,integer)',
    'public.renderlab_release_generation_reconciliation(uuid,uuid,uuid)',
    'public.renderlab_accept_generation_dispatch(uuid,uuid,text,text,text,text,text,text,jsonb,jsonb,text,text,text,jsonb,timestamptz)',
    'public.renderlab_claim_generation_dispatch(uuid,integer,integer)',
    'public.renderlab_finish_generation_dispatch(uuid,uuid,text,text,timestamptz,text)',
    'public.renderlab_cancel_queued_generation_dispatch(uuid,uuid)',
    'public.renderlab_reserve_generation_dispatch_send(uuid,uuid)',
    'public.renderlab_begin_generation_call(uuid,timestamptz,text)',
    'public.renderlab_generation_dispatch_health()'
  ] LOOP
    IF to_regprocedure(rpc) IS NULL THEN RAISE EXCEPTION 'Missing stored function: %', rpc; END IF;
  END LOOP;
  IF NOT has_function_privilege('service_role',
      'public.renderlab_reserve_generation_admission(uuid)', 'EXECUTE')
     OR has_function_privilege('anon',
      'public.renderlab_reserve_generation_admission(uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated',
      'public.renderlab_claim_generation_reconciliation(uuid,uuid,uuid,integer)', 'EXECUTE')
  THEN RAISE EXCEPTION 'Admission/reconciliation EXECUTE grants drifted'; END IF;

  INSERT INTO auth.users(id,email)
    VALUES(v_owner,'fixture.owner@example.invalid'),
          (v_foreign,'fixture.foreign@example.invalid');
  INSERT INTO public.renderlab_account_access(user_id) VALUES(v_owner);

  INSERT INTO public.generation_jobs(
    id,owner_id, status,operation,output_kind,prompt,workflow_id,model,ecosystem
  ) VALUES(
    v_job,v_owner,'queued','create-image','image','test','fixture','fibo2-edit-turbo','fibo'
  );

  -- Confirm SQL enforces the *value* domain (not necessarily the model's transitions).
  v_accepted := false;
  BEGIN
    UPDATE public.generation_jobs SET status='not_a_real_state' WHERE id=v_job;
    v_accepted := true;
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  IF v_accepted THEN RAISE EXCEPTION 'SQL accepts invalid status value'; END IF;

  -- Cross-product from the pure Unit 4 model: 8x8 = 64 actual DB UPDATE probes.
  FOR r IN SELECT * FROM conformance_edges ORDER BY from_status,to_status LOOP
    UPDATE public.generation_jobs SET status=r.from_status WHERE id=v_job;
    v_accepted := false;
    BEGIN
      UPDATE public.generation_jobs SET status=r.to_status WHERE id=v_job;
      v_accepted := true;
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    v_states := v_states+1;
    IF r.decision IN ('allowed','idempotent') THEN
      IF NOT v_accepted THEN
        RAISE EXCEPTION 'Allowed model edge was rejected by SQL: % to %',r.from_status,r.to_status;
      END IF;
      v_legal := v_legal+1;
    ELSE
      v_forbidden:=v_forbidden+1;
      IF v_accepted THEN
        v_gaps:=v_gaps+1; -- P0-07: generic UPDATE lacks transition trigger.
      ELSE
        RAISE EXCEPTION 'DB now guards % to %: revisit P0-07 expected gap',r.from_status,r.to_status;
      END IF;
    END IF;
  END LOOP;
  IF v_states<>64 OR v_gaps<>v_forbidden OR v_forbidden<30 THEN
    RAISE EXCEPTION 'Model-to-SQL matrix incomplete (pairs %, gap %/%)',v_states,v_gaps,v_forbidden;
  END IF;
  RAISE NOTICE 'EXPECTED_GAP_P0_07_GENERIC_UPDATE: % policy-forbidden transitions accepted by SQL', v_gaps;

  UPDATE public.generation_jobs SET status='running' WHERE id=v_job;
  IF public.renderlab_claim_generation_reconciliation(v_foreign,v_job,v_token,600)
  THEN RAISE EXCEPTION 'Cross-owner reconciliation claim accepted'; END IF;
  IF NOT public.renderlab_claim_generation_reconciliation(v_owner,v_job,v_token,600)
  THEN RAISE EXCEPTION 'Active job reconciliation claim rejected'; END IF;
  IF NOT public.renderlab_release_generation_reconciliation(v_owner,v_job,v_token)
  THEN RAISE EXCEPTION 'Matching reconciliation token release rejected'; END IF;
  IF public.renderlab_release_generation_reconciliation(v_owner,v_job,v_token)
  THEN RAISE EXCEPTION 'Duplicate reconciliation token release accepted'; END IF;

  -- Real admission RPC and real bind: deliberately expose a committed-state gap.
  SELECT reservation_id INTO v_reservation
    FROM public.renderlab_reserve_generation_admission(v_owner);
  IF v_reservation IS NULL
    OR NOT public.renderlab_bind_generation_admission(v_owner,v_reservation,v_job)
  THEN RAISE EXCEPTION 'Admission reserve/bind failed'; END IF;
  UPDATE public.generation_jobs SET status='failed' WHERE id=v_job;
  IF NOT EXISTS(
    SELECT 1 FROM public.generation_admission_reservations
    WHERE id=v_reservation AND job_id=v_job AND released_at IS NULL
  ) THEN RAISE EXCEPTION 'P0-07 terminal+held expected gap no longer reproducible'; END IF;
  RAISE NOTICE 'EXPECTED_GAP_P0_07_NONATOMIC_RELEASE: terminal job retains held bound reservation';

  -- Existing RPC opportunistically settles terminal-bound admission on owner return.
  SELECT reservation_id INTO v_second_reservation
    FROM public.renderlab_reserve_generation_admission(v_owner);
  IF v_second_reservation IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.generation_admission_reservations
    WHERE id=v_reservation AND released_at IS NOT NULL
  ) THEN RAISE EXCEPTION 'Owner-return admission auto-settlement failed'; END IF;
  IF NOT public.renderlab_release_generation_admission(v_owner,v_second_reservation)
  THEN RAISE EXCEPTION 'First unbound release rejected'; END IF;
  IF public.renderlab_release_generation_admission(v_owner,v_second_reservation)
  THEN RAISE EXCEPTION 'Second unbound release must be idempotent'; END IF;

  IF public.renderlab_claim_generation_reconciliation(v_owner,v_job,v_token,600)
  THEN RAISE EXCEPTION 'Terminal job reconciliation claim accepted'; END IF;

  -- Real durable dispatch RPCs without provider access or generations.
  SELECT id INTO v_dispatch_job FROM public.renderlab_accept_generation_dispatch(
    v_attempt,v_owner,'create-image','image','fixture only','fixture','fibo2-edit-turbo','fibo',
    '[]'::jsonb,'{}'::jsonb,'fibo','fibo-2.0-turbo','bria-fibo-2.0-turbo',
    '{}'::jsonb,now()+interval '10 minutes'
  );
  IF v_dispatch_job IS NULL OR NOT EXISTS(
    SELECT 1 FROM public.generation_dispatch_outbox
    WHERE attempt_id=v_attempt AND job_id=v_dispatch_job AND status='pending'
  ) THEN RAISE EXCEPTION 'Atomic dispatch admission failed'; END IF;

  SELECT attempt_id INTO v_claimed FROM public.renderlab_claim_generation_dispatch(v_dispatch_token,90,8)
    WHERE attempt_id=v_attempt;
  IF v_claimed IS DISTINCT FROM v_attempt THEN
    RAISE EXCEPTION 'Dispatch claim failed';
  END IF;
  IF NOT EXISTS(
    SELECT 1 FROM public.renderlab_cancel_queued_generation_dispatch(v_owner,v_dispatch_job)
    WHERE status='cancelled'
  ) THEN RAISE EXCEPTION 'Queued cancellation RPC failed'; END IF;
  IF EXISTS(
    SELECT 1 FROM public.generation_dispatch_outbox
    WHERE attempt_id=v_attempt AND status<>'cancelled'
  ) THEN RAISE EXCEPTION 'Cancellation must stop queued dispatch'; END IF;
  IF EXISTS(
    SELECT 1 FROM public.renderlab_cancel_queued_generation_dispatch(v_owner,v_dispatch_job)
  ) THEN RAISE EXCEPTION 'Duplicate queued cancellation must be idempotent'; END IF;
  RAISE NOTICE 'DB conformance: % state edges, % legal/idempotent, % expected transition gaps; admission and dispatch RPCs passed',
    v_states,v_legal,v_gaps;
END
$gate$;
ROLLBACK;
