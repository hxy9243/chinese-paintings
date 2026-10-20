const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),base='f45c470';
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:1000,height:600}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>inkLab.ready,null,{timeout:120000});
 const structural=await page.evaluate(async()=>{
  const T=await import('three'),{terrainHeight,terrainBounds,nearestRoad,riverCenter}=await import('./src/terrain.js'),{mountainForms}=await import('./src/mountain-shapes.js'),land=valley.model.mountains.children[0],g=land.geometry.attributes.position;
  valley.model.root.updateMatrixWorld(true);
  let maxPerimeter=-Infinity;const {nx,nz}=terrainBounds;
  for(let i=0;i<=nx;i++)for(const j of [0,nz])maxPerimeter=Math.max(maxPerimeter,g.getY(j*(nx+1)+i));
  for(let j=0;j<=nz;j++)for(const i of [0,nx])maxPerimeter=Math.max(maxPerimeter,g.getY(j*(nx+1)+i));
  const seam=[];for(const x of [-145,-100,-70,70,100,145])seam.push({x,height:terrainHeight(x,130),differenceAcrossOldBoundary:Math.abs(terrainHeight(x,129.7)-terrainHeight(x,130.3)),extendedHeight:terrainHeight(x,200)});
  const roots=[];for(const tree of valley.model.forest.records.filter(t=>t.lowland).filter((_,i)=>i%9===0)){
   const hit=new T.Raycaster(new T.Vector3(tree.x,400,tree.z),new T.Vector3(0,-1,0)).intersectObject(land,false)[0];roots.push({x:tree.x,z:tree.z,error:hit?Math.abs(hit.point.y-tree.y):999});
  }
  const lowTrees=valley.model.forest.records.filter(t=>t.lowland),{approachRoads}=await import('./src/terrain.js');
  let roadClearance=Infinity;
  for(const t of lowTrees)for(const road of approachRoads)for(let i=1;i<road.samples.length;i++){
   const a=road.samples[i-1],b=road.samples[i],dx=b.x-a.x,dz=b.z-a.z,u=T.MathUtils.clamp(((t.x-a.x)*dx+(t.z-a.z)*dz)/(dx*dx+dz*dz),0,1);
   roadClearance=Math.min(roadClearance,Math.hypot(t.x-a.x-u*dx,t.z-a.z-u*dz));
  }
  const crest=[];for(const f of mountainForms){const n=f.nodes.reduce((a,b)=>b.y>a.y?b:a);if(n.y<30)continue;const hit=new T.Raycaster(new T.Vector3(n.x,400,n.z),new T.Vector3(0,-1,0)).intersectObject(land,false)[0];crest.push({name:f.name,error:hit?Math.abs(hit.point.y-(n.y-1.65)):999});}
  const lake=[];for(const z of [-200,-100,0,45,100,180,260]){const x=riverCenter(z);lake.push({x,z,y:terrainHeight(x,z)});}
  return{passed:maxPerimeter<-.5&&seam.every(s=>s.differenceAcrossOldBoundary<.75&&s.extendedHeight>.5)&&roots.every(s=>s.error<.015)&&roadClearance>3.1&&lowTrees.length>450&&crest.every(c=>c.error<2.5)&&lake.every(p=>p.y<-.4),maximumTerrainPerimeterHeight:maxPerimeter,seam,rootRaycasts:roots,minimumNewTreeRoadClearance:roadClearance,lowlandTreeCount:lowTrees.length,leftTrees:lowTrees.filter(t=>t.x<0).length,rightTrees:lowTrees.filter(t=>t.x>0).length,highCrests:crest,lakeBed:lake};
 });
 const replay=await page.evaluate(()=>{const a=inkLab.frame(0,{viewName:'painting',width:1000,height:600,seconds:3.5});inkLab.frame(.8,{viewName:'right',width:640,height:360,seconds:18});const b=inkLab.frame(0,{viewName:'painting',width:1000,height:600,seconds:3.5});return a===b;});
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
 const unchanged=['src/mountain-shapes.js','src/rock-form.js','src/architecture.js','src/materials.js','src/glazes.js','src/wash.js','src/effects.js','src/pavilion-flight.js'].map(file=>({file,unchanged:fs.readFileSync(path.join(root,file)).equals(execFileSync('git',['show',base+':'+file],{cwd:root}))}));
 const report={passed:structural.passed&&replay&&wind.passed&&unchanged.every(s=>s.unchanged)&&!errors.length,revision:'blue-green-07',baseCommit:base,structural,absoluteTimeReplayIdentical:replay,wind,unchanged,errors,boundary:'Targeted terrain, rooting, road and brush checks plus matched visual comparisons. No exact painting-fidelity score or exhaustive collision proof.'};fs.writeFileSync(path.join(root,'qa/lowlands-check.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));await browser.close();if(!report.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
