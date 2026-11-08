import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createGpuInk} from './gpu-ink.js';
import {createInkAtlas} from './ink-atlas.js';
import {createPond,DURATION,POPULATION_LIMITS} from './pond.js';
import {createWaterCamera,resizeWaterCamera,describeWaterCamera} from './water-space.js';

const $=id=>document.getElementById(id),container=$('painting'),play=$('play');
const timeline=$('time'),wash=$('wash'),rain=$('rain'),paper=$('paper'),inscription=$('inscription'),status=$('status');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let playing=!reducedMotion.matches,time=0,current=0,last=performance.now(),view=null,speed=1;
let autoQuality=true,lastQualityChange=0,lastStatus=0,previousFrame=0,cameraDirty=false,populationTimer;
const frameTimes=[],cpuTimes=[];
const quantile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor((sorted.length-1)*p)]??0;};
function performanceStats(){return{fps:frameTimes.length?1000/(frameTimes.reduce((a,b)=>a+b,0)/frameTimes.length):0,
  frameMsP50:quantile(frameTimes,.5),frameMsP95:quantile(frameTimes,.95),cpuMsP50:quantile(cpuTimes,.5),sampleFrames:frameTimes.length};}
function controls(){
  play.textContent=playing?'Pause':'Play';play.setAttribute('aria-label',playing?'Pause swimming':'Play swimming');
  if(time>Number(timeline.max))timeline.max=String(Math.ceil(time/30)*30);
  timeline.value=String(time);$('time-value').value=`${Math.floor(time/60)}:${String(Math.floor(time%60)).padStart(2,'0')}`;
}
function renderFrame(t=time){
  time=Math.max(0,t);const start=performance.now();
  if(view){view.pond.update(time);view.ink.draw(Number(wash.value));}
  cpuTimes.push(performance.now()-start);if(cpuTimes.length>180)cpuTimes.shift();cameraDirty=false;controls();
}
function resize(){
  if(!view)return;const w=container.clientWidth,h=container.clientHeight;
  resizeWaterCamera(view.camera,w/h);view.ink.resize(w,h,Math.min(1,1200/w));frameTimes.length=0;renderFrame();
}
function setPlaying(value){playing=Boolean(value);last=performance.now();previousFrame=0;controls();status.textContent=playing?'Following the current':'Paused · drag to explore';}
function setCurrent(value){current=THREE.MathUtils.clamp(value,-45,45);view.pond.setCurrent(current);renderFrame();}
function setSpeed(value){speed=THREE.MathUtils.clamp(Number(value)||1,.25,2);$('speed').value=String(speed);$('speed-value').value=`${speed.toFixed(2).replace(/0$/,'')}×`;}
function setPaperStrength(value){view.ink.setPaperStrength(value);paper.value=String(view.ink.describe().paperStrength);$('paper-value').value=`${Math.round(Number(paper.value)*100)}%`;renderFrame();}
function setView({azimuthDegrees=-45,elevationDegrees=45,zoom=1}={}){
  const {camera,orbit}=view,az=THREE.MathUtils.degToRad(azimuthDegrees),el=THREE.MathUtils.degToRad(THREE.MathUtils.clamp(elevationDegrees,20,80));
  const damping=orbit.enableDamping;orbit.enableDamping=false;orbit.update();orbit.reset();orbit.target.set(0,0,0);camera.position.set(1800*Math.cos(el)*Math.cos(az),1800*Math.cos(el)*Math.sin(az),1800*Math.sin(el));
  camera.zoom=THREE.MathUtils.clamp(zoom,.6,2.4);camera.updateProjectionMatrix();camera.lookAt(orbit.target);orbit.update();orbit.enableDamping=damping;renderFrame();
}
function setPopulation({fish=Number($('fish').value),shrimp=Number($('shrimp').value)}={}){
  clearTimeout(populationTimer);
  view.pond.setPopulation({fish,shrimp},view.camera);renderFrame();
  const population=view.pond.describe();
  for(const species of ['fish','shrimp']){$(species).value=String(population[species]);$(species+'-value').value=String(population[species]);}
  status.textContent=`${population.fish} fish · ${population.shrimp} shrimp`;
}
function reset(){view.pond.reset();current=0;wash.value='.42';timeline.max=String(DURATION);renderFrame(0);last=performance.now();}
play.addEventListener('click',()=>setPlaying(!playing));
timeline.addEventListener('input',()=>{setPlaying(false);renderFrame(Number(timeline.value));});
wash.addEventListener('input',()=>renderFrame());$('reset').addEventListener('click',reset);
rain.addEventListener('input',()=>{view.pond.setRain(Number(rain.value));$('rain-value').value=`${Math.round(Number(rain.value)*100)}%`;renderFrame();});
$('speed').addEventListener('input',()=>setSpeed($('speed').value));
paper.addEventListener('input',()=>setPaperStrength(paper.value));
for(const species of ['fish','shrimp']){
  $(species).max=String(POPULATION_LIMITS[species]);
  $(species).addEventListener('input',()=>{$(species+'-value').value=$(species).value;clearTimeout(populationTimer);populationTimer=setTimeout(()=>setPopulation(),150);});
  $(species).addEventListener('change',()=>setPopulation());
}
$('view-reset').addEventListener('click',()=>setView());
$('paths').addEventListener('click',()=>{view.pond.newPaths();current=0;renderFrame(0);last=performance.now();});
$('save').addEventListener('click',()=>{
  const previousScale=view.ink.describe().renderScale;view.ink.setRenderScale(2);renderFrame();
  const exportCanvas=document.createElement('canvas'),canvas=view.ink.canvas;
  exportCanvas.width=canvas.width;exportCanvas.height=canvas.height;
  const ctx=exportCanvas.getContext('2d');ctx.drawImage(canvas,0,0);
  const bounds=container.getBoundingClientRect(),writing=inscription.getBoundingClientRect(),sx=canvas.width/bounds.width,sy=canvas.height/bounds.height;
  ctx.save();ctx.globalAlpha=Number(getComputedStyle(inscription).opacity);
  ctx.drawImage(inscription,(writing.left-bounds.left)*sx,(writing.top-bounds.top)*sy,writing.width*sx,writing.height*sy);ctx.restore();
  view.ink.setRenderScale(previousScale);renderFrame();last=performance.now();
  exportCanvas.toBlob(blob=>{if(!blob)return;const a=document.createElement('a'),url=URL.createObjectURL(blob);a.href=url;a.download='fish-and-shrimp-in-ink.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
});
const dialog=$('reference-dialog');
$('reference-open').addEventListener('click',()=>dialog.showModal());$('reference-close').addEventListener('click',()=>dialog.close());
reducedMotion.addEventListener('change',e=>{if(e.matches)setPlaying(false);});
window.addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>{last=performance.now();previousFrame=0;});

async function init(){
  await inscription.decode();
  const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,preserveDrawingBuffer:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);renderer.setClearColor(0xf3eddf,0);renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  const camera=createWaterCamera(18/11),pond=createPond(),paint=await createInkAtlas();
  const ink=await createGpuInk(container,renderer,camera,pond,paint);
  const orbit=new OrbitControls(camera,ink.canvas);orbit.enablePan=false;orbit.enableDamping=true;orbit.dampingFactor=.10;orbit.rotateSpeed=.55;
  orbit.minPolarAngle=THREE.MathUtils.degToRad(10);orbit.maxPolarAngle=THREE.MathUtils.degToRad(70);orbit.minZoom=.6;orbit.maxZoom=2.4;
  orbit.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:null};orbit.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_ROTATE};
  orbit.addEventListener('change',()=>{cameraDirty=true;});
  view={renderer,camera,pond,ink,orbit,paint};rain.value=String(pond.describe().rain.intensity);resize();
  let drag=null,pointers=new Set();
  ink.canvas.addEventListener('pointerdown',e=>{
    pointers.add(e.pointerId);if(pointers.size>1){if(drag)drag.moved=true;return;}
    if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,moved:false};container.classList.add('dragging');
  });
  ink.canvas.addEventListener('pointermove',e=>{if(drag&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>7)drag.moved=true;});
  ink.canvas.addEventListener('pointerup',e=>{
    if(drag&&!drag.moved&&pointers.size===1){
      const r=ink.canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);
      const point=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),0),new THREE.Vector3());
      if(point){view.pond.stir(point.toArray());renderFrame();}
    }pointers.delete(e.pointerId);drag=null;container.classList.remove('dragging');
  });
  ink.canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);drag=null;container.classList.remove('dragging');});
  ink.canvas.addEventListener('keydown',e=>{
    const cameraView=describeWaterCamera(camera),keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'];if(!keys.includes(e.key))return;e.preventDefault();
    if(e.key==='Home'){setView();return;}
    setView({...cameraView,azimuthDegrees:cameraView.azimuthDegrees+(e.key==='ArrowLeft'?-8:e.key==='ArrowRight'?8:0),
      elevationDegrees:cameraView.elevationDegrees+(e.key==='ArrowUp'?5:e.key==='ArrowDown'?-5:0),
      zoom:camera.zoom*(e.key==='+'||e.key==='='?1.12:e.key==='-'?1/1.12:1)});
  });
  window.pondPainting={ready:true,renderFrame(t){setPlaying(false);renderFrame(t);},setPlaying,setCurrent,setView,setPopulation,setSpeed,
    setWashStrength(value){wash.value=String(value);renderFrame();},setPaperStrength,setPaperTone(value){view.ink.setPaperTone(value??[243,237,223]);renderFrame();},
    setFormOnly(value){view.ink.setFormOnly(value);renderFrame();},setRipples(value){view.ink.setRipples(value);renderFrame();},
    setRain(value){view.pond.setRain(value);rain.value=String(view.pond.describe().rain.intensity);$('rain-value').value=`${Math.round(Number(rain.value)*100)}%`;renderFrame();},
    setRenderScale(value){if(value==null)autoQuality=true;else{autoQuality=false;view.ink.setRenderScale(value);}renderFrame();},
    stir(position){view.pond.stir(position);renderFrame();},diagnoseOcclusion(){return view.ink.diagnoseOcclusion(Number(wash.value));},diagnoseAnimalLayers(){return view.ink.diagnoseAnimalLayers(Number(wash.value));},diagnoseRipples(){return view.ink.diagnoseRipples(Number(wash.value));},
    describe(){return{...view.pond.describe(),playing,speed,camera:{...describeWaterCamera(camera),zoom:camera.zoom,interactive:true},renderer:view.ink.describe(),performance:performanceStats()};}};
  status.textContent='Drag to explore the pond';
  function loop(now){
    const elapsed=Math.min(.10,(now-last)/1000);last=now;orbit.update();
    if(playing&&!document.hidden){
      if(previousFrame){frameTimes.push(now-previousFrame);if(frameTimes.length>180)frameTimes.shift();}previousFrame=now;
      time+=elapsed*speed;renderFrame();
      if(now-lastStatus>700){const stats=performanceStats();status.textContent=`Following the current · ${Math.round(stats.fps)} fps`;lastStatus=now;}
      if(autoQuality&&frameTimes.length>40&&now-lastQualityChange>2200){
        const stats=performanceStats(),scale=view.ink.describe().renderScale;
        if(stats.fps<32&&scale>.67){view.ink.setRenderScale(Math.max(.65,scale-.10));frameTimes.length=0;lastQualityChange=now;}
      }
    }else{previousFrame=0;if(cameraDirty)renderFrame();}
    requestAnimationFrame(loop);
  }
  last=performance.now();requestAnimationFrame(loop);
}
init().catch(e=>{console.error(e);status.textContent='The painting could not load. Please reload.';window.pondPainting={ready:false,error:String(e)};});
