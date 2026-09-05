"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { STYLE_PRESETS, DEFAULT_STYLE_ID } from "@/lib/styles";
import { DENSITY_OPTIONS, estimateImageCount, LIMITS } from "@/lib/config";
import StyleSwatch from "@/components/StyleSwatch";

export default function NewProjectForm({ credits }: { credits: number }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [styleId, setStyleId] = useState<string>(DEFAULT_STYLE_ID);
  const [density, setDensity] = useState("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const words = useMemo(
    () => script.trim().split(/\s+/).filter(Boolean).length,
    [script],
  );
  const estimate = useMemo(
    () => (words > 0 ? estimateImageCount(script, density) : 0),
    [script, density, words],
  );

  // 150 words a minute is the usual narration pace.
  const minutes = words > 0 ? Math.max(1, Math.round(words / 150)) : 0;
  const tooShort = words < 20;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, script, styleId, density }),
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
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"
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
              {minutes > 0 && ` · about ${minutes} min narrated`}
            </span>
          </div>
          <textarea
            id="project-script"
            className="field min-h-[420px] resize-y font-mono text-[13.5px] leading-[1.7]"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder={
              "Paste the script exactly as it will be narrated.\n\nPlain prose works best — no timestamps, speaker labels or stage directions. Cutframe reads the whole thing for context before it writes a single prompt."
            }
            maxLength={LIMITS.maxScriptChars}
            required
          />
        </div>
      </div>

      {/* ------------------------------------------------------ settings */}
      <div className="space-y-6 lg:sticky lg:top-24">
        <div>
          <span className="label">Style</span>
          <div className="grid grid-cols-2 gap-2.5">
            {STYLE_PRESETS.map((s) => {
              const selected = styleId === s.id;
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setStyleId(s.id)}
                  aria-pressed={selected}
                  title={s.blurb}
                  className={`overflow-hidden rounded-[10px] border text-left transition-all duration-150 ${
                    selected
                      ? "border-[var(--clay)] shadow-[var(--lift-1)] ring-1 ring-[var(--clay)]"
                      : "border-[var(--line)] hover:border-[var(--line-strong)]"
                  }`}
                >
                  <StyleSwatch style={s} className="aspect-[16/9] w-full" />
                  <span className="block px-2.5 py-2 text-[12.5px] font-medium leading-tight">
                    {s.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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
        </div>

        <div className="card p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[13.5px] text-[var(--ink-muted)]">
              Estimated images
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
