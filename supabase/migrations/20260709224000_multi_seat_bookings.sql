alter table public.bookings
add column if not exists seats_requested int not null default 1;

alter table public.bookings
drop constraint if exists bookings_seats_requested_check;

alter table public.bookings
add constraint bookings_seats_requested_check check (seats_requested > 0);

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
  v_seats_requested int;
begin
  if p_new_status not in ('approved', 'rejected') then
    raise exception 'Invalid booking status: %', p_new_status;
  end if;

  select b.status, b.seats_requested
  into v_current_status, v_seats_requested
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
    set available_seats = available_seats - v_seats_requested
    where id = p_trip_id
      and available_seats >= v_seats_requested;

    if not found then
      raise exception 'No available seats remaining';
    end if;
  end if;

  if p_new_status = 'rejected' and v_current_status = 'approved' then
    update public.trips
    set available_seats = available_seats + v_seats_requested
    where id = p_trip_id;
  end if;

  update public.bookings
  set status = p_new_status
  where id = p_booking_id
    and trip_id = p_trip_id;
end;
$$;