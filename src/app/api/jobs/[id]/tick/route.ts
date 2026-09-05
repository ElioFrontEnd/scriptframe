import { NextResponse } from "next/server";
import { requireUser, requireOwnedJob } from "@/lib/api";
import { processJobTick } from "@/lib/runner";

export const maxDuration = 120;

type Params = { params: Promise<{ id: string }> };

/**
 * Generates the next batch for a running job.
 *
 * The browser calls this in a loop so the user gets live progress, but the job
 * does not depend on the browser: the cron sweep finishes anything left behind
 * when someone closes the tab mid-run.
 */
export async function POST(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user, admin } = auth;

  const { id } = await params;
  const owned = await requireOwnedJob(admin, id, user.id);
  if (owned.error) return owned.error;

  const result = await processJobTick(admin, id);

  const { count: done } = await admin
    .from("job_images")
    .select("id", { count: "exact", head: true })
    .eq("job_id", id)
    .eq("status", "done");

  return NextResponse.json({ ...result, done: result.done, completed: done ?? 0 });
}
