/**
 * Checks the Gumroad sale checks.
 *
 *   npx tsx scripts/check-gumroad.ts
 *
 * The Ping is unsigned, so these functions — which decide whether a sale is
 * real, which pack it was and whose account it lands on — are what stand
 * between a stranger and free credits.
 */
import { checkoutUrlFor, codesFor, judgeSale, normaliseCode, packForSale, parsePing } from "../src/lib/gumroad";

let failed = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) console.log(`  ok   ${name}`);
  else {
    failed++;
    console.log(`  FAIL ${name}\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`);
  }
}

const ENV = {
  GUMROAD_PRODUCT_STARTER: "abcd",
  GUMROAD_PRODUCT_CREATOR: "cutframe-creator, wxyz",
  GUMROAD_PRODUCT_STUDIO: "https://cutframeofficial.gumroad.com/l/StUdIo/",
};
const UID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

console.log("Permalinks");
check("a bare code is kept", normaliseCode("abcd"), "abcd");
check("a full link becomes its code", normaliseCode("https://x.gumroad.com/l/AbCd?wanted=true"), "abcd");
check("a trailing slash is ignored", normaliseCode("https://gumroad.com/l/abcd/"), "abcd");
check("non-strings give nothing", normaliseCode(undefined), "");
check("a list of codes is split", codesFor("creator", ENV), ["cutframe-creator", "wxyz"]);
check("a pasted link works as config", codesFor("studio", ENV), ["studio"]);
check("an unset pack has no codes", codesFor("starter", {}), []);

console.log("\nCheckout link");
const link = checkoutUrlFor("starter", UID, ENV)!;
check("goes to the product", link.startsWith("https://gumroad.com/l/abcd?"), true);
check("carries the user id", new URL(link).searchParams.get("cutframe_user"), UID);
check("opens straight at payment", new URL(link).searchParams.get("wanted"), "true");
check("unconfigured pack has no link", checkoutUrlFor("starter", UID, {}), undefined);

console.log("\nReading the Ping");
const ping = (o: Record<string, string>) => parsePing(new URLSearchParams(o));
check("sale id and user id are read", ping({ sale_id: "s1", "url_params[cutframe_user]": UID }), { saleId: "s1", userId: UID, test: false });
check("url_params as JSON also works", ping({ sale_id: "s1", url_params: JSON.stringify({ cutframe_user: UID }) }).userId, UID);
check("a non-UUID user id is dropped", ping({ sale_id: "s1", "url_params[cutframe_user]": "x'; drop table" }).userId, undefined);
check("no user id is fine (email fallback)", ping({ sale_id: "s1" }).userId, undefined);
check("test purchases are flagged", ping({ sale_id: "s1", test: "true" }).test, true);
check("a missing sale id is noticed", ping({}).saleId, undefined);
check("a real form body parses", parsePing(new URLSearchParams(`sale_id=s9&url_params%5Bcutframe_user%5D=${UID}&price=900`)).userId, UID);

console.log("\nJudging the sale Gumroad returns");
const good = { id: "s1", price: 1900, product_permalink: "https://cutframeofficial.gumroad.com/l/wxyz", paid: true, refunded: false };
const j = (sale: object, id = "s1") => {
  const r = judgeSale(sale, id, ENV);
  return r.ok ? r.pack.id : r.reason;
};
check("a paid Creator sale is Creator", j(good), "creator");
check("the custom permalink matches too", j({ ...good, product_permalink: "cutframe-creator" }), "creator");
check("matching by short_product_id", j({ id: "s1", price: 900, short_product_id: "ABCD" }), "starter");
check("a sale id mismatch is refused", j(good, "s2"), "sale id mismatch");
check("an unpaid sale is refused", j({ ...good, paid: false }), "not paid");
check("a refunded sale is refused", j({ ...good, refunded: true }), "refunded");
check("a partial refund is refused", j({ ...good, partially_refunded: true }), "refunded");
check("a chargeback is refused", j({ ...good, chargedback: true }), "disputed");
check("some other product is refused", j({ ...good, product_permalink: "ebook" }), "product is not a Cutframe pack");
check("no product at all is refused", j({ id: "s1", price: 1900 }), "product is not a Cutframe pack");
check("a $0 sale is refused", j({ ...good, price: 0 }).startsWith("price"), true);
check("a discounted sale is refused", j({ ...good, price: 900 }).startsWith("price"), true);
check("a missing price is refused", j({ ...good, price: undefined }).startsWith("price"), true);
check("paying more (tip) is fine", j({ ...good, price: 2500 }), "creator");
const two = judgeSale({ ...good, quantity: 2, price: 3800 }, "s1", ENV);
check("two packs in one sale → double credits", two.ok ? two.credits : two.reason, 2000);
check("two packs at the price of one is refused", j({ ...good, quantity: 2, price: 1900 }).startsWith("price"), true);
check("credits come from our table", packForSale(good, ENV)?.credits, 1000);

console.log();
if (failed) {
  console.log(`${failed} Gumroad check(s) FAILED.`);
  process.exit(1);
}
console.log("All Gumroad checks passed.");
