"use client";

import { useState } from "react";
import { CREDIT_PACKS } from "@/lib/config";

export default function BuyCredits({ preselect }: { preselect?: string } = {}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const chosen = preselect ? CREDIT_PACKS.find((p) => p.id === preselect) : undefined;

  async function buy(packId: string) {
    setError("");
    setBusy(packId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout unavailable");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  return (
    <div>
      {chosen && (
        <p className="mb-5 rounded-[10px] border border-[var(--clay)] bg-[var(--clay-soft)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--ink)]">
          You picked the <strong className="font-medium">{chosen.name}</strong>{" "}
          pack — {chosen.credits.toLocaleString()} images for ${chosen.priceUsd}.
          Click Buy below to pay. Nothing has been charged yet.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {CREDIT_PACKS.map((pack) => {
          // What the visitor asked for outranks what we like to sell.
          const featured = chosen ? pack.id === chosen.id : "popular" in pack && pack.popular;
          const badge = chosen
            ? pack.id === chosen.id
              ? "Your pick"
              : null
            : "popular" in pack && pack.popular
              ? "Most popular"
              : null;
          return (
            <div
              key={pack.id}
              className={`card relative flex flex-col p-6 ${
                featured ? "border-[var(--clay)]" : ""
              }`}
            >
              {badge && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-[var(--clay)] px-2.5 py-1 text-[11px] font-medium leading-none text-white">
                  {badge}
                </span>
              )}
              <h3 className="text-[14px] font-medium">{pack.name}</h3>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span
                  className="text-[36px] leading-none"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  ${pack.priceUsd}
                </span>
              </div>
              <p className="mt-3 text-[14px]">
                {pack.credits.toLocaleString()} images
              </p>
              <p className="mt-0.5 text-[13px] text-[var(--ink-muted)]">
                {pack.videos}
              </p>
              <button
                onClick={() => buy(pack.id)}
                disabled={busy !== null}
                className={`mt-6 w-full ${featured ? "btn-primary" : "btn-secondary"}`}
              >
                {busy === pack.id ? "Opening…" : "Buy"}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="mt-4 rounded-[8px] bg-[var(--bad-soft)] px-3 py-2.5 text-[13px] text-[var(--bad)]">
          {error}
        </p>
      )}

      <p className="mt-4 text-[13px] text-[var(--ink-faint)]">
        Payments handled by Stripe. Card details never touch our servers.
      </p>
    </div>
  );
}
