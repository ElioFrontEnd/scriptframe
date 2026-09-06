import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { REMEMBER_COOKIE, withLifetime, wantsRemembering } from "@/lib/authCookies";

/**
 * Refreshes the Supabase session cookie on every request.
 *
 * This is also where "keep me signed in" has to be honoured a second time. The
 * refresh rewrites the session cookie with Supabase's own long lifetime, so
 * without re-applying the choice here, someone who asked not to be remembered
 * would silently become remembered on their very next page load.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const remember = wantsRemembering(request.cookies.get(REMEMBER_COOKIE)?.value);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, withLifetime(options, remember)),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg)$).*)"],
};
