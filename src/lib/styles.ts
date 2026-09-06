/**
 * Style presets.
 *
 * These are the product. A generic "pick a style" dropdown produces 100 images
 * that look like 100 different artists; every block below is specific enough to
 * hold a single look across a full video.
 *
 * They are organised by MEDIUM, not by subject. A creator doesn't think "I make
 * documentaries", they think "my channel is the stickman one" or "mine is the
 * oil painting one" — the medium is the channel's identity, and it's what they
 * are choosing between.
 *
 * Every block is appended verbatim to every prompt in a job, so each prompt is
 * self-contained and order-independent.
 *
 * Rules for writing one:
 *   - Name the medium, the line quality, the palette, the lighting and the
 *     surface. Vague blocks drift over a hundred frames.
 *   - Never name an artist, studio, film or franchise. Describe the technique
 *     in plain visual terms instead — it is legally safer and it prompts better.
 *   - End with exclusions. They do more work than anything else to stop a look
 *     sliding halfway through a set.
 */

export type StylePreset = {
  id: string;
  name: string;
  /** The niche this look actually serves, in the creator's own terms. */
  blurb: string;
  /** Appended to every prompt in the job. Keep it concrete and absolute. */
  block: string;
  /** Fed to the prompt writer so it frames scenes this style can actually render. */
  guidance: string;
  /** Swatch colours, used until a rendered preview exists. */
  swatch: [string, string, string];
  /**
   * Drives the abstract palette panel shown before a preview is rendered. It is
   * a swatch, not a sample — it shows the colours and surface a style works in,
   * and never pretends to be generated output.
   */
  texture:
    | "paper"
    | "grain"
    | "halftone"
    | "flat"
    | "wash"
    | "chalk"
    | "photo"
    | "ink"
    | "gloss"
    | "cel";
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "stickman-whiteboard",
    texture: "flat",
    name: "Stickman",
    blurb: "Whiteboard stick figures. Psychology, life advice, story explainers.",
    swatch: ["#FFFFFF", "#1A1A1A", "#E4572E"],
    block:
      "minimal stick figure illustration on a plain white background, " +
      "simple black marker linework of even weight, stick figures with round featureless heads and straight limbs, " +
      "one single accent colour used sparingly for emphasis, flat fills with no shading, " +
      "clean hand-drawn arrows and simple geometric props, generous white space around the subject, " +
      "whiteboard explainer look, " +
      "no detailed faces, no realistic anatomy, no photorealism, no gradients, no texture, no background scenery",
    guidance:
      "Favour one or two figures doing a single clear action, simple objects, arrows and diagrams. Keep scenes to one idea.",
  },
  {
    id: "classical-oil",
    texture: "paper",
    name: "Classical Oil Painting",
    blurb: "Museum oil on canvas. History, philosophy, stoicism, mythology.",
    swatch: ["#2B211A", "#8A6134", "#D9B679"],
    block:
      "classical oil painting on canvas in the old master tradition, " +
      "thick visible brushwork and impasto highlights, warm chiaroscuro lighting with deep shadow and a single light source, " +
      "rich earth palette of burnt umber, ochre, deep crimson and lead white, " +
      "aged varnish glaze with subtle craquelure, soft edges dissolving into darkness, " +
      "dramatic gestural composition, canvas weave visible in the surface, " +
      "no photorealism, no digital smoothness, no bright saturated colour, no modern objects, no text",
    guidance:
      "Favour single figures, groups in dramatic moments, hands, faces and interiors. Name the light source in every scene.",
  },
  {
    id: "cinematic-realism",
    texture: "photo",
    name: "Cinematic Realism",
    blurb: "Film-grade photoreal. True crime, mystery, disaster, biography.",
    swatch: ["#12161C", "#3E5C6B", "#C4703A"],
    block:
      "cinematic film still, photorealistic, shot on 35mm anamorphic with shallow depth of field, " +
      "teal shadows and warm amber highlights, strong single-source key light with deep falloff, " +
      "fine film grain and gentle lens bloom, atmospheric haze catching the light, " +
      "muted desaturated colour grade, wide composition with the subject small in frame, " +
      "no illustration, no cartoon styling, no oversaturation, no HDR halos, no text, no visible camera",
    guidance:
      "Favour silhouettes, interiors at night, weather, streets and landscapes. Always state the light source and time of day.",
  },
  {
    id: "animated-3d",
    texture: "gloss",
    name: "3D Animation",
    blurb: "Modern animated feature look. Fables, kids' stories, what-ifs.",
    swatch: ["#8FD3E8", "#F2A65A", "#3E7C59"],
    block:
      "stylised 3D cartoon animation still, non-photorealistic CG render, " +
      "characters with deliberately exaggerated cartoon proportions, oversized head, " +
      "large round glossy eyes, stubby simplified hands and chunky rounded body shapes, " +
      "smooth matte toy-like surfaces with a soft waxy sheen and gentle subsurface glow, " +
      "every edge rounded and softened, bright saturated candy colour palette, " +
      "soft studio global illumination with warm bounce light and gentle rim light, " +
      "shallow depth of field, clean polished animated-film render, " +
      "no photorealism, no realistic human anatomy or faces, no photographic skin or fabric texture, " +
      "no live action, no film still, no gritty realism, no text",
    guidance:
      "Favour one exaggerated cartoon character or animal in a simplified colourful setting. " +
      "Describe people as cartoon characters, never as realistic humans.",
  },
  {
    id: "anime-still",
    texture: "cel",
    name: "Anime",
    blurb: "Cel-shaded anime frame. Motivational, story, recap channels.",
    swatch: ["#EAF2F8", "#2E5C8A", "#E8735A"],
    block:
      "anime television still, clean cel shading with hard-edged shadow shapes, " +
      "crisp dark ink linework of varying weight, large expressive eyes and simplified facial features, " +
      "vivid but limited palette, painterly detailed background with soft gradients behind flat characters, " +
      "dramatic sky and lens flare, strong diagonal composition, " +
      "no photorealism, no 3D render, no western comic styling, no halftone dots, no text, no speech bubbles",
    guidance:
      "Favour single characters, emotional reaction shots, skies, cityscapes and quiet interiors.",
  },
  {
    id: "dark-fantasy",
    texture: "ink",
    name: "Dark Fantasy",
    blurb: "Epic concept art. Mythology, lore, horror, ancient history.",
    swatch: ["#14171F", "#4A3B63", "#C9A227"],
    block:
      "epic dark fantasy concept art, painterly digital brushwork with visible strokes, " +
      "enormous sense of scale with a small figure against a vast environment, " +
      "deep shadow, volumetric god rays and heavy atmospheric fog, " +
      "muted palette of charcoal, slate blue and violet lit by a single gold or ember light, " +
      "ornate weathered detail on stone, armour and cloth, ominous mood, " +
      "no bright cheerful colour, no cartoon styling, no photorealism, no modern objects, no text",
    guidance:
      "Favour vast landscapes, ruins, lone figures, creatures and interiors lit by fire. Emphasise scale.",
  },
  {
    id: "comic-panel",
    texture: "halftone",
    name: "Comic Book",
    blurb: "Bold ink and halftone. Retellings, action, listicles, gaming.",
    swatch: ["#F5E9C9", "#D94F3D", "#2C6E8F"],
    block:
      "vintage comic book panel, bold black ink outlines of varying weight, " +
      "visible benday halftone dot shading, slightly misregistered print colour on cream newsprint, " +
      "limited punchy palette of red, teal, mustard and cream, " +
      "dynamic low or high camera angle, exaggerated dramatic poses, hard cast shadows, " +
      "no gradients, no photorealism, no modern digital rendering, no speech bubbles, no text, no panel borders",
    guidance:
      "Favour action, reaction shots and single dramatic moments. One clear subject per frame.",
  },
  {
    id: "storybook-watercolour",
    texture: "wash",
    name: "Storybook Watercolour",
    blurb: "Soft and warm. Wholesome, wellness, nostalgia, 60+ audiences.",
    swatch: ["#FBF3E4", "#E8B4A0", "#8FA98F"],
    block:
      "gentle children's storybook watercolour illustration, soft wet-on-wet washes with visible bleed and blooms, " +
      "warm cream paper texture showing through the paint, delicate graphite under-drawing, " +
      "tender pastel palette of blush, sage, butter yellow and pale sky blue, " +
      "rounded cosy shapes, soft diffused daylight, kind gentle faces, " +
      "no harsh lines, no dark shadows, no photorealism, no digital gloss, no text",
    guidance:
      "Favour domestic scenes, nature, animals and small human moments. Keep scenes calm and uncluttered.",
  },
  {
    id: "vintage-engraving",
    texture: "grain",
    name: "Vintage Engraving",
    blurb: "Antique book plate. History, science, curiosities, old-world lore.",
    swatch: ["#EFE7D5", "#6B5B45", "#1F1B16"],
    block:
      "antique copperplate engraving, dense parallel hatching and cross-hatching building all tone, " +
      "fine precise black linework on aged ivory paper with foxing and faint stains, " +
      "monochrome sepia and black ink only, high detail in the subject and empty paper around it, " +
      "flat encyclopaedic composition seen straight on, " +
      "no colour, no photorealism, no digital shading, no gradients, no modern objects, no text",
    guidance:
      "Favour specimens, machines, anatomy, maps, buildings and single figures presented plainly.",
  },
  {
    id: "claymation",
    texture: "gloss",
    name: "Claymation",
    blurb: "Stop-motion plasticine. Quirky humour, kids, offbeat storytelling.",
    swatch: ["#F0DCC4", "#C25B4E", "#5C8C7B"],
    block:
      "stop-motion animation frame in which every single object is handmade from modelling clay, " +
      "the ground, the rocks, the hills and the painted backdrop are all lumpy sculpted plasticine, " +
      "thick fingerprints, seams, squashed edges and sculpting tool marks pressed into every surface, " +
      "thumb-shaped bumps and uneven hand-rolled forms throughout, matte waxy clay sheen catching the light, " +
      "characters built from chunky clay lumps with stubby limbs, flat feet and small pressed bead eyes, " +
      "obvious tabletop diorama scale, flat even studio lighting with the whole small set visible, " +
      "bright putty, brick red and sage clay colours, " +
      "no real rock, no real sky, no photographic landscape, no realistic skin or fabric, " +
      "no depth of field haze, no photorealism, no CGI, no live action, no flat illustration, no text",
    guidance:
      "Favour small tabletop scenes with one or two clay characters and simple handmade props. " +
      "Keep everything close, miniature and obviously built by hand.",
  },
  {
    id: "flat-editorial",
    texture: "flat",
    name: "Flat Editorial",
    blurb: "Clean modern vector. Business, finance, tech, productivity.",
    swatch: ["#F3F1EC", "#2B5CE6", "#F2994A"],
    block:
      "flat editorial vector illustration, clean geometric shapes with no outlines, " +
      "restrained palette of off-white background, deep blue, warm orange accent and slate grey, " +
      "simple stylised human figures without facial detail, one soft long shadow per object, " +
      "generous negative space, balanced centred composition, " +
      "no gradients beyond one soft tone, no photorealism, no texture, no clutter, no text",
    guidance:
      "Favour metaphors, charts, objects and simple figures performing one clear action.",
  },
  {
    id: "notebook-doodle",
    texture: "paper",
    name: "Notebook Doodle",
    blurb: "Pen on paper. Study, science, how-things-work, explainers.",
    swatch: ["#F6F1E4", "#2F4C6B", "#C46A33"],
    block:
      "hand-drawn blue biro doodle on lined school notebook paper, " +
      "scratchy ballpoint pen linework with visible over-drawn strokes and dark ink build-up at the corners, " +
      "printed horizontal rule lines and a red vertical margin line clearly showing through the drawing, " +
      "quick coloured pencil scribble fill that overshoots the outlines and leaves white gaps, " +
      "hand-lettered capital labels and hand-drawn arrows, doodles in the margin, " +
      "smudges, eraser marks and a slight page curl, flat naive perspective, " +
      "no photorealism, no clean vector shapes, no smooth gradients, no painterly rendering, " +
      "no faint pencil sketching, no digital polish",
    guidance:
      "Favour diagrams, cross-sections, labelled parts, simple figures and step sequences drawn plainly.",
  },
];

