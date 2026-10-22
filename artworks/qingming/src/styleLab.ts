import * as THREE from 'three';
import {hall} from './bridgeStudy';
import {HALLS,GROUND_Y,shoreDepth} from './passageLayout';
import {BUILDING_KINDS,FEATURE_TREES} from './passageLife';
import {buildScrollTree} from './referenceTrees';
import {bankSection} from './riverbanks';
import {scrollPoint,REFERENCE_AZIMUTH} from './scrollLayout';
import {paintMaterial,waterTime} from './paintMaterial';
import {createInkFinish} from './inkFinish';
import {makeStudyMaterial, type Style} from './styleLabMaterials';
const canvas=document.querySelector('canvas')!;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.info.autoReset=false;renderer.setPixelRatio(1);renderer.setClearColor(0xeee5cb,1);
const scene=new THREE.Scene(),root=new THREE.Group();scene.add(root);
const h=HALLS[8];
const building=hall(root,h.s,h.d,h.width,h.depth,h.height,REFERENCE_AZIMUTH-h.angle+Math.PI,BUILDING_KINDS[8],h.gable);
building.userData.family='architecture';
for(const t of FEATURE_TREES.filter(t=>['bend-roof-pollard','balcony-rear-pollard'].includes(t.id))){
 const tree=buildScrollTree(t.form,t.s,2,t.form==='spreading',true);tree.position.copy(scrollPoint(t.s,t.d));tree.position.y=GROUND_Y;
 tree.scale.set(t.size*1.15,t.size*1.2,t.size*1.15);tree.rotation.y=t.s*.31;tree.userData.family='tree';tree.name=t.id;root.add(tree);
}
// Controlled terrain window uses the repository shoreline and bank cross-section.
const s0=-16,s1=-3;
function surface(family:string,rows:number,point:(s:number,t:number)=>THREE.Vector3,material:THREE.Material){
 const p:number[]=[],indices:number[]=[];const cols=130;
 for(let i=0;i<=cols;i++)for(let j=0;j<=rows;j++)p.push(...point(s0+(s1-s0)*i/cols,j/rows).toArray());
 for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const a=i*(rows+1)+j,b=a+rows+1;indices.push(a,b,a+1,b,b+1,a+1);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();
 const m=new THREE.Mesh(g,material);m.userData.family=family;m.name=family;root.add(m);
}
surface('bank',16,(s,t)=>{const p=bankSection('near',s,t),v=scrollPoint(s,p.d);v.y=p.y;return v;},paintMaterial(0xb09a6d,true));
surface('land',20,(s,t)=>{const d=shoreDepth('near',s)+.55+(11-shoreDepth('near',s)-.55)*t,v=scrollPoint(s,d);v.y=GROUND_Y;return v;},paintMaterial(0xb09a6d,true));
// Fill the rounded lip's landward join with the exact bankSection starting depth.
surface('lip',2,(s,t)=>{const d=shoreDepth('near',s)+.55*t,v=scrollPoint(s,d);v.y=GROUND_Y+.002;return v;},paintMaterial(0xb09a6d,true));
surface('water',30,(s,t)=>{const d=-4+(shoreDepth('near',s)+.1+4)*t,v=scrollPoint(s,d);v.y=-.01;return v;},paintMaterial(0xcfbd8e,true,false,true));
const saved=new Map<THREE.Mesh|THREE.Line,THREE.Material|THREE.Material[]>();
root.traverse(n=>{if(n instanceof THREE.Mesh||n instanceof THREE.Line)saved.set(n,n.material);});
const finish=createInkFinish(renderer);const camera=new THREE.OrthographicCamera();
const target=scrollPoint(-9.5,3.5);target.y=.7;let style:Style='baseline',angle=0;
function family(n:THREE.Object3D):string {return n.userData.family??(n.parent?family(n.parent):'architecture');}
const cache=new Map<string,THREE.Material>();
function setStyle(value:Style){style=value;for(const [n,m] of saved){if(value==='baseline'){n.material=m;continue;}
 const source=(Array.isArray(m)?m[0]:m) as THREE.ShaderMaterial,key=value+':'+source.uuid+':'+family(n)+':'+(n instanceof THREE.Line);
 if(!cache.has(key))cache.set(key,makeStudyMaterial(value,family(n),source,n instanceof THREE.Line));n.material=cache.get(key)!;}
 renderer.setClearColor(style==='ink'?0xf0eee5:0xeee5cb,1);render();}
function render(){
 const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);const span=16;
 camera.left=-span*w/h/2;camera.right=span*w/h/2;camera.top=span/2;camera.bottom=-span/2;camera.near=.1;camera.far=100;
 const az=REFERENCE_AZIMUTH+angle*Math.PI/180,dist=25,elev=48*Math.PI/180;
 camera.position.copy(target).add(new THREE.Vector3(Math.sin(az)*Math.cos(elev)*dist,Math.sin(elev)*dist,Math.cos(az)*Math.cos(elev)*dist));camera.lookAt(target);camera.updateProjectionMatrix();
 renderer.info.reset();waterTime.value=0;finish.resize(w,h);finish.render(scene,camera,style==='baseline'?.65:0);
}
function geometrySignature(){let vertices=0,objects=0;const transforms:number[][]=[];root.updateMatrixWorld(true);root.traverse(n=>{if(n instanceof THREE.Mesh||n instanceof THREE.Line){objects++;vertices+=n.geometry.getAttribute('position').count;transforms.push(n.matrixWorld.toArray());}});return {vertices,objects,transforms};}
const api={marks:(amount:number)=>{cache.forEach(m=>{(m as THREE.ShaderMaterial).uniforms.markAmount.value=amount;});render();},frame:(s:Style,a=0)=>{angle=a;setStyle(s);return {style,angle,camera:camera.position.toArray(),target:target.toArray(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometry:geometrySignature()};},render,project:(s:number,d:number,y=GROUND_Y)=>{const p=scrollPoint(s,d);p.y=y;p.project(camera);return [(p.x+1)*canvas.width/2,(1-p.y)*canvas.height/2];}};
(window as unknown as {styleLab:typeof api}).styleLab=api;
document.querySelector<HTMLSelectElement>('#style')!.onchange=e=>setStyle((e.target as HTMLSelectElement).value as Style);
document.querySelector('#left')!.addEventListener('click',()=>{angle-=15;render();});document.querySelector('#right')!.addEventListener('click',()=>{angle+=15;render();});document.querySelector('#reset')!.addEventListener('click',()=>{angle=0;render();});window.addEventListener('resize',render);render();
