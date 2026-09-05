import type { Metadata } from "next";
import LegalLayout, { Clause } from "@/components/marketing/LegalLayout";
import { SUBPROCESSORS } from "@/lib/legal";
import { SUPPORT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Cutframe collects, why, and who it's shared with.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      intro="Short version: we collect your email so you can sign in, we store the scripts and images you make so you can come back to them, and we hand your script to an AI provider to do the work. Nothing is sold, and nothing trains a model."
    >
      <Clause heading="What we collect">
        <p>
          <strong className="font-medium text-[var(--ink)]">
            Your email address.
          </strong>{" "}
          It&apos;s the only account identifier — there are no passwords, you
          sign in with a link.
        </p>
        <p>
          <strong className="font-medium text-[var(--ink)]">
            The scripts you paste, and what we make from them.
          </strong>{" "}
          Your script, the prompts written from it, and the generated images are
          stored so your projects are there when you return.
        </p>
        <p>
          <strong className="font-medium text-[var(--ink)]">
            Credit and payment records.
          </strong>{" "}
          What you bought and what you spent. Card details never touch our
          servers — Stripe handles payment entirely.
        </p>
        <p>
          <strong className="font-medium text-[var(--ink)]">
            Basic technical logs.
          </strong>{" "}
          IP addresses and request logs from our host, kept briefly for
          security and debugging.
        </p>
        <p>
          There are no advertising trackers or third-party analytics scripts on
          this site.
        </p>
      </Clause>

      <Clause heading="Why we collect it">
        <p>
          To run the service: sign you in, generate your images, keep track of
          your credits, and show you your projects. To fix problems when
          something breaks. To meet accounting obligations on payments.
        </p>
        <p>
          If you&apos;re in the UK or EU: the legal basis is performance of a
          contract for the account and generation data, legitimate interests for
          security logs, and legal obligation for payment records.
        </p>
      </Clause>

      <Clause heading="Who else sees it">
        <p>
          Running Cutframe means using other companies&apos; infrastructure.
          Each one gets only what it needs:
        </p>
        <div className="mt-4 overflow-hidden rounded-[10px] border border-[var(--line)]">
          <table className="w-full border-collapse text-[14px]">
            <thead>
              <tr className="bg-[var(--paper-sunk)] text-left text-[var(--ink)]">
                <th className="px-4 py-2.5 font-medium">Service</th>
                <th className="px-4 py-2.5 font-medium">What it sees</th>
              </tr>
            </thead>
            <tbody>
              {SUBPROCESSORS.map((s) => (
                <tr key={s.name} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 align-top">
                    <span className="block text-[var(--ink)]">{s.name}</span>
                    <span className="text-[13px] text-[var(--ink-faint)]">
                      {s.purpose}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">{s.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4">
          Your script is sent to Google&apos;s Gemini API to be turned into
          prompts, and those prompts are sent to fal.ai to generate images. Both
          are processed under their own terms. We don&apos;t sell your data to
          anyone, and we don&apos;t use your scripts or images to train models.
        </p>
        <p>
          Some of these providers operate in the United States, so your data may
          be transferred outside your country.
        </p>
      </Clause>

      <Clause heading="How long we keep it">
        <p>
          Projects, prompts and images stay until you delete them or ask us to
          close your account. Payment records are kept as long as accounting
          rules require. Technical logs are short-lived.
        </p>
      </Clause>

      <Clause heading="Your choices">
        <p>
          You can delete any project from inside the app, which removes its
          script, prompts and images.
        </p>
        <p>
          Email {SUPPORT_EMAIL} to get a copy of your data, correct it, or have
          your account and everything in it deleted. We&apos;ll action it within
          30 days. If you&apos;re in the UK or EU you also have the right to
          complain to your data protection authority.
        </p>
      </Clause>

      <Clause heading="Security">
        <p>
          Images are stored in a private bucket and only ever served through
          short-lived signed links. Database access is restricted so accounts
          can only read their own rows. Nobody can be perfectly secure, but if
          something goes wrong that affects you, we&apos;ll tell you.
        </p>
      </Clause>

      <Clause heading="Children">
        <p>
          Cutframe isn&apos;t for anyone under 18, and we don&apos;t knowingly
          collect data from children. If you believe a child has an account,
          email us and we&apos;ll remove it.
        </p>
      </Clause>

      <Clause heading="Changes">
        <p>
          If this policy changes materially we&apos;ll update the date at the
          top and, for anything significant, email you. Questions go to{" "}
          {SUPPORT_EMAIL}.
        </p>
      </Clause>
    </LegalLayout>
  );
}
