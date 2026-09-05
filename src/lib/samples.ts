import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Sample sets shown on the landing page.
 *
 * These must be real Cutframe output. Putting images here that the app did not
 * produce would misrepresent the product to someone deciding whether to pay for
 * it, and it falls apart the moment they sign up and get something different.
 *
 * To populate: drop a style's images into
 *
 *     public/samples/<style-id>/
 *
 * named so they sort in script order (001.jpg, 002.jpg …). The gallery picks
 * them up on the next build. Anything without images renders as a plain style
 * card instead of an empty frame, so a half-filled gallery still looks
 * deliberate.
 *
 * `scripts/add-samples.mjs` does the copying and renaming from an exported ZIP.
 */

const SAMPLES_DIR = join(process.cwd(), "public", "samples");
const IMAGE = /\.(jpe?g|png|webp)$/i;

export function getSampleImages(styleId: string, limit = 6): string[] {
  const dir = join(SAMPLES_DIR, styleId);
  if (!existsSync(dir)) return [];

  try {
    return readdirSync(dir)
      .filter((f) => IMAGE.test(f))
      .sort()
      .slice(0, limit)
      .map((f) => `/samples/${styleId}/${f}`);
  } catch {
    return [];
  }
}

export function hasAnySamples(styleIds: string[]): boolean {
  return styleIds.some((id) => getSampleImages(id, 1).length > 0);
}
