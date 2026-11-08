import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import sharp from 'sharp';

const out=new URL('../docs/reviews/ink-pond-fish-rest/',import.meta.url),frames=new URL('frames/',out);
await mkdir(frames,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1192,height:900},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(process.env.REVIEW_URL??'http://127.0.0.1:5180/ink-pond/');
  await page.waitForFunction(()=>window.pondPainting?.ready,{},{timeout:60000});
  await page.evaluate(()=>window.pondPainting.setRenderScale(.8));
  const canvas=page.locator('#painting canvas'),samples=[];
  for(const time of [12,18,22,28]){
    await page.evaluate(t=>window.pondPainting.renderFrame(t),time);
    samples.push(await page.evaluate(()=>({time:window.pondPainting.describe().time,fish:window.pondPainting.describe().animals.filter(a=>a.species==='fish').map(a=>({id:a.id,behavior:a.behavior,effort:a.effort,speed:Math.hypot(...a.velocity)}))})));
    await canvas.screenshot({path:new URL(`pond-${time}.png`,out).pathname});
  }
  const expected=sha(await canvas.screenshot());
  await page.evaluate(()=>{window.pondPainting.renderFrame(45);window.pondPainting.renderFrame(28);});
  assert.equal(sha(await canvas.screenshot()),expected,'Seeking must reproduce the same ink and pose');
  const context=await page.screenshot({fullPage:true}),still=`fish-rest-${sha(context).slice(0,8)}.png`;
  await writeFile(new URL(still,out),context);
  const cards=await Promise.all([12,18,22,28].map(async (t,i)=>({input:await sharp(new URL(`pond-${t}.png`,out).pathname).resize(596).png().toBuffer(),left:(i%2)*596,top:Math.floor(i/2)*364})));
  await sharp({create:{width:1192,height:728,channels:3,background:'#f1e8d5'}}).composite(cards).png().toFile(new URL('contact-sheet.png',out).pathname);
  const fps=12,count=216,start=12;
  for(let frame=0;frame<count;frame++){
    await page.evaluate(t=>window.pondPainting.renderFrame(t),start+frame/fps);
    await canvas.screenshot({path:new URL(`frame-${String(frame).padStart(4,'0')}.png`,frames).pathname});
    if(frame%60===0)console.log(`Reviewed ${frame}/${count} motion samples`);
  }
  const file=new URL('swim-coast-rest.mp4',out),encode=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate',String(fps),'-i',new URL('frame-%04d.png',frames).pathname,'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-crf','18','-pix_fmt','yuv420p',file.pathname],{encoding:'utf8'});
  assert.equal(encode.status,0,encode.stderr);
  const decode=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',file.pathname,'-vf',"select='eq(n,0)+eq(n,72)+eq(n,120)+eq(n,215)'",'-fps_mode','vfr',new URL('decoded-%02d.png',out).pathname],{encoding:'utf8'});
  assert.equal(decode.status,0,decode.stderr);assert.deepEqual(errors,[]);
  const sources={};for(const directory of ['artworks/ink-pond/src','artworks/ink-pond/src/models'])for(const name of await readdir(new URL('../'+directory+'/',import.meta.url)))if(/\.(js|css)$/.test(name))sources[directory+'/'+name]=sha(await readFile(new URL('../'+directory+'/'+name,import.meta.url)));
  const report={pass:true,repeatableSeek:true,samples,still,film:{file:'swim-coast-rest.mp4',fps,frames:count,duration:count/fps,offlineSample:true,sha256:sha(await readFile(file))},sources,errors};
  await writeFile(new URL('review.json',out),JSON.stringify(report,null,2)+'\n');await rm(frames,{recursive:true});
  console.log(JSON.stringify({pass:true,still,film:report.film,samples,errors},null,2));
}finally{await browser.close();}
