import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchSale, judgeSale, parsePing } from "@/lib/gumroad";

/**
 * Gumroad's "Ping" lands here after every sale.
 *
 * The Ping itself is unsigned, so it is treated as a rumour: we read the sale
 * id out of it and ask Gumroad's API whether that sale is real. A forged Ping
 * names a sale that doesn't exist and credits nothing. A replayed Ping names a
 * sale already credited and the unique payment_ref turns it into a no-op.
 *
 * Status codes matter: a 500 makes Gumroad try again later, so it is only used
 * when trying again could help (Gumroad or our database briefly down). Anything
 * that retrying can't fix gets a 200 and a log line to find it by.
 */
export async function POST(request: Request) {
  const token = process.env.GUMROAD_ACCESS_TOKEN;
  if (!token) {
    console.error("GUMROAD_ACCESS_TOKEN is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const form = new URLSearchParams(await request.text());
  const ping = parsePing(form);

  if (!ping.saleId) return NextResponse.json({ error: "no sale_id" }, { status: 400 });

  if (ping.test) {
    // Gumroad's free "test purchase" by the seller. Not money; never credited.
    console.log("gumroad test ping ignored", ping.saleId);
    return NextResponse.json({ received: true, test: true });
  }

  const lookup = await fetchSale(ping.saleId, token);
  if (!lookup.ok) {
    if (lookup.notFound) {
      console.warn("gumroad ping for a sale Gumroad doesn't know", ping.saleId, lookup.reason);
      return NextResponse.json({ error: "unknown sale" }, { status: 400 });
    }
    console.error("gumroad sale lookup failed", ping.saleId, lookup.reason);
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }

  const sale = lookup.sale;
  const verdict = judgeSale(sale, ping.saleId);
  if (!verdict.ok) {
    console.error("GUMROAD SALE NOT CREDITED", ping.saleId, verdict.reason, sale.email ?? "");
    return NextResponse.json({ received: true, credited: false });
  }

  const admin = createAdminClient();

  // Whose account: the user id we put on the link, if that account exists;
  // otherwise the account with the email they paid with (someone who bought
  // straight from the Gumroad page). The email comes from Gumroad's API, not
  // from the Ping, so it can't be forged.
  let userId: string | undefined;
  if (ping.userId) {
    const { data, error } = await admin.from("profiles").select("id").eq("id", ping.userId).maybeSingle();
    if (error) {
      console.error("profile lookup failed", error.message);
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
    userId = data?.id;
  }
  const email = (sale.email ?? sale.purchase_email ?? "").trim().toLowerCase();
  if (!userId && email) {
    const { data, error } = await admin.from("profiles").select("id").eq("email", email).limit(1);
    if (error) {
      console.error("profile lookup by email failed", error.message);
      return NextResponse.json({ error: "db" }, { status: 500 });
    }
    userId = data?.[0]?.id;
  }

  if (!userId) {
    console.error("GUMROAD SALE UNATTRIBUTED — add by hand", ping.saleId, email, verdict.pack.id);
    return NextResponse.json({ received: true, credited: false });
  }

  const { error } = await admin.rpc("grant_purchase", {
    p_user: userId,
    p_credits: verdict.credits,
    p_session: `gum_${ping.saleId}`,
  });

  if (error) {
    console.error("grant_purchase failed", ping.saleId, error.message);
    return NextResponse.json({ error: "Could not credit the account" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
