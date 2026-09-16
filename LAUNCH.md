# Cutframe — from here to advertising

Rewritten 12 September 2026, after finding that Stripe can't work for Albania.

The product itself is finished. Someone can sign in, paste a script, get a set
of images, and the crediting machinery behind a payment is tested and correct.
What's left is a payments provider that will actually work for you, and three
small things that have nothing to do with code.

Work through it in order. Part 1 is the payments problem, which now gates
everything. Part 2 is launch. Part 3 is what to watch afterwards. Part 4 is the
list of things I'm deliberately telling you not to build yet.

If a step goes wrong, stop and tell me what it said rather than pushing past it.

---

# PART 0 — What happened with Stripe, in one paragraph

Stripe fixes an account's country at signup and can't change it afterwards, and
Albania isn't one of the ~44 countries Stripe operates in — it isn't in the
dropdown at all. The account you have is registered in the United States, which
can only be verified with a US address, an SSN or EIN, and a US bank account.
Nothing real was lost: no customer money ever went in, because verification is
required before live payments work. **Leave that account unverified, don't put
US details into it, and close it when you get a moment.**

The replacement is a **merchant of record**. Paddle legally sells to your
customer, takes their payment, and pays you. You're their supplier rather than
the merchant, which is how they can work with people in countries Stripe
doesn't reach. It also makes EU VAT their liability instead of yours, which for
a one-person business selling worldwide is worth more than the fee difference.

**Do not advertise until payments are switched over.** The site is live and the
Buy buttons currently point at a Stripe account that can't take a real card.
Nobody is there to hit them yet, but that stops being true the moment you post.

---

# PART 1 — Getting to a working payment

## Step 1 — Put real output on the landing page

This was already the most important step for conversion. It now has a second
reason: **Paddle's approval is manual, and a site with nothing visible on it is
the profile that gets rejected.** Filling the gallery is what makes the
application straightforward.

Right now the gallery shows one frame per style. Your entire claim is that a
*whole set* holds one look. One frame proves nothing — every AI tool can make
one good image.

Cost: about eight cents of credits and five minutes.

In PowerShell at `C:\projects\cutframe`:

```
npm run samples
```

That's it. The script runs the real pipeline — your narration goes through the
real prompt writer, and each frame is generated from the real style block by the
real model — and writes six consecutive frames each for Stickman, Classical Oil,
Cinematic Realism and Storybook Watercolour into `public/samples/`. It reads
your keys from `.env.local`, so there is nothing to configure.

To use one of your own GeoWisdom scripts instead of the built-in one, save it as
a plain `.txt` file and point at it:

```
npm run samples -- --script "C:\Users\Pozitron\Downloads\laki.txt"
```

To fill in every remaining style — it skips the ones already done, so you only
pay for what's missing:

```
npm run samples -- --all
```

Other options, if you want them:

```
npm run samples -- --styles anime-still,dark-fantasy
npm run samples -- --count 8
npm run samples -- --styles stickman-whiteboard --force   # redo one you don't like
```

Then look at it and push:

```
npm run dev          # http://localhost:3000, scroll to Styles
npm test
npm run build
git add -A
git commit -m "Real sample sets"
git push
```

If a frame or two fails — the safety checker rejects things occasionally — just
run `npm run samples` again. It regenerates everything for the styles you name,
so pass `--styles` with only the one that came up short.

**Only real Cutframe output goes in there.** Not Midjourney, not something made
elsewhere. If the samples don't match what the app produces, every customer
finds out five minutes after paying.

---

## Step 2 — Apply to Paddle

Go to https://www.paddle.com and sign up as a seller.

What they'll want:
- The live website (hence step 1)
- What you sell and who buys it — "AI-generated image sets for video creators,
  sold as prepaid credits" is accurate and unremarkable
- Your identity and tax details
- A bank account to be paid into

Answer everything honestly, including that you're an individual rather than a
company if that's the case. Approval usually takes a few days. They may come
back with questions; that's normal, not a rejection.

