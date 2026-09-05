import { createFalClient } from "@fal-ai/client";
import { IMAGE_SIZE } from "./config";

/**
 * fal.ai image generation.
 *
 * This module is server-only. FAL_KEY bills our account for whatever it
 * generates, so it must never be bundled into client code, and nothing here
 * may be called before credits have been deducted.
 */

const MODEL = "fal-ai/flux/schnell";

let client: ReturnType<typeof createFalClient> | null = null;

function getClient() {
  if (!client) {
    const credentials = process.env.FAL_KEY;
    if (!credentials) throw new Error("FAL_KEY is not set");
    client = createFalClient({ credentials });
  }
  return client;
}

export type FalImage = { bytes: Buffer; contentType: string };

/** Generates one image. Throws on failure; the caller decides about retries. */
export async function generateImage(prompt: string): Promise<FalImage> {
  const result = await getClient().subscribe(MODEL, {
    input: {
      prompt,
      image_size: { width: IMAGE_SIZE.width, height: IMAGE_SIZE.height },
      num_images: 1,
      num_inference_steps: 4,
      output_format: "jpeg",
      // Leave this on. Our account is what gets suspended for what users make.
      enable_safety_checker: true,
    },
    logs: false,
  });

  const image = result.data?.images?.[0];
  if (!image?.url) {
    throw new Error("fal returned no image (it may have been filtered)");
  }

  const res = await fetch(image.url);
  if (!res.ok) throw new Error(`Could not download image: HTTP ${res.status}`);

  return {
    bytes: Buffer.from(await res.arrayBuffer()),
    contentType: image.content_type ?? "image/jpeg",
  };
}

/**
 * Runs a set of prompts with bounded concurrency, returning a result per input
 * rather than rejecting the whole batch when one image fails.
 */
export async function generateBatch<T extends { id: string; prompt: string }>(
  items: T[],
  concurrency: number,
): Promise<Array<{ item: T; image?: FalImage; error?: string }>> {
  const results: Array<{ item: T; image?: FalImage; error?: string }> = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const item = items[cursor++];
      try {
        results.push({ item, image: await generateImage(item.prompt) });
      } catch (err) {
        results.push({
          item,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker),
  );

  return results;
}
