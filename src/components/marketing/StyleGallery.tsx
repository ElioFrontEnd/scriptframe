import { STYLE_PRESETS } from "@/lib/styles";
import { getSampleImages } from "@/lib/samples";
import StyleSwatch from "@/components/StyleSwatch";

/**
 * The style list. Each card shows real sample frames once they exist in
 * public/samples, and an abstract palette panel until then — never an invented
 * image standing in for output.
 */
export default function StyleGallery() {
  const styles = STYLE_PRESETS.map((s) => ({
    ...s,
    images: getSampleImages(s.id, 3),
  }));

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {styles.map((style) => (
        <figure
          key={style.id}
          className="card group overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--lift-2)]"
        >
          {style.images.length > 0 ? (
            <div className="grid grid-cols-3 gap-px bg-[var(--line)]">
              {style.images.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full bg-[var(--paper-sunk)] object-cover"
                />
              ))}
            </div>
          ) : (
            <StyleSwatch style={style} className="aspect-[16/10] w-full" />
          )}

          <figcaption className="p-4">
            <h3
              className="text-[16px] leading-tight text-[var(--ink)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {style.name}
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-muted)]">
              {style.blurb}
            </p>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
