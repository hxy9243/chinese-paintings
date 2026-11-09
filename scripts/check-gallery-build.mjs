import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(new URL('../package.json',import.meta.url)),{chromium}=require('@playwright/test');
const root=fileURLToPath(new URL('..',import.meta.url)),dist=path.join(root,'dist'),out=process.env.REVIEW_DIR??path.join(root,'docs/reviews/ink-pond-interactive');
fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.glb':'model/gltf-binary'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),file=path.resolve(dist,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:940},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'/');assert.equal(await page.locator('.works article').count(),4);
 await page.locator('.works article').last().scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.querySelectorAll('.works img')].every(i=>i.complete&&i.naturalWidth>0));await page.evaluate(()=>scrollTo(0,0));
 const sizes=await page.locator('.works img').evaluateAll(images=>images.map(image=>({ready:image.complete&&image.naturalWidth>0,aspect:image.clientWidth/image.clientHeight})));assert.ok(sizes.every(s=>s.ready));assert.ok(Math.abs(sizes[2].aspect-18/11)<.01,'The ink inscription and full composition must fit the third preview');
 await page.screenshot({path:path.join(out,'four-paintings.png'),fullPage:true});
 await page.locator('.works article').nth(2).locator('.picture').click();await page.waitForFunction(()=>window.pondPainting?.ready);
 await page.locator('#fish').focus();await page.keyboard.press('End');await page.waitForFunction(()=>window.pondPainting.describe().fish===8);
 await page.locator('#shrimp').focus();await page.keyboard.press('Home');await page.waitForFunction(()=>window.pondPainting.describe().shrimp===0);
 await page.locator('#view-reset').click();assert.ok(Math.abs(await page.evaluate(()=>window.pondPainting.describe().camera.elevationDegrees)-45)<.001);
 await page.locator('#reference-open').click();await page.locator('dialog img').waitFor({state:'visible'});assert.ok(await page.locator('dialog img').evaluate(i=>i.complete&&i.naturalWidth>0));await page.locator('#reference-close').click();
 const shortViewports=[];
 for(const viewport of [{width:844,height:390},{width:1280,height:600}]){await page.setViewportSize(viewport);const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(layout.scroll<=layout.width);shortViewports.push({...viewport,...layout});}
 await page.setViewportSize({width:1280,height:940});await page.evaluate(async()=>{await window.pondPainting.setPopulation({fish:5,shrimp:5});document.getElementById('reset').click();window.pondPainting.setView();window.pondPainting.setRenderScale(1);window.pondPainting.renderFrame(3.5);});
 await page.locator('h1').click();const still=await page.screenshot({path:path.join(out,'interactive-pond.png'),fullPage:true});
 const stillHash=createHash('sha256').update(still).digest('hex'),stillName=`interactive-pond-${stillHash.slice(0,8)}.png`;fs.writeFileSync(path.join(out,stillName),still);
 await page.goto(base+'/');const routes=[];
 for(const route of ['/qingming/','/thousand-miles/']){const response=await fetch(base+route);assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('<title>'));routes.push({route,title:html.match(/<title>(.*?)<\/title>/s)?.[1],htmlServed:true});}
 assert.deepEqual(errors,[]);
 const sha=b=>createHash('sha256').update(b).digest('hex'),report={};
 report.sources={};for(const name of ['apps/gallery/index.html','apps/gallery/gallery.css','apps/gallery/ink-pond-preview.png','artworks/ink-pond/src/style.css','artworks/ink-pond/src/main.js','artworks/ink-pond/src/pond.js','artworks/ink-pond/src/entries.js','artworks/ink-pond/src/gpu-ink.js','scripts/build.mjs','scripts/dev.mjs'])report.sources[name]=sha(fs.readFileSync(path.join(root,name)));
 report.validationScripts=Object.fromEntries(['scripts/review-pond-population.mjs','scripts/check-gallery-build.mjs','artworks/ink-pond/scripts/check-population.mjs'].map(name=>[name,sha(fs.readFileSync(path.join(root,name)))]));
 report.still={file:stillName,sha256:stillHash,source:'Production build at 3.5 seconds, default population and camera'};
 report.productionBuild={pass:true,fourCards:true,fullInkPreview:true,populationSliders:true,viewReset:true,referenceLoaded:true,shortViewports,routes,errors};
 fs.writeFileSync(path.join(out,'production-build.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.productionBuild,null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
