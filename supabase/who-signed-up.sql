-- Cutframe — who signed up and what did they actually do?
--
-- Paste into Supabase > SQL Editor > New query and Run. Read-only: it only
-- looks, it never changes anything.
--
-- One row per account, newest first. The column that matters is `got_as_far_as`
-- — a signup that never generated an image told you nothing, and a signup that
-- generated a full set and came back is a customer.

select
  p.email,
  to_char(p.created_at, 'Mon DD HH24:MI')            as signed_up,
  p.credits                                           as credits_left,
  40 - p.credits                                      as credits_used,
  count(distinct j.id)                                as projects,
  coalesce(sum(j.credits_spent), 0)                   as images_paid_for,
  count(distinct j.id) filter (where j.status = 'completed') as finished_sets,
  count(distinct j.id) filter (where j.status = 'failed')    as failed_sets,
  case
    when count(j.id) = 0                                    then 'signed up, never started'
    when count(j.id) filter (where j.credits_spent > 0) = 0  then 'wrote prompts, never generated'
    when count(j.id) filter (where j.status = 'completed') = 0 then 'generated, nothing finished'
    else 'finished a set'
  end                                                 as got_as_far_as,
  max(j.created_at)                                   as last_project
from public.profiles p
left join public.jobs j on j.user_id = p.id
group by p.id, p.email, p.created_at, p.credits
order by p.created_at desc;


-- ---------------------------------------------------------------------------
-- The one-line version, for a daily glance.

select
  count(*)                                                   as accounts,
  count(*) filter (where created_at > now() - interval '24 hours') as new_today,
  count(*) filter (where credits < 40)                       as actually_tried_it
from public.profiles;


-- ---------------------------------------------------------------------------
-- Where people gave up. If most projects sit at 'prompts_ready', they looked
-- at the prompts and didn't press generate — that's a copy or trust problem,
-- not a technical one, and it's the most useful thing this whole file can tell
-- you.

select
  status,
  count(*)                        as projects,
  round(avg(image_count))         as avg_images,
  round(avg(credits_spent))       as avg_credits_spent
from public.jobs
group by status
order by projects desc;


-- ---------------------------------------------------------------------------
-- Frames that failed, and why. A repeated message here is a real bug, and
-- these are frames customers were refunded for rather than charged.

select
  coalesce(error, '(no message)') as error,
  count(*)                        as frames
from public.job_images
where status = 'failed'
group by error
order by frames desc
limit 20;


-- ---------------------------------------------------------------------------
-- Which styles people actually choose. Useful for knowing which ones deserve
-- better sample sets, and which could be dropped.

select
  style_id,
  count(*) as projects
from public.jobs
group by style_id
order by projects desc;
