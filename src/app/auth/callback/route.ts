import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  NEXT_COOKIE,
  REMEMBER_COOKIE,
  safeNext,
  withLifetime,
  wantsRemembering,
} from "@/lib/authCookies";

/**
 * Exchanges the magic-link code for a session cookie.
 *
 * Where to go next, and whether to stay signed in, were both left in cookies by
 * the sign-in form rather than carried in the emailed link — see SignInForm for
 * why. If the link is opened on a different device those cookies are absent,
 * and the defaults (the app, stay signed in) apply.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const cookieStore = await cookies();
  const next = safeNext(cookieStore.get(NEXT_COOKIE)?.value);
  const remember = wantsRemembering(cookieStore.get(REMEMBER_COOKIE)?.value);

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=link`);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, withLifetime(options, remember)),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/signin?error=link`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  // One-shot: it has done its job, and leaving it behind would send the next
  // sign-in to a stale destination.
  response.cookies.delete(NEXT_COOKIE);
  return response;
}
