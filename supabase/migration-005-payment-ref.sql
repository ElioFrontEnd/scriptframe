-- Cutframe migration 005 — payment provider rename
--
-- Run this in the Supabase SQL editor. Safe to run twice.
--
-- Stripe can't be used from Albania, so payments move to Paddle. The ledger
-- column that holds "which payment this credit grant came from" was named
-- stripe_session_id; it now holds a Paddle transaction id, so the name is
-- renamed to something provider-neutral and grant_purchase is recreated against
-- it. Nothing about the behaviour changes: the unique index on that column is
-- still what makes a replayed webhook a no-op rather than a free top-up.

do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public'
       and table_name = 'credit_transactions'
       and column_name = 'stripe_session_id'
  ) then
    alter table public.credit_transactions
      rename column stripe_session_id to payment_ref;
  end if;
end
$$;

comment on column public.credit_transactions.payment_ref is
  'The payment provider''s own id for the purchase this row credits (a Paddle transaction id). Unique, which is what makes re-delivered webhooks idempotent. NULL for anything that was not a purchase.';

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

  insert into public.credit_transactions (user_id, delta, reason, payment_ref)
  values (p_user, p_credits, 'purchase', p_session);

  update public.profiles
     set credits = credits + p_credits
   where id = p_user;

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'grant_purchase: no profile %', p_user;
  end if;

  return true;
exception
  when unique_violation then
    return false;
end;
$$;

comment on function public.grant_purchase(uuid, integer, text) is
  'Credits a completed purchase exactly once. Returns false if this payment was already credited.';

revoke all on function public.grant_purchase(uuid, integer, text) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.grant_purchase(uuid, integer, text) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.grant_purchase(uuid, integer, text) from authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.grant_purchase(uuid, integer, text) to service_role';
  end if;
end
$$;
