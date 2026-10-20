const fs=require('fs'),path=require('path'),os=require('os'),http=require('http'),crypto=require('crypto');
const{execFileSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),previous='1371ddf282363e466eeaa0b676fc631b49261be4';
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mineral-before-'));let server,browser;
 try{
  const bytes=execFileSync('git',['archive',previous,'index.html','src','vendor','reference/source.png'],{cwd:root,maxBuffer:32*1024*1024});execFileSync('tar',['-xf','-','-C',dir],{input:bytes});
  server=http.createServer((req,res)=>{const file=path.resolve(dir,'.'+new URL(req.url,'http://localhost').pathname.replace(/\/$/,'/index.html'));if(!file.startsWith(dir+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}const ext=path.extname(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.png':'image/png','.json':'application/json'})[ext]||'application/octet-stream');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']});
  const current=await browser.newPage({viewport:{width:1280,height:576}}),old=await browser.newPage({viewport:{width:1280,height:576}}),errors=[];for(const p of[current,old])p.on('pageerror',e=>errors.push(String(e)));
  await current.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:120000});await current.waitForFunction(()=>inkLab?.ready);
  const views=await current.evaluate(()=>valley.views);
  await old.goto(`http://127.0.0.1:${server.address().port}/?capture=1`,{waitUntil:'networkidle',timeout:120000});await old.waitForFunction(()=>inkLab?.ready);
  const pairs=[];
  for(const name of['painting','arch','mountains','pavilion']){
   const pose=views[name],pair={name,pose,width:1280,height:576,seconds:2};
   for(const[label,page]of[['before',old],['after',current]]){
    const uri=await page.evaluate(({pose})=>{inkLab.frame(0,{viewName:'painting',width:1280,height:576,seconds:2});valley.camera.position.set(...pose.position);valley.controls.target.set(...pose.target);valley.camera.fov=pose.fov;valley.camera.lookAt(valley.controls.target);valley.camera.updateProjectionMatrix();valley.render();return valley.renderer.domElement.toDataURL();},{pose});
    const bytes=Buffer.from(uri.split(',')[1],'base64'),file=`qa/revision-${label}-${name}.png`;fs.writeFileSync(path.join(root,file),bytes);pair[label]={file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
    if(['painting','mountains'].includes(name)){
     const clay=await page.evaluate(async({pose})=>{
      const T=await import('three');inkLab.frame(0,{viewName:'painting',width:1280,height:576,seconds:2,clayMode:true});
      valley.camera.position.set(...pose.position);valley.controls.target.set(...pose.target);valley.camera.fov=pose.fov;valley.camera.lookAt(valley.controls.target);valley.camera.updateProjectionMatrix();
      const scene=valley.scene,flags=[],materials=[],fog=scene.fog,bg=scene.background;
      scene.traverse(o=>{if(o.isLight||['Distant atmospheric sky','Olive-gold silk sky wash'].includes(o.name)){flags.push([o,o.visible]);o.visible=false;}});
      const mat=new T.MeshStandardMaterial({color:'#969696',roughness:1,side:T.DoubleSide});mat.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','');};
      valley.model.root.traverse(o=>{if(o.isMesh){materials.push([o,o.material]);o.material=mat;}});
      const hemi=new T.HemisphereLight('#ffffff','#77777d',.9),key=new T.DirectionalLight('#ffffff',1.8);key.position.set(-55,95,80);scene.add(hemi,key);scene.fog=null;scene.background=new T.Color('#bdbdbd');
      valley.renderer.render(scene,valley.camera);const image=valley.renderer.domElement.toDataURL();
      scene.remove(hemi,key);for(const[o,v]of flags)o.visible=v;for(const[o,m]of materials)o.material=m;scene.fog=fog;scene.background=bg;mat.dispose();return image;
     },{pose});
     const file=`qa/revision-${label}-${name}-clay.png`,bytes=Buffer.from(clay.split(',')[1],'base64');fs.writeFileSync(path.join(root,file),bytes);pair[label+'Clay']={file,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
    }
   }pairs.push(pair);
  }
  const report={passed:!errors.length,previousCommit:previous,method:'Fresh rendering of previous committed source and current source at identical camera poses, viewport and fixed environmental time. Visual comparison is separate from structural acceptance.',pairs,errors};fs.writeFileSync(path.join(root,'qa/revision-comparison.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,pairs:pairs.length,errors}));if(errors.length)process.exitCode=1;
 }finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
