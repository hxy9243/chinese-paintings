import {chromium} from '../artworks/qingming/node_modules/playwright/index.mjs';
import {createServer} from '../artworks/qingming/node_modules/vite/dist/node/index.js';
import {createRequire} from 'node:module';const require=createRequire(new URL('../artworks/qingming/package.json',import.meta.url));const sharp=require('sharp');
import fs from 'node:fs';
import crypto from 'node:crypto';
const out='docs/style-lab';fs.mkdirSync(out,{recursive:true});
const server=await createServer({root:'artworks/qingming',server:{host:'127.0.0.1',port:4191,strictPort:true}});await server.listen();
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1200,height:850},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const records=[];
try{await page.goto('http://127.0.0.1:4191/style-lab.html');await page.waitForFunction(()=>window.styleLab);
for(const style of ['baseline','fine','ink','mineral']){
 for(const angle of [-30,0,30]){
  const start=performance.now();const meta=await page.evaluate(({style,angle})=>window.styleLab.frame(style,angle),{style,angle});
  const file=`${out}/${style}-${angle}.png`;await page.locator('canvas').screenshot({path:file});
  const geometryHash=crypto.createHash('sha256').update(JSON.stringify(meta.geometry)).digest('hex');delete meta.geometry;
  records.push({...meta,geometryHash,captureMs:performance.now()-start});
 }
 await page.evaluate(s=>window.styleLab.frame(s,0),style);await page.locator('canvas').screenshot({path:`${out}/${style}-repeat.png`});
 const a=await sharp(`${out}/${style}-0.png`).raw().toBuffer(),b=await sharp(`${out}/${style}-repeat.png`).raw().toBuffer();
 records.push({style,repeatIdentical:a.equals(b)});
 const times=await page.evaluate(()=>{const t=[];for(let i=0;i<35;i++){const a=performance.now();window.styleLab.render();const gl=document.querySelector('canvas').getContext('webgl2');gl.finish();t.push(performance.now()-a);}return t.slice(5).sort((a,b)=>a-b);});
 records.push({style,steadyFrameMedianMs:times[15],steadyFrameP95Ms:times[28],measurement:'30 warmed fixed-camera render submissions + gl.finish; SwiftShader software GPU'});
}
await page.evaluate(()=>window.styleLab.frame('ink',0));
await page.evaluate(()=>window.styleLab.marks(0));await page.locator('canvas').screenshot({path:`${out}/ink-marks-off.png`});
await page.evaluate(()=>window.styleLab.marks(1));
for(let a=-12;a<=12;a+=2){await page.evaluate(a=>window.styleLab.frame('ink',a),a);await page.locator('canvas').screenshot({path:`${out}/motion-${String((a+12)/2).padStart(2,'0')}.png`});}
const hashes=records.filter(r=>r.geometryHash).map(r=>r.geometryHash);if(new Set(hashes).size!==1)throw new Error('Geometry differs across styles/cameras');
if(records.some(r=>r.repeatIdentical===false))throw new Error('Return-frame mismatch');
const comps=[];for(const [i,s] of ['baseline','fine','ink','mineral'].entries()){
 const label=Buffer.from(`<svg width="600" height="40"><rect width="600" height="40" fill="#eee5cb"/><text x="15" y="26" font-family="sans-serif" font-size="18">${s} · identical geometry / camera</text></svg>`);
 comps.push({input:await sharp(`${out}/${s}-0.png`).resize(600,370).toBuffer(),left:(i%2)*600,top:Math.floor(i/2)*410+40},{input:label,left:(i%2)*600,top:Math.floor(i/2)*410});
}await sharp({create:{width:1200,height:820,channels:3,background:'#eee5cb'}}).composite(comps).png().toFile(`${out}/contact-sheet.png`);
const orbit=[];for(const [r,s] of ['baseline','fine','ink','mineral'].entries())for(const [c,a] of [-30,0,30].entries())orbit.push({input:await sharp(`${out}/${s}-${a}.png`).resize(400,247).toBuffer(),left:c*400,top:r*247});
await sharp({create:{width:1200,height:988,channels:3,background:'#eee5cb'}}).composite(orbit).png().toFile(`${out}/orbit-contact.png`);
fs.writeFileSync(`${out}/measurements.json`,JSON.stringify({errors,viewport:[1200,740],records},null,2));
if(errors.length)throw new Error(errors.join('\n'));console.log(JSON.stringify(records,null,2));
}finally{await browser.close();await server.close();}
