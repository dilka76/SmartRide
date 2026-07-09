drop policy if exists trips_read_upcoming on public.trips;

create policy trips_read_upcoming
on public.trips
for select
to public
using (
  date_time > now()
  or (
    select p.role
    from public.profiles p
    where p.id = auth.uid()
  ) = 'admin'
);