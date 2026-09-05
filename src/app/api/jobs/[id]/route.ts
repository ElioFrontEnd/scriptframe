import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, requireOwnedJob, fail } from "@/lib/api";
import { loadJobPayload } from "@/lib/jobPayload";

type Params = { params: Promise<{ id: string }> };

/** Job status, prompts, and signed URLs for whatever has finished so far. */
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user, profile, admin } = auth;

  const { id } = await params;
  const owned = await requireOwnedJob(admin, id, user.id);
  if (owned.error) return owned.error;

  const payload = await loadJobPayload(admin, id, profile.credits);
  if (!payload) return fail("Job not found", 404);

  return NextResponse.json(payload);
}

const Patch = z.object({
  imageId: z.string().uuid(),
  prompt: z.string().trim().min(5).max(2000),
});

/** Edits a single prompt. Only allowed before the job starts. */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user, admin } = auth;

  const { id } = await params;
  const owned = await requireOwnedJob(admin, id, user.id);
  if (owned.error) return owned.error;

  if (owned.job.status !== "prompts_ready") {
    return fail("Prompts can only be edited before generation starts", 409);
  }

  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid request");

  const { error } = await admin
    .from("job_images")
    .update({ prompt: parsed.data.prompt })
    .eq("id", parsed.data.imageId)
    .eq("job_id", id);

  if (error) return fail("Could not save the prompt", 500);

  return NextResponse.json({ ok: true });
}

/** Deletes a draft or finished project. */
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user, admin } = auth;

  const { id } = await params;
  const owned = await requireOwnedJob(admin, id, user.id);
  if (owned.error) return owned.error;

  if (owned.job.status === "running") {
    return fail("Wait for this project to finish before deleting it", 409);
  }

  await admin.from("jobs").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
