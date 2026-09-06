import { GoogleGenAI, type Part } from "@google/genai";

/**
 * Shared Gemini access.
 *
 * Models are tried in order until one answers, and the winner is remembered for
 * the rest of the process. Google retires model names on their own schedule —
 * this turns that into a fallback rather than an outage. Set GEMINI_MODEL to
 * force one; `npm run models` lists what a key can actually reach.
 *
 * Ordered cheapest first. Both callers here do structured, well-specified work
 * that the light models handle fine.
 */
const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash",
].filter((m): m is string => !!m);

let resolvedModel: string | null = null;

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
}

/** A model name this key can't reach — worth trying the next candidate. */
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

/** Strips a code fence, which models sometimes add despite the mime type. */
export function parseJson<T>(raw: string): T {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  return JSON.parse(text) as T;
}

export async function generateJson(opts: {
  parts: Part[];
  schema: unknown;
  temperature?: number;
}): Promise<string> {
  const ai = client();
  const candidates = resolvedModel ? [resolvedModel] : MODEL_CANDIDATES;
  let lastError: unknown;

  for (const model of candidates) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: opts.parts }],
        config: {
          temperature: opts.temperature ?? 0.7,
          responseMimeType: "application/json",
          responseJsonSchema: opts.schema,
        },
      });
      resolvedModel = model;
      return res.text ?? "";
    } catch (err) {
      lastError = err;
      // Only a missing model should send us down the list. A rate limit or a
      // bad key is a real failure and should surface immediately.
      if (!isModelUnavailable(err)) throw err;
    }
  }

  throw new Error(
    `No usable Gemini model. Tried ${candidates.join(", ")}. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}
