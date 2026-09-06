import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireUser, fail } from "@/lib/api";
import { getPack } from "@/lib/config";

/**
 * Opens a Stripe Checkout session for one credit pack.
 *
 * The price is read from our own table, never from the request — a browser that
 * posts {packId:"starter", priceUsd:0} gets the $9 the code says a Starter
 * costs. Nothing here grants credits; the signed webhook does that.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user } = auth;

  const { packId } = (await request.json().catch(() => ({}))) as { packId?: string };
  const pack = packId ? getPack(packId) : undefined;
  if (!pack) return fail("Unknown credit pack");

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return fail("Payments are not set up yet", 503);

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  try {
    const stripe = new Stripe(key);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email ?? undefined,
      // Shows in the Stripe dashboard next to the payment, which makes
      // "this customer says they weren't credited" a ten-second lookup.
      client_reference_id: user.id,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: pack.priceUsd * 100,
            product_data: {
              name: `${pack.name} — ${pack.credits.toLocaleString()} images`,
              description: `Enough for ${pack.videos}. Credits never expire.`,
            },
          },
        },
      ],
      // The webhook trusts these, not anything the browser sends back.
      metadata: { userId: user.id, packId: pack.id, credits: String(pack.credits) },
      // Stripe can work out and collect VAT/sales tax, but only once Tax is
      // switched on in the dashboard — until then asking for it errors, so it
      // stays off and the listed price is tax-inclusive. Turning on
      // STRIPE_AUTOMATIC_TAX also makes Checkout collect a billing address,
      // which is what Stripe needs to pick a rate.
      ...(process.env.STRIPE_AUTOMATIC_TAX === "true"
        ? {
            automatic_tax: { enabled: true },
            billing_address_collection: "required" as const,
          }
        : {}),
      success_url: `${site}/app/billing?paid=1`,
      cancel_url: `${site}/app/billing?cancelled=1`,
    });

    if (!session.url) return fail("Stripe did not return a checkout link", 502);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    // Stripe's own message is usually the useful one ("No such price", "Your
    // account cannot currently make live charges"), so it is worth surfacing
    // rather than swallowing behind a generic failure.
    const message = err instanceof Error ? err.message : String(err);
    console.error("stripe checkout failed", user.id, pack.id, message);
    return fail(`Could not open checkout: ${message}`, 502);
  }
}
