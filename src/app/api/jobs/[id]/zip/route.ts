import JSZip from "jszip";
import { requireUser, requireOwnedJob, fail } from "@/lib/api";
import { getImageBytes } from "@/lib/storage";

export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

/**
 * Downloads the whole set as a ZIP, numbered 001.jpg upward in script order.
 *
 * The numbering is the point — dropped into a timeline the images land in
 * narration order without any manual sorting. Also includes prompts.txt so the
 * set can be regenerated or tweaked elsewhere.
 */
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user, admin } = auth;

  const { id } = await params;
  const owned = await requireOwnedJob(admin, id, user.id);
  if (owned.error) return owned.error;

  const { data: images } = await admin
    .from("job_images")
    .select("idx, prompt, storage_key, status")
    .eq("job_id", id)
    .eq("status", "done")
    .order("idx");

  if (!images?.length) return fail("Nothing to download yet", 409);

  const zip = new JSZip();

  await Promise.all(
    images.map(async (img) => {
      if (!img.storage_key) return;
      const bytes = await getImageBytes(img.storage_key);
      zip.file(`${String(img.idx + 1).padStart(3, "0")}.jpg`, bytes);
    }),
  );

  zip.file(
    "prompts.txt",
    images
      .map((i) => `${String(i.idx + 1).padStart(3, "0")}\n${i.prompt}`)
      .join("\n\n"),
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  const safeTitle =
    (owned.job.title as string).replace(/[^a-z0-9]+/gi, "-").slice(0, 40) || "images";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeTitle}.zip"`,
    },
  });
}
