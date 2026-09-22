-- Cutframe — is anyone farming the free credits?
--
-- HOW TO RUN IT
--
-- Paste the whole file into Supabase > SQL Editor > New query. Then run the
-- sections ONE AT A TIME: highlight a single query with your mouse (from its
-- "select" down to its ";") and click Run. Supabase runs only what's
-- highlighted.
--
-- Don't just press Run on the whole file — the editor only shows the result of
-- the LAST query, so you'd see section 7 and nothing else.
--
-- Every query here only READS. Nothing is changed until you choose to run one
-- of the commands at the very bottom yourself.
--
-- Run it once a day for the first couple of weeks after you promote the site.
-- Each query tells you what a normal result looks like and what should worry you.


-- ============================================================================
-- 1. The daily picture
--
-- One row per day, last two weeks. Normal: a handful of signups, and "free_used" well below
-- "free_given" because most people try a few images and leave.
-- Worrying: a sudden jump in signups on one day, especially if "bought" stays
-- at zero and "free_used" is close to "free_given" — that is someone creating
-- accounts, emptying them, and moving on.
-- ============================================================================
select
  to_char(d.day, 'Mon DD')                                   as day,
  count(distinct p.id)                                       as signups,
  coalesce(sum(t.delta) filter (where t.reason = 'signup_bonus'), 0)  as free_given,
  coalesce(-sum(t.delta) filter (where t.reason = 'generation'), 0)   as credits_spent,
  count(distinct t.user_id) filter (where t.reason = 'purchase')      as bought
from generate_series(current_date - 13, current_date, interval '1 day') as d(day)
left join public.profiles p
       on p.created_at::date = d.day::date
left join public.credit_transactions t
       on t.user_id = p.id
group by d.day
order by d.day desc;


-- ============================================================================
-- 2. The same Gmail inbox, many accounts
--
-- Gmail ignores dots and anything after a "+". So elio@gmail.com,
-- e.l.i.o@gmail.com and elio+7@gmail.com all land in ONE inbox, but look like
-- three different people to us. This is the cheapest farming trick there is.
--
-- Normal: no rows at all.
-- Worrying: any row. Each row is one real inbox with several accounts.
-- ============================================================================
select
  regexp_replace(split_part(split_part(lower(email), '@', 1), '+', 1), '\.', '', 'g')
    || '@gmail.com'                                         as real_inbox,
  count(*)                                                  as accounts,
  string_agg(email, ', ' order by created_at)               as addresses_used,
  -- Read from the ledger, so it's right whatever the bonus was when they signed up.
  sum(coalesce((select sum(delta) from public.credit_transactions t
                 where t.user_id = p.id and t.reason = 'signup_bonus'), 0))
                                                            as free_credits_taken
from public.profiles p
where lower(split_part(email, '@', 2)) in ('gmail.com', 'googlemail.com')
group by 1
having count(*) > 1
order by accounts desc;


-- ============================================================================
-- 3. "+" aliases on any other provider
--
-- Outlook, Proton, iCloud and most others also deliver name+anything@ to the
-- same inbox. Same trick as above, different provider.
--
-- Normal: no rows.
-- Worrying: any row.
-- ============================================================================
select
  split_part(split_part(lower(email), '@', 1), '+', 1)
    || '@' || lower(split_part(email, '@', 2))              as real_inbox,
  count(*)                                                  as accounts,
  string_agg(email, ', ' order by created_at)               as addresses_used
from public.profiles
where lower(split_part(email, '@', 2)) not in ('gmail.com', 'googlemail.com')
group by 1
having count(*) > 1
order by accounts desc;


-- ============================================================================
-- 4. Unknown domains with lots of accounts
--
-- Big providers (gmail, outlook, yahoo...) will always have many accounts —
-- that's just popularity. An obscure domain with five accounts usually isn't:
-- it's a throwaway-mail service that isn't on the blocklist yet, or someone's
-- own catch-all domain being used to mint addresses.
--
-- Normal: nothing, or a company domain with a couple of colleagues.
-- Worrying: a domain you don't recognise with 3+ accounts. Google it — if it's
-- a temporary-mail site, add it with the command in section 7.
-- ============================================================================
select
  lower(split_part(email, '@', 2))                          as domain,
  count(*)                                                  as accounts,
  min(created_at)::date                                     as first_seen,
  max(created_at)::date                                     as last_seen