export const DEFAULT_STYLE_ID = "stickman-whiteboard";

export function getStyle(id: string): StylePreset {
  return STYLE_PRESETS.find((s) => s.id === id) ?? STYLE_PRESETS[0];
}

export const TEXTURES = [
  "paper",
  "grain",
  "halftone",
  "flat",
  "wash",
  "chalk",
  "photo",
  "ink",
  "gloss",
  "cel",
] as const;

/**
 * A style ready to use, whether it came from a preset or from a customer's own
 * reference image. Everything downstream — prompt writing, generation, the
 * swatch panel — works off this shape and doesn't care which it was.
 */
export type ResolvedStyle = {
  id: string;
  name: string;
  blurb?: string;
  block: string;
  guidance: string;
  swatch: [string, string, string];
  texture: StylePreset["texture"];
};

function isTexture(v: unknown): v is StylePreset["texture"] {
  return typeof v === "string" && (TEXTURES as readonly string[]).includes(v);
}

/** Coerces an unknown value (a jsonb column, an API body) into a usable style. */
export function asResolvedStyle(value: unknown): ResolvedStyle | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;

  if (typeof v.block !== "string" || v.block.trim().length < 20) return null;

  const swatch = Array.isArray(v.swatch)
    ? v.swatch.filter((c): c is string => typeof c === "string" && /^#[0-9a-f]{6}$/i.test(c))
    : [];

  return {
    id: typeof v.id === "string" ? v.id : "custom",
    name: typeof v.name === "string" && v.name.trim() ? v.name.trim() : "Custom style",
    block: v.block.trim(),
    guidance: typeof v.guidance === "string" ? v.guidance.trim() : "",
    swatch: [swatch[0] ?? "#e2dad0", swatch[1] ?? "#9c9488", swatch[2] ?? "#b4552d"],
    texture: isTexture(v.texture) ? v.texture : "flat",
  };
}

