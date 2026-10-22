import { chromium } from '../artworks/qingming/node_modules/playwright/index.mjs';
import { createServer } from '../artworks/qingming/node_modules/vite/dist/node/index.js';
import fs from 'node:fs';
const out='docs/reviews/2026-10-21-traced-layout';fs.mkdirSync(out,{recursive:true});
const server=await createServer({root:'artworks/qingming',server:{host:'127.0.0.1',port:4183,strictPort:true}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE??(fs.existsSync('/tmp/chromium')?'/tmp/chromium':undefined),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-zygote','--single-process']});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:2200,height:1200},deviceScaleFactor:1.5,reducedMotion:'reduce'});
 page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});
 await page.route('https://fonts.googleapis.com/**',r=>r.fulfill({body:'',contentType:'text/css'}));
 await page.goto('http://127.0.0.1:4183/?capture=1');
 await page.waitForFunction(()=>window.qingmingStudy,undefined,{timeout:120000});
 const views=[
 ['full-layout',{zoom:.88,angle:14,pitch:-3,target:[0,-1]}],
 ['bend-and-houses',{zoom:1.8,angle:12,pitch:5,target:[-12,-1]}],
 ['bridge-and-gate',{zoom:2,angle:18,pitch:0,target:[5,2]}],
 ['high-layout',{zoom:.67,angle:0,pitch:30,target:[0,0]}],
 ];
 await page.addStyleTag({content:'.study-stamp,.study-badge,.study-zoom,.study-gesture{display:none!important}.study-stage{border-radius:0!important}'});
 const measurements={};
 for(const [name,options] of views.filter(v=>!process.env.REVIEW_VIEWS||process.env.REVIEW_VIEWS.split(',').includes(v[0]))){
  measurements[name]=await page.evaluate(o=>window.qingmingStudy.frame(0,{...o,palette:'silk'}),options);
  await page.locator('.study-stage').screenshot({path:out+'/'+name+'.jpg',type:'jpeg',quality:92,timeout:120000});console.log(name);
 }
 fs.writeFileSync(out+'/review.json',JSON.stringify({errors,measurements},null,2));
 if(errors.length)process.exitCode=1;
}finally{await browser.close();await server.close();}
