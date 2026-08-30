create table public.renderlab_account_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index renderlab_account_access_status_created_at_idx
  on public.renderlab_account_access (status, created_at, user_id);

create table public.renderlab_beta_invitations (
  id uuid primary key default gen_random_uuid(),
  normalized_email text not null
    check (
      normalized_email = lower(btrim(normalized_email))
      and char_length(normalized_email) between 3 and 320
    ),
  role text not null default 'member' check (role in ('member', 'admin')),
  expires_at timestamptz not null,
  claimed_at timestamptz null,
  claimed_user_id uuid null references auth.users(id) on delete set null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint renderlab_beta_invitations_claim_state
    check ((claimed_at is null) = (claimed_user_id is null)),
  constraint renderlab_beta_invitations_expiry_after_creation
    check (expires_at > created_at)
);

create unique index renderlab_beta_invitations_open_email_idx
  on public.renderlab_beta_invitations (normalized_email)
  where claimed_at is null and revoked_at is null;

create index renderlab_beta_invitations_claimed_user_idx
  on public.renderlab_beta_invitations (claimed_user_id, created_at desc)
  where claimed_user_id is not null;

alter table public.renderlab_account_access enable row level security;
alter table public.renderlab_beta_invitations enable row level security;

revoke all privileges on table public.renderlab_account_access from anon, authenticated;
revoke all privileges on table public.renderlab_beta_invitations from anon, authenticated;
grant select, insert, update, delete on table public.renderlab_account_access to service_role;
grant select, insert, update, delete on table public.renderlab_beta_invitations to service_role;

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

comment on table public.renderlab_account_access is
  'Server-only RenderLab closed-beta admission and authorization state keyed by canonical Supabase Auth user identity.';
comment on column public.renderlab_account_access.role is
  'RenderLab application role. Phase 10 v0.1 values are member or admin; never derived from browser metadata.';
comment on column public.renderlab_account_access.status is
  'RenderLab application admission status. Suspended identities retain account/security recovery but lose private product access when enforcement is enabled.';
comment on table public.renderlab_beta_invitations is
  'Server-only closed-beta invitation records. Only a verified same-email Supabase identity may claim an unexpired, unrevoked invitation.';
comment on function public.renderlab_claim_beta_invitation(uuid, text) is
  'Server-only transactional same-email invitation claim. Existing access is returned unchanged, including suspension.';
