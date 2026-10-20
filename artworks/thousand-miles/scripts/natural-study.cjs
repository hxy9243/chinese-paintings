const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),phase=process.argv[2]||'after',out=path.join(root,'renders/natural-study');fs.mkdirSync(out,{recursive:true});
if(!['before','after'].includes(phase))throw Error('Expected before or after');
const referenceCommit='77abff0',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceHashes=Object.fromEntries(fs.readdirSync(path.join(root,'src')).filter(f=>f.endsWith('.js')).sort().map(f=>['src/'+f,sha(fs.readFileSync(path.join(root,'src',f)))]));
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1779,height:801},deviceScaleFactor:1}),errors=[],shots=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  if(phase==='before'){
   // Always reconstruct the committed baseline, never relabel current files
   // as "before". The separate brush study was off for the original samples.
   await page.route(url=>url.pathname==='/'||url.pathname.startsWith('/src/'),route=>{
    const file=new URL(route.request().url()).pathname.slice(1)||'index.html';
    return route.fulfill({body:execFileSync('git',['show',referenceCommit+':'+file],{cwd:root}),contentType:file.endsWith('.html')?'text/html':'text/javascript'});
   });
  }
  await page.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:180000});await page.waitForFunction(()=>window.inkLab?.ready,null,{timeout:180000});
  for(const view of ['painting','mountains','entry','back','clay']){
   const result=await page.evaluate(({view})=>{
    inkLab.frame(0,{viewName:['back','clay'].includes(view)?view==='clay'?'painting':'mountains':view,width:1779,height:801,seconds:9.25,clayMode:view==='clay',foldBrush:0,mineralStudy:0});
    if(view==='back'){valley.camera.position.set(-75,35,-110);valley.controls.target.set(-70,24,-25);valley.camera.fov=46;valley.camera.lookAt(valley.controls.target);valley.camera.updateProjectionMatrix();valley.render();}
    return {uri:valley.renderer.domElement.toDataURL(),camera:valley.camera.matrixWorld.toArray(),passes:inkLab.metadata().passes};
   },{view});
   const bytes=Buffer.from(result.uri.split(',')[1],'base64');delete result.uri;
   const file=`renders/natural-study/${phase}-${view}.png`;fs.writeFileSync(path.join(root,file),bytes);shots.push({view,file,...result,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});console.log(`${phase}: ${view}`);
  }
  const metadata=await page.evaluate(()=>valley.metadata());
  const replay=await page.evaluate(()=>{const options={viewName:'mountains',width:960,height:432,seconds:12,clayMode:false,foldBrush:0,mineralStudy:0};const a=inkLab.frame(0,options);inkLab.frame(.8,{viewName:'pavilion',seconds:31});return a===inkLab.frame(0,options);});
  if(phase==='after')for(const [file,hash]of Object.entries(sourceHashes))if(sha(fs.readFileSync(path.join(root,file)))!==hash)throw Error('Source changed during capture: '+file);
  const report={phase,referenceCommit,sourceHashes:phase==='after'?sourceHashes:undefined,shots,metadata,replay,errors};fs.writeFileSync(path.join(root,`qa/natural-${phase}.json`),JSON.stringify(report,null,2));
  console.log(JSON.stringify({phase,replay,errors,triangles:metadata.triangles,stats:metadata.stats}));if(errors.length||!replay)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
