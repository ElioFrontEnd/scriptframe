import Link from "next/link";
import { requireUserPage, createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/storage";
import ProjectCard from "@/components/app/ProjectCard";
import EmptyProjects from "@/components/app/EmptyProjects";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const user = await requireUserPage();
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, status, image_count, style_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);

  // One thumbnail per project: the earliest frame that finished. Fetched for
  // every listed job in a single query rather than one round trip each.
  const ids = (jobs ?? []).map((j) => j.id);
  const thumbs: Record<string, string> = {};

  if (ids.length) {
    const { data: images } = await supabase
      .from("job_images")
      .select("job_id, idx, storage_key")
      .in("job_id", ids)
      .eq("status", "done")
      .order("idx")
      .limit(1000);

    const firstKeyByJob: Record<string, string> = {};
    for (const img of images ?? []) {
      if (img.storage_key && !firstKeyByJob[img.job_id]) {
        firstKeyByJob[img.job_id] = img.storage_key;
      }
    }

    const urls = await signedImageUrls(Object.values(firstKeyByJob));
    for (const [jobId, key] of Object.entries(firstKeyByJob)) {
      if (urls[key]) thumbs[jobId] = urls[key];
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-[34px]">Projects</h1>
          <p className="hint mt-1.5">
            {jobs?.length
              ? `${jobs.length} project${jobs.length === 1 ? "" : "s"}`
              : "Nothing here yet"}
          </p>
        </div>
        <Link href="/app/new" className="btn-primary">
          New project
        </Link>
      </div>

      {!jobs?.length ? (
        <EmptyProjects />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <li key={job.id}>
              <ProjectCard job={job} thumbnail={thumbs[job.id]} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
