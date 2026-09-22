import { CREDIT_PACKS, type CreditPack } from "@/lib/config";

/**
 * Gumroad, our merchant of record.
 *
 * How a purchase flows:
 *   1. /api/gumroad/checkout sends the signed-in customer to the Gumroad product
 *      page, with their Cutframe user id on the URL (`?cutframe_user=...`).
 *   2. They pay on Gumroad.
 *   3. Gumroad POSTs a "Ping" to /api/gumroad/webhook, echoing that URL
 *      parameter back as url_params[cutframe_user].
 *   4. We do NOT trust the Ping. Anyone can POST a form to a public URL. We take
 *      only the sale id from it and ask Gumroad's own API, with our access
 *      token, whether that sale is real, paid, not refunded, and for which
 *      product. Credits come from our pack table, never from the request.
 *   5. grant_purchase() credits it once; the unique payment_ref makes a repeat
 *      Ping for the same sale a no-op.
 *
 * Server-only. GUMROAD_ACCESS_TOKEN can read every sale on the account.
 */

export const USER_PARAM = "cutframe_user";
/** Overridable only so the webhook test can point it at a fake Gumroad. */
const API = process.env.GUMROAD_API_BASE || "https://api.gumroad.com/v2";

export function isConfigured(): boolean {
  return !!process.env.GUMROAD_ACCESS_TOKEN;
}

