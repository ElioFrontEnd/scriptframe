/**
 * Timestamped transcripts.
 *
 * When a script carries timestamps, they are ground truth: the voiceover
 * already exists, so we know exactly when each beat happens. That beats
 * estimating pacing from word count, and it means the finished frames can be
 * named by timecode and dropped onto a timeline already in sync.
 *
 * Real transcripts are never at the granularity anyone wants for images.
 * Whisper and most SRT exports emit a cue every two or three seconds, which is
 * 150–250 cues for an eight-minute video; a hand-written script might have one
 * mark per paragraph. So cues are normalised to a target duration: consecutive
 * short ones merge, and long ones split. Either way the timing stays honest —
 * a split block's start time is interpolated inside the cue it came from, never
 * invented.
 */

export type Cue = {
  /** Milliseconds from the start of the video. */
  start: number;
  /** Milliseconds. Inferred from the next cue when the format has no end time. */
  end: number;
  text: string;
};

export type Block = Cue;

/** Seconds per image. Five is a natural cut rhythm for narrated video. */
export const DEFAULT_TARGET_SECONDS = 5;
export const MIN_TARGET_SECONDS = 2;
export const MAX_TARGET_SECONDS = 20;

/* ------------------------------------------------------------------ parsing */

/** `01:02:03,456` / `01:02:03.456` / `02:03` / `2:03.5` -> milliseconds. */
function toMs(stamp: string): number | null {
  const cleaned = stamp.trim().replace(",", ".");
  const parts = cleaned.split(":");
  if (parts.length < 2 || parts.length > 3) return null;

  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => Number.isNaN(n) || n < 0)) return null;

  const [h, m, s] =
    parts.length === 3 ? nums : [0, nums[0], nums[1]];

  if (m >= 60 && parts.length === 3) return null;
  return Math.round((h * 3600 + m * 60 + s) * 1000);
}

const RANGE =
  /(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\s*-->\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)/;

/** A leading timestamp on a line: `[00:12]`, `(0:12)`, `00:12 -`, `00:12` */
const LEADING =
  /^\s*[[(]?\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\s*[\])]?\s*[-–—:]?\s*/;

/**
 * Pulls cues out of SRT, WebVTT, or plain text with a timestamp starting each
 * line or paragraph. Returns an empty array when the text has no usable
 * timestamps, which is how callers detect a plain script.
 */
export function parseTranscript(input: string): Cue[] {
  const text = input.replace(/\r\n?/g, "\n").trim();
  if (!text) return [];

  const cues: Cue[] = [];

  // --- SRT / VTT: a "start --> end" line followed by its text ---------------
  if (RANGE.test(text)) {
    const lines = text.split("\n");
    let i = 0;

    while (i < lines.length) {
      const match = lines[i].match(RANGE);
      if (!match) {
        i++;
        continue;
      }

      const start = toMs(match[1]);
      const end = toMs(match[2]);
      i++;

      const body: string[] = [];
      while (i < lines.length && lines[i].trim() !== "" && !RANGE.test(lines[i])) {
        // Skip the bare sequence numbers SRT puts before each cue.
        if (!/^\d+$/.test(lines[i].trim())) body.push(lines[i].trim());
        i++;
      }

      const joined = body.join(" ").replace(/\s+/g, " ").trim();
      if (start !== null && end !== null && joined) {
        cues.push({ start, end: Math.max(end, start + 200), text: joined });
      }
    }

    if (cues.length > 0) return sortAndFill(cues);
  }

  // --- Plain text with a leading timestamp per line or paragraph ------------
  const chunks = text.split("\n");
  let current: Cue | null = null;

  for (const raw of chunks) {
    const line = raw.trim();
    if (!line) continue;

    const match = line.match(LEADING);
    if (match) {
      const start = toMs(match[1]);
      const body = line.slice(match[0].length).trim();
      if (start !== null) {
        if (current) cues.push(current);
        current = { start, end: start, text: body };
        continue;
      }
    }

    // A line with no stamp continues the cue above it.
    if (current) current.text = `${current.text} ${line}`.trim();
  }
  if (current) cues.push(current);

  const usable = cues.filter((c) => c.text.length > 0);
  // One stray "3:15" in an otherwise plain script isn't a transcript.
  return usable.length >= 3 ? sortAndFill(usable) : [];
}

