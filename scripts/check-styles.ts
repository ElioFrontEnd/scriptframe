/**
 * Checks the style presets and the resolver that decides what a job displays.
 *
 *   npx tsx scripts/check-styles.ts
 *
 * The resolver matters more than it looks: presets get rewritten over time, and
 * a job that reports a style it wasn't made in is a lie in the interface even
 * though the images are untouched.
 */
import { STYLE_PRESETS, resolveJobStyle, asResolvedStyle } from "../src/lib/styles";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

console.log("Presets are well formed");
const ids = new Set<string>();
for (const s of STYLE_PRESETS) {
  check(`${s.id}: unique id`, !ids.has(s.id));
  ids.add(s.id);
  check(`${s.id}: block is detailed enough`, s.block.length >= 250, `${s.block.length} chars`);
  check(`${s.id}: block states exclusions`, s.block.includes(" no "), "no 'no X' clauses");
  check(`${s.id}: has guidance`, s.guidance.length > 25);
  check(`${s.id}: three valid swatch colours`,
    s.swatch.length === 3 && s.swatch.every((c) => /^#[0-9a-f]{6}$/i.test(c)));
  check(`${s.id}: blurb names a niche`, s.blurb.length > 20 && s.blurb.includes("."));
}

console.log("\nNo preset names a specific artist, studio or franchise");
// Naming one prompts worse and invites a complaint; blocks must describe technique.
const FORBIDDEN = [
  "in the style of", "pixar", "disney", "ghibli", "marvel", "dc comics",
  "van gogh", "rembrandt", "monet", "picasso", "banksy", "rockwell",
  "artstation", "unreal engine", "midjourney",
];
for (const s of STYLE_PRESETS) {
  const haystack = `${s.block} ${s.guidance} ${s.name}`.toLowerCase();
  const hit = FORBIDDEN.find((f) => haystack.includes(f));
  check(`${s.id}: clean of named references`, !hit, hit ? `mentions "${hit}"` : "");
}

console.log("\nresolveJobStyle picks the right style");
check(
  "a job's own snapshot wins over its preset id",
  resolveJobStyle({
    style: {
      id: "x",
      name: "Soft Gouache",
      block: "soft gouache illustration, chalky matte pigment, no photorealism",
      swatch: ["#111111"],
      texture: "wash",
    },
    style_id: STYLE_PRESETS[1].id,
  }).name === "Soft Gouache",
);
check(
  "a current preset id resolves to that preset",
  resolveJobStyle({ style: null, style_id: STYLE_PRESETS[1].id }).name ===
    STYLE_PRESETS[1].name,
);
check(
  "a retired preset id keeps the name it was made with",
  resolveJobStyle({ style: null, style_id: "archival-documentary" }).name ===
    "Archival Documentary",
);
check(
  "an unknown id falls back rather than throwing",
  resolveJobStyle({ style: null, style_id: "nonsense" }).name === STYLE_PRESETS[0].name,
);

console.log("\nasResolvedStyle rejects junk");
check("null is rejected", asResolvedStyle(null) === null);
check("a too-short block is rejected", asResolvedStyle({ block: "short" }) === null);
check(
  "bad swatch colours are replaced, not trusted",
  asResolvedStyle({
    block: "a perfectly reasonable style block describing a medium",
    swatch: ["not-a-colour", "#ABCDEF"],
  })?.swatch[0] === "#ABCDEF",
);

console.log(failures === 0 ? "\nAll style checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
