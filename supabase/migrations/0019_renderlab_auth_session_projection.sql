create or replace function public.renderlab_auth_session_projection(
  p_user_id uuid
)
returns table (
  session_id uuid,
  created_at timestamptz,
  last_active_at timestamptz,
  user_agent text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'renderlab_session_user_required' using errcode = '22023';
  end if;

  return query
    select
      s.id as session_id,
      s.created_at,
      coalesce(
        s.refreshed_at at time zone 'UTC',
        s.updated_at,
        s.created_at
      ) as last_active_at,
      s.user_agent
    from auth.sessions as s
    where s.user_id = p_user_id
    order by
      coalesce(s.refreshed_at at time zone 'UTC', s.updated_at, s.created_at) desc,
      s.created_at desc,
      s.id;
end;
$$;

revoke all privileges on function public.renderlab_auth_session_projection(uuid)
  from public, anon, authenticated;
grant execute on function public.renderlab_auth_session_projection(uuid)
  to service_role;
