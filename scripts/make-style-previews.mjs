/**
 * Renders one preview image per preset, using each preset's own style block and
 * the same model the product uses.
 *
 *   node scripts/make-style-previews.mjs            # only the missing ones
 *   node scripts/make-style-previews.mjs --force    # re-render everything
 *   node scripts/make-style-previews.mjs stickman-whiteboard classical-oil
 *
 * Needs FAL_KEY — it reads .env.local, so just run it from the project folder.
 * Twelve images at $0.003 each is under four cents.
 *
 * Every preset renders the SAME scene. That is the point: the picker becomes a
 * direct comparison of one subject in twelve treatments, which shows the
 * difference far better than twelve unrelated pictures.
 *
 * These previews must always be generated, never sourced elsewhere. A preview
 * is a promise about what the preset produces, so it has to come from the
 * preset.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createFalClient } from "@fal-ai/client";

/** Neutral enough for every medium, with a figure, a landscape and a light source. */
const SCENE =
  "a lone traveller in a long coat standing on a rocky ridge at sunrise, " +
  "looking out over a wide valley with a river far below, mountains on the horizon";

const OUT = join(process.cwd(), "public", "style-previews");

function loadKey() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  try {
    const env = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    const line = env.split("\n").find((l) => l.trim().startsWith("FAL_KEY="));
    const value = line?.split("=").slice(1).join("=").trim();
    if (value) return value;
  } catch {
    // fall through
  }
  console.error("No FAL_KEY in the environment or .env.local");
  process.exit(1);
}

/** Reads the presets straight out of the source so the two can never drift. */
function loadPresets() {
  const src = readFileSync(join(process.cwd(), "src", "lib", "styles.ts"), "utf8");
  const presets = [];

  // Each entry looks like: id: "...", ... block: "..." + "..." , guidance:
  const entries = src.split(/\n  \{\n/).slice(1);
  for (const entry of entries) {
    const id = entry.match(/id:\s*"([^"]+)"/)?.[1];
    const name = entry.match(/name:\s*"([^"]+)"/)?.[1];
    const blockMatch = entry.match(/block:\s*([\s\S]*?),\n\s*guidance:/);
    if (!id || !name || !blockMatch) continue;

    const block = [...blockMatch[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)]
      .map((m) => m[1].replace(/\\"/g, '"'))
      .join("");

    if (block.length > 40) presets.push({ id, name, block });
  }
  return presets;
}

const key = loadKey();
const all = loadPresets();
if (all.length === 0) {
  console.error("Could not read any presets from src/lib/styles.ts");
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes("--force");
const wanted = args.filter((a) => !a.startsWith("--"));

mkdirSync(OUT, { recursive: true });

const todo = all.filter((p) => {
  if (wanted.length && !wanted.includes(p.id)) return false;
  if (!force && existsSync(join(OUT, `${p.id}.jpg`))) return false;
  return true;
});

if (todo.length === 0) {
  console.log("Nothing to render. Use --force to redo existing previews.");
  process.exit(0);
}

console.log(
  `Rendering ${todo.length} preview${todo.length === 1 ? "" : "s"} ` +
    `(about $${(todo.length * 0.003).toFixed(3)}):\n`,
);

const fal = createFalClient({ credentials: key });
let failures = 0;

for (const preset of todo) {
  process.stdout.write(`  ${preset.name.padEnd(26)}`);
  try {
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: `${SCENE}. ${preset.block}`,
        image_size: { width: 1280, height: 720 },
        num_images: 1,
        num_inference_steps: 4,
        output_format: "jpeg",
        enable_safety_checker: true,
      },
      logs: false,
    });

    const url = result.data?.images?.[0]?.url;
    if (!url) throw new Error("no image returned");

    const res = await fetch(url);
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);

    writeFileSync(
      join(OUT, `${preset.id}.jpg`),
      Buffer.from(await res.arrayBuffer()),
    );
    console.log("ok");
  } catch (err) {
    failures++;
    console.log(`FAILED — ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(
  failures === 0
    ? `\nDone. ${todo.length} preview(s) in public/style-previews.\n` +
        "Look at them before committing — if one doesn't represent its style,\n" +
        "edit that block in src/lib/styles.ts and re-run with its id.\n"
    : `\n${failures} preview(s) failed. Re-run to retry just those.\n`,
);
