alter table public.profiles disable trigger trg_prevent_profile_role_escalation;

update public.profiles
set role = 'admin'
where id = '030bcf7b-9bd0-4cc0-910a-14e8c5440bcb';

update public.profiles
set role = 'user'
where id = '734aedf6-45af-4286-a83c-e28c8f06d464';

update public.profiles
set role = 'user'
where id = '60213421-8a8b-4094-8b27-a518ad9c3cc1';

alter table public.profiles enable trigger trg_prevent_profile_role_escalation;

drop policy if exists "Drivers can update booking status" on public.bookings;
drop policy if exists "Only drivers or admins can update booking status" on public.bookings;
drop policy if exists bookings_update_status_driver_or_admin on public.bookings;

create policy "Only drivers or admins can update booking status"
on public.bookings
for update
to authenticated
using (
  auth.uid() in (
    select t.driver_id
    from public.trips t
    where t.id = bookings.trip_id
  )
  or (
    select p.role
    from public.profiles p
    where p.id = auth.uid()
  ) = 'admin'
)
with check (
  auth.uid() in (
    select t.driver_id
    from public.trips t
    where t.id = bookings.trip_id
  )
  or (
    select p.role
    from public.profiles p
    where p.id = auth.uid()
  ) = 'admin'
);