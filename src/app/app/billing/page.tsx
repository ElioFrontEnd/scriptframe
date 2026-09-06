import Link from "next/link";
import BuyCredits from "@/components/app/BuyCredits";
import PaymentBanner from "@/components/app/PaymentBanner";
import { requireUserPage, createClient } from "@/lib/supabase/server";
import { SUPPORT_EMAIL } from "@/lib/config";

export const dynamic = "force-dynamic";

const REASONS: Record<string, string> = {
  signup_bonus: "Welcome credits",
  purchase: "Credit pack",
  generation: "Generated frames",
  refund_failed_images: "Refund — frames that failed",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; cancelled?: string; pack?: string }>;
}) {
  const params = await searchParams;
  const user = await requireUserPage();
  const supabase = await createClient();

  const [{ data: profile }, { data: history }] = await Promise.all([
    supabase.from("profiles").select("credits").eq("id", user.id).single(),
    supabase
      .from("credit_transactions")
      .select("id, delta, reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const credits = profile?.credits ?? 0;

  return (
    <div>
      <h1 className="display text-[34px]">Credits</h1>
      <p className="hint mt-1.5">
        One credit is one image. Credits never expire and there&apos;s no
        subscription.
      </p>

      <PaymentBanner
        paid={!!params.paid}
        cancelled={!!params.cancelled}
        credits={credits}
        supportEmail={SUPPORT_EMAIL}
      />

      <div className="card mt-7 flex flex-wrap items-end justify-between gap-6 p-6">
        <div>
          <div className="text-[13px] text-[var(--ink-muted)]">Balance</div>
          <div
            className="mt-1 text-[46px] leading-none"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {credits.toLocaleString()}
          </div>
          <div className="mt-1.5 text-[13px] text-[var(--ink-faint)]">
            about {Math.max(0, Math.floor(credits / 100))} more videos at 100
            frames each
          </div>
        </div>
        <Link href="/app/new" className="btn-secondary">
          New project
        </Link>
      </div>

      <h2 id="buy" className="mt-12 scroll-mt-24 text-[15px] font-medium">
        Buy more
      </h2>
      <div className="mt-4">
        <BuyCredits preselect={params.pack} />
      </div>

      {!!history?.length && (
        <>
          <h2 className="mt-12 text-[15px] font-medium">History</h2>
          <ul className="card mt-4 divide-y divide-[var(--line)]">
            {history.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px]">
                    {REASONS[t.reason] ?? t.reason.replace(/_/g, " ")}
                  </p>
                  <p className="text-[12.5px] text-[var(--ink-faint)]">
                    {new Date(t.created_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-mono text-[14px] ${
                    t.delta > 0 ? "text-[var(--good)]" : "text-[var(--ink-muted)]"
                  }`}
                >
                  {t.delta > 0 ? "+" : ""}
                  {t.delta.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-8 text-[13px] text-[var(--ink-faint)]">
        Something wrong with a charge? Email{" "}
        <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
          {SUPPORT_EMAIL}
        </a>{" "}
        and we&apos;ll sort it out.
      </p>
    </div>
  );
}
