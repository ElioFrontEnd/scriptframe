import { fail } from "@/lib/api";

/**
 * The one checkout URL the browser knows about.
 *
 * Which payment provider is behind it is a server-side decision, so switching
 * from Stripe to Paddle — or back, if a Paddle application ever fell through —
 * is one environment variable and a redeploy, with nothing shipped to the
 * browser and nothing to get out of step.
 *
 * Defaults to Paddle, because Stripe cannot be verified for this business and
 * a default that silently can't take money is the worse failure.
 */
export async function POST(request: Request) {
  const provider = (process.env.PAYMENT_PROVIDER ?? "paddle").toLowerCase();

  const handler =
    provider === "stripe"
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
