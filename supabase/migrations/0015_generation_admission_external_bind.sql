-- Phase 14: preserve external-backend admission binding while keeping terminal-local settlement.
--
-- Migration 0014 correctly closed the native scheduler-vs-bind race by inspecting the local
-- generation job before binding, but it unintentionally rejected accepted external backend
-- job IDs that do not have a RenderLab generation_jobs row. External accepted jobs must keep
-- the established conservative two-hour bound reservation so they cannot bypass active-job
-- admission merely because their lifecycle is owned by the external backend.

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
