import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
const root=fileURLToPath(new URL('../../../',import.meta.url)),dist=path.join(root,'dist'),out=path.join(root,'docs/reviews/ink-chicks-gallery');
fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.bin':'application/octet-stream'};
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),file=path.resolve(dist,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]??'application/octet-stream'});fs.createReadStream(file).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
const hash=data=>createHash('sha256').update(data).digest('hex');
try{
 const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)requests.push({url:r.url(),status:r.status()});});
 await page.goto(base+'/ink-chicks/');await page.waitForFunction(()=>window.chicksStudy?.ready,{},{timeout:60000});
 const initial=await page.evaluate(()=>window.chicksStudy.describe());assert.equal(initial.playing,false,'Reduced motion starts paused');assert.equal(initial.chicks,8);assert.equal(initial.hens,1);assert.equal(initial.glError,0);
 await page.evaluate(()=>window.chicksStudy.renderFrame(0));await page.screenshot({path:path.join(out,'paper-default.png'),fullPage:true});
 const first=await page.evaluate(()=>window.chicksStudy.exportPNG());await page.evaluate(()=>{window.chicksStudy.renderFrame(25);window.chicksStudy.renderFrame(0);});assert.equal(await page.evaluate(()=>window.chicksStudy.exportPNG()),first,'Backwards seeking recreates the exact painting');
 const canvas=page.locator('#painting canvas'),box=await canvas.boundingBox();
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.45);await page.mouse.down();await page.mouse.move(box.x+box.width*.5-130,box.y+box.height*.45+45,{steps:8});await page.mouse.up();
 const dragged=await page.evaluate(()=>window.chicksStudy.describe().camera);assert.ok(Math.abs(dragged.turn)>5);assert.notEqual(await page.evaluate(()=>window.chicksStudy.exportPNG()),first,'Orbit reveals different painted/modelled surfaces');
 await page.mouse.wheel(0,-150);await page.waitForFunction(()=>window.chicksStudy.describe().camera.zoom>1);await page.locator('#view-reset').click();
 assert.ok(Math.abs((await page.evaluate(()=>window.chicksStudy.describe().camera)).turn)<1e-6);
 await canvas.focus();await page.keyboard.press('ArrowRight');assert.ok((await page.evaluate(()=>window.chicksStudy.describe().camera.turn))>4);await page.keyboard.press('Home');
 await page.locator('#turn').fill('28');await page.locator('#tilt').fill('35');await page.screenshot({path:path.join(out,'paper-turned.png'),fullPage:true});
 if(process.argv.includes('--update-preview')){
  await page.evaluate(()=>window.chicksStudy.setView({turn:24,tilt:30,zoom:1}));const png=await page.evaluate(()=>window.chicksStudy.exportPNG());const sharp=(await import('sharp')).default;await sharp(Buffer.from(png.split(',')[1],'base64')).resize(1080,660,{fit:'contain',background:'#dfddcf'}).png().toFile(path.join(root,'apps/gallery/ink-chicks-preview.png'));fs.copyFileSync(path.join(root,'apps/gallery/ink-chicks-preview.png'),path.join(dist,'ink-chicks-preview.png'));
 }
 await page.locator('#paper').fill('0');const plain=await page.evaluate(()=>window.chicksStudy.exportPNG());await page.locator('#paper').fill('1.5');assert.notEqual(await page.evaluate(()=>window.chicksStudy.exportPNG()),plain);await page.locator('#paper').fill('0.85');
 await page.locator('#ink').fill('0.65');const light=await page.evaluate(()=>window.chicksStudy.exportPNG());await page.locator('#ink').fill('1.4');assert.notEqual(await page.evaluate(()=>window.chicksStudy.exportPNG()),light);await page.locator('#ink').fill('1');
 await page.locator('#speed').fill('1.5');assert.equal(await page.evaluate(()=>window.chicksStudy.describe().speed),1.5);
 await page.locator('#play').click();await page.waitForFunction(()=>window.chicksStudy.describe().time>.3);await page.locator('#play').click();const paused=await page.evaluate(()=>window.chicksStudy.describe().time);await page.locator('#turn').fill('-25');assert.equal(await page.evaluate(()=>window.chicksStudy.describe().time),paused,'Paused painting still turns without advancing movement');
 await page.locator('#timeline').fill('12');assert.equal(await page.evaluate(()=>window.chicksStudy.describe().time),12);await page.locator('#reset').click();assert.equal(await page.evaluate(()=>window.chicksStudy.describe().time),0);
 await page.locator('#reference-open').click();for(const image of await page.locator('dialog img').all())assert.ok(await image.evaluate(i=>i.complete&&i.naturalWidth>0));await page.locator('#reference-close').click();
 await page.locator('summary').click();await page.locator('[data-layer="mother-hen"]').uncheck();assert.ok((await page.evaluate(()=>window.chicksStudy.describe().hidden)).includes('mother-hen'));await page.locator('[data-layer="mother-hen"]').check();
 const downloadPromise=page.waitForEvent('download');await page.locator('#save').click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'mother-and-eight-chicks.png');assert.ok(fs.statSync(await download.path()).size>20000);
 await page.locator('summary').click();await page.locator('#view-reset').click();await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'paper-mobile.png'),fullPage:true});
 await page.setViewportSize({width:844,height:390});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.setViewportSize({width:1280,height:1000});await page.locator('a[href="./hen-study/"]').click();await page.waitForFunction(()=>window.henStudy?.ready);await page.locator('[data-mode="ink"]').click();assert.equal(await page.evaluate(()=>window.henStudy.describe().glError),0);
 await page.goto(base+'/');assert.equal(await page.locator('.works article').count(),4);await page.locator('.works article').nth(3).scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.querySelectorAll('.works img')].every(i=>i.complete&&i.naturalWidth>0));await page.screenshot({path:path.join(out,'gallery-four-paintings.png'),fullPage:true});await page.locator('.works article').nth(3).locator('.picture').click();await page.waitForFunction(()=>window.chicksStudy?.ready);
 for(const route of ['/qingming/','/thousand-miles/','/ink-pond/'])assert.equal((await fetch(base+route)).status,200);
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
 const sources={};for(const name of ['apps/gallery/index.html','apps/gallery/gallery.css','apps/gallery/ink-chicks-preview.png','scripts/dev.mjs','scripts/build.mjs','artworks/ink-chicks/index.html','artworks/ink-chicks/src/style.css','artworks/ink-chicks/vite.config.js','artworks/ink-chicks/scripts/check-gallery.mjs','artworks/ink-chicks/scripts/physics.test.mjs','artworks/ink-chicks/src/flock.js','artworks/ink-chicks/hen-study/src/model.js','artworks/ink-chicks/hen-study/src/motion.js','artworks/ink-chicks/src/main.js','artworks/ink-chicks/src/scene.js','artworks/ink-chicks/src/paper.js','artworks/ink-chicks/src/poses.js'])sources[name]=hash(fs.readFileSync(path.join(root,name)));
 const report={pass:true,productionBuild:true,fourGalleryCards:true,mouseOrbit:dragged,mouseZoom:true,keyboardView:true,repeatableSeek:true,parameters:['speed','ink','paper','turn','tilt','zoom'],reducedMotion:true,pauseAndSeek:true,savePNG:true,referenceImages:true,standaloneHenStudy:true,mobileOverflow:false,shortViewportOverflow:false,errors,requests,sources};fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await browser.close();await new Promise(r=>server.close(r));}
