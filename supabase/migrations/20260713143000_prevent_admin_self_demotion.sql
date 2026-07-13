create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
as $$
begin
  -- Allow privileged database sessions (migrations/manual SQL) to manage roles directly.
  if current_user = 'postgres' then
    return new;
  end if;

  -- Prevent accidental lockout: an admin cannot demote their own account from client sessions.
  if old.role = 'admin' and new.role <> 'admin' and auth.uid() = old.id then
    raise exception 'Admins cannot downgrade their own role';
  end if;

  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only admins can change profile roles';
  end if;

  return new;
end;
$$;
