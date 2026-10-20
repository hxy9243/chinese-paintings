import { chromium } from "../artworks/qingming/node_modules/playwright/index.mjs";
import { preview } from "../artworks/qingming/node_modules/vite/dist/node/index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = path.resolve(
  root,
  process.env.REVIEW_DIR ?? "docs/reviews/2026-10-20-proportions-water",
);
fs.mkdirSync(out, { recursive: true });
const server = await preview({
  root: path.join(root, "artworks/qingming"),
  preview: { host: "127.0.0.1", port: 4173, strictPort: true },
});
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
  args: [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    ...(process.env.PLAYWRIGHT_USE_SWIFTSHADER === "1"
      ? ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
      : ["--enable-gpu", "--use-angle=vulkan"]),
  ],
});
const errors = [],
  failedRequests = [],
  measurements = {};
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    reducedMotion: "reduce",
  });
  // Optional local font mirror for restricted-network capture machines. No app
  // resource or shader request is intercepted.
  const fonts = process.env.QINGMING_QA_FONTS;
  const css = fonts
    ? fs
        .readFileSync(path.join(fonts, "400.css"), "utf8")
        .replaceAll("./files/", "https://qingming-fonts.test/")
    : "";
  await page.route("https://fonts.googleapis.com/**", (r) =>
    r.fulfill({ contentType: "text/css", body: css }),
  );
  await page.route("https://qingming-fonts.test/**", (r) =>
    r.fulfill({
      contentType: "font/woff2",
      headers: { "access-control-allow-origin": "*" },
      body: fs.readFileSync(
        path.join(
          fonts,
          "files",
          path.basename(new URL(r.request().url()).pathname),
        ),
      ),
    }),
  );
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("requestfailed", (r) =>
    failedRequests.push({ url: r.url(), error: r.failure()?.errorText }),
  );
  await page.goto("http://127.0.0.1:4173/?capture=1");
  await page.waitForFunction(() => window.qingmingStudy, { timeout: 120000 });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  for (const [view, options] of [
    ["river-overview", { zoom: 1.08, angle: 30, pitch: 3, target: [0, 0] }],
    [
      "bridge-and-streets",
      { zoom: 2.6, angle: -50, pitch: 6, target: [-6, 1] },
    ],
    ["water-and-banks", { zoom: 2.4, angle: 70, pitch: -10, target: [6, -1] }],
  ]) {
    measurements[view] = await page.evaluate(
      (o) => window.qingmingStudy.frame(24, o),
      { ...options, palette: "indigo-amber" },
    );
    await page
      .locator(".study-stage")
      .screenshot({
        path: path.join(out, view + ".jpg"),
        type: "jpeg",
        quality: 94,
      });
  }
  const replay = () =>
    page.evaluate(() =>
      window.qingmingStudy.frame(24, {
        zoom: 1.25,
        angle: 30,
        pitch: 0,
        target: [0, 0],
        palette: "indigo-amber",
      }),
    );
  await replay();
  const before = await page.locator(".study-stage").screenshot();
  await page.evaluate(() => window.qingmingStudy.frame(90));
  await replay();
  measurements.sameTimeReplay = before.equals(
    await page.locator(".study-stage").screenshot(),
  );
  await page.evaluate(() =>
    window.qingmingStudy.frame(26, {
      zoom: 2.4,
      angle: 70,
      pitch: -10,
      target: [6, -1],
    }),
  );
  const moving = await page.locator(".study-stage").screenshot();
  await page.evaluate(() =>
    window.qingmingStudy.frame(24, {
      zoom: 2.4,
      angle: 70,
      pitch: -10,
      target: [6, -1],
    }),
  );
  measurements.sceneChanges = !moving.equals(
    await page.locator(".study-stage").screenshot(),
  );
  const files = [
    "pedestrians.ts",
    "boatWakes.ts",
    "riverSurface.ts",
    "passageLife.ts",
    "passageLayout.ts",
    "bridgeStudy.ts",
    "paintMaterial.ts",
    "inkFinish.ts",
    "scenePalette.ts",
    "marketModels.ts",
    "referenceAssets.ts",
    "Mock3D.tsx",
  ];
  const sourceHashes = Object.fromEntries(
    files.map((name) => [
      name,
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(root, "artworks/qingming/src", name)))
        .digest("hex"),
    ]),
  );
  const report = {
    passed:
      !errors.length &&
      !failedRequests.length &&
      measurements.sameTimeReplay &&
      measurements.sceneChanges,
    errors,
    failedRequests,
    measurements,
    sourceHashes,
    localFonts: Boolean(fonts),
    kind: "still screenshots only; absolute scene-time checks",
  };
  fs.writeFileSync(
    path.join(out, "review.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      passed: report.passed,
      errors,
      failedRequests,
      replay: measurements.sameTimeReplay,
      sceneChanges: measurements.sceneChanges,
      views: Object.keys(measurements),
    }),
  );
  if (!report.passed) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
