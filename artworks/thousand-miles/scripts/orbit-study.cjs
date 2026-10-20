const fs=require('fs'),path=require('path'),{chromium}=require('playwright');const root=path.resolve(__dirname,'..'),phase=process.argv[2]||'after';
if(!['before','after'].includes(phase))throw Error('Choose before or after');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:1600,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>inkLab.ready,null,{timeout:120000});
 fs.mkdirSync(path.join(root,`renders/orbit-${phase}`),{recursive:true});const shots=[];
 for(const [name,position,target,fov]of [['painting',null,null,32],['trees',[-68,11,123],[-70,6,99],46],['shore',[-32,7.8,126],[-49,1,96],45],['water',[8,10,112],[8,0,-40],46]]){
  const uri=await page.evaluate(({position,target,fov})=>{inkLab.frame(0,{viewName:'painting',width:1600,height:720,seconds:3.5});if(position){valley.camera.position.set(...position);valley.controls.target.set(...target);valley.camera.fov=fov;valley.camera.lookAt(valley.controls.target);valley.camera.updateProjectionMatrix();valley.render();}return valley.renderer.domElement.toDataURL();},{position,target,fov});
  const file=`renders/orbit-${phase}/${name}.png`;fs.writeFileSync(path.join(root,file),Buffer.from(uri.split(',')[1],'base64'));shots.push(file);
 }
 fs.writeFileSync(path.join(root,`qa/orbit-${phase}.json`),JSON.stringify({passed:!errors.length,phase,shots,errors,scene:await page.evaluate(()=>valley.metadata()),ink:await page.evaluate(()=>inkLab.metadata())},null,2));await browser.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
