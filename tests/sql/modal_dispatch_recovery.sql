-- Run in a disposable database after 0030 and the dispatch recovery migration.
begin;

do $$
declare
  owner uuid := gen_random_uuid();
  attempt uuid := gen_random_uuid();
  cancelled uuid := gen_random_uuid();
  unresolved uuid := gen_random_uuid();
  fresh uuid := gen_random_uuid();
  rollback_attempt uuid := gen_random_uuid();
  fresh_job uuid;
  previous_claim uuid := gen_random_uuid();
  next_claim uuid := gen_random_uuid();
  deadline timestamptz := now() + interval '15 minutes';
  finished timestamptz := deadline + interval '30 minutes';
  cleanup_at timestamptz := finished + interval '7 days';
  raw_call text := 'fc-0123456789abcdef';
  other_call text := 'fc-fedcba9876543210';
  job_id uuid;
  cancelled_job uuid;
  claimed integer;
begin
  assert not has_function_privilege('authenticated', 'public.renderlab_generation_dispatch_health()', 'execute');
  assert not has_function_privilege('renderlab_modal_worker', 'public.renderlab_lookup_generation_call(uuid)', 'execute');
  assert not has_function_privilege('anon', 'public.renderlab_begin_generation_call(uuid,timestamp with time zone,text)', 'execute');
  assert has_function_privilege('renderlab_modal_worker', 'public.renderlab_begin_generation_call(uuid,timestamp with time zone,text)', 'execute');
  assert has_function_privilege('renderlab_modal_dispatcher', 'public.renderlab_reserve_generation_dispatch_send(uuid,uuid)', 'execute');
  insert into auth.users(id) values (owner);

  select row.id into strict job_id
  from public.renderlab_accept_generation_dispatch(attempt, owner, 'create-image', 'image', 'fixture', 'test', 'fibo', 'test',
    '[]', '{}', 'fibo', 'fibo-2.0-turbo', 'bria-fibo-2.0-turbo', '{}', deadline) row;

  select count(*) into claimed from public.renderlab_claim_generation_dispatch(previous_claim);
  assert claimed = 1;
  assert (select count(*) from public.renderlab_claim_generation_dispatch(next_claim)) = 0;
  update public.generation_dispatch_outbox set claim_until = now() where attempt_id = attempt;
  assert not public.renderlab_reserve_generation_dispatch_send(attempt, previous_claim);
  assert (select count(*) from public.renderlab_claim_generation_dispatch(next_claim)) = 1;
  assert not public.renderlab_finish_generation_dispatch(attempt, previous_claim, 'failed');
  assert public.renderlab_reserve_generation_dispatch_send(attempt, next_claim);
  assert not public.renderlab_reserve_generation_dispatch_send(attempt, next_claim);
  assert public.renderlab_finish_generation_dispatch(attempt, next_claim, 'unresolved');
  assert (select status from public.generation_jobs where id = job_id) = 'queued';
  assert (public.renderlab_generation_dispatch_health()->>'unresolved')::integer = 1;
  assert (select count(*) from public.renderlab_claim_generation_dispatch(previous_claim)) = 0;
  assert not public.renderlab_begin_generation_attempt(attempt, deadline);
  assert not public.renderlab_begin_generation_call(attempt, deadline + interval '1 second', raw_call);
  assert public.renderlab_begin_generation_call(attempt, deadline, raw_call);
  assert not public.renderlab_begin_generation_call(attempt, deadline, other_call);
  assert (select backend_call_id from public.renderlab_lookup_generation_call(attempt)) = raw_call;
  assert (select count(*) from public.renderlab_claim_generation_dispatch(previous_claim)) = 1;
  assert not public.renderlab_reserve_generation_dispatch_send(attempt, previous_claim);
  assert not public.renderlab_finish_generation_dispatch(attempt, previous_claim, 'dispatched', other_call || '.' || repeat('b', 64));
  assert public.renderlab_finish_generation_dispatch(attempt, previous_claim, 'dispatched', raw_call || '.' || repeat('a', 64));
  assert (select status from public.generation_jobs where id = job_id) = 'running';
  assert public.renderlab_cleanup_generation_dispatch(cleanup_at) = 0;
  update public.generation_jobs set status = 'succeeded', completed_at = finished where id = job_id;

  assert public.renderlab_cleanup_generation_dispatch(cleanup_at - interval '1 millisecond') = 0;
  assert not public.renderlab_begin_generation_call(attempt, deadline, raw_call);
  assert not public.renderlab_begin_generation_attempt(attempt, deadline);
  assert public.renderlab_cleanup_generation_dispatch(cleanup_at) = 1;
  assert public.renderlab_cleanup_generation_dispatch(cleanup_at + interval '1 millisecond') = 0;
  assert not public.renderlab_begin_generation_call(attempt, deadline, raw_call);
  assert not public.renderlab_begin_generation_attempt(attempt, deadline);

  select row.id into strict cancelled_job
  from public.renderlab_accept_generation_dispatch(cancelled, owner, 'create-image', 'image', 'fixture', 'test', 'fibo', 'test',
    '[]', '{}', 'fibo', 'fibo-2.0-turbo', 'bria-fibo-2.0-turbo', '{}', deadline) row;
  assert (select count(*) from public.renderlab_claim_generation_dispatch(next_claim)) = 1;
  assert public.renderlab_reserve_generation_dispatch_send(cancelled, next_claim);
  assert public.renderlab_finish_generation_dispatch(cancelled, next_claim, 'unresolved');
  assert (select count(*) from public.renderlab_cancel_queued_generation_dispatch(owner, cancelled_job)) = 1;
  assert not public.renderlab_begin_generation_call(cancelled, deadline, other_call);
  assert not public.renderlab_begin_generation_attempt(cancelled, deadline);

  perform public.renderlab_accept_generation_dispatch(unresolved, owner, 'create-image', 'image', 'fixture', 'test', 'fibo', 'test',
    '[]', '{}', 'fibo', 'fibo-2.0-turbo', 'bria-fibo-2.0-turbo', '{}', deadline);
  assert (select count(*) from public.renderlab_claim_generation_dispatch(next_claim)) = 1;
  assert public.renderlab_reserve_generation_dispatch_send(unresolved, next_claim);
  assert public.renderlab_finish_generation_dispatch(unresolved, next_claim, 'unresolved');
  assert public.renderlab_cleanup_generation_dispatch(cleanup_at) = 1;
  assert exists (select 1 from public.generation_dispatch_outbox where attempt_id = unresolved);

  select row.id into strict fresh_job
  from public.renderlab_accept_generation_dispatch(fresh, owner, 'create-image', 'image', 'fixture', 'test', 'fibo', 'test',
    '[]', '{}', 'fibo', 'fibo-2.0-turbo', 'bria-fibo-2.0-turbo', '{}', deadline) row;
  assert (select count(*) from public.renderlab_claim_generation_dispatch(next_claim)) = 1;
  assert public.renderlab_reserve_generation_dispatch_send(fresh, next_claim);
  assert public.renderlab_finish_generation_dispatch(fresh, next_claim, 'dispatched', other_call || '.' || repeat('b', 64));
  assert (select status from public.generation_jobs where id = fresh_job) = 'queued';
  assert not public.renderlab_begin_generation_call(fresh, deadline, 'fc-bad');
  assert public.renderlab_begin_generation_call(fresh, deadline, other_call);
  assert (select status from public.generation_jobs where id = fresh_job) = 'running';

  perform public.renderlab_accept_generation_dispatch(rollback_attempt, owner, 'create-image', 'image', 'fixture', 'test', 'fibo', 'test',
    '[]', '{}', 'fibo', 'fibo-2.0-turbo', 'bria-fibo-2.0-turbo', '{}', deadline);
  assert (select count(*) from public.renderlab_claim_generation_dispatch(next_claim)) = 1;
  assert public.renderlab_begin_generation_attempt(rollback_attempt, deadline);
  assert not public.renderlab_begin_generation_attempt(rollback_attempt, deadline);
end;
$$;

rollback;
