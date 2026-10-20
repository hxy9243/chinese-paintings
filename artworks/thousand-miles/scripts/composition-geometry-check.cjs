const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:180000});await page.waitForFunction(()=>window.inkLab?.ready,null,{timeout:180000});
  const result=await page.evaluate(async()=>{
   const T=await import('three'),{mountainForms}=await import('./src/mountain-shapes.js'),{terrainHeight,nearestRoad,bankDistance,ungradedTerrainHeight,approachRoads}=await import('./src/terrain.js'),{referenceGround,distantRidgeTraces}=await import('./src/reference-composition.js');
   inkLab.frame(0,{viewName:'painting',width:1779,height:801,seconds:9.25,wind:0});valley.model.root.updateMatrixWorld(true);
   const land=valley.model.mountains.children[0],trees=valley.model.forest.records,ray=new T.Raycaster();
   const hit=(x,z)=>{ray.set(new T.Vector3(x,500,z),new T.Vector3(0,-1,0));return ray.intersectObject(valley.model.mountains,true)[0];};
   const crest=[];
   for(const f of mountainForms)for(let j=0;j<f.nodes.length;j++){
    const n=f.nodes[j],h=hit(n.x,n.z),covered=h&&h.point.y>n.y-1.65+1.8;
    if(!h){crest.push({name:f.name,node:j,missing:true});continue;}
    const p=h.point.clone().project(valley.camera),actual=[(p.x*.5+.5)*1779,(.5-p.y*.5)*801],target=f.trace[j];
    crest.push({name:f.name,node:j,covered,errorPixels:Math.hypot(actual[0]-target[0],actual[1]-target[1])});
   }
   const exposed=crest.filter(c=>!c.covered&&!c.missing),mean=exposed.reduce((a,c)=>a+c.errorPixels,0)/exposed.length;
   const roots=trees.filter((t,i)=>i%17===0||t.ridge&&i%7===0).map(t=>{const h=hit(t.x,t.z);return{x:t.x,z:t.z,ridge:!!t.ridge,height:t.height,error:h?Math.abs(t.y-h.point.y):999};});
   const ridge=trees.filter(t=>t.ridge),high=ridge.filter(t=>t.y>28),clearance=Math.min(...trees.map(t=>{const r=nearestRoad(t.x,t.z);return r.distance-(r.road?.width??1.8)/2;}));
   // Actual displaced wind roots and normals must remain finite. Root anchors
   // are also checked in independent terrain raycasts above.
   const arrays=[];valley.model.forest.group.traverse(o=>{if(o.geometry)for(const [name,a]of Object.entries(o.geometry.attributes))arrays.push({name,finite:Array.from(a.array).every(Number.isFinite)});});
   const groveRoots=trees.filter(t=>t.row).map(t=>{const p=new T.Vector3(t.x,t.y,t.z).project(valley.camera);return{row:t.row,errorPixels:Math.hypot((p.x*.5+.5)*1779-t.referenceRoot[0],(.5-p.y*.5)*801-t.referenceRoot[1])};});
   const rowCounts=Object.fromEntries([...new Set(groveRoots.map(p=>p.row))].map(name=>[name,groveRoots.filter(p=>p.row===name).length]));
   const inletSamples=[[970,544],[1140,597],[1135,630],[1000,750],[900,790]].map(pixel=>{const q=referenceGround(pixel);return{pixel,height:terrainHeight(q.x,q.y)};});
   const roadSamples=approachRoads.flatMap(road=>road.samples.map(p=>({name:road.name,x:p.x,z:p.z,distanceFromWater:bankDistance(p.x,p.z),ungradedHeight:ungradedTerrainHeight(p.x,p.z)})));
   const distant=[];
   for(const spec of distantRidgeTraces){const mesh=valley.model.mountains.getObjectByName(spec.name);for(const target of spec.trace){const {referenceToWorld}=await import('./src/mountain-shapes.js'),q=referenceToWorld(target,spec.z);ray.set(new T.Vector3(q.x,500,q.z),new T.Vector3(0,-1,0));const h=ray.intersectObject(mesh,false)[0];if(!h){distant.push({name:spec.name,errorPixels:999});continue;}const p=h.point.project(valley.camera);distant.push({name:spec.name,errorPixels:Math.hypot((p.x*.5+.5)*1779-target[0],(.5-p.y*.5)*801-target[1])});}}
   const checks={treeRowsFollowReference:groveRoots.length>120&&Math.max(...groveRoots.map(p=>p.errorPixels))<.1,distinctGroveRows:Object.keys(rowCounts).length>=16,shoreInletsRemainOpen:inletSamples.every(s=>s.height<-.4),pathsRemainOnLand:roadSamples.every(p=>p.ungradedHeight>.15),distantContoursRegistered:distant.every(p=>p.errorPixels<2.5),noMissingCrests:crest.every(c=>!c.missing),crestRegistration:exposed.length>140&&mean<8,rootsOnMesh:roots.every(r=>r.error<.015),roadsClear:clearance>.6,highRidgesPlanted:high.length>35,openFoliageGeometry:!!valley.model.forest.group.getObjectByName('Open pointed branch-tip foliage'),finiteGeometry:arrays.every(a=>a.finite)};
   const tree=trees.filter(t=>t.roadside&&t.family==='broadleaf').sort((a,b)=>Math.abs(a.z-35)-Math.abs(b.z-35))[0];
   valley.camera.position.set(tree.x+4,tree.y+tree.height*.60,tree.z+10);valley.controls.target.set(tree.x,tree.y+tree.height*.53,tree.z);valley.camera.fov=40;valley.camera.lookAt(valley.controls.target);valley.camera.updateProjectionMatrix();valley.render();
   return{checks,rowCounts,maximumGroveRootErrorPixels:Math.max(...groveRoots.map(p=>p.errorPixels)),inletSamples,minimumUngradedPathHeight:Math.min(...roadSamples.map(p=>p.ungradedHeight)),wetPathSamples:roadSamples.filter(p=>p.ungradedHeight<.15),distantContours:distant,crest,meanExposedCrestErrorPixels:mean,exposedCrests:exposed.length,rootRaycasts:roots,minimumRoadEdgeClearance:clearance,ridgeTrees:ridge.length,highRidgeTrees:high.length,triangles:valley.metadata().triangles,treeDetail:valley.renderer.domElement.toDataURL()};
  });
  fs.writeFileSync(path.join(root,'renders/composition-study/tree-detail.png'),Buffer.from(result.treeDetail.split(',')[1],'base64'));delete result.treeDetail;
  const report={passed:Object.values(result.checks).every(Boolean)&&!errors.length,...result,errors,boundary:'Raycast registration tests the retained hand-read crest points, not silhouette similarity. Mountain feet and unseen depths are interpretations. Root and road checks cover static geometry; visual review uses the source, matched panorama, clay and reverse views.'};
  fs.writeFileSync(path.join(root,'qa/composition-geometry.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,crest:undefined,rootRaycasts:undefined,distantContours:undefined},null,2));if(!report.passed)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
