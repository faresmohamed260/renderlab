-- Keep #219 trigger-only SECURITY DEFINER helpers out of the exposed RPC surface.
-- These functions are invoked only by table triggers and do not need direct EXECUTE grants.

revoke execute on function public.renderlab_reject_deleting_owner_insert()
  from public, anon, authenticated, service_role;
revoke execute on function public.renderlab_reject_deleting_account_reactivation()
  from public, anon, authenticated, service_role;

comment on function public.renderlab_reject_deleting_owner_insert() is
  'Trigger-only #219 deletion-freeze guard. Direct RPC execution is revoked from public API roles and service_role.';
comment on function public.renderlab_reject_deleting_account_reactivation() is
  'Trigger-only #219 deletion-freeze reactivation guard. Direct RPC execution is revoked from public API roles and service_role.';
