import { notFound } from "next/navigation";
import ProjectCard, { type ProjectSummary } from "@/components/app/ProjectCard";
import EmptyProjects from "@/components/app/EmptyProjects";
import FrameCard from "@/components/app/FrameCard";
import type { Frame } from "@/components/app/FrameDialog";
import StyleSwatch from "@/components/StyleSwatch";
import JobStatusChip from "@/components/app/JobStatusChip";
import Wordmark from "@/components/Wordmark";
import BuyCredits from "@/components/app/BuyCredits";
import NewProjectForm from "@/components/app/NewProjectForm";
import { STYLE_PRESETS } from "@/lib/styles";

/**
 * Development-only gallery of the signed-in UI.
 *
 * The app's real screens need a Supabase session, which makes them impossible
 * to review with a screenshot tool. This page renders the same components with
 * fixture data so layout, spacing and states can actually be looked at.
 *
 * It 404s outside development — it is a workshop, not a feature.
 */
export const dynamic = "force-static";

/** Flat placeholder art so the grid has something in it. Obviously synthetic. */
function placeholder(a: string, b: string, c: string, seed: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90">
    <rect width="160" height="90" fill="${a}"/>
    <rect y="${52 + (seed % 5)}" width="160" height="38" fill="${b}"/>
    <circle cx="${34 + (seed * 13) % 90}" cy="${34 + (seed % 12)}" r="${14 + (seed % 7)}" fill="${c}"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const JOBS: ProjectSummary[] = [
  {
    id: "a",
    title: "The eruption that starved Europe",
    status: "completed",
    image_count: 96,
    style_id: "classical-oil",
    created_at: "2026-09-04T10:00:00Z",
  },
  {
    id: "b",
    title: "Why the Mediterranean once ran dry",
    status: "running",
    image_count: 74,
    style_id: "cinematic-realism",
    created_at: "2026-09-05T09:00:00Z",
  },
  {
    id: "c",
    title: "Five habits that quietly age you",
    status: "prompts_ready",
    image_count: 62,
    style_id: "storybook-watercolour",
    created_at: "2026-09-05T11:00:00Z",
  },
  {
    id: "d",
    title: "The night the sky turned red",
    status: "failed",
    image_count: 40,
    style_id: "dark-fantasy",
    created_at: "2026-09-03T08:00:00Z",
  },
];

const FRAMES: Frame[] = Array.from({ length: 8 }).map((_, i) => {
  const s = STYLE_PRESETS[0];
  const status: Frame["status"] =
    i === 5 ? "running" : i === 6 ? "failed" : i === 7 ? "pending" : "done";
  return {
    id: `f${i}`,
    idx: i,
    status,
    error: status === "failed" ? "Filtered by the safety checker" : null,
    url:
      status === "done"
        ? placeholder(s.swatch[0], s.swatch[1], s.swatch[2], i + 3)
        : null,
    prompt:
      "A long dark fissure splitting a bare highland plain, seen from a low angle at dusk, thin steam rising along its length. hand-drawn educational illustration on warm off-white paper…",
  };
});

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[var(--line)] py-12">
      <h2 className="eyebrow">{title}</h2>
      {note && <p className="hint mt-1">{note}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-4">
        <Wordmark size={26} />
        <h1 className="display mt-4 text-[32px]">Component preview</h1>
        <p className="hint mt-1.5 max-w-lg">
          Development only. Renders the signed-in components with fixture data
          so the design can be reviewed without a live session.
        </p>
      </header>

      <Section title="Project cards" note="Every status, with and without a thumbnail.">
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {JOBS.map((job, i) => (
            <li key={job.id}>
              <ProjectCard
                job={job}
                thumbnail={
                  i === 0
                    ? placeholder("#EDE0C8", "#A9743F", "#6E7F5C", 4)
                    : undefined
                }
              />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Status chips">
        <div className="flex flex-wrap gap-2">
          {["draft", "prompts_ready", "running", "completed", "failed"].map((s) => (
            <JobStatusChip key={s} status={s} />
          ))}
        </div>
      </Section>

      <Section title="Empty state">
        <EmptyProjects />
      </Section>

      <Section
        title="Frame grid"
        note="Done, generating, failed and queued frames together."
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {FRAMES.map((f) => (
            <FrameCard key={f.id} frame={f} />
          ))}
        </div>
      </Section>

      <Section title="Style swatches" note="Palette and surface per preset.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STYLE_PRESETS.map((s) => (
            <div key={s.id} className="card overflow-hidden">
              <StyleSwatch style={s} className="aspect-[16/9] w-full" />
              <p className="px-3 py-2 text-[12.5px] font-medium">{s.name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons and fields">
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn-primary">Primary action</button>
          <button className="btn-secondary">Secondary</button>
          <button className="btn-quiet">Quiet</button>
          <button className="btn-primary" disabled>
            Disabled
          </button>
        </div>
        <div className="mt-5 grid max-w-lg gap-3">
          <input className="field" placeholder="Text field" />
          <textarea className="field min-h-24" placeholder="Textarea" />
        </div>
      </Section>

      <Section title="Credit packs">
        <BuyCredits />
      </Section>

      <Section
        title="Credit packs, arriving from the pricing table"
        note="What someone sees after clicking Get Creator on the landing page and signing in."
      >
        <BuyCredits preselect="creator" />
      </Section>

      <Section
        title="New project"
        note="Paste a timestamped transcript into the script box — the timing panel and the seconds-per-image slider replace the pacing buttons."
      >
        <NewProjectForm credits={840} customStyles={[]} previews={{}} />
      </Section>
    </div>
  );
}
