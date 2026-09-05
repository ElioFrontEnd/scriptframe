/**
 * Lists the Gemini models your API key can actually reach, cheapest-looking
 * first. Run this whenever prompt writing fails with a 404 — Google retires
 * model names on their own schedule.
 *
 *   npx tsx scripts/list-models.ts
 *
 * Then either put the name you want in GEMINI_MODEL in .env.local, or send me
 * the list and I'll update the fallback order in src/lib/prompts.ts.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadKey(): string {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;

  // Read .env.local directly so this works without any env loader.
  try {
    const text = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    const line = text
      .split("\n")
      .find((l) => l.trim().startsWith("GEMINI_API_KEY="));
    const value = line?.split("=").slice(1).join("=").trim();
    if (value) return value;
  } catch {
    // fall through
  }

  console.error("No GEMINI_API_KEY found in the environment or .env.local");
  process.exit(1);
}

type Model = {
  name: string;
  displayName?: string;
  description?: string;
  supportedGenerationMethods?: string[];
};

async function main() {
  const key = loadKey();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}&pageSize=200`,
  );

  if (!res.ok) {
    console.error(`Request failed: HTTP ${res.status}`);
    console.error(await res.text());
    process.exit(1);
  }

  const body = (await res.json()) as { models?: Model[] };
  const usable = (body.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
    .map((m) => m.name.replace(/^models\//, ""))
    .sort();

  if (usable.length === 0) {
    console.log("No text-generation models available to this key.");
    return;
  }

  const light = usable.filter((n) => /lite|flash/.test(n));
  const rest = usable.filter((n) => !/lite|flash/.test(n));

  console.log("Cheap models (use one of these):\n");
  for (const name of light) console.log(`  ${name}`);

  if (rest.length) {
    console.log("\nEverything else:\n");
    for (const name of rest) console.log(`  ${name}`);
  }

  console.log(
    `\nPut one in .env.local as:\n  GEMINI_MODEL=${light[0] ?? usable[0]}\n`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
