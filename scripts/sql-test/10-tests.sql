-- Behavioural tests for the credit and claim functions.
-- Every failure raises, so a non-zero psql exit means something is wrong.

\set ON_ERROR_STOP on

create or replace function assert(cond boolean, what text)
returns void language plpgsql as $$
begin
  if not cond then
    raise exception 'FAILED: %', what;
  end if;
  raise notice '  ok   %', what;
end;
$$;

do $$
declare
  u uuid := gen_random_uuid();
  j uuid;
  bal integer;
  n integer;
  paid boolean;
begin
  ------------------------------------------------------------------ signup --
  insert into auth.users (id, email) values (u, 'test@example.com');

  select credits into bal from public.profiles where id = u;
  perform assert(bal = 40, 'new account starts with 40 credits');

  select count(*) into n from public.credit_transactions
   where user_id = u and reason = 'signup_bonus';
  perform assert(n = 1, 'signup bonus is written to the ledger');

  ------------------------------------------------------------------- spend --
  insert into public.jobs (user_id, title, script, style_id, image_count)
  values (u, 'test', 'script', 'handdrawn-educational', 10)
  returning id into j;

  select public.spend_credits(u, 10, j) into paid;
  perform assert(paid, 'spend succeeds when the balance covers it');

  select credits into bal from public.profiles where id = u;
  perform assert(bal = 30, 'balance is decremented by the amount spent');

  select count(*) into n from public.credit_transactions
   where user_id = u and reason = 'generation' and delta = -10;
  perform assert(n = 1, 'spend is written to the ledger');

  select public.spend_credits(u, 999, j) into paid;
  perform assert(not paid, 'spend fails when the balance is short');

  select credits into bal from public.profiles where id = u;
  perform assert(bal = 30, 'a failed spend changes nothing');

  select public.spend_credits(u, 0, j) into paid;
  perform assert(not paid, 'spending zero is rejected');

  select public.spend_credits(u, -50, j) into paid;
  perform assert(not paid, 'spending a negative amount is rejected');

  select credits into bal from public.profiles where id = u;
  perform assert(bal = 30, 'negative spend cannot inflate the balance');

  ------------------------------------------------------------------ refund --
  perform public.refund_credits(u, 4, j);
  select credits into bal from public.profiles where id = u;
  perform assert(bal = 34, 'refund returns credits');

  perform public.refund_credits(u, -100, j);
  select credits into bal from public.profiles where id = u;
  perform assert(bal = 34, 'a negative refund is ignored');

  ----------------------------------------------------------------- blocked --
  update public.profiles set is_blocked = true where id = u;
  select public.spend_credits(u, 1, j) into paid;
  perform assert(not paid, 'a blocked account cannot spend');
  update public.profiles set is_blocked = false where id = u;

  ------------------------------------------------------------------ claims --
  insert into public.job_images (job_id, idx, prompt)
  select j, g, 'prompt ' || g from generate_series(0, 9) g;

  select count(*) into n from public.claim_images(j, 4);
  perform assert(n = 4, 'claim_images returns at most the requested batch');

  select count(*) into n from public.job_images
   where job_id = j and status = 'running' and attempts = 1;
  perform assert(n = 4, 'claimed rows are marked running with attempts incremented');

  select count(*) into n from public.claim_images(j, 100);
  perform assert(n = 6, 'a second claim takes only the rows still pending');

  -- Rows stuck running are re-claimable once they go stale.
  update public.job_images set status = 'running', claimed_at = now() - interval '10 minutes'
   where job_id = j and idx = 0;
  select count(*) into n from public.claim_images(j, 10);
  perform assert(n = 1, 'a stale running row is re-claimed');

  -- The attempt ceiling stops an endlessly failing frame from looping.
  update public.job_images
     set status = 'pending', attempts = 3
   where job_id = j and idx = 1;
  select count(*) into n from public.claim_images(j, 10);
  perform assert(n = 0, 'rows past the attempt ceiling are never claimed again');

  raise notice 'all single-session assertions passed';
end;
$$;

-- Migration 002: styles made from a customer's own reference image.
do $$
declare
  u uuid := gen_random_uuid();
  s uuid;
  j uuid;
  n integer;
  snap jsonb;
begin
  insert into auth.users (id, email) values (u, 'styles@example.com');

  insert into public.custom_styles (user_id, name, block, guidance, swatch, texture)
  values (u, 'Soft Gouache', 'soft gouache illustration, chalky matte pigment, no photorealism',
          'Favour calm domestic scenes.', array['#faf7f2','#b4552d','#6e7f5c'], 'wash')
  returning id into s;

  select count(*) into n from public.custom_styles where user_id = u;
  perform assert(n = 1, 'a custom style can be saved');

  -- A job snapshots the style it was made with.
  insert into public.jobs (user_id, title, script, style_id, style, image_count)
  values (u, 'test', 'script', s::text,
          jsonb_build_object('id', s::text, 'name', 'Soft Gouache',
                             'block', 'soft gouache illustration, chalky matte pigment',
                             'guidance', '', 'swatch', array['#faf7f2','#b4552d','#6e7f5c'],
                             'texture', 'wash'),
          10)
  returning id into j;

  select style into snap from public.jobs where id = j;
  perform assert(snap->>'name' = 'Soft Gouache', 'a job stores its style snapshot');

  -- Deleting the style must not disturb jobs already made with it.
  delete from public.custom_styles where id = s;

  select count(*) into n from public.jobs where id = j;
  perform assert(n = 1, 'deleting a style leaves its jobs intact');

  select style into snap from public.jobs where id = j;
  perform assert(snap->>'block' is not null, 'the job keeps its look after the style is deleted');

  -- Styles vanish with their owner.
  insert into public.custom_styles (user_id, name, block)
  values (u, 'Another', 'flat vector illustration, no outlines, no texture');
  delete from auth.users where id = u;

  select count(*) into n from public.custom_styles where user_id = u;
  perform assert(n = 0, 'styles are removed when the account is');

  raise notice 'custom style assertions passed';
end;
$$;
