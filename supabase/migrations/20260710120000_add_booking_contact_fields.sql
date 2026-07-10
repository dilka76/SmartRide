alter table if exists public.bookings
  add column if not exists passenger_phone text,
  add column if not exists passenger_note text;
