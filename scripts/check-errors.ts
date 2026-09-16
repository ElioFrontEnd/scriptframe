/**
 * Checks that provider errors never reach a customer verbatim.
 *
 *   npx tsx scripts/check-errors.ts
 *
 * The rule being enforced: whatever a provider throws, what the customer reads
 * is a sentence about their situation with no JSON, no model names, no HTTP
 * codes and no URLs in it. A real one from production is the first case.
 */
import { toUserMessage } from "../src/lib/userError";

let failed = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) console.log(`  ok   ${name}`);
  else {
    failed++;
    console.log(`  FAIL ${name}\n         got  ${JSON.stringify(got)}\n         want ${JSON.stringify(want)}`);
  }
}

/** Nothing a customer sees may leak our plumbing. */
function isClean(msg: string): boolean {
  return (
    !msg.includes("{") &&
    !msg.includes("}") &&
    !msg.includes("http") &&
    !/models\//.test(msg) &&
    !/\b\d{3}\b/.test(msg) &&
    msg.length < 200
  );
}

const REAL_ONE =
  'Could not write prompts for one section: {"error":{"code":404,"message":"This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.6-flash for the latest features and improvements. We recommend you to use the Interactions API.","status":"NOT_FOUND"}}';

console.log("Provider errors are never shown raw");
for (const [name, input] of [
  ["the real Gemini retirement error from production", REAL_ONE],
  ["a rate limit", '{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}'],
  ["a safety refusal", "fal returned no image (it may have been filtered)"],
  ["a dropped connection", "fetch failed: ECONNRESET"],
  ["a provider 500", '{"error":{"code":503,"message":"UNAVAILABLE"}}'],
  ["an empty error", ""],
  ["a raw object", {} as unknown],
  ["null", null],
  ["a stack trace", "TypeError: Cannot read properties of undefined (reading 'id')\n    at /var/task/.next/server/chunks/123.js:4:5678"],
] as Array<[string, unknown]>) {
  const msg = toUserMessage(input);
  check(`${name} → readable`, isClean(msg), true);
}

console.log("\nThe right message for the right failure");
check("a retired model blames us, not the customer",
  toUserMessage(REAL_ONE).includes("our problem, not yours"), true);
check("a rate limit says to wait",
  toUserMessage('{"code":429,"status":"RESOURCE_EXHAUSTED"}').includes("busy right now"), true);
check("a safety refusal says what to change",
  toUserMessage("blocked by the safety checker").includes("rewording"), true);
check("every message mentions money or a next step",
  ["", "x", REAL_ONE].every((e) => /charged|support|try again|wait|rewording/i.test(toUserMessage(e))), true);

console.log("\nOur own messages survive intact");
check("a short plain message is kept",
  toUserMessage(new Error("That style isn't available")), "That style isn't available");
check("a message with a number is not kept",
  toUserMessage(new Error("Job 404 broke")).startsWith("Something went wrong"), true);
check("a message with JSON is not kept",
  toUserMessage(new Error('bad {"x":1}')).startsWith("Something went wrong"), true);

console.log();
if (failed === 0) console.log("All error-message checks passed.");
else { console.log(`${failed} error-message check(s) failed.`); process.exit(1); }
