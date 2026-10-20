import { chromium } from '../artworks/qingming/node_modules/playwright/index.mjs';
import { preview } from '../artworks/qingming/node_modules/vite/dist/node/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';

const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.resolve(root,process.env.REVIEW_DIR??'qa/current/street-watercolor');
const frames=path.resolve(root,'qa/current/street-watercolor-frames');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(frames,{recursive:true});
const fps=6,count=Number(process.env.REVIEW_FRAMES??72);
if(!Number.isInteger(count)||count<1||count>240)throw Error('REVIEW_FRAMES must be 1–240');
const server=await preview({root:path.join(root,'artworks/qingming'),preview:{host:'127.0.0.1',port:4173,strictPort:true}});
const browser=await chromium.launch({headless:true,
 executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||undefined,
 args:['--no-sandbox','--disable-dev-shm-usage',...(process.env.PLAYWRIGHT_USE_SWIFTSHADER==='1'?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--enable-gpu','--use-angle=vulkan'])]});
const errors=[],failedRequests=[],measurements={};
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
 // Optional local font mirror for restricted-network capture machines. No app
 // resource or shader request is intercepted.
 const fonts=process.env.QINGMING_QA_FONTS;
 const css=fonts?fs.readFileSync(path.join(fonts,'400.css'),'utf8').replaceAll('./files/','https://qingming-fonts.test/'):'';
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:css}));
 await page.route('https://qingming-fonts.test/**',r=>r.fulfill({
   contentType:'font/woff2',headers:{'access-control-allow-origin':'*'},
   body:fs.readFileSync(path.join(fonts,'files',path.basename(new URL(r.request().url()).pathname)))}));
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('requestfailed',r=>failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
 await page.goto('http://127.0.0.1:4173/?capture=1');
 await page.waitForFunction(()=>window.qingmingStudy,{timeout:120000});
 await page.evaluate(async()=>{await document.fonts.ready;});
 for(const palette of ['silk','indigo-amber'])for(const [view,options] of [
   ['overview',{zoom:1.25,angle:30,target:[0,0]}],
   ['street',{zoom:2.6,angle:30,pitch:-12,target:[-7,4.7]}],
   ['river',{zoom:2.7,angle:30,pitch:-8,target:[5,-2]}],
   ['market',{zoom:3.2,angle:-10,pitch:-5,target:[-1,5]}],
 ]){
   measurements[palette+'-'+view]=await page.evaluate(o=>window.qingmingStudy.frame(24,o),{...options,palette});
   await page.locator('.study-stage').screenshot({path:path.join(out,palette+'-'+view+'.jpg'),type:'jpeg',quality:92});
 }
 const replay=()=>page.evaluate(()=>window.qingmingStudy.frame(24,{zoom:1.25,angle:30,pitch:0,target:[0,0],palette:'indigo-amber'}));
 await replay();const before=await page.locator('.study-stage').screenshot();
 await page.evaluate(()=>window.qingmingStudy.frame(90));await replay();
 measurements.sameTimeReplay=before.equals(await page.locator('.study-stage').screenshot());
 await page.getByRole('button',{name:'Plain model',exact:true}).click();await replay();
 await page.locator('.study-stage').screenshot({path:path.join(out,'plain-model.jpg'),type:'jpeg',quality:92});
 measurements.plainModelChangesImage=!before.equals(await page.locator('.study-stage').screenshot());
 await page.getByRole('button',{name:'Ink & wash',exact:true}).click();await replay();
 measurements.paintingRestored=before.equals(await page.locator('.study-stage').screenshot());
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('combobox',{name:'Color palette',exact:true}).selectOption('silk');
 await page.reload();await page.waitForFunction(()=>window.qingmingStudy,{timeout:120000});
 await page.evaluate(async()=>{await document.fonts.ready;});
 measurements.palettePersisted=(await page.getByRole('combobox',{name:'Color palette',exact:true}).inputValue())==='silk';
 measurements.mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 await page.screenshot({path:path.join(out,'mobile.jpg'),type:'jpeg',quality:90,fullPage:true});
 await page.setViewportSize({width:1120,height:800});
 for(let i=0;i<count;i++){
   await page.evaluate(t=>window.qingmingStudy.frame(t,{zoom:1.8,angle:30,pitch:-8,target:[-3,0],palette:'indigo-amber'}),12+i/fps);
   await page.locator('.study-stage').screenshot({path:path.join(frames,String(i).padStart(4,'0')+'.png')});
 }
 execFileSync('ffmpeg',['-y','-v','error','-framerate',String(fps),'-i',path.join(frames,'%04d.png'),'-frames:v',String(count),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'motion.mp4')]);
 const files=['pedestrians.ts','boatWakes.ts','passageLife.ts','passageLayout.ts','bridgeStudy.ts','paintMaterial.ts','inkFinish.ts','scenePalette.ts','marketModels.ts','referenceAssets.ts','Mock3D.tsx'];
 const sourceHashes=Object.fromEntries(files.map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'artworks/qingming/src',name))).digest('hex')]));
 const report={passed:!errors.length&&!failedRequests.length&&measurements.sameTimeReplay&&measurements.paintingRestored&&measurements.plainModelChangesImage&&measurements.palettePersisted&&!measurements.mobileOverflow,
   errors,failedRequests,measurements,sourceHashes,localFonts:Boolean(fonts),motion:{frames:count,fps,sceneSeconds:count/fps,kind:'offline scene-time sample; no realtime performance claim'}};
 fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,errors,failedRequests,replay:measurements.sameTimeReplay,street:measurements['indigo-amber-overview'].streetLife,motion:report.motion}));
 if(!report.passed)process.exitCode=1;
}finally{await browser.close();await new Promise(resolve=>server.httpServer.close(resolve));}
