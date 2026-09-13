import type { Metadata } from "next";
import LegalLayout, { Clause } from "@/components/marketing/LegalLayout";
import { SUPPORT_EMAIL } from "@/lib/config";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "When you can get your money back from Cutframe, and how to ask. Unused credits are refundable for 14 days.",
};

/**
 * A standalone refund policy, linked from the footer.
 *
 * The terms already covered refunds in a paragraph, but a payment provider's
 * review looks for this as its own findable page — and so does a customer
 * deciding whether to risk $19 on a service they have never heard of. Unused
 * credits cost us nothing to give back, so a generous, plainly-worded policy is
 * close to free and removes the main reason someone hesitates.
 */
export default function RefundsPage() {
  return (
    <LegalLayout
      title="Refund Policy"
      intro="Short version: if you haven't used the credits, you can have your money back for 14 days, no argument. Here is the detail."
    >
      <Clause heading="Unused credits — 14 days, no questions">
        <p>
          If you bought a credit pack in the last 14 days and haven&apos;t spent
          any of it, email{" "}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          and we&apos;ll refund it in full to the card you paid with. You
          don&apos;t have to explain why.
        </p>
        <p>
          Refunds are processed within five working days of us agreeing one. How
          long it then takes to appear on your statement is up to your bank —
          usually a few days.
        </p>
      </Clause>

      <Clause heading="Partly used credits">
        <p>
          If you&apos;ve generated some images and the rest of the pack is
          untouched, tell us and we&apos;ll refund the unused portion at the
          price you paid per credit. We&apos;d rather you kept the part you
          used and got the rest back than felt stuck with a balance you
          don&apos;t want.
        </p>
        <p>
          Credits that have been spent on generated images aren&apos;t
          refundable, because the images were produced and the cost of producing
          them was real. The exception is the next section.
        </p>
      </Clause>

      <Clause heading="When something goes wrong on our side">
        <p>
          If an image fails to generate, its credit goes back to your balance
          automatically — you never pay for a frame you didn&apos;t get, and you
          don&apos;t have to ask.
        </p>
        <p>
          If the service was broken, produced nothing usable, or charged you
          twice, email us and we&apos;ll make it right with a refund rather than
          a credit if that&apos;s what you&apos;d prefer. We&apos;d rather fix a
          bad experience than keep $19.
        </p>
      </Clause>

      <Clause heading="Your statutory rights">
        <p>
          If you&apos;re a consumer in the UK or the EU you normally have 14 days
          to withdraw from a purchase of digital content. That right ends once
          delivery begins with your agreement — for Cutframe, that means the
          moment you spend a credit on generating images. Until you do, the 14-day
          refund above applies and is the same thing in practice.
        </p>
        <p>
          Nothing in this policy takes away a right you have by law wherever you
          live.
        </p>
      </Clause>

      <Clause heading="How to ask">
        <p>
          Email{" "}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>{" "}
          from the address on your account and say what you&apos;d like
          refunded. There&apos;s no form. A person reads it, usually within a
          day.
        </p>
        <p>
          Cutframe is operated by {LEGAL.operator}, based in {LEGAL.jurisdiction}.
          If you&apos;re unhappy with how a refund was handled, say so in the
          same thread and it will be looked at again.
        </p>
      </Clause>
    </LegalLayout>
  );
}
