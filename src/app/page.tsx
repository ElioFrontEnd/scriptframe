import Link from "next/link";
import { redirect } from "next/navigation";
import SignInForm from "@/components/SignInForm";
import Nav from "@/components/marketing/Nav";
import Footer from "@/components/marketing/Footer";
import HeroDemo from "@/components/marketing/HeroDemo";
import StyleGallery from "@/components/marketing/StyleGallery";
import Faq from "@/components/marketing/Faq";
import { getUser } from "@/lib/supabase/server";
import { STYLE_PRESETS } from "@/lib/styles";
import { hasAnySamples } from "@/lib/samples";
import { CREDIT_PACKS, DENSITY_OPTIONS } from "@/lib/config";

const STEPS = [
  {
    n: "01",
    title: "Paste the script",
    body: "The narration exactly as you'll record it. Cutframe splits it into visual beats at the pacing you choose — relaxed, standard, or fast cuts.",
  },
  {
    n: "02",
    title: "Check the prompts",
    body: "You see every prompt before a single credit is spent. Edit any that misread your script, then generate. Writing them costs nothing.",
  },
  {
    n: "03",
    title: "Download the set",
    body: "A ZIP numbered in narration order, so the images land in your timeline already sorted. Regenerate any frame that didn't land.",
  },
];

