// Renders the scene through the painting's registered comparison camera and
// writes the stitched panorama, the traced layout, a plan and an overlay.
// REVIEW_OUTPUT selects the folder; PLAYWRIGHT_CHROMIUM_EXECUTABLE a browser.
import { chromium } from '../artworks/qingming/node_modules/playwright/index.mjs';
import { createServer } from '../artworks/qingming/node_modules/vite/dist/node/index.js';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const sharp=createRequire(new URL('../artworks/qingming/package.json',import.meta.url))('sharp');
const out=process.env.REVIEW_OUTPUT??'docs/reviews/2026-10-23-painting-layout';fs.mkdirSync(out,{recursive:true});
const root='artworks/qingming';
const server=await createServer({root,server:{host:'127.0.0.1',port:4187,strictPort:true}});await server.listen();
const chrome='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE??(fs.existsSync('/tmp/chromium')?'/tmp/chromium':fs.existsSync(chrome)?chrome:undefined);
const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--ignore-gpu-blocklist']});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:3600,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
 await page.goto('http://127.0.0.1:4187/?capture=1');
 await page.waitForFunction(()=>window.qingmingStudy,undefined,{timeout:180000});
 const layout=await page.evaluate(async()=>{
  const L=await import('/src/paintingLayout.ts'),P=await import('/src/passageLayout.ts'),K=await import('/src/passageLife.ts');
  const halls=P.HALLS.map((h,i)=>({...h,index:i,kind:K.BUILDING_KINDS[i],
   roofPixel:L.planToPanorama(h.s,h.d,P.GROUND_Y+h.height+L.ROOF_MASS_RISE),
   corners:[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>{const u=a*h.width/2,v=b*h.depth/2;return [h.s+u*Math.cos(h.angle)-v*Math.sin(h.angle),h.d+u*Math.sin(h.angle)+v*Math.cos(h.angle)];})}));
  const shore=side=>{const r=[];for(let s=P.TERRAIN_BOUNDS.sMin;s<=P.TERRAIN_BOUNDS.sMax;s+=.25)r.push([s,P.shoreDepth(side,s)]);return r;};
  const landing=(x)=>{const p=P.bridgePoint(x);return {...p,pixel:L.planToPanorama(p.s,p.d,P.GROUND_Y)};};
  return {panorama:L.PANORAMA,camera:L.PANORAMA_CAMERA,traced:L.TRACED_BUILDINGS,halls,bounds:P.TERRAIN_BOUNDS,
   shores:{near:shore('near'),far:shore('far')},bridge:{near:landing(-P.BRIDGE.length/2),far:landing(P.BRIDGE.length/2),width:P.BRIDGE.width}};
 });
 const {panorama:pano,camera}=layout,W=pano.width,H=pano.height;
 // 1. Stitched panorama from the three supplied crops.
 const layers=[];
 for(const name of ['crossroads','bridge','bend']){
  const c=pano.crops[name],src=root+'/public/'+c.src,meta=await sharp(src).metadata();
  layers.push({input:await sharp(src).resize(Math.round(meta.width*c.scale)).toBuffer(),left:c.x,top:c.y,bottom:c.y+Math.round(meta.height*c.scale)});
 }
 const panoramaFile=out+'/panorama.jpg',canvas=Math.max(H,...layers.map(l=>l.bottom));
 const stitched=await sharp({create:{width:W,height:canvas,channels:3,background:'#8a7a5a'}}).composite(layers.map(({bottom,...l})=>l)).png().toBuffer();
 await sharp(stitched).extract({left:0,top:0,width:W,height:H}).jpeg({quality:88}).toFile(panoramaFile);
 // 2. Scene through the registered camera; the orthographic span matches Mock3D.
 const aspect=W/H,span=Math.max(10,26/aspect),zoom=camera.pixelsPerUnit*2*span/H;
 await page.addStyleTag({content:`.study-stamp,.study-badge,.study-zoom,.study-gesture{display:none!important}.study-stage{border-radius:0!important;width:${W}px!important;height:${H}px!important;max-height:none!important;aspect-ratio:auto!important}main,.study-shell{max-width:none!important}`});
 await page.waitForTimeout(300);
 const measurements=await page.evaluate(o=>window.qingmingStudy.frame(0,o),{zoom,angle:0,pitch:0,target:[camera.target.s,camera.target.d],palette:'silk'});
 const renderFile=out+'/render.jpg';
 await page.locator('.study-stage').screenshot({path:renderFile,type:'jpeg',quality:90,timeout:180000});
 // 3. Overlay: the painting at 45% over the render.
 await sharp(renderFile).composite([{input:await sharp(panoramaFile).ensureAlpha(.45).png().toBuffer()}]).jpeg({quality:88}).toFile(out+'/overlay.jpg');
 // 4. Traced layout: painted roof centres (red) against each hall's projected roof (blue).
 const traced=new Map(layout.traced.map(t=>[t.hall,t]));
 let marks=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="sans-serif">`;
 for(const h of layout.halls){
  const {x,y}=h.roofPixel,t=traced.get(h.index);
  marks+=`<circle cx="${x}" cy="${y}" r="7" fill="${t?'#c0392b':'#1f5fa8'}" stroke="#fff" stroke-width="2"/><text x="${x+9}" y="${y-6}" font-size="17" font-weight="700" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">${h.index}${t?' '+t.id:''}</text>`;
  if(t)marks+=`<path d="M${t.roof[0]-12} ${t.roof[1]}h24M${t.roof[0]} ${t.roof[1]-12}v24" stroke="#ffde59" stroke-width="3"/>`;
 }
 for(const p of [layout.bridge.near,layout.bridge.far])marks+=`<rect x="${p.pixel.x-8}" y="${p.pixel.y-8}" width="16" height="16" fill="#2e8b57" stroke="#fff" stroke-width="2"/>`;
 await sharp(panoramaFile).composite([{input:Buffer.from(marks+'</svg>')}]).jpeg({quality:88}).toFile(out+'/traced-layout.jpg');
 // 5. Plan view of every footprint, shoreline and the bridge, far bank at the top.
 const k=12,{sMin,sMax,dMin,dMax}=layout.bounds,px=s=>(s-sMin)*k,py=d=>(d-dMin)*k;
 const poly=(pts,attrs)=>`<polygon points="${pts.map(([s,d])=>px(s)+','+py(d)).join(' ')}" ${attrs}/>`;
 let plan=`<svg xmlns="http://www.w3.org/2000/svg" width="${(sMax-sMin)*k}" height="${(dMax-dMin)*k}" font-family="sans-serif" font-size="13"><rect width="100%" height="100%" fill="#e9dcbc"/>`;
 plan+=poly([...layout.shores.far,[sMax,dMin],[sMin,dMin]],'fill="#cdb98c"')+poly([...layout.shores.near,[sMax,dMax],[sMin,dMax]],'fill="#cdb98c"');
 for(const h of layout.halls){
  const t=traced.get(h.index);
  plan+=poly(h.corners,`fill="${t?'#c97b63':'#7d8a99'}" stroke="#333" stroke-width="1"`)+`<text x="${px(h.s)}" y="${py(h.d)+4}" text-anchor="middle" fill="#111">${h.index}</text>`;
 }
 const {near,far,width}=layout.bridge,angle=Math.atan2(far.d-near.d,far.s-near.s),ns=-Math.sin(angle)*width/2,nd=Math.cos(angle)*width/2;
 plan+=poly([[near.s+ns,near.d+nd],[far.s+ns,far.d+nd],[far.s-ns,far.d-nd],[near.s-ns,near.d-nd]],'fill="#a8743f" stroke="#333"');
 const viewW=W/camera.pixelsPerUnit;
 plan+=`<rect x="${px(camera.target.s-viewW/2)}" y="${py(dMin)}" width="${viewW*k}" height="${(dMax-dMin)*k}" fill="none" stroke="#c0392b" stroke-dasharray="8 6"/><text x="${px(camera.target.s-viewW/2)+6}" y="${py(dMax)-8}" fill="#c0392b">panorama camera width</text>`;
 fs.writeFileSync(out+'/plan.svg',plan+'</svg>');
 const offsets=layout.traced.map(t=>{const h=layout.halls[t.hall];return {hall:t.hall,id:t.id,traced:t.roof,rendered:[+h.roofPixel.x.toFixed(1),+h.roofPixel.y.toFixed(1)]};});
 fs.writeFileSync(out+'/review.json',JSON.stringify({errors,zoom,camera,bridge:layout.bridge,traced:offsets,measurements},null,2));
 console.log('wrote',out);
 if(errors.length)process.exitCode=1;
}finally{await browser.close();await server.close();}
