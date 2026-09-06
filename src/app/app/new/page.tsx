import Link from "next/link";
import NewProjectForm from "@/components/app/NewProjectForm";
import type { CustomStyle } from "@/components/app/StylePicker";
import { getUserWithProfile, createClient } from "@/lib/supabase/server";
import { signedImageUrls } from "@/lib/storage";
import { stylePreviews } from "@/lib/previews";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const { user, credits } = await getUserWithProfile();
  const supabase = await createClient();

  // Fetched here rather than in the client so the picker has them on first
  // paint and there's no fetch-on-mount.
  const { data: rows } = await supabase
    .from("custom_styles")
    .select("id, name, block, guidance, swatch, texture, reference_key")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const styles = rows ?? [];
  const urls = await signedImageUrls(
    styles.map((s) => s.reference_key).filter((k): k is string => !!k),
  );

  const customStyles: CustomStyle[] = styles.map((s) => ({
    id: s.id,
    name: s.name,
    block: s.block,
    guidance: s.guidance,
    swatch: s.swatch ?? [],
    texture: s.texture,
    referenceUrl: s.reference_key ? (urls[s.reference_key] ?? null) : null,
  }));

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
        <NewProjectForm
        credits={credits}
        customStyles={customStyles}
        previews={stylePreviews()}
      />
      </div>
    </div>
  );
}
