import { CREDIT_PACKS, LIMITS } from "@/lib/config";

/**
 * Native <details> rather than a JavaScript accordion: it works before hydration,
 * it is keyboard accessible for free, and search engines read the answers.
 */
const QUESTIONS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: "How many images does a video need?",
    a: (
      <>
        Roughly one every five to eleven seconds, depending on the pacing you
        pick. An eight-minute narration usually lands between 70 and 110 images,
        so a {CREDIT_PACKS[1].name} pack covers about ten videos.
      </>
    ),
  },
  {
    q: "Will the images actually look like they belong together?",
    a: (
      <>
        That is the whole point of the product. Each style is a detailed
        description of medium, palette, line quality and lighting, and it is
        appended to every single prompt in the set rather than mentioned once at
        the start. Recurring people are re-described in full in each prompt,
        because the image model has no memory between frames.
      </>
    ),
  },
  {
    q: "Can I edit the prompts before spending anything?",
    a: (
      <>
        Yes, and you should. Writing the prompts is free — you see all of them,
        edit any that misread your script, and only then press generate. Credits
        come off your balance at that point, not before.
      </>
    ),
  },
  {
    q: "What if an image comes out wrong?",
    a: (
      <>
        Regenerate that one frame on its own, or rewrite its prompt and try
        again, without touching the rest of the set. Images that fail outright
        are refunded to your balance automatically.
      </>
    ),
  },
  {
    q: "Do credits expire?",
    a: (
      <>
        No. One credit is one image, they sit on your account until you use
        them, and there is no subscription to cancel.
      </>
    ),
  },
  {
    q: "What do I get at the end?",
    a: (
      <>
        A ZIP numbered <span className="font-mono text-[13px]">001.jpg</span>{" "}
        upward in narration order, so the images drop into a timeline already
        sorted, plus a{" "}
        <span className="font-mono text-[13px]">prompts.txt</span> with every
        prompt in case you want to take them elsewhere.
      </>
    ),
  },
  {
    q: "Can I use the images commercially?",
    a: (
      <>
        Yes. What you generate is yours, including for monetised videos. You are
        responsible for what you ask for — see the terms.
      </>
    ),
  },
  {
    q: "How long does a set take?",
    a: (
      <>
        A hundred images runs in a few minutes. You can close the tab while it
        works; it keeps going and the finished set is waiting when you come
        back. Jobs are capped at {LIMITS.maxImagesPerJob} images.
      </>
    ),
  },
];

export default function Faq() {
  return (
    <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
      {QUESTIONS.map(({ q, a }) => (
        <details key={q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] text-[var(--ink)] transition-colors hover:text-[var(--clay)]">
            {q}
            <span
              aria-hidden="true"
              className="relative h-3 w-3 shrink-0 text-[var(--ink-faint)]"
            >
              <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-current" />
              <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-current transition-transform duration-200 group-open:scale-y-0" />
            </span>
          </summary>
          <p className="max-w-2xl pb-5 text-[15px] leading-relaxed text-[var(--ink-muted)]">
            {a}
          </p>
        </details>
      ))}
    </div>
  );
}
