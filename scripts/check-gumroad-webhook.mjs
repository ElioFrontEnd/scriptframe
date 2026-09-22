/**
 * Drives /api/gumroad/webhook end to end against a fake Gumroad and a fake
 * Supabase, through a real dev server.
 *
 *   node scripts/check-gumroad-webhook.mjs
 *
 * The question: can a Ping that Gumroad's own API doesn't vouch for ever move
 * a balance? And does a real one credit the right account, once?
 */
import { spawn } from "node:child_process";
import http from "node:http";

const PORT = 3003;
const FAKE = 3904;
const UID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const OTHER = "11111111-2222-4333-8444-555555555555";

// ---------------------------------------------------------------- fakes
const SALES = {
  real: { id: "real", price: 1900, product_permalink: "https://cutframeofficial.gumroad.com/l/crtr", email: "buyer@example.com", paid: true },
  // What Gumroad really sends: the sale has only the random short code; the
  // custom permalink lives on the product record.
  custom: { id: "custom", price: 900, product_id: "prod_ext_1", product_permalink: "xkqpz", email: "owner@example.com", paid: true },
  refunded: { id: "refunded", price: 1900, product_permalink: "crtr", paid: true, refunded: true },
  cheap: { id: "cheap", price: 100, product_permalink: "crtr", paid: true },
  ebook: { id: "ebook", price: 1900, product_permalink: "some-ebook", paid: true },
  byemail: { id: "byemail", price: 900, product_permalink: "strt", email: "Known@Example.com", paid: true },
  stranger: { id: "stranger", price: 900, product_permalink: "strt", email: "nobody@example.com", paid: true },
};
const profiles = { [UID]: { id: UID, email: "owner@example.com" }, [OTHER]: { id: OTHER, email: "known@example.com" } };
const grants = [];
const seen = new Set();
let gumroadDown = false;
let authSeen = "";

const fake = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    const send = (code, obj) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(obj));
    };
    // Gumroad
    const m = url.pathname.match(/^\/v2\/sales\/(.+)$/);
    if (m) {
      authSeen = req.headers.authorization ?? "";
      if (gumroadDown) return send(502, { success: false });
      const sale = SALES[decodeURIComponent(m[1])];
      return sale ? send(200, { success: true, sale }) : send(404, { success: false, message: "not found" });
    }
    const pm = url.pathname.match(/^\/v2\/products\/(.+)$/);
    if (pm) {
      if (gumroadDown) return send(502, { success: false });
      return pm[1] === "prod_ext_1"
        ? send(200, { success: true, product: { id: "prod_ext_1", short_url: "https://cutframeofficial.gumroad.com/l/cutframe-starter", custom_permalink: "cutframe-starter" } })
        : send(404, { success: false });
    }
    // Supabase: profiles lookups
    if (url.pathname === "/rest/v1/profiles") {
      const id = url.searchParams.get("id")?.replace(/^eq\./, "");
      const email = url.searchParams.get("email")?.replace(/^eq\./, "");
      const rows = Object.values(profiles).filter((p) => (id ? p.id === id : true) && (email ? p.email === email : true));
      const single = (req.headers.accept ?? "").includes("vnd.pgrst.object");
      if (single) return rows.length ? send(200, { id: rows[0].id }) : send(406, { code: "PGRST116", message: "0 rows" });
      return send(200, rows.map((r) => ({ id: r.id })));
    }
    if (url.pathname === "/rest/v1/rpc/grant_purchase") {
      const a = JSON.parse(body);
      if (seen.has(a.p_session)) return send(200, false);
      seen.add(a.p_session);
      grants.push(a);
      return send(200, true);
    }
    send(404, {});
  });
});
await new Promise((r) => fake.listen(FAKE, r));

// ---------------------------------------------------------------- server
const server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
  env: {
    ...process.env,
    GUMROAD_API_BASE: `http://localhost:${FAKE}/v2`,
    GUMROAD_ACCESS_TOKEN: "test-token",
    GUMROAD_PRODUCT_STARTER: "strt,cutframe-starter",
    GUMROAD_PRODUCT_CREATOR: "crtr",
    GUMROAD_PRODUCT_STUDIO: "stdo",
    NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${FAKE}`,
    SUPABASE_SERVICE_ROLE_KEY: "fake-service-role",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));

async function ping(fields) {
  const res = await fetch(`http://localhost:${PORT}/api/gumroad/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields).toString(),
  });
  return res.status;
}

for (let i = 0; i < 90; i++) {
  try {
    await ping({});
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
  }
}

let failed = 0;
function check(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`);
  if (!ok) failed++;
}
const u = (id) => ({ "url_params[cutframe_user]": id });

try {
  check("no sale id → 400", await ping({}), 400);
  check("forged sale Gumroad doesn't know → 400", await ping({ sale_id: "forged", ...u(UID) }), 400);
  check("…and nothing credited", grants.length, 0);
  check("test purchase → 200, not credited", await ping({ sale_id: "real", test: "true", ...u(UID) }), 200);
  check("…still nothing credited", grants.length, 0);

  check("real Creator sale → 200", await ping({ sale_id: "real", ...u(UID), price: "0" }), 200);
  check("…credits 1,000 (from our table, not the Ping)", grants[0]?.p_credits, 1000);
  check("…to the user on the link", grants[0]?.p_user, UID);
  check("…under a gum_ reference", grants[0]?.p_session, "gum_real");
  check("used the access token", authSeen, "Bearer test-token");

  check("same Ping again → 200", await ping({ sale_id: "real", ...u(UID) }), 200);
  check("…but not credited twice", grants.length, 1);

  check("refunded sale → 200, not credited", await ping({ sale_id: "refunded", ...u(UID) }), 200);
  check("underpriced sale → 200, not credited", await ping({ sale_id: "cheap", ...u(UID) }), 200);
  check("someone else's product → 200, not credited", await ping({ sale_id: "ebook", ...u(UID) }), 200);
  check("…none of those three credited", grants.length, 1);

  check("no user on link, email matches an account → 200", await ping({ sale_id: "byemail" }), 200);
  check("…credited to that account", grants[1]?.p_user, OTHER);
  check("…400 for Starter", grants[1]?.p_credits, 400);

  check("no user, unknown email → 200", await ping({ sale_id: "stranger" }), 200);
  check("…not credited, logged for hand-grant", [grants.length, log.includes("UNATTRIBUTED")], [2, true]);

  check("a user id that doesn't exist falls back to email", await ping({ sale_id: "stranger", ...u("99999999-2222-4333-8444-555555555555") }), 200);
  check("…still not credited", grants.length, 2);

  check("custom-permalink product (the real-world case) → 200", await ping({ sale_id: "custom", ...u(UID) }), 200);
  check("…credited as Starter via the product record", [grants.at(-1)?.p_session, grants.at(-1)?.p_credits], ["gum_custom", 400]);

  gumroadDown = true;
  check("Gumroad API down → 500 so Gumroad retries", await ping({ sale_id: "cheap", ...u(UID) }), 500);
} finally {
  server.kill("SIGTERM");
  fake.close();
}

console.log();
if (failed) {
  console.log(`${failed} webhook check(s) FAILED.`);
  console.log(log.split("\n").filter((l) => /error|warn|GUMROAD/i.test(l)).slice(-20).join("\n"));
  process.exit(1);
}
console.log("All Gumroad webhook checks passed.");
process.exit(0);
