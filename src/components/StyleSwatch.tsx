import type { StylePreset } from "@/lib/styles";

/**
 * An abstract panel showing a style's palette and surface.
 *
 * Deliberately non-representational — bands and texture, never a scene. It has
 * to be obvious at a glance that this is a swatch and not a generated image,
 * because the moment a customer mistakes one for output we have misrepresented
 * the product. Real output goes in public/samples and renders separately.
 */

function texture(kind: StylePreset["texture"], ink: string) {
  switch (kind) {
    case "paper": // pencil hatching
      return {
        backgroundImage: `repeating-linear-gradient(48deg, ${ink}14 0 1px, transparent 1px 5px)`,
      };
    case "grain": // film grain
      return {
        backgroundImage: `radial-gradient(${ink}20 1px, transparent 1px)`,
        backgroundSize: "3px 3px",
      };
    case "halftone": // benday dots
      return {
        backgroundImage: `radial-gradient(${ink}33 1.6px, transparent 1.7px)`,
        backgroundSize: "7px 7px",
      };
    case "chalk": // dusty board
      return {
        backgroundImage: `repeating-linear-gradient(92deg, ${ink}10 0 1px, transparent 1px 9px)`,
      };
    case "ink": // heavy vignette
      return {
        backgroundImage: `radial-gradient(circle at 62% 40%, transparent 20%, ${ink}55 95%)`,
      };
    case "wash": // soft bleed
      return {
        backgroundImage: `radial-gradient(circle at 30% 70%, ${ink}22, transparent 60%)`,
      };
    case "photo": // depth gradient
      return {
        backgroundImage: `linear-gradient(to top, ${ink}30, transparent 65%)`,
      };
    case "flat":
    default:
      return {};
  }
}

export default function StyleSwatch({
  style,
  className = "",
}: {
  style: StylePreset;
  className?: string;
}) {
  const [ground, mid, accent] = style.swatch;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: ground }}
      aria-hidden="true"
    >
      {/* Horizon band */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38%]"
        style={{ background: mid, opacity: 0.9 }}
      />
      {/* Form */}
      <div
        className="absolute left-[16%] top-[24%] h-[46%] w-[30%] rounded-full"
        style={{ background: accent, opacity: 0.92 }}
      />
      <div
        className="absolute right-[14%] top-[46%] h-[26%] w-[20%]"
        style={{ background: accent, opacity: 0.55 }}
      />
      {/* Surface */}
      <div className="absolute inset-0" style={texture(style.texture, "#000")} />
    </div>
  );
}
