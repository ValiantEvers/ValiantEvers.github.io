// One-off: capture a screenshot of the live aksjeskatt tool → prosjekter/screenshots/aksjeskatt.webp
// Playwright shoots PNG (it has no native webp), then sharp converts to webp q80.
//
// Run from the repo root:
//   npm install --no-save playwright sharp && npx playwright install chromium
//   node scripts/shoot-aksjeskatt.mjs
import { chromium } from "playwright";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const PAGE_URL = "https://www.evers.no/aksjeskatt/";
const OUT = fileURLToPath(new URL("../prosjekter/screenshots/aksjeskatt.webp", import.meta.url));

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(PAGE_URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000); // let the lightweight-charts curves render
  const png = await page.screenshot({ type: "png" }); // 1280x900 viewport (not full page)
  await sharp(png).webp({ quality: 80 }).toFile(OUT);
  console.log("Wrote", OUT);
} finally {
  await browser.close();
}
