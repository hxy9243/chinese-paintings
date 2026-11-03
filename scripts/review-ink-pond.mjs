import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const require=createRequire(new URL('../package.json',import.meta.url));
const {chromium}=require('@playwright/test'),sharp=require('sharp');
const root=fileURLToPath(new URL('..',import.meta.url)),out=path.join(root,'docs/reviews/ink-pond-interactive');await mkdir(out,{recursive:true});
const base=process.env.REVIEW_URL??'http://127.0.0.1:5180',sha=b=>createHash('sha256').update(b).digest('hex');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:940},reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(base+'/ink-pond/');await page.waitForFunction(()=>window.pondPainting?.ready);
 await page.evaluate(()=>{window.pondPainting.setRenderScale(1);window.pondPainting.renderFrame(3.5);});
 const describe=()=>page.evaluate(()=>window.pondPainting.describe()),initial=await describe();assert.equal(initial.playing,false);assert.equal(initial.fish,5);assert.equal(initial.shrimp,5);
 const canvas=page.locator('#painting canvas'),box=await canvas.boundingBox();assert.ok(box.width>600);
 await canvas.screenshot({path:path.join(root,'apps/gallery/ink-pond-preview.png')});
 await page.screenshot({path:path.join(out,'default-controls.png'),fullPage:true});
 const first=await canvas.screenshot();
 await page.mouse.move(box.x+box.width*.4,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.64,box.y+box.height*.61,{steps:20});await page.mouse.up();await page.waitForTimeout(1800);
 const dragged=await describe();assert.ok(Math.abs(dragged.camera.azimuthDegrees-initial.camera.azimuthDegrees)>15);assert.equal(dragged.time,initial.time);assert.equal(dragged.current,initial.current);assert.deepEqual(dragged.animals,initial.animals);
 await page.mouse.wheel(0,-270);await page.waitForTimeout(300);assert.ok((await describe()).camera.zoom>1);
 await page.locator('#view-reset').click();await page.waitForTimeout(200);const reset=await describe();assert.ok(Math.abs(reset.camera.azimuthDegrees+45)<.001);assert.equal(reset.camera.zoom,1);assert.equal(reset.time,3.5);
 assert.equal(sha(await canvas.screenshot()),sha(first),'Reset view must restore the same paused ink');
 const angles=[];
 for(const [azimuthDegrees,elevationDegrees] of [[-45,45],[20,30],[-115,75]]){
  await page.evaluate(v=>window.pondPainting.setView(v),{azimuthDegrees,elevationDegrees,zoom:1});
  const d=await describe(),occlusion=await page.evaluate(()=>window.pondPainting.diagnoseAnimalLayers());
  assert.equal(occlusion.wrongOwnerPixels,0);assert.equal(occlusion.hiddenInkLeakPixels,0);
  const image=await canvas.screenshot(),name=`view-${azimuthDegrees}-${elevationDegrees}.png`;await writeFile(path.join(out,name),image);angles.push({camera:d.camera,occlusion,image:name});
  await page.evaluate(()=>window.pondPainting.renderFrame(23));await page.evaluate(()=>window.pondPainting.renderFrame(3.5));assert.equal(sha(await canvas.screenshot()),sha(image));
 }
 await page.evaluate(()=>window.pondPainting.setView());
 // Native slider events exercise the same population path used by visitors.
 await page.locator('#fish').focus();await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>window.pondPainting.describe().fish===6);
 const populations=[];
 for(const [fish,shrimp] of [[0,0],[8,12],[1,0],[0,1],[5,5],[8,12],[5,5]]){
  await page.evaluate(v=>window.pondPainting.setPopulation(v),{fish,shrimp});const d=await describe();
  assert.equal(d.fish,fish);assert.equal(d.shrimp,shrimp);assert.equal(await canvas.count(),1);assert.equal(d.renderer.readbacksPerFrame,0);assert.ok(d.renderer.gpuMemory.textures<=2);assert.ok(d.renderer.gpuMemory.geometries<=3);
  populations.push({fish,shrimp,drawCalls:d.renderer.drawCalls,memory:d.renderer.gpuMemory});
 }
 await page.locator('#rain').focus();await page.keyboard.press('Home');assert.equal((await describe()).rain.intensity,0);await page.keyboard.press('End');assert.equal((await describe()).rain.intensity,1);
 await page.locator('#speed').focus();await page.keyboard.press('Home');assert.equal((await describe()).speed,.25);await page.keyboard.press('End');assert.equal((await describe()).speed,2);
 await page.evaluate(()=>{window.pondPainting.setRain(.68);window.pondPainting.setSpeed(1);window.pondPainting.renderFrame(3.5);});
 const downloadPromise=page.waitForEvent('download');await page.locator('#save').click();const download=await downloadPromise;await download.saveAs(path.join(out,'export.png'));const exported=await sharp(path.join(out,'export.png')).metadata();assert.ok(exported.width>=1600);
 // Check keyboard orbit and camera limits, including extreme pointer gestures.
 await canvas.focus();await page.keyboard.press('ArrowLeft');assert.ok((await describe()).camera.azimuthDegrees<-50);await page.keyboard.press('Home');assert.ok(Math.abs((await describe()).camera.elevationDegrees-45)<.001);
 await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.5,box.y+20,{steps:10});await page.mouse.up();await page.waitForTimeout(1200);assert.ok((await describe()).camera.elevationDegrees>=19.99);assert.ok((await describe()).camera.elevationDegrees<=80.01);
 await page.evaluate(()=>{window.pondPainting.setView();window.pondPainting.setRenderScale(null);window.pondPainting.setPlaying(true);});await page.waitForTimeout(11500);await page.evaluate(()=>window.pondPainting.setPlaying(false));const performance=(await describe()).performance;assert.ok(performance.fps>=24,`Adaptive preview too slow: ${performance.fps}`);
 const responsive=[];
 for(const width of [320,375,768,1280]){
  await page.setViewportSize({width,height:940});await page.waitForTimeout(150);
  const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,canvas:document.querySelector('canvas').getBoundingClientRect().width}));assert.ok(layout.scroll<=width);responsive.push(layout);
 }
 await page.setViewportSize({width:1280,height:940});await page.evaluate(()=>{window.pondPainting.setView();window.pondPainting.renderFrame(3.5);});
 await page.locator('h1').click();await page.screenshot({path:path.join(out,'interactive-pond.png'),fullPage:true});
 // Real touch input through Chromium, including two-finger pinch.
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 mobile.on('pageerror',e=>errors.push(String(e)));await mobile.goto(base+'/ink-pond/');await mobile.waitForFunction(()=>window.pondPainting?.ready);
 const mobileState=()=>mobile.evaluate(()=>window.pondPainting.describe()),touchInitial=await mobileState(),bounds=await mobile.locator('canvas').boundingBox();
 const cdp=await mobile.context().newCDPSession(mobile),cx=bounds.x+bounds.width*.5,cy=bounds.y+bounds.height*.5;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-50,y:cy,id:1}]});
 for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-50+i*12,y:cy+i*2,id:1}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForTimeout(1200);
 const touchDragged=await mobileState();assert.ok(Math.abs(touchDragged.camera.azimuthDegrees-touchInitial.camera.azimuthDegrees)>15);assert.equal(touchDragged.time,0);
 await mobile.locator('#view-reset').click();
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-35,y:cy,id:1},{x:cx+35,y:cy,id:2}]});
 for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-35-i*5,y:cy,id:1},{x:cx+35+i*5,y:cy,id:2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForTimeout(200);
 const pinched=await mobileState();assert.ok(pinched.camera.zoom>1.4);assert.equal(pinched.time,0);assert.equal(pinched.ripples.rings.filter(r=>r.source==='touch').length,0);
 const touch={orbit:true,pinch:true,zoom:pinched.camera.zoom,pausedTimeUnchanged:true};await mobile.screenshot({path:path.join(out,'touch-controls.png'),fullPage:true});await mobile.close();
 let film=null;
 if(process.argv.includes('--film')){
  const frames=path.join(out,'frames');await mkdir(frames,{recursive:true});
  for(let i=0;i<48;i++){
   await page.evaluate(i=>{window.pondPainting.setView({azimuthDegrees:-45+i*1.5,elevationDegrees:45-i*.25});window.pondPainting.renderFrame(3.5+i/24);},i);
   await canvas.screenshot({path:path.join(frames,`frame-${String(i).padStart(4,'0')}.png`)});
  }
  const file=path.join(out,'orbit-preview.mp4'),encoded=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','24','-i',path.join(frames,'frame-%04d.png'),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-crf','18','-pix_fmt','yuv420p',file],{encoding:'utf8'});assert.equal(encoded.status,0,encoded.stderr);
  const decoded=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',file,'-vf',"select='eq(n,0)+eq(n,16)+eq(n,32)'",'-fps_mode','vfr',path.join(out,'decoded-%02d.png')],{encoding:'utf8'});assert.equal(decoded.status,0,decoded.stderr);
  film={frames:48,fps:24,duration:2,sha256:sha(await readFile(file)),review:'Offline camera-and-swimming excerpt; decoded samples inspected separately from live performance.'};
  const {rm}=await import('node:fs/promises');await rm(frames,{recursive:true,force:true});
 }
 const sources={};
 for(const directory of ['artworks/ink-pond/src','artworks/ink-pond/src/models'])for(const file of await readdir(path.join(root,directory)))if(file.endsWith('.js')||file.endsWith('.css'))sources[directory+'/'+file]=sha(await readFile(path.join(root,directory,file)));
 for(const file of ['artworks/ink-pond/index.html','apps/gallery/index.html','apps/gallery/gallery.css','scripts/dev.mjs','scripts/build.mjs'])sources[file]=sha(await readFile(path.join(root,file)));
 await page.goto(base+'/');assert.equal(await page.locator('.works article').count(),3);assert.equal(await page.locator('.works article').nth(2).locator('.picture').getAttribute('href'),'/ink-pond/');
 const images=await page.locator('.works img').evaluateAll(imgs=>imgs.map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})));assert.ok(images.every(i=>i.loaded));
 await page.screenshot({path:path.join(out,'three-paintings.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 const report={pass:true,review:'Self-review of interactive browser controls, fixed-time production stills and overlap ownership. Software-rendered frame rate is an observed sample, not a hardware guarantee.',angles,populations,performance,responsive,touch,film,images,exported:{width:exported.width,height:exported.height},sources,errors};
 await writeFile(path.join(out,'review.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,performance,populations,responsive,errors},null,2));
}finally{await browser.close();}
