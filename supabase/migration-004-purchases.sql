-- Cutframe migration 004 — purchases, and locking down the money functions
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- Two separate problems, both about credits appearing that nobody paid for.
--
-- ---------------------------------------------------------------------------
-- 1. The Stripe webhook was not atomic
--
-- It wrote the ledger row and then updated the balance as two statements:
--
--   a. The process dies between them. The ledger row exists, so Stripe's retry
--      hits the unique index on stripe_session_id and skips — the customer
--      paid and never got the credits.
--   b. Two webhooks for one account land at once. Both read the old balance,
--      both write, and one purchase vanishes.
--
-- grant_purchase() does both writes in one transaction: either the customer is
-- credited and the ledger records it, or nothing happened and Stripe retries.
--
-- ---------------------------------------------------------------------------
-- 2. The credit functions were reachable from the browser
--
-- Postgres grants EXECUTE on a new function to PUBLIC, and Supabase exposes
-- everything in the `public` schema through PostgREST. So any signed-in user
-- could call
--
--   POST /rest/v1/rpc/refund_credits {"p_user": "<their own id>", "p_amount": 999999}
--
-- with nothing but their anon key and mint themselves unlimited credits —
-- these functions are `security definer`, so RLS does not stop them. They are
-- only ever meant to be called by our server with the service role. The
-- revokes below are what actually enforce that.

-- ------------------------------------------------------------- purchases --

create or replace function public.grant_purchase(
  p_user     uuid,
  p_credits  integer,
  p_session  text
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_updated integer;
begin
  if p_credits <= 0 then
    return false;
  end if;

  insert into public.credit_transactions (user_id, delta, reason, stripe_session_id)
  values (p_user, p_credits, 'purchase', p_session);

  update public.profiles
     set credits = credits + p_credits
   where id = p_user;

  get diagnostics v_updated = row_count;

  -- No such account. Raising rolls the ledger row back too, so the webhook
  -- fails loudly and Stripe retries rather than us banking an unpaid credit.
  if v_updated = 0 then
    raise exception 'grant_purchase: no profile %', p_user;
  end if;

  return true;
exception
  -- Already credited for this checkout session. Nothing to do, and saying so
  -- lets the webhook answer 200 so Stripe stops retrying.
  when unique_violation then
    return false;
end;
$$;

comment on function public.grant_purchase(uuid, integer, text) is
  'Credits a completed Stripe checkout exactly once. Returns false if this session was already credited.';

-- ------------------------------------------------------- lock the doors --

revoke all on function public.grant_purchase(uuid, integer, text)  from public;
revoke all on function public.spend_credits(uuid, integer, uuid)   from public;
revoke all on function public.refund_credits(uuid, integer, uuid)  from public;
revoke all on function public.claim_images(uuid, integer)          from public;

-- Supabase's browser-facing roles, named explicitly in case a later grant to
-- one of them ever creeps back in.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.grant_purchase(uuid, integer, text) from anon';
    execute 'revoke all on function public.spend_credits(uuid, integer, uuid) from anon';
    execute 'revoke all on function public.refund_credits(uuid, integer, uuid) from anon';
    execute 'revoke all on function public.claim_images(uuid, integer) from anon';
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.grant_purchase(uuid, integer, text) from authenticated';
    execute 'revoke all on function public.spend_credits(uuid, integer, uuid) from authenticated';
    execute 'revoke all on function public.refund_credits(uuid, integer, uuid) from authenticated';
    execute 'revoke all on function public.claim_images(uuid, integer) from authenticated';
  end if;
end
$$;

-- service_role is the key our server holds and is what every legitimate call
-- comes through. Being the table owner it needs no grant, but saying so keeps
-- the intent readable.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.grant_purchase(uuid, integer, text) to service_role';
    execute 'grant execute on function public.spend_credits(uuid, integer, uuid) to service_role';
    execute 'grant execute on function public.refund_credits(uuid, integer, uuid) to service_role';
    execute 'grant execute on function public.claim_images(uuid, integer) to service_role';
  end if;
end
$$;
