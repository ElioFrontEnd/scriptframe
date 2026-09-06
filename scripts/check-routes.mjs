/**
 * Checks that nothing which spends money or touches data is reachable without
 * a session, and that the cron endpoint refuses a wrong secret.
 *
 *   node scripts/check-routes.mjs [baseUrl]
 *
 * Run this against production after any change to routing or auth. The fal key
 * is billed to us, so "can a stranger make this generate an image" is the
 * question worth re-answering regularly.
 */
const BASE = process.argv[2] ?? "http://localhost:3000";
const UUID = "11111111-1111-1111-1111-111111111111";

const CASES = [
  { name: "create job",        method: "POST",   path: "/api/jobs",                                   expect: [401] },
  { name: "read job",          method: "GET",    path: `/api/jobs/${UUID}`,                           expect: [401] },
  { name: "edit prompt",       method: "PATCH",  path: `/api/jobs/${UUID}`,                           expect: [401] },
  { name: "delete job",        method: "DELETE", path: `/api/jobs/${UUID}`,                           expect: [401] },
  { name: "start generation",  method: "POST",   path: `/api/jobs/${UUID}/start`,                     expect: [401] },
  { name: "tick generation",   method: "POST",   path: `/api/jobs/${UUID}/tick`,                      expect: [401] },
  { name: "download zip",      method: "GET",    path: `/api/jobs/${UUID}/zip`,                       expect: [401] },
  { name: "regenerate frame",  method: "POST",   path: `/api/jobs/${UUID}/images/${UUID}/regenerate`, expect: [401] },
  { name: "list styles",       method: "GET",    path: "/api/styles",                                 expect: [401] },
  { name: "analyse reference",  method: "POST",   path: "/api/styles",                                 expect: [401] },
  { name: "edit style",        method: "PATCH",  path: `/api/styles/${UUID}`,                         expect: [401] },
  { name: "delete style",      method: "DELETE", path: `/api/styles/${UUID}`,                         expect: [401] },
  { name: "stripe checkout",   method: "POST",   path: "/api/stripe/checkout",                        expect: [401] },
  { name: "stripe webhook",    method: "POST",   path: "/api/stripe/webhook",                         expect: [400, 500] },
  { name: "cron, no secret",   method: "GET",    path: "/api/cron/sweep",                             expect: [401] },
  {
    name: "cron, wrong secret",
    method: "GET",
    path: "/api/cron/sweep",
    headers: { authorization: "Bearer definitely-not-the-secret" },
    expect: [401],
  },
  { name: "signed-in page redirects", method: "GET", path: "/app", expect: [307, 302], redirect: "manual" },
  { name: "dev preview is not public", method: "GET", path: "/dev/preview", expect: [404] },
];

let failures = 0;

for (const c of CASES) {
  let status = 0;
  try {
    const res = await fetch(`${BASE}${c.path}`, {
      method: c.method,
      headers: { "content-type": "application/json", ...(c.headers ?? {}) },
      body: ["POST", "PATCH"].includes(c.method) ? "{}" : undefined,
      redirect: c.redirect ?? "follow",
    });
    status = res.status;
  } catch (err) {
    console.log(`  ERROR ${c.name}: ${err.message}`);
    failures++;
    continue;
  }

  const ok = c.expect.includes(status);
  if (!ok) failures++;
  console.log(
    `  ${ok ? "ok  " : "FAIL"} ${c.name.padEnd(26)} ${c.method.padEnd(6)} -> ${status} (want ${c.expect.join(" or ")})`,
  );
}

console.log(
  failures === 0
    ? "\nAll route guards hold."
    : `\n${failures} guard(s) failed — do not deploy.`,
);
process.exit(failures === 0 ? 0 : 1);
