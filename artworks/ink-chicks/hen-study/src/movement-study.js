import {createHenRenderer} from '../../src/hen-renderer.js';
import {HEN_VIEWS,HEN_ACTIONS,movementPose} from './motion.js';

export async function mountMovementStudy(){
 const $=id=>document.getElementById(id),renderer=await createHenRenderer();
 const canvas=$('movement-canvas'),ctx=canvas.getContext('2d');canvas.width=canvas.height=560;
 const state={time:0,action:'Walk',heading:-Math.PI/2,playing:true,mode:'ink'};
 let visible=false,last=performance.now(),exposure=-1;
 function renderFrame(t=state.time,action=state.action,heading=state.heading){
  Object.assign(state,{time:t,action,heading});
  const pose=movementPose(t,action,heading),frame=renderer.render(pose,560/renderer.span);
  ctx.fillStyle='#e1d5b9';ctx.fillRect(0,0,560,560);ctx.drawImage(frame,0,0,560,560);
  $('movement-caption').textContent=action==='Still'?'Head up · watching the chicks':action==='Peck'?({watch:'Head up · watch',lower:'Lower into the feeding stance',inspect:'Stay low · inspect the next morsel',peck:'A short peck · feet planted',raise:'Finish the bout · raise the head'}[pose.feedStage]):`${action} · twelve held poses per second`;
  document.querySelectorAll('[data-action]').forEach(b=>b.classList.toggle('active',b.dataset.action===action));
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',Math.abs(Number(b.dataset.view)-heading)<.001));
 }
 function makeViews(){
  $('hen-views').replaceChildren();
  for(const [label,degrees] of HEN_VIEWS){
   const heading=degrees*Math.PI/180,b=document.createElement('button'),c=document.createElement('canvas'),s=document.createElement('span');
   b.dataset.view=heading;b.setAttribute('aria-label',`View: ${label}`);c.width=c.height=160;
   const cx=c.getContext('2d');cx.fillStyle='#e1d5b9';cx.fillRect(0,0,160,160);cx.drawImage(renderer.render(movementPose(0,'Still',heading),160/renderer.span),0,0,160,160);
   s.textContent=label;b.append(c,s);b.onclick=()=>renderFrame(state.time,state.action,heading);$('hen-views').append(b);
  }
 }
 for(const action of HEN_ACTIONS){const b=document.createElement('button');b.textContent=action;b.dataset.action=action;b.onclick=()=>renderFrame(0,action);$('movement-actions').append(b);}
 $('movement-play').onclick=()=>{state.playing=!state.playing;$('movement-play').textContent=state.playing?'Pause movement':'Play movement';};
 $('movement-reset').onclick=()=>renderFrame(0);
 $('movement-material').onclick=()=>{state.mode=state.mode==='ink'?'clay':'ink';renderer.rig.setMode(state.mode);$('movement-material').textContent=state.mode==='ink'?'Show model':'Show ink';makeViews();renderFrame();};
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;}).observe($('movement-study'));
 function tick(now){if(state.playing&&visible){state.time+=Math.min((now-last)/1000,.1);const frame=Math.floor(state.time*12);if(frame!==exposure){renderFrame();exposure=frame;}}last=now;requestAnimationFrame(tick);}
 makeViews();renderFrame();requestAnimationFrame(tick);
 window.henMovementStudy={ready:true,state,renderFrame,setPlaying(value){state.playing=value;$('movement-play').textContent=value?'Pause movement':'Play movement';},capture(){return canvas.toDataURL('image/png');},diagnostics:()=>renderer.rig.diagnostics()};
}
