import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import sharp from 'sharp';

const root=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(root,'dist'),out=path.join(root,'docs/reviews/ink-pond-paper');
fs.mkdirSync(out,{recursive:true});const sha=b=>createHash('sha256').update(b).digest('hex');
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost'),file=path.resolve(dist,'.'+decodeURIComponent(u.pathname)+(u.pathname.endsWith('/')?'index.html':''));
  if(!file.startsWith(dist+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]??'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
  const page=await browser.newPage({viewport:{width:1280,height:980},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const url=`http://127.0.0.1:${server.address().port}/ink-pond/`,load=async()=>{await page.goto(url);await page.waitForFunction(()=>window.pondPainting?.ready,{},{timeout:60000});await page.evaluate(()=>{window.pondPainting.setRenderScale(1);window.pondPainting.renderFrame(12);});};
  await load();const picture=page.locator('.picture'),canvas=page.locator('canvas'),describe=()=>page.evaluate(()=>window.pondPainting.describe());
  assert.equal(await page.locator('.picture .seal').count(),0);
  assert.equal((await picture.textContent()).trim(),'');
  assert.equal(await page.locator('#inscription').getAttribute('alt'),'魚蝦清趣');
  assert.ok(await page.locator('#inscription').evaluate(i=>i.complete&&i.naturalHeight>1000));
  const initial=await describe(),opening=await picture.screenshot();
  fs.writeFileSync(path.join(out,'default-paper.png'),await page.screenshot({fullPage:true}));
  await picture.screenshot({path:path.join(root,'apps/gallery/ink-pond-preview.png')});
  await page.locator('#paper').focus();await page.keyboard.press('End');const heavy=await describe();
  assert.equal(heavy.renderer.paperStrength,1);assert.deepEqual(heavy.animals,initial.animals);for(const key of ['azimuthDegrees','elevationDegrees','zoom'])assert.ok(Math.abs(heavy.camera[key]-initial.camera[key])<1e-6);for(let k=0;k<3;k++)assert.ok(Math.abs(heavy.camera.position[k]-initial.camera.position[k])<1e-6);assert.equal(heavy.time,initial.time);assert.deepEqual(heavy.rain,initial.rain);
  await page.screenshot({path:path.join(out,'heavy-paper.png'),fullPage:true});
  await page.locator('#paper').focus();await page.keyboard.press('Home');assert.equal((await describe()).renderer.paperStrength,0);
  await picture.screenshot({path:path.join(out,'smooth-paper.png')});
  await page.evaluate(()=>window.pondPainting.setPaperStrength(.72));assert.equal(sha(await picture.screenshot()),sha(opening));
  await page.evaluate(()=>{window.pondPainting.renderFrame(40);window.pondPainting.renderFrame(12);});assert.equal(sha(await picture.screenshot()),sha(opening));
  await load();assert.equal(sha(await picture.screenshot()),sha(opening));
  const download=page.waitForEvent('download');await page.locator('#save').click();await(await download).saveAs(path.join(out,'saved-picture.png'));
  const saved=await sharp(path.join(out,'saved-picture.png')).metadata();assert.ok(saved.width>1800&&saved.height>1000);
  assert.equal((await describe()).renderer.paperStrength,.72);
  await page.evaluate(()=>{window.pondPainting.setPopulation({fish:0,shrimp:0});window.pondPainting.setRain(0);window.pondPainting.setRipples(false);window.pondPainting.setPaperStrength(0);});
  const smooth=await canvas.screenshot();await page.evaluate(()=>window.pondPainting.setPaperStrength(1));const textured=await canvas.screenshot();
  await page.evaluate(()=>window.pondPainting.renderFrame(38));assert.equal(sha(await canvas.screenshot()),sha(textured));
  const range=async bytes=>{const {data,info}=await sharp(bytes).removeAlpha().raw().toBuffer({resolveWithObject:true});let n=0,sum=0,sq=0;for(let y=30;y<info.height-30;y++)for(let x=30;x<info.width*.82;x++){const v=data[(y*info.width+x)*info.channels];sum+=v;sq+=v*v;n++;}return Math.sqrt(sq/n-(sum/n)**2);};
  const deviations={smooth:await range(smooth),heavy:await range(textured)};assert.ok(deviations.smooth<.1&&deviations.heavy>2);
  await load();await page.evaluate(()=>window.pondPainting.setView({elevationDegrees:25,azimuthDegrees:20}));await picture.screenshot({path:path.join(out,'turned.png')});
  const layout=[];for(const viewport of [{width:390,height:844},{width:844,height:390},{width:1280,height:600}]){await page.setViewportSize(viewport);const p=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert.ok(p.scroll<=p.width);assert.ok(await page.locator('#paper').isVisible());layout.push({...viewport,...p});}
  const d=await describe();assert.equal(d.renderer.drawCalls,3);assert.equal(d.renderer.gpuMemory.textures,2);assert.equal(d.renderer.gpuMemory.geometries,3);assert.deepEqual(errors,[]);
  const sources={};for(const dir of ['artworks/ink-pond/src','artworks/ink-pond/src/models','artworks/ink-pond/src/assets'])for(const name of fs.readdirSync(path.join(root,dir)))if(/\.(js|css|png|json)$/.test(name))sources[dir+'/'+name]=sha(fs.readFileSync(path.join(root,dir,name)));
  sources['artworks/ink-pond/index.html']=sha(fs.readFileSync(path.join(root,'artworks/ink-pond/index.html')));
  const report={pass:true,calligraphy:{text:'魚蝦清趣',style:'shutifang-liugongquan-kai',noStamp:true,onlyPaintingInscription:true,loaded:true},paper:{default:.72,range:[0,1],deviations,sharedWithBodies:true,stableAcrossTime:true,doesNotResetSwimmers:true},freshLoadRepeatable:true,backwardSeekRepeatable:true,savedPicture:{width:saved.width,height:saved.height,file:'saved-picture.png'},layout,renderer:d.renderer,sources,errors};
  fs.writeFileSync(path.join(out,'review.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,sources:undefined},null,2));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
