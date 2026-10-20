const fs=require('fs'),path=require('path'),crypto=require('crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),mode=process.argv[2]||'pilot',start=Number(process.argv[3]||0),stop=Number(process.argv[4]||960),runtime=path.join(root,'qa/runtime/pavilion-orbit');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const sourceFiles=fs.readdirSync(path.join(root,'src')).filter(f=>f.endsWith('.js')).map(f=>'src/'+f);
const sources=()=>Object.fromEntries(sourceFiles.map(f=>[f,sha(fs.readFileSync(path.join(root,f)))]));
(async()=>{
 const sourceHashes=sources(),browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:1600,height:720},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>inkLab.ready,null,{timeout:120000});
 await page.evaluate(async()=>{
  const {createPavilionOrbit}=await import('./src/pavilion-orbit.js');window.orbitRoute=createPavilionOrbit(valley.model.bridge.hall.position);
  valley.camera.far=orbitRoute.film.farPlane;inkLab.post.uniforms.farPlane.value=valley.camera.far;
  inkLab.frame(0,{viewName:'painting',width:1600,height:720,seconds:0});
  window.orbitFrame=seconds=>{const pose=orbitRoute.sample(seconds);inkLab.setTime(seconds);valley.camera.position.set(...pose.position);valley.controls.target.set(...pose.target);valley.camera.fov=pose.fov;valley.camera.lookAt(valley.controls.target);valley.camera.updateProjectionMatrix();valley.render();return valley.renderer.domElement.toDataURL();};
 });
 const route=await page.evaluate(()=>({film:orbitRoute.film,painting:orbitRoute.painting,focus:orbitRoute.focus,radius:orbitRoute.radius,height:orbitRoute.height}));
 const revision=await page.evaluate(()=>valley.model.stats.revision);if(revision!=='blue-green-08')throw Error('Expected revision 8');
 if(mode==='pilot'){
  const checks=await page.evaluate(async()=>{
   const T=await import('three'),roof=new T.Box3();valley.model.bridge.hall.updateWorldMatrix(true,true);
   valley.model.bridge.hall.traverse(o=>{if(o.isMesh&&valley.model.saved.get(o)===valley.model.materials.roof)roof.union(new T.Box3().setFromObject(o));});
   const corners=[];for(const x of [roof.min.x,roof.max.x])for(const y of [roof.min.y,roof.max.y])for(const z of [roof.min.z,roof.max.z])corners.push(new T.Vector3(x,y,z));
   let ground=Infinity,trees=Infinity,extent=0,turned=0,lastAngle=null,maxStep=0,previous=null;
   for(let i=0;i<=320;i++){
    const seconds=i/8,pose=orbitRoute.sample(seconds),p=new T.Vector3(...pose.position);ground=Math.min(ground,p.y-valley.model.height(p.x,p.z));
    if(previous)maxStep=Math.max(maxStep,p.distanceTo(previous));previous=p;
    for(const t of valley.model.forest.records)trees=Math.min(trees,Math.hypot(p.x-t.x,p.y-(t.y+t.height*.65),p.z-t.z)-(t.height*.38+.6));
    if(pose.phase==='orbit'){
     valley.camera.position.copy(p);valley.camera.lookAt(new T.Vector3(...pose.target));valley.camera.fov=pose.fov;valley.camera.updateProjectionMatrix();valley.camera.updateMatrixWorld(true);
     for(const c of corners){const q=c.clone().project(valley.camera);extent=Math.max(extent,Math.abs(q.x),Math.abs(q.y));}
     const angle=Math.atan2(p.x-orbitRoute.focus[0],p.z-orbitRoute.focus[2]);if(lastAngle!==null){let d=angle-lastAngle;while(d<-Math.PI)d+=Math.PI*2;while(d>Math.PI)d-=Math.PI*2;turned+=d;}lastAngle=angle;
    }
   }
   const end=orbitRoute.sample(40),start=orbitRoute.sample(0),v=valley.views.painting;
   const exact=JSON.stringify(end.position)===JSON.stringify(v.position)&&JSON.stringify(end.target)===JSON.stringify(v.target)&&end.fov===v.fov&&JSON.stringify(end)===JSON.stringify(start);
   orbitFrame(38);const film=valley.renderer.domElement.toDataURL();inkLab.frame(0,{viewName:'painting',width:1600,height:720,seconds:38});const comparison=valley.renderer.domElement.toDataURL();
   return{passed:ground>4&&trees>2&&extent<.94&&Math.abs(turned-Math.PI*2)<1e-8&&exact&&film===comparison,minimumGroundOrDeckClearance:ground,minimumConservativeTreeClearance:trees,maximumRoofFrameExtent:extent,actualAccumulatedOrbitDegrees:turned*180/Math.PI,maximumCameraStepAt8Hz:maxStep,exactPaintingCameraReturn:exact,returnMatchesPaintingViewPixels:film===comparison};
  });
  const shots=[];for(const seconds of [0,7,12.5,18,23.5,29,34,38]){const uri=await page.evaluate(s=>orbitFrame(s),seconds),file=`renders/pavilion-orbit-${String(seconds).replace('.','-')}.png`;fs.writeFileSync(path.join(root,file),Buffer.from(uri.split(',')[1],'base64'));shots.push({seconds,file});}
  const a=await page.evaluate(()=>orbitFrame(18));await page.evaluate(()=>orbitFrame(31));const b=await page.evaluate(()=>orbitFrame(18));
  const report={passed:checks.passed&&a===b&&!errors.length,revision,route,checks,absoluteTimeReplayIdentical:a===b,sourceHashes,shots,errors};fs.writeFileSync(path.join(root,'qa/orbit-film-pilot.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
 }else if(mode==='frames'){
  if(!Number.isInteger(start)||!Number.isInteger(stop)||start<0||stop>960||start>=stop)throw Error('Invalid frame range');fs.mkdirSync(runtime,{recursive:true});
  for(let i=start;i<stop;i++){const uri=await page.evaluate(i=>orbitFrame(i/24),i);fs.writeFileSync(path.join(runtime,String(i).padStart(4,'0')+'.png'),Buffer.from(uri.split(',')[1],'base64'));if(i%48===0)console.log(`${i}/960`);}
  const passed=!errors.length&&JSON.stringify(sourceHashes)===JSON.stringify(sources());fs.writeFileSync(path.join(root,`qa/orbit-film-${start}-${stop}.json`),JSON.stringify({passed,revision,route,sourceHashes,start,stop,errors},null,2));if(!passed)process.exitCode=1;
 }else if(mode==='verify'){
  const samples=[];for(const i of [0,239,240,479,480,719,720,959]){const uri=await page.evaluate(i=>orbitFrame(i/24),i),bytes=Buffer.from(uri.split(',')[1],'base64');samples.push({frame:i,identical:bytes.equals(fs.readFileSync(path.join(runtime,String(i).padStart(4,'0')+'.png'))),sha256:sha(bytes)});}
  const report={passed:samples.every(s=>s.identical)&&!errors.length,sourceHashes,samples,errors};fs.writeFileSync(path.join(root,'qa/orbit-film-replay.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
 }else throw Error('Unknown mode');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
