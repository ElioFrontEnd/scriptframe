import Nav from "@/components/marketing/Nav";
import Footer from "@/components/marketing/Footer";
import { LEGAL } from "@/lib/legal";

export default function LegalLayout({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Nav />
      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-6 pb-8 pt-16">
          <h1 className="display text-[40px] sm:text-[46px]">{title}</h1>
          <p className="mt-4 text-[16.5px] leading-relaxed text-[var(--ink-muted)]">
            {intro}
          </p>
          <p className="mt-4 text-[13px] text-[var(--ink-faint)]">
            Last updated {LEGAL.lastUpdated}
          </p>
        </div>

        <div className="mx-auto max-w-2xl px-6 pb-24">
          <div className="rule mb-10" />
          <div className="legal space-y-8">{children}</div>
        </div>
      </main>
      <Footer />
    </>
  );
}

export function Clause({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className="mb-3 text-[21px] text-[var(--ink)]"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {heading}
      </h2>
      <div className="space-y-3 text-[15.5px] leading-relaxed text-[var(--ink-muted)]">
        {children}
      </div>
    </section>
  );
}
