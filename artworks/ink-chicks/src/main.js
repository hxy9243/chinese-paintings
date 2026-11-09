import {WIDTH,HEIGHT,DURATION,birds,sample,sampleStepped,exposureTime,STEP_FPS,audit} from './flock.js';
import {createScene} from './scene.js';
import referenceUrl from '../references/original.jpg?url';
import henReferenceUrl from '../references/hen-and-chicks.jpg?url';
const $=id=>document.getElementById(id),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const state={time:0,playing:!reducedMotion,hidden:new Set(),speed:1,ink:1,paper:.85};
let scene,last=0,lastExposure=-1;
function updateView(view){for(const key of ['turn','tilt','zoom']){$(key).value=view[key];$(key+'-label').value=key==='zoom'?view[key].toFixed(2)+'×':Math.round(view[key])+'°';}}
function renderFrame(time){state.time=Math.max(0,time);scene.render(sampleStepped(state.time),state.hidden);lastExposure=exposureTime(state.time);$('timeline').max=Math.max(DURATION,Math.ceil(state.time));$('timeline').value=state.time;$('time-label').value=state.time.toFixed(1)+' s';return state.time;}
function setPlaying(value){state.playing=value;$('play').textContent=value?'Pause':'Play';$('play').setAttribute('aria-label',value?'Pause animation':'Play animation');$('status').textContent=(value?'Playing':'Paused')+' · A mother and eight chicks';last=performance.now();}
function tick(now){if(state.playing){state.time+=Math.min((now-last)/1000,.15)*state.speed;if(exposureTime(state.time)!==lastExposure)renderFrame(state.time);}last=now;requestAnimationFrame(tick);}
async function init(){
 scene=await createScene($('painting'),updateView);
 for(const b of birds){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;input.dataset.layer=b.id;input.onchange=()=>{input.checked?state.hidden.delete(b.id):state.hidden.add(b.id);renderFrame(state.time);};label.append(input,document.createTextNode(b.name));$('layer-controls').append(label);}
 $('play').onclick=()=>setPlaying(!state.playing);$('reset').onclick=()=>renderFrame(0);$('view-reset').onclick=()=>scene.setView();
 $('timeline').oninput=e=>{setPlaying(false);renderFrame(Number(e.target.value));};
 for(const key of ['speed','ink','paper'])$(key).oninput=e=>{state[key]=Number(e.target.value);$(key+'-label').value=key==='speed'?state[key].toFixed(2)+'×':Math.round(state[key]*100)+'%';if(key==='ink')scene.setInk(state.ink);if(key==='paper')scene.setPaper(state.paper);};
 for(const key of ['turn','tilt','zoom'])$(key).oninput=e=>scene.setView({...scene.view(),[key]:Number(e.target.value)});
 $('save').onclick=()=>{const a=document.createElement('a');a.download='mother-and-eight-chicks.png';a.href=scene.exportPNG();a.click();};
 $('reference-image').src=referenceUrl;$('hen-reference-image').src=henReferenceUrl;
 $('reference-open').onclick=()=>$('reference-dialog').showModal();$('reference-close').onclick=()=>$('reference-dialog').close();
 if(import.meta.env.DEV&&location.port==='5191')$('gallery-link').href='http://127.0.0.1:5180/';
 document.querySelectorAll('[disabled]').forEach(el=>el.disabled=false);$('loading').hidden=true;
 window.chicksStudy={ready:true,renderFrame,setPlaying,sample,sampleStepped,exposureTime,audit,setView:scene.setView,henDiagnostics:()=>scene.rig.diagnostics(),exportPNG:scene.exportPNG,
  show(id,visible){visible?state.hidden.delete(id):state.hidden.add(id);document.querySelector(`[data-layer="${id}"]`).checked=visible;renderFrame(state.time);},
  describe:()=>({...scene.describe(),time:state.time,playing:state.playing,speed:state.speed,paper:state.paper,hidden:[...state.hidden],chicks:8,black:6,yellow:2,hens:1,poseRate:STEP_FPS,world:{width:WIDTH,height:HEIGHT},henModel:'anatomical-hen-v14'})};
 renderFrame(0);setPlaying(state.playing);requestAnimationFrame(tick);
}
init().catch(error=>{$('loading').textContent='The painting could not load. Please reload to try again.';$('status').textContent='Unable to load the painting';console.error(error);});