/** Orders cues and gives every one an end time. */
function sortAndFill(cues: Cue[]): Cue[] {
  const sorted = [...cues].sort((a, b) => a.start - b.start);

  return sorted.map((cue, i) => {
    const next = sorted[i + 1];
    if (cue.end > cue.start + 100) return cue;

    // No end time in this format: run to the next cue, or estimate the last
    // one from its own length at 150 words a minute.
    const words = cue.text.split(/\s+/).filter(Boolean).length;
    const estimated = Math.max(1200, Math.round((words / 150) * 60_000));
    return { ...cue, end: next ? Math.max(next.start, cue.start + 400) : cue.start + estimated };
  });
}

/* -------------------------------------------------------------- normalising */

function splitWords(text: string, parts: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (parts <= 1 || words.length === 0) return [text];

  const per = Math.ceil(words.length / parts);
  const out: string[] = [];
  for (let i = 0; i < parts; i++) {
    const slice = words.slice(i * per, (i + 1) * per);
    out.push(slice.join(" "));
  }
  // Never emit an empty block; fold blanks into the previous one.
  return out.filter((s, i) => s.length > 0 || i === 0).map((s) => s || text);
}

/**
 * Reshapes cues so each block is close to `targetSeconds`.
 *
 * Merging is greedy and stops at whichever boundary lands nearest the target,
 * rather than merging until the target is exceeded — that keeps blocks centred
 * on the target instead of always overshooting it. A block still far longer
 * than the target afterwards is a long uninterrupted cue, so it is divided
 * evenly and its text apportioned across the pieces.
 */
export function normaliseCues(cues: Cue[], targetSeconds: number): Block[] {
  if (cues.length === 0) return [];

  const target = Math.max(MIN_TARGET_SECONDS, Math.min(MAX_TARGET_SECONDS, targetSeconds)) * 1000;
  const blocks: Block[] = [];

  let i = 0;
  while (i < cues.length) {
    const start = cues[i].start;
    let end = cues[i].end;
    let text = cues[i].text;

    // Merge forward while the next boundary is closer to the target.
    while (i + 1 < cues.length) {
      const now = Math.abs(end - start - target);
      const merged = Math.abs(cues[i + 1].end - start - target);
      if (merged >= now) break;
      i++;
      end = cues[i].end;
      text = `${text} ${cues[i].text}`.trim();
    }

    const duration = end - start;

    // Still much longer than the target: divide it.
    if (duration > target * 1.6) {
      const pieces = Math.max(2, Math.round(duration / target));
      const step = duration / pieces;
      const texts = splitWords(text, pieces);

      for (let p = 0; p < pieces; p++) {
        blocks.push({
          start: Math.round(start + step * p),
          end: Math.round(start + step * (p + 1)),
          text: texts[p] ?? texts[texts.length - 1],
        });
      }
    } else {
      blocks.push({ start, end, text });
    }

    i++;
  }

  return blocks;
}

/**
 * Raises the target until the block count fits the per-job ceiling, so a very
 * long or very granular transcript degrades gracefully instead of being
 * rejected. Returns the blocks and the target actually used.
 */
export function fitCues(
  cues: Cue[],
  targetSeconds: number,
  maxBlocks: number,
): { blocks: Block[]; targetSeconds: number } {
  let target = targetSeconds;
  let blocks = normaliseCues(cues, target);

  while (blocks.length > maxBlocks && target < MAX_TARGET_SECONDS) {
    target = Math.min(MAX_TARGET_SECONDS, target + 1);
    blocks = normaliseCues(cues, target);
  }

  return { blocks: blocks.slice(0, maxBlocks), targetSeconds: target };
}

/* ----------------------------------------------------------------- display */

/** `00:01:47` — used in ZIP filenames, so it must sort lexically. */
export function formatTimecode(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

/** Filename-safe variant: `00-01-47`. */
export function timecodeSlug(ms: number): string {
  return formatTimecode(ms).replace(/:/g, "-");
}

/** The narration with its timestamps stripped, for storing as the script. */
export function cuesToPlainText(cues: Cue[]): string {
  return cues.map((c) => c.text).join(" ").replace(/\s+/g, " ").trim();
}
