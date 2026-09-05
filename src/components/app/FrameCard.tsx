import type { Frame } from "@/components/app/FrameDialog";
import { sceneOf } from "@/lib/text";

export default function FrameCard({
  frame,
  onOpen,
}: {
  frame: Frame;
  onOpen?: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="card group overflow-hidden text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--lift-2)]"
    >
      <div className="relative aspect-video bg-[var(--paper-sunk)]">
        {frame.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frame.url}
            alt={`Frame ${frame.idx + 1}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : frame.status === "running" ? (
          <div className="shimmer h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[12px] text-[var(--ink-faint)]">
            {frame.status === "failed" ? "Failed" : "Queued"}
          </div>
        )}

        <span className="absolute left-2 top-2 rounded bg-black/55 px-1.5 py-0.5 font-mono text-[10px] text-white">
          {String(frame.idx + 1).padStart(3, "0")}
        </span>

        {frame.status === "failed" && (
          <span className="absolute right-2 top-2 rounded bg-[var(--bad)] px-1.5 py-0.5 text-[10px] text-white">
            failed
          </span>
        )}

        {frame.status === "done" && (
          <span className="pointer-events-none absolute inset-0 flex items-end justify-end p-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            <span className="rounded bg-black/60 px-2 py-1 text-[11px] text-white">
              Open
            </span>
          </span>
        )}
      </div>

      {/* Padding lives on the wrapper: a -webkit-box clamping element with its
          own padding measures awkwardly and can show a sliver of a third line. */}
      <div className="px-3 py-2.5">
        <p className="clamp-2 text-[12px] leading-relaxed text-[var(--ink-muted)]">
          {sceneOf(frame.prompt)}
        </p>
      </div>
    </button>
  );
}
