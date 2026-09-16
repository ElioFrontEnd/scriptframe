import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhook } from "@/lib/paddle";

/**
 * Credits land here, not on the success page.
 *
 * The page a customer returns to is just a URL they could type, so it can never
 * be what grants credits. The signature check below is what makes this
 * trustworthy, and the unique index on credit_transactions.payment_ref makes a
 * re-delivered webhook a no-op rather than a second free top-up.
 */

/** Paddle sends several events per payment; this is the one that means "fulfil it". */
const FULFIL = "transaction.completed";

export async function POST(request: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("PADDLE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // The signature covers the exact bytes Paddle sent. Parsing and re-serialising
  // the JSON first would change them and fail every check.
  const rawBody = await request.text();

  const result = verifyWebhook(
    rawBody,
    request.headers.get("paddle-signature"),
    secret,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  const event = result.event;

  // Anything we don't act on still gets a 200, or Paddle retries it for days.
  if (event.event_type !== FULFIL) {
    return NextResponse.json({ received: true });
  }

  const transactionId = event.data?.id;
  const custom = event.data?.custom_data ?? {};
  const userId = typeof custom.userId === "string" ? custom.userId : undefined;
  const credits = Number(custom.credits ?? 0);

  if (!transactionId || !userId || !Number.isFinite(credits) || credits <= 0) {
    // A completed transaction we can't attribute is worth knowing about: it
    // means someone paid and we don't know who. Acknowledge it so Paddle stops
    // retrying, and leave a trail to find it by.
    console.error("unattributable transaction", transactionId, JSON.stringify(custom));
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();

  // One transaction writes both the ledger row and the balance. If it throws,
  // neither happened and the 500 below asks Paddle to try again — the one
  // outcome we must never reach is money taken with no credits delivered.
  const { error } = await admin.rpc("grant_purchase", {
    p_user: userId,
    p_credits: credits,
    p_session: transactionId,
  });

  if (error) {
    console.error("grant_purchase failed", transactionId, error.message);
    return NextResponse.json({ error: "Could not credit the account" }, { status: 500 });
  }

  // A false return means this transaction was already credited — a re-delivered
  // webhook, which is normal and must answer 200 so Paddle stops retrying.
  return NextResponse.json({ received: true });
}
