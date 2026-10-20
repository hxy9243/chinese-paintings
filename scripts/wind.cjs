const fs=require('fs'),path=require('path'),{chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{const b=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan']});const p=await b.newPage({viewport:{width:640,height:400}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle'});await p.waitForFunction(()=>inkLab.ready);
const poses=JSON.parse(fs.readFileSync(path.join(root,'qa/refinement.json'))).shots.filter(s=>s.name.startsWith('trees-'));
const anchoring=await p.evaluate(poses=>{
 const samples=[];
 for(const pose of poses){
 inkLab.set({wind:1.1,water:0,atmosphere:0,mist:0,paper:0,lines:0});
 function sample(seconds){inkLab.frame(0,{viewName:'left',width:640,height:400,seconds});valley.camera.position.set(...pose.position);valley.controls.target.set(...pose.target);valley.camera.lookAt(valley.controls.target);valley.camera.fov=46;valley.camera.updateProjectionMatrix();valley.render();return inkLab.readback(true);}
 const a=sample(0),b=sample(3.5),w=a.width,h=a.height;
 let matches=0,changed=0,total=0,square=0,abs=0,maximumShift=0,finite=true;
 for(let i=0;i<a.pigment.length;i++)if(!Number.isFinite(a.pigment[i])||!Number.isFinite(b.pigment[i]))finite=false;
 for(let y=13;y<h-13;y+=4)for(let x=13;x<w-13;x+=4){const i=(y*w+x)*4;if(a.world[i+3]<.5)continue;total++;
  let best=1e10,at=-1,bx=0,by=0;
  for(let yy=y-10;yy<=y+10;yy++)for(let xx=x-10;xx<=x+10;xx++){
   const j=(yy*w+xx)*4;if(b.world[j+3]<.5)continue;
   const dx=b.rest[j]-a.rest[i],dy=b.rest[j+1]-a.rest[i+1],dz=b.rest[j+2]-a.rest[i+2],err=dx*dx+dy*dy+dz*dz;
   if(err<best){best=err;at=j;bx=xx;by=yy;}
  }
  if(best>.0025||at<0)continue;
  const shift=Math.hypot(bx-x,by-y);maximumShift=Math.max(maximumShift,shift);
  if(shift<1)continue;changed++;matches++;
  for(let c=0;c<3;c++){const d=a.pigment[i+c]-b.pigment[at+c];abs+=Math.abs(d);square+=d*d;}
 }
 samples.push({view:pose.name,finite,totalCandidates:total,movingSurfaceMatches:matches,maximumMatchedShiftPixels:maximumShift,maeLinear:abs/(matches*3),rmseLinear:Math.sqrt(square/(matches*3))});
 }
 const matches=samples.reduce((sum,s)=>sum+s.movingSurfaceMatches,0);
 return{finite:samples.every(s=>s.finite),totalCandidates:samples.reduce((sum,s)=>sum+s.totalCandidates,0),movingSurfaceMatches:matches,maximumMatchedShiftPixels:Math.max(...samples.map(s=>s.maximumMatchedShiftPixels)),maeLinear:samples.reduce((sum,s)=>sum+s.maeLinear*s.movingSurfaceMatches,0)/matches,rmseLinear:Math.sqrt(samples.reduce((sum,s)=>sum+s.rmseLinear*s.rmseLinear*s.movingSurfaceMatches,0)/matches),samples,method:'At three close grove views, match actual rasterized undeformed 3D positions between wind phases; reject matches beyond 5 cm and stationary pixels; compare the pigment layer before paper, contours and atmosphere.'};
},poses);
const result={passed:!errors.length&&anchoring.finite&&anchoring.movingSurfaceMatches>150&&anchoring.samples.every(s=>s.movingSurfaceMatches>10&&s.rmseLinear<.05)&&anchoring.rmseLinear<.05,errors,...anchoring};fs.writeFileSync(path.join(root,'qa/wind-attachment.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await b.close();if(!result.passed)process.exit(1);})().catch(e=>{console.error(e);process.exit(1)});