/**
 * Presets that no longer exist, kept so older projects still show the name they
 * were actually made with.
 *
 * Jobs created before migration 002 carry no style snapshot, only an id. Without
 * this, rewriting the preset list would silently relabel every one of them as
 * whatever preset happens to sit first in the array. Their images are unaffected
 * either way — the prompts were written long ago — but a project that says it
 * was made in a style it wasn't is a lie in the interface.
 */
const RETIRED_STYLES: Record<string, { name: string; swatch: [string, string, string] }> = {
  "handdrawn-educational": { name: "Hand-drawn Educational", swatch: ["#EDE0C8", "#A9743F", "#6E7F5C"] },
  "archival-documentary": { name: "Archival Documentary", swatch: ["#C9B79C", "#7A6A55", "#3A332B"] },
  "cinematic-dark": { name: "Cinematic Dark", swatch: ["#12161C", "#2E4756", "#C4703A"] },
  "flat-vector-explainer": { name: "Flat Editorial", swatch: ["#F3F1EC", "#2B5CE6", "#F2994A"] },
  "storybook-watercolor": { name: "Storybook Watercolour", swatch: ["#FBF3E4", "#E8B4A0", "#8FA98F"] },
  "retro-comic": { name: "Retro Comic", swatch: ["#F5E9C9", "#D94F3D", "#2C6E8F"] },
  "natural-documentary": { name: "Natural Documentary", swatch: ["#8FA7B5", "#6B7F4E", "#B98A50"] },
  "chalkboard-science": { name: "Chalk Diagram", swatch: ["#20302B", "#E8E3D6", "#6FB3A0"] },
};

/**
 * The style a job was actually generated with.
 *
 * Prefers the snapshot stored on the job, because a job is a historical record
 * and must not change meaning when a saved style is edited or deleted later —
 * or, as here, when the preset list itself is rewritten.
 */
export function resolveJobStyle(job: {
  style?: unknown;
  style_id: string;
}): ResolvedStyle {
  const snapshot = asResolvedStyle(job.style);
  if (snapshot) return snapshot;

  const current = STYLE_PRESETS.find((s) => s.id === job.style_id);
  if (current) return current;

  const retired = RETIRED_STYLES[job.style_id];
  if (retired) {
    return {
      id: job.style_id,
      name: retired.name,
      block: "",
      guidance: "",
      swatch: retired.swatch,
      texture: "flat",
    };
  }

  return STYLE_PRESETS[0];
}
