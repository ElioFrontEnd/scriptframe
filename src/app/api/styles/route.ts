import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, fail } from "@/lib/api";
import { analyseReference } from "@/lib/styleAnalysis";
import { putImage, referenceKey, signedImageUrls } from "@/lib/storage";
import { LIMITS } from "@/lib/config";

export const maxDuration = 60;

/** Roughly 4MB of base64 — the client downscales before sending, so this is a
 *  backstop rather than the normal path. */
const MAX_BASE64 = 5_600_000;

const Body = z.object({
  /** Base64 without the data: prefix. */
  image: z.string().min(100).max(MAX_BASE64),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

/** The styles this user has made from their own references. */
export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user, admin } = auth;

  const { data: styles } = await admin
    .from("custom_styles")
    .select("id, name, block, guidance, swatch, texture, reference_key, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = styles ?? [];
  const urls = await signedImageUrls(
    rows.map((s) => s.reference_key).filter((k): k is string => !!k),
  );

  return NextResponse.json({
    styles: rows.map((s) => ({
      ...s,
      referenceUrl: s.reference_key ? (urls[s.reference_key] ?? null) : null,
    })),
  });
}

/**
 * Analyses a reference image and saves the resulting style.
 *
 * The image is described once by a vision model and then never used again —
 * it is kept only so the user can see what a style came from. Everything
 * downstream works from the text block, which is why adding this costs
 * fractions of a cent and leaves the price per frame untouched.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user, admin } = auth;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail("That image couldn't be read. Use a JPEG, PNG or WebP under 5MB.");
  }

  // Cheap, but not free, and it writes a row each time.
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count: recent } = await admin
    .from("custom_styles")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", hourAgo);

  if ((recent ?? 0) >= LIMITS.maxStyleAnalysesPerHour) {
    return fail("Too many styles analysed in the last hour. Try again shortly.", 429);
  }

  let analysis;
  try {
    analysis = await analyseReference(parsed.data.image, parsed.data.mimeType);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return fail(`Could not analyse that image: ${message}`, 502);
  }

  if (!analysis.ok) return fail(analysis.reason, 422);

  const { data: row, error } = await admin
    .from("custom_styles")
    .insert({
      user_id: user.id,
      name: analysis.style.name,
      block: analysis.style.block,
      guidance: analysis.style.guidance,
      swatch: analysis.style.swatch,
      texture: analysis.style.texture,
    })
    .select("id")
    .single();

  if (error || !row) return fail("Could not save that style", 500);

  // Store the reference for display. A failure here is not worth losing the
  // style over — the style is the text, not the picture.
  let referenceUrl: string | null = null;
  try {
    const key = referenceKey(user.id, row.id);
    await putImage(key, Buffer.from(parsed.data.image, "base64"), parsed.data.mimeType);
    await admin.from("custom_styles").update({ reference_key: key }).eq("id", row.id);
    referenceUrl = (await signedImageUrls([key]))[key] ?? null;
  } catch {
    // Keep going without the thumbnail.
  }

  return NextResponse.json({
    style: { ...analysis.style, id: row.id },
    referenceUrl,
  });
}