**If Paddle says no**, the backup is Dodo Payments, which markets itself
specifically at founders in countries Stripe doesn't cover. Tell me and we'll
go there instead. Two I've already ruled out: Polar uses Stripe underneath so it
inherits the same country list, and Lemon Squeezy is being absorbed into Stripe
with its own team warning that support is slow during the transition.

---

## Step 3 — While you wait for approval

### 3a. Your legal details

The terms and privacy pages say the site is operated by "Cutframe" in "the
operator's country of residence", which names no actual party. Tell me your
legal name and I'll set it — or edit `src/lib/legal.ts` yourself:

```ts
export const LEGAL = {
  operator: "Your Full Name",
  jurisdiction: "Albania",
  lastUpdated: "12 September 2026",
};
```

Once Paddle is approved, the terms need a further change: **Paddle becomes the
seller of record**, and the pages have to say so, with refunds and billing
questions pointing at them. I'll write that when we switch the integration —
don't try to word it yourself.

### 3b. Make support@cutframe.app work

Your terms, privacy policy and billing page all tell customers to email it. If
it bounces, a customer with a charge problem has no way to reach you.

Send it an email from your phone. If nothing arrives: Cloudflare → cutframe.app
→ **Email** → **Email Routing** → enable, then forward `support@cutframe.app` to
your Gmail. Cloudflare adds the MX records itself. Verify your Gmail when it
asks, then test again.

### 3c. The tax question — worth one conversation

You'll be earning income, and at some point that has to be declared wherever you
live. Paddle handles the VAT on sales, which is the complicated international
half, but it doesn't handle your own income tax, and whether you need to
register as a sole trader in Albania before this becomes regular income is a
question for someone who knows Albanian law.

Spend an hour with an accountant before the money is regular. It is far cheaper
to set up correctly than to unwind. I'm not an accountant and none of this is
tax advice.

---

## Step 4 — The integration is already written

Done, 13 September. You don't have to wait for approval for this part, and you
don't have to do anything to it.

What was built: `/api/paddle/checkout` creates a Paddle transaction server-side
and hands back its hosted checkout link, and `/api/paddle/webhook` verifies
Paddle's signature and credits the account. The browser now posts to a single
`/api/checkout`, which picks the provider from `PAYMENT_PROVIDER` — so switching
is one environment variable, not a code change.

Unchanged, on purpose: the packs and prices, the atomic grant function, the
ledger, the balance, the waiting banner, the history page, every existing test.

**Run migration 005** in the Supabase SQL editor
(`supabase/migration-005-payment-ref.sql`). It renames the ledger's
`stripe_session_id` column to `payment_ref`, since it now holds a Paddle
transaction id. Safe to run twice, like the others.

### What you need to do once approved

**1. Create the three products in Paddle.** Paddle > Catalog > Products. Make
one product per pack with a one-time price:

| Product name | Price | Pack id |
|---|---|---|
| Cutframe Starter — 400 images | $9 USD one-time | `starter` |
| Cutframe Creator — 1,000 images | $19 USD one-time | `creator` |
| Cutframe Studio — 3,000 images | $49 USD one-time | `studio` |

Copy each **price id** (starts `pri_`).

**2. Set the default payment link.** Paddle > Checkout > Checkout settings >
Default payment link → `https://cutframe.app/app/billing`. Without this Paddle
returns no checkout URL and the error will say so.

**3. Create the webhook.** Paddle > Developer tools > Notifications > New
destination. URL `https://cutframe.app/api/paddle/webhook`, and subscribe to
**`transaction.completed`** only. Copy the secret (starts `pdl_ntfset_`).

**4. Get an API key.** Paddle > Developer tools > Authentication.

**5. Put them in `.env.local` and in Vercel** (Settings > Environment
Variables), then redeploy:

```
PAYMENT_PROVIDER=paddle
PADDLE_ENV=sandbox          # "live" only after step 5 of this doc passes
PADDLE_API_KEY=...
PADDLE_WEBHOOK_SECRET=...
PADDLE_PRICE_STARTER=pri_...
PADDLE_PRICE_CREATOR=pri_...
PADDLE_PRICE_STUDIO=pri_...
```

