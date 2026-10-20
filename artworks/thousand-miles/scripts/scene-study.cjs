const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 try{
  await page.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>window.inkLab?.ready,null,{timeout:120000});
  const geometry=await page.evaluate(async()=>{
   const T=await import('three'),v=valley,b=v.model.bridge,h=b.hall,mid=b.point(b.group.userData.pavilionFraction),floor=h.localToWorld(new T.Vector3(0,.195,0));
   const deckHeights=Array.from({length:401},(_,i)=>b.point(i/400).y),highestDeck=Math.max(...deckHeights),crownRise=mid.y-Math.max(deckHeights[0],deckHeights.at(-1));
   const crownError=Math.abs(highestDeck-mid.y),rampMonotonic=deckHeights.every((y,i)=>!i||(i<=Math.round(b.group.userData.pavilionFraction*400)?y>=deckHeights[i-1]-1e-6:y<=deckHeights[i-1]+1e-6));
   const floorRay=new T.Raycaster(floor.clone().add(new T.Vector3(0,1.2,0)),new T.Vector3(0,-1,0),0,2),floorHit=floorRay.intersectObject(b.group,true)[0];
   const actualFloorError=floorHit?Math.abs(floorHit.point.y-floor.y):100;
   const foundationBounds=new T.Box3().setFromObject(h);
   const centerError=Math.hypot(h.position.x-mid.x,h.position.z-mid.z),deckError=Math.abs(floor.y-mid.y-.08),roadConnections=[];
   for(let k=0;k<2;k++){
    const mesh=v.model.roads.group.children[k],pos=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal,start=new T.Vector3().fromBufferAttribute(pos,2),end=b.point(k===0?0:1);end.y+=.08;
    let maxStep=0;for(let i=5;i<pos.count;i+=5)maxStep=Math.max(maxStep,Math.abs(pos.getY(i)-pos.getY(i-5)));
    roadConnections.push({name:mesh.name,bridgeGap:start.distanceTo(end),roadVertices:pos.count,upwardNormal:normal.getY(2),maximumRowHeightStep:maxStep});
   }
   const {nearestRoad}=await import('./src/terrain.js'),verge=v.model.forest.records.filter(t=>t.roadside),minimumTrunkClearance=Math.min(...v.model.forest.records.map(t=>nearestRoad(t.x,t.z).distance));
   const target=new T.WebGLRenderTarget(512,512),scene=new T.Scene(),copy=h.clone(true);copy.position.set(0,0,0);copy.rotation.set(0,0,0);scene.add(copy);scene.background=new T.Color(0,0,0);scene.overrideMaterial=new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide,toneMapped:false});
   const camera=new T.OrthographicCamera(-8,8,8,-8,.1,100),symmetry=[];let frontImage;
   for(const side of ['front','side']){
    camera.position.set(side==='front'?0:30,-1.6,side==='front'?30:0);camera.lookAt(0,-1.6,0);v.renderer.setRenderTarget(target);v.renderer.render(scene,camera);
    const pixels=new Uint8Array(512*512*4);v.renderer.readRenderTargetPixels(target,0,0,512,512,pixels);let union=0,both=0,mismatch=0;
    for(let y=0;y<512;y++)for(let x=0;x<512;x++){const a=pixels[(y*512+x)*4]>128,b=pixels[(y*512+511-x)*4]>128;if(a||b)union++;if(a&&b)both++;if(a!==b)mismatch++;}
    symmetry.push({view:side,silhouetteMirrorIoU:both/union,mismatchPixels:mismatch});
    if(side==='front'){
     const c=new OffscreenCanvas(512,512),g=c.getContext('2d'),im=g.createImageData(512,512);
     for(let y=0;y<512;y++)im.data.set(pixels.subarray((511-y)*512*4,(512-y)*512*4),y*512*4);g.putImageData(im,0,0);const blob=await c.convertToBlob({type:'image/png'}),bytes=new Uint8Array(await blob.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));frontImage=btoa(s);
    }
   }
   v.renderer.setRenderTarget(null);target.dispose();scene.overrideMaterial.dispose();v.render();
   return{crownFraction:b.group.userData.pavilionFraction,highestDeck,crownRise,crownError,rampMonotonic,actualFloorError,foundationMinimumWorldY:foundationBounds.min.y,deckHeights,centerError,deckError,roadConnections,roadsideTrees:verge.length,minimumTrunkClearance,symmetry,frontImage};
  });
  fs.writeFileSync(path.join(root,'renders/pavilion-symmetry.png'),Buffer.from(geometry.frontImage,'base64'));delete geometry.frontImage;
  const fog=await page.evaluate(async()=>{
   const shots=[],images=[];let world;
   for(const [name,seconds,atmosphere]of [['off',0,0],['0',0,.90],['12',12,.90],['24',24,.90]]){
    const uri=inkLab.frame(0,{viewName:'mist',width:960,height:432,seconds,atmosphere,wind:0,water:0});
    const bitmap=await createImageBitmap(await(await fetch(uri)).blob()),c=new OffscreenCanvas(960,432),g=c.getContext('2d');g.drawImage(bitmap,0,0);images.push(g.getImageData(0,0,960,432).data);
    if(!world)world=inkLab.readback().world;shots.push({name,image:uri});
   }
   let far=0,near=0,farFog=0,nearFog=0,moving=0,change=0;
   for(let y=0;y<432;y++)for(let x=0;x<960;x++){
    const w=((431-y)*960+x)*4,i=(y*960+x)*4;if(world[w+3]<.5)continue;
    const isFar=world[w+2]<-115&&world[w+1]<35,isNear=world[w+2]>-20;let fogDifference=0,motionDifference=0;
    for(let k=0;k<3;k++){fogDifference+=Math.abs(images[0][i+k]-images[1][i+k])/3;motionDifference+=Math.abs(images[1][i+k]-images[3][i+k])/3;}
    if(isFar){far++;farFog+=fogDifference;change+=motionDifference;if(motionDifference>1)moving++;}if(isNear){near++;nearFog+=fogDifference;}
   }
   return{farPixels:far,nearPixels:near,farFogMeanDifference:farFog/far,nearFogMeanDifference:near?nearFog/near:0,farMotionMeanDifference:change/far,changedFarFraction:moving/far,shots};
  });
  for(const shot of fog.shots)fs.writeFileSync(path.join(root,'renders','fog-'+shot.name+'.png'),Buffer.from(shot.image.split(',')[1],'base64'));delete fog.shots;
  const report={passed:!errors.length&&geometry.centerError<1e-6&&geometry.deckError<1e-6&&geometry.crownError<1e-6&&geometry.crownRise>5&&geometry.rampMonotonic&&geometry.actualFloorError<1e-5&&geometry.foundationMinimumWorldY< -1&&geometry.symmetry.every(s=>s.silhouetteMirrorIoU>.995)&&geometry.roadConnections.every(r=>r.bridgeGap<1e-4&&r.upwardNormal>.8)&&geometry.roadsideTrees>15&&geometry.minimumTrunkClearance>2.3&&fog.farPixels>10000&&fog.farFogMeanDifference>1&&fog.farMotionMeanDifference>.05&&fog.changedFarFraction>.01,errors,geometry,fog,boundary:'Symmetry uses actual geometry silhouettes. Fog metrics use distant depth-masked lake and rock pixels with wind and water disabled; they do not measure exact source-painting similarity.'};
  fs.writeFileSync(path.join(root,'qa/scene-study.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
