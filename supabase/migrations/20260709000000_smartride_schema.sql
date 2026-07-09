create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  phone text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.trips (
  id uuid primary key default uuid_generate_v4(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  from_city text not null,
  to_city text not null,
  date_time timestamptz not null,
  price numeric(10, 2) not null check (price >= 0),
  available_seats int not null check (available_seats >= 0),
  car_photo_url text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.bookings (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  passenger_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (trip_id, passenger_id)
);

create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists trips_driver_id_idx on public.trips (driver_id);
create index if not exists trips_date_time_idx on public.trips (date_time);
create index if not exists bookings_trip_id_idx on public.bookings (trip_id);
create index if not exists bookings_passenger_id_idx on public.bookings (passenger_id);
create index if not exists reviews_trip_id_idx on public.reviews (trip_id);
create index if not exists reviews_reviewer_id_idx on public.reviews (reviewer_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change profile roles';
  end if;

  return new;
end;
$$;

create or replace function public.prevent_booking_non_status_updates()
returns trigger
language plpgsql
as $$
begin
  if not public.is_admin() then
    if new.trip_id is distinct from old.trip_id
      or new.passenger_id is distinct from old.passenger_id
      or new.created_at is distinct from old.created_at then
      raise exception 'Only booking status can be updated';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prevent_profile_role_escalation on public.profiles;
create trigger trg_prevent_profile_role_escalation
before update on public.profiles
for each row
execute function public.prevent_profile_role_escalation();

drop trigger if exists trg_prevent_booking_non_status_updates on public.bookings;
create trigger trg_prevent_booking_non_status_updates
before update on public.bookings
for each row
execute function public.prevent_booking_non_status_updates();

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.bookings enable row level security;
alter table public.reviews enable row level security;

drop policy if exists profiles_read_all on public.profiles;
create policy profiles_read_all
on public.profiles
for select
to public
using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists trips_read_upcoming on public.trips;
create policy trips_read_upcoming
on public.trips
for select
to public
using (date_time > now());

drop policy if exists trips_insert_own on public.trips;
create policy trips_insert_own
on public.trips
for insert
to authenticated
with check (auth.uid() = driver_id);

drop policy if exists trips_update_own_or_admin on public.trips;
create policy trips_update_own_or_admin
on public.trips
for update
to authenticated
using (auth.uid() = driver_id or public.is_admin())
with check (auth.uid() = driver_id or public.is_admin());

drop policy if exists trips_delete_own_or_admin on public.trips;
create policy trips_delete_own_or_admin
on public.trips
for delete
to authenticated
using (auth.uid() = driver_id or public.is_admin());

drop policy if exists bookings_read_own_or_driver on public.bookings;
create policy bookings_read_own_or_driver
on public.bookings
for select
to authenticated
using (
  passenger_id = auth.uid()
  or exists (
    select 1
    from public.trips t
    where t.id = trip_id
      and t.driver_id = auth.uid()
  )
  or public.is_admin()
);

drop policy if exists bookings_insert_own on public.bookings;
create policy bookings_insert_own
on public.bookings
for insert
to authenticated
with check (
  passenger_id = auth.uid()
  and status = 'pending'
);

drop policy if exists bookings_update_status_driver_or_admin on public.bookings;
create policy bookings_update_status_driver_or_admin
on public.bookings
for update
to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_id
      and t.driver_id = auth.uid()
  )
  or public.is_admin()
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = trip_id
      and t.driver_id = auth.uid()
  )
  or public.is_admin()
);

drop policy if exists reviews_read_all on public.reviews;
create policy reviews_read_all
on public.reviews
for select
to public
using (true);

drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own
on public.reviews
for insert
to authenticated
with check (reviewer_id = auth.uid());

drop policy if exists reviews_update_own_or_admin on public.reviews;
create policy reviews_update_own_or_admin
on public.reviews
for update
to authenticated
using (reviewer_id = auth.uid() or public.is_admin())
with check (reviewer_id = auth.uid() or public.is_admin());

drop policy if exists reviews_delete_own_or_admin on public.reviews;
create policy reviews_delete_own_or_admin
on public.reviews
for delete
to authenticated
using (reviewer_id = auth.uid() or public.is_admin());