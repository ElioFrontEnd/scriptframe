/**
 * The mechanism, shown rather than described.
 *
 * Everything here is real: the excerpt is a plain narration script, and the
 * scene lines are the shape of prompt Cutframe actually writes — one per beat,
 * self-contained, with the style block appended before it reaches the image
 * model. No invented output images; the frames are numbered placeholders until
 * real sample sets are dropped into public/samples.
 */

const BEATS = [
  {
    n: 1,
    narration:
      "In 1783, a crack eight miles long opened across the south of Iceland.",
    scene:
      "A long dark fissure splitting a bare highland plain, seen from a low angle at dusk, thin steam rising along its length",
  },
  {
    n: 2,
    narration:
      "For the next eight months it poured out more lava than any eruption in recorded history.",
    scene:
      "A wide river of molten rock crawling across black rock toward the horizon, glowing orange against a smoke-dark sky",
  },
  {
    n: 3,
    narration:
      "The haze it produced drifted south and settled over Europe like a dry fog.",
    scene:
      "A hazy sun low over a European farming village, pale yellow light, fields and thatched roofs dulled by fog",
  },
];

export default function HeroDemo() {
  return (
    <div className="card overflow-hidden shadow-[var(--lift-3)]">
      {/* Window chrome — signals "this is the tool", cheaply. */}
      <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--paper-sunk)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--line-strong)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--line-strong)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--line-strong)]" />
        <span className="ml-2 font-mono text-[11px] text-[var(--ink-faint)]">
          the-laki-eruption.txt
        </span>
      </div>

      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Script side */}
        <div className="border-b border-[var(--line)] p-6 md:border-b-0 md:border-r">
          <div className="eyebrow mb-4">Your script</div>
          <div className="space-y-3">
            {BEATS.map((b) => (
              <p
                key={b.n}
                className="relative pl-6 text-[14px] leading-relaxed text-[var(--ink)]"
              >
                <span className="absolute left-0 top-[3px] font-mono text-[11px] text-[var(--clay)]">
                  {String(b.n).padStart(2, "0")}
                </span>
                {b.narration}
              </p>
            ))}
            <p className="pl-6 text-[14px] leading-relaxed text-[var(--ink-faint)]">
              Within a year, crops failed from Norway to northern Italy…
            </p>
          </div>
        </div>

        {/* Prompts + frames side */}
        <div className="bg-[var(--paper-sunk)] p-6">
          <div className="eyebrow mb-4">What Cutframe writes</div>
          <div className="space-y-2.5">
            {BEATS.map((b) => (
              <div
                key={b.n}
                className="flex gap-3 rounded-[10px] border border-[var(--line)] bg-[var(--paper-raised)] p-3"
              >
                <div className="flex h-12 w-[74px] shrink-0 items-center justify-center rounded-[6px] bg-[var(--paper-deep)]">
                  <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                    {String(b.n).padStart(3, "0")}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="clamp-2 text-[12.5px] leading-snug text-[var(--ink-muted)]">
                    {b.scene}
                  </p>
                  <span className="mt-1.5 inline-block rounded bg-[var(--clay-soft)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--clay)]">
                    + style block
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] leading-relaxed text-[var(--ink-faint)]">
            Every prompt carries the full style description, so frame 97 matches
            frame 3.
          </p>
        </div>
      </div>
    </div>
  );
}
