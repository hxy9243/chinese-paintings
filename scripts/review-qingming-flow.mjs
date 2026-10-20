import { chromium } from "../artworks/qingming/node_modules/playwright/index.mjs";
import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const out = "qa/current/bridge-palette";
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: [
    "--no-sandbox",
    "--enable-gpu",
    "--ignore-gpu-blocklist",
    "--use-angle=vulkan",
    "--disable-dev-shm-usage",
  ],
});
const errors = [],
  requests = [],
  measurements = {};
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) requests.push({ status: r.status(), url: r.url() });
  });
  await page.goto("http://127.0.0.1:5180/qingming/?capture=1");
  await page.waitForFunction(() => window.qingmingStudy, { timeout: 120000 });
  for (const palette of ["silk", "indigo-amber"])
    for (const [view, options] of [
      ["overview", { zoom: 1.25, angle: 30, target: [0, 0] }],
      ["bridge", { zoom: 4, angle: 30, pitch: -15, target: [-6, -1] }],
      ["road", { zoom: 3.3, angle: 30, pitch: -12, target: [-7, 5] }],
    ]) {
      measurements[palette + "-" + view] = await page.evaluate(
        (o) => window.qingmingStudy.frame(8, o),
        { ...options, palette },
      );
      await page
        .locator(".study-stage")
        .screenshot({ path: out + "/" + palette + "-" + view + ".png" });
    }
  // A palette change must preserve frame geometry and round-trip appearance.
  const options = {
    zoom: 4,
    angle: 30,
    pitch: -15,
    target: [-6, -1],
    palette: "silk",
  };
  await page.evaluate((o) => window.qingmingStudy.frame(8, o), options);
  const before = await page.locator(".study-stage").screenshot();
  await page.evaluate(() =>
    window.qingmingStudy.frame(20, { palette: "indigo-amber" }),
  );
  await page.evaluate((o) => window.qingmingStudy.frame(8, o), options);
  const after = await page.locator(".study-stage").screenshot();
  measurements.originalRoundTrip = before.equals(after);
  // Check the actual public control, including stored preference after reload.
  await page
    .getByRole("combobox", { name: "Color palette", exact: true })
    .selectOption("indigo-amber");
  await page.reload();
  await page.waitForFunction(() => window.qingmingStudy, { timeout: 120000 });
  measurements.palettePersisted =
    (await page
      .getByRole("combobox", { name: "Color palette", exact: true })
      .inputValue()) === "indigo-amber";
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: out + "/mobile-controls.png", fullPage: true });
  measurements.mobileOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  const frames = out + "/frames";
  fs.mkdirSync(frames, { recursive: true });
  for (let i = 0; i < 32; i++) {
    await page.evaluate(
      (t) =>
        window.qingmingStudy.frame(t, {
          zoom: 3.5,
          angle: 30,
          pitch: -15,
          target: [-6, -1],
          palette: "indigo-amber",
        }),
      8 + i / 8,
    );
    await page
      .locator(".study-stage")
      .screenshot({ path: frames + "/" + String(i).padStart(4, "0") + ".png" });
  }
  execFileSync("ffmpeg", [
    "-y",
    "-v",
    "error",
    "-framerate",
    "8",
    "-i",
    frames + "/%04d.png",
    "-vf",
    "pad=ceil(iw/2)*2:ceil(ih/2)*2",
    "-c:v",
    "libx264",
    "-crf",
    "19",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    out + "/motion.mp4",
  ]);
  const files = [
    "passageLife.ts",
    "paintMaterial.ts",
    "scenePalette.ts",
    "roadSurface.ts",
    "bridgeStudy.ts",
    "Mock3D.tsx",
    "inkFinish.ts",
    "mock3d.css",
  ];
  const sourceHashes = Object.fromEntries(
    files.map((n) => [
      n,
      crypto
        .createHash("sha256")
        .update(fs.readFileSync("artworks/qingming/src/" + n))
        .digest("hex"),
    ]),
  );
  const report = {
    passed:
      !errors.length &&
      !requests.length &&
      measurements.originalRoundTrip &&
      measurements.palettePersisted &&
      !measurements.mobileOverflow,
    errors,
    requests,
    measurements,
    sourceHashes,
    motion: {
      frames: 32,
      fps: 8,
      seconds: 4,
      kind: "offline scene-time sample",
    },
  };
  fs.writeFileSync(
    out + "/review.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      passed: report.passed,
      errors,
      requests,
      bridge: measurements["silk-bridge"].bridgeLife,
    }),
  );
  if (!report.passed) process.exitCode = 1;
} finally {
  await browser.close();
}
