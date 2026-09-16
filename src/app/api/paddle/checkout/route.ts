import { NextResponse } from "next/server";
import { requireUser, fail } from "@/lib/api";
import { getPack } from "@/lib/config";
import { createTransaction, isConfigured, priceIdFor } from "@/lib/paddle";

/**
 * Opens a Paddle checkout for one credit pack.
 *
 * The browser sends a pack id and nothing else. What it costs is decided here
 * from our own table and Paddle's catalogue, so a request asking for the Studio
 * pack at $0 gets the Studio pack at $49. Nothing here grants credits — the
 * signed webhook does that.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user } = auth;

  const { packId } = (await request.json().catch(() => ({}))) as { packId?: string };
  const pack = packId ? getPack(packId) : undefined;
  if (!pack) return fail("Unknown credit pack");

  if (!isConfigured()) return fail("Payments are not set up yet", 503);

  const priceId = priceIdFor(pack.id);
  if (!priceId) {
    console.error("no Paddle price id configured for pack", pack.id);
    return fail("That pack isn't available to buy right now", 503);
  }

  try {
    const { url } = await createTransaction({
      priceId,
      email: user.email ?? undefined,
      // Comes back verbatim on the webhook. It is the only thing that decides
      // whose balance moves, which is why it is set here and not in the browser.
      customData: {
        userId: user.id,
        packId: pack.id,
        credits: String(pack.credits),
      },
    });

    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("paddle checkout failed", user.id, pack.id, message);
    return fail(`Could not open checkout: ${message}`, 502);
  }
}
