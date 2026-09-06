/**
 * Checks the sign-in helpers.
 *
 *   npx tsx scripts/check-auth.ts
 *
 * Two things here can hurt someone. `safeNext` is what stops a Cutframe-branded
 * sign-in link from depositing the user on somebody else's site afterwards, and
 * `withLifetime` is the whole of "keep me signed in" — get it backwards and a
 * session stays alive on a library computer.
 */
import {
  safeNext,
  withLifetime,
  wantsRemembering,
} from "../src/lib/authCookies";

let failed = 0;

function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) {
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`);
  }
}

console.log("safeNext only ever returns a path inside Cutframe");
check("a normal path passes through", safeNext("/app/billing"), "/app/billing");
check("a path with a query passes through", safeNext("/app/billing?pack=creator"), "/app/billing?pack=creator");
check("an absolute URL is refused", safeNext("https://evil.example/steal"), "/app");
check("a protocol-relative URL is refused", safeNext("//evil.example"), "/app");
check("a backslash trick is refused", safeNext("/\\evil.example"), "/app");
check("javascript: is refused", safeNext("javascript:alert(1)"), "/app");
check("empty falls back", safeNext(""), "/app");
check("null falls back", safeNext(null), "/app");
check("undefined falls back", safeNext(undefined), "/app");
check("the fallback is configurable", safeNext(null, "/app/new"), "/app/new");

console.log("\nwantsRemembering defaults to staying signed in");
check("no cookie means remember", wantsRemembering(undefined), true);
check('"1" means remember', wantsRemembering("1"), true);
check('"0" means do not remember', wantsRemembering("0"), false);
check("anything else means remember", wantsRemembering("yes"), true);

console.log("\nwithLifetime turns the session cookie into a browser-session cookie");
const persistent = { maxAge: 34560000, expires: new Date(0), path: "/", sameSite: "lax" as const };
check(
  "remembering leaves the options untouched",
  withLifetime(persistent, true),
  persistent,
);
check(
  "not remembering drops maxAge and expires but keeps the rest",
  withLifetime(persistent, false),
  { path: "/", sameSite: "lax" },
);
check("undefined options are safe", withLifetime(undefined, false), {});
check("undefined options are safe when remembering", withLifetime(undefined, true), {});

// The original must not be mutated: the same options object is handed to us
// once per cookie in a batch, and quietly emptying it would strip the lifetime
// from cookies that should have kept it.
const original = { maxAge: 100, path: "/" };
withLifetime(original, false);
check("the caller's options object is not mutated", original, { maxAge: 100, path: "/" });

console.log();
if (failed === 0) {
  console.log("All auth checks passed.");
} else {
  console.log(`${failed} auth check(s) failed.`);
  process.exit(1);
}
