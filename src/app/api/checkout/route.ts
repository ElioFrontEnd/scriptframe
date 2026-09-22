import { fail } from "@/lib/api";

/**
 * The one checkout URL the browser knows about.
 *
 * Which payment provider is behind it is a server-side decision, so switching
 * between Gumroad, Paddle and Stripe
 * is one environment variable and a redeploy, with nothing shipped to the
 * browser and nothing to get out of step.
 *
 * Defaults to Gumroad, the provider that actually works for a seller in
 * Albania. Stripe and Paddle are kept in case that ever changes.
 */
export async function POST(request: Request) {
  const provider = (process.env.PAYMENT_PROVIDER ?? "gumroad").toLowerCase();

  const handler =
    provider === "gumroad"
      ? (await import("../gumroad/checkout/route")).POST
      : provider === "stripe"
      ? (await import("../stripe/checkout/route")).POST
      : provider === "paddle"
        ? (await import("../paddle/checkout/route")).POST
        : null;

  if (!handler) {
    console.error("PAYMENT_PROVIDER is set to something unknown:", provider);
    return fail("Payments are not set up yet", 503);
  }

  return handler(request);
}
