/**
 * Checks transcript parsing and cue normalisation.
 *
 *   npx tsx scripts/check-transcript.ts
 *
 * This logic decides how many images a customer is charged for and where each
 * one lands in their timeline, so it is worth pinning down properly.
 */
import {
  parseTranscript,
  normaliseCues,
  fitCues,
  formatTimecode,
  timecodeSlug,
  cuesToPlainText,
  DEFAULT_TARGET_SECONDS,
} from "../src/lib/transcript";

let failures = 0;

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name} ${detail}`);
  }
}

/* ---------------------------------------------------------------- parsing */

console.log("Parsing");

const SRT = `1
00:00:00,000 --> 00:00:03,500
In 1783, a crack eight miles long opened across Iceland.

2
00:00:03,500 --> 00:00:07,200
For eight months it poured out more lava than any eruption in history.

3
00:00:07,200 --> 00:00:11,000
The haze drifted south and settled over Europe like a dry fog.`;

const srt = parseTranscript(SRT);
check("SRT yields one cue per block", srt.length === 3, `got ${srt.length}`);
check("SRT start times are right", srt[1]?.start === 3500, `got ${srt[1]?.start}`);
check("SRT end times are right", srt[1]?.end === 7200, `got ${srt[1]?.end}`);
check("SRT sequence numbers are dropped", !srt[0]?.text.startsWith("1"));

const VTT = `WEBVTT

00:00:00.000 --> 00:00:04.000
First line of narration.

00:00:04.000 --> 00:00:09.500
Second line of narration continues here.

