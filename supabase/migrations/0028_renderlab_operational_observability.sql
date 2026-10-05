create table if not exists public.renderlab_diagnostic_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null,
  event text not null check (event in (
    'generation.submission',
    'generation.reconciliation',
    'generation.cancellation',
    'maintenance.pass',
    'account.data_lifecycle'
  )),
  level text not null check (level in ('info', 'warn', 'error')),
  correlation_id text not null check (
    char_length(correlation_id) between 1 and 64
    and correlation_id ~ '^[A-Za-z0-9_.:-]+$'
  ),
  job_id text check (job_id is null or char_length(job_id) between 1 and 80),
  operation text check (operation is null or operation in (
    'create-image',
    'edit-image',
    'create-video',
    'animate-image',
    'upscale-image'
  )),
  phase text check (phase is null or phase in (
    'rejected',
    'accepted',
    'already-terminal',
    'claim-busy',
    'cancellation',
    'stalled',
    'polled',
    'failed',
    'provider-outcome',
    'intent-accepted',
    'failover-attempt',
    'failover-complete',
    'provider-ready',
    'finalization-recovered',
    'finalization-complete',
    'source-claims',
    'source-cleanup',
    'upload-claims',
    'upload-cleanup',
    'media-purges',
    'diagnostic-retention',
    'deletion-retry',
    'deletion-complete',
    'notification-failed'
  )),
  status text check (status is null or status in (
    'queued',
    'preparing',
    'running',
    'cancelling',
    'persisting',
    'succeeded',
    'failed',
    'cancelled'
  )),
  code text check (code is null or code in (
    'invalid_request',
    'generation_access_denied',
    'generation_disabled',
    'generation_active_limit_reached',
    'generation_rate_limit_reached',
    'generation_backend_unavailable',
    'generation_submission_failed',
    'generation_orchestration_stalled',
    'reconciliation_failed',
    'generation_worker_unavailable',
    'worker_credit_exhausted',
    'worker_unavailable',
    'generation_reassignment_failed',
    'generation_provider_stalled',
    'generation_failed',
    'WORKER_CREDIT_EXHAUSTED',
    'WORKER_UNAVAILABLE',
    'PROVIDER_FAILED',
    'missing-dispatch',
    'unsupported-worker',
    'provider-unconfirmed',
    'timeout',
    'provider-unreachable',
    'confirmed',
    'not-running',
    'account_auth_unavailable',
    'account_auth_delete_failed',
    'account_storage_residue',
    'account_database_residue',
    'account_invitation_residue',
    'account_deletion_retryable',
    'account_deletion_mail_send_failed',
    'account_deletion_mail_recipient_unavailable'
  )),
  duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  count bigint check (count is null or count >= 0),
  success_count bigint check (success_count is null or success_count >= 0),
  failure_count bigint check (failure_count is null or failure_count >= 0),
  attempt bigint check (attempt is null or attempt >= 0)
);

create index if not exists renderlab_diagnostic_events_occurred_idx
  on public.renderlab_diagnostic_events (occurred_at desc, id desc);

create index if not exists renderlab_diagnostic_events_event_level_code_idx
  on public.renderlab_diagnostic_events (event, level, code, occurred_at desc);

create index if not exists renderlab_diagnostic_events_correlation_idx
  on public.renderlab_diagnostic_events (correlation_id, occurred_at desc);

alter table public.renderlab_diagnostic_events enable row level security;
revoke all on table public.renderlab_diagnostic_events from public, anon, authenticated;
revoke all on sequence public.renderlab_diagnostic_events_id_seq from public, anon, authenticated;
grant select, insert, delete on table public.renderlab_diagnostic_events to service_role;
grant usage, select on sequence public.renderlab_diagnostic_events_id_seq to service_role;

create table if not exists public.renderlab_operational_alerts (
  alert_key text primary key check (
    char_length(alert_key) between 1 and 80
    and alert_key ~ '^[a-z0-9_.:-]+$'
  ),
  family text not null check (family in (
    'generation-provider-degradation',
    'maintenance-failure',
    'account-deletion-stuck'
  )),
  severity text not null check (severity in ('warning', 'critical')),
  state text not null default 'open' check (state in ('open', 'resolved')),
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  occurrence_count bigint not null default 1 check (occurrence_count >= 1),
  last_event text not null check (char_length(last_event) between 1 and 80),
  last_code text check (last_code is null or char_length(last_code) between 1 and 80),
  last_notified_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint renderlab_operational_alert_time_check check (last_seen_at >= first_seen_at),
  constraint renderlab_operational_alert_resolution_check check (
    (state = 'open' and resolved_at is null)
    or (state = 'resolved' and resolved_at is not null)
  )
);

create index if not exists renderlab_operational_alerts_state_severity_idx
  on public.renderlab_operational_alerts (state, severity, last_seen_at desc);

