alter table public.renderlab_account_access
  add column generation_enabled boolean null,
  add column max_active_jobs integer null,
  add column max_jobs_per_hour integer null;

alter table public.renderlab_account_access
  add constraint renderlab_account_access_max_active_jobs_bounds
    check (max_active_jobs is null or max_active_jobs between 1 and 4),
  add constraint renderlab_account_access_max_jobs_per_hour_bounds
    check (max_jobs_per_hour is null or max_jobs_per_hour between 1 and 120);

create index renderlab_account_access_role_status_user_id_idx
  on public.renderlab_account_access (role, status, user_id);

create or replace function public.renderlab_admin_set_account_access(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_role text,
  p_status text,
  p_set_generation_enabled boolean,
  p_generation_enabled boolean,
  p_set_max_active_jobs boolean,
  p_max_active_jobs integer,
  p_set_max_jobs_per_hour boolean,
  p_max_jobs_per_hour integer
)
returns setof public.renderlab_account_access
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.renderlab_account_access%rowtype;
  v_target public.renderlab_account_access%rowtype;
  v_role text;
  v_status text;
  v_generation_enabled boolean;
  v_max_active_jobs integer;
  v_max_jobs_per_hour integer;
  v_active_admin_count bigint;
begin
  if p_actor_user_id is null or p_target_user_id is null then
    raise exception 'renderlab_admin_invalid_request' using errcode = '22023';
  end if;
  if p_role is not null and p_role not in ('member', 'admin') then
    raise exception 'renderlab_admin_invalid_request' using errcode = '22023';
  end if;
  if p_status is not null and p_status not in ('active', 'suspended') then
    raise exception 'renderlab_admin_invalid_request' using errcode = '22023';
  end if;
  if p_set_max_active_jobs and p_max_active_jobs is not null
     and (p_max_active_jobs < 1 or p_max_active_jobs > 4) then
    raise exception 'renderlab_admin_invalid_request' using errcode = '22023';
  end if;
  if p_set_max_jobs_per_hour and p_max_jobs_per_hour is not null
     and (p_max_jobs_per_hour < 1 or p_max_jobs_per_hour > 120) then
    raise exception 'renderlab_admin_invalid_request' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(72144, 10);

  select a.*
    into v_actor
    from public.renderlab_account_access as a
    where a.user_id = p_actor_user_id
    for share;

  if not found or v_actor.role <> 'admin' or v_actor.status <> 'active' then
    raise exception 'renderlab_admin_required' using errcode = '42501';
  end if;

  select a.*
    into v_target
    from public.renderlab_account_access as a
    where a.user_id = p_target_user_id
    for update;

  if not found then
    raise exception 'renderlab_account_not_found' using errcode = 'P0002';
  end if;

  v_role := coalesce(p_role, v_target.role);
  v_status := coalesce(p_status, v_target.status);
  v_generation_enabled := case
    when p_set_generation_enabled then p_generation_enabled
    else v_target.generation_enabled
  end;
  v_max_active_jobs := case
    when p_set_max_active_jobs then p_max_active_jobs
    else v_target.max_active_jobs
  end;
  v_max_jobs_per_hour := case
    when p_set_max_jobs_per_hour then p_max_jobs_per_hour
    else v_target.max_jobs_per_hour
  end;

  if v_target.role = 'admin'
     and v_target.status = 'active'
     and (v_role <> 'admin' or v_status <> 'active') then
    select count(*)
      into v_active_admin_count
      from public.renderlab_account_access as a
      where a.role = 'admin'
        and a.status = 'active';

    if v_active_admin_count <= 1 then
      raise exception 'renderlab_last_active_admin' using errcode = '23514';
    end if;
  end if;

  if p_actor_user_id = p_target_user_id
     and (v_role <> 'admin' or v_status <> 'active') then
    raise exception 'renderlab_self_lockout' using errcode = '42501';
  end if;

  update public.renderlab_account_access
    set role = v_role,
        status = v_status,
        generation_enabled = v_generation_enabled,
        max_active_jobs = v_max_active_jobs,
        max_jobs_per_hour = v_max_jobs_per_hour,
        updated_at = pg_catalog.now()
    where user_id = p_target_user_id
    returning * into v_target;

  return next v_target;
