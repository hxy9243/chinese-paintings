const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process'),{chromium}=require('playwright');const root=path.resolve(__dirname,'..'),previous='1371ddf282363e466eeaa0b676fc631b49261be4';
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']}),p=await b.newPage({viewport:{width:1600,height:720}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:120000});await p.waitForFunction(()=>inkLab.ready);
 const shapes=await p.evaluate(async()=>{
  const T=await import('three'),{mountainForms}=await import('./src/mountain-shapes.js');inkLab.frame(0,{viewName:'painting',width:1600,height:720,clayMode:true,seconds:2});valley.model.root.updateMatrixWorld(true);
  const land=valley.model.mountains.children[0],samples=[];let exposed=0,error=0;
  for(const f of mountainForms)for(let j=0;j<f.nodes.length;j++){
   const n=f.nodes[j],hit=new T.Raycaster(new T.Vector3(n.x,500,n.z),new T.Vector3(0,-1,0)).intersectObject(land,false)[0];if(!hit)throw Error('Missing mountain surface: '+f.name);
   const covered=hit.point.y>n.y-1.65+1.8,projected=hit.point.clone().project(valley.camera),target=[f.trace[j][0]/1779*1600,f.trace[j][1]/801*720],actual=[(projected.x*.5+.5)*1600,(.5-projected.y*.5)*720],delta=Math.hypot(actual[0]-target[0],actual[1]-target[1]);
   if(!covered){exposed++;error+=delta;}samples.push({name:f.name,node:j,target,actual,errorPixels:delta,coveredByOverlappingTerrain:covered});
  }
  return{forms:mountainForms.map(({nodes,...f})=>f),samples,exposedSamples:exposed,meanExposedRegistrationErrorPixels:error/exposed};
 });
 const shots=[];for(const view of ['painting','mountains','right','top']){
  const uri=await p.evaluate(view=>{inkLab.frame(0,{viewName:view==='top'?'painting':view,width:1600,height:720,clayMode:true,seconds:2});if(view==='top'){valley.camera.position.set(0,225,90);valley.controls.target.set(0,0,-85);valley.camera.fov=50;valley.camera.lookAt(valley.controls.target);valley.camera.updateProjectionMatrix();valley.render();}return valley.renderer.domElement.toDataURL();},view);
  const file=`renders/shape-clay-${view}.png`;fs.writeFileSync(path.join(root,file),Buffer.from(uri.split(',')[1],'base64'));shots.push(file);
 }
 const normalized=(s)=>s.replace(/blue-green-\d+/g,'REVISION').replace(/SphereGeometry\(\d+,/g,'SphereGeometry(RADIUS,');
 const paintSources=['src/ink.js','src/glazes.js','src/wash.js','src/materials.js','src/effects.js'].map(file=>({file,unchanged:normalized(fs.readFileSync(path.join(root,file),'utf8'))===normalized(execFileSync('git',['show',previous+':'+file],{cwd:root,encoding:'utf8'}))}));
 const source=fs.readFileSync(path.join(root,'reference/source.png')),sourceHash=crypto.createHash('sha256').update(source).digest('hex'),canonical=JSON.parse(fs.readFileSync(path.join(root,'reference/analysis.json'))).sha256;
 const report={passed:!errors.length&&shapes.exposedSamples>140&&shapes.meanExposedRegistrationErrorPixels<8&&paintSources.every(s=>s.unchanged)&&sourceHash===canonical,revision:'blue-green-06',previousCommit:previous,paintSources,sourceHash,exposedSamples:shapes.exposedSamples,meanExposedRegistrationErrorPixels:shapes.meanExposedRegistrationErrorPixels,samples:shapes.samples,forms:shapes.forms.length,shots,errors,boundary:'Registration checks actual terrain triangles against hand-read crest targets. Hidden nodes are reported separately. This is not an independent silhouette IoU, historical reconstruction claim or artistic acceptance score.'};
 fs.writeFileSync(path.join(root,'research/mountain-shape-landmarks.json'),JSON.stringify({source:'reference/source.png',sourceHash,referenceSize:[1779,801],method:'Hand-read source crest polylines back-projected into full 3D ridges; varying front and back slopes and depth sweep. No image plane or painting texture on geometry.',forms:shapes.forms},null,2));fs.writeFileSync(path.join(root,'qa/shape-study.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,samples:undefined},null,2));await b.close();if(!report.passed)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
