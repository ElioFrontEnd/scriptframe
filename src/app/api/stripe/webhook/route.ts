import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Credits land here, not on the success page.
 *
 * The success URL is just a redirect the user could visit by typing it, so it
 * can never be what grants credits. Signature verification below is what makes
 * this trustworthy, and the unique constraint on
 * credit_transactions.stripe_session_id makes a replayed webhook a no-op.
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

  // Insert first: if this session was already processed the unique index
  // rejects it and we skip the top-up rather than granting it twice.
  const { error: ledgerError } = await admin.from("credit_transactions").insert({
    user_id: userId,
    delta: credits,
    reason: "purchase",
    stripe_session_id: session.id,
  });

  if (ledgerError) {
    if (ledgerError.code === "23505") return NextResponse.json({ received: true });
    return NextResponse.json({ error: "Ledger write failed" }, { status: 500 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  await admin
    .from("profiles")
    .update({ credits: (profile?.credits ?? 0) + credits })
    .eq("id", userId);

  return NextResponse.json({ received: true });
}