from public.profiles
where lower(split_part(email, '@', 2)) not in (
  'gmail.com','googlemail.com','outlook.com','hotmail.com','live.com','msn.com',
  'yahoo.com','ymail.com','icloud.com','me.com','mac.com','proton.me',
  'protonmail.com','aol.com','gmx.com','gmx.de','web.de','yandex.com',
  'mail.ru','zoho.com','cutframe.app'
)
group by 1
having count(*) >= 3
order by accounts desc;


-- ============================================================================
-- 5. Bursts: many accounts in a few minutes
--
-- A person signs up once. A script signs up twenty times in ten minutes.
-- This finds any 10-minute window with 4 or more new accounts.
--
-- Normal: nothing — or a burst right after you post a video, spread across
-- different providers and names, which is just your video working.
-- Worrying: a burst where the addresses look alike (same domain, numbered
-- names, random letters).
-- ============================================================================
select
  to_char(date_trunc('hour', created_at)
          + interval '10 min' * floor(extract(minute from created_at) / 10),
          'Mon DD HH24:MI')                                 as window_start,
  count(*)                                                  as accounts,
  string_agg(email, ', ' order by created_at)               as addresses
from public.profiles
where created_at > now() - interval '30 days'
group by 1
having count(*) >= 4
order by 1 desc;


-- ============================================================================
-- 6. Take-and-leave accounts
--
-- Accounts that spent their free credits and never bought anything.
-- Some of this is completely normal — plenty of honest people try it and
-- decide it isn't for them. What matters is the SHAPE, not the existence.
--
-- Normal: a mix of partly-used and fully-used, older and newer.
-- Worrying: dozens of fully-drained accounts all created on the same day.
-- ============================================================================
select
  email,
  to_char(created_at, 'Mon DD HH24:MI')                     as signed_up,
  credits                                                   as credits_left,
  (select count(*) from public.jobs j where j.user_id = p.id) as projects
from public.profiles p
where credits = 0
  and not exists (
    select 1 from public.credit_transactions t
     where t.user_id = p.id and t.reason = 'purchase'
  )
order by created_at desc
limit 100;


-- ============================================================================
-- 7. Is the safety net switched on?
--
-- Only works if you've run migration 006. If this errors with
-- "relation app_settings does not exist", you haven't — run
-- supabase/migration-006-abuse.sql first. Without it there is no daily
-- ceiling and no disposable-email block.
--
-- "used_of_ceiling" is how much of today's free-credit allowance is gone.
-- Normal: well under 100%.
-- At 100%: new signups are getting 0 free credits until the 24h window rolls.
-- If that's happening on an ordinary day, raise the ceiling (command below).
-- If it's happening during an attack, the ceiling is doing its job.
-- ============================================================================
select
  (select value from public.app_settings where key = 'signup_bonus_credits') as bonus_per_signup,
  (select value from public.app_settings where key = 'free_credits_per_day')  as daily_ceiling,
  coalesce(sum(delta), 0)                                                     as given_last_24h,
  round(100.0 * coalesce(sum(delta), 0)
        / nullif((select value from public.app_settings where key = 'free_credits_per_day'), 0))
    || '%'                                                                    as used_of_ceiling,
  (select count(*) from public.blocked_email_domains)                         as domains_blocked
from public.credit_transactions
where reason = 'signup_bonus'
  and created_at > now() - interval '24 hours';


-- ============================================================================
-- WHAT TO DO IF YOU FIND SOMEONE
--
-- These CHANGE things. They're commented out so nothing happens by accident.
-- To use one: select just that line, remove the "--" at the start, and Run
-- only the selected text.
-- ============================================================================

-- Block an account. They can still sign in and see their projects, but
-- spending is refused, so they can't generate anything more:
-- update public.profiles set is_blocked = true where email = 'someone@example.com';

-- Block every account on one Gmail inbox found in section 2 (replace the name):
-- update public.profiles set is_blocked = true
--  where regexp_replace(split_part(split_part(lower(email),'@',1),'+',1),'\.','','g') = 'theirname'
--    and lower(split_part(email,'@',2)) in ('gmail.com','googlemail.com');

-- Add a throwaway domain found in section 4, so future signups get no free credits:
-- insert into public.blocked_email_domains (domain, note) values ('example-tempmail.com', 'found farming') on conflict do nothing;

-- Raise the daily free-credit ceiling if real signups are hitting it:
-- update public.app_settings set value = 1000 where key = 'free_credits_per_day';

-- Unblock someone you blocked by mistake:
-- update public.profiles set is_blocked = false where email = 'someone@example.com';
