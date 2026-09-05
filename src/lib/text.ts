/**
 * A stored prompt is `<scene>. <style block>` — the style block is long,
 * identical across every frame in a set, and useless in a card. This pulls the
 * scene back out for display. The full prompt is still what gets edited and
 * sent to the model.
 */
export function sceneOf(prompt: string): string {
  const cut = prompt.indexOf(". ");
  if (cut > 20) return prompt.slice(0, cut);
  return prompt;
}
