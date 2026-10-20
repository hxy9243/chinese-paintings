const fs=require('fs'),path=require('path'),{chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']}),p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:120000});await p.waitForFunction(()=>inkLab.ready,null,{timeout:120000});
 const result=await p.evaluate(async()=>{
  const T=await import('three');function image(shore){inkLab.frame(0,{viewName:'pavilion',width:800,height:450,seconds:3.5,shore,wind:0,water:.8});const c=new OffscreenCanvas(800,450),g=c.getContext('2d');g.drawImage(valley.renderer.domElement,0,0);return g.getImageData(0,0,800,450).data;}
  const a=image(0),c=image(1),half=new Uint16Array(800*450*4);valley.renderer.readRenderTargetPixels(inkLab.dataTarget,0,0,800,450,half);let tested=0,changed=0;
  for(let i=0;i<800*450;i++)if(Math.abs(T.DataUtils.fromHalfFloat(half[i*4+3])-.4)<.001){tested++;const j=((449-Math.floor(i/800))*800+i%800)*4;if([0,1,2].some(k=>a[j+k]!==c[j+k]))changed++;}
  return{passed:tested>10000&&changed===0,actualPavilionArchitecturePixels:tested,changedArchitecturePixels:changed,method:'At a close pavilion view, compare actual classified architecture pixels while toggling only shoreline diffusion.'};
 });
 const report={...result,passed:result.passed&&!errors.length,errors};fs.writeFileSync(path.join(root,'qa/orbit-protection.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await b.close();if(!report.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
