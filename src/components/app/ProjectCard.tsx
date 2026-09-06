import Link from "next/link";
import { resolveJobStyle } from "@/lib/styles";
import StyleSwatch from "@/components/StyleSwatch";
import JobStatusChip from "@/components/app/JobStatusChip";

export type ProjectSummary = {
  id: string;
  title: string;
  status: string;
  image_count: number;
  style_id: string;
  /** Snapshot of the style used. NULL on jobs from before migration 002. */
  style?: unknown;
  created_at: string;
};

export default function ProjectCard({
  job,
  thumbnail,
}: {
  job: ProjectSummary;
  thumbnail?: string;
}) {
  const style = resolveJobStyle(job);

  return (
    <Link
      href={`/app/jobs/${job.id}`}
      className="card group block overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--lift-2)]"
    >
      {thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnail}
          alt=""
          className="aspect-video w-full bg-[var(--paper-sunk)] object-cover"
        />
      ) : (
        <StyleSwatch style={style} className="aspect-video w-full" />
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <h2 className="clamp-2 text-[15px] font-medium leading-snug">
            {job.title}
          </h2>
          <JobStatusChip status={job.status} />
        </div>
        <p className="mt-2 text-[13px] text-[var(--ink-faint)]">
          {style.name} · {job.image_count} images ·{" "}
          {new Date(job.created_at).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          })}
        </p>
      </div>
    </Link>
  );
}
