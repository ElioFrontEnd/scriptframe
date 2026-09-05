import { GoogleGenAI } from "@google/genai";
import type { StylePreset } from "./styles";

/**
 * Turns a narration script into one image prompt per beat.
 *
 * This is the step users can't do well themselves, so it's worth doing
 * properly. Two things matter:
 *
 *  1. Every prompt is self-contained. It carries the full style block and never
 *     refers to "the same character as before" — image models have no memory
 *     between calls, so a relative reference produces a stranger.
 *  2. Long scripts are chunked. Asking one call to produce 150 prompts reliably
 *     degrades near the end; chunks of a few hundred words each stay sharp and
 *     run in parallel.
 */

/**
 * Models are tried in order until one answers, and the winner is remembered for
 * the rest of the process. Google retires model names on their own schedule —
 * this list means that costs you a fallback rather than an outage. Set
 * GEMINI_MODEL in the environment to force a specific one.
 *
 * Ordered cheapest first. Prompt writing is a mechanical, well-specified task,
 * so the light models handle it fine; at these sizes the whole step costs about
 * a cent per video either way, next to roughly 30 cents of image generation.
 */
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
].filter((m): m is string => !!m);

/** Set once we know which candidate this API key can actually reach. */
let resolvedModel: string | null = null;

const WORDS_PER_CHUNK = 700;

export type GeneratedPrompt = {
  idx: number;
  /** The narration this image covers, so the user can see the alignment. */
  beat: string;
  /** Full prompt including the style block — this is what goes to fal. */
  prompt: string;
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    shots: {
      type: "array",
      items: {
        type: "object",
        properties: {
          beat: { type: "string" },
          scene: { type: "string" },
        },
        required: ["beat", "scene"],
      },
    },
  },
  required: ["shots"],
};

export function splitIntoChunks(script: string, wordsPerChunk: number): string[] {
  // Split on sentence boundaries so a chunk never cuts mid-thought.
  const sentences = script
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);

  const chunks: string[] = [];
  let current: string[] = [];
  let count = 0;

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).length;
    if (count + words > wordsPerChunk && current.length > 0) {
      chunks.push(current.join(" "));
      current = [];
      count = 0;
    }
    current.push(sentence);
    count += words;
  }
  if (current.length) chunks.push(current.join(" "));

  return chunks.length ? chunks : [script];
}

/** Spread N images across chunks in proportion to their length, losing none to rounding. */
export function allocate(chunks: string[], total: number): number[] {
  const weights = chunks.map((c) => c.split(/\s+/).length);
  const sum = weights.reduce((a, b) => a + b, 0) || 1;

  const exact = weights.map((w) => (w / sum) * total);
  const counts = exact.map((n) => Math.max(1, Math.floor(n)));

  let remainder = total - counts.reduce((a, b) => a + b, 0);
  // Hand out what rounding dropped to the chunks with the largest fractions.
  const order = exact
    .map((n, i) => ({ i, frac: n - Math.floor(n) }))
    .sort((a, b) => b.frac - a.frac);

  let k = 0;
  while (remainder > 0) {
    counts[order[k % order.length].i]++;
    remainder--;
    k++;
  }
  while (remainder < 0) {
    const target = counts.findIndex((c) => c > 1);
    if (target === -1) break;
    counts[target]--;
    remainder++;
  }

  return counts;
}

function buildInstruction(style: StylePreset, count: number, chunk: string) {
  return `You are a storyboard artist for a narrated explainer video.

Below is a section of the narration script. Break it into exactly ${count} sequential visual beats, in order, covering the whole section evenly. For each beat write a single image description.

Rules for each image description:
- Describe ONE clear scene. No collages, no split screens, no panels, no before/after.
- Be concrete and self-contained: name the subject, the setting, the action, the camera angle and the lighting. The image generator has no memory of the other images, so never write "the same man", "as before", "this character" or "continuing from".
- Describe recurring people by repeating their full physical description every time (for example "a stocky bearded fisherman in his fifties wearing a yellow oilskin coat").
- Do not put words, captions, numbers, labels or logos in the image unless the narration is specifically about a written thing.
- Do not name real living people, celebrities, brands or copyrighted characters. Describe them generically instead.
- Do not mention the art style, medium, colour palette or rendering — that is added separately.
- Aim for 25 to 45 words.
- Visualise what the narration is ABOUT, not a person talking about it. Never describe a narrator, presenter or talking head.

This style renders best with: ${style.guidance}

Return JSON: {"shots":[{"beat":"<the sentence or two of narration this covers, verbatim>","scene":"<the image description>"}]}
There must be exactly ${count} shots.

NARRATION SECTION:
"""
${chunk}
"""`;
}