Do the whole thing in **sandbox** first — it has its own separate keys, prices
and webhook, and needs no domain approval. Only change `PADDLE_ENV` to `live`
once a sandbox purchase has credited an account correctly.

As always: those values go into `.env.local` and Vercel by your hand. Don't
paste them into the chat.

---

# PART 2 — Launch

## Step 6 — Walk through it as a stranger

Open cutframe.app in a **private window**, on your phone, with an email address
you've never used on the site:

- [ ] The landing page loads and the gallery shows your sample strips
- [ ] "Start free" goes to the sign-in page
- [ ] The sign-in email arrives within a minute — note whether it lands in spam
- [ ] The link signs you in
- [ ] A new project writes prompts without spending credits
- [ ] 40 free credits are there
- [ ] Generating works and the ZIP downloads
- [ ] "Get Creator" on the pricing table leads to sign-in, then to billing with
      Creator pre-picked
- [ ] Buying with a real card credits the account within seconds

If the sign-in email lands in spam, tell me — that costs a large share of
signups and it's a DNS fix.

## Step 7 — Advertise, small first

Don't blast everything at once. You want the first ten users to be people you
can talk to, because they'll tell you what's broken in ways neither of us can
predict from here.

1. **Your own 200 subscribers.** A video showing the real workflow — your script
   going in, the set coming out, dropped into a timeline. You're the proof:
   four faceless channels, $12–13k from three of them. That story is the advert.
2. **One Reddit post**, where faceless-video people actually are. Read the
   subreddit's self-promotion rules first — many ban it outright, and getting
   banned from the right subreddit on day one is a real cost. Post as someone
   who built a tool for their own problem, not as a company.
3. **Wait a week.** Read what comes back. Fix the top complaint.

Only after that is it worth paying for traffic.

---

# PART 3 — The first two weeks

**Your fal.ai spend.** https://fal.ai/dashboard — make sure a spend cap is set.
Every signup gets 40 free images at about $0.003 each, so a free account costs
you 12 cents, and nothing stops one person signing up twenty times with
disposable addresses. Fine at small scale, $120 if someone farms it. If spend
climbs without matching sales, tell me and we'll add a limit.

**Paddle payouts vs credits issued.** They should agree. If someone pays and
doesn't get credits, find it yourself rather than hearing it from them.

**Vercel logs** for 500 errors.

**The support inbox.** Answer everything within a day. At this size, the founder
replying personally within an hour beats every competitor you have.

**What people ask for.** Keep a note. After ten users the pattern will be
obvious, and it will not be what either of us would have guessed.

---

# PART 4 — Deliberately not doing yet

**Background generation.** The open browser tab drives the work. Close it and
the job pauses; reopen the project and it resumes, and the app says so honestly.
Making it truly background needs Vercel Pro at $20/month or a job queue. Buy it
when a customer complains.

**Signup abuse limits.** See the fal spend note. Fix it if it actually happens.

**Claymation's preview** still renders photoreal instead of clay. One style of
twelve, a fraction of a cent to re-render. Say the word.

**A US company via Stripe Atlas.** About $500 for a Delaware LLC with an EIN and
a US bank account, which would make a US Stripe account legitimate. Plenty of
non-US founders do it. It also brings annual franchise tax, US filings and an
accountant. Revisit it if Cutframe is making real money and Paddle's fees start
to matter — not at zero revenue.

**More features.** You already have timestamp-following and custom styles from a
reference image, which is more than the pitch needs. Adding a sixth thing nobody
asked for is the most common way a product like this dies.

---

# The short version

1. Fill the sample gallery — 1 hour, 30 cents. Gates everything else.
2. Apply to Paddle with the live site. A few days to hear back.
3. While waiting: your legal name in the terms, support email working, one
   conversation with an accountant.
4. Tell me when Paddle approves and I'll swap the integration — half a day.
5. Test in their sandbox, then buy your own $9 pack with a real card.
6. Walk through the whole thing in a private window on your phone.
7. Your subscribers first, then one Reddit post, then wait a week.

Step 1 is the only one you can do today, and it's the one everything else waits
on. Start there.
