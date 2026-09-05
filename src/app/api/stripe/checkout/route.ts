import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireUser, fail } from "@/lib/api";
import { getPack } from "@/lib/config";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user } = auth;

  const { packId } = (await request.json().catch(() => ({}))) as { packId?: string };
  const pack = packId ? getPack(packId) : undefined;
  if (!pack) return fail("Unknown credit pack");

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return fail("Payments are not configured", 500);

  const stripe = new Stripe(key);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: pack.priceUsd * 100,
          product_data: {
            name: `${pack.name} — ${pack.credits.toLocaleString()} images`,
            description: `Enough for ${pack.videos}.`,
          },
        },
      },
    ],
    // The webhook trusts these, not anything the browser sends back.
    metadata: { userId: user.id, packId: pack.id, credits: String(pack.credits) },
    success_url: `${site}/app/billing?paid=1`,
    cancel_url: `${site}/app/billing`,
  });

  return NextResponse.json({ url: session.url });
}
