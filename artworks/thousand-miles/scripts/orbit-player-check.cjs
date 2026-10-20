const fs=require('fs'),path=require('path'),{chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 await page.goto('http://127.0.0.1:8781/orbit.html',{waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('#film').readyState>=2&&!document.querySelector('[data-time="18"]').disabled);
 const stages=[];for(const seconds of [18,29,38,0]){
  await page.locator(`[data-time="${seconds}"]`).click();await page.waitForFunction(s=>document.querySelector('#film').currentTime>s+.15,seconds,{timeout:5000});await page.evaluate(()=>document.querySelector('#film').pause());
  stages.push(await page.evaluate(()=>{const v=document.querySelector('#film');return{time:v.currentTime,width:v.videoWidth,height:v.videoHeight,duration:v.duration,seekable:Array.from({length:v.seekable.length},(_,i)=>[v.seekable.start(i),v.seekable.end(i)]),error:v.error?.message||null};}));
 }
 await page.locator('[data-time="18"]').click();await page.waitForFunction(()=>document.querySelector('#film').currentTime>18.15);await page.evaluate(()=>document.querySelector('#film').pause());await page.screenshot({path:path.join(root,'renders/orbit-player.png')});
 await page.locator('summary').click();await page.waitForFunction(()=>{const d=document.querySelector('details'),im=d.querySelector('img');return d.open&&im.complete&&im.naturalWidth>0;});
 const report={passed:stages.every((s,i)=>s.width===1600&&s.height===720&&s.duration===40&&s.time>[18,29,38,0][i]+.15&&s.time<[18,29,38,0][i]+2&&!s.error&&s.seekable[0][1]===40)&&!errors.length&&!failed.length,stages,errors,failedResponses:failed};fs.writeFileSync(path.join(root,'qa/orbit-player.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();if(!report.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