end;
$$;

revoke all privileges on function public.renderlab_admin_set_account_access(
  uuid, uuid, text, text, boolean, boolean, boolean, integer, boolean, integer
) from public, anon, authenticated;
grant execute on function public.renderlab_admin_set_account_access(
  uuid, uuid, text, text, boolean, boolean, boolean, integer, boolean, integer
) to service_role;

create or replace function public.renderlab_admin_health(
  p_actor_user_id uuid,
  p_window_hours integer default 24
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.renderlab_account_access%rowtype;
  v_window_hours integer := greatest(1, least(coalesce(p_window_hours, 24), 168));
  v_since timestamptz;
  v_active_jobs bigint;
  v_status_counts jsonb;
  v_operation_counts jsonb;
  v_error_code_counts jsonb;
begin
  select a.*
    into v_actor
    from public.renderlab_account_access as a
    where a.user_id = p_actor_user_id;

  if not found or v_actor.role <> 'admin' or v_actor.status <> 'active' then
    raise exception 'renderlab_admin_required' using errcode = '42501';
  end if;

  v_since := pg_catalog.now() - pg_catalog.make_interval(hours => v_window_hours);

  select count(*)
    into v_active_jobs
    from public.generation_jobs as j
    where j.status in ('queued', 'preparing', 'running', 'persisting');

  select coalesce(pg_catalog.jsonb_object_agg(x.status, x.total), '{}'::jsonb)
    into v_status_counts
    from (
      select j.status, count(*)::bigint as total
      from public.generation_jobs as j
      where j.created_at >= v_since
      group by j.status
      order by j.status
    ) as x;

  select coalesce(pg_catalog.jsonb_object_agg(x.operation, x.total), '{}'::jsonb)
    into v_operation_counts
    from (
      select j.operation, count(*)::bigint as total
      from public.generation_jobs as j
      where j.created_at >= v_since
      group by j.operation
      order by j.operation
    ) as x;

  select coalesce(pg_catalog.jsonb_object_agg(x.safe_code, x.total), '{}'::jsonb)
    into v_error_code_counts
    from (
      select
        case
          when j.error_code = 'generation_submission_failed' then 'generation_submission_failed'
          when j.error_code = 'generation_backend_unavailable' then 'generation_backend_unavailable'
          else 'generation_failed'
        end as safe_code,
        count(*)::bigint as total
      from public.generation_jobs as j
      where j.created_at >= v_since
        and j.status = 'failed'
      group by 1
      order by 1
    ) as x;

  return pg_catalog.jsonb_build_object(
    'windowHours', v_window_hours,
    'since', v_since,
    'activeJobs', v_active_jobs,
    'statusCounts', v_status_counts,
    'operationCounts', v_operation_counts,
    'errorCodeCounts', v_error_code_counts
  );
end;
$$;

revoke all privileges on function public.renderlab_admin_health(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.renderlab_admin_health(uuid, integer)
  to service_role;

comment on column public.renderlab_account_access.generation_enabled is
  'Nullable per-account generation-enabled override managed by privileged RenderLab Admin. Phase 10B stores the override; Phase 10C owns effective admission enforcement.';
comment on column public.renderlab_account_access.max_active_jobs is
  'Nullable bounded per-account active-generation limit override (1-4). Phase 10B stores the override; Phase 10C owns effective admission enforcement.';
comment on column public.renderlab_account_access.max_jobs_per_hour is
  'Nullable bounded per-account rolling-hour admission limit override (1-120). Phase 10B stores the override; Phase 10C owns effective admission enforcement.';
comment on function public.renderlab_admin_set_account_access(uuid, uuid, text, text, boolean, boolean, boolean, integer, boolean, integer) is
  'Service-role-only transactional RenderLab account administration. Merges one requested patch while serializing privileged role/status mutation and preventing self-lockout or removal of the last active admin.';
comment on function public.renderlab_admin_health(uuid, integer) is
  'Service-role-only bounded RenderLab product health aggregate. Returns product operation/status counts and sanitized error-code counts without raw job payloads or provider metadata.';
