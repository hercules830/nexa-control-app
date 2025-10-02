-- 1. Crea la función que se ejecutará
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

-- 2. Crea el trigger que llama a la función anterior
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();