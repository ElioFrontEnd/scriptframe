"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignInForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  if (status === "sent") {
    return (
      <div className="card fade-up flex items-start gap-3 p-5 text-left">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--good-soft)]">
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M2 6.5 4.5 9 10 3.5"
              fill="none"
              stroke="var(--good)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <p className="text-[15px] font-medium">Check your inbox</p>
          <p className="hint mt-1">
            We sent a sign-in link to <span className="text-[var(--ink)]">{email}</span>.
            It expires in an hour.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "w-full"}>
      <form onSubmit={submit} className="flex flex-col gap-2.5 sm:flex-row">
        <label htmlFor="signin-email" className="sr-only">
          Email address
        </label>
        <input
          id="signin-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="field sm:flex-1"
        />
        <button className="btn-primary whitespace-nowrap" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Start free"}
        </button>
      </form>

      {status === "error" && (
        <p className="mt-2.5 text-[13px] text-[var(--bad)]">{message}</p>
      )}
    </div>
  );
}
