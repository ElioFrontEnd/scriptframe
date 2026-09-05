import Link from "next/link";
import NewProjectForm from "@/components/app/NewProjectForm";
import { getUserWithProfile } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const { credits } = await getUserWithProfile();

  return (
    <div>
      <Link
        href="/app"
        className="text-[13px] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
      >
        ← Projects
      </Link>
      <h1 className="display mt-3 text-[34px]">New project</h1>
      <p className="hint mt-1.5 max-w-lg">
        Paste the narration exactly as you&apos;ll record it. Writing the
        prompts is free — you&apos;ll see every one and can edit them before any
        credits are spent.
      </p>

      <div className="mt-9">
        <NewProjectForm credits={credits} />
      </div>
    </div>
  );
}