export default async function Home() {
  const user = await getUser();
  if (user) redirect("/app");

  const galleryHasSamples = hasAnySamples(STYLE_PRESETS.map((s) => s.id));

  return (
    <>
      <Nav />

      <main className="flex-1">
        {/* ------------------------------------------------------------ hero */}
        <section className="tooth border-b border-[var(--line)]">
          <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 md:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <span className="eyebrow">For faceless video</span>
              <h1 className="display mx-auto mt-5 max-w-[13ch] text-[42px] text-balance sm:max-w-[16ch] sm:text-[58px] md:text-[66px]">
                Paste your script. Get{" "}
                <span className="display-em">every</span> image for the video.
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--ink-muted)]">
                Cutframe reads your narration, breaks it into beats, and
                generates a complete set of images that hold one look from the
                first frame to the last.
              </p>

              <div className="mx-auto mt-9 max-w-md" id="start">
                <SignInForm />
                <p className="mt-3 text-[13px] text-[var(--ink-faint)]">
                  40 free images when you sign up. No card required.
                </p>
              </div>
            </div>

            <div className="fade-up mx-auto mt-16 max-w-4xl">
              <HeroDemo />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- the problem */}
        <section className="border-b border-[var(--line)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:items-center">
            <div>
              <span className="eyebrow">The tedious part</span>
              <h2 className="display mt-4 text-[32px] sm:text-[38px]">
                A hundred prompts, written by hand, one at a time.
              </h2>
            </div>
            <div className="space-y-4 text-[16px] leading-relaxed text-[var(--ink-muted)]">
              <p>
                Anyone who has made a faceless video knows the middle hour: the
                script is finished, the voiceover is rendered, and now there are
                ninety-odd images to describe, generate, download, rename and
                sort. Get it wrong and the video looks like a slideshow of
                twenty different artists.
              </p>
              <p>
                Cutframe does that hour. It reads the whole script for context,
                writes a self-contained prompt for each beat, carries one style
                description through every single one, and hands back a numbered
                set ready for the timeline.
              </p>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------- how */}
        <section id="how" className="scroll-mt-20 border-b border-[var(--line)]">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <span className="eyebrow">How it works</span>
            <h2 className="display mt-4 max-w-xl text-[32px] sm:text-[38px]">
              Three steps, and one of them is just reading.
            </h2>

            <div className="mt-12 grid gap-px overflow-hidden rounded-[16px] border border-[var(--line)] bg-[var(--line)] md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="bg-[var(--paper-raised)] p-7">
                  <span className="font-mono text-[12px] text-[var(--clay)]">
                    {s.n}
                  </span>
                  <h3
                    className="mt-3 text-[20px]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {s.title}
                  </h3>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-[var(--ink-muted)]">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {DENSITY_OPTIONS.map((d) => (
                <span key={d.id} className="chip-neutral">
                  {d.label}
                  <span className="text-[var(--ink-faint)]">{d.note}</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- consistency */}
        <section className="bg-[var(--paper-deep)] text-[var(--ink-invert)]">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="mx-auto max-w-2xl text-center">
              <span className="eyebrow !text-[#8a8175]">The hard part</span>
              <h2 className="display mt-4 text-[34px] sm:text-[44px]">
                Frame 97 has to match frame 3.
              </h2>
              <p className="mt-6 text-[16.5px] leading-relaxed text-[#b6ada0]">
                Image models have no memory between requests. Ask for
                &ldquo;the same fisherman&rdquo; on the ninetieth prompt and you
                get a stranger. So Cutframe never relies on continuity it
                doesn&apos;t have: every prompt repeats the full style
                description, and every recurring person is described from
                scratch, every time.
              </p>
            </div>

            <div className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-3">
              {[
                {
                  t: "One style, restated",
                  b: "Medium, palette, line quality and lighting travel with every prompt — not mentioned once and hoped for.",
                },
                {
                  t: "No relative references",
                  b: "Nothing says “as before” or “the same character”. Each frame stands alone, because to the model it does.",
                },
                {
                  t: "Read in context",
                  b: "The whole script is read before any beat is written, so the pictures follow the argument rather than the sentence.",
                },
              ].map((c) => (
                <div
                  key={c.t}
                  className="rounded-[12px] border border-[#332f2a] bg-[#232019] p-5 text-left"
                >
                  <h3 className="text-[15px] font-medium">{c.t}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-[#a29889]">
                    {c.b}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- styles */}
        <section id="styles" className="scroll-mt-20 border-b border-[var(--line)]">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="eyebrow">Styles</span>
                <h2 className="display mt-4 max-w-lg text-[32px] sm:text-[38px]">
                  {STYLE_PRESETS.length} looks, each built to survive a hundred
                  frames.
                </h2>
              </div>
              <p className="max-w-sm text-[14.5px] leading-relaxed text-[var(--ink-muted)]">
                Not a dropdown of one-word moods. Each is a full description of
                medium, palette and light, tuned so a whole set reads as one
                hand.
                {!galleryHasSamples && (
                  <>
                    {" "}
                    <span className="text-[var(--ink-faint)]">
                      Panels below show each palette and surface; sample sets
                      are published as they&apos;re shot.
                    </span>
                  </>
                )}
              </p>
            </div>

            <div className="mt-12">
              <StyleGallery />
            </div>

            {/* The differentiator: a channel's look shouldn't be shared with
                every other customer of the same tool. */}
            <div className="card mt-8 grid gap-8 p-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center">
              <div>
                <span className="eyebrow">Or bring your own</span>
                <h3 className="display mt-3 text-[26px] sm:text-[30px]">
                  Upload one frame. Get a style only you have.
                </h3>
                <p className="mt-4 text-[15.5px] leading-relaxed text-[var(--ink-muted)]">
                  Drop in a single image in the look you want and Cutframe reads
                  how it&apos;s made — medium, palette, line quality, lighting —
                  then writes that description into every prompt of every video
                  you make. Your channel gets a face nobody else is using.
                </p>
                <p className="mt-3 text-[14px] leading-relaxed text-[var(--ink-faint)]">
                  It describes the technique, never the picture, so your frames
                  are your own scenes rather than variations of the reference.
                  Costs the same as a preset.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-[10px] border border-dashed border-[var(--line-strong)] bg-[var(--paper-sunk)] text-center text-[12px] leading-tight text-[var(--ink-faint)]">
                  your
                  <br />
                  reference
                </div>
                <span className="text-[20px] text-[var(--ink-faint)]" aria-hidden="true">
                  →
                </span>
                <div className="min-w-0 rounded-[10px] border border-[var(--line)] bg-[var(--paper-sunk)] p-3">
                  <p className="font-mono text-[11px] leading-relaxed text-[var(--ink-muted)]">
                    soft gouache illustration, chalky matte pigment, visible
                    brush texture, muted sage and clay palette, gentle diffused
                    light, no photorealism, no gradients…
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- pricing */}
        <section id="pricing" className="scroll-mt-20 border-b border-[var(--line)]">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="max-w-xl">
              <span className="eyebrow">Pricing</span>
              <h2 className="display mt-4 text-[32px] sm:text-[38px]">
                Pay per video, not per month.
              </h2>
              <p className="mt-4 text-[16px] leading-relaxed text-[var(--ink-muted)]">
                One credit is one image. Credits never expire and there is
                nothing to cancel — buy a pack when you need one.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {CREDIT_PACKS.map((pack) => {
                const featured = "popular" in pack && pack.popular;
                return (
                  <div
                    key={pack.id}
                    className={`card relative flex flex-col p-7 ${
                      featured
                        ? "border-[var(--clay)] shadow-[var(--lift-2)]"
                        : ""
                    }`}
                  >
                    {featured && (
                      <span className="absolute -top-2.5 left-7 rounded-full bg-[var(--clay)] px-2.5 py-1 text-[11px] font-medium leading-none text-white">
                        Most popular
                      </span>
                    )}
                    <h3 className="text-[15px] font-medium">{pack.name}</h3>
                    <div className="mt-4 flex items-baseline gap-1.5">
                      <span
                        className="text-[42px] leading-none"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        ${pack.priceUsd}
                      </span>
                      <span className="text-[14px] text-[var(--ink-faint)]">
                        one-off
                      </span>
                    </div>
                    <p className="mt-4 text-[15px] text-[var(--ink)]">
                      {pack.credits.toLocaleString()} images
                    </p>
                    <p className="mt-1 text-[14px] text-[var(--ink-muted)]">
                      {pack.videos}
                    </p>
                    {/* Signed-in visitors are redirected to /app above, so
                        this always goes through sign-in first. Saying so beats
                        a button that looks like it charges the card and
                        doesn't. */}
                    <Link
                      href={`/signin?next=${encodeURIComponent(
                        `/app/billing?pack=${pack.id}`,
                      )}&pack=${pack.id}`}
                      className={`mt-7 w-full text-center ${
                        featured ? "btn-primary" : "btn-secondary"
                      }`}
                    >
                      Get {pack.name}
                    </Link>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-[13.5px] text-[var(--ink-faint)]">
              Every account starts with 40 free images — enough for a short
              video — so you can see the output before paying for anything.
              Packs are bought from inside your account, so you&apos;ll sign in
              first either way.
            </p>
          </div>
        </section>

        {/* -------------------------------------------------------------- faq */}
        <section id="faq" className="scroll-mt-20">
          <div className="mx-auto max-w-3xl px-6 py-20">
            <span className="eyebrow">Questions</span>
            <h2 className="display mb-10 mt-4 text-[32px] sm:text-[38px]">
              The things worth knowing.
            </h2>
            <Faq />
          </div>
        </section>

        {/* -------------------------------------------------------- final cta */}
        <section className="border-t border-[var(--line)] bg-[var(--paper-sunk)]">
          <div className="mx-auto max-w-2xl px-6 py-20 text-center">
            <h2 className="display text-[34px] sm:text-[42px]">
              Your next video is one paste away.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[16px] leading-relaxed text-[var(--ink-muted)]">
              Bring a script you&apos;ve already written and see what comes back.
              The first 40 images are on us.
            </p>
            <div className="mx-auto mt-8 max-w-md">
              <SignInForm />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
