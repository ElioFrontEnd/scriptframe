# Turning on payments

Everything in the code is done. This is the part only you can do, because it
involves your Stripe account and your money.

Work through it in order. Steps 1 and 2 must happen before anyone can pay you —
step 1 in particular, or the first real payment will be taken and the credits
will never arrive.

**Never paste a key into the chat.** Every key below goes straight from Stripe
into a file on your machine or into Vercel's settings page.

---

## Step 1 — Run the database migrations

Go to Supabase → your project → **SQL Editor** → **New query**.

Run these three files, one at a time, in this order. Open each one from
`C:\projects\cutframe\supabase\`, copy the whole file, paste, press Run.

1. `migration-002-custom-styles.sql`
2. `migration-003-timestamps.sql`
3. `migration-004-purchases.sql`

All three are safe to run twice, so run 002 even if you think you already did —
if it's already applied you'll just see a few "already exists, skipping"
notices, which is the correct outcome.

What each one is for:

- **002** — the reference-image styles table. If you haven't run it, `/app/new`
  is broken right now.
- **003** — stores which second of the video each frame belongs to. This is what
  the timestamp feature needs.
- **004** — two things. It makes crediting a purchase atomic, so a customer can
  never be charged without getting their credits. And it closes a hole I found
  while wiring this up: the credit functions were reachable straight from the
  browser. Any signed-in user could have called `refund_credits` on their own
  account with the anon key and given themselves unlimited credits. **Run this
  one before you take a single payment.**

---

## Step 2 — Push the code and deploy

Open PowerShell in `C:\projects\cutframe` (click the address bar in Explorer,
type `powershell`, press Enter), then:

```
git add -A
git commit -m "Timestamped transcripts, atomic purchases, lock down credit functions"
git push
```

Vercel picks it up and deploys. Wait for it to go green before step 5.

---

## Step 3 — Create the Stripe account

1. Go to https://stripe.com and sign up with your Cutframe email.
2. Stripe will ask what the business is. It's a software service selling
   image-generation credits — a digital service, not physical goods.
3. It will ask for your legal name, address, date of birth, and a bank account
   to pay you out to. You need to be 18, which you are. Use your real details;
   this is the identity check, and lying here is how accounts get frozen with
   money in them.

You can build and test everything below in **test mode** before any of that is
finished. Only payouts need the verification done.

---

## Step 4 — Get your API keys (test mode first)

1. Make sure the **Test mode** toggle at the top right of the dashboard is ON.
2. Go to https://dashboard.stripe.com/test/apikeys
3. Copy the **Secret key** (starts with `sk_test_`). You do not need the
   publishable key — Cutframe never uses it.

Put it in `C:\projects\cutframe\.env.local`:

```
STRIPE_SECRET_KEY=sk_test_...whatever Stripe gave you...
```

---

## Step 5 — Create the webhook

This is the part that actually hands out credits, so get it exactly right.

1. Go to https://dashboard.stripe.com/webhooks (still in test mode).
2. Click **Create an event destination**.
3. Choose **Your account**.
4. Leave the API version at the default.
5. For event types, select exactly one: **`checkout.session.completed`**.
   Don't select "all events" — Cutframe ignores everything else and it just
   makes noise.
6. Continue → destination type **Webhook endpoint** → Continue.
7. Endpoint URL:

   ```
   https://cutframe.app/api/stripe/webhook
   ```

8. On the next screen there's a **signing secret** starting with `whsec_`.
   Click to reveal it and copy it.

Put that in `.env.local` too:

```
STRIPE_WEBHOOK_SECRET=whsec_...
```

**The signing secret is not the API key.** They're different values from
different pages, and test mode and live mode each have their own. If you mix
them up, every payment is rejected as unsigned and nobody gets credited.

---

## Step 6 — Put both into Vercel

`.env.local` only affects your own machine. The live site reads Vercel's
settings.

1. Vercel → the cutframe project → **Settings** → **Environment Variables**.
2. Add `STRIPE_SECRET_KEY` — paste the `sk_test_...` value. Tick all three
   environments (Production, Preview, Development).
3. Add `STRIPE_WEBHOOK_SECRET` — paste the `whsec_...` value. Same three.
4. Go to **Deployments**, find the newest one, and use the ⋯ menu →
   **Redeploy**. Environment variables are baked in at deploy time, so without
   this the site is still running without them.

---

## Step 7 — Buy something with a fake card

1. Open https://cutframe.app on your phone, sign in, go to **Credits**.
2. Write down the balance you have right now.
3. Click Buy on any pack.
4. Card number `4242 4242 4242 4242`, any future expiry date, any 3-digit CVC,
   any postcode.
5. Pay.

What should happen: you land back on the Credits page, it says "Payment
received — adding your credits now", and a second or two later the balance
jumps by the pack size on its own. The purchase appears in History.

If the balance doesn't move within about twenty seconds, go to
https://dashboard.stripe.com/webhooks, click your endpoint, open **Event
deliveries**, and look at the `checkout.session.completed` event:

- **200** — Stripe delivered it fine, so the problem is on our side. Check
  Vercel → Logs.
- **400** — signature rejected. The `STRIPE_WEBHOOK_SECRET` in Vercel doesn't
  match this endpoint, or you didn't redeploy after adding it.
- **500** — it got through and failed while crediting. Almost always means
  migration 004 wasn't run.
- **404 / can't connect** — the URL is wrong. It must end in
  `/api/stripe/webhook`.

Test a failure too, so you know what a declined card looks like: card number
`4000 0000 0000 0002` is always declined. Your balance must not move.

---

## Step 8 — Go live

Only after step 7 works end to end.

1. Finish Stripe's verification — they'll email you if anything is missing.
2. Turn **Test mode** OFF.
3. Get the live secret key from https://dashboard.stripe.com/apikeys
   (starts with `sk_live_`).
4. Create the webhook again in live mode — same URL, same single event. It has
   its own separate signing secret. **You must do this. Test-mode webhooks do
   not fire for real payments**, and this is the single most common way a
   launch goes wrong: real money comes in and no credits go out.
5. Replace both values in Vercel with the live ones, and redeploy.
6. Buy the $9 pack yourself with your own card. It's the only way to know. You
   can refund it to yourself from the Stripe dashboard afterwards.

---

## Two things worth deciding before you take real money

**Your legal details on the site.** `src/lib/legal.ts` currently says the
operator is "Cutframe" and the jurisdiction is "the operator's country of
residence". Both are vague. Whatever Stripe registers you as during
verification is what those pages should say — tell me the country and the name
you registered and I'll set them.

**VAT.** Selling a digital service to consumers in the EU means VAT is owed in
the customer's country, from the first sale — there's no small-seller threshold
for cross-border digital services. Stripe Tax can work it out and collect it
for you (it costs a small percentage per transaction); once it's switched on in
the dashboard, set `STRIPE_AUTOMATIC_TAX=true` in Vercel and the checkout will
start collecting a billing address and adding tax. Until then the listed prices
are tax-inclusive and the liability sits with you. I'm not an accountant and
this isn't tax advice — it's worth an hour with one before you're taking real
volume, because it's much easier to set up correctly than to unwind later.
