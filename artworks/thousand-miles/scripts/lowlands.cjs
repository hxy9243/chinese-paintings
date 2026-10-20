const fs=require('fs'),path=require('path'),crypto=require('crypto'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),phase=process.argv[2]||'after';
if(!['before','after'].includes(phase))throw Error('Choose before or after');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>inkLab.ready,null,{timeout:120000});
 await page.evaluate(async()=>{const {createPavilionFlight}=await import('./src/pavilion-flight.js');window.lowlandFlight=createPavilionFlight(valley.model.bridge.hall.position);valley.camera.far=2200;inkLab.post.uniforms.farPlane.value=2200;});
 const shots=[];
 for(const [name,seconds,position,target]of [['panorama',0],['pavilion',14],['side-pass',20],['pullback',24],['left-bank',2,[-110,23,146],[-90,5,35]],['right-bank',2,[128,27,132],[91,4,14]],['foreground',2,[0,58,265],[0,2,110]]]){
  for(const clayMode of [false,true]){
   const uri=await page.evaluate(({seconds,position,target,clayMode})=>{inkLab.frame(0,{viewName:'painting',width:1600,height:900,clayMode,seconds});const pose=lowlandFlight.sample(seconds);valley.camera.position.set(...(position||pose.position));valley.controls.target.set(...(target||pose.target));valley.camera.fov=position?46:pose.fov;valley.camera.lookAt(valley.controls.target);valley.camera.updateProjectionMatrix();valley.render();return valley.renderer.domElement.toDataURL();},{seconds,position,target,clayMode});
   const file=`renders/lowlands-${phase}/${name}${clayMode?'-clay':''}.png`;fs.writeFileSync(path.join(root,file),Buffer.from(uri.split(',')[1],'base64'));shots.push(file);
  }
 }
 const metadata=await page.evaluate(()=>valley.metadata());fs.writeFileSync(path.join(root,`qa/lowlands-${phase}.json`),JSON.stringify({passed:!errors.length,phase,errors,shots,metadata},null,2));
 console.log(JSON.stringify({phase,stats:metadata.stats,errors,shots},null,2));await browser.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
