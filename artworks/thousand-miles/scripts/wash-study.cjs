const fs=require('fs'),path=require('path'),{chromium}=require('playwright');const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--enable-gpu','--ignore-gpu-blocklist','--use-angle=vulkan','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1280,height:576},deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto('http://127.0.0.1:8781/?capture=1',{waitUntil:'networkidle',timeout:120000});await page.waitForFunction(()=>inkLab.ready);
 const atlas=await page.evaluate(()=>{
  const t=inkLab.tonalBrush,images=t.maps.map(m=>m.image),pixels=images.map(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data);let violations=0,additions=[0,0];
  for(let i=0;i<pixels[0].length;i+=4)for(let j=0;j<2;j++){if(pixels[j+1][i]>pixels[j][i])violations++;if(pixels[j+1][i]<pixels[j][i])additions[j]++;}
  return{passed:violations===0&&additions.every(n=>n>10000),violations,additions,levels:t.levels,coverage:t.coverage,images:images.map(c=>c.toDataURL())};
 });atlas.images.forEach((uri,i)=>fs.writeFileSync(path.join(root,'renders',`tonal-brush-${i}.png`),Buffer.from(uri.split(',')[1],'base64')));delete atlas.images;
 const shots=[];for(const viewName of ['painting','mountains','pavilion'])for(const wash of [0,1]){
  const sample=await page.evaluate(o=>{const image=inkLab.frame(0,{viewName:o.viewName,width:1600,height:720,seconds:2,wash:o.wash});return{image,pose:valley.camera.matrixWorld.toArray()};},{viewName,wash});
  const name=`wash-${viewName}-${wash}.png`;fs.writeFileSync(path.join(root,'renders',name),Buffer.from(sample.image.split(',')[1],'base64'));shots.push({viewName,wash,name,pose:sample.pose});
 }
 const effect=await page.evaluate(async()=>{
  const pixels=[];for(const wash of [0,1]){inkLab.frame(0,{viewName:'mountains',width:960,height:432,seconds:2,wash});pixels.push(inkLab.readback().pigment);}
  let sum=0,changed=0;for(let i=0;i<pixels[0].length;i+=4){const d=Math.abs(pixels[0][i]-pixels[1][i])+Math.abs(pixels[0][i+1]-pixels[1][i+1])+Math.abs(pixels[0][i+2]-pixels[1][i+2]);sum+=d;if(d>.012)changed++;}
  inkLab.set({wash:1});return{passed:changed>5000,changedPixels:changed,meanAbsoluteLinear:sum/(960*432*3)};
 });
 const vegetation=await page.evaluate(async()=>{
  const{terrainHeight,nearestRoad}=await import('./src/terrain.js'),trees=valley.model.forest.records.filter(t=>t.mountain);let worstRoot=0,minRoad=Infinity,maxSlope=0;
  for(const t of trees){worstRoot=Math.max(worstRoot,Math.abs(t.y-terrainHeight(t.x,t.z)));minRoad=Math.min(minRoad,nearestRoad(t.x,t.z).distance);maxSlope=Math.max(maxSlope,Math.hypot(terrainHeight(t.x+.5,t.z)-terrainHeight(t.x-.5,t.z),terrainHeight(t.x,t.z+.5)-terrainHeight(t.x,t.z-.5)));}
  return{passed:trees.length>100&&worstRoot<.0001&&minRoad>=3&&maxSlope<=1.25,trees:trees.length,worstRootError:worstRoot,minRoadDistance:minRoad,maxSlope,grass:valley.model.stats.mountainGrass};
 });
 const controls=await page.evaluate(()=>{const e=document.querySelector('#wash');e.value='0';e.dispatchEvent(new Event('input'));const low=inkLab.settings.wash;e.value='1';e.dispatchEvent(new Event('input'));return{passed:low===0&&inkLab.settings.wash===1};});
 const matchedPoses=shots.every(s=>JSON.stringify(s.pose)===JSON.stringify(shots.find(q=>q.viewName===s.viewName).pose));
 const report={passed:atlas.passed&&effect.passed&&vegetation.passed&&controls.passed&&matchedPoses&&!errors.length,atlas,effect,vegetation,controls,matchedPoses,shots:shots.map(({pose,...s})=>s),errors,scope:'Verifies actual nested pixels, wash effect, mountain root placement, road clearance and controls. Visual source fidelity is reviewed separately; this is not a similarity score.'};fs.writeFileSync(path.join(root,'qa/wash-study.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();if(!report.passed)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
