/**
 * Populates the landing-page gallery from a Cutframe export.
 *
 *   node scripts/add-samples.mjs <folder-or-zip> <style-id> [howMany]
 *
 * Example, after downloading a job's ZIP and unzipping it to Downloads:
 *
 *   node scripts/add-samples.mjs "C:\Users\Pozitron\Downloads\my-video" handdrawn-educational
 *
 * It copies the images into public/samples/<style-id>/ renamed 01.jpg, 02.jpg…
 * so they sort in script order. Pick frames that sit well together — the point
 * of the gallery is showing that a set holds one look, so a run of consecutive
 * frames sells it better than the six prettiest ones.
 *
 * Valid style ids are printed if you pass one that does not exist.
 */
import { existsSync, mkdirSync, readdirSync, copyFileSync, rmSync } from "node:fs";
import { join, extname, basename } from "node:path";

const STYLE_IDS = [
  "handdrawn-educational",
  "archival-documentary",
  "cinematic-dark",
  "flat-vector-explainer",
  "storybook-watercolor",
  "retro-comic",
  "natural-documentary",
  "chalkboard-science",
];

const [source, styleId, howManyRaw] = process.argv.slice(2);
const howMany = Number(howManyRaw ?? 6);

function die(msg) {
  console.error(`\n${msg}\n`);
  process.exit(1);
}

if (!source || !styleId) {
  die(
    "Usage: node scripts/add-samples.mjs <folder> <style-id> [howMany]\n\n" +
      `Style ids:\n  ${STYLE_IDS.join("\n  ")}`,
  );
}

if (!STYLE_IDS.includes(styleId)) {
  die(`Unknown style id "${styleId}".\n\nValid ids:\n  ${STYLE_IDS.join("\n  ")}`);
}

if (!existsSync(source)) die(`Not found: ${source}`);

if (extname(source).toLowerCase() === ".zip") {
  die(
    "Unzip it first, then point this at the folder.\n" +
      "In Explorer: right-click the ZIP -> Extract All.",
  );
}

const images = readdirSync(source)
  .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
  .sort();

if (images.length === 0) die(`No images found in ${source}`);

const dest = join(process.cwd(), "public", "samples", styleId);
if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });

const chosen = images.slice(0, howMany);
chosen.forEach((file, i) => {
  const name = `${String(i + 1).padStart(2, "0")}${extname(file).toLowerCase()}`;
  copyFileSync(join(source, file), join(dest, name));
  console.log(`  ${basename(file)}  ->  samples/${styleId}/${name}`);
});

console.log(
  `\nAdded ${chosen.length} images for "${styleId}".\n` +
    `Commit and push, and they'll be on the landing page after the next deploy.\n`,
);
