import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,readdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import * as THREE from 'three';
import {createWaterCamera,resizeWaterCamera} from '../artworks/ink-pond/src/water-space.js';
const out=new URL('../docs/reviews/ink-pond-live-population/',import.meta.url);await mkdir(out,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1192,height:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(process.env.REVIEW_URL??'http://127.0.0.1:5180/ink-pond/');await page.waitForFunction(()=>window.pondPainting?.ready,{},{timeout:60000});
 await page.evaluate(()=>{window.pondPainting.setRenderScale(.8);window.pondPainting.renderFrame(90);window.pondPainting.setRain(.8);window.pondPainting.setCurrent(12);window.pondPainting.stir([20,40,0]);});
 const state=()=>page.evaluate(()=>window.pondPainting.describe()),canvas=page.locator('canvas'),before=await state(),beforeImage=await canvas.screenshot();
 const mutations=[];
 const change=async value=>{const ms=await page.evaluate(value=>{const start=performance.now();window.pondPainting.setPopulation(value);return performance.now()-start;},value);assert.ok(ms<150,`Population edit blocked the page for ${ms}ms`);mutations.push({value,synchronousMs:ms});return state();};
 const added=await change({fish:6,shrimp:6});assert.equal(added.time,before.time);assert.equal(added.current,before.current);for(const key of ['azimuthDegrees','elevationDegrees','zoom'])assert.ok(Math.abs(added.camera[key]-before.camera[key])<1e-7);assert.deepEqual(added.rain,before.rain);assert.deepEqual(added.ripples,before.ripples);assert.equal(added.simulation.generatedSteps,before.simulation.generatedSteps);
 assert.deepEqual(added.animals.filter(a=>before.animals.some(b=>a.id===b.id)),before.animals);
 assert.equal(sha(await canvas.screenshot()),sha(beforeImage),'New animals must be completely outside the canvas at birth');
 const entries=added.animals.filter(a=>a.born===90);assert.equal(entries.length,2);
 await page.evaluate(()=>window.pondPainting.renderFrame(102));const entered=await state();
 const camera=createWaterCamera(18/11),box=await canvas.boundingBox();resizeWaterCamera(camera,box.width/box.height);camera.updateMatrixWorld();
 for(const entry of entries){const a=entered.animals.find(a=>a.id===entry.id),p=new THREE.Vector3(...a.position).project(camera);assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,'An added animal must actually swim into the view');}
 await page.screenshot({path:new URL('entered.png',out).pathname,fullPage:true});
 const enteredImage=await canvas.screenshot(),survivors=entered.animals.filter(a=>!entries.some(e=>e.id===a.id));
 const removed=await change({fish:5,shrimp:5});assert.deepEqual(removed.animals,survivors);assert.notEqual(sha(await canvas.screenshot()),sha(enteredImage),'Removing visible animals must clear them immediately');
 await page.evaluate(()=>window.pondPainting.renderFrame(90));assert.deepEqual((await state()).animals,added.animals);
 await page.evaluate(()=>window.pondPainting.renderFrame(102));assert.deepEqual((await state()).animals,survivors);
 // An orbit and zoom must not invalidate the entry boundary.
 await page.evaluate(()=>window.pondPainting.setView({azimuthDegrees:28,elevationDegrees:30,zoom:1.4}));const rotated=await canvas.screenshot();await change({fish:7,shrimp:8});assert.equal(sha(await canvas.screenshot()),sha(rotated));
 for(const value of [{fish:8,shrimp:12},{fish:0,shrimp:0},{fish:1,shrimp:0},{fish:0,shrimp:1},{fish:5,shrimp:5}]){const d=await change(value);assert.equal(d.fish,value.fish);assert.equal(d.shrimp,value.shrimp);assert.equal(d.renderer.gpuMemory.geometries,3);assert.equal(d.renderer.gpuMemory.textures,2);assert.equal(d.renderer.drawCalls,3);assert.equal(await canvas.count(),1);}
 await page.evaluate(()=>{window.pondPainting.setView();window.pondPainting.setPlaying(true);});await page.waitForTimeout(700);const playing=await state();await change({fish:6,shrimp:6});await page.waitForTimeout(700);assert.equal((await state()).playing,true);assert.ok((await state()).time>playing.time+.25);
 // Prepare a readable entry excerpt. These sampled frames are offline review,
 // not a live frame-rate benchmark.
 await page.locator('#reset').click();await page.evaluate(()=>{window.pondPainting.renderFrame(4);window.pondPainting.setPopulation({fish:7,shrimp:7});});
 let film=null;
 if(process.argv.includes('--film')){
  const frames=new URL('frames/',out);await mkdir(frames,{recursive:true});
  for(let i=0;i<48;i++){await page.evaluate(t=>window.pondPainting.renderFrame(t),4+i*.16);await canvas.screenshot({path:new URL(`frame-${String(i).padStart(4,'0')}.png`,frames).pathname});}
  const file=new URL('swim-in.mp4',out),encoded=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate','6.25','-i',new URL('frame-%04d.png',frames).pathname,'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-crf','18','-pix_fmt','yuv420p',file.pathname],{encoding:'utf8'});assert.equal(encoded.status,0,encoded.stderr);
  const decoded=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',file.pathname,'-vf',"select='eq(n,0)+eq(n,16)+eq(n,32)+eq(n,47)'",'-fps_mode','vfr',new URL('decoded-%02d.png',out).pathname],{encoding:'utf8'});assert.equal(decoded.status,0,decoded.stderr);film={file:'swim-in.mp4',frames:48,fps:6.25,sha256:sha(await readFile(file)),offlineSample:true};await rm(frames,{recursive:true});
 }
 await page.evaluate(()=>window.pondPainting.renderFrame(11));const screenshot=await page.screenshot({fullPage:true}),still=`swim-in-${sha(screenshot).slice(0,8)}.png`;await writeFile(new URL(still,out),screenshot);
 assert.deepEqual(errors,[]);const sources={};for(const directory of ['artworks/ink-pond/src','artworks/ink-pond/src/models'])for(const file of await readdir(new URL('../'+directory+'/',import.meta.url)))if(/\.(js|css)$/.test(file))sources[directory+'/'+file]=sha(await readFile(new URL('../'+directory+'/'+file,import.meta.url)));
 const report={pass:true,existingPosesUnchanged:true,weatherAndCameraRetained:true,offscreenAtBirth:true,swamIntoView:true,removalImmediate:true,repeatableHistory:true,playingPreserved:true,mutations,film,still,sources,errors};await writeFile(new URL('review.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,mutations,still,film,errors},null,2));
}finally{await browser.close();}
