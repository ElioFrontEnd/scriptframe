import Link from "next/link";
import { redirect } from "next/navigation";
import SignInForm from "@/components/SignInForm";
import Nav from "@/components/marketing/Nav";
import Footer from "@/components/marketing/Footer";
import { getUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/authCookies";
import { getPack } from "@/lib/config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign in — Cutframe",
  description:
    "Sign in to Cutframe with your email. No password: we send you a link.",
};

const ERRORS: Record<string, string> = {
  link: "That sign-in link didn't work — it may have already been used, or expired. Enter your email and we'll send a fresh one.",
  auth: "Something went wrong signing you in. Try again below.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; pack?: string; error?: string }>;
}) {
  const params = await searchParams;

  // Already signed in — nothing to do here.
  const user = await getUser();
  if (user) redirect(safeNext(params.next));

  const next = safeNext(params.next);
  const pack = params.pack ? getPack(params.pack) : undefined;
  const error = params.error ? ERRORS[params.error] : undefined;

  return (
    <>
      <Nav />

      <main className="flex-1">
        <div className="mx-auto flex max-w-md flex-col px-6 py-16 sm:py-24">
          <h1 className="display text-[34px] sm:text-[40px]">
            {pack ? `Get the ${pack.name} pack` : "Sign in to Cutframe"}
          </h1>

          <p className="mt-3 text-[15.5px] leading-relaxed text-[var(--ink-muted)]">
            {pack ? (
              <>
                Sign in first and we&apos;ll take you straight to checkout for{" "}
                {pack.credits.toLocaleString()} images at ${pack.priceUsd}. New
                accounts get 40 free images, so you can try it before you pay.
              </>
            ) : (
              <>
                Enter your email and we&apos;ll send you a link. There is no
                password to remember, and the same link creates your account if
                you don&apos;t have one — with 40 free images to start.
              </>
            )}
          </p>

          {error && (
            <p className="mt-6 rounded-[10px] bg-[var(--warn-soft)] px-4 py-3 text-[13.5px] leading-relaxed text-[var(--warn)]">
              {error}
            </p>
          )}

          <div className="mt-8">
            <SignInForm next={next} cta="Email me a link" />
          </div>

          <p className="mt-8 border-t border-[var(--line)] pt-5 text-[13px] leading-relaxed text-[var(--ink-faint)]">
            By signing in you agree to our{" "}
            <Link className="underline underline-offset-2" href="/terms">
              terms
            </Link>{" "}
            and{" "}
            <Link className="underline underline-offset-2" href="/privacy">
              privacy policy
            </Link>
            . We use your email to sign you in and to send receipts — nothing
            else.
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}
