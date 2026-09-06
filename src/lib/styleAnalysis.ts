import { generateJson, parseJson } from "./gemini";
import { asResolvedStyle, TEXTURES, type ResolvedStyle } from "./styles";

/**
 * Turns a reference image into a style block.
 *
 * The reference never reaches the image model — FLUX schnell is text-to-image
 * only, and the reference-conditioned endpoints either produce variations of
 * the reference itself or need a second pass per frame that would multiply the
 * cost per video. So a vision model *reads* the reference once and writes the
 * same kind of style description the presets use, and everything downstream is
 * unchanged: same model, same price, same mechanism that already holds a look
 * across a hundred frames.
 *
 * Two rules do the important work in the instruction below:
 *
 *   - Describe HOW it is drawn, never WHAT it shows. A block that mentions the
 *     reference's subject turns every frame in the video into that subject.
 *   - Never name an artist, studio, franchise, character or brand. Naming one
 *     in a prompt is what turns "inspired by" into a complaint, and it is our
 *     fal account that carries the risk.
 */

const SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    block: { type: "string" },
    guidance: { type: "string" },
    swatch: { type: "array", items: { type: "string" } },
    texture: { type: "string", enum: [...TEXTURES] },
    unusable: { type: "boolean" },
    reason: { type: "string" },
  },
  required: ["name", "block", "guidance", "swatch", "texture", "unusable"],
};

const INSTRUCTION = `You are describing the VISUAL STYLE of the attached image so that a text-to-image model can render completely different scenes in the same style.

Write a style block: one paragraph, 45 to 80 words, comma-separated descriptive phrases, lowercase, no sentences. It must cover:
- medium and technique (e.g. ink and coloured pencil on paper, 3D render, oil painting, digital airbrush, 35mm photograph)
- line quality and edges (thick uneven outlines, no outlines, soft edges, hard cel edges)
- the colour palette, named concretely (e.g. "muted palette of clay red, ochre, olive and dusty blue")
- lighting and shadow behaviour
- texture and surface (paper grain, film grain, halftone dots, clean flat vector)
- how figures or faces are stylised, if any appear
- end with 3 to 5 "no X" exclusions that keep the look from drifting

ABSOLUTE RULES:
1. Describe HOW the image is made, never WHAT it depicts. Do not mention the subject, setting, objects, characters or story of this image at all. If the reference shows a castle at sunset, the block must not mention castles, sunsets, or anything else in the picture — only the drawing technique used.
2. Never name an artist, illustrator, studio, film, game, franchise, character, celebrity, brand or trademark, and never write "in the style of". Describe the technique in plain visual terms instead.
3. Do not mention watermarks, logos, captions or UI elements that happen to be in the image.

Also return:
- "name": a short 2 to 4 word label for this look, describing the technique (e.g. "Soft Gouache Storybook", "Grainy Night Photography"). No artist or franchise names.
- "guidance": one sentence telling a storyboard writer what kinds of scenes this style renders well.
- "swatch": exactly 3 hex colours sampled from the image, as "#rrggbb", ordered background, midtone, accent.
- "texture": the closest of paper, grain, halftone, flat, wash, chalk, photo, ink.

Set "unusable": true, with a short "reason", ONLY if the image cannot yield a style — it is blank, corrupt, pure text with no visual style, or its defining feature is a specific copyrighted character or logo rather than a technique. Otherwise "unusable": false.`;

export type StyleAnalysis =
  | { ok: true; style: ResolvedStyle }
  | { ok: false; reason: string };

export async function analyseReference(
  imageBase64: string,
  mimeType: string,
): Promise<StyleAnalysis> {
  const raw = await generateJson({
    temperature: 0.4,
    schema: SCHEMA,
    parts: [
      { inlineData: { mimeType, data: imageBase64 } },
      { text: INSTRUCTION },
    ],
  });

  let parsed: {
    name?: string;
    block?: string;
    guidance?: string;
    swatch?: string[];
    texture?: string;
    unusable?: boolean;
    reason?: string;
  };

  try {
    parsed = parseJson(raw);
  } catch {
    return { ok: false, reason: "Couldn't read that image. Try a different one." };
  }

  if (parsed.unusable) {
    return {
      ok: false,
      reason:
        parsed.reason?.trim() ||
        "That image doesn't give enough to work with. Try one that shows the drawing or photographic style clearly.",
    };
  }

  const style = asResolvedStyle({
    id: "custom",
    name: parsed.name,
    block: parsed.block,
    guidance: parsed.guidance,
    swatch: parsed.swatch,
    texture: parsed.texture,
  });

  if (!style) {
    return {
      ok: false,
      reason: "Couldn't describe a style from that image. Try a clearer reference.",
    };
  }

  return { ok: true, style };
}
