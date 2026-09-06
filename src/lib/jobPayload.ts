import type { createAdminClient } from "./supabase/admin";
import { signedImageUrls } from "./storage";

type Admin = ReturnType<typeof createAdminClient>;

export type FramePayload = {
  id: string;
  idx: number;
  prompt: string;
  status: "pending" | "running" | "done" | "failed";
  error: string | null;
  url: string | null;
  /** Milliseconds into the video, when the script was a timed transcript. */
  startMs: number | null;
};

export type JobPayload = {
  job: {
    id: string;
    title: string;
    status: string;
    style_id: string;
    /** Snapshot of the style used. NULL on jobs from before migration 002. */
    style: unknown;
    image_count: number;
    credits_spent: number;
    error: string | null;
  };
  images: FramePayload[];
  progress: { done: number; failed: number; total: number };
  credits: number;
};

/**
 * Everything the job screen needs, in one shape.
 *
 * Shared by the API route and the server page so the first paint has real data
 * instead of a skeleton, and so the two can never drift apart.
 */
export async function loadJobPayload(
  admin: Admin,
  jobId: string,
  credits: number,
): Promise<JobPayload | null> {
  const { data: job } = await admin
    .from("jobs")
    .select("id, title, status, style_id, style, image_count, credits_spent, error")
    .eq("id", jobId)
    .single();

  if (!job) return null;

  const { data: images } = await admin
    .from("job_images")
    .select("id, idx, prompt, status, storage_key, error, start_ms")
    .eq("job_id", jobId)
    .order("idx");

  const rows = images ?? [];

  // Sign every key in one request rather than once per frame.
  const urls = await signedImageUrls(
    rows.map((i) => i.storage_key).filter((k): k is string => !!k),
  );

  const frames: FramePayload[] = rows.map((img) => ({
    id: img.id,
    idx: img.idx,
    prompt: img.prompt,
    status: img.status,
    error: img.error,
    url: img.storage_key ? (urls[img.storage_key] ?? null) : null,
    startMs: img.start_ms ?? null,
  }));

  return {
    job,
    images: frames,
    progress: {
      done: frames.filter((f) => f.status === "done").length,
      failed: frames.filter((f) => f.status === "failed").length,
      total: frames.length,
    },
    credits,
  };
}