alter table public.renderlab_operational_alerts enable row level security;
revoke all on table public.renderlab_operational_alerts from public, anon, authenticated;
grant select, insert, update on table public.renderlab_operational_alerts to service_role;

create or replace function public.renderlab_prune_diagnostic_events(
  p_limit integer default 500
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 500), 1), 2000);
  v_deleted integer;
begin
  with candidates as (
    select event.id
    from public.renderlab_diagnostic_events as event
    where event.occurred_at < pg_catalog.now() - interval '30 days'
    order by event.occurred_at asc, event.id asc
    limit v_limit
  )
  delete from public.renderlab_diagnostic_events as event
  using candidates
  where event.id = candidates.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create or replace function public.renderlab_record_operational_alert(
  p_alert_key text,
  p_family text,
  p_severity text,
  p_event text,
  p_code text,
  p_seen_at timestamptz default pg_catalog.now()
)
returns table (
  alert_key text,
  family text,
  severity text,
  state text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  occurrence_count bigint,
  last_event text,
  last_code text,
  last_notified_at timestamptz,
  should_notify boolean
)
language plpgsql
set search_path = ''
as $$
declare
  v_existing public.renderlab_operational_alerts%rowtype;
  v_next_severity text;
  v_should_notify boolean := false;
begin
  if p_alert_key is null
    or char_length(p_alert_key) < 1
    or char_length(p_alert_key) > 80
    or p_alert_key !~ '^[a-z0-9_.:-]+$'
  then
    raise exception using message = 'renderlab_operational_alert_invalid_key';
  end if;

  if p_family not in (
    'generation-provider-degradation',
    'maintenance-failure',
    'account-deletion-stuck'
  ) then
    raise exception using message = 'renderlab_operational_alert_invalid_family';
  end if;

  if p_severity not in ('warning', 'critical') then
    raise exception using message = 'renderlab_operational_alert_invalid_severity';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_alert_key, 5015)
  );

  select alert.*
  into v_existing
  from public.renderlab_operational_alerts as alert
  where alert.alert_key = p_alert_key
  for update;

  if not found then
    insert into public.renderlab_operational_alerts (
      alert_key,
      family,
      severity,
      state,
      first_seen_at,
      last_seen_at,
      occurrence_count,
      last_event,
      last_code,
      last_notified_at,
      resolved_at,
      updated_at
    ) values (
      p_alert_key,
      p_family,
      p_severity,
      'open',
      p_seen_at,
      p_seen_at,
      1,
      p_event,
      p_code,
      p_seen_at,
      null,
      pg_catalog.now()
    );
    v_should_notify := true;
  else
    if v_existing.family <> p_family then
      raise exception using message = 'renderlab_operational_alert_family_mismatch';
    end if;

    v_next_severity := case
      when v_existing.severity = 'critical' or p_severity = 'critical' then 'critical'
      else 'warning'
    end;

    v_should_notify := v_existing.last_notified_at is null
      or v_existing.last_notified_at <= p_seen_at - interval '60 minutes'
      or (v_existing.severity = 'warning' and p_severity = 'critical');

    update public.renderlab_operational_alerts as alert
    set severity = v_next_severity,
        state = 'open',
        last_seen_at = greatest(alert.last_seen_at, p_seen_at),
        occurrence_count = alert.occurrence_count + 1,
        last_event = p_event,
        last_code = p_code,
        last_notified_at = case when v_should_notify then p_seen_at else alert.last_notified_at end,
        resolved_at = null,
        updated_at = pg_catalog.now()
    where alert.alert_key = p_alert_key;
  end if;

  return query
    select
      alert.alert_key,
      alert.family,
      alert.severity,
      alert.state,
      alert.first_seen_at,
      alert.last_seen_at,
      alert.occurrence_count,
      alert.last_event,
      alert.last_code,
      alert.last_notified_at,
      v_should_notify
    from public.renderlab_operational_alerts as alert
    where alert.alert_key = p_alert_key;
end;
$$;

revoke all on function public.renderlab_prune_diagnostic_events(integer)
  from public, anon, authenticated;
revoke all on function public.renderlab_record_operational_alert(text, text, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.renderlab_prune_diagnostic_events(integer)
  to service_role;
grant execute on function public.renderlab_record_operational_alert(text, text, text, text, text, timestamptz)
  to service_role;

comment on table public.renderlab_diagnostic_events is
  'Server-owned privacy-bounded RenderLab operational diagnostics retained for 30 days.';
comment on table public.renderlab_operational_alerts is
  'Server-owned deduplicated operational alert state; contains sanitized operational metadata only.';
comment on function public.renderlab_prune_diagnostic_events(integer) is
  'Service-role-only bounded pruning for RenderLab diagnostic events older than 30 days.';
comment on function public.renderlab_record_operational_alert(text, text, text, text, text, timestamptz) is
  'Service-role-only atomic alert upsert plus 60-minute notification cooldown claim.';
