const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),reference='163aedb',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const median=a=>{const s=[...a].sort((x,y)=>x-y),i=s.length/2;return(s[Math.floor(i)]+s[Math.ceil(i)-1])/2;};
const args=['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage'];
(async()=>{
 const browser=await chromium.launch({headless:true,args}),errors=[],measurements=[];
 try{
  for(const baseline of [true,false]){
   const page=await browser.newPage({viewport:{width:1600,height:720},deviceScaleFactor:1});
   page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
   if(baseline){
    const old=file=>execFileSync('git',['show',`${reference}:${file}`],{cwd:root});
    await page.route(u=>u.pathname==='/',route=>route.fulfill({body:old('index.html'),contentType:'text/html'}));
    for(const file of ['main.js','ink.js'])await page.route(`**/src/${file}*`,route=>route.fulfill({body:old('src/'+file),contentType:'text/javascript'}));
   }
   await page.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:180000});await page.waitForFunction(()=>window.inkLab?.ready,null,{timeout:180000});
   for(const view of ['painting','pavilion']){
    const sample=await page.evaluate(async view=>{
     inkLab.frame(0,{viewName:view,width:1600,height:720,seconds:9.25});
     const r=valley.renderer,gl=r.getContext(),timer=gl.getExtension('EXT_disjoint_timer_query_webgl2'),debug=gl.getExtension('WEBGL_debug_renderer_info');
     if(!timer)throw Error('GPU timer queries required for this benchmark');
     async function drain(){const fence=gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE,0);gl.flush();const start=performance.now();for(;;){const status=gl.clientWaitSync(fence,0,0);if(status===gl.ALREADY_SIGNALED||status===gl.CONDITION_SATISFIED)break;if(status===gl.WAIT_FAILED||performance.now()-start>30000)throw Error('GPU fence timeout');await new Promise(r=>setTimeout(r,2));}gl.deleteSync(fence);}
     for(let i=0;i<4;i++){valley.render();await drain();}
     const gpuMs=[];r.info.autoReset=false;
     for(let i=0;i<12;i++){
      r.info.reset();const query=gl.createQuery();gl.beginQuery(timer.TIME_ELAPSED_EXT,query);valley.render();gl.endQuery(timer.TIME_ELAPSED_EXT);await drain();
      const start=performance.now();while(!gl.getQueryParameter(query,gl.QUERY_RESULT_AVAILABLE)){if(performance.now()-start>30000)throw Error('GPU timer timeout');await new Promise(r=>setTimeout(r,2));}
      if(gl.getParameter(timer.GPU_DISJOINT_EXT))throw Error('GPU timer was disjoint');gpuMs.push(gl.getQueryParameter(query,gl.QUERY_RESULT)/1e6);gl.deleteQuery(query);
     }
     const submitted={...r.info.render};r.info.autoReset=true;
     return{view,gpuMs,submitted,passes:inkLab.metadata().passes,triangles:valley.metadata().triangles,renderer:gl.getParameter(debug?debug.UNMASKED_RENDERER_WEBGL:gl.RENDERER),image:r.domElement.toDataURL()};
    },view);
    const bytes=Buffer.from(sample.image.split(',')[1],'base64');delete sample.image;
    sample.baseline=baseline;sample.sha256=hash(bytes);sample.medianGpuMs=median(sample.gpuMs);measurements.push(sample);
    const dir=path.join(root,'qa/runtime/render-speed');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,`${baseline?'before':'after'}-${view}.png`),bytes);
    console.log(JSON.stringify({...sample,gpuMs:undefined}));
   }
   await page.close();
  }
  const page=await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1,acceptDownloads:true});page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:8781/',{waitUntil:'networkidle',timeout:180000});await page.waitForFunction(()=>window.inkLab?.ready,null,{timeout:180000});await page.locator('#motion').uncheck();
  const checks=[];
  const quality=()=>page.evaluate(()=>valley.renderQuality.metadata());
  await page.locator('#quality').selectOption('fast');const fast=await quality();
  await page.locator('#quality').selectOption('detail');const detail=await quality();
  checks.push({name:'Fast and Detail retain the same camera with different pixel counts',passed:fast.width===960&&fast.height===540&&detail.width===1280&&detail.height===720,fast,detail});
  await page.locator('#quality').selectOption('auto');
  const during=await page.evaluate(()=>{valley.renderer.domElement.dispatchEvent(new WheelEvent('wheel',{deltaY:-80,bubbles:true,cancelable:true}));return{quality:valley.renderQuality.metadata(),camera:valley.camera.matrixWorld.toArray(),paper:inkLab.post.uniforms.paperResolution.value.toArray()};});
  await page.waitForFunction(()=>!valley.renderQuality.metadata().preview);
  const after=await page.evaluate(()=>({quality:valley.renderQuality.metadata(),camera:valley.camera.matrixWorld.toArray(),paper:inkLab.post.uniforms.paperResolution.value.toArray()}));
  checks.push({name:'Auto refines after camera motion without moving the camera or rescaling silk',passed:during.quality.preview&&!after.quality.preview&&JSON.stringify(during.camera)===JSON.stringify(after.camera)&&JSON.stringify(during.paper)===JSON.stringify(after.paper),during:during.quality,after:after.quality});
  await page.locator('#quality').selectOption('fast');const downloadPromise=page.waitForEvent('download');await page.locator('#save').click();const download=await downloadPromise;
  const png=fs.readFileSync(await download.path()),dimensions=[png.readUInt32BE(16),png.readUInt32BE(20)];await page.waitForFunction(()=>!document.querySelector('#save').disabled);
  const restored=await quality();checks.push({name:'Detailed PNG exports at 2x and restores Fast preview',passed:dimensions[0]===2560&&dimensions[1]===1440&&restored.width===960&&restored.height===540,dimensions,restored});
  const replay=await page.evaluate(()=>{const a=inkLab.frame(0,{viewName:'pavilion',width:643,height:367,seconds:2});inkLab.frame(.6,{width:320,height:180,seconds:19});const b=inkLab.frame(0,{viewName:'pavilion',width:643,height:367,seconds:2});return{identical:a===b,width:valley.renderer.domElement.width,height:valley.renderer.domElement.height};});
  checks.push({name:'Explicit captures ignore preview quality and replay at exact requested dimensions',passed:replay.identical&&replay.width===643&&replay.height===367,...replay});
  await page.setViewportSize({width:760,height:540});await page.waitForFunction(()=>valley.renderQuality.metadata().logicalWidth===760);
  const mobile=await page.evaluate(()=>{const c=valley.renderer.domElement.getBoundingClientRect();return{width:c.width,height:c.height,quality:valley.renderQuality.metadata()};});
  checks.push({name:'Preview canvas continues to fill the resized viewport',passed:mobile.width===760&&mobile.height===540&&mobile.quality.width===570&&mobile.quality.height===405,...mobile});
  const matched=['painting','pavilion'].map(view=>{const before=measurements.find(r=>r.baseline&&r.view===view),after=measurements.find(r=>!r.baseline&&r.view===view);return{view,passed:before.sha256===after.sha256&&before.triangles===after.triangles&&after.passes===3,identicalPng:before.sha256===after.sha256,beforeGpuMs:before.medianGpuMs,afterGpuMs:after.medianGpuMs,gpuReductionPercent:100*(1-after.medianGpuMs/before.medianGpuMs),beforeSubmittedTriangles:before.submitted.triangles,afterSubmittedTriangles:after.submitted.triangles};});
  const report={passed:matched.every(r=>r.passed)&&checks.every(c=>c.passed)&&!errors.length,referenceCommit:reference,method:'Twelve EXT_disjoint_timer_query_webgl2 samples after four fence-drained warm-up frames, 1600x720, fixed environment time 9.25. These are GPU elapsed timings on one local GPU, not interactive FPS. PNG and disk I/O are excluded.',measurements,matched,checks,errors};
  fs.writeFileSync(path.join(root,'qa/render-speed.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,matched,checks,errors},null,2));if(!report.passed)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
