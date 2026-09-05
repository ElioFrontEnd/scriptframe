import Link from "next/link";

export default function EmptyProjects() {
  return (
    <div className="card tooth flex flex-col items-center px-6 py-20 text-center">
      <div className="mb-6 flex gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-11 w-16 rounded-[5px] border border-[var(--line-strong)] bg-[var(--paper-sunk)]"
            style={{ opacity: 1 - i * 0.22 }}
          />
        ))}
      </div>
      <h2 className="display text-[26px]">Your first set starts with a script</h2>
      <p className="hint mx-auto mt-3 max-w-sm">
        Paste the narration you&apos;ve already written. Cutframe splits it into
        beats, writes a prompt for each one, and shows you all of them before
        anything is spent.
      </p>
      <Link href="/app/new" className="btn-primary mt-7">
        New project
      </Link>
      <p className="mt-4 text-[13px] text-[var(--ink-faint)]">
        Writing prompts is free — you only spend credits when you generate.
      </p>
    </div>
  );
}
