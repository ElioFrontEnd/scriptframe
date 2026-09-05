/**
 * Screenshots pages from a running server so the design can be reviewed by eye
 * rather than imagined.
 *
 *   node scripts/shoot.mjs [baseUrl] [outDir]
 *
 * Webfonts are blocked in this build environment, so shots show the fallback
 * stack (Charter / system sans). That is deliberate: if the layout holds with
 * the fallbacks, it holds everywhere.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? "/tmp/shots";

const PAGES = [
  { path: "/", name: "landing", full: true },
  { path: "/terms", name: "terms", full: false },
  { path: "/privacy", name: "privacy", full: false },
  { path: "/dev/preview", name: "preview-app", full: true },
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  for (const target of PAGES) {
    const url = `${BASE}${target.path}`;
    try {
      const res = await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      // Let fade-in animations settle so shots aren't caught mid-transition.
      await page.waitForTimeout(700);

      const file = join(OUT, `${target.name}-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: target.full && vp.name === "desktop" });
      console.log(`  ${res?.status()}  ${target.path}  ->  ${file}`);
    } catch (err) {
      console.log(`  FAIL ${target.path}: ${err.message.split("\n")[0]}`);
    }
  }

  await context.close();
}

await browser.close();
console.log(`\nShots in ${OUT}`);
