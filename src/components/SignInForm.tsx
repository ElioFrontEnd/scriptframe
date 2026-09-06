"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  NEXT_COOKIE,
  REMEMBER_COOKIE,
  REMEMBER_MAX_AGE,
} from "@/lib/authCookies";

/**
 * Email sign-in. There is no password — we send a link, and clicking it signs
 * you in. The same form creates the account, because there is nothing to create
 * beyond the email address itself.
 *
 * `next` and the remember choice are handed to the callback in cookies rather
 * than in the link we email. Two reasons: Supabase matches redirect URLs
 * against an allow-list, so bolting query parameters onto the callback is a way
 * to break sign-in later; and the link is deliverable to anyone the mail passes
 * through, which is not where a "where to go next" instruction belongs.
 */
export default function SignInForm({
  next = "/app",
  cta = "Email me a link",
  showRemember = true,
}: {
  /** Path to land on after the link is clicked. */
  next?: string;
  cta?: string;
  showRemember?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(true);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function send(address: string) {
    // Lax so the cookie survives the click through from the email client.
    document.cookie = `${NEXT_COOKIE}=${encodeURIComponent(next)}; path=/; SameSite=Lax`;
    document.cookie = `${REMEMBER_COOKIE}=${
      remember ? "1" : "0"
    }; path=/; max-age=${REMEMBER_MAX_AGE}; SameSite=Lax`;

    const supabase = createClient();
    return supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");

    const { error } = await send(email.trim());

    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  async function resend() {
    setMessage("");
    const { error } = await send(email.trim());
    setMessage(
      error ? error.message : "Sent again — it can take a minute to arrive.",
    );
  }

  if (status === "sent") {
    return (
      <div className="card fade-up p-5 text-left">
        <div className="flex items-start gap-3">
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
              We sent a sign-in link to{" "}
              <span className="text-[var(--ink)]">{email}</span>. It expires in
              an hour. Open it on this device to stay signed in here.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--line)] pt-3.5">
          <button
            type="button"
            onClick={resend}
            className="text-[13px] underline underline-offset-2 hover:text-[var(--clay)]"
          >
            Send it again
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("idle");
              setMessage("");
            }}
            className="text-[13px] text-[var(--ink-muted)] underline underline-offset-2 hover:text-[var(--ink)]"
          >
            Use a different address
          </button>
        </div>

        {message && <p className="mt-2.5 text-[13px] text-[var(--ink-muted)]">{message}</p>}

        <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--ink-faint)]">
          Nothing there after a minute or two? Check spam — the link comes from
          our own domain, but new senders often land there once.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
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
          {status === "sending" ? "Sending…" : cta}
        </button>
      </form>

      {showRemember && (
        <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-left">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="mt-0.5 h-[15px] w-[15px] accent-[var(--clay)]"
          />
          <span className="text-[13px] leading-snug text-[var(--ink-muted)]">
            Keep me signed in on this device
            <span className="block text-[12.5px] text-[var(--ink-faint)]">
              Turn this off on a shared or public computer — you&apos;ll be
              signed out when the browser closes.
            </span>
          </span>
        </label>
      )}

      {status === "error" && (
        <p className="mt-2.5 text-[13px] text-[var(--bad)]">{message}</p>
      )}
    </div>
  );
}
