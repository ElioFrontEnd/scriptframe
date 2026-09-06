-- Minimal stand-ins for the parts of Supabase that schema.sql leans on, so the
-- real schema can be loaded into a plain Postgres and exercised.
create schema if not exists auth;
create schema if not exists storage;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text
);

create table if not exists storage.buckets (
  id     text primary key,
  name   text,
  public boolean
);

-- RLS policies reference auth.uid(); nothing here tests RLS, it just has to resolve.
create or replace function auth.uid() returns uuid
language sql stable as $$ select null::uuid $$;

-- Supabase's browser-facing roles. The real ones exist on every Supabase
-- project; recreating them here is what lets the grant tests actually prove
-- that a signed-in user cannot call the credit functions.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end
$$;
