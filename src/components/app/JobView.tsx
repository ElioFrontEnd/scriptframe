"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStyle } from "@/lib/styles";
import JobStatusChip from "@/components/app/JobStatusChip";
import FrameDialog from "@/components/app/FrameDialog";
import FrameCard from "@/components/app/FrameCard";
import type { JobPayload } from "@/lib/jobPayload";

export default function JobView({
  jobId,
  initial,
}: {
  jobId: string;
  initial: JobPayload;
}) {
  const router = useRouter();
  // Seeded from the server render, so the screen paints with real frames rather
  // than a skeleton and there's no fetch-on-mount round trip.
  const [data, setData] = useState<JobPayload>(initial);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  // Stops a slow batch from overlapping with the next poll.
  const ticking = useRef(false);
  // Finished-frame count from the last tick, so we only reload when it moves.
  const lastCompleted = useRef(-1);

  const load = useCallback(async () => {
    const res = await fetch(`/api/jobs/${jobId}`);
    if (!res.ok) return;
    setData(await res.json());
  }, [jobId]);

  // Drives generation while the tab is open. The cron sweep finishes anything
  // left behind if it isn't, so this is for responsiveness, not correctness.
  //
  // The tick response carries the finished count, so the full job payload — which
  // re-signs a URL for every frame — is only re-fetched when that count actually
  // moves. On a 300-frame set that is the difference between re-sending every
  // URL twice a second and once per completed batch.
  useEffect(() => {
    if (data?.job.status !== "running") return;
    let cancelled = false;

    async function pump() {
      if (ticking.current || cancelled) return;
      ticking.current = true;
      try {
        const res = await fetch(`/api/jobs/${jobId}/tick`, { method: "POST" });
        if (!res.ok) return;

        const body = (await res.json()) as { completed?: number; done?: boolean };
        const changed = body.completed !== lastCompleted.current;
        lastCompleted.current = body.completed ?? lastCompleted.current;

        if (changed || body.done) await load();
      } catch {
        // Transient — the interval retries.
      } finally {
        ticking.current = false;
      }
    }

    pump();
    const timer = setInterval(pump, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [data?.job.status, jobId, load]);

  const start = async () => {
    setError("");
    setStarting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/start`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not start");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  };

  const regenerate = useCallback(
    async (frameId: string, prompt: string): Promise<string | null> => {
      try {
        const res = await fetch(
          `/api/jobs/${jobId}/images/${frameId}/regenerate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt }),
          },
        );
        const body = await res.json();
        if (!res.ok) return body.error ?? "Could not regenerate";
        await load();
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    },
    [jobId, load],
  );

  async function remove() {
    if (!confirm("Delete this project and all its images? This can't be undone."))
      return;
    await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    router.push("/app");
    router.refresh();
  }

  const { job, images, progress } = data;
  const style = getStyle(job.style_id);
  const isReady = job.status === "prompts_ready";
  const isRunning = job.status === "running";
  const isDone = job.status === "completed";
  const pending = images.filter((i) => i.status === "pending").length;
  const pct = progress.total
    ? Math.round(((progress.done + progress.failed) / progress.total) * 100)
    : 0;

  return (
    <div className="pb-24">
      {/* ------------------------------------------------------------ head */}
      <Link
        href="/app"
        className="text-[13px] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
      >
        ← Projects
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="display truncate text-[32px]">{job.title}</h1>
            <JobStatusChip status={job.status} />
          </div>
          <p className="hint mt-1.5">
            {style.name} · {progress.total} frames
            {job.credits_spent > 0 && ` · ${job.credits_spent} credits spent`}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          {isDone && progress.done > 0 && (
            <a href={`/api/jobs/${jobId}/zip`} className="btn-primary">
              Download ZIP
            </a>
          )}
          {!isRunning && (
            <button onClick={remove} className="btn-secondary">
              Delete
            </button>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------- status */}
      {isReady && (
        <div className="card mt-7 p-5">
          <h2 className="text-[16px] font-medium">
            Read the prompts before you spend
          </h2>
          <p className="hint mt-1.5 max-w-2xl">
            Click any frame to see its prompt and edit it. Generating{" "}
            {pending} frames costs {pending} credits — you have{" "}
            {data.credits.toLocaleString()}.
          </p>
          {error && (
            <p className="mt-3 rounded-[8px] bg-[var(--bad-soft)] px-3 py-2 text-[13px] text-[var(--bad)]">
              {error}
            </p>
          )}
          <button
            onClick={start}
            disabled={starting || data.credits < pending}
            className="btn-primary mt-4"
          >
            {starting ? "Starting…" : `Generate ${pending} frames`}
          </button>
          {data.credits < pending && (
            <Link href="/app/billing" className="btn-quiet ml-2">
              Buy credits
            </Link>
          )}
        </div>
      )}

      {isRunning && (
        <div className="card mt-7 p-5">
          <div className="mb-2.5 flex items-baseline justify-between">
            <span className="text-[15px] font-medium">Generating…</span>
            <span className="text-[13px] text-[var(--ink-muted)]">
              {progress.done + progress.failed} of {progress.total}
            </span>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full bg-[var(--paper-sunk)]"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full bg-[var(--clay)] transition-[width] duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="hint mt-3">
            You can close this tab — it keeps going and the set will be here
            when you come back.
          </p>
        </div>
      )}

      {isDone && job.error && (
        <div className="mt-7 rounded-[10px] bg-[var(--warn-soft)] px-4 py-3 text-[13.5px] text-[var(--warn)]">
          {job.error}. Those credits went back to your balance — open any failed
          frame to try it again.
        </div>
      )}

      {job.status === "failed" && (
        <div className="mt-7 rounded-[10px] bg-[var(--bad-soft)] px-4 py-3 text-[13.5px] text-[var(--bad)]">
          {job.error ?? "This project failed."}
        </div>
      )}

      {/* ---------------------------------------------------------- frames */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((frame) => (
          <FrameCard
            key={frame.id}
            frame={frame}
            onOpen={() => setOpenIdx(frame.idx)}
          />
        ))}
      </div>

      {openIdx !== null && images[openIdx] !== undefined && (
        <FrameDialog
          key={images[openIdx].id}
          frame={images[openIdx]}
          total={images.length}
          canRegenerate={isDone || job.status === "failed"}
          credits={data.credits}
          onClose={() => setOpenIdx(null)}
          onStep={(delta) =>
            setOpenIdx((i) =>
              i === null ? i : (i + delta + images.length) % images.length,
            )
          }
          onRegenerate={regenerate}
        />
      )}
    </div>
  );
}
