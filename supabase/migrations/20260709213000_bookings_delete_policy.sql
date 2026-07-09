drop policy if exists bookings_delete_own_or_admin on public.bookings;

create policy bookings_delete_own_or_admin
on public.bookings
for delete
to authenticated
using (
  passenger_id = auth.uid()
  or (
    select p.role
    from public.profiles p
    where p.id = auth.uid()
  ) = 'admin'
);