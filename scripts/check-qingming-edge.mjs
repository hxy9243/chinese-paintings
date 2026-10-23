import {chromium} from '../artworks/qingming/node_modules/playwright/index.mjs';
import {createServer} from '../artworks/qingming/node_modules/vite/dist/node/index.js';
import fs from 'node:fs';
const out='docs/reviews/2026-10-22-reconstruction';fs.mkdirSync(out,{recursive:true});
const server=await createServer({root:'artworks/qingming',server:{host:'127.0.0.1',port:4192,strictPort:true}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE??(fs.existsSync('/tmp/chromium')?'/tmp/chromium':undefined),headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-zygote','--single-process']});
try{
 const page=await browser.newPage();await page.goto('http://127.0.0.1:4192/');
 const data=await page.evaluate(async()=>{
  const THREE=await import('/node_modules/three/build/three.module.js');
  const {paintMaterial,createDryInk}=await import('/src/paintMaterial.ts');
  const {scrollPoint}=await import('/src/scrollLayout.ts');
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false});renderer.setSize(128,128);renderer.setClearColor(0,0);
  const target=new THREE.WebGLRenderTarget(128,128),scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,100);
  const box=new THREE.Mesh(new THREE.BoxGeometry(.5,.8,.5),paintMaterial(0x222222));box.add(new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry),createDryInk()));scene.add(box);
  const pixels=new Uint8Array(128*128*4),results=[];
  for(const [s,d] of [[0,22],[0,25],[0,27],[0,30],[37,0],[41,0],[-61,0]]){
   const p=scrollPoint(s,d);box.position.copy(p);camera.position.copy(p).add(new THREE.Vector3(0,5,5));camera.lookAt(p);camera.updateMatrixWorld();
   renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.readRenderTargetPixels(target,0,0,128,128,pixels);
   let alpha=0,nonzero=0;for(let i=3;i<pixels.length;i+=4){alpha+=pixels[i];if(pixels[i])nonzero++;}results.push({s,d,alpha,nonzero});
  }return results;
 });
 if(data[0].alpha<=data[1].alpha||data[1].alpha<=data[2].alpha||data.filter(p=>Math.abs(p.d)>=30||p.s>=41||p.s<=-61).some(p=>p.nonzero))throw new Error('Edge rendering failed '+JSON.stringify(data));
 fs.writeFileSync(out+'/edge-gpu-check.json',JSON.stringify(data,null,2));console.log(JSON.stringify(data));
}finally{await browser.close();await server.close();}