/** Normalises a permalink, short URL or product id to a bare lowercase code. */
export function normaliseCode(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().replace(/[?#].*$/, "").replace(/\/+$/, "");
  const last = trimmed.split("/").pop() ?? "";
  return last.toLowerCase();
}

/**
 * The configured Gumroad codes for a pack. GUMROAD_PRODUCT_STARTER etc. hold
 * the product's permalink (the bit after /l/ in its link). A comma-separated
 * list is allowed, so a custom permalink and the original short code can both
 * be listed and either one matches.
 */
export function codesFor(packId: string, env: Record<string, string | undefined> = process.env): string[] {
  const raw = env[`GUMROAD_PRODUCT_${packId.toUpperCase()}`] ?? "";
  return raw.split(",").map(normaliseCode).filter(Boolean);
}

/** The link a customer is sent to for a pack, or undefined if not configured. */
export function checkoutUrlFor(
  packId: string,
  userId: string,
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const code = codesFor(packId, env)[0];
  if (!code) return undefined;
  const url = new URL(`https://gumroad.com/l/${encodeURIComponent(code)}`);
  url.searchParams.set(USER_PARAM, userId);
  // Skips the product page and opens the payment step straight away.
  url.searchParams.set("wanted", "true");
  return url.toString();
}

/* ---------------------------------------------------------------- ping */

export type Ping = {
  saleId?: string;
  userId?: string;
  test: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads the fields we use out of Gumroad's form-encoded Ping.
 *
 * url_params arrives as `url_params[cutframe_user]=...`. It is also accepted
 * as a JSON string, in case Gumroad ever sends it that way. A user id that
 * isn't a UUID is dropped rather than passed on to the database.
 */
export function parsePing(form: URLSearchParams): Ping {
  let userId = form.get(`url_params[${USER_PARAM}]`) ?? undefined;

  if (!userId) {
    const raw = form.get("url_params");
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        if (typeof parsed?.[USER_PARAM] === "string") userId = parsed[USER_PARAM] as string;
      } catch {
        /* not JSON — ignore */
      }
    }
  }

  userId = userId?.trim();
  if (userId && !UUID.test(userId)) userId = undefined;

  const saleId = form.get("sale_id")?.trim() || undefined;
  const test = form.get("test") === "true";

  return { saleId, userId, test };
}

/* ---------------------------------------------------------------- sales */

/** The fields of Gumroad's sale object we rely on. Everything is optional: trust nothing. */
export type Sale = {
  id?: string;
  email?: string;
  purchase_email?: string;
  price?: number;
  quantity?: number;
  product_id?: string;
  product_permalink?: string;
  permalink?: string;
  custom_permalink?: string;
  short_product_id?: string;
  product_name?: string;
  paid?: boolean;
  refunded?: boolean;
  partially_refunded?: boolean;
  chargedback?: boolean;
  disputed?: boolean;
};

export type SaleLookup =
  | { ok: true; sale: Sale }
  | { ok: false; notFound: boolean; reason: string };

/** Asks Gumroad directly whether a sale exists. This is the trust anchor. */
export async function fetchSale(saleId: string, token: string): Promise<SaleLookup> {
  let res: Response;
  try {
    res = await fetch(`${API}/sales/${encodeURIComponent(saleId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch (err) {
    return { ok: false, notFound: false, reason: `network: ${String(err)}` };
  }

  const body = (await res.json().catch(() => null)) as
    | { success?: boolean; sale?: Sale; message?: string }
    | null;

  // A rejected token is our mistake, not a forged sale. Saying so plainly — and
  // answering 500 so Gumroad retries once it's fixed — beats silently refusing.
  if (res.status === 401 || res.status === 403) {
    return { ok: false, notFound: false, reason: `GUMROAD TOKEN REJECTED (HTTP ${res.status}) — check GUMROAD_ACCESS_TOKEN` };
  }
  if (res.status === 404 || (body && body.success === false && res.status < 500)) {
    return { ok: false, notFound: true, reason: body?.message ?? `HTTP ${res.status}` };
  }
  if (!res.ok || !body?.sale) {
    return { ok: false, notFound: false, reason: body?.message ?? `HTTP ${res.status}` };
  }
  return { ok: true, sale: body.sale };
}

export type ProductLookup =
  | { ok: true; codes: string[] }
  | { ok: false; reason: string };

/**
 * The permalinks a product answers to.
 *
 * Needed because a sale only carries the product's random short code
 * (product_permalink = Gumroad's unique_permalink), while the product's own
 * record gives its short_url, which uses the custom permalink when one is set
 * — "cutframe-starter" rather than "xkqpz". Without this, a product with a
 * custom permalink never matches its sale.
 */
export async function fetchProductCodes(productId: string, token: string): Promise<ProductLookup> {
  let res: Response;
  try {
    res = await fetch(`${API}/products/${encodeURIComponent(productId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch (err) {
    return { ok: false, reason: `network: ${String(err)}` };
  }
  const body = (await res.json().catch(() => null)) as
    | { product?: { custom_permalink?: string; short_url?: string; id?: string } }
    | null;
  if (!res.ok || !body?.product) return { ok: false, reason: `HTTP ${res.status}` };
  const p = body.product;
  return { ok: true, codes: [p.custom_permalink, p.short_url].map(normaliseCode).filter(Boolean) };
}

/** Which of our packs a sale was for, by product, or undefined. */
export function packForSale(
  sale: Sale,
  env: Record<string, string | undefined> = process.env,
  extraCodes: string[] = [],
): CreditPack | undefined {
  const saleCodes = [
    sale.product_permalink,
    sale.permalink,
    sale.custom_permalink,
    sale.short_product_id,
    sale.product_id,
    ...extraCodes,
  ]
    .map(normaliseCode)
    .filter(Boolean);

  return CREDIT_PACKS.find((pack) => codesFor(pack.id, env).some((c) => saleCodes.includes(c)));
}

/**
 * Whether a sale should be credited, and if not, why.
 *
 * The price must be at least the pack's list price, so a product that was
 * accidentally set to $0 — or a 100%-off code — can't hand out 3,000 images.
 */
export function judgeSale(
  sale: Sale,
  saleId: string,
  env: Record<string, string | undefined> = process.env,
  extraCodes: string[] = [],
): { ok: true; pack: CreditPack; credits: number } | { ok: false; reason: string } {
  if (sale.id !== saleId) return { ok: false, reason: "sale id mismatch" };
  if (sale.paid === false) return { ok: false, reason: "not paid" };
  if (sale.refunded || sale.partially_refunded) return { ok: false, reason: "refunded" };
  if (sale.chargedback || sale.disputed) return { ok: false, reason: "disputed" };

  const pack = packForSale(sale, env, extraCodes);
  if (!pack) return { ok: false, reason: "product is not a Cutframe pack" };

  // Someone who buys two Starter packs in one go gets 800 images, and pays for them.
  const quantity = Math.max(1, Math.floor(Number(sale.quantity ?? 1)) || 1);
  const price = Number(sale.price);
  const minimum = pack.priceUsd * 100 * quantity;
  if (!Number.isFinite(price) || price < minimum) {
    return { ok: false, reason: `price ${sale.price} below ${minimum}` };
  }

  return { ok: true, pack, credits: pack.credits * quantity };
}
