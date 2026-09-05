/**
 * Style presets.
 *
 * These are the product. A generic "pick a style" dropdown produces 100 images
 * that look like 100 different artists; the whole point here is that each block
 * below is specific enough to hold a single look across a full video.
 *
 * Every block is appended verbatim to every prompt in a job, so each prompt is
 * self-contained and order-independent.
 */

export type StylePreset = {
  id: string;
  name: string;
  blurb: string;
  /** Appended to every prompt in the job. Keep it concrete and absolute. */
  block: string;
  /** Fed to the prompt writer so it frames scenes this style can actually render. */
  guidance: string;
  /** Swatch colours for the picker UI. */
  swatch: [string, string, string];
  /**
   * Drives the abstract palette panel shown in the picker and on the landing
   * page. It is a swatch, not a sample — it shows the colours and surface a
   * style works in, and never pretends to be generated output.
   */
  texture: "paper" | "grain" | "halftone" | "flat" | "wash" | "chalk" | "photo" | "ink";
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "handdrawn-educational",
    texture: "paper",
    name: "Hand-drawn Educational",
    blurb: "Warm paper, pen and pencil. Explainers, history, science.",
    swatch: ["#EDE0C8", "#A9743F", "#6E7F5C"],
    block:
      "hand-drawn educational illustration on warm off-white paper with visible paper grain, " +
      "drawn in ink pen with coloured pencil shading, confident slightly uneven dark brown outlines, " +
      "flat muted earth palette of clay red, ochre, olive green, dusty blue and sand, " +
      "loose pencil hatching for shadow, simple friendly cartoon figures with rounded features, " +
      "hand-lettered labels where text appears, generous empty paper space, " +
      "no photorealism, no 3D render, no gradients, no glossy vector polish, no lens effects",
    guidance:
      "Favour clear single-subject scenes, diagrams, cross-sections, maps and simple figures. " +
      "Avoid crowds, complex reflections and photographic detail.",
  },
  {
    id: "archival-documentary",
    texture: "grain",
    name: "Archival Documentary",
    blurb: "Aged photo look. History, war, biography, mystery.",
    swatch: ["#C9B79C", "#7A6A55", "#3A332B"],
    block:
      "aged archival documentary photograph, sepia and desaturated amber tones, " +
      "soft film grain and gentle vignetting, slight paper foxing and edge wear, " +
      "shallow depth of field, natural directional light, muted contrast, " +
      "period-accurate clothing and props, candid unposed framing, " +
      "no modern objects, no text overlays, no saturated colour, no digital sharpening",
    guidance:
      "Favour period scenes, portraits, objects and landscapes. Describe era, place and light explicitly.",
  },
  {
    id: "cinematic-dark",
    texture: "ink",
    name: "Cinematic Dark",
    blurb: "Moody and high contrast. True crime, mystery, disaster.",
    swatch: ["#12161C", "#2E4756", "#C4703A"],
    block:
      "moody cinematic illustration, deep shadow with a single warm key light, " +
      "high contrast teal and amber palette, heavy atmospheric haze and volumetric light, " +
      "desaturated shadows, painterly digital brushwork with soft edges, " +
      "wide anamorphic framing, strong silhouettes, " +
      "no bright cheerful colour, no flat lighting, no cartoon styling, no text",
    guidance:
      "Favour silhouettes, single figures, interiors at night, weather and landscape. " +
      "Name the light source in every scene.",
  },
  {
    id: "flat-vector-explainer",
    texture: "flat",
    name: "Flat Editorial",
    blurb: "Clean and modern. Business, finance, tech explainers.",
    swatch: ["#F3F1EC", "#2B5CE6", "#F2994A"],
    block:
      "flat editorial vector illustration, clean geometric shapes with no outlines, " +
      "restrained palette of off-white background, deep blue, warm orange accent and slate grey, " +
      "simple stylised human figures without facial detail, subtle long shadows, " +
      "generous negative space, balanced centred composition, " +
      "no gradients beyond one soft tone, no photorealism, no texture, no clutter, no text",
    guidance:
      "Favour metaphors, charts, objects and simple figures performing one clear action.",
  },
  {
    id: "storybook-watercolor",
    texture: "wash",
    name: "Storybook Watercolour",
    blurb: "Soft and warm. Wholesome, wellness, nostalgia, 60+.",
    swatch: ["#FBF3E4", "#E8B4A0", "#8FA98F"],
    block:
      "gentle children's storybook watercolour illustration, soft wet-on-wet washes with visible bleed, " +
      "warm cream paper showing through, delicate graphite under-drawing, " +
      "tender pastel palette of blush, sage, butter yellow and pale sky blue, " +
      "rounded cosy shapes, soft diffused daylight, kind expressive faces, " +
      "no harsh lines, no dark shadows, no photorealism, no digital gloss, no text",
    guidance:
      "Favour domestic scenes, nature, animals and small human moments. Keep scenes calm and uncluttered.",
  },
  {
    id: "retro-comic",
    texture: "halftone",
    name: "Retro Comic",
    blurb: "Halftone and bold ink. Gaming, pop culture, listicles.",
    swatch: ["#F5E9C9", "#D94F3D", "#2C6E8F"],
    block:
      "retro 1960s comic book illustration, bold black ink outlines of varying weight, " +
      "visible benday halftone dot shading, slightly misregistered print colour, " +
      "limited punchy palette of red, teal, mustard and cream newsprint, " +
      "dynamic low or high camera angles, exaggerated expressive poses, " +
      "no gradients, no photorealism, no modern digital rendering, no speech bubbles, no text",
    guidance: "Favour action, reaction shots and single dramatic moments.",
  },
  {
    id: "natural-documentary",
    texture: "photo",
    name: "Natural Documentary",
    blurb: "Photoreal nature and place. Geology, wildlife, travel.",
    swatch: ["#8FA7B5", "#6B7F4E", "#B98A50"],
    block:
      "high quality documentary photograph, natural golden-hour or overcast daylight, " +
      "realistic materials and weathering, rich but true-to-life colour, " +
      "wide establishing composition with clear foreground depth, " +
      "shot on full frame with a sharp prime lens, subtle atmospheric perspective, " +
      "no illustration, no painterly effects, no oversaturation, no HDR halos, no text, no people unless asked",
    guidance:
      "Favour landscapes, geological features, weather and wildlife. Name location, time of day and weather.",
  },
  {
    id: "chalkboard-science",
    texture: "chalk",
    name: "Chalk Diagram",
    blurb: "Line and chalk on dark. Maths, physics, how-things-work.",
    swatch: ["#20302B", "#E8E3D6", "#6FB3A0"],
    block:
      "chalk diagram drawn on a dark slate green board, soft white chalk lines with dusty texture, " +
      "occasional pale teal and warm yellow chalk accents, hand-drawn arrows and simple labels, " +
      "faint smudges and eraser marks, schematic rather than realistic, " +
      "flat straight-on view, plenty of empty board around the subject, " +
      "no photorealism, no colour photography, no 3D shading, no glossy surfaces",
    guidance:
      "Favour schematics, force diagrams, cycles, cross-sections and step sequences.",
  },
];

export const DEFAULT_STYLE_ID = "handdrawn-educational";

export function getStyle(id: string): StylePreset {
  return STYLE_PRESETS.find((s) => s.id === id) ?? STYLE_PRESETS[0];
}
