-- Cutframe migration 006 — bounding free-tier abuse
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- The threat is not someone "hacking in". Spending is already atomic and
-- server-side, the credit functions are closed to the browser (migration 004),
-- and the fal key never leaves the server. The realistic attack is boring:
-- someone signs up two hundred times with throwaway addresses and farms the
-- free credits. At roughly $0.003 an image that is real money, slowly.
--
-- You cannot prevent that. What you can do is put a hard ceiling on what it
-- costs you, so the worst case is a number you chose rather than a surprise.
-- That is what this migration does, in three parts:
--
--   1. Known disposable-email domains get an account but no free credits.
--   2. A global daily ceiling on free credits, so a flood stops itself.
--   3. The signup bonus itself drops from 40 to 25 — still enough for a short
--      video, and it nearly halves what a farmed account is worth.
--
-- All of it lives in the database trigger, which the browser cannot reach or
-- influence. Nothing here depends on IP addresses; see the note at the bottom.

-- ------------------------------------------------------------- settings --

create table if not exists public.app_settings (
  key   text primary key,
  value integer not null,
  note  text
);

insert into public.app_settings (key, value, note) values
  ('signup_bonus_credits', 25,
   'Free images a new account starts with. Enough to judge the output.'),
  ('free_credits_per_day', 500,
   'Ceiling on free credits handed out across ALL new accounts in any 24 hours. At ~$0.003 an image this caps the daily cost of a signup flood at about $1.50. Raise it when real signups approach it.')
on conflict (key) do nothing;

comment on table public.app_settings is
  'Operational limits, changeable without a deploy. Read by handle_new_user().';

-- --------------------------------------------------- disposable domains --

create table if not exists public.blocked_email_domains (
  domain   text primary key,
  note     text,
  added_at timestamptz not null default now()
);

comment on table public.blocked_email_domains is
  'Accounts on these domains are created but get zero free credits. They can still buy credits — this stops farming, not customers.';

insert into public.blocked_email_domains (domain, note) values
  ('mailinator.com',      'disposable'),
  ('guerrillamail.com',   'disposable'),
  ('guerrillamail.info',  'disposable'),
  ('sharklasers.com',     'disposable'),
  ('10minutemail.com',    'disposable'),
  ('10minutemail.net',    'disposable'),
  ('tempmail.com',        'disposable'),
  ('temp-mail.org',       'disposable'),
  ('throwawaymail.com',   'disposable'),
  ('yopmail.com',         'disposable'),
  ('yopmail.fr',          'disposable'),
  ('getnada.com',         'disposable'),
  ('dispostable.com',     'disposable'),
  ('maildrop.cc',         'disposable'),
  ('trashmail.com',       'disposable'),
  ('fakeinbox.com',       'disposable'),
  ('mytemp.email',        'disposable'),
  ('mohmal.com',          'disposable'),
  ('emailondeck.com',     'disposable'),
  ('mail.tm',             'disposable'),
  ('tempmailo.com',       'disposable'),
  ('minuteinbox.com',     'disposable'),
  ('inboxkitten.com',     'disposable'),
  ('spamgourmet.com',     'disposable'),
  ('mailnesia.com',       'disposable')
on conflict (domain) do nothing;

-- ------------------------------------------------------- the new trigger --

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_domain        text;
  v_bonus         integer;
  v_cap           integer;
  v_granted_today integer;
begin
  v_domain := lower(split_part(coalesce(new.email, ''), '@', 2));

  select value into v_bonus from public.app_settings where key = 'signup_bonus_credits';
  select value into v_cap   from public.app_settings where key = 'free_credits_per_day';
  v_bonus := coalesce(v_bonus, 25);
  v_cap   := coalesce(v_cap, 500);

  -- A throwaway address gets an account, but nothing free with it. They can
  -- still buy credits like anyone else, so a real person using a privacy
  -- forwarder is inconvenienced, not locked out.
  if exists (select 1 from public.blocked_email_domains where domain = v_domain) then
    v_bonus := 0;
  end if;

  -- The circuit breaker. If free credits handed out in the last 24 hours have
  -- already hit the ceiling, new accounts get none until the window rolls.
  -- A flood therefore costs a known amount and then stops on its own.
  if v_bonus > 0 then
    select coalesce(sum(delta), 0) into v_granted_today
      from public.credit_transactions
     where reason = 'signup_bonus'
       and created_at > now() - interval '24 hours';

    if v_granted_today + v_bonus > v_cap then
      v_bonus := 0;
    end if;
  end if;

  insert into public.profiles (id, email, credits)
  values (new.id, new.email, v_bonus)
  on conflict (id) do nothing;

  -- No ledger row for a zero grant: the ledger records money moving, and
  -- nothing moved.
  if v_bonus > 0 then
    insert into public.credit_transactions (user_id, delta, reason)
    values (new.id, v_bonus, 'signup_bonus');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------- keep them private --

-- These tables describe how our defences work. Nothing in the browser needs to
-- read them, and publishing the blocklist would just tell an abuser which
-- domains still work. RLS on with no policy means: service role only.
alter table public.app_settings           enable row level security;
alter table public.blocked_email_domains  enable row level security;

revoke all on table public.app_settings          from public;
revoke all on table public.blocked_email_domains from public;

do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = r) then
      execute format('revoke all on table public.app_settings from %I', r);
      execute format('revoke all on table public.blocked_email_domains from %I', r);
    end if;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Why there is nothing about IP addresses in here
--
-- An IP is not a person. Mobile carriers put tens of thousands of customers
-- behind one address, and so do universities and offices — "one account per IP"
-- would lock out an entire phone network to stop one person. Meanwhile a free
-- VPN gives an abuser a new IP every thirty seconds. It is the rare control
-- that blocks customers and misses attackers at the same time.
--
-- The ceiling above is the honest version of the same wish: it does not care
-- who the attacker is or where they are, it just refuses to spend more than
-- you agreed to lose.
