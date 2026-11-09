import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createReferenceHenRig} from '../hen-study/src/motion.js';
import {createPoseRenderer,bodyMotion} from './poses.js';
import {createPaper} from './paper.js';
import {WIDTH,HEIGHT,birds} from './flock.js';
import paintedUrl from '../references/hen-and-chicks.jpg?url';
import marksUrl from '../assets/painted-elements.png?url';
const DEPTH=.42,COS=Math.sqrt(1-DEPTH*DEPTH),RAD=Math.PI/180;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const loadImage=url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url;});
export async function createScene(host,onView){
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#dfddcf');
 renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Mother hen and eight chicks on paper. Drag to turn, scroll to zoom; arrow keys turn and tilt, plus and minus zoom, Home resets.');host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-400,400,400,-400,.1,5000);
 const controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=false;controls.rotateSpeed=.45;controls.zoomSpeed=.65;
 controls.minPolarAngle=20*RAD;controls.maxPolarAngle=70*RAD;controls.minAzimuthAngle=-75*RAD;controls.maxAzimuthAngle=75*RAD;controls.minZoom=.7;controls.maxZoom=2;
 const [source,marks,poses]=await Promise.all([new THREE.TextureLoader().loadAsync(paintedUrl),loadImage(marksUrl),createPoseRenderer(birds,{includeHen:false})]);
 source.colorSpace=THREE.SRGBColorSpace;source.minFilter=source.magFilter=THREE.LinearFilter;
 const rig=createReferenceHenRig(source);scene.add(rig.root);
 const paper=createPaper(marks),geometry=new THREE.PlaneGeometry(WIDTH,HEIGHT/DEPTH,70,140);
 // A shallow, irregular edge gives the paper a physical thickness without
 // bending the ground where the feet have been planted.
 const p=geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i);if(Math.abs(x)>WIDTH/2-.01)p.setX(i,x+Math.sin(y*1.7)*.35+Math.sin(y*4.1)*.18);if(Math.abs(y)>HEIGHT/DEPTH/2-.01)p.setY(i,y+Math.sin(x*2.3)*.5);}
 const sheet=new THREE.Mesh(geometry,paper.material);sheet.rotation.x=-Math.PI/2;sheet.position.y=-.6;scene.add(sheet);
 const edge=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#c4b697',side:THREE.DoubleSide}));edge.rotation.x=-Math.PI/2;edge.position.set(.5,-1.8,.8);scene.add(edge);
 const print=new THREE.Mesh(new THREE.PlaneGeometry(WIDTH,HEIGHT/DEPTH),new THREE.MeshBasicMaterial({map:paper.inscription,transparent:true,depthWrite:false}));print.rotation.x=-Math.PI/2;print.position.y=-.45;scene.add(print);
 // Only animals are clipped at the paper's edge; they can leave and re-enter.
 const clips=[new THREE.Plane(V(1,0,0),WIDTH/2),new THREE.Plane(V(-1,0,0),WIDTH/2),new THREE.Plane(V(0,0,1),HEIGHT/DEPTH/2),new THREE.Plane(V(0,0,-1),HEIGHT/DEPTH/2)];
 renderer.localClippingEnabled=true;rig.root.traverse(o=>{if(o.isMesh)o.material.clippingPlanes=clips;});
 const atlas=new THREE.CanvasTexture(poses.canvas);atlas.colorSpace=THREE.SRGBColorSpace;atlas.minFilter=THREE.LinearFilter;atlas.generateMipmaps=false;
 const chickMaterial=new THREE.MeshBasicMaterial({map:atlas,transparent:true,depthWrite:true,alphaTest:.06,side:THREE.DoubleSide,clippingPlanes:clips});
 const legMaterial=new THREE.MeshBasicMaterial({color:'#3c3c32',clippingPlanes:clips});
 const cylinder=new THREE.CylinderGeometry(1,1,1,6),up=V(0,1,0);
 const chicks=birds.filter(b=>b.kind!=='hen').map((bird,i)=>{
  const g=new THREE.PlaneGeometry(80,80/COS),uv=g.attributes.uv;
  for(let j=0;j<uv.count;j++)uv.setXY(j,(uv.getX(j)+i%4)/4,(uv.getY(j)+1-Math.floor(i/4))/2);
  const mesh=new THREE.Mesh(g,chickMaterial);scene.add(mesh);
  const legs=Array.from({length:12},()=>{const m=new THREE.Mesh(cylinder,legMaterial);scene.add(m);return m;});
  return{bird,mesh,legs};
 });
 const bounds=[];for(const x of [-WIDTH/2,WIDTH/2])for(const z of [-HEIGHT/DEPTH/2,HEIGHT/DEPTH/2])for(const y of [0,55])bounds.push(V(x,y,z));
 let current=[],lastAtlas='',hidden=new Set(),ink=1,renderedFrames=0;
 function fit(){
  camera.updateMatrixWorld();const inverse=camera.matrixWorldInverse;let extentX=0,extentY=0;
  for(const p of bounds){const q=p.clone().applyMatrix4(inverse);extentX=Math.max(extentX,Math.abs(q.x));extentY=Math.max(extentY,Math.abs(q.y));}
  const aspect=host.clientWidth/host.clientHeight,h=Math.max(extentY,extentX/aspect)*1.06;
  camera.left=-h*aspect;camera.right=h*aspect;camera.top=h;camera.bottom=-h;camera.updateProjectionMatrix();
 }
 function line(mesh,a,b,r){mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.scale.set(r,a.distanceTo(b),r);mesh.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());}
 function draw(){
  const azimuth=controls.getAzimuthalAngle();
  const signature=current.map(p=>`${p.id}:${p.time}:${p.phase}:${p.feedLower}:${p.feedStrike}:${p.wing}:${p.heading}`).join('|')+':'+azimuth.toFixed(5);
  if(signature!==lastAtlas){
   const atlasPoses=chicks.map(({bird},i)=>{const p=current.find(p=>p.id===bird.id);return p?{...p,x:(i%4+.5)*80,y:(Math.floor(i/4)+.5)*80,heading:p.heading-azimuth}:null;}).filter(Boolean);
   poses.render(atlasPoses,{width:1024,height:512,worldWidth:320,worldHeight:160});atlas.needsUpdate=true;lastAtlas=signature;
  }
  const mother=current.find(p=>p.id==='mother-hen');rig.root.visible=!!mother&&!hidden.has('mother-hen');
  if(mother){rig.update(mother);rig.root.position.set(mother.x-WIDTH/2,0,(mother.y+66-HEIGHT/2)/DEPTH);}
  for(const {bird,mesh,legs}of chicks){
   const p=current.find(p=>p.id===bird.id),visible=!!p&&!hidden.has(bird.id);mesh.visible=visible;legs.forEach(l=>l.visible=visible);if(!p)continue;
   mesh.position.set(p.x-WIDTH/2,19/COS,(p.y+19-HEIGHT/2)/DEPTH);mesh.rotation.y=azimuth;
   const forward=V(Math.sin(p.heading),0,Math.cos(p.heading)),right=V(Math.cos(p.heading),0,-Math.sin(p.heading)),bounce=bodyMotion(p,false).bounce;
   for(let i=0;i<2;i++){
    const f=p.feet[i],side=i?1:-1,hip=V(p.x-WIDTH/2,(12+bounce)/COS,(p.y+19-HEIGHT/2)/DEPTH).addScaledVector(right,side*4);
    const foot=V(f.x-WIDTH/2,.7+f.lift/COS,(f.y-HEIGHT/2)/DEPTH),knee=hip.clone().lerp(foot,.55).addScaledVector(forward,-3);knee.y+=1;
    line(legs[i*6],hip,knee,.65);line(legs[i*6+1],knee,foot,.45);
    const fw=V(Math.sin(f.yaw),0,Math.cos(f.yaw)),rt=V(Math.cos(f.yaw),0,-Math.sin(f.yaw));
    for(let j=-1;j<=1;j++)line(legs[i*6+j+3],foot,foot.clone().addScaledVector(fw,4.3).addScaledVector(rt,j*2.2),.3);
    line(legs[i*6+5],foot,foot.clone().addScaledVector(fw,-2),.3);
   }
  }
  renderer.render(scene,camera);renderedFrames++;
 }
 function view(){return{turn:controls.getAzimuthalAngle()/RAD,tilt:90-controls.getPolarAngle()/RAD,zoom:camera.zoom};}
 controls.addEventListener('change',()=>{fit();draw();onView?.(view());});
 function setView({turn=0,tilt=Math.asin(DEPTH)/RAD,zoom=1}={}){
  turn=THREE.MathUtils.clamp(turn,-75,75);tilt=THREE.MathUtils.clamp(tilt,20,70);camera.zoom=THREE.MathUtils.clamp(zoom,.7,2);
  controls.target.set(0,12,0);camera.position.set(1600*Math.sin(turn*RAD)*Math.cos(tilt*RAD),12+1600*Math.sin(tilt*RAD),1600*Math.cos(turn*RAD)*Math.cos(tilt*RAD));controls.update();fit();draw();onView?.(view());
 }
 renderer.domElement.addEventListener('keydown',e=>{
  const v=view();if(e.key==='Home')setView();else if(e.key==='ArrowLeft')setView({...v,turn:v.turn-5});else if(e.key==='ArrowRight')setView({...v,turn:v.turn+5});else if(e.key==='ArrowUp')setView({...v,tilt:v.tilt+5});else if(e.key==='ArrowDown')setView({...v,tilt:v.tilt-5});else if(['+','=','-'].includes(e.key))setView({...v,zoom:v.zoom+(e.key==='-'?-.1:.1)});else return;e.preventDefault();
 });
 const observer=new ResizeObserver(()=>{renderer.setSize(host.clientWidth,host.clientHeight,false);fit();draw();});observer.observe(host);setView();
 function setInk(value){ink=value;chickMaterial.color.setScalar(1/value);rig.model.materials.ink.color.setScalar(1/value);print.material.opacity=Math.min(1,value);draw();}
 return{renderer,rig,render(poses,hiddenIds=hidden){current=poses;hidden=hiddenIds;draw();},setView,view,setInk,setPaper(value){paper.setStrength(value);draw();},exportPNG:()=>renderer.domElement.toDataURL('image/png'),describe:()=>({camera:view(),ink,renderedFrames,glError:renderer.getContext().getError()||poses.getError(),projection:'orthographic 3D',chicks:'eight-view painted meshes with grounded 3D legs',hen:'articulated 3D model',paper:'seeded fibres fixed to paper coordinates'})};
}
