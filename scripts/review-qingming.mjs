import {chromium} from '../artworks/qingming/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=path.resolve(root,process.env.REVIEW_DIR??'qa/current');fs.mkdirSync(out,{recursive:true});
const base=process.env.PAINTING_BASE_URL??'http://127.0.0.1:5180';
const errors=[],failedResponses=[],measurements={};
const fps=12,frameCount=Number(process.env.REVIEW_FRAMES??96);
if(!Number.isInteger(frameCount)||frameCount<1||frameCount>600)throw Error('REVIEW_FRAMES must be an integer from 1 to 600');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failedResponses.push({status:r.status(),url:r.url()});});
 await page.goto(base+'/');await page.locator('img').evaluateAll(images=>Promise.all(images.map(im=>im.decode())));
 const homeRequests=[];page.on('request',r=>homeRequests.push(r.url()));await page.reload();
 await page.screenshot({path:path.join(out,'gallery.png'),fullPage:true});
 measurements.homepageLoadsSceneCode=homeRequests.some(url=>/\/src\/|\/vendor\/|\/assets\/.*\.js/.test(url));
 await page.goto(base+'/qingming/?capture=1');await page.waitForFunction(()=>window.qingmingStudy,{timeout:120000});
 for(const [name,options] of [['overview',{zoom:1.25,angle:30}],['layout-reference-view',{zoom:1.25,angle:0}],['bridge',{target:[-6,1],zoom:2.5,angle:30,pitch:-12}],['landmark-tree',{target:[6,5],zoom:2.5,angle:30,pitch:-12}],['near',{target:[0,0],zoom:2.5}],['far',{target:[0,0],zoom:.5}]]){
  measurements[name]=await page.evaluate(o=>window.qingmingStudy.frame(8,o),options);
  await page.locator('.study-stage').screenshot({path:path.join(out,name+'.png')});
 }
 // Repeat the same absolute timestamp after a forward seek on one GPU/browser.
 const frame=()=>page.evaluate(()=>window.qingmingStudy.frame(8,{zoom:1.25,target:[0,0]}));
 await frame();const before=await page.locator('.study-stage').screenshot();
 await page.evaluate(()=>window.qingmingStudy.frame(24));await frame();const after=await page.locator('.study-stage').screenshot();
 measurements.sameTimeReplay=before.equals(after);
 await page.goto(base+'/qingming/figure-study.html?capture=1');await page.waitForFunction(()=>window.figureStudy,{timeout:120000});
 await page.evaluate(()=>window.figureStudy.frame(4));await page.screenshot({path:path.join(out,'figures.png')});
 await page.evaluate(()=>window.figureStudy.frame(4,{focus:1,turn:.75}));await page.screenshot({path:path.join(out,'porter-close.png')});
 await page.getByRole('button',{name:'背面',exact:true}).click();
 measurements.figureBackView=await page.getByRole('button',{name:'背面',exact:true}).getAttribute('aria-pressed')==='true';
 for(const activity of ['vendor','customer','river-watcher','conversation']){
  await page.selectOption('#activity-choice',activity);
  await page.evaluate(activity=>window.figureStudy.frame(3,{activity,turn:.75}),activity);
  await page.screenshot({path:path.join(out,'activity-'+activity+'.png')});
 }
 await page.selectOption('#figure-choice','-1');
 measurements.figureGalleryRestored=await page.locator('.labels').isVisible();
 await page.setViewportSize({width:390,height:844});await page.goto(base+'/');await page.screenshot({path:path.join(out,'gallery-mobile.png'),fullPage:true});
 measurements.mobileOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
 await page.setViewportSize({width:1280,height:900});await page.goto(base+'/qingming/?capture=1');await page.waitForFunction(()=>window.qingmingStudy,{timeout:120000});
 const frames=path.join(out,'frames');fs.rmSync(frames,{recursive:true,force:true});fs.mkdirSync(frames,{recursive:true});
 for(let i=0;i<frameCount;i++){
  await page.evaluate(t=>window.qingmingStudy.frame(t,{zoom:2.5,angle:30,pitch:-12,target:[-6,1]}),i/fps);
  await page.locator('.study-stage').screenshot({path:path.join(frames,String(i).padStart(4,'0')+'.png')});
 }
 execFileSync('ffmpeg',['-y','-v','error','-framerate',String(fps),'-i',path.join(frames,'%04d.png'),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'motion.mp4')]);
 // The unmodified landscape must still load from its new route and local vendor tree.
 await page.goto(base+'/thousand-miles/?capture=1');await page.waitForFunction(()=>window.inkLab?.ready,{timeout:120000});
 measurements.thousandMiles=await page.evaluate(()=>{inkLab.frame(0,{viewName:'painting',width:1280,height:576,seconds:2});return {ready:inkLab.ready,graphicsError:valley.renderer.getContext().getError()};});
 await page.screenshot({path:path.join(out,'thousand-miles.png')});
 const files=['bridgeStudy.ts','crowd.ts','passageLayout.ts','passageLife.ts','passageSpace.ts','figureTypes.ts','figures.ts','marketModels.ts','figureStudy.ts','bridgeActivity.ts','peopleMotion.ts','Mock3D.tsx','paintMaterial.ts','inkFinish.ts'];
 const hashes=Object.fromEntries(files.map(name=>[name,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'artworks/qingming/src',name))).digest('hex')]));
 const report={passed:errors.length===0&&failedResponses.length===0&&measurements.bridge.bridgeLife.stands===16&&measurements.bridge.bridgeLife.stationaryPeople===64&&measurements.sameTimeReplay&&measurements.figureBackView&&measurements.figureGalleryRestored&&!measurements.mobileOverflow&&!measurements.homepageLoadsSceneCode&&measurements.far.crowd.levels[0].actors>100&&measurements.thousandMiles.graphicsError===0,measurements,errors,failedResponses,sourceHashes:hashes,motion:{fps,frames:frameCount,durationSeconds:frameCount/fps,width:1232,kind:'offline scene-time sample; no realtime performance claim'}};
 fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}finally{await browser.close();}
