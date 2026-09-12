/**
 * Details the legal pages need.
 *
 * `operator` is the person legally behind the service and must match whatever
 * the payment provider verifies during onboarding — a mismatch between the site
 * and the merchant record is a standard reason for an application to be held up.
 *
 * These pages are a reasonable, honest starting point written to match what the
 * service actually does. They are not legal advice, and a lawyer should look at
 * them before the business is anything more than small.
 */
export const LEGAL = {
  operator: "Elio Hyziu",
  jurisdiction: "Albania",
  lastUpdated: "12 September 2026",
};

/** Everyone we hand data to, and why. Listed openly in the privacy policy. */
export const SUBPROCESSORS = [
  {
    name: "Supabase",
    purpose: "Account, database and image storage",
    data: "Email address, scripts, prompts, generated images",
  },
  {
    name: "Vercel",
    purpose: "Website hosting",
    data: "Request logs, IP address",
  },
  {
    name: "fal.ai",
    purpose: "Image generation",
    data: "The prompts written from your script",
  },
  {
    name: "Google (Gemini API)",
    purpose: "Turning scripts into prompts",
    data: "Your script text",
  },
  {
    name: "Stripe",
    purpose: "Payments",
    data: "Email address, payment details (handled entirely by Stripe)",
  },
  {
    name: "Resend",
    purpose: "Sign-in emails",
    data: "Email address",
  },
];
