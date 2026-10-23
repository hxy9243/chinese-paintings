import { chromium } from '../artworks/qingming/node_modules/playwright/index.mjs';
import { createServer } from '../artworks/qingming/node_modules/vite/dist/node/index.js';
import fs from 'node:fs';
const out=process.env.REVIEW_OUTPUT??'docs/reviews/2026-10-22-reconstruction';fs.mkdirSync(out,{recursive:true});
const server=await createServer({root:'artworks/qingming',server:{host:'127.0.0.1',port:4185,strictPort:true}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE??(fs.existsSync('/tmp/chromium')?'/tmp/chromium':undefined),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-zygote','--single-process']});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:2200,height:1200},deviceScaleFactor:1.5,reducedMotion:'reduce'});
 page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('BROWSER ERROR',m.text())}});
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
 await page.goto('http://127.0.0.1:4185/?capture=1');
 await page.waitForFunction(()=>window.qingmingStudy,undefined,{timeout:120000});
 const views=[
 ['full-layout',{zoom:.55,angle:0,pitch:0,target:[-10,0]}],
 ['reference-view',{zoom:1.29,angle:0,pitch:0,target:[-7.2,3.67]}],
 ['crossroads',{zoom:1.35,angle:0,pitch:0,target:[-37,5]}],
 ['joined-roofs',{zoom:1.65,angle:25,pitch:8,target:[-30,13]}],
 ['old-tree',{zoom:2.2,angle:18,pitch:4,target:[-46,-1]}],
 ['river-bend',{zoom:2,angle:0,pitch:0,target:[-23,-1]}],
 ['bank-texture',{eye:[-10,1.2,0],look:[-10,.25,3],fov:48}],
 ['boat-close',{zoom:2.1,angle:0,pitch:0,target:[13.655,.305]}],
 ['bridge-topology',{zoom:1.5,angle:0,pitch:30,target:[12,0]}],
 ['scaffold-close',{zoom:1.6,angle:10,pitch:0,target:[-6.5,4]}],
 ['scaffold-and-bridge',{zoom:1.1,angle:0,pitch:0,target:[9,1]}],
 ['covered-carts',{zoom:3,angle:18,pitch:3,target:[-40,8]}],
 ['rotated-overview',{zoom:.55,angle:20,pitch:4,target:[-10,1]}],
 ['painting-edge',{zoom:1.25,angle:25,pitch:4,target:[30,13]}],
 ];
 await page.addStyleTag({content:'.study-stamp,.study-badge,.study-zoom,.study-gesture{display:none!important}.study-stage{border-radius:0!important}'});
 const measurements=process.env.REVIEW_VIEWS&&fs.existsSync(out+'/review.json')?JSON.parse(fs.readFileSync(out+'/review.json','utf8')).measurements:{};
 for(const [name,options] of views.filter(v=>!process.env.REVIEW_VIEWS||process.env.REVIEW_VIEWS.split(',').includes(v[0]))){
  if(name==='full-layout'||name==='reference-view'){
   await page.setViewportSize({width:3400,height:name==='full-layout'?1450:900});
   await page.addStyleTag({content:'.study-stage{width:100%!important;height:'+(name==='full-layout'?1250:600)+'px!important;max-height:none!important;aspect-ratio:auto!important}main,.study-shell{max-width:none!important}'});
  }else{await page.setViewportSize({width:2200,height:1200});await page.addStyleTag({content:'.study-stage{height:850px!important}'});}
  await page.waitForTimeout(100);
  measurements[name]=await page.evaluate(o=>window.qingmingStudy.frame(0,{...o,palette:'silk'}),options);
  await page.locator('.study-stage').screenshot({path:out+'/'+name+'.jpg',type:'jpeg',quality:92,timeout:120000});console.log(name);
 }
 fs.writeFileSync(out+'/review.json',JSON.stringify({errors,measurements},null,2));
 if(errors.length)process.exitCode=1;
}finally{await browser.close();await server.close();}
