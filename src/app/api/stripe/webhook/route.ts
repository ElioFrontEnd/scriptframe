import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Credits land here, not on the success page.
 *
 * The success URL is just a redirect the user could visit by typing it, so it
 * can never be what grants credits. Signature verification below is what makes
 * this trustworthy, and the unique constraint on
 * credit_transactions.payment_ref makes a replayed webhook a no-op.
 */
export async function POST(request: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !webhookSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const stripe = new Stripe(key);
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "No signature" }, { status: 400 });

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "bad signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const userId = session.metadata?.userId;
  const credits = Number(session.metadata?.credits ?? 0);
  if (!userId || !Number.isFinite(credits) || credits <= 0) {
    return NextResponse.json({ received: true });
  }

  const admin = createAdminClient();

  // One transaction writes both the ledger row and the balance. If it throws,
  // neither happened and the 500 below asks Stripe to try again — the one
  // outcome we must never reach is money taken with no credits delivered.
  const { error } = await admin.rpc("grant_purchase", {
    p_user: userId,
    p_credits: credits,
    p_session: session.id,
  });

  if (error) {
    console.error("grant_purchase failed", session.id, error.message);
    return NextResponse.json({ error: "Could not credit the account" }, { status: 500 });
  }

  // A false return means this session was already credited — a replayed
  // webhook, which is normal and must answer 200 so Stripe stops retrying.
  return NextResponse.json({ received: true });
}
