/**
 * Turns whatever a provider threw into something a customer can read.
 *
 * Errors from Gemini and fal arrive as raw JSON — model names, HTTP codes,
 * internal advice about updating our code. Putting that on the screen tells the
 * customer nothing they can act on and makes the product look unfinished, which
 * is exactly the wrong impression at the moment something has already gone
 * wrong. The detail still matters to us, so callers log the original and store
 * only this.
 *
 * Nothing here should ever contain a key, a URL, or a model name.
 */

const PATTERNS: Array<{ match: RegExp; message: string }> = [
  {
    // A model was retired underneath us. Ours to fix, not theirs.
    match: /no longer available|NOT_FOUND|models\/|is not found|does not have access/i,
    message:
      "One of the AI services we use changed underneath us. This is our problem, not yours — email support and we'll fix it quickly",
  },
  {
    match: /rate.?limit|RESOURCE_EXHAUSTED|429|quota/i,
    message:
      "The image service is busy right now. Wait a minute and try again — nothing was charged",
  },
  {
    match: /safety|filtered|blocked|content policy/i,
    message:
      "The safety checker refused part of this script. Try rewording the sections about violence or real people",
  },
  {
    match: /timeout|ETIMEDOUT|ECONNRESET|socket hang up|fetch failed|network/i,
    message:
      "The connection to the image service dropped. Try again — nothing was charged for frames that didn't arrive",
  },
  {
    match: /5\d\d|INTERNAL|UNAVAILABLE|service unavailable/i,
    message:
      "The image service is having trouble at its end. Try again shortly — nothing was charged",
  },
];

const FALLBACK =
  "Something went wrong on our side. Nothing was charged for what didn't arrive — try again, and email support if it keeps happening";

/** A short, honest sentence about what went wrong, safe to show anyone. */
export function toUserMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");

  for (const { match, message } of PATTERNS) {
    if (match.test(raw)) return message;
  }

  // An error we wrote ourselves is already written for a person: short, no
  // punctuation soup, no JSON. Anything else is a provider's and gets hidden.
  const looksLikeOurs =
    // Long enough to actually say something. A one-word error is ours in
    // origin but useless to read, so it falls back to the sentence that at
    // least tells the customer what happened to their money.
    raw.length >= 12 &&
    raw.length < 120 &&
    !raw.includes("{") &&
    !raw.includes("http") &&
    !/\d{3}/.test(raw);

  return looksLikeOurs ? raw : FALLBACK;
}
