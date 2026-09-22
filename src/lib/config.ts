/** Pricing, limits and the safety rails around generation. */

/**
 * Shown on the site and in the legal pages. Stripe requires a working support
 * contact, so this address needs to actually receive mail — Cloudflare Email
 * Routing forwards it to a normal inbox for free.
 */
export const SUPPORT_EMAIL = "support@cutframe.app";

export const PRODUCT_NAME = "Cutframe";

/**
 * Credit packs. Priced per *video*, not per image — if we price in images,
 * customers compare us to fal's raw $0.003 and we lose. What they are buying
 * is the script-to-consistent-set workflow, not the pixels.
 *
 * At $0.003/image our cost of goods is shown in `costUsd`.
 */
export const CREDIT_PACKS = [
  {
    id: "starter",
    name: "Starter",
    credits: 400,
    priceUsd: 9,
    videos: "about 4 videos",
    costUsd: 1.2,
  },
  {
    id: "creator",
    name: "Creator",
    credits: 1000,
    priceUsd: 19,
    videos: "about 10 videos",
    costUsd: 3.0,
    popular: true,
  },
  {
    id: "studio",
    name: "Studio",
    credits: 3000,
    priceUsd: 49,
    videos: "about 30 videos",
    costUsd: 9.0,
  },
] as const;

export type CreditPack = (typeof CREDIT_PACKS)[number];

export function getPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

/**
 * Free images a new account starts with.
 *
 * The database is the authority — app_settings.signup_bonus_credits, set by
 * migration 006 — because the grant happens in a trigger. This constant exists
 * so the marketing copy is written once and can't drift from it. Change both
 * together, or the site promises something the database won't give.
 */
export const SIGNUP_BONUS_CREDITS = 25;

/** One credit buys one generated image. */
export const CREDITS_PER_IMAGE = 1;

export const LIMITS = {
  /** Longest script we will accept, in characters. ~30 minutes of narration. */
  maxScriptChars: 60_000,
  /** Hard ceiling on images per job, regardless of what the client asks for. */
  maxImagesPerJob: 300,
  minImagesPerJob: 1,
  /** Images generated per worker tick. Keeps us inside serverless time limits. */
  batchSize: 6,
  /** Concurrent fal calls within one tick. */
  concurrency: 6,
  /** Jobs a user may have running at once. */
  maxConcurrentJobs: 2,
  /** Jobs a user may start per hour. Blunt but effective anti-abuse. */
  maxJobsPerHour: 20,
  /** Attempts per image before we give up and refund it. */
  maxAttempts: 3,
  /** Reference images a user may analyse per hour. Cheap, but not free. */
  maxStyleAnalysesPerHour: 30,
  /** Longest edge a reference is downscaled to in the browser before upload. */
  referenceMaxEdge: 1024,
} as const;

/**
 * Words of narration per image. At roughly 150 wpm, one image every ~18 words
 * is a new picture about every 7 seconds, which is the usual faceless pacing.
 */
export const DENSITY_OPTIONS = [
  { id: "relaxed", label: "Relaxed", wordsPerImage: 28, note: "~11s per image" },
  { id: "standard", label: "Standard", wordsPerImage: 18, note: "~7s per image" },
  { id: "fast", label: "Fast cuts", wordsPerImage: 12, note: "~5s per image" },
] as const;

export type DensityId = (typeof DENSITY_OPTIONS)[number]["id"];

export function getDensity(id: string) {
  return DENSITY_OPTIONS.find((d) => d.id === id) ?? DENSITY_OPTIONS[1];
}

export function estimateImageCount(script: string, densityId: string): number {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  const { wordsPerImage } = getDensity(densityId);
  const raw = Math.round(words / wordsPerImage);
  return Math.min(LIMITS.maxImagesPerJob, Math.max(LIMITS.minImagesPerJob, raw));
}

export const IMAGE_SIZE = { width: 1280, height: 720 } as const;
