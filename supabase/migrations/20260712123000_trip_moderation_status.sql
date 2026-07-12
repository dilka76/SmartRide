alter table if exists public.trips
  add column if not exists moderation_status text not null default 'pending';

alter table public.trips
  drop constraint if exists trips_moderation_status_check;

alter table public.trips
  add constraint trips_moderation_status_check
  check (moderation_status in ('pending', 'approved', 'rejected'));

-- Preserve visibility of already existing trips after introducing moderation.
update public.trips
set moderation_status = 'approved'
where moderation_status is null
   or moderation_status not in ('pending', 'approved', 'rejected');

drop policy if exists trips_read_upcoming on public.trips;

create policy trips_read_upcoming
on public.trips
for select
to public
using (
  (moderation_status = 'approved' and date_time > now())
  or auth.uid() = driver_id
  or public.is_admin()
);
