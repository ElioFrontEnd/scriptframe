import { notFound } from "next/navigation";
import JobView from "@/components/app/JobView";
import { requireUserPage, createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadJobPayload } from "@/lib/jobPayload";

export const dynamic = "force-dynamic";

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUserPage();
  const supabase = await createClient();

  // Ownership is established with the user-scoped client under RLS before the
  // service-role client is used to assemble the payload.
  const [{ data: job }, { data: profile }] = await Promise.all([
    supabase.from("jobs").select("id").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("credits").eq("id", user.id).single(),
  ]);

  if (!job) notFound();

  const initial = await loadJobPayload(
    createAdminClient(),
    id,
    profile?.credits ?? 0,
  );
  if (!initial) notFound();

  return <JobView jobId={id} initial={initial} />;
}
