drop policy if exists profiles_update_any_admin on public.profiles;

create policy profiles_update_any_admin
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
