import { chromium } from '../artworks/qingming/node_modules/playwright/index.mjs';
import { createServer } from '../artworks/qingming/node_modules/vite/dist/node/index.js';
import fs from 'node:fs';

const out = 'docs/reviews/2026-10-22-art-styles';
fs.mkdirSync(out, { recursive: true });

const server = await createServer({
  root: 'artworks/qingming',
  server: { host: '127.0.0.1', port: 4184, strictPort: true },
});
await server.listen();

const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ??
    (fs.existsSync('/tmp/chromium') ? '/tmp/chromium' : undefined),
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-zygote',
    '--single-process',
  ],
});

const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
    deviceScaleFactor: 1.25,
    reducedMotion: 'reduce',
  });
  page.on('pageerror', (e) => {
    errors.push(e.message);
    console.log('PAGE ERROR', e.message);
  });
  await page.route('https://fonts.googleapis.com/**', (r) =>
    r.fulfill({ body: '', contentType: 'text/css' }),
  );
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:4184/?capture=1');
  await page.waitForFunction(() => window.qingmingStudy, undefined, {
    timeout: 120000,
  });
  const initMs = Date.now() - t0;
  console.log(`Scene initialized in ${initMs}ms`);

  await page.addStyleTag({
    content:
      '.study-stamp,.study-badge,.study-zoom,.study-gesture{display:none!important}.study-stage{border-radius:0!important}',
  });

  const styles = [
    ['jiehua-ink', 'silk'],
    ['anamorphic-scroll', 'silk'],
    ['baimiao-mineral', 'indigo-amber'],
    ['river-mist-cinema', 'silk'],
    ['xieyi-poetic', 'silk'],
  ];

  const views = [
    ['bridge', { zoom: 1.7, angle: 14, pitch: 0, target: [5, 3] }],
    ['crossroads', { zoom: 1.6, angle: 16, pitch: 4, target: [-33, 1] }],
  ];

  const measurements = { initMs, captures: {} };

  for (const [styleId, palette] of styles) {
    for (const [viewName, viewOpts] of views) {
      const key = `${styleId}-${viewName}`;
      const f0 = Date.now();
      const stats = await page.evaluate(
        ({ o, styleId, palette }) =>
          window.qingmingStudy.frame(0, { ...o, style: styleId, palette }),
        { o: viewOpts, styleId, palette },
      );
      const frameMs = Date.now() - f0;
      measurements.captures[key] = {
        style: stats.artStyle,
        palette: stats.palette,
        triangles: stats.triangles,
        calls: stats.calls,
        frameMs,
      };
      await page.locator('.study-stage').screenshot({
        path: `${out}/${key}.jpg`,
        type: 'jpeg',
        quality: 90,
        timeout: 120000,
      });
      console.log(`${key} (${frameMs}ms, calls=${stats.calls}, tris=${stats.triangles})`);
    }
  }

  // Also capture full-layout in Default Jiehua & Five-Tone Ink
  const fullStats = await page.evaluate(() =>
    window.qingmingStudy.frame(0, {
      zoom: 0.59,
      angle: 10,
      pitch: 0,
      target: [-9, -1],
      style: 'jiehua-ink',
      palette: 'silk',
    }),
  );
  measurements.captures['jiehua-ink-full-layout'] = {
    style: fullStats.artStyle,
    palette: fullStats.palette,
    triangles: fullStats.triangles,
    calls: fullStats.calls,
  };
  await page.locator('.study-stage').screenshot({
    path: `${out}/jiehua-ink-full-layout.jpg`,
    type: 'jpeg',
    quality: 90,
    timeout: 120000,
  });

  fs.writeFileSync(
    `${out}/review.json`,
    JSON.stringify({ errors, measurements }, null, 2),
  );
  if (errors.length) process.exitCode = 1;
} finally {
  await browser.close();
  await server.close();
}
