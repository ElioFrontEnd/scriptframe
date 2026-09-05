"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SUPPORT_EMAIL } from "@/lib/config";

export default function AccountMenu({ email }: { email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (email[0] ?? "?").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--paper-raised)] text-[14px] font-medium transition-colors hover:bg-[var(--paper-sunk)]"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="fade-up absolute right-0 top-11 w-60 overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--paper-raised)] shadow-[var(--lift-3)]"
        >
          <div className="border-b border-[var(--line)] px-4 py-3">
            <p className="truncate text-[13px] text-[var(--ink-muted)]">{email}</p>
          </div>
          <div className="p-1.5">
            <Link
              href="/app/billing"
              onClick={() => setOpen(false)}
              className="block rounded-[8px] px-2.5 py-2 text-[14px] transition-colors hover:bg-[var(--paper-sunk)]"
            >
              Credits and billing
            </Link>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="block rounded-[8px] px-2.5 py-2 text-[14px] transition-colors hover:bg-[var(--paper-sunk)]"
            >
              Contact support
            </a>
            <button
              onClick={async () => {
                await createClient().auth.signOut();
                router.push("/");
                router.refresh();
              }}
              className="block w-full rounded-[8px] px-2.5 py-2 text-left text-[14px] transition-colors hover:bg-[var(--paper-sunk)]"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
