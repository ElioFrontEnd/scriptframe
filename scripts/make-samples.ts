/**
 * Fills the landing-page gallery with real Cutframe output.
 *
 *   npx tsx scripts/make-samples.ts              # the four default styles
 *   npx tsx scripts/make-samples.ts --all        # every preset
 *   npx tsx scripts/make-samples.ts --styles classical-oil,anime-still
 *   npx tsx scripts/make-samples.ts --script path/to/your-narration.txt --count 6
 *
 * Styles that already have a full set are skipped, so --all can be re-run to
 * fill in what's missing without paying for the frames you already have. Use
 * --force to redo them anyway.
 *
 * Needs FAL_KEY and GEMINI_API_KEY, which it reads from .env.local — so run it
 * from the project folder and it just works.
 *
 * This runs the SAME pipeline the product runs: the narration goes through the
 * real prompt writer, and each frame is generated from the real style block by
 * the real model. That is the only way the gallery can honestly claim to show
 * what a customer gets.
 *
 * The frames are consecutive, not cherry-picked. The claim being made is that a
 * whole set holds one look — six frames in a row prove it, six hand-picked
 * winners prove only that you can pick winners, and a visitor can tell.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

/* tsx doesn't load .env.local the way Next does, so do it by hand before any
   module that reads process.env at call time. */
function loadEnv() {
  try {
    const text = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Fall through to whatever is already in the environment.
  }
}
loadEnv();

async function main() {
  const { generatePrompts } = await import("../src/lib/prompts");
  const { generateImage } = await import("../src/lib/fal");
  const { getStyle, STYLE_PRESETS } = await import("../src/lib/styles");

  /* Display assets, not deliverables. fal returns ~700KB a frame; at three frames
     per card across a dozen cards that is a real cost on a phone. */
  const WIDTH = 900;
  const QUALITY = 78;

  /** A spread of mediums, so the gallery doesn't look lopsided. */
  const DEFAULT_STYLES = [
    "stickman-whiteboard",
    "classical-oil",
    "cinematic-realism",
    "storybook-watercolour",
  ];

  /**
   * Stands in until you point this at one of your own scripts with --script.
   * Written to look like real narration, because it has to behave like real
   * narration going through the prompt writer.
   */
  const DEFAULT_SCRIPT = `In the summer of 1783, a crack opened across the south of Iceland and kept opening for eight months. It was not a mountain that erupted. It was a fissure twenty-seven kilometres long, and it poured out more lava than any eruption in recorded history.

  The lava was not what killed people. The gas was. Sulphur dioxide rose into the atmosphere in quantities that are difficult to picture, and the prevailing winds carried it east, across the sea, into Europe.

  That summer, people in England wrote about a haze that would not lift. The sun turned the colour of blood at midday. Crops withered in fields from Norway to Italy. In Iceland itself, a quarter of the population died, most of them from famine after the livestock ate poisoned grass.

  Then came the winter. The following months were among the coldest ever measured in Europe and North America. The Mississippi froze at New Orleans. Ice floated in the Gulf of Mexico. Rivers that had never frozen in living memory froze solid, and the people standing on them had no idea that a fissure on a distant island was the reason.

  It took two centuries to connect the two. The eruption is called Laki, and it is the clearest evidence we have that a single volcano can reach across an ocean and change what happens in a field on the other side of the world.`;

  /* ------------------------------------------------------------------ args */

  const argv = process.argv.slice(2);
  function flag(name: string): string | undefined {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? undefined : argv[i + 1];
  }

  const count = Number(flag("count") ?? 6);
  const force = argv.includes("--force");
  const styleIds = argv.includes("--all")
    ? STYLE_PRESETS.map((s) => s.id)
    : (flag("styles")?.split(",") ?? DEFAULT_STYLES).map((s) => s.trim());
  const scriptPath = flag("script");
  const script = scriptPath ? readFileSync(scriptPath, "utf8") : DEFAULT_SCRIPT;

  const unknown = styleIds.filter((id) => !STYLE_PRESETS.some((s) => s.id === id));
  if (unknown.length) {
    console.error(`\nNot a style id: ${unknown.join(", ")}`);
    console.error(`\nValid ids:\n  ${STYLE_PRESETS.map((s) => s.id).join("\n  ")}\n`);
    process.exit(1);
  }

  for (const key of ["FAL_KEY", "GEMINI_API_KEY"]) {
    const value = process.env[key];
    if (!value || value.startsWith("your-")) {
      console.error(`\n${key} is missing from .env.local (or still a placeholder).\n`);
      process.exit(1);
    }
  }

  const OUT = join(process.cwd(), "public", "samples");

  /* Frames already on disk cost money to make. Re-running --all to fill a gap
     should not pay for them twice. */
  function alreadyDone(styleId: string): boolean {
    return existsSync(join(OUT, styleId, String(count).padStart(2, "0") + ".jpg"));
  }

  const skipped = force ? [] : styleIds.filter(alreadyDone);
  const todo = styleIds.filter((id) => !skipped.includes(id));

  if (skipped.length) {
    console.log(`\nAlready done, skipping: ${skipped.join(", ")}`);
    console.log("Pass --force to regenerate them anyway.");
  }

  if (todo.length === 0) {
    console.log("\nNothing left to generate.\n");
    return;
  }

  const total = todo.length * count;
  console.log(
    `\nGenerating ${count} consecutive frames for ${todo.length} style(s) — ` +
      `${total} images, about $${(total * 0.003).toFixed(2)}.\n`,
  );

  /* ----------------------------------------------------------------- work */

  let failures = 0;

  for (const styleId of todo) {
    const style = getStyle(styleId);
    console.log(`${style.name}`);

    let prompts;
    try {
      process.stdout.write("  writing prompts… ");
      prompts = await generatePrompts({ script, imageCount: count, style });
      console.log(`${prompts.length} beats`);
    } catch (err) {
      console.log(`failed: ${err instanceof Error ? err.message : String(err)}`);
      failures++;
      continue;
    }

    const dir = join(OUT, styleId);
    mkdirSync(dir, { recursive: true });

    for (const [i, prompt] of prompts.entries()) {
      const name = String(i + 1).padStart(2, "0");
      process.stdout.write(`  ${name}  `);
      try {
        const { bytes } = await generateImage(prompt.prompt);
        const optimised = await sharp(bytes)
          .resize({ width: WIDTH })
          .jpeg({ quality: QUALITY, mozjpeg: true })
          .toBuffer();

        writeFileSync(join(dir, `${name}.jpg`), optimised);
        console.log(
          `ok  (${Math.round(bytes.length / 1024)}KB -> ${Math.round(optimised.length / 1024)}KB)  ` +
            `${prompt.beat.slice(0, 54)}…`,
        );
      } catch (err) {
        console.log(`failed: ${err instanceof Error ? err.message : String(err)}`);
        failures++;
      }
    }
    console.log();
  }

  if (failures) {
    console.log(`Finished with ${failures} failure(s). Re-run to fill the gaps.\n`);
  } else {
    console.log("Done. Run `npm run dev` and look at the Styles section.\n");
  }

}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
