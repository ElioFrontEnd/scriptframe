import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, fail } from "@/lib/api";
import { deleteImage } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

const Patch = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  block: z.string().trim().min(20).max(2000).optional(),
  guidance: z.string().trim().max(500).optional(),
});

/** Edits a saved style. The block is the product, so it stays editable. */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user, admin } = auth;

  const { id } = await params;
  const parsed = Patch.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Invalid style");

  const { data, error } = await admin
    .from("custom_styles")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, name, block, guidance, swatch, texture")
    .maybeSingle();

  if (error) return fail("Could not save the style", 500);
  if (!data) return fail("Style not found", 404);

  return NextResponse.json({ style: data });
}

/**
 * Deletes a saved style. Jobs made with it are unaffected — each one carries
 * its own snapshot of the style it was generated with.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user, admin } = auth;

  const { id } = await params;

  const { data } = await admin
    .from("custom_styles")
    .select("reference_key")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return fail("Style not found", 404);

  await admin.from("custom_styles").delete().eq("id", id).eq("user_id", user.id);
  if (data.reference_key) await deleteImage(data.reference_key);

  return NextResponse.json({ ok: true });
}
