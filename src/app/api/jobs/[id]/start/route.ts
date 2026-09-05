import { NextResponse } from "next/server";
import { requireUser, requireOwnedJob, fail } from "@/lib/api";
import { CREDITS_PER_IMAGE, LIMITS } from "@/lib/config";

type Params = { params: Promise<{ id: string }> };

/**
 * Commits the user's credits and moves the job to `running`.
 *
 * This is the only place credits are spent, it runs server-side with the
 * service role, and the deduction itself is a single atomic SQL statement
 * (spend_credits) that only succeeds when the balance actually covers the
 * amount. Two tabs hitting Start at once cannot both win.
 */
export async function POST(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user, admin } = auth;

  const { id } = await params;
  const owned = await requireOwnedJob(admin, id, user.id);
  if (owned.error) return owned.error;
  const job = owned.job;

  if (job.status === "running") {
    return NextResponse.json({ ok: true, alreadyRunning: true });
  }
  if (job.status !== "prompts_ready") {
    return fail("This project is not ready to generate", 409);
  }

  const { count: running } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("status", "running");

  if ((running ?? 0) >= LIMITS.maxConcurrentJobs) {
    return fail(
      `You can run ${LIMITS.maxConcurrentJobs} projects at once. Wait for one to finish.`,
      429,
    );
  }

  const { count: pending } = await admin
    .from("job_images")
    .select("id", { count: "exact", head: true })
    .eq("job_id", id)
    .eq("status", "pending");

  const imagesToGenerate = pending ?? 0;
  if (imagesToGenerate === 0) return fail("Nothing to generate", 409);
  if (imagesToGenerate > LIMITS.maxImagesPerJob) {
    return fail("This project is too large", 409);
  }

  const cost = imagesToGenerate * CREDITS_PER_IMAGE;

  const { data: paid, error: spendError } = await admin.rpc("spend_credits", {
    p_user: user.id,
    p_amount: cost,
    p_job: id,
  });

  if (spendError) return fail("Could not process credits", 500);
  if (!paid) {
    return NextResponse.json(
      { error: "Not enough credits", needed: cost },
      { status: 402 },
    );
  }

  const { error: updateError } = await admin
    .from("jobs")
    .update({
      status: "running",
      started_at: new Date().toISOString(),
      credits_spent: cost,
    })
    .eq("id", id)
    .eq("status", "prompts_ready");

  if (updateError) {
    // Give the money back rather than leave them charged for nothing.
    await admin.rpc("refund_credits", { p_user: user.id, p_amount: cost, p_job: id });
    return fail("Could not start the project", 500);
  }

  return NextResponse.json({ ok: true, creditsSpent: cost });
}
