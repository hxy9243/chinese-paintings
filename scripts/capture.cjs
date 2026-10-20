const fs=require('fs'),path=require('path'),{chromium}=require('playwright');const root=path.resolve(__dirname,'..'),kind=process.argv[2]||'stills';
(async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>{errors.push(String(e));console.error(e)});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text().slice(0,2200));}});await page.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>inkLab.ready,null,{timeout:120000});
async function snap(name,opts){const uri=await page.evaluate(o=>inkLab.frame(o.t||0,o),opts);fs.writeFileSync(path.join(root,'renders',name),Buffer.from(uri.split(',')[1],'base64'));console.log(name);}
if(kind==='pilot'){for(const viewName of ['painting','arch','mountains','pavilion'])await snap(viewName+'.png',{viewName,width:1600,height:720,seconds:2});
}else if(kind==='stills'){
 for(const viewName of ['painting','bridge','arch','pavilion','entry','gallery','left','right','mountains','mist','lake'])await snap(viewName+'.png',{viewName,width:1600,height:720,seconds:2});
 await snap('painting-3d.png',{viewName:'painting',width:1600,height:720,mode:'original',seconds:2});await snap('painting-clay.png',{viewName:'painting',width:1600,height:720,clayMode:true,seconds:2});await page.evaluate(()=>{inkLab.frame(0,{viewName:'painting',width:1440,height:900});});await page.screenshot({path:path.join(root,'renders/viewer.png')});
}else if(kind==='detail'){
 for(const viewName of ['bridge','mountains'])for(const factor of [1,.78,.57]){
  const uri=await page.evaluate(o=>{inkLab.frame(0,{viewName:o.viewName,width:1280,height:720,seconds:2});valley.camera.position.lerp(valley.controls.target,1-o.factor);valley.camera.lookAt(valley.controls.target);valley.render();return valley.renderer.domElement.toDataURL();},{viewName,factor});fs.writeFileSync(path.join(root,'renders',`${viewName}-zoom-${factor}.png`),Buffer.from(uri.split(',')[1],'base64'));
 }
}else if(kind==='preview'){
 for(let i=0;i<=20;i++)await snap('preview-'+String(i).padStart(2,'0')+'.png',{t:i/20,width:960,height:432});
}else if(kind==='export'){
 for(const part of ['all','bridge','architecture','mountains','water','trees']){const encoded=await page.evaluate(async part=>{const data=await valley.exportModel(part),bytes=new Uint8Array(data);let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(s);},part);fs.writeFileSync(path.join(root,'models',`blue-green-${part}.glb`),Buffer.from(encoded,'base64'));console.log('Exported '+part);}
}else if(kind==='fog'){
 fs.mkdirSync(path.join(root,'renders/fog-frames'),{recursive:true});for(let i=0;i<144;i++){const uri=await page.evaluate(i=>inkLab.frame(0,{viewName:'mist',width:1280,height:576,seconds:i/12,wind:0,water:0}),i);fs.writeFileSync(path.join(root,'renders/fog-frames',String(i).padStart(4,'0')+'.png'),Buffer.from(uri.split(',')[1],'base64'));if(i%48===0)console.log(i+'/144 fog frames');}
}else if(kind==='motion'){
 const startFrame=Number(process.argv[3]||0);if(!Number.isInteger(startFrame)||startFrame<0||startFrame>=480)throw Error('Start frame must be an integer from 0 to 479');
 fs.mkdirSync(path.join(root,'renders/frames'),{recursive:true});for(let i=startFrame;i<480;i++){const uri=await page.evaluate(i=>inkLab.frame(i/479,{width:1280,height:576}),i);fs.writeFileSync(path.join(root,'renders/frames',String(i).padStart(4,'0')+'.png'),Buffer.from(uri.split(',')[1],'base64'));if(i%48===0)console.log(i+'/480');}
}
const metadata=await page.evaluate(()=>({scene:valley.metadata(),ink:inkLab.metadata()}));fs.writeFileSync(path.join(root,'qa',`capture-${kind}.json`),JSON.stringify({errors,...metadata},null,2));await browser.close();if(errors.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
