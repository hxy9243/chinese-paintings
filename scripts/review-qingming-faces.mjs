import { chromium } from "../artworks/qingming/node_modules/playwright/index.mjs";
import { preview } from "../artworks/qingming/node_modules/vite/dist/node/index.js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const out = path.resolve(
  root,
  process.env.REVIEW_DIR ?? "docs/reviews/2026-10-20-face-portraits",
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
      : []),
  ],
});
const errors = [],
  failedRequests = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 1300 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("requestfailed", (r) => failedRequests.push(r.url()));
  await page.goto("http://127.0.0.1:4173/figure-study.html?capture=1");
  await page.waitForFunction(() => window.figureStudy, undefined, {
    timeout: 120000,
  });
  const views = [
    ["woman-three-quarter", 6, 0.38],
    ["merchant-front", 0, 0.05],
    ["elder-three-quarter", 7, -0.4],
    ["boatman-profile", 3, 1.05],
  ];
  for (const [name, focus, turn] of views) {
    await page.evaluate((o) => window.figureStudy.frame(8, o), {
      focus,
      turn,
      portrait: true,
    });
    await page.locator("#figures").screenshot({
      path: path.join(out, name + ".jpg"),
      type: "jpeg",
      quality: 95,
    });
  }
  const frame = () =>
    page.evaluate(() =>
      window.figureStudy.frame(8, { focus: 6, turn: 0.38, portrait: true }),
    );
  await frame();
  const before = await page.locator("#figures").screenshot();
  await page.evaluate(() =>
    window.figureStudy.frame(20, { focus: 0, turn: 1, portrait: true }),
  );
  await frame();
  const replay = before.equals(await page.locator("#figures").screenshot());
  await page.route("https://fonts.googleapis.com/**", (r) =>
    r.fulfill({ contentType: "text/css", body: "" }),
  );
  await page.goto("http://127.0.0.1:4173/?capture=1");
  await page.waitForFunction(() => window.qingmingStudy, undefined, {
    timeout: 120000,
  });
  const close = await page.evaluate(() =>
    window.qingmingStudy.frame(24, {
      eye: [-6.65, 3.32, -2],
      look: [5, 1.32, 1],
      fov: 62,
    }),
  );
  const overview = await page.evaluate(() =>
    window.qingmingStudy.frame(24, {
      zoom: 0.96,
      angle: 30,
      pitch: 3,
      target: [0, 0],
    }),
  );
  const sceneDetail =
    close.crowd.levels[2].actors > 0 && overview.crowd.levels[0].actors === 369;
  if (!sceneDetail)
    errors.push("Close and overview crowd detail did not match the camera");
  const sourceHashes = Object.fromEntries(
    [
      "src/faceModels.ts",
      "src/crowd.ts",
      "src/paintMaterial.ts",
      "src/figures.ts",
      "src/figureStudy.ts",
      "src/figureTypes.ts",
      "figure-study.html",
    ].map((name) => [
      name,
      crypto
        .createHash("sha256")
        .update(fs.readFileSync(path.join(root, "artworks/qingming", name)))
        .digest("hex"),
    ]),
  );
  const report = {
    passed: !errors.length && !failedRequests.length && replay,
    errors,
    failedRequests,
    replay,
    sceneDetail,
    crowd: { close: close.crowd, overview: overview.crowd },
    views: views.map(([name, focus, turn]) => ({ name, focus, turn })),
    sourceHashes,
    kind: "Production Three.js geometry; four stills only, no generated imagery or video",
  };
  fs.writeFileSync(
    path.join(out, "review.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
  if (!report.passed) process.exitCode = 1;
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}
