-- Cutframe schema
-- Run this in the Supabase SQL editor.
--
-- Design note: credits are held on `profiles.credits` and every change is
-- mirrored into `credit_transactions` for auditing. Spending goes exclusively
-- through spend_credits(), which is atomic, so two concurrent job starts can
-- never both pass the balance check.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- profiles --

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  credits     integer not null default 0 check (credits >= 0),
  is_blocked  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- New users land with a small free trial: 40 images is roughly one short video
-- and costs us about twelve cents.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, credits)
  values (new.id, new.email, 40)
  on conflict (id) do nothing;

  insert into public.credit_transactions (user_id, delta, reason)
  values (new.id, 40, 'signup_bonus');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------ credit_transactions --

create table if not exists public.credit_transactions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  delta              integer not null,
  reason             text not null,
  job_id             uuid,
  stripe_session_id  text unique,
  created_at         timestamptz not null default now()
);

create index if not exists credit_transactions_user_idx
  on public.credit_transactions (user_id, created_at desc);

-- ------------------------------------------------------------------- jobs --

create table if not exists public.jobs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null default 'Untitled',
  script        text not null,
  style_id      text not null,
  image_count   integer not null check (image_count between 1 and 300),
  status        text not null default 'draft'
                check (status in ('draft','prompts_ready','running','completed','failed')),
  credits_spent integer not null default 0,
  error         text,
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  completed_at  timestamptz
);

create index if not exists jobs_user_idx on public.jobs (user_id, created_at desc);
-- Used by the cron sweep to find jobs whose browser tab went away mid-run.
create index if not exists jobs_running_idx on public.jobs (status, started_at)
  where status = 'running';

-- ------------------------------------------------------------- job_images --

create table if not exists public.job_images (
  id          uuid primary key default gen_random_uuid(),
  job_id      uuid not null references public.jobs(id) on delete cascade,
  idx         integer not null,
  prompt      text not null,
  status      text not null default 'pending'
              check (status in ('pending','running','done','failed')),
  storage_key text,
  attempts    integer not null default 0,
  error       text,
  claimed_at  timestamptz,
  unique (job_id, idx)
);

create index if not exists job_images_job_idx on public.job_images (job_id, idx);
create index if not exists job_images_pending_idx on public.job_images (job_id, status)
  where status in ('pending', 'running');

-- --------------------------------------------------------------- functions --

-- Atomic spend. Returns true only if the balance covered the amount.
create or replace function public.spend_credits(
  p_user uuid,
  p_amount integer,
  p_job uuid
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_updated integer;
begin
  if p_amount <= 0 then
    return false;
  end if;

  update public.profiles
     set credits = credits - p_amount
   where id = p_user
     and is_blocked = false
     and credits >= p_amount;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    return false;
  end if;

  insert into public.credit_transactions (user_id, delta, reason, job_id)
  values (p_user, -p_amount, 'generation', p_job);

  return true;
end;
$$;

-- Refund whatever a job failed to deliver, so a half-broken batch does not
-- quietly eat the customer's balance.
create or replace function public.refund_credits(
  p_user uuid,
  p_amount integer,
  p_job uuid
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_amount <= 0 then
    return;
  end if;

  update public.profiles set credits = credits + p_amount where id = p_user;

  insert into public.credit_transactions (user_id, delta, reason, job_id)
  values (p_user, p_amount, 'refund_failed_images', p_job);
end;
$$;

-- Claim a slice of pending images for this worker tick. SKIP LOCKED means two
-- concurrent ticks pick disjoint rows instead of generating the same image twice.
create or replace function public.claim_images(
  p_job uuid,
  p_limit integer
)
returns setof public.job_images
language plpgsql
security definer set search_path = public
as $$
begin
  return query
  with picked as (
    select id from public.job_images
     where job_id = p_job
       and (
         status = 'pending'
         or (status = 'running' and claimed_at < now() - interval '3 minutes')
       )
       and attempts < 3
     order by idx
     limit p_limit
     for update skip locked
  )
  update public.job_images ji
     set status = 'running',
         attempts = ji.attempts + 1,
         claimed_at = now()
    from picked
   where ji.id = picked.id
  returning ji.*;
end;
$$;

-- ----------------------------------------------------------------- storage --

-- Private bucket for the generated images. Nothing reads it directly: the app
-- hands out short-lived signed URLs, and all writes go through the service
-- role, so no storage policies are needed.
insert into storage.buckets (id, name, public)
values ('images', 'images', false)
on conflict (id) do nothing;

-- --------------------------------------------------------------------- RLS --

alter table public.profiles            enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.jobs                enable row level security;
alter table public.job_images          enable row level security;

-- Readable by their owner. Nothing here is writable from the browser: every
-- mutation goes through a server route using the service role, which is what
-- keeps the credit check un-bypassable.
create policy "own profile"      on public.profiles
  for select using (auth.uid() = id);

create policy "own transactions" on public.credit_transactions
  for select using (auth.uid() = user_id);

create policy "own jobs"         on public.jobs
  for select using (auth.uid() = user_id);

create policy "own job images"   on public.job_images
  for select using (
    exists (select 1 from public.jobs j where j.id = job_id and j.user_id = auth.uid())
  );
