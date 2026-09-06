import type { CookieOptions } from "@supabase/ssr";

/**
 * "Keep me signed in on this device."
 *
 * Supabase writes its session into cookies with a long lifetime, which is what
 * most people want — sign in once, stay signed in. But a shared or borrowed
 * computer is exactly the case where that is wrong, so the sign-in form offers
 * to make the session last only until the browser is closed.
 *
 * A cookie with no `maxAge` and no `expires` is a session cookie: the browser
 * throws it away when it quits. That is the whole mechanism. The choice itself
 * is remembered in a separate, non-secret cookie so that the middleware — which
 * rewrites the session cookie on nearly every request — keeps applying it
 * instead of quietly restoring the long lifetime on the next page load.
 */
export const REMEMBER_COOKIE = "cf_remember";

/** Where to go after the magic link lands. Set before the email is sent. */
export const NEXT_COOKIE = "cf_next";

/** Roughly a year — long enough that "stay signed in" means it. */
export const REMEMBER_MAX_AGE = 60 * 60 * 24 * 365;

export function wantsRemembering(value: string | undefined): boolean {
  // Defaulting to true matters: the magic link is often opened on a different
  // device from the one the form was filled in on, where this cookie cannot
  // exist. Staying signed in is the safer surprise of the two.
  return value !== "0";
}

/** Strips the lifetime from a session cookie when the user asked us not to remember them. */
export function withLifetime(
  options: CookieOptions | undefined,
  remember: boolean,
): CookieOptions {
  if (remember) return options ?? {};
  const next = { ...(options ?? {}) };
  delete next.maxAge;
  delete next.expires;
  return next;
}

/**
 * Only ever send people to a path inside Cutframe.
 *
 * `next` arrives from a query string, so without this check a link like
 * /signin?next=https://evil.example would hand someone a Cutframe-branded
 * sign-in that drops them on someone else's site afterwards.
 */
export function safeNext(value: string | null | undefined, fallback = "/app"): string {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  // "//host" and "/\host" are both read as protocol-relative by browsers, so
  // neither counts as a path of ours.
  if (value[1] === "/" || value[1] === "\\") return fallback;
  return value;
}
