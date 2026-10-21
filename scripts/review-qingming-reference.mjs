import { chromium } from "../artworks/qingming/node_modules/playwright/index.mjs";
import { preview } from "../artworks/qingming/node_modules/vite/dist/node/index.js";
import fs from "node:fs";
import path from "node:path";
const out=process.env.REVIEW_DIR??"docs/reviews/2026-10-20-reference-details";
fs.mkdirSync(out,{recursive:true});
const server=await preview({root:"artworks/qingming",preview:{host:"127.0.0.1",port:4183,strictPort:true}});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
 args:["--no-sandbox","--disable-dev-shm-usage","--use-angle=swiftshader","--enable-unsafe-swiftshader"]});
const errors=[],measurements=process.env.REVIEW_MOBILE_ONLY?JSON.parse(fs.readFileSync(out+"/review.json","utf8")).measurements:{};
try{
 const page=await browser.newPage({viewport:{width:1800,height:1100},reducedMotion:"reduce"});
 const fonts=process.env.QINGMING_QA_FONTS;
 const css=fonts?fs.readFileSync(path.join(fonts,"400.css"),"utf8").replaceAll("./files/","https://qingming-fonts.test/"):"";
 await page.route("https://fonts.googleapis.com/**",r=>r.fulfill({contentType:"text/css",body:css}));
 await page.route("https://qingming-fonts.test/**",r=>r.fulfill({contentType:"font/woff2",headers:{"access-control-allow-origin":"*"},body:fs.readFileSync(path.join(fonts,"files",path.basename(new URL(r.request().url()).pathname)))}));
 page.on("pageerror",e=>errors.push(e.message));
 page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
 await page.goto("http://127.0.0.1:4183/?capture=1");
 await page.waitForFunction(()=>window.qingmingStudy,undefined,{timeout:120000});
 await page.evaluate(async()=>{await document.fonts.ready;});
 const views=[
  ["overview",0,{zoom:.96,angle:30,pitch:3,target:[0,0]}],
  ["bridge-crowd",0,{zoom:3.3,angle:-50,pitch:-8,target:[-6.6,-1.5]}],
  ["construction-and-balcony",0,{zoom:3.7,angle:30,pitch:-15,target:[-12.9,8.2]}],
  ["old-trees-and-bank",0,{zoom:2.5,angle:30,pitch:-8,target:[6.1,6]}],
  ["boat-crew",0,{zoom:3.8,angle:30,pitch:-15,target:[-3,-1.1]}],
  ["pointed-leaves",0,{zoom:4.5,angle:30,pitch:-10,target:[6.1,6.5]}],
  ["rocky-bank",0,{eye:[1,1.2,1.4],look:[7,1,6.3],fov:58}],
  ["reverse",12,{zoom:1.08,angle:-40,pitch:-8,target:[-2,0]}],
 ];
 if(!process.env.REVIEW_MOBILE_ONLY)for(const [name,time,options] of views.filter(v=>!process.env.REVIEW_VIEWS||process.env.REVIEW_VIEWS.split(",").includes(v[0]))){
  measurements[name]=await page.evaluate(({time,options})=>window.qingmingStudy.frame(time,{...options,palette:"silk"}),{time,options});
  await page.locator(".study-stage").screenshot({path:out+"/"+name+".jpg",type:"jpeg",quality:94});
  console.log(name);
 }
 await page.setViewportSize({width:390,height:844});
 // ResizeObserver clears the framebuffer in capture mode; render only after it
 // has resized the camera and postprocessing targets.
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 measurements.mobile=await page.evaluate(()=>window.qingmingStudy.frame(0,{zoom:.95,angle:30,pitch:3,target:[-6,0]}));
 await page.locator(".study-stage").screenshot({path:out+"/mobile.jpg",type:"jpeg",quality:90});
 const report={errors,measurements};fs.writeFileSync(out+"/review.json",JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify({errors,views:Object.keys(measurements),overviewCalls:measurements.overview?.calls}));
 if(errors.length)process.exitCode=1;
}finally{await browser.close();await new Promise(r=>server.httpServer.close(r));}
