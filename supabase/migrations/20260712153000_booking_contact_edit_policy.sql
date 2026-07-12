drop policy if exists bookings_update_own_contact on public.bookings;

create policy bookings_update_own_contact
on public.bookings
for update
to authenticated
using (passenger_id = auth.uid())
with check (passenger_id = auth.uid());

create or replace function public.prevent_booking_non_status_updates()
returns trigger
language plpgsql
as $$
declare
  v_is_driver boolean;
begin
  if not public.is_admin() then
    if new.trip_id is distinct from old.trip_id
      or new.passenger_id is distinct from old.passenger_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Immutable booking fields cannot be updated';
    end if;

    if new.seats_requested is distinct from old.seats_requested then
      raise exception 'Seats requested cannot be updated directly';
    end if;

    select exists (
      select 1
      from public.trips t
      where t.id = old.trip_id
        and t.driver_id = auth.uid()
    ) into v_is_driver;

    if auth.uid() = old.passenger_id and not v_is_driver then
      if new.status is distinct from old.status then
        raise exception 'Passengers cannot change booking status';
      end if;
    end if;
  end if;

  return new;
end;
$$;
