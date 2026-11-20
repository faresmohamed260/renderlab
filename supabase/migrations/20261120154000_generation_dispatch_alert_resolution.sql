-- Resolve the dedicated dispatch-health alert after the monitored condition clears.
create or replace function public.renderlab_resolve_operational_alert(
  p_alert_key text,
  p_resolved_at timestamptz default pg_catalog.now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if p_alert_key is null
    or char_length(p_alert_key) < 1
    or char_length(p_alert_key) > 80
    or p_alert_key !~ '^[a-z0-9_.:-]+$'
    or p_resolved_at is null
    or p_resolved_at > pg_catalog.now() + interval '1 minute'
  then
    raise exception using message = 'renderlab_operational_alert_resolution_invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_alert_key, 5015)
  );

  update public.renderlab_operational_alerts as alert
  set state = 'resolved',
      resolved_at = greatest(alert.last_seen_at, p_resolved_at),
      updated_at = pg_catalog.now()
  where alert.alert_key = p_alert_key
    and alert.state = 'open'
    and alert.last_seen_at <= p_resolved_at;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.renderlab_resolve_operational_alert(text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.renderlab_resolve_operational_alert(text, timestamptz)
  to service_role;

comment on function public.renderlab_resolve_operational_alert(text, timestamptz) is
  'Service-role-only idempotent operational-alert recovery transition.';
