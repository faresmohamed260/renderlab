-- ENT-005 forward hardening: narrow effective service-role privileges for
-- operational observability and preserve exact run-owned verifier cleanup.

revoke all on table public.renderlab_diagnostic_events from service_role;
revoke all on table public.renderlab_operational_alerts from service_role;
revoke all on sequence public.renderlab_diagnostic_events_id_seq from service_role;

grant select, insert on table public.renderlab_diagnostic_events to service_role;
grant usage on sequence public.renderlab_diagnostic_events_id_seq to service_role;
grant select on table public.renderlab_operational_alerts to service_role;

alter function public.renderlab_prune_diagnostic_events(integer)
  security definer;
alter function public.renderlab_record_operational_alert(text, text, text, text, text, timestamptz)
  security definer;

revoke all on function public.renderlab_prune_diagnostic_events(integer)
  from public, anon, authenticated, service_role;
revoke all on function public.renderlab_record_operational_alert(text, text, text, text, text, timestamptz)
  from public, anon, authenticated, service_role;

grant execute on function public.renderlab_prune_diagnostic_events(integer)
  to service_role;
grant execute on function public.renderlab_record_operational_alert(text, text, text, text, text, timestamptz)
  to service_role;

create or replace function public.renderlab_cleanup_test_operational_observability(
  p_prefix text
)
returns table (
  diagnostic_deleted integer,
  alert_deleted integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_diagnostic_deleted integer := 0;
  v_alert_deleted integer := 0;
begin
  if p_prefix is null
    or char_length(p_prefix) < 7
    or char_length(p_prefix) > 26
    or p_prefix !~ '^test\.[a-z0-9_.:-]{1,20}\.$'
  then
    raise exception using message = 'renderlab_observability_cleanup_invalid_prefix';
  end if;

  delete from public.renderlab_diagnostic_events as event
  where pg_catalog.left(event.correlation_id, char_length(p_prefix)) = p_prefix;
  get diagnostics v_diagnostic_deleted = row_count;

  delete from public.renderlab_operational_alerts as alert
  where pg_catalog.left(alert.alert_key, char_length(p_prefix)) = p_prefix;
  get diagnostics v_alert_deleted = row_count;

  return query select v_diagnostic_deleted, v_alert_deleted;
end;
$$;

revoke all on function public.renderlab_cleanup_test_operational_observability(text)
  from public, anon, authenticated, service_role;
grant execute on function public.renderlab_cleanup_test_operational_observability(text)
  to service_role;

comment on function public.renderlab_cleanup_test_operational_observability(text) is
  'Service-role-only exact test-prefix cleanup for run-owned ENT-005 diagnostics and alerts.';
