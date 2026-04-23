
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare _role public.app_role;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do nothing;
  _role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'patient');
  insert into public.user_roles (user_id, role) values (new.id, _role)
  on conflict do nothing;
  return new;
end; $$;

create or replace function public.set_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;