type Shot = { beat: string; scene: string };

function parseShots(raw: string): Shot[] {
  let text = raw.trim();
  // Models occasionally wrap JSON in a fence despite the mime type.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();

  const parsed = JSON.parse(text) as { shots?: Shot[] };
  if (!parsed.shots || !Array.isArray(parsed.shots)) {
    throw new Error("Prompt writer returned no shots");
  }
  return parsed.shots.filter(
    (s) => s && typeof s.scene === "string" && s.scene.trim().length > 0,
  );
}

/** Force the model's output to the exact count we sold the user. */
function fit(shots: Shot[], count: number, fallbackBeat: string): Shot[] {
  const out = shots.slice(0, count);
  while (out.length < count) {
    const source = out[out.length - 1] ?? {
      beat: fallbackBeat.slice(0, 200),
      scene: "A wide establishing view of the setting described in the narration",
    };
    out.push({ ...source });
  }
  return out;
}

/** A model name that isn't available to this key — worth trying the next one. */
function isModelUnavailable(err: unknown): boolean {
  const text = err instanceof Error ? err.message : String(err);
  return (
    text.includes("404") ||
    text.includes("NOT_FOUND") ||
    text.includes("no longer available") ||
    text.includes("is not found") ||
    text.includes("does not have access")
  );
}

async function callModel(ai: GoogleGenAI, instruction: string): Promise<string> {
  // Once one works, stop probing.
  const candidates = resolvedModel ? [resolvedModel] : MODEL_CANDIDATES;
  let lastError: unknown;

  for (const model of candidates) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: instruction,
        config: {
          temperature: 0.8,
          responseMimeType: "application/json",
          responseJsonSchema: RESPONSE_SCHEMA,
        },
      });
      resolvedModel = model;
      return res.text ?? "";
    } catch (err) {
      lastError = err;
      // A real failure (rate limit, bad key, server error) shouldn't send us
      // marching down the list — only a missing model should.
      if (!isModelUnavailable(err)) throw err;
    }
  }

  throw new Error(
    `No usable Gemini model. Tried ${candidates.join(", ")}. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

async function generateChunk(
  ai: GoogleGenAI,
  chunk: string,
  count: number,
  style: StylePreset,
): Promise<Shot[]> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const shots = parseShots(await callModel(ai, buildInstruction(style, count, chunk)));
      if (shots.length === 0) throw new Error("empty");
      return fit(shots, count, chunk);
    } catch (err) {
      lastError = err;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }

  throw new Error(
    `Could not write prompts for one section: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}

export async function generatePrompts(opts: {
  script: string;
  imageCount: number;
  style: StylePreset;
}): Promise<GeneratedPrompt[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const ai = new GoogleGenAI({ apiKey });

  let chunks = splitIntoChunks(opts.script, WORDS_PER_CHUNK);

  // Every chunk yields at least one prompt, so more chunks than images would
  // hand the user more images than we quoted — and charge them for the extras.
  // Widen the chunks until they fit the count instead.
  if (chunks.length > opts.imageCount) {
    const words = opts.script.trim().split(/\s+/).filter(Boolean).length;
    chunks = splitIntoChunks(
      opts.script,
      Math.ceil(words / Math.max(1, opts.imageCount)) + 1,
    );
    if (chunks.length > opts.imageCount) chunks = [opts.script];
  }

  const counts = allocate(chunks, opts.imageCount);

  const results = await Promise.all(
    chunks.map((chunk, i) =>
      counts[i] > 0
        ? generateChunk(ai, chunk, counts[i], opts.style)
        : Promise.resolve([] as Shot[]),
    ),
  );

  return results.flat().map((shot, idx) => ({
    idx,
    beat: shot.beat ?? "",
    prompt: `${shot.scene.trim().replace(/\.$/, "")}. ${opts.style.block}`,
  }));
}
