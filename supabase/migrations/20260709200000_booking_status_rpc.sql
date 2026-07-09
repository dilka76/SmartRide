create or replace function public.update_booking_status_and_adjust_seats(
  p_booking_id uuid,
  p_trip_id uuid,
  p_new_status text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_current_status text;
begin
  if p_new_status not in ('approved', 'rejected') then
    raise exception 'Invalid booking status: %', p_new_status;
  end if;

  select b.status
  into v_current_status
  from public.bookings b
  where b.id = p_booking_id
    and b.trip_id = p_trip_id
  for update;

  if not found then
    raise exception 'Booking not found for this trip';
  end if;

  if v_current_status = p_new_status then
    return;
  end if;

  if p_new_status = 'approved' and v_current_status <> 'approved' then
    update public.trips
    set available_seats = available_seats - 1
    where id = p_trip_id
      and available_seats > 0;

    if not found then
      raise exception 'No available seats remaining';
    end if;
  end if;

  if p_new_status = 'rejected' and v_current_status = 'approved' then
    update public.trips
    set available_seats = available_seats + 1
    where id = p_trip_id;
  end if;

  update public.bookings
  set status = p_new_status
  where id = p_booking_id
    and trip_id = p_trip_id;
end;
$$;