import type { createAdminClient } from "./supabase/admin";
import { generateBatch } from "./fal";
import { putImage, imageKey } from "./storage";
import { CREDITS_PER_IMAGE, LIMITS } from "./config";
import { sendJobFinishedEmail } from "./email";
import { toUserMessage } from "./userError";

type Admin = ReturnType<typeof createAdminClient>;

type ClaimedImage = {
  id: string;
  job_id: string;
  idx: number;
  prompt: string;
  attempts: number;
};

/**
 * Generates one batch of a job's images.
 *
 * Work is pulled with claim_images(), which uses SELECT ... FOR UPDATE SKIP
 * LOCKED, so the browser polling this and the cron sweep running at the same
 * time take disjoint rows instead of paying twice for the same image.
 *
 * Safe to call repeatedly; it's a no-op once the job is finished.
 */
export async function processJobTick(admin: Admin, jobId: string) {
  const { data: job } = await admin
    .from("jobs")
    .select("id, user_id, status, image_count")
    .eq("id", jobId)
    .single();

  if (!job) return { done: true, generated: 0, note: "missing" };
  if (job.status !== "running") {
    return { done: true, generated: 0, note: job.status };
  }

  const { data: claimed } = await admin.rpc("claim_images", {
    p_job: jobId,
    p_limit: LIMITS.batchSize,
  });

  const batch = (claimed ?? []) as ClaimedImage[];

  if (batch.length > 0) {
    const results = await generateBatch(
      batch.map((row) => ({ id: row.id, prompt: row.prompt, idx: row.idx })),
      LIMITS.concurrency,
    );

    await Promise.all(
      results.map(async ({ item, image, error }) => {
        if (image) {
          try {
            const key = imageKey(jobId, item.idx);
            await putImage(key, image.bytes, image.contentType);
            await admin
              .from("job_images")
              .update({ status: "done", storage_key: key, error: null })
              .eq("id", item.id);
            return;
          } catch (err) {
            const detail = err instanceof Error ? err.message : String(err);
            console.error("frame generation failed", item.id, detail);
            error = toUserMessage(err);
          }
        }

        const row = batch.find((b) => b.id === item.id);
        const exhausted = (row?.attempts ?? LIMITS.maxAttempts) >= LIMITS.maxAttempts;

        await admin
          .from("job_images")
          .update({
            // Below the attempt ceiling we drop it back to pending so the next
            // tick retries; transient fal errors are common and usually clear.
            status: exhausted ? "failed" : "pending",
            error: error ?? "Unknown error",
          })
          .eq("id", item.id);
      }),
    );
  }

  return finalizeIfComplete(admin, jobId, batch.length);
}

/** Closes out the job once nothing is left to do, refunding what never rendered. */
async function finalizeIfComplete(admin: Admin, jobId: string, generated: number) {
  const { count: outstanding } = await admin
    .from("job_images")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .in("status", ["pending", "running"]);

  if ((outstanding ?? 0) > 0) {
    return { done: false, generated };
  }

  const { data: job } = await admin
    .from("jobs")
    .select("id, user_id, status, title")
    .eq("id", jobId)
    .single();

  if (!job || job.status !== "running") return { done: true, generated };

  const { count: failed } = await admin
    .from("job_images")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId)
    .eq("status", "failed");

  const failedCount = failed ?? 0;

  // Nobody should pay for an image that never arrived.
  if (failedCount > 0) {
    await admin.rpc("refund_credits", {
      p_user: job.user_id,
      p_amount: failedCount * CREDITS_PER_IMAGE,
      p_job: jobId,
    });
  }

  // Guarded on status so only one worker can win this transition, which is
  // what stops two ticks finishing at once from sending two emails.
  const { data: closed } = await admin
    .from("jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      error: failedCount > 0 ? `${failedCount} image(s) failed and were refunded` : null,
    })
    .eq("id", jobId)
    .eq("status", "running")
    .select("id");

  if (closed?.length) {
    await notifyFinished(admin, jobId, job.user_id, job.title, failedCount);
  }

  return { done: true, generated, failed: failedCount };
}

/**
 * Tells the user their set is ready. Best effort — a job is finished whether or
 * not this succeeds, so nothing here is allowed to throw into the worker.
 */
async function notifyFinished(
  admin: Admin,
  jobId: string,
  userId: string,
  title: string,
  failedCount: number,
) {
  if (!process.env.RESEND_API_KEY) return;

  try {
    const [{ data: profile }, { count: done }] = await Promise.all([
      admin.from("profiles").select("email").eq("id", userId).single(),
      admin
        .from("job_images")
        .select("id", { count: "exact", head: true })
        .eq("job_id", jobId)
        .eq("status", "done"),
    ]);

    if (!profile?.email) return;

    await sendJobFinishedEmail({
      to: profile.email,
      jobTitle: title,
      jobId,
      done: done ?? 0,
      failed: failedCount,
    });
  } catch (err) {
    console.warn("could not send completion email", err);
  }
}
