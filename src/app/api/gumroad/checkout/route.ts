import { NextResponse } from "next/server";
import { requireUser, fail } from "@/lib/api";
import { getPack } from "@/lib/config";
import { checkoutUrlFor } from "@/lib/gumroad";

/**
 * Sends a signed-in customer to the Gumroad page for one pack.
 *
 * The browser sends a pack id and nothing else. The price lives on Gumroad and
 * the credits live in our pack table; the user id on the link only decides
 * whose balance a *verified* sale lands on. Nothing here grants credits.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user } = auth;

  const { packId } = (await request.json().catch(() => ({}))) as { packId?: string };
  const pack = packId ? getPack(packId) : undefined;
  if (!pack) return fail("Unknown credit pack");

  const url = checkoutUrlFor(pack.id, user.id);
  if (!url) {
    console.error("no Gumroad product configured for pack", pack.id);
    return fail("That pack isn't available to buy right now", 503);
  }

  return NextResponse.json({ url, provider: "gumroad", ref: `${pack.id}-${Date.now().toString(36)}` });
}
