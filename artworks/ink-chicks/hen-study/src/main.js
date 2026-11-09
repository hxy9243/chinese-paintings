import {mountMovementStudy} from './movement-study.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createModel,REFERENCE} from './model.js';
import {createModel as createPreviousModel} from './previous-model.js';
import referenceUrl from '../../references/hen-and-chicks.jpg?url';
const $=id=>document.getElementById(id),state={mode:'clay',angle:0,turning:false,exploded:false,compare:false};
let before,after,overlay;
const texture=await new THREE.TextureLoader().loadAsync(referenceUrl);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
$('full-reference').href=referenceUrl;
function paintReference(c,host){const scale=host.clientHeight/360;const dpr=Math.min(devicePixelRatio,2);c.width=host.clientWidth*dpr;c.height=host.clientHeight*dpr;const ctx=c.getContext('2d');ctx.scale(dpr,dpr);ctx.fillStyle='#ded2b4';ctx.fillRect(0,0,host.clientWidth,host.clientHeight);ctx.translate(host.clientWidth/2-319*scale,host.clientHeight/2-196*scale);ctx.scale(scale,scale);ctx.beginPath();ctx.moveTo(194,44);ctx.lineTo(441,44);ctx.lineTo(441,347);ctx.lineTo(214,347);ctx.lineTo(214,324);ctx.lineTo(194,324);ctx.closePath();ctx.clip();ctx.drawImage(texture.image,0,0);}
function drawReference(){paintReference($('reference'),$('reference').parentElement);}
new ResizeObserver(drawReference).observe($('reference').parentElement);drawReference();
const rootStage=$('viewport');
function createView(host,{revision='refined',interactive=false}={}){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#ded2b4',1);renderer.outputColorSpace=THREE.SRGBColorSpace;host.append(renderer.domElement);
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#ffffff','#78715b',2.7));const key=new THREE.DirectionalLight('#fff8e6',2.7);key.position.set(-3,5,6);scene.add(key);const fill=new THREE.DirectionalLight('#cbd5db',.7);fill.position.set(4,1,-3);scene.add(fill);
 const model=(revision==='blockout'?createPreviousModel:createModel)({referenceTexture:texture,revision:'refined'});scene.add(model.root);
 const camera=new THREE.OrthographicCamera(-2.3,2.3,2.3,-2.3,.01,100);camera.position.set(0,1.5,12);camera.lookAt(0,1.5,0);
 const controls=interactive?new OrbitControls(camera,renderer.domElement):null;if(controls){controls.target.set(0,1.5,0);controls.update();controls.enableDamping=false;controls.enablePan=false;controls.minZoom=.7;controls.maxZoom=2;controls.addEventListener('change',()=>renderer.render(scene,camera));}
 function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);const height=3.6;camera.left=-height*w/h/2;camera.right=height*w/h/2;camera.top=1.5+height/2-1.5;camera.bottom=-height/2;camera.updateProjectionMatrix();renderer.render(scene,camera);}
 new ResizeObserver(resize).observe(host);resize();
 function render(angle=0){model.root.rotation.y=angle*Math.PI/180;renderer.render(scene,camera);}
 function reset(){camera.position.set(0,1.5,12);camera.up.set(0,1,0);camera.lookAt(0,1.5,0);camera.zoom=1;camera.updateProjectionMatrix();controls?.target.set(0,1.5,0);controls?.update();render(0);}
 return{renderer,model,camera,controls,render,reset,resize};
}
const view=createView(rootStage,{interactive:true});
new ResizeObserver(()=>{if(overlay?.isConnected)paintReference(overlay,rootStage);}).observe(rootStage);
const notes={clay:['Begin with the anatomy.','A rounded, nearly horizontal body supports a small head and a curved, feathered neck. Folded wings rest against the flanks; a separate tail grows from the rump. The knee stays high under the feathers, above the hock and sturdy shank. Drag to inspect.'],ink:['Let the brush follow the form.','Fixed areas of the supplied painting wrap the body and individual feathers. Matching coordinates keep the two sides consistent. The head, beak and feet remain readable through the dark ink.'],compare:['Lean into the feeding pose.','In the painting, the breast drops while the back and tail rise. The model now tips forward as a whole, supported by bent legs. The feathered shoulder brings the head down with it; the short pecks follow from this settled posture.'],refine:['Feathers join the head to the body.','The previous narrow neck is on the left. On the right, a deep feather mantle curves from behind the head into the shoulders and breast. Overlapping tips soften its outline; the neck bends underneath.']};
function textNotes(kind){$('notes').innerHTML=`<h2>${notes[kind][0]}</h2><p>${notes[kind][1]}</p>`;}
function setMode(mode){state.mode=mode;state.compare=false;overlay?.remove();view.controls.enabled=true;$('compare').classList.remove('active');$('refine').classList.remove('active');view.model.setMode(mode);view.model.setPosture(0);view.model.setNeck();view.render(state.angle);$('view-title').textContent=mode==='ink'?'The painted model':'The model';$('view-subtitle').textContent=mode==='ink'?'Ink on a continuous form':'Shape before paint';document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));textNotes(mode);$('refinement-panel').hidden=true;}
function stopTurning(){state.turning=false;$('turn').textContent='Turn slowly';}
function setExploded(value){state.exploded=value;view.model.setExploded(value);$('parts').textContent=value?'Put together':'Separate parts';view.render(state.angle);}
function setAngle(angle){state.angle=angle;$('angle').value=angle;$('angle-label').value=Math.round(angle)+'°';view.render(angle);}
for(const b of document.querySelectorAll('[data-mode]'))b.onclick=()=>setMode(b.dataset.mode);
$('match').onclick=()=>{stopTurning();view.reset();setAngle(0);};
$('turn').onclick=()=>{if(state.compare)setMode('ink');state.turning=!state.turning;$('turn').textContent=state.turning?'Stop turning':'Turn slowly';};
$('parts').onclick=()=>{if(state.compare)setMode('ink');setExploded(!state.exploded);};
$('angle').oninput=e=>{stopTurning();if(state.compare)setMode('ink');setAngle(Number(e.target.value));};
$('compare').onclick=()=>{setMode('ink');stopTurning();setExploded(false);view.reset();setAngle(0);$('compare').classList.add('active');document.querySelector('[data-mode=ink]').classList.remove('active');textNotes('compare');view.model.setPosture(1);view.model.setFeedingNeck(1,1);view.render(0);state.compare=true;$('view-subtitle').textContent='Forward body lean · a full feathered shoulder';};
$('refine').onclick=()=>{stopTurning();setExploded(false);view.reset();setAngle(0);setMode('clay');$('refine').classList.add('active');document.querySelector('[data-mode=clay]').classList.remove('active');textNotes('refine');$('refinement-panel').hidden=false;if(!before){before=createView($('before'),{revision:'blockout'});after=createView($('after'));}before.resize();after.resize();};
$('save').onclick=()=>{const a=document.createElement('a');a.href=view.renderer.domElement.toDataURL('image/png');a.download='mother-hen-'+state.mode+'.png';a.click();};
let last=performance.now();function tick(now){if(state.turning){setAngle(((state.angle+Math.max(0,now-last)*.008+180)%360)-180);}last=now;requestAnimationFrame(tick);}requestAnimationFrame(tick);
window.henStudy={ready:true,state,setMode,setAngle,setExploded,capture(){return view.renderer.domElement.toDataURL('image/png');},async exportModel(){view.model.setExploded(false);view.model.root.rotation.y=0;view.model.setMode('ink');const glb=await new GLTFExporter().parseAsync(view.model.root,{binary:true});view.model.setMode(state.mode);view.model.setExploded(state.exploded);view.render(state.angle);return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(new Blob([glb],{type:'model/gltf-binary'}));});},describe(){let vertices=0,meshes=0;view.model.root.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;}});return{meshes,vertices,parts:Object.keys(view.model.parts),state:{...state},reference:REFERENCE,glError:view.renderer.getContext().getError()};}};
$('status').textContent='An individual model study';

mountMovementStudy().catch(error=>{document.getElementById('movement-caption').textContent='The movement study could not load.';console.error(error);});