00:00:09.500 --> 00:00:14.000
Third line closes the section.`;
const vtt = parseTranscript(VTT);
check("VTT parses", vtt.length === 3, `got ${vtt.length}`);
check("VTT millisecond dots parse", vtt[1]?.end === 9500, `got ${vtt[1]?.end}`);

const BRACKETED = `[00:00] The ground shook for ninety seconds.
[00:06] Then it stopped, and nobody moved.
[00:13] By morning the harbour had drained completely.
[00:21] What came back was not water.`;
const bracketed = parseTranscript(BRACKETED);
check("bracketed timestamps parse", bracketed.length === 4, `got ${bracketed.length}`);
check("bracketed starts are right", bracketed[2]?.start === 13000, `got ${bracketed[2]?.start}`);
check(
  "a cue with no end time runs to the next",
  bracketed[0]?.end === 6000,
  `got ${bracketed[0]?.end}`,
);
check("the final cue gets an estimated end", (bracketed[3]?.end ?? 0) > 21000);

const DASHED = `0:00 - Opening line of the video.
0:07 - Second beat of the story.
1:05 - A much later moment.
12:30 - Near the end of a long video.`;
const dashed = parseTranscript(DASHED);
check("dashed timestamps parse", dashed.length === 4, `got ${dashed.length}`);
check("minutes convert correctly", dashed[2]?.start === 65000, `got ${dashed[2]?.start}`);
check("double-digit minutes convert", dashed[3]?.start === 750000, `got ${dashed[3]?.start}`);

const HMS = `[01:02:03] A line an hour into the video.
[01:02:09] The next line.
[01:02:15] And another.`;
check("hh:mm:ss parses", parseTranscript(HMS)[0]?.start === 3723000);

console.log("\nPlain scripts are not mistaken for transcripts");
check(
  "a plain script yields nothing",
  parseTranscript(
    "In 1783 a crack opened across Iceland. For eight months it poured out lava. The haze settled over Europe.",
  ).length === 0,
);
check(
  "one stray time reference is not a transcript",
  parseTranscript(
    "The eruption began at 3:15 in the afternoon.\nNobody expected what came next.\nBy morning it was over.",
  ).length === 0,
);
check("empty input yields nothing", parseTranscript("").length === 0);
check("whitespace yields nothing", parseTranscript("   \n\n  ").length === 0);

/* ----------------------------------------------------------- normalising */

console.log("\nNormalising to a target duration");

// 60 cues of 2s each = 120s. At a 5s target that should be about 24 blocks.
const dense = Array.from({ length: 60 }, (_, i) => ({
  start: i * 2000,
  end: (i + 1) * 2000,
  text: `cue ${i} words words words`,
}));
const merged = normaliseCues(dense, 5);
check(
  "dense cues merge toward the target",
  merged.length >= 20 && merged.length <= 30,
  `got ${merged.length}`,
);
const mergedAvg =
  merged.reduce((sum, b) => sum + (b.end - b.start), 0) / merged.length / 1000;
check(
  "merged blocks average near the target",
  mergedAvg > 3.5 && mergedAvg < 6.5,
  `average ${mergedAvg.toFixed(1)}s`,
);

// One 40s cue at a 5s target should become about 8 blocks.
const long = [{ start: 0, end: 40_000, text: Array.from({ length: 80 }, (_, i) => `w${i}`).join(" ") }];
const split = normaliseCues(long, 5);
check("a long cue is split", split.length >= 6 && split.length <= 10, `got ${split.length}`);
check("split blocks are evenly spaced", split[1].start - split[0].start === split[2].start - split[1].start);
check("split blocks carry text", split.every((b) => b.text.trim().length > 0));
check("split covers the whole cue", split[split.length - 1].end === 40_000);
check(
  "no words are lost when splitting",
  split.map((b) => b.text).join(" ").split(/\s+/).length === 80,
  `got ${split.map((b) => b.text).join(" ").split(/\s+/).length}`,
);

console.log("\nTiming stays honest");
const mixed = normaliseCues(
  [
    { start: 0, end: 1500, text: "very short" },
    { start: 1500, end: 3000, text: "also short" },
    { start: 3000, end: 33_000, text: Array.from({ length: 60 }, (_, i) => `x${i}`).join(" ") },
    { start: 33_000, end: 38_000, text: "normal length" },
  ],
  5,
);
check("blocks are ordered", mixed.every((b, i) => i === 0 || b.start >= mixed[i - 1].start));
check("no block has a negative duration", mixed.every((b) => b.end > b.start));
check("no block overlaps the next", mixed.every((b, i) => i === 0 || b.start >= mixed[i - 1].end - 1));
check("the first block starts at zero", mixed[0].start === 0);
check("the last block ends where the transcript does", mixed[mixed.length - 1].end === 38_000);

console.log("\nFitting inside the per-job ceiling");
const huge = Array.from({ length: 900 }, (_, i) => ({
  start: i * 2000,
  end: (i + 1) * 2000,
  text: `line ${i}`,
}));
const fitted = fitCues(huge, DEFAULT_TARGET_SECONDS, 300);
check("a huge transcript is brought under the cap", fitted.blocks.length <= 300, `got ${fitted.blocks.length}`);
check("the target was raised to achieve it", fitted.targetSeconds > DEFAULT_TARGET_SECONDS, `target ${fitted.targetSeconds}`);
const small = fitCues(dense, DEFAULT_TARGET_SECONDS, 300);
check("a normal transcript keeps the chosen target", small.targetSeconds === DEFAULT_TARGET_SECONDS);

/* -------------------------------------------------------------- display */

console.log("\nFormatting");
check("timecode formats", formatTimecode(107_000) === "00:01:47", formatTimecode(107_000));
check("timecode handles hours", formatTimecode(3_723_000) === "01:02:03");
check("timecode floors at zero", formatTimecode(-5) === "00:00:00");
check("slug is filename safe", timecodeSlug(107_000) === "00-01-47");
check(
  "slugs sort lexically in time order",
  [timecodeSlug(9000), timecodeSlug(70_000), timecodeSlug(3_700_000)].join() ===
    [timecodeSlug(9000), timecodeSlug(70_000), timecodeSlug(3_700_000)].sort().join(),
);
check(
  "plain text drops the timestamps",
  cuesToPlainText(bracketed) ===
    "The ground shook for ninety seconds. Then it stopped, and nobody moved. By morning the harbour had drained completely. What came back was not water.",
);

console.log(
  failures === 0 ? "\nAll transcript checks passed." : `\n${failures} check(s) failed.`,
);
process.exit(failures === 0 ? 0 : 1);
