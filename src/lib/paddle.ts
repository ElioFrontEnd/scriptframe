import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paddle, our merchant of record.
 *
 * Paddle sells to the customer on our behalf and pays us — which is what makes
 * selling from Albania possible at all, since Stripe doesn't operate there. It
 * also means VAT is Paddle's liability rather than ours.
 *
 * This module is server-only. PADDLE_API_KEY can create charges against our
 * account, so it must never reach the browser.
 */

const SANDBOX = "https://sandbox-api.paddle.com";
const LIVE = "https://api.paddle.com";

/** Sandbox until PADDLE_ENV says otherwise, so a missing variable can't take real money. */
export function apiBase(): string {
  return process.env.PADDLE_ENV === "live" ? LIVE : SANDBOX;
}

export function isConfigured(): boolean {
  return !!process.env.PADDLE_API_KEY;
}

/** The Paddle price id for a credit pack, from the environment. */
export function priceIdFor(packId: string): string | undefined {
  const key = `PADDLE_PRICE_${packId.toUpperCase()}`;
  return process.env[key];
}

export type CreatedTransaction = { id: string; url: string };

/**
 * Creates a transaction and returns the hosted checkout link for it.
 *
 * The price comes from Paddle's own catalogue by id — the browser never sends
 * an amount, so there is nothing for it to tamper with. `customData` is set
 * here, server-side, and comes back untouched on the webhook; that is what
 * tells us whose account to credit, and it is the only thing we trust.
 */
export async function createTransaction(opts: {
  priceId: string;
  email?: string;
  customData: Record<string, string>;
}): Promise<CreatedTransaction> {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error("PADDLE_API_KEY is not set");

  const res = await fetch(`${apiBase()}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ price_id: opts.priceId, quantity: 1 }],
      custom_data: opts.customData,
      ...(opts.email ? { customer: { email: opts.email } } : {}),
    }),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    // Paddle's own message is the useful one ("price not found", "domain not
    // approved"), so surface it rather than a generic failure.
    const detail =
      body?.error?.detail ?? body?.error?.code ?? `HTTP ${res.status}`;
    throw new Error(String(detail));
  }

  const id = body?.data?.id as string | undefined;
  const url = body?.data?.checkout?.url as string | undefined;

  if (!id) throw new Error("Paddle returned no transaction id");
  if (!url) {
    // checkout.url only exists once a default payment link is set and its
    // domain is approved. Worth saying plainly — it is the usual first-run trip.
    throw new Error(
      "Paddle returned no checkout link. Set a default payment link under " +
        "Paddle > Checkout > Checkout settings, and make sure the domain is approved.",
    );
  }

  return { id, url };
}

/* ------------------------------------------------------------- webhooks */

/**
 * How long a signature stays acceptable.
 *
 * Paddle suggests five seconds. That is tight enough that ordinary clock drift
 * on a serverless host can reject a real payment, and the cost of a false
 * rejection here is a customer who paid and wasn't credited. The replay attack
 * the short window defends against is already neutralised by the unique index
 * on credit_transactions.payment_ref — a replayed webhook credits nothing
 * whatever its age — so a wider window is the safer trade, not the looser one.
 */
const TOLERANCE_SECONDS = 300;

export type VerifyResult =
  | { ok: true; event: PaddleEvent }
  | { ok: false; reason: string };

export type PaddleEvent = {
  event_type?: string;
  data?: {
    id?: string;
    status?: string;
    custom_data?: Record<string, unknown> | null;
  };
};

/** Parses `ts=123;h1=abc` into its parts. Tolerates spacing and ordering. */
export function parseSignatureHeader(
  header: string | null,
): { ts: string; h1: string } | null {
  if (!header) return null;

  let ts = "";
  let h1 = "";
  for (const part of header.split(";")) {
    const [rawKey, ...rest] = part.split("=");
    const key = rawKey.trim();
    const value = rest.join("=").trim();
    if (key === "ts") ts = value;
    if (key === "h1") h1 = value;
  }

  return ts && h1 ? { ts, h1 } : null;
}

/**
 * Verifies that a webhook really came from Paddle.
 *
 * This is the only thing standing between a stranger and free credits, so it
 * runs on the exact bytes Paddle sent: the signature covers `ts:body`, and any
 * reserialisation of the JSON changes the body and fails the check.
 */
export function verifyWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): VerifyResult {
  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) return { ok: false, reason: "missing or malformed signature" };

  const ts = Number(parsed.ts);
  if (!Number.isFinite(ts)) return { ok: false, reason: "bad timestamp" };
  if (Math.abs(nowSeconds - ts) > TOLERANCE_SECONDS) {
    return { ok: false, reason: "signature too old" };
  }

  const expected = createHmac("sha256", secret)
    .update(`${parsed.ts}:${rawBody}`)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(parsed.h1, "utf8");
  // timingSafeEqual throws on a length mismatch, which is itself a leak of
  // information — check the length first and answer in constant time after.
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "signature mismatch" };
  }

  try {
    return { ok: true, event: JSON.parse(rawBody) as PaddleEvent };
  } catch {
    return { ok: false, reason: "body is not JSON" };
  }
}
