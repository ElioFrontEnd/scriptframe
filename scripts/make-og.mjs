/**
 * Renders the social preview card to public/og.png.
 *
 *   node scripts/make-og.mjs
 *
 * Generated as a static file rather than with next/og so there is no runtime
 * font fetch to fail in production — a link shared on Reddit either shows the
 * card or it doesn't, and "sometimes" is the worst option.
 *
 * Re-run it if the tagline or palette changes.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "public");
mkdirSync(OUT, { recursive: true });

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    background: #faf7f2;
    background-image: radial-gradient(rgba(28,26,23,.03) 1px, transparent 1px);
    background-size: 5px 5px;
    font-family: Georgia, "Bitstream Charter", serif;
    color: #1c1a17;
    padding: 76px 84px;
    display: flex; flex-direction: column; justify-content: space-between;
    position: relative; overflow: hidden;
  }
  .mark { display: flex; align-items: center; gap: 16px; }
  .mark svg { display: block; }
  .name { font-size: 34px; letter-spacing: -.01em; }
  h1 { font-size: 86px; line-height: 1.03; letter-spacing: -.025em; font-weight: 400; max-width: 15ch; }
  em { font-style: italic; }
  p { font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 26px; line-height: 1.5; color: #6b6459; max-width: 30ch; margin-top: 24px; }
  .foot { font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
          font-size: 22px; color: #9c9488; display: flex; gap: 28px; align-items: center; }
  .dot { width: 5px; height: 5px; border-radius: 50%; background: #cfc4b6; }
  .strip { position: absolute; right: -60px; bottom: -40px; display: flex; gap: 14px; transform: rotate(-8deg); opacity: .5; }
  .frame { width: 190px; height: 107px; border-radius: 8px; border: 1px solid #e2dad0; overflow: hidden; position: relative; }
</style></head><body>
  <div class="mark">
    <svg width="44" height="44" viewBox="0 0 32 32">
      <rect width="32" height="32" rx="7" fill="#1c1a17"/>
      <path d="M8 10.5a2.5 2.5 0 0 1 2.5-2.5H18v4h-5.5v9H8Z" fill="#faf7f2"/>
      <path d="M24 21.5a2.5 2.5 0 0 1-2.5 2.5H14v-4h5.5v-9H24Z" fill="#b4552d"/>
    </svg>
    <span class="name">Cutframe</span>
  </div>

  <div>
    <h1>Paste your script. Get <em>every</em> image for the video.</h1>
    <p>One look held from the first frame to the last, numbered in script order.</p>
  </div>

  <div class="foot">
    <span>cutframe.app</span><span class="dot"></span>
    <span>40 free images</span><span class="dot"></span>
    <span>No subscription</span>
  </div>

  <div class="strip">
    ${[
      ["#EDE0C8", "#A9743F", "#6E7F5C"],
      ["#C9B79C", "#7A6A55", "#3A332B"],
      ["#12161C", "#2E4756", "#C4703A"],
      ["#FBF3E4", "#E8B4A0", "#8FA98F"],
    ]
      .map(
        ([g, m, a]) => `<div class="frame" style="background:${g}">
          <div style="position:absolute;left:0;right:0;bottom:0;height:38%;background:${m}"></div>
          <div style="position:absolute;left:16%;top:22%;width:30%;height:48%;border-radius:50%;background:${a}"></div>
        </div>`,
      )
      .join("")}
  </div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: join(OUT, "og.png") });
await browser.close();

console.log("Wrote public/og.png (1200×630)");
