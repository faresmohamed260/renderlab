create or replace function public.renderlab_reserve_upload_admission(
  p_owner_id uuid,
  p_upload_kind text
)
returns table (
  reservation_id uuid,
  effective_max_active_uploads integer,
  effective_max_uploads_per_hour integer
)
language plpgsql
set search_path = ''
as $$
declare
  v_active_count integer;
  v_hour_count integer;
  v_reservation_id uuid;
  v_max_active_uploads constant integer := 8;
  v_max_uploads_per_hour constant integer := 30;
begin
  if p_upload_kind not in ('media', 'reference') then
    raise exception using message = 'renderlab_upload_admission_invalid_kind';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text, 4014)
  );

  -- A reservation only bridges the interval before its pending staging row exists.
  -- Once its short lease expires it can be released safely because a surviving
  -- pending staging row is counted independently below.
  update public.upload_admission_reservations reservation
  set released_at = pg_catalog.now()
  where reservation.owner_id = p_owner_id
    and reservation.released_at is null
    and reservation.lease_expires_at <= pg_catalog.now();

  delete from public.upload_admission_reservations reservation
  where reservation.owner_id = p_owner_id
    and reservation.admitted_at < pg_catalog.now() - interval '24 hours';

  select (
    (select count(*) from public.media_upload_sessions upload
      where upload.owner_id = p_owner_id and upload.status = 'pending')
    +
    (select count(*) from public.generation_sources source
      where source.owner_id = p_owner_id and source.status = 'pending')
    +
    (select count(*) from public.upload_admission_reservations reservation
      where reservation.owner_id = p_owner_id
        and reservation.released_at is null
        and reservation.lease_expires_at > pg_catalog.now()
        and (
          reservation.bound_resource_id is null
          or (
            reservation.upload_kind = 'media'
            and not exists (
              select 1
              from public.media_upload_sessions upload
              where upload.id = reservation.bound_resource_id
                and upload.owner_id = p_owner_id
                and upload.status = 'pending'
            )
          )
          or (
            reservation.upload_kind = 'reference'
            and not exists (
              select 1
              from public.generation_sources source
              where source.id = reservation.bound_resource_id
                and source.owner_id = p_owner_id
                and source.status = 'pending'
            )
          )
        ))
  )::integer into v_active_count;

  if v_active_count >= v_max_active_uploads then
    raise exception using message = 'renderlab_upload_active_limit_reached';
  end if;

  select count(*)::integer into v_hour_count
  from public.upload_admission_reservations reservation
  where reservation.owner_id = p_owner_id
    and reservation.admitted_at > pg_catalog.now() - interval '60 minutes';

  if v_hour_count >= v_max_uploads_per_hour then
    raise exception using message = 'renderlab_upload_rate_limit_reached';
  end if;

  insert into public.upload_admission_reservations (
    owner_id,
    upload_kind,
    lease_expires_at
  ) values (
    p_owner_id,
    p_upload_kind,
    pg_catalog.now() + interval '10 minutes'
  )
  returning id into v_reservation_id;

  return query
    select v_reservation_id, v_max_active_uploads, v_max_uploads_per_hour;
end;
$$;

revoke all privileges on function public.renderlab_reserve_upload_admission(uuid, text)
  from public, anon, authenticated;
grant execute on function public.renderlab_reserve_upload_admission(uuid, text)
  to service_role;
