import Link from "next/link";
import Wordmark from "@/components/Wordmark";

export default function NotFound() {
  return (
    <main className="tooth flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <Link href="/" aria-label="Cutframe home">
        <Wordmark size={26} />
      </Link>
      <p className="mt-12 font-mono text-[13px] text-[var(--ink-faint)]">404</p>
      <h1 className="display mt-3 text-[38px]">This frame doesn&apos;t exist</h1>
      <p className="hint mx-auto mt-3 max-w-sm">
        The page you were after has moved or was never here. Nothing you&apos;ve
        made has been lost.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/app" className="btn-primary">
          Your projects
        </Link>
        <Link href="/" className="btn-secondary">
          Home
        </Link>
      </div>
    </main>
  );
}
