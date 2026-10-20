const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

(async () => {
  const snapshot = execFileSync('git', ['rev-parse', process.argv[2] || 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'blue-green-portable-'));
  let browser, server;
  try {
    const archive = execFileSync('git', ['archive', snapshot], { cwd: root, maxBuffer: 256 * 1024 * 1024 });
    execFileSync('tar', ['-xf', '-', '-C', temporary], { input: archive });
    const manifest = JSON.parse(fs.readFileSync(path.join(temporary, 'scene-manifest.json')));
    const entries = [
      ...Object.entries(manifest.sources),
      ...Object.entries(manifest.artifacts).map(([file, value]) => [file, value.sha256]),
      ['reference/source.png', manifest.sourcePainting.sha256],
    ];
    const failedHashes = entries.filter(([file, sha]) => digest(path.join(temporary, file)) !== sha).map(([file]) => file);
    if (failedHashes.length) throw new Error('Snapshot hash mismatch: ' + failedHashes.join(', '));

    const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.glb': 'model/gltf-binary' };
    server = http.createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = path.resolve(temporary, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
      if (!file.startsWith(temporary + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        response.writeHead(404); response.end(); return;
      }
      response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(response);
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const url = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=vulkan', '--disable-dev-shm-usage'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 576 }, deviceScaleFactor: 1 });
    const errors = [], externalRequests = [], failedResponses = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('request', request => { if (!request.url().startsWith(url) && !/^(data|blob):/.test(request.url())) externalRequests.push(request.url()); });
    page.on('response', response => { if (response.status() >= 400) failedResponses.push({ status: response.status(), url: new URL(response.url()).pathname }); });
    await page.goto(url + '/?capture=1', { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForFunction(() => window.inkLab?.ready);
    const rendered = await page.evaluate(() => {
      const image = inkLab.frame(0, { viewName: 'painting', width: 1280, height: 576, seconds: 2 });
      const finitePigment = inkLab.readback().pigment.every(Number.isFinite);
      return { pngBytes: atob(image.split(',')[1]).length, finitePigment, graphicsError: valley.renderer.getContext().getError(), stats: valley.metadata().stats };
    });
    await page.goto(url + '/study.html', { waitUntil: 'networkidle' });
    const study = await page.evaluate(() => ({ title: document.title, images: [...document.images].length, loadedImages: [...document.images].filter(image => image.complete && image.naturalWidth > 0).length }));
    await page.goto(url + '/research.html', { waitUntil: 'networkidle' });
    await page.locator('[data-wash="0"]').click();
    await page.waitForFunction(()=>document.querySelector('#experiment').complete&&document.querySelector('#experiment').naturalWidth>0);
    const research=await page.evaluate(()=>({images:[...document.images].length,loaded:[...document.images].filter(i=>i.complete&&i.naturalWidth>0).length,offWorks:document.querySelector('#experiment').src.includes('mountains-0.png')}));
    await page.locator('#view').selectOption('painting');await page.locator('[data-wash="1"]').click();
    await page.waitForFunction(()=>document.querySelector('#experiment').complete&&document.querySelector('#experiment').naturalWidth>0);
    research.onWorks=await page.evaluate(()=>document.querySelector('#experiment').src.includes('painting-1.png'));
    await page.goto(url + '/shape-study.html', { waitUntil: 'networkidle' });
    const shapeStudy=await page.evaluate(()=>({images:document.images.length,loaded:[...document.images].filter(i=>i.complete&&i.naturalWidth>0).length}));
    const report = {
      passed: !failedHashes.length && !errors.length && !externalRequests.length && !failedResponses.length && rendered.pngBytes > 100000 && rendered.finitePigment && rendered.graphicsError === 0 && study.images > 0 && study.images === study.loadedImages && research.images===research.loaded && research.offWorks && research.onWorks && shapeStudy.images>0 && shapeStudy.images===shapeStudy.loaded,
      method: 'Export a Git snapshot into a fresh temporary directory, verify recorded hashes, serve only that directory, render the 3D painting and load its illustrated study.',
      snapshot, verifiedHashes: entries.length, failedHashes, rendered, study, research, shapeStudy, errors, externalRequests, failedResponses,
    };
    fs.writeFileSync(path.join(root, 'qa/portability.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
    fs.rmSync(temporary, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
