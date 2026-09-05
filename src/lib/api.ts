import { NextResponse } from "next/server";
import { getUser } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Establishes the caller, then hands back a service-role client.
 *
 * Route handlers must go through this rather than trusting a user id from the
 * request body — the admin client bypasses RLS, so an unauthenticated caller
 * reaching it would be able to spend someone else's credits.
 */
export async function requireUser() {
  const user = await getUser();
  if (!user) return { error: fail("Not signed in", 401) as NextResponse };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, credits, is_blocked")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: fail("Profile not found", 401) as NextResponse };
  if (profile.is_blocked) return { error: fail("Account suspended", 403) as NextResponse };

  return { user, profile, admin };
}

/** Loads a job and confirms it belongs to the caller. */
export async function requireOwnedJob(
  admin: ReturnType<typeof createAdminClient>,
  jobId: string,
  userId: string,
) {
  const { data: job } = await admin
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (!job) return { error: fail("Job not found", 404) as NextResponse };
  if (job.user_id !== userId) return { error: fail("Job not found", 404) as NextResponse };

  return { job };
}
