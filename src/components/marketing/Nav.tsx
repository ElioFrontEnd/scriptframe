import Link from "next/link";
import Wordmark from "@/components/Wordmark";

export default function Nav() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--paper)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
        <Link href="/" aria-label="Cutframe home">
          <Wordmark />
        </Link>

        <nav className="hidden items-center gap-7 text-[14px] text-[var(--ink-muted)] md:flex">
          <Link className="transition-colors hover:text-[var(--ink)]" href="/#how">
            How it works
          </Link>
          <Link className="transition-colors hover:text-[var(--ink)]" href="/#styles">
            Styles
          </Link>
          <Link className="transition-colors hover:text-[var(--ink)]" href="/#pricing">
            Pricing
          </Link>
          <Link className="transition-colors hover:text-[var(--ink)]" href="/#faq">
            FAQ
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/signin"
            className="text-[14px] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
          >
            Sign in
          </Link>
          <Link href="/signin" className="btn-primary btn-sm">
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
