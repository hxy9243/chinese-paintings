const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process'),{chromium}=require('playwright');const root=path.resolve(__dirname,'..'),mode=process.argv[2]||'pilot',style=process.argv[3]||'ink',start=Number(process.argv[4]||0),stop=Number(process.argv[5]||720),runtime=path.join(root,'qa/runtime/lowlands-flight');
if(!['ink','clay'].includes(style))throw Error('Choose ink or clay');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']}),p=await b.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1}),errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:120000});await p.waitForFunction(()=>inkLab.ready,null,{timeout:120000});
 await p.evaluate(async({style})=>{const{createPavilionFlight}=await import('./src/pavilion-flight.js');window.pavilionFilm=createPavilionFlight(valley.model.bridge.hall.position);valley.camera.far=pavilionFilm.film.farPlane;inkLab.post.uniforms.farPlane.value=valley.camera.far;inkLab.frame(0,{viewName:'painting',width:1600,height:900,clayMode:style==='clay',seconds:0});window.filmFrame=seconds=>{const pose=pavilionFilm.sample(seconds);inkLab.setTime(seconds);valley.camera.position.set(...pose.position);valley.controls.target.set(...pose.target);valley.camera.lookAt(valley.controls.target);valley.camera.fov=pose.fov;valley.camera.updateProjectionMatrix();valley.render();return valley.renderer.domElement.toDataURL();};},{style});
 const route=await p.evaluate(()=>({film:pavilionFilm.film,keys:pavilionFilm.keys,focus:pavilionFilm.focus}));
 if(mode==='pilot'){
  const checks=await p.evaluate(async()=>{
   const T=await import('three'),H=valley.model.bridge.hall.position,roofs=new T.Box3();valley.model.bridge.hall.updateWorldMatrix(true,true);valley.model.bridge.hall.traverse(o=>{if(o.isMesh&&o.material===valley.model.saved.get(o)&&valley.model.saved.get(o)===valley.model.materials.roof)roofs.union(new T.Box3().setFromObject(o));});
   // Clay swaps the active materials; identify roof meshes by saved identity.
   if(roofs.isEmpty())valley.model.bridge.hall.traverse(o=>{if(o.isMesh&&valley.model.saved.get(o)===valley.model.materials.roof)roofs.union(new T.Box3().setFromObject(o));});
   const corners=[];for(const x of [roofs.min.x,roofs.max.x])for(const y of [roofs.min.y,roofs.max.y])for(const z of [roofs.min.z,roofs.max.z])corners.push(new T.Vector3(x,y,z));
   const samples=[];let minGround=Infinity,minTree=Infinity,maximumFrameStep=0,previous=null,minFocus=Infinity,maxFocusExtent=0;
   for(let i=0;i<=240;i++){
    const seconds=i/8,pose=pavilionFilm.sample(seconds),pos=new T.Vector3(...pose.position);valley.camera.position.copy(pos);valley.camera.lookAt(new T.Vector3(...pose.target));valley.camera.fov=pose.fov;valley.camera.updateProjectionMatrix();valley.camera.updateMatrixWorld(true);
    const ground=pos.y-valley.model.height(pos.x,pos.z);minGround=Math.min(minGround,ground);if(previous)maximumFrameStep=Math.max(maximumFrameStep,pos.distanceTo(previous));previous=pos;
    for(const tree of valley.model.forest.records){const radius=tree.height*.38+.6,cy=tree.y+tree.height*.65,clearance=Math.hypot(pos.x-tree.x,pos.y-cy,pos.z-tree.z)-radius;minTree=Math.min(minTree,clearance);}
    let extent=0;for(const c of corners){const q=c.clone().project(valley.camera);extent=Math.max(extent,Math.abs(q.x),Math.abs(q.y));}
    const distance=pos.distanceTo(new T.Vector3(...pavilionFilm.focus));if(seconds>=8&&seconds<=20){maxFocusExtent=Math.max(maxFocusExtent,extent);minFocus=Math.min(minFocus,distance);}
    samples.push({seconds,groundClearance:ground,pavilionDistance:distance,roofFrameExtent:extent});
   }
   const end=pavilionFilm.sample(30),beforeHold=pavilionFilm.sample(28.5),holdExact=JSON.stringify(end.position)===JSON.stringify(beforeHold.position)&&JSON.stringify(end.target)===JSON.stringify(beforeHold.target);
   return{passed:minGround>4&&minTree>2&&maxFocusExtent<.94&&samples.at(-1).pavilionDistance>minFocus*7&&holdExact,minimumGroundOrDeckClearance:minGround,minimumApproximateTreeClearance:minTree,maximumCameraStepAt8Hz:maximumFrameStep,maximumRoofFrameExtentDuringFocus:maxFocusExtent,closestPavilionDistance:minFocus,finalPavilionDistance:samples.at(-1).pavilionDistance,finalHoldExact:holdExact,samples};
  });
  const shots=[];for(const seconds of [0,4,8,11,14,17,20,24,28.5]){const uri=await p.evaluate(s=>filmFrame(s),seconds),file=`renders/lowlands-flight-${style}-${String(seconds).replace('.','-')}.png`;fs.writeFileSync(path.join(root,file),Buffer.from(uri.split(',')[1],'base64'));shots.push({seconds,file});}
  const first=await p.evaluate(()=>filmFrame(14));await p.evaluate(()=>filmFrame(27));const repeat=await p.evaluate(()=>filmFrame(14));const report={passed:checks.passed&&first===repeat&&!errors.length,style,sceneRevision:await p.evaluate(()=>valley.model.stats.revision),route,checks,absoluteTimeReplayIdentical:first===repeat,shots,errors,limits:'Ground and deck heights, conservative tree spheres and actual roof bounds are checked. This is not an exhaustive mesh collision or full-speed smoothness proof.'};fs.writeFileSync(path.join(root,`qa/lowlands-flight-${style}-pilot.json`),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,checks:{...checks,samples:undefined}},null,2));if(!report.passed)process.exitCode=1;
 }else if(mode==='frames'){
  if(!Number.isInteger(start)||!Number.isInteger(stop)||start<0||stop>720||start>=stop)throw Error('Invalid frame range');const dir=path.join(runtime,style);fs.mkdirSync(dir,{recursive:true});
  for(let i=start;i<stop;i++){const uri=await p.evaluate(i=>filmFrame(i/24),i);fs.writeFileSync(path.join(dir,String(i).padStart(4,'0')+'.png'),Buffer.from(uri.split(',')[1],'base64'));if(i%48===0)console.log(`${style} ${i}/720`);}
  const report={passed:!errors.length,style,start,stop,sceneRevision:await p.evaluate(()=>valley.model.stats.revision),route,errors};fs.writeFileSync(path.join(root,`qa/lowlands-flight-${style}-${start}-${stop}.json`),JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
 }else if(mode==='verify'){
  const samples=[];for(const i of [0,179,180,359,360,539,540,719]){const uri=await p.evaluate(i=>filmFrame(i/24),i),bytes=Buffer.from(uri.split(',')[1],'base64'),file=path.join(runtime,style,String(i).padStart(4,'0')+'.png');samples.push({frame:i,identical:bytes.equals(fs.readFileSync(file)),sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
  const report={passed:samples.every(s=>s.identical)&&!errors.length,style,samples,errors};fs.writeFileSync(path.join(root,`qa/lowlands-flight-${style}-replay.json`),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
 }
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
