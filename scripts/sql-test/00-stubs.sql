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
