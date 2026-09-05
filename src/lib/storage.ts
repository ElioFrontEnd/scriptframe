import { createAdminClient } from "./supabase/admin";

/**
 * Image storage, on Supabase Storage.
 *
 * We already depend on Supabase for auth and the database, so keeping the files
 * there too means one fewer account, one fewer card on file and four fewer
 * environment variables. The free tier is 1GB — roughly 60 videos at these
 * sizes — and the day that becomes the constraint, only this file changes.
 *
 * The bucket is private. Images reach the browser through short-lived signed
 * URLs, never a public path.
 */

export const BUCKET = "images";

export function imageKey(jobId: string, idx: number) {
  return `${jobId}/${String(idx + 1).padStart(3, "0")}.jpg`;
}

export async function putImage(key: string, bytes: Buffer, contentType: string) {
  const { error } = await createAdminClient()
    .storage.from(BUCKET)
    .upload(key, bytes, { contentType, upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return key;
}

export async function signedImageUrl(key: string, expiresIn = 3600) {
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrl(key, expiresIn);

  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Signs many keys in one request. The gallery renders up to 300 images, and
 * signing them one at a time would be 300 round trips per page load.
 */
export async function signedImageUrls(
  keys: string[],
  expiresIn = 3600,
): Promise<Record<string, string>> {
  if (keys.length === 0) return {};

  const { data, error } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrls(keys, expiresIn);

  if (error || !data) return {};

  const map: Record<string, string> = {};
  for (const entry of data) {
    if (entry.signedUrl && entry.path) map[entry.path] = entry.signedUrl;
  }
  return map;
}

export async function getImageBytes(key: string): Promise<Buffer> {
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET)
    .download(key);

  if (error || !data) throw new Error(`Download failed: ${error?.message}`);
  return Buffer.from(await data.arrayBuffer());
}
