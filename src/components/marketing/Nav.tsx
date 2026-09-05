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
          <a className="transition-colors hover:text-[var(--ink)]" href="#how">
            How it works
          </a>
          <a className="transition-colors hover:text-[var(--ink)]" href="#styles">
            Styles
          </a>
          <a className="transition-colors hover:text-[var(--ink)]" href="#pricing">
            Pricing
          </a>
          <a className="transition-colors hover:text-[var(--ink)]" href="#faq">
            FAQ
          </a>
        </nav>

        <a href="#start" className="btn-primary btn-sm ml-auto">
          Start free
        </a>
      </div>
    </header>
  );
}
