import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, fail } from "@/lib/api";
import { generatePrompts, generatePromptsForBlocks } from "@/lib/prompts";
import {
  parseTranscript,
  fitCues,
  cuesToPlainText,
  DEFAULT_TARGET_SECONDS,
  MIN_TARGET_SECONDS,
  MAX_TARGET_SECONDS,
} from "@/lib/transcript";
import { getStyle, asResolvedStyle, STYLE_PRESETS, type ResolvedStyle } from "@/lib/styles";
import { LIMITS, estimateImageCount } from "@/lib/config";
import { toUserMessage } from "@/lib/userError";
import type { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 120;

const PRESET_IDS = STYLE_PRESETS.map((s) => s.id);

const Body = z
  .object({
    title: z.string().trim().max(120).optional(),
    script: z.string().trim().min(50).max(LIMITS.maxScriptChars),
    /** A built-in preset. */
    styleId: z.string().optional(),
    /** A style the user made from their own reference image. */
    customStyleId: z.string().uuid().optional(),
    density: z.string().default("standard"),
    /** Seconds per image when the script is a timestamped transcript. */
    targetSeconds: z
      .number()
      .min(MIN_TARGET_SECONDS)
      .max(MAX_TARGET_SECONDS)
      .default(DEFAULT_TARGET_SECONDS),
    /** Optional override; still clamped to the hard ceiling below. */
    imageCount: z.number().int().optional(),
  })
  .refine((d) => d.styleId || d.customStyleId, {
    message: "Pick a style first",
  });

/** Resolves whichever kind of style was chosen, checking ownership for custom ones. */
async function resolveRequestedStyle(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  body: { styleId?: string; customStyleId?: string },
): Promise<ResolvedStyle | null> {
  if (body.customStyleId) {
    const { data } = await admin
      .from("custom_styles")
      .select("id, name, block, guidance, swatch, texture")
      .eq("id", body.customStyleId)
      .eq("user_id", userId)
      .maybeSingle();

    return data ? asResolvedStyle(data) : null;
  }

  return body.styleId && PRESET_IDS.includes(body.styleId)
    ? getStyle(body.styleId)
    : null;
}

/**
 * Creates a job and writes its prompts.
 *
 * Deliberately spends no credits: the user reviews and edits the prompts first,
 * and only /start commits their balance. Prompt writing costs us a fraction of
 * a cent, which is a cheap way to let people see the quality before paying.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const { user, admin } = auth;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid request");
  }
  const { title, script, density } = parsed.data;

  // Rate limit before doing any paid work.
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  const { count: recentJobs } = await admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", hourAgo);

  if ((recentJobs ?? 0) >= LIMITS.maxJobsPerHour) {
    return fail("Too many projects in the last hour. Try again shortly.", 429);
  }

  const style = await resolveRequestedStyle(admin, user.id, parsed.data);
  if (!style) return fail("That style isn't available", 400);

  // A timestamped transcript decides the timing itself: the voiceover already
  // exists, so the cues are ground truth and the pacing setting is irrelevant.
  const cues = parseTranscript(script);
  const timed = cues.length > 0;

  const { blocks, targetSeconds: usedTarget } = timed
    ? fitCues(cues, parsed.data.targetSeconds, LIMITS.maxImagesPerJob)
    : { blocks: [], targetSeconds: parsed.data.targetSeconds };

  // Timestamps are stripped from the stored script — they were timing
  // instructions, not narration, and nothing downstream should read them.
  const storedScript = timed ? cuesToPlainText(cues) : script;

  const imageCount = timed
    ? blocks.length
    : Math.min(
        LIMITS.maxImagesPerJob,
        Math.max(
          LIMITS.minImagesPerJob,
          parsed.data.imageCount ?? estimateImageCount(script, density),
        ),
      );

  if (imageCount < LIMITS.minImagesPerJob) {
    return fail("That transcript didn't yield any usable moments", 400);
  }

  const { data: job, error: insertError } = await admin
    .from("jobs")
    .insert({
      user_id: user.id,
      title:
        title || storedScript.trim().slice(0, 60).replace(/\s+\S*$/, "") || "Untitled",
      script: storedScript,
      style_id: style.id,
      // Snapshot, so this job keeps its look even if the style is later edited
      // or deleted. Everything that displays a job reads this.
      style,
      image_count: imageCount,
      status: "draft",
    })
    .select()
    .single();

  if (insertError || !job) return fail("Could not create the project", 500);

  try {
    const prompts = timed
      ? await generatePromptsForBlocks({ blocks, style })
      : await generatePrompts({ script: storedScript, imageCount, style });

    const { error: promptError } = await admin.from("job_images").insert(
      prompts.map((p) => ({
        job_id: job.id,
        idx: p.idx,
        prompt: p.prompt,
        start_ms: "startMs" in p ? p.startMs : null,
      })),
    );
    if (promptError) throw new Error(promptError.message);

    await admin
      .from("jobs")
      .update({ status: "prompts_ready", image_count: prompts.length })
      .eq("id", job.id);

    return NextResponse.json({
      jobId: job.id,
      imageCount: prompts.length,
      timed,
      targetSeconds: timed ? usedTarget : undefined,
    });
  } catch (err) {
    // The provider's own message goes to our logs, where it is useful. What the
    // customer sees is a sentence about their situation, not our stack.
    const detail = err instanceof Error ? err.message : String(err);
    console.error("prompt writing failed", job.id, detail);

    const message = toUserMessage(err);
    await admin
      .from("jobs")
      .update({ status: "failed", error: message })
      .eq("id", job.id);
    return fail(message, 502);
  }
}
