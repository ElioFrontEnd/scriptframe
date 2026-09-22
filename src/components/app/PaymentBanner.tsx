"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * The banner shown while a payment is on its way.
 *
 * Stripe redirects the browser the moment the card clears, but the credits
 * arrive on a separate webhook a second or two later. Without this the customer
 * lands on "payment received" next to their old balance, which reads exactly
 * like being charged for nothing. So the page refreshes itself until the
 * balance moves, and says plainly that it is still working until it does.
 *
 * It gives up after a while rather than spinning forever — if the webhook is
 * genuinely broken, the honest thing is to say so and point at support.
 */
const EVERY_MS = 2000;
const ATTEMPTS = 10;

/**
 * Gumroad's checkout is in another tab and the customer may take minutes to
 * type a card number, so that mode checks less often and for much longer.
 */
const WAIT_EVERY_MS = 4000;
const WAIT_ATTEMPTS = 225; // 15 minutes

export default function PaymentBanner({
  paid,
  waiting: checkoutOpen = false,
  cancelled,
  credits,
  supportEmail,
}: {
  paid: boolean;
  waiting?: boolean;
  cancelled: boolean;
  credits: number;
  supportEmail: string;
}) {
  const router = useRouter();
  // The balance as it stood when we landed back from Stripe. Captured once,
  // so a refresh that changes it is what tells us the webhook has landed.
  const [startingCredits] = useState(credits);
  const [tries, setTries] = useState(0);

  const arrived = credits !== startingCredits;
  const gaveUp = tries >= (checkoutOpen ? WAIT_ATTEMPTS : ATTEMPTS);
  const waiting = (paid || checkoutOpen) && !arrived && !gaveUp;

  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(
      () => {
        setTries((n) => n + 1);
        router.refresh();
      },
      checkoutOpen ? WAIT_EVERY_MS : EVERY_MS,
    );
    return () => clearTimeout(t);
  }, [waiting, tries, router, checkoutOpen]);

  // Coming back to this tab from the Gumroad one is the likeliest moment the
  // payment has just gone through — check straight away rather than on the timer.
  useEffect(() => {
    if (!waiting || !checkoutOpen) return;
    const onFocus = () => router.refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [waiting, checkoutOpen, router]);

  if (checkoutOpen && !paid) {
    if (arrived) {
      return (
        <div
          className="mt-6 rounded-[10px] bg-[var(--good-soft)] px-4 py-3 text-[14px] text-[var(--good)]"
          aria-live="polite"
        >
          Payment received — {(credits - startingCredits).toLocaleString()} credits
          added to your balance. Thank you!
        </div>
      );
    }
    if (waiting) {
      return (
        <div
          className="mt-6 rounded-[10px] bg-[var(--paper-sunk)] px-4 py-3 text-[14px] leading-relaxed text-[var(--ink-muted)]"
          aria-live="polite"
        >
          Checkout is open in a new tab. Once you&apos;ve paid there, your
          credits show up here on their own — usually within a minute. If no tab
          opened, check that your browser didn&apos;t block it.
        </div>
      );
    }
    return (
      <div className="mt-6 rounded-[10px] bg-[var(--paper-sunk)] px-4 py-3 text-[14px] leading-relaxed text-[var(--ink-muted)]">
        No payment has come through yet. If you did pay, reload this page in a
        minute; if the credits still aren&apos;t there, email{" "}
        <a className="underline" href={`mailto:${supportEmail}`}>
          {supportEmail}
        </a>{" "}
        with your Gumroad receipt and we&apos;ll add them by hand.
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="mt-6 rounded-[10px] bg-[var(--paper-sunk)] px-4 py-3 text-[14px] text-[var(--ink-muted)]">
        Checkout cancelled — nothing was charged.
      </div>
    );
  }

  if (!paid) return null;

  if (waiting) {
    return (
      <div
        className="mt-6 rounded-[10px] bg-[var(--good-soft)] px-4 py-3 text-[14px] text-[var(--good)]"
        aria-live="polite"
      >
        Payment received — adding your credits now. This page updates on its own.
      </div>
    );
  }

  if (gaveUp && !arrived) {
    return (
      <div
        className="mt-6 rounded-[10px] bg-[var(--warn-soft)] px-4 py-3 text-[14px] leading-relaxed text-[var(--warn)]"
        aria-live="polite"
      >
        Your payment went through, but the credits haven&apos;t landed yet.
        They&apos;re usually a few seconds behind — reload in a minute. If
        they&apos;re still missing, email{" "}
        <a className="underline" href={`mailto:${supportEmail}`}>
          {supportEmail}
        </a>{" "}
        and we&apos;ll add them by hand.
      </div>
    );
  }

  return (
    <div
      className="mt-6 rounded-[10px] bg-[var(--good-soft)] px-4 py-3 text-[14px] text-[var(--good)]"
      aria-live="polite"
    >
      Payment received — your credits are on the balance below.
    </div>
  );
}
