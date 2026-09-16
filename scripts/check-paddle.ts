/**
 * Checks the Paddle webhook signature verifier.
 *
 *   npx tsx scripts/check-paddle.ts
 *
 * This function is the only thing between a stranger and free credits: anyone
 * who can forge a request it accepts can mint themselves any balance they like.
 * So it gets tested directly rather than only through the route.
 */
import { createHmac } from "node:crypto";
import { parseSignatureHeader, verifyWebhook } from "../src/lib/paddle";

const SECRET = "pdl_ntfset_test_secret";
const OTHER = "pdl_ntfset_a_different_secret";

let failed = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) console.log(`  ok   ${name}`);
  else {
    failed++;
    console.log(`  FAIL ${name}\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`);
  }
}

function sign(body: string, secret = SECRET, ts = 1_700_000_000): string {
  const h1 = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
}

const NOW = 1_700_000_000;
const body = JSON.stringify({
  event_type: "transaction.completed",
  data: {
    id: "txn_01abc",
    status: "completed",
    custom_data: { userId: "u1", packId: "creator", credits: "1000" },
  },
});

console.log("Parsing the Paddle-Signature header");
check("a normal header parses", parseSignatureHeader("ts=123;h1=abc"), { ts: "123", h1: "abc" });
check("spacing is tolerated", parseSignatureHeader(" ts=123 ; h1=abc "), { ts: "123", h1: "abc" });
check("order doesn't matter", parseSignatureHeader("h1=abc;ts=123"), { ts: "123", h1: "abc" });
check("a missing h1 is refused", parseSignatureHeader("ts=123"), null);
check("a missing ts is refused", parseSignatureHeader("h1=abc"), null);
check("an empty header is refused", parseSignatureHeader(""), null);
check("a null header is refused", parseSignatureHeader(null), null);

console.log("\nAccepting what Paddle really sent");
const good = verifyWebhook(body, sign(body), SECRET, NOW);
check("a correctly signed body is accepted", good.ok, true);
check(
  "the parsed event carries the transaction id",
  good.ok ? good.event.data?.id : null,
  "txn_01abc",
);
check(
  "custom data survives verbatim",
  good.ok ? good.event.data?.custom_data : null,
  { userId: "u1", packId: "creator", credits: "1000" },
);
check(
  "a signature from five minutes ago still works",
  verifyWebhook(body, sign(body, SECRET, NOW - 290), SECRET, NOW).ok,
  true,
);
check(
  "clock skew the other way is tolerated too",
  verifyWebhook(body, sign(body, SECRET, NOW + 120), SECRET, NOW).ok,
  true,
);

console.log("\nRefusing everything else");
function reason(r: ReturnType<typeof verifyWebhook>) {
  return r.ok ? "ACCEPTED" : r.reason;
}
check("no signature header", reason(verifyWebhook(body, null, SECRET, NOW)), "missing or malformed signature");
check("a junk header", reason(verifyWebhook(body, "nonsense", SECRET, NOW)), "missing or malformed signature");
check(
  "a non-numeric timestamp",
  reason(verifyWebhook(body, `ts=abc;h1=${"0".repeat(64)}`, SECRET, NOW)),
  "bad timestamp",
);
check(
  "signed with the wrong secret",
  reason(verifyWebhook(body, sign(body, OTHER), SECRET, NOW)),
  "signature mismatch",
);
check(
  "a stale signature",
  reason(verifyWebhook(body, sign(body, SECRET, NOW - 3600), SECRET, NOW)),
  "signature too old",
);

// The attack that matters: sign a real $9 purchase, then edit the credits.
const tampered = body.replace('"1000"', '"999999"');
check(
  "the body edited after signing",
  reason(verifyWebhook(tampered, sign(body), SECRET, NOW)),
  "signature mismatch",
);

// Semantically the same event, different bytes. This must fail, and it is what
// breaks if the route ever parses the body as JSON and re-serialises it instead
// of signing over the raw text.
const reserialised = JSON.stringify(JSON.parse(body), null, 2);
check(
  "a re-serialised body",
  reason(verifyWebhook(reserialised, sign(body), SECRET, NOW)),
  "signature mismatch",
);

// A short h1 must be refused, not throw — timingSafeEqual throws on length
// mismatch, and an exception here would be a 500 rather than a rejection.
check("a truncated signature", reason(verifyWebhook(body, "ts=1700000000;h1=ab", SECRET, NOW)), "signature mismatch");

// Correctly signed, but not JSON.
const notJson = "this is not json";
check(
  "a correctly signed body that isn't JSON",
  reason(verifyWebhook(notJson, sign(notJson), SECRET, NOW)),
  "body is not JSON",
);

console.log();
if (failed === 0) console.log("All Paddle checks passed.");
else {
  console.log(`${failed} Paddle check(s) failed.`);
  process.exit(1);
}
