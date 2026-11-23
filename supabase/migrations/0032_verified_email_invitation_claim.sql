-- Additive R10: an unverified Supabase Auth email cannot consume a beta invitation.
-- Existing account access (including suspension) is still returned unchanged.
create or replace function public.renderlab_claim_beta_invitation(
  p_user_id uuid,
  p_email text
)
returns setof public.renderlab_account_access
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_access public.renderlab_account_access%rowtype;
  v_invitation public.renderlab_beta_invitations%rowtype;
begin
  if p_user_id is null or v_email = '' then
    return;
  end if;

  select a.*
    into v_access
    from public.renderlab_account_access as a
    where a.user_id = p_user_id;

  if found then
    return next v_access;
    return;
  end if;

  if not exists (
    select 1
    from auth.users as u
    where u.id = p_user_id
      and lower(btrim(coalesce(u.email, ''))) = v_email
      and u.email_confirmed_at is not null
  ) then
    return;
  end if;

  select i.*
    into v_invitation
    from public.renderlab_beta_invitations as i
    where i.normalized_email = v_email
      and i.claimed_at is null
      and i.revoked_at is null
      and i.expires_at > now()
    order by i.created_at asc, i.id asc
    limit 1
    for update;

  if not found then
    select a.*
      into v_access
      from public.renderlab_account_access as a
      where a.user_id = p_user_id;
    if found then
      return next v_access;
    end if;
    return;
  end if;

  update public.renderlab_beta_invitations
    set claimed_at = now(),
        claimed_user_id = p_user_id
    where id = v_invitation.id;

  insert into public.renderlab_account_access (user_id, role, status)
    values (p_user_id, v_invitation.role, 'active')
    on conflict (user_id) do nothing
    returning * into v_access;

  if not found then
    select a.*
      into v_access
      from public.renderlab_account_access as a
      where a.user_id = p_user_id;
  end if;

  if v_access.user_id is not null then
    return next v_access;
  end if;
end;
$$;

revoke all privileges on function public.renderlab_claim_beta_invitation(uuid, text)
  from public, anon, authenticated;
grant execute on function public.renderlab_claim_beta_invitation(uuid, text)
  to service_role;

comment on function public.renderlab_claim_beta_invitation(uuid, text) is
  'Server-only invitation claim requires a verified matching Supabase Auth email; existing admission remains unchanged.';
