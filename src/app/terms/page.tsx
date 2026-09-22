import type { Metadata } from "next";
import LegalLayout, { Clause } from "@/components/marketing/LegalLayout";
import { LEGAL } from "@/lib/legal";
import { SUPPORT_EMAIL, LIMITS } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms you agree to when using Cutframe.",
};

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      intro="Plain terms for a small product. If anything here is unclear, email us and we'll explain it rather than hide behind it."
    >
      <Clause heading="Who we are and what Cutframe does">
        <p>
          Cutframe is operated by {LEGAL.operator}, a sole trader based in{" "}
          {LEGAL.jurisdiction}. Questions about these terms, your account or a
          charge go to{" "}
          <a className="underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          , and a real person answers them.
        </p>
        <p>
          Cutframe takes a narration script you provide, writes image prompts
          from it, and generates images using third-party AI models. You buy
          credits; one credit generates one image.
        </p>
        <p>
          By creating an account you agree to these terms. If you don&apos;t
          agree with them, don&apos;t use the service.
        </p>
      </Clause>

      <Clause heading="Who can use it">
        <p>
          You must be at least 18 years old and able to enter into a contract.
          You&apos;re responsible for everything that happens under your
          account, so keep access to your email secure — that&apos;s how signing
          in works.
        </p>
        <p>One person or organisation per account. Don&apos;t share logins.</p>
      </Clause>

      <Clause heading="Credits and payment">
        <p>
          Credits are bought in packs and never expire. They have no cash value
          and can&apos;t be transferred between accounts or exchanged for money.
        </p>
        <p>
          Credits are deducted when you start generating, not when you write
          prompts — writing prompts is free. If an image fails to generate, its
          credit is returned to your balance automatically.
        </p>
        <p>
          Payments are processed by Gumroad, who sell the credit pack to you on
          our behalf and issue your receipt. Your purchase is also subject to
          Gumroad&apos;s terms. Questions about a charge can come to us at{" "}
          {SUPPORT_EMAIL} and we&apos;ll sort it out with them.
        </p>
        <p>
          Unused credits can be refunded in full within 14 days of purchase, and
          a part-used pack can be refunded for whatever is left. Credits already
          spent on generated images aren&apos;t refundable, because the images
          were made. The full detail is in our{" "}
          <a className="underline" href="/refunds">
            refund policy
          </a>
          .
        </p>
        <p>
          Prices may change, but any credits you already hold keep their value.
        </p>
      </Clause>

      <Clause heading="What you make is yours">
        <p>
          You own the images Cutframe generates for you, including for
          commercial use — monetised videos, client work, whatever you like. We
          claim no rights over your scripts or your output.
        </p>
        <p>
          Be aware that AI-generated images may not be protectable by copyright
          in some countries, and that similar prompts can produce similar
          images for different users. We can&apos;t promise your output is
          unique.
        </p>
        <p>
          We may use anonymised, aggregated usage data — how many images, which
          styles, error rates — to improve the service. We do not use your
          scripts or images to train anything.
        </p>
      </Clause>

      <Clause heading="What you can't do">
        <p>Don&apos;t use Cutframe to generate:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            sexual content involving minors, or anything that sexualises a real
            person without consent;
          </li>
          <li>
            content designed to harass, defame or impersonate a real person;
          </li>
          <li>
            material that infringes someone else&apos;s copyright or trademark,
            including recognisable characters and brand assets;
          </li>
          <li>
            content that breaks the law where you are, or the usage policies of
            the underlying model providers.
          </li>
        </ul>
        <p>
          Also don&apos;t try to circumvent credit limits, automate the service
          outside its intended use, resell access, or attack the
          infrastructure. Accounts doing any of this can be suspended without
          refund.
        </p>
        <p>
          Generation requests pass through a safety filter. Some prompts will be
          refused, and refused images are refunded.
        </p>
      </Clause>

      <Clause heading="Limits">
        <p>
          Jobs are capped at {LIMITS.maxImagesPerJob} images, with limits on how
          many run at once and how many you can start per hour. These exist to
          keep costs predictable and the service available; they may change.
        </p>
      </Clause>

      <Clause heading="Availability and liability">
        <p>
          Cutframe is provided as-is. We aim to keep it running but don&apos;t
          guarantee uptime, and we depend on third-party services that can fail
          or change. We don&apos;t guarantee that generated images will meet any
          particular standard — image models are unpredictable, which is why you
          can review prompts first and regenerate individual frames.
        </p>
        <p>
          To the extent the law allows, our total liability to you is limited to
          what you&apos;ve paid us in the twelve months before the claim. We
          aren&apos;t liable for lost profits, lost content or indirect damages.
        </p>
        <p>
          Nothing here limits liability that can&apos;t legally be limited.
        </p>
      </Clause>

      <Clause heading="Ending things">
        <p>
          You can stop using Cutframe at any time and ask us to delete your
          account by emailing {SUPPORT_EMAIL}. Unused credits are not refunded
          on deletion.
        </p>
        <p>
          We can suspend or close accounts that break these terms, and will
          usually tell you why.
        </p>
      </Clause>

      <Clause heading="Changes and law">
        <p>
          We may update these terms. Material changes will be noted here with a
          new date, and continuing to use the service means accepting them.
        </p>
        <p>
          These terms are governed by the laws of {LEGAL.jurisdiction}.
        </p>
        <p>Questions: {SUPPORT_EMAIL}</p>
      </Clause>
    </LegalLayout>
  );
}
