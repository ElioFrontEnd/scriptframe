import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** User-scoped client for server components and route handlers. RLS applies. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component; middleware refreshes the session.
          }
        },
      },
    },
  );
}

/** Returns the signed-in user, or null. */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * For pages under /app. Redirects out if there is no session.
 *
 * Every such page must call this itself rather than leaning on the layout:
 * layouts and pages render concurrently in the App Router, so a page reading
 * `user.id` would throw on a signed-out request before the layout's redirect
 * ever took effect.
 */
export async function requireUserPage() {
  const user = await getUser();
  if (!user) redirect("/");
  return user;
}

/** The signed-in user plus their profile row, for pages that show credits. */
export async function getUserWithProfile() {
  const user = await requireUserPage();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("credits")
    .eq("id", user.id)
    .single();

  return { user, credits: profile?.credits ?? 0 };
}
