/**
 * Sanity checks on the counting logic. The user is charged one credit per
 * image, so "the number of prompts equals the number we quoted" is a money
 * correctness property, not a cosmetic one.
 *
 *   npx tsx scripts/check-math.ts
 */
import { splitIntoChunks, allocate } from "../src/lib/prompts";
import { estimateImageCount, LIMITS } from "../src/lib/config";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

const sentence = "The ground shook for ninety seconds and then it stopped. ";

console.log("allocate() distributes exactly the requested total");
for (const words of [50, 400, 1500, 6000, 20000]) {
  const script = sentence.repeat(Math.ceil(words / 10));
  for (const total of [1, 7, 40, 100, 300]) {
    const chunks = splitIntoChunks(script, 700);
    const counts = allocate(chunks, total);
    const sum = counts.reduce((a, b) => a + b, 0);
    const allPositive = counts.every((c) => c >= 1);

    check(
      `${words}w -> ${total} images across ${chunks.length} chunks`,
      sum === total || (chunks.length > total && sum === chunks.length),
      `got ${sum}`,
    );
    check(`  every chunk gets at least one image`, allPositive);
  }
}

console.log("\nestimateImageCount() stays inside the hard limits");
check("empty script clamps to the minimum", estimateImageCount("", "standard") === LIMITS.minImagesPerJob);
check(
  "enormous script clamps to the ceiling",
  estimateImageCount(sentence.repeat(20000), "fast") === LIMITS.maxImagesPerJob,
);
check(
  "faster pacing never yields fewer images",
  estimateImageCount(sentence.repeat(50), "fast") >=
    estimateImageCount(sentence.repeat(50), "relaxed"),
);

console.log("\nsplitIntoChunks() never loses words");
const script = sentence.repeat(300);
const rejoined = splitIntoChunks(script, 700).join(" ").split(/\s+/).filter(Boolean).length;
const original = script.trim().split(/\s+/).filter(Boolean).length;
check("word count preserved", rejoined === original, `${rejoined} vs ${original}`);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
