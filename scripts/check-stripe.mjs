/**
 * Exercises the Stripe webhook against a real running server.
 *
 *   node scripts/check-stripe.mjs
 *
 * The webhook is the only route that hands out credits, so the question it has
 * to answer is: can anyone who isn't Stripe make it pay out? It starts its own
 * server on :3002 with a known webhook secret, then posts events that are
 * unsigned, wrongly signed, tampered with after signing, and stale, and checks
 * that every one of them is refused.
 *
 * It also checks the two answers that decide whether Stripe retries: a session
 * that cannot be credited must NOT return 200 (a 200 tells Stripe to stop, and
 * the customer never gets what they paid for), while an event we deliberately
 * ignore must return 200 (or Stripe retries it forever).
 *
 * Requires a production build: npm run build first.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Stripe = require("stripe");

const PORT = 3002;
const BASE = `http://localhost:${PORT}`;
const SECRET = "whsec_cutframe_local_test_secret";
const WRONG_SECRET = "whsec_not_the_right_one_at_all";

const stripe = new Stripe("sk_test_placeholder_not_used_for_network_calls");

function sign(payload, secret = SECRET, timestamp = Math.floor(Date.now() / 1000)) {
  return stripe.webhooks.generateTestHeaderString({
    payload,
    secret,
    timestamp,
  });
}

function event(overrides = {}) {
  return JSON.stringify({
    id: "evt_test_1",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_test_${Math.random().toString(36).slice(2)}`,
        object: "checkout.session",
        payment_status: "paid",
        metadata: {
          userId: "00000000-0000-0000-0000-0000000000ff",
          packId: "starter",
          credits: "400",
        },
        ...overrides,
      },
    },
  });
}

async function post(body, signature) {
  const res = await fetch(`${BASE}/api/stripe/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(signature ? { "stripe-signature": signature } : {}),
    },
    body,
  });
  return res.status;
}

let failures = 0;
function check(name, got, want) {
  const ok = Array.isArray(want) ? want.includes(got) : got === want;
  if (ok) {
    console.log(`  ok   ${name.padEnd(44)} -> ${got}`);
  } else {
    failures++;
    console.log(`  FAIL ${name.padEnd(44)} -> ${got} (want ${want})`);
  }
}

const server = spawn("npx", ["next", "start", "-p", String(PORT)], {
  cwd: new URL("..", import.meta.url).pathname,
  env: {
    ...process.env,
    STRIPE_WEBHOOK_SECRET: SECRET,
    STRIPE_SECRET_KEY: "sk_test_placeholder_not_used_for_network_calls",
  },
  stdio: "ignore",
});

async function waitForServer() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

try {
  if (!(await waitForServer())) {
    console.error("server did not start — run `npm run build` first");
    process.exit(1);
  }

  console.log("Rejecting anything that isn't Stripe:");

  const body = event();
  check("no signature header", await post(body, undefined), 400);
  check("empty signature header", await post(body, ""), 400);
  check("garbage signature", await post(body, "t=1,v1=deadbeef"), 400);
  check("signed with the wrong secret", await post(body, sign(body, WRONG_SECRET)), 400);

  // Signed correctly, then edited — the classic "raise my own credits" attempt.
  const signed = sign(body);
  const tampered = body.replace('"credits":"400"', '"credits":"999999"');
  check("body tampered with after signing", await post(tampered, signed), 400);

  // Stripe's own tolerance window; a captured request must not be replayable
  // days later.
  const stale = Math.floor(Date.now() / 1000) - 60 * 60;
  check("signature older than the tolerance", await post(body, sign(body, SECRET, stale)), 400);

  console.log("\nAnswering Stripe correctly:");

  // An event type we ignore must be acknowledged, or Stripe retries forever.
  const other = JSON.stringify({
    id: "evt_test_2",
    object: "event",
    type: "payment_intent.created",
    data: { object: { id: "pi_test_1" } },
  });
  check("an event type we ignore", await post(other, sign(other)), 200);

  // Paid for, but unfinished — nothing to credit yet, and nothing to retry.
  const unpaid = event({ payment_status: "unpaid" });
  check("a session that isn't paid", await post(unpaid, sign(unpaid)), 200);

  const noMeta = event({ metadata: {} });
  check("a session with no metadata", await post(noMeta, sign(noMeta)), 200);

  // A properly signed sale we cannot credit (the account does not exist) must
  // fail loudly. Returning 200 here would tell Stripe the money was delivered.
  const good = event();
  check("a real sale we cannot credit", await post(good, sign(good)), 500);

  console.log();
  if (failures === 0) {
    console.log("All Stripe webhook checks passed.");
  } else {
    console.log(`${failures} Stripe webhook check(s) failed — do not deploy.`);
  }
} finally {
  server.kill("SIGTERM");
}

process.exit(failures === 0 ? 0 : 1);
