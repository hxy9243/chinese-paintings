const fs=require('fs'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),directory=path.join(root,'qa/runtime/brush-study'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');fs.mkdirSync(directory,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:720},deviceScaleFactor:1}),errors=[],shots=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  await page.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:180000});await page.waitForFunction(()=>window.inkLab?.ready,null,{timeout:180000});
  const styles=[{name:'established',foldBrush:0,mineralStudy:0},{name:'folds',foldBrush:1,mineralStudy:0},{name:'minerals',foldBrush:0,mineralStudy:1},{name:'combined',foldBrush:1,mineralStudy:1}];
  for(const view of ['painting','mountains','pavilion','back'])for(const style of styles){
   const shot=await page.evaluate(async({view,style})=>{
    const width=1600,height=720;inkLab.frame(0,{viewName:view==='back'?'mountains':view,width,height,seconds:9.25,foldBrush:style.foldBrush,mineralStudy:style.mineralStudy});
    if(view==='back'){valley.camera.position.set(-75,35,-110);valley.controls.target.set(-70,24,-25);valley.camera.fov=46;valley.camera.lookAt(valley.controls.target);valley.camera.updateProjectionMatrix();valley.render();}
    const canvas=new OffscreenCanvas(width,height),ctx=canvas.getContext('2d');ctx.drawImage(valley.renderer.domElement,0,0);const rgba=ctx.getImageData(0,0,width,height).data;
    const T=await import('three'),half=new Uint16Array(width*height*4);valley.renderer.readRenderTargetPixels(inkLab.dataTarget,0,0,width,height,half);
    const categories=new Float32Array(width*height);for(let i=0;i<categories.length;i++){const screen=(height-1-Math.floor(i/width))*width+i%width;categories[screen]=T.DataUtils.fromHalfFloat(half[i*4+3]);}
    window.studyReferences??={};if(style.name==='established')studyReferences[view]={rgba,categories};
    const baseline=studyReferences[view];let changed=0,total=0,maximum=0,protectedPixels=0,protectedChanged=0,protectedMaximum=0;
    for(let y=2;y<height-2;y++)for(let x=2;x<width-2;x++){
     const i=y*width+x,j=i*4,delta=Math.max(...[0,1,2].map(k=>Math.abs(rgba[j+k]-baseline.rgba[j+k])));maximum=Math.max(maximum,delta);total+=delta;if(delta>1)changed++;
     const cat=categories[i];if(cat<.16||cat>.58)continue;
     let same=true;for(let dy=-2;dy<=2&&same;dy++)for(let dx=-2;dx<=2;dx++)if(Math.abs(categories[i+dy*width+dx]-cat)>.001){same=false;break;}if(!same)continue;
     protectedPixels++;protectedMaximum=Math.max(protectedMaximum,delta);if(delta>1)protectedChanged++;
    }
    const pigment=new Uint16Array(width*height*4);valley.renderer.readRenderTargetPixels(inkLab.inkTarget,0,0,width,height,pigment);let nonFinite=0;for(const value of pigment)if((value&0x7c00)===0x7c00)nonFinite++;
    return{view,style:style.name,uri:valley.renderer.domElement.toDataURL(),changedPixels:changed,meanMaximumChannelDifference:total/((width-4)*(height-4)),maximumChannelDifference:maximum,protectedInteriorPixels:protectedPixels,changedProtectedInteriorPixels:protectedChanged,maximumProtectedInteriorDifference:protectedMaximum,nonFinitePigmentValues:nonFinite,passes:inkLab.metadata().passes,camera:valley.camera.matrixWorld.toArray()};
   },{view,style});
   const bytes=Buffer.from(shot.uri.split(',')[1],'base64');delete shot.uri;shot.sha256=hash(bytes);shot.file=`qa/runtime/brush-study/${view}-${style.name}.png`;fs.writeFileSync(path.join(root,shot.file),bytes);shots.push(shot);console.log(JSON.stringify({...shot,camera:undefined}));
  }
  const replay=await page.evaluate(()=>{const a=inkLab.frame(0,{viewName:'mountains',width:1000,height:450,seconds:12,foldBrush:1,mineralStudy:1});inkLab.frame(.8,{viewName:'pavilion',seconds:31});const b=inkLab.frame(0,{viewName:'mountains',width:1000,height:450,seconds:12});return{identical:a===b,passes:inkLab.metadata().passes};});
  await page.locator('#brushStudy summary').click();await page.locator('#foldBrush').check();await page.locator('#mineralStudy').check();
  const controlsOn=await page.evaluate(()=>({foldBrush:inkLab.settings.foldBrush,mineralStudy:inkLab.settings.mineralStudy}));await page.locator('#foldBrush').uncheck();await page.locator('#mineralStudy').uncheck();const controlsOff=await page.evaluate(()=>({foldBrush:inkLab.settings.foldBrush,mineralStudy:inkLab.settings.mineralStudy}));
  const sourceFiles=['src/terrain.js','src/forest.js','src/lowlands.js','src/rock-form.js','src/mountain-shapes.js','src/architecture.js','src/geometry.js','src/scene.js'];
  const geometry=sourceFiles.map(file=>({file,unchanged:fs.readFileSync(path.join(root,file)).equals(execFileSync('git',['show','77abff0:'+file],{cwd:root}))}));
  const speed=JSON.parse(fs.readFileSync(path.join(root,'qa/render-speed.json'))),defaultMatch=['painting','pavilion'].map(view=>({view,identical:shots.find(s=>s.view===view&&s.style==='established').sha256===speed.measurements.find(s=>s.view===view&&!s.baseline).sha256}));
  const checks={defaultMatchesCommittedSpeedRenderer:defaultMatch.every(r=>r.identical),geometryUnchanged:geometry.every(r=>r.unchanged),controlsIndependent:controlsOn.foldBrush===1&&controlsOn.mineralStudy===1&&controlsOff.foldBrush===0&&controlsOff.mineralStudy===0,eachStudyChangesMountainView:['folds','minerals','combined'].every(style=>shots.find(s=>s.view==='mountains'&&s.style===style).changedPixels>1000),repeatable:replay.identical,finite:shots.every(s=>s.nonFinitePigmentValues===0),threePasses:shots.every(s=>s.passes===3),protectedSurfaceInteriors:shots.every(s=>s.changedProtectedInteriorPixels===0)};
  const report={passed:Object.values(checks).every(Boolean)&&!errors.length,checks,defaultMatch,geometry,replay,controlsOn,controlsOff,shots,errors,scope:'An optional appearance experiment, off by default. Mountain marks use the existing signed ridge coordinate; this is not a full curvature-aligned parameterization. Mineral glazes affect mountain surfaces. Protected interior pixels are eroded by two pixels to exclude mixed edge coverage and legitimate neighboring pigment filtering. Geometry and render-pass count stay unchanged. Visual preference is judged from the matched gallery, not these checks.'};
  fs.writeFileSync(path.join(root,'qa/brush-study.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks,errors},null,2));if(!report.passed)process.exitCode=1;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
