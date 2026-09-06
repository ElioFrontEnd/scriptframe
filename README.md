# Cutframe

Paste a narration script, pick a style, get a full set of style-consistent
images numbered in script order.

The product is not "an image generator" — that market is a graveyard of thin
wrappers. It is the workflow around generation: splitting a script into beats,
writing a self-contained prompt for each one, holding a single look across a
hundred images, and handing back a numbered ZIP that drops straight into a
timeline.

A customer can pick one of twelve presets or upload a single reference image and
get a style of their own. The reference is read once by a vision model, which
writes the same kind of style description the presets use; nothing about
generation changes, so the price per frame is identical either way. See
`src/lib/styleAnalysis.ts` for why it is done that way rather than with
image-conditioned generation.

Live at **cutframe.app**.

---

## Running it

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

Setup for each service is in `cutframe-domain-guide.md` and the original
setup guide. The short version of what has to exist:

| Variable | Where from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API keys |
| `FAL_KEY` | fal.ai → Keys. Use a key dedicated to this app so it can be revoked alone. |
| `GEMINI_API_KEY` | aistudio.google.com/apikey |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe → API keys, then the webhook endpoint |
| `CRON_SECRET` | Any long random string you choose |
| `RESEND_API_KEY`, `EMAIL_FROM` | Optional — enables "your set is ready" emails |

Run these in the Supabase SQL editor once each, in order:

1. `supabase/schema.sql` — tables, row-level security, the private `images`
   bucket, and the credit functions.
2. `supabase/migration-002-custom-styles.sql` — styles made from a customer's
   own reference image. Additive and safe to re-run.

---

## Commands

```bash
npm run dev          # development server (also serves /dev/preview)
npm run build        # production build
npm run check        # TypeScript
npm run lint         # ESLint

npm run test:math    # counting logic — how many images a script becomes
npm run test:routes  # every mutating endpoint rejects an unauthenticated caller
npm run db:start     # throwaway local Postgres for the SQL tests
npm run test:sql     # credit and claim functions, including under concurrency
npm run db:stop

npm run models       # list Gemini models this API key can reach
npm run shots        # screenshot pages to /tmp/shots for a visual review
node scripts/make-og.mjs             # regenerate public/og.png
node scripts/add-samples.mjs <dir> <style-id>   # add gallery samples
```

`npm run test:routes` expects a server running on `localhost:3000`; it also
works against production by passing the URL.

---

## How the money is protected

Anything that spends the fal balance is on our bill, so the guarantees here are
deliberate — and `npm run test:sql` proves the important ones against a real
Postgres, including under genuine concurrency.

- **Credits are deducted server-side, before generation.**
  `/api/jobs/[id]/start` and the regenerate endpoint are the only places credits
  are spent, and both call `spend_credits`, which decrements and checks the
  balance in a single atomic statement. Twenty parallel attempts on a balance of
  100 result in exactly ten successes and a balance of zero — never negative.
- **The browser can only read.** RLS grants `select` on your own rows and
  nothing else. Every write goes through a route handler using the service role
  after establishing who the caller is.
- **Frames are claimed with `SELECT … FOR UPDATE SKIP LOCKED`**, so the browser
  polling and the cron sweep never generate — or charge for — the same frame
  twice. Eight parallel workers over 40 frames claim 40 distinct frames.
- **Failed images are refunded** when a job finishes, and a failed regeneration
  refunds its credit and leaves the previous frame untouched.
- **Webhooks, not redirects, grant credits.** The Stripe success URL is a page
  anyone could visit; credits are added only on a signature-verified webhook,
  and the unique index on `stripe_session_id` makes a replay a no-op.
- **Rate limits and caps**: jobs per hour, concurrent jobs, 300 images per job,
  three attempts per frame. fal's safety checker stays on — it is our account
  that gets suspended for what users generate.
- **`FAL_KEY` never reaches the browser.** It is read only inside
  `src/lib/fal.ts`, which is imported exclusively by server code.

---

## Unit economics

At $0.003 an image:

| Pack | Price | Images | Cost to us | Margin |
| --- | --- | --- | --- | --- |
| Starter | $9 | 400 | $1.20 | 87% |
| Creator | $19 | 1,000 | $3.00 | 84% |
| Studio | $49 | 3,000 | $9.00 | 82% |

New accounts get 40 free images — about twelve cents — so a trial is a rounding
error rather than a growth expense.

Credit packs rather than a subscription is deliberate: faceless creators churn
hard, and people who quit simply stop buying instead of cancelling and asking
for a refund.

---

## Layout

```
src/app/                       routes
  page.tsx                     landing page
  terms/, privacy/             legal pages
  app/                         signed-in screens
  dev/preview/                 component gallery (development only, 404s in prod)
  api/                         route handlers

src/components/
  marketing/                   landing and legal page pieces
  app/                         signed-in UI
  StyleSwatch.tsx              abstract palette panel — never stands in for output
  Wordmark.tsx                 the mark

src/lib/
  styles.ts                    the style presets — the actual differentiator
  gemini.ts                    shared model access with retirement fallback
  prompts.ts                   script -> per-beat prompts (chunked, parallel)
  styleAnalysis.ts             reference image -> style block
  fal.ts                       image generation, server-only
  storage.ts                   images in Supabase Storage, private + signed URLs
  runner.ts                    batch worker: claims, retries, refunds, completion
  jobPayload.ts                the job screen's data, shared by page and API
  config.ts                    pricing, limits, pacing
  email.ts                     optional completion emails
  samples.ts                   landing-page gallery, reads public/samples

supabase/schema.sql            tables, RLS, atomic credit functions
supabase/migration-002-*.sql   custom styles and the per-job style snapshot
scripts/                       tests, screenshots, sample loading, OG image
```

---

## Design

Editorial and calm rather than the gradient-and-neon look most AI tools wear.
Two reasons: the product's job is producing images, and a loud interface fights
its own output; and a restrained typographic surface reads as an instrument
rather than a weekend wrapper.

Warm paper ground, ink text, a single clay accent, one serif for display. All
tokens live at the top of `src/app/globals.css`.

Two things to know if you change the CSS:

- Tailwind v4 only lets `@apply` pull in real utilities, not other component
  classes — so `.btn-primary` and friends spell out their own sets rather than
  composing from a shared base.
- Custom utilities must use the `@utility` at-rule. Declaring them inside
  `@layer utilities` with a grouped selector silently emits nothing.

The webfonts are requested with a plain `<link>` rather than `next/font`,
because the environment this was built in cannot reach Google's servers at build
time. Every font stack ends in faces that ship with real operating systems, so
the design holds if they never load. Switching to `next/font` is a safe one-file
change from a machine with normal network access.

---

## Before taking real money

- Set `LEGAL.operator` and `LEGAL.jurisdiction` in `src/lib/legal.ts` to your
  registered name and country. The legal pages are an honest starting point
  written to match what the service actually does — not legal advice.
- Make `support@cutframe.app` receive mail (Cloudflare Email Routing forwards it
  to a normal inbox for free). Stripe requires a working support contact.
- Check fal.ai's terms on reselling API access.
- Put real sample sets in `public/samples` — see that folder's README.
