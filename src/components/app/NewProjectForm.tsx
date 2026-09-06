"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_STYLE_ID } from "@/lib/styles";
import { DENSITY_OPTIONS, estimateImageCount, LIMITS } from "@/lib/config";
import {
  parseTranscript,
  fitCues,
  formatTimecode,
  DEFAULT_TARGET_SECONDS,
  MIN_TARGET_SECONDS,
  MAX_TARGET_SECONDS,
} from "@/lib/transcript";
import StylePicker, {
  type CustomStyle,
  type StyleChoice,
} from "@/components/app/StylePicker";

export default function NewProjectForm({
  credits,
  customStyles,
  previews,
}: {
  credits: number;
  customStyles: CustomStyle[];
  /** Rendered preset previews by style id; empty until they've been generated. */
  previews: Record<string, string>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [style, setStyle] = useState<StyleChoice>({
    kind: "preset",
    id: DEFAULT_STYLE_ID,
  });
  const [density, setDensity] = useState("standard");
  const [targetSeconds, setTargetSeconds] = useState(DEFAULT_TARGET_SECONDS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const words = useMemo(
    () => script.trim().split(/\s+/).filter(Boolean).length,
    [script],
  );

  // Parsing runs in the browser so the count updates as they paste, before a
  // single credit is at stake. The server repeats it — this is for feedback,
  // never for authority.
  const cues = useMemo(() => parseTranscript(script), [script]);
  const timed = cues.length > 0;

  const fitted = useMemo(
    () => (timed ? fitCues(cues, targetSeconds, LIMITS.maxImagesPerJob) : null),
    [cues, targetSeconds, timed],
  );

  const estimate = useMemo(() => {
    if (timed) return fitted?.blocks.length ?? 0;
    return words > 0 ? estimateImageCount(script, density) : 0;
  }, [timed, fitted, words, script, density]);

  // 150 words a minute is the usual narration pace for an untimed script.
  const minutes = timed
    ? Math.max(1, Math.round((cues[cues.length - 1]?.end ?? 0) / 60_000))
    : words > 0
      ? Math.max(1, Math.round(words / 150))
      : 0;

  const tooShort = words < 20;
  const clamped = !!fitted && fitted.targetSeconds !== targetSeconds;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          script,
          density,
          targetSeconds,
          ...(style.kind === "preset"
            ? { styleId: style.id }
            : { customStyleId: style.id }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      router.push(`/app/jobs/${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start"
    >
      {/* -------------------------------------------------------- script */}
      <div className="space-y-6">
        <div>
          <label className="label" htmlFor="project-title">
            Project name
          </label>
          <input
            id="project-title"
            className="field"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional — we'll use the opening line"
            maxLength={120}
          />
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label className="label mb-0" htmlFor="project-script">
              Narration script
            </label>
            <span className="text-[12.5px] text-[var(--ink-faint)]">
              {words.toLocaleString()} words
              {minutes > 0 && ` · about ${minutes} min`}
            </span>
          </div>
          <textarea
            id="project-script"
            className="field min-h-[420px] resize-y font-mono text-[13.5px] leading-[1.7]"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder={
              "Paste the script exactly as it will be narrated.\n\nPlain prose works, and so does a timestamped transcript — an SRT or VTT from your voiceover, or lines beginning [00:12]. If timestamps are there, Cutframe follows them instead of guessing the pacing."
            }
            maxLength={LIMITS.maxScriptChars}
            required
          />

          {timed && (
            <div className="fade-up mt-3 rounded-[10px] border border-[var(--clay)] bg-[var(--clay-soft)] p-4">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--clay)]" />
                <span className="text-[13.5px] font-medium text-[var(--ink)]">
                  Timestamped transcript detected
                </span>
              </div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-muted)]">
                {cues.length} cues over{" "}
                {formatTimecode(cues[cues.length - 1]?.end ?? 0)} →{" "}
                <strong className="font-medium text-[var(--ink)]">
                  {estimate} images
                </strong>{" "}
                at about {fitted?.targetSeconds ?? targetSeconds}s each. Frames
                will be named by timecode so they drop into your timeline in
                sync.
              </p>
              {clamped && (
                <p className="mt-2 text-[12.5px] text-[var(--warn)]">
                  Stretched to {fitted?.targetSeconds}s per image to stay under
                  the {LIMITS.maxImagesPerJob}-frame limit for one project.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------ settings */}
      <div className="space-y-6 lg:sticky lg:top-24">
        <StylePicker
          value={style}
          onChange={(choice) => setStyle(choice)}
          initialCustom={customStyles}
          previews={previews}
        />

        {/* Timing comes from the transcript when there is one, so the pacing
            estimate is replaced by a seconds-per-image control. */}
        {timed ? (
          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <span className="label mb-0">Seconds per image</span>
              <span className="font-mono text-[13px] text-[var(--clay)]">
                {targetSeconds}s
              </span>
            </div>
            <input
              type="range"
              min={MIN_TARGET_SECONDS}
              max={MAX_TARGET_SECONDS}
              step={1}
              value={targetSeconds}
              onChange={(e) => setTargetSeconds(Number(e.target.value))}
              className="w-full accent-[var(--clay)]"
              aria-label="Seconds per image"
            />
            <p className="hint mt-2 text-[12.5px]">
              Cutframe merges cues that are shorter than this and splits ones
              that run longer, so every frame lands near {targetSeconds}s
              without drifting off your timings.
            </p>
          </div>
        ) : (
          <div>
            <span className="label">Pacing</span>
            <div className="grid gap-1.5">
              {DENSITY_OPTIONS.map((d) => {
                const selected = density === d.id;
                return (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => setDensity(d.id)}
                    aria-pressed={selected}
                    className={`flex items-center justify-between rounded-[9px] border px-3.5 py-2.5 text-[14px] transition-colors ${
                      selected
                        ? "border-[var(--clay)] bg-[var(--clay-soft)] text-[var(--ink)]"
                        : "border-[var(--line)] hover:bg-[var(--paper-sunk)]"
                    }`}
                  >
                    <span className="font-medium">{d.label}</span>
                    <span className="text-[12.5px] text-[var(--ink-faint)]">
                      {d.note}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="hint mt-2 text-[12.5px]">
              Paste a timestamped transcript instead and Cutframe follows its
              timing exactly.
            </p>
          </div>
        )}

        <div className="card p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13.5px] text-[var(--ink-muted)]">
              {timed ? "Images" : "Estimated images"}
            </span>
            <span
              className="text-[26px] leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {estimate || "—"}
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between border-t border-[var(--line)] pt-3">
            <span className="text-[13.5px] text-[var(--ink-muted)]">
              Your balance
            </span>
            <span className="text-[14px] font-medium">
              {credits.toLocaleString()}
            </span>
          </div>

          {estimate > credits && estimate > 0 && (
            <p className="mt-3 rounded-[8px] bg-[var(--warn-soft)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--warn)]">
              You&apos;ll need about {estimate - credits} more credits to
              generate this set. You can still write the prompts for free.
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-[8px] bg-[var(--bad-soft)] px-3 py-2.5 text-[13px] text-[var(--bad)]">
            {error}
          </p>
        )}

        <div>
          <button className="btn-primary w-full" disabled={busy || tooShort}>
            {busy ? "Writing prompts…" : "Write the prompts"}
          </button>
          <p className="mt-2.5 text-center text-[12.5px] text-[var(--ink-faint)]">
            {busy
              ? "A long script takes a few seconds. Don't close the tab."
              : tooShort
                ? "Paste at least a couple of sentences to begin."
                : "Free — no credits spent at this step."}
          </p>
        </div>
      </div>
    </form>
  );
}
