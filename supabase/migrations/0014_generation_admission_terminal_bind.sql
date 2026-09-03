-- Phase 14: close the bind-vs-terminalization race for generation admission.
--
-- A server-owned reconciler can terminalize a very fast job after provider submission but
-- before submit-generation binds the already-reserved admission row. Binding must therefore
-- inspect the job and release the reservation in the same transaction when the job is
-- already terminal. This preserves the existing ordinary running-job behavior.

create or replace function public.renderlab_bind_generation_admission(
  p_owner_id uuid,
  p_reservation_id uuid,
  p_job_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job_status text;
  v_updated integer;
begin
  select job.status into v_job_status
  from public.generation_jobs job
  where job.id = p_job_id
    and job.owner_id = p_owner_id;

  if not found then
    return false;
  end if;

  update public.generation_admission_reservations reservation
  set job_id = p_job_id,
      expires_at = greatest(reservation.expires_at, now() + interval '2 hours'),
      released_at = case
        when v_job_status in ('succeeded', 'failed', 'cancelled') then now()
        else reservation.released_at
      end
  where reservation.id = p_reservation_id
    and reservation.owner_id = p_owner_id
    and reservation.released_at is null
    and reservation.job_id is null;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.renderlab_bind_generation_admission(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.renderlab_bind_generation_admission(uuid, uuid, uuid)
  to service_role;
