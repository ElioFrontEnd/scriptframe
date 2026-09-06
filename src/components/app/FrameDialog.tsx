"use client";

import { useEffect, useRef, useState } from "react";
import { formatTimecode } from "@/lib/transcript";

export type Frame = {
  id: string;
  idx: number;
  prompt: string;
  status: "pending" | "running" | "done" | "failed";
  error: string | null;
  url: string | null;
  /** Milliseconds into the video, when the script was a timed transcript. */
  startMs?: number | null;
};

/**
 * A single frame, large, with its prompt editable and a regenerate action.
 *
 * This is where a wrong frame gets fixed — the most common real-world need
 * once a set is finished, and the reason the whole set doesn't have to be
 * paid for twice.
 */
export default function FrameDialog({
  frame,
  total,
  canRegenerate,
  credits,
  onClose,
  onStep,
  onRegenerate,
}: {
  frame: Frame;
  total: number;
  canRegenerate: boolean;
  credits: number;
  onClose: () => void;
  onStep: (delta: number) => void;
  onRegenerate: (frameId: string, prompt: string) => Promise<string | null>;
}) {
  // State resets between frames because JobView gives this a key of frame.id,
  // which is cheaper and less error-prone than syncing it in an effect.
  const [prompt, setPrompt] = useState(frame.prompt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onStep(-1);
      if (e.key === "ArrowRight") onStep(1);
    }
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onStep]);

  const dirty = prompt.trim() !== frame.prompt.trim();

  async function regenerate() {
    setBusy(true);
    setError("");
    const message = await onRegenerate(frame.id, prompt.trim());
    if (message) setError(message);
    setBusy(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(18,16,14,0.72)] p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Frame ${frame.idx + 1} of ${total}`}
        tabIndex={-1}
        className="fade-up grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[16px] bg-[var(--paper-raised)] shadow-[var(--lift-3)] outline-none md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
      >
        {/* Image */}
        <div className="relative flex items-center justify-center bg-[var(--paper-deep)] p-3">
          {frame.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={frame.url}
              alt={`Frame ${frame.idx + 1}`}
              className="max-h-[52vh] w-full rounded-[8px] object-contain md:max-h-[80vh]"
            />
          ) : (
            <div className="flex aspect-video w-full items-center justify-center rounded-[8px] bg-[#2a2621] text-[13px] text-[#8a8175]">
              {frame.status === "failed" ? "This frame failed" : "Not generated yet"}
            </div>
          )}

          <button
            onClick={() => onStep(-1)}
            aria-label="Previous frame"
            className="absolute left-5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/70"
          >
            ‹
          </button>
          <button
            onClick={() => onStep(1)}
            aria-label="Next frame"
            className="absolute right-5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white transition-colors hover:bg-black/70"
          >
            ›
          </button>
        </div>

        {/* Prompt + actions */}
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
            <span className="font-mono text-[12px] text-[var(--ink-muted)]">
              {String(frame.idx + 1).padStart(3, "0")} / {String(total).padStart(3, "0")}
              {frame.startMs !== null && frame.startMs !== undefined && (
                <span className="ml-2 text-[var(--clay)]">
                  {formatTimecode(frame.startMs)}
                </span>
              )}
            </span>
            <button onClick={onClose} className="btn-quiet" aria-label="Close">
              Close
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <label className="label" htmlFor="frame-prompt">
              Prompt
            </label>
            <textarea
              id="frame-prompt"
              className="field min-h-[180px] resize-y font-mono text-[12.5px] leading-relaxed"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={busy}
            />
            <p className="hint mt-2">
              The tail of this prompt is the style description. Changing the
              scene at the front is usually all you need; leave the style intact
              so the frame still matches the set.
            </p>

            {frame.error && (
              <p className="mt-3 rounded-[8px] bg-[var(--bad-soft)] px-3 py-2 text-[12.5px] text-[var(--bad)]">
                {frame.error}
              </p>
            )}
            {error && (
              <p className="mt-3 rounded-[8px] bg-[var(--bad-soft)] px-3 py-2 text-[12.5px] text-[var(--bad)]">
                {error}
              </p>
            )}
          </div>

          <div className="border-t border-[var(--line)] p-5">
            {canRegenerate ? (
              <>
                <button
                  onClick={regenerate}
                  disabled={busy || credits < 1}
                  className="btn-primary w-full"
                >
                  {busy
                    ? "Regenerating…"
                    : dirty
                      ? "Save prompt and regenerate"
                      : "Regenerate this frame"}
                </button>
                <p className="mt-2 text-center text-[12.5px] text-[var(--ink-faint)]">
                  {credits < 1
                    ? "You're out of credits."
                    : "Costs 1 credit. The current frame is kept if it fails."}
                </p>
              </>
            ) : (
              <p className="text-center text-[13px] text-[var(--ink-faint)]">
                Available once the set has finished generating.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
