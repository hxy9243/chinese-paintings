const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process'),{chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{
 const b=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']}),p=await b.newPage({viewport:{width:800,height:450}}),errors=[];
 p.on('pageerror',e=>errors.push(String(e)));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:120000});await p.waitForFunction(()=>inkLab.ready,null,{timeout:120000});
 const result=await p.evaluate(async()=>{
  const T=await import('three');
  function snap(options,position,target){
   inkLab.frame(0,{viewName:'painting',width:800,height:450,seconds:3.5,wind:0,water:0,atmosphere:0,paper:0,...options});
   valley.camera.position.set(...position);valley.controls.target.set(...target);valley.camera.fov=46;valley.camera.lookAt(valley.controls.target);valley.camera.updateProjectionMatrix();valley.render();
   const canvas=new OffscreenCanvas(800,450),g=canvas.getContext('2d');g.drawImage(valley.renderer.domElement,0,0);const rgba=g.getImageData(0,0,800,450).data;
   const half=new Uint16Array(800*450*4);valley.renderer.readRenderTargetPixels(inkLab.dataTarget,0,0,800,450,half);
   return{rgba,data:inkLab.readback(),categories:Array.from({length:800*450},(_,i)=>T.DataUtils.fromHalfFloat(half[i*4+3]))};
  }
  const index=i=>((449-Math.floor(i/800))*800+i%800)*4;
  const treePos=[-68,11,123],treeAim=[-70,6,99],a=snap({foliage:0},treePos,treeAim),c=snap({foliage:.9},treePos,treeAim);
  let treePixels=0,treeDifference=0,sum=[0,0],square=[0,0];
  for(let i=0;i<800*450;i++){if(Math.abs(c.categories[i]-.2)>.001||c.data.world[i*4+1]<6)continue;treePixels++;const j=i*4;
   for(let k=0;k<3;k++)treeDifference+=Math.abs(a.data.pigment[j+k]-c.data.pigment[j+k]);
   for(const [n,s]of [[0,a],[1,c]]){const ratio=s.data.pigment[j]/Math.max(.001,s.data.pigment[j+1]);sum[n]+=ratio;square[n]+=ratio*ratio;}
  }
  const foliage={passed:treePixels>500&&treeDifference/(treePixels*3)>.001,pixels:treePixels,meanPigmentChangeLinear:treeDifference/(treePixels*3),redGreenRatioStd:[0,1].map(n=>Math.sqrt(Math.max(0,square[n]/treePixels-(sum[n]/treePixels)**2)))};
  const shorePos=[-32,7.8,126],shoreAim=[-49,1,96],dry=snap({foliage:.9,shore:0},shorePos,shoreAim),wet=snap({foliage:.9,shore:1},shorePos,shoreAim);
  let changed=0,changedProtected=0;for(let i=0;i<800*450;i++){
   const j=index(i),delta=Math.max(...[0,1,2].map(k=>Math.abs(dry.rgba[j+k]-wet.rgba[j+k])));if(delta<2)continue;changed++;
   const cat=wet.categories[i];if(Math.abs(cat-.2)<.001||Math.abs(cat-.3)<.001||Math.abs(cat-.4)<.001)changedProtected++;
  }
  const shore={passed:changed>100&&changedProtected===0,changedPixels:changed,changedPureTreeBarkOrArchitecturePixels:changedProtected,scope:'Classified foliage, bark and architecture pixels must be identical when only shore diffusion changes.'};
  const waterPos=[8,10,112],waterAim=[8,0,-40],flow0=snap({seconds:0,water:.8},waterPos,waterAim),flow4=snap({seconds:4,water:.8},waterPos,waterAim),still0=snap({seconds:0,water:0},waterPos,waterAim),still4=snap({seconds:4,water:0},waterPos,waterAim);
  let moving=0,frozen=0,count=0;for(let i=0;i<800*450;i++)if(Math.abs(flow0.categories[i]-.5)<.001){count++;for(let k=0;k<3;k++){const j=i*4+k;moving+=Math.abs(flow0.data.pigment[j]-flow4.data.pigment[j]);frozen+=Math.abs(still0.data.pigment[j]-still4.data.pigment[j]);}}
  const water={passed:count>1000&&moving/(count*3)>.0005&&frozen===0,pixels:count,movingMeanPigmentDifference:moving/(count*3),frozenMeanPigmentDifference:frozen/(count*3)};
  const first=inkLab.frame(0,{viewName:'painting',width:800,height:450,seconds:18,water:.8,wind:.55,atmosphere:.9,paper:1,foliage:.9,shore:1});inkLab.frame(.8,{viewName:'right',seconds:31});const repeat=inkLab.frame(0,{viewName:'painting',width:800,height:450,seconds:18});
  return{foliage,shore,water,absoluteTimeReplayIdentical:first===repeat,finitePigment:inkLab.readback().pigment.every(Number.isFinite)};
 });
 const unchanged=['src/terrain.js','src/forest.js','src/lowlands.js','src/mountain-shapes.js','src/rock-form.js','src/architecture.js','src/materials.js','src/wash.js'].map(file=>({file,unchanged:fs.readFileSync(path.join(root,file)).equals(execFileSync('git',['show','102474a:'+file],{cwd:root}))}));
 const report={passed:result.foliage.passed&&result.shore.passed&&result.water.passed&&result.absoluteTimeReplayIdentical&&result.finitePigment&&unchanged.every(s=>s.unchanged)&&!errors.length,...result,unchanged,errors,boundary:'Feature isolation and visible-surface checks; artistic acceptance also uses matched images and encoded film frames.'};fs.writeFileSync(path.join(root,'qa/orbit-style.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await b.close();if(!report.passed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
