import { chromium } from "../artworks/qingming/node_modules/playwright/index.mjs";
import { preview } from "../artworks/qingming/node_modules/vite/dist/node/index.js";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

// Capture the real app, including ink, water and fully refined scene chunks.
// Baseline runs should use REVIEW_DIR outside the repository and keep the
// recorded revision with their images so they cannot be mistaken for a new pass.
const out = process.env.REVIEW_DIR ?? "docs/reviews/2026-10-21-reference-layout";
fs.mkdirSync(out, { recursive: true });
const server = await preview({ root: "artworks/qingming", preview: { host: "127.0.0.1", port: 4185, strictPort: true } });
let browser;
const report = {
  revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  dirty: execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
  renderer: "Qingming app / Chromium / SwiftShader / silk palette",
  errors: [], views: {},
};
try {
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 2200, height: 1400 }, reducedMotion: "reduce" });
  // External font availability does not affect geometry or shaders.
  await page.route("https://fonts.googleapis.com/**", r => r.fulfill({ contentType: "text/css", body: "" }));
  page.on("pageerror", e => report.errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") report.errors.push(m.text()); });
  await page.goto("http://127.0.0.1:4185/?capture=1");
  await page.waitForFunction(() => window.qingmingStudy, undefined, { timeout: 120000 });
  for (const [name, options] of [
    ["birds-eye", { zoom: .53, angle: 0, pitch: 45, target: [-20, -12] }],
    ["composition-view", { zoom: .60, angle: 0, pitch: 0, target: [-20, -8] }],
    ["bend-detail", { zoom: 1.2, angle: 0, pitch: 7, target: [-42, -12] }],
  ]) {
    report.views[name] = { options, metrics: await page.evaluate(options => window.qingmingStudy.frame(0, { ...options, palette: "silk" }), options) };
    await page.locator(".study-stage").screenshot({ path: `${out}/${name}.png` });
    console.log(`Captured ${name}`);
  }
  if (report.errors.length) process.exitCode = 1;
} finally {
  fs.writeFileSync(`${out}/review.json`, JSON.stringify(report, null, 2) + "\n");
  if (browser) await browser.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
