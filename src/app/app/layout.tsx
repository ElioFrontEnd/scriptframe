import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import AccountMenu from "@/components/app/AccountMenu";
import { getUserWithProfile } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, credits } = await getUserWithProfile();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--paper)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-7 px-6">
          <Link href="/app" aria-label="Cutframe">
            <Wordmark />
          </Link>

          <nav className="hidden items-center gap-5 text-[14px] text-[var(--ink-muted)] sm:flex">
            <Link className="transition-colors hover:text-[var(--ink)]" href="/app">
              Projects
            </Link>
            <Link
              className="transition-colors hover:text-[var(--ink)]"
              href="/app/billing"
            >
              Credits
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/app/billing"
              className="flex items-center gap-1.5 rounded-full border border-[var(--line-strong)] bg-[var(--paper-raised)] px-3 py-1.5 text-[13px] transition-colors hover:bg-[var(--paper-sunk)]"
              title="Credits remaining"
            >
              <span className="font-medium text-[var(--ink)]">
                {credits.toLocaleString()}
              </span>
              <span className="text-[var(--ink-faint)]">credits</span>
            </Link>
            <AccountMenu email={user.email ?? ""} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>

      <footer className="border-t border-[var(--line)] py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-x-5 gap-y-2 px-6 text-[13px] text-[var(--ink-faint)]">
          <span>© {new Date().getFullYear()} Cutframe</span>
          <Link className="hover:text-[var(--ink-muted)]" href="/terms">
            Terms
          </Link>
          <Link className="hover:text-[var(--ink-muted)]" href="/privacy">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
