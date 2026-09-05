/**
 * Details the legal pages need.
 *
 * `operator` and `jurisdiction` are the two things only Elio can fill in, and
 * both should be set before taking real money — Stripe asks for a legal entity
 * during verification, and whatever it registers should match what these pages
 * say. Until then the pages read as operated by "Cutframe", which is accurate
 * for a sole trader but vague.
 *
 * These pages are a reasonable, honest starting point written to match what the
 * service actually does. They are not legal advice, and a lawyer should look at
 * them before the business is anything more than small.
 */
export const LEGAL = {
  operator: "Cutframe",
  /** e.g. "Germany" / "England and Wales". Set this before launch. */
  jurisdiction: "the operator's country of residence",
  lastUpdated: "5 September 2026",
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
