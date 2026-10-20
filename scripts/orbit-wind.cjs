const fs=require('fs'),path=require('path'),{chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:640,height:400}}),errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>inkLab.ready,null,{timeout:120000});
 const wind=await page.evaluate(()=>{
  inkLab.set({wind:1.1,water:0,atmosphere:0,mist:0,paper:0,lines:0});
  function sample(seconds){inkLab.frame(0,{viewName:'painting',width:640,height:400,seconds});valley.camera.position.set(-68,11,123);valley.controls.target.set(-70,6,99);valley.camera.lookAt(valley.controls.target);valley.camera.fov=46;valley.camera.updateProjectionMatrix();valley.render();return inkLab.readback(true);}
  const a=sample(0),b=sample(3.5),w=a.width,h=a.height;let matches=0,sum=0,maxShift=0;
  for(let y=12;y<h-12;y+=4)for(let x=12;x<w-12;x+=4){const i=(y*w+x)*4;if(a.world[i+3]<.5)continue;let best=1e10,at=-1,shift=0;
   for(let yy=y-9;yy<=y+9;yy++)for(let xx=x-9;xx<=x+9;xx++){const j=(yy*w+xx)*4;if(b.world[j+3]<.5)continue;const err=(b.rest[j]-a.rest[i])**2+(b.rest[j+1]-a.rest[i+1])**2+(b.rest[j+2]-a.rest[i+2])**2;if(err<best){best=err;at=j;shift=Math.hypot(xx-x,yy-y);}}
   if(at<0||best>.0025||shift<1)continue;matches++;maxShift=Math.max(maxShift,shift);for(let c=0;c<3;c++)sum+=(a.pigment[i+c]-b.pigment[at+c])**2;
  }
  const rmse=Math.sqrt(sum/(matches*3));return{passed:matches>80&&rmse<.05,movingMatchedSurfaces:matches,maximumMatchedShiftPixels:maxShift,pigmentRMSELinear:rmse,method:'Match undeformed surface coordinates in the new left grove between two wind phases; exclude stationary pixels and matches beyond 5 cm.'};
 });
const report={revision:await page.evaluate(()=>valley.model.stats.revision),...wind,passed:wind.passed&&!errors.length,errors};fs.writeFileSync(path.join(root,'qa/orbit-wind.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();if(!report.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
