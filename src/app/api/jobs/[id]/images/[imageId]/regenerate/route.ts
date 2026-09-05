import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireOwnedJob, fail } from "@/lib/api";
import { generateImage } from "@/lib/fal";
import { putImage, imageKey, signedImageUrl } from "@/lib/storage";
import { CREDITS_PER_IMAGE } from "@/lib/config";

export const maxDuration = 120;

type Params = { params: Promise<{ id: string; imageId: string }> };

const Body = z.object({
  /** Optional replacement prompt. Omit to retry the existing one. */
  prompt: z.string().trim().min(5).max(2000).optional(),
});

/**
 * Regenerates a single frame, optionally with a rewritten prompt.
 *
 * The frame that came out wrong is the common case in real use — a misread
 * beat, a mangled face — and without this the only remedy is regenerating the
 * whole set and paying for it twice.
 *
 * Order matters here: generate first, and only overwrite storage once the new
 * image is in hand. A failed regeneration therefore leaves the previous frame
 * exactly as it was, and the credit is returned.
 */
export async function POST(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user, admin } = auth;

  const { id, imageId } = await params;
  const owned = await requireOwnedJob(admin, id, user.id);
  if (owned.error) return owned.error;

  if (!["completed", "failed"].includes(owned.job.status)) {
    return fail("Wait for this project to finish before regenerating", 409);
  }

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail("Invalid prompt");

  const { data: image } = await admin
    .from("job_images")
    .select("id, idx, prompt, status, storage_key")
    .eq("id", imageId)
    .eq("job_id", id)
    .single();

  if (!image) return fail("Frame not found", 404);

  const prompt = parsed.data.prompt ?? image.prompt;

  const { data: paid, error: spendError } = await admin.rpc("spend_credits", {
    p_user: user.id,
    p_amount: CREDITS_PER_IMAGE,
    p_job: id,
  });
  if (spendError) return fail("Could not process credits", 500);
  if (!paid) {
    return NextResponse.json(
      { error: "Not enough credits", needed: CREDITS_PER_IMAGE },
      { status: 402 },
    );
  }

  try {
    const generated = await generateImage(prompt);
    const key = image.storage_key ?? imageKey(id, image.idx);
    await putImage(key, generated.bytes, generated.contentType);

    await admin
      .from("job_images")
      .update({ prompt, status: "done", storage_key: key, error: null })
      .eq("id", imageId);

    // If that was the last broken frame, drop the job's "n images failed"
    // notice — leaving it up would keep telling the user about a problem they
    // have just fixed.
    const { count: stillFailed } = await admin
      .from("job_images")
      .select("id", { count: "exact", head: true })
      .eq("job_id", id)
      .eq("status", "failed");

    if ((stillFailed ?? 0) === 0 && owned.job.error) {
      await admin
        .from("jobs")
        .update({ error: null, status: "completed" })
        .eq("id", id);
    }

    return NextResponse.json({
      ok: true,
      // Cache-busted so the browser shows the new frame rather than the old one
      // it already has for this URL.
      url: `${await signedImageUrl(key)}#${Date.now()}`,
      prompt,
    });
  } catch (err) {
    await admin.rpc("refund_credits", {
      p_user: user.id,
      p_amount: CREDITS_PER_IMAGE,
      p_job: id,
    });

    const message = err instanceof Error ? err.message : String(err);
    return fail(`Could not regenerate that frame: ${message}`, 502);
  }
}
