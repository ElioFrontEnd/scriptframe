import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processJobTick } from "@/lib/runner";

export const maxDuration = 300;

/**
 * Finishes jobs whose browser tab went away mid-run.
 *
 * Without this, closing the tab at image 40 of 100 would leave the user charged
 * for 100 and holding 40. Wire it to a Vercel cron (see vercel.json).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: stale } = await admin
    .from("jobs")
    .select("id")
    .eq("status", "running")
    .order("started_at", { ascending: true })
    .limit(5);

  const processed: string[] = [];
  for (const job of stale ?? []) {
    // One batch per job per sweep keeps a single slow job from starving others.
    await processJobTick(admin, job.id);
    processed.push(job.id);
  }

  return NextResponse.json({ processed: processed.length });
}
