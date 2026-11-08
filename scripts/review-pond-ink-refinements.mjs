import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import sharp from 'sharp';

const root=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(root,'dist'),out=path.join(root,'docs/reviews/ink-pond-ink-refinements');
fs.mkdirSync(out,{recursive:true});const sha=b=>createHash('sha256').update(b).digest('hex');
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost'),file=path.resolve(dist,'.'+decodeURIComponent(url.pathname)+(url.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]??'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:940},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const load=async()=>{await page.goto(`http://127.0.0.1:${server.address().port}/ink-pond/`);await page.waitForFunction(()=>window.pondPainting?.ready,{},{timeout:60000});await page.evaluate(()=>{window.pondPainting.setRenderScale(1);window.pondPainting.renderFrame(12);});};
  await load();const canvas=page.locator('canvas'),opening=await canvas.screenshot();
  const context=await page.screenshot({fullPage:true}),still=`ink-refinements-${sha(context).slice(0,8)}.png`;fs.writeFileSync(path.join(out,still),context);
  await page.evaluate(()=>window.pondPainting.setView({elevationDegrees:20,azimuthDegrees:-35,zoom:1}));await page.screenshot({path:path.join(out,'low-angle.png'),fullPage:true});
  await page.evaluate(()=>window.pondPainting.setView({elevationDegrees:65,azimuthDegrees:25,zoom:1}));await canvas.screenshot({path:path.join(out,'turned.png')});
  await page.evaluate(()=>{window.pondPainting.setView();window.pondPainting.setPopulation({fish:0,shrimp:0});window.pondPainting.setRain(0);window.pondPainting.setRipples(false);window.pondPainting.renderFrame(12);});
  const paper=await canvas.screenshot();fs.writeFileSync(path.join(out,'paper.png'),paper);
  await page.evaluate(()=>window.pondPainting.renderFrame(36));assert.equal(sha(await canvas.screenshot()),sha(paper),'Age clouds and fibres must remain fixed');
  await load();assert.equal(sha(await canvas.screenshot()),sha(opening),'Fresh load must reproduce pigment and paper');
  await page.evaluate(()=>{window.pondPainting.renderFrame(40);window.pondPainting.renderFrame(12);});assert.equal(sha(await canvas.screenshot()),sha(opening),'Seeking must reproduce pigment and gestures');
  const filmFrames=path.join(out,'frames');fs.mkdirSync(filmFrames,{recursive:true});
  const fps=30,count=240,start=3;
  for(let frame=0;frame<count;frame++){
    await page.evaluate(t=>window.pondPainting.renderFrame(t),start+frame/fps);
    await canvas.screenshot({path:path.join(filmFrames,`frame-${String(frame).padStart(4,'0')}.png`)});
    if(frame%60===0)console.log(`Captured ${frame}/${count} motion samples`);
  }
  const film=path.join(out,'claw-movements.mp4'),encoded=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate',String(fps),'-i',path.join(filmFrames,'frame-%04d.png'),'-vf','pad=ceil(iw/2)*2:ceil(ih/2)*2','-c:v','libx264','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',film],{encoding:'utf8'});assert.equal(encoded.status,0,encoded.stderr);
  const decode=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-i',film,'-vf',"select='eq(n,0)+eq(n,79)+eq(n,159)+eq(n,239)'",'-fps_mode','vfr',path.join(out,'decoded-%02d.png')],{encoding:'utf8'});assert.equal(decode.status,0,decode.stderr);
  const probe=spawnSync('ffprobe',['-v','error','-count_frames','-show_streams','-show_format','-of','json',film],{encoding:'utf8'});assert.equal(probe.status,0,probe.stderr);const metadata=JSON.parse(probe.stdout);assert.equal(Number(metadata.streams[0].nb_read_frames),count);assert.equal(Number(metadata.format.duration),8);
  const cards=await Promise.all([1,2,3,4].map(async(n,i)=>({input:await sharp(path.join(out,`decoded-${String(n).padStart(2,'0')}.png`)).resize(640).png().toBuffer(),left:i%2*640,top:Math.floor(i/2)*392})));
  await sharp({create:{width:1280,height:784,channels:3,background:'#f3eddf'}}).composite(cards).png().toFile(path.join(out,'motion-contact-sheet.png'));
  const diagnostic=await page.evaluate(()=>window.pondPainting.describe());assert.equal(diagnostic.renderer.drawCalls,3);assert.equal(diagnostic.renderer.gpuMemory.textures,2);assert.equal(diagnostic.renderer.gpuMemory.geometries,3);assert.deepEqual(errors,[]);
  const sources={};for(const dir of ['artworks/ink-pond/src','artworks/ink-pond/src/models'])for(const name of fs.readdirSync(path.join(root,dir)))if(/\.(js|css)$/.test(name))sources[dir+'/'+name]=sha(fs.readFileSync(path.join(root,dir,name)));
  const report={pass:true,still,paperStable:true,freshLoadRepeatable:true,backwardSeekRepeatable:true,angles:[{elevation:45,azimuth:-45},{elevation:20,azimuth:-35},{elevation:65,azimuth:25}],renderer:diagnostic.renderer,film:{file:'claw-movements.mp4',duration:8,fps,frames:count,sha256:sha(fs.readFileSync(film)),offlineSample:true},sources,errors};
  fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(report,null,2)+'\n');fs.rmSync(filmFrames,{recursive:true});console.log(JSON.stringify({pass:true,still,film:report.film,errors},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
