import * as THREE from 'three';
import {createNeck,NECK_LENGTH,NECK_SEGMENTS} from './previous-neck.js';
import {createLeg,LEG_LENGTHS,HIP_HEIGHT} from './previous-legs.js';
// Neutral anatomy is modeled independently of the painting's feeding pose.
// Local forward is -X. Measurements are proportions, not breed standards.
export const REFERENCE={width:441,height:453,origin:[319,346],scale:100};
export const ANATOMY={body:[.04,1.12,0],bodyRadii:[.83,.60,.48],neckRoot:[-.53,1.08,0],neckLengths:Array(NECK_SEGMENTS).fill(NECK_LENGTH/NECK_SEGMENTS),head:[-.83,1.99,0],hip:[.15,HIP_HEIGHT,.25],femur:LEG_LENGTHS[0],tibia:LEG_LENGTHS[1],shank:LEG_LENGTHS[2],beakTip:[-.315,-.025,0]};
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function bendJoint(a,b,l1,l2,bend=V(1,0,0)){
 const axis=b.clone().sub(a),d=axis.length();axis.normalize();
 const reach=clamp(d,Math.abs(l1-l2)+1e-7,l1+l2-1e-7),along=(l1*l1-l2*l2+reach*reach)/(2*reach);
 const offset=bend.clone().addScaledVector(axis,-bend.dot(axis)).normalize();
 return a.clone().addScaledVector(axis,along).addScaledVector(offset,Math.sqrt(Math.max(0,l1*l1-along*along)));
}
export function aim(mesh,a,b){mesh.position.copy(a);mesh.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());}
export function fixedBone(length,radius,material,name='bone',endRadius=radius*.80){
 const geometry=new THREE.CylinderGeometry(endRadius,radius,length,10);geometry.translate(0,length/2,0);
 const mesh=new THREE.Mesh(geometry,material);mesh.name=name;return mesh;
}
function surfaceUV(g,patch){
 const p=g.attributes.position;g.computeBoundingBox();const box=g.boundingBox,size=box.getSize(V());
 // Both flanks use the same coordinates, independent of the view direction.
 for(let i=0;i<p.count;i++){
  const u=(p.getX(i)-box.min.x)/size.x,v=(p.getY(i)-box.min.y)/size.y;
  let x=patch[0]+u*patch[2],y=patch[1]+(1-v)*patch[3];
  if(patch[0]===239||patch[0]===234){const front=clamp((.23-u)/.16,0,1),lateral=Math.abs(p.getZ(i))/(size.z/2);x=x*(1-front)+(248+lateral*28)*front;y=y*(1-front)+(282+(1-v)*29)*front;}
  g.attributes.uv.setXY(i,x/441,1-y/453);
 }
 return g;
}
function ellipsoid(radii,patch,segments=28){const g=new THREE.SphereGeometry(1,segments,20);g.scale(...radii);return surfaceUV(g,patch);}
function feather(length,width,patch,thickness=.028){
 const g=new THREE.SphereGeometry(1,22,16),p=g.attributes.position;
 for(let i=0;i<p.count;i++){
  const y=p.getY(i),t=(y+1)/2;
  p.setXYZ(i,p.getX(i)*width*(.92-.25*t),t*length,p.getZ(i)*thickness);
 }
 g.computeVertexNormals();return surfaceUV(g,patch);
}
export function createModel({referenceTexture=null,revision='refined'}={}){
 const root=new THREE.Group();root.name='Anatomical mother hen';const parts={},meshes=[],painted=[],details=[],staticLegs=[];
 const clay=new THREE.MeshStandardMaterial({color:'#b9ad94',roughness:1}),darkClay=new THREE.MeshStandardMaterial({color:'#686052',roughness:1});
 const ink=new THREE.MeshBasicMaterial({map:referenceTexture,color:referenceTexture?'#ffffff':'#33362f'}),dark=new THREE.MeshBasicMaterial({color:'#2e312c'}),paper=new THREE.MeshBasicMaterial({color:'#d7ccb0'});
 const group=(name,pos,parent=root)=>{const g=new THREE.Group();g.name=name;g.position.set(...pos);parent.add(g);parts[name]=g;return g;};
 const add=(name,g,parent,position=[0,0,0],rotation=0)=>{const m=new THREE.Mesh(g,clay);m.name=name;m.position.set(...position);m.rotation.z=rotation;parent.add(m);meshes.push(m);painted.push(m);return m;};
 const body=group('body',ANATOMY.body);
 add('Rounded rib cage and abdomen',ellipsoid(ANATOMY.bodyRadii,[239,197,170,128]),body);
 // The breast rounds below the neck, while the back remains roughly horizontal.
 add('Breast feathers',ellipsoid([.42,.47,.385],[234,246,66,78]),body,[-.49,.02,0],-.18);
 add('Rump coverts',ellipsoid([.28,.24,.34],[350,166,52,64]),body,[.62,.19,0],-.3);
 for(const side of [-1,1]){
  const w=group(side===1?'wing':'far wing',[-.35,.21,side*.35],body);
  const covert=add((side>0?'Near':'Far')+' folded wing',ellipsoid([.60,.32,.135],[280,212,119,110]),w,[.39,-.14,side*.064],-.16);
  // Rounded female coverts and overlapping primaries follow the barrel.
  for(let i=0;i<5;i++){
   const f=add((side>0?'Near':'Far')+' primary '+(i+1),feather(.73-i*.045,.095,[295+i*17,244-i*5,32,66]),w,[.16+i*.065,-.19+i*.045,side*(.225-i*.009)],-1.84+i*.06);
   f.rotation.y=side*.09;
  }
 }
 const tail=group('tailFront',[.65,.28,0],body);parts.tailBack=tail;
 add('Overlapping tail coverts',ellipsoid([.16,.36,.235],[375,89,27,66]),tail,[.20,.28,0],-.53);
 for(let i=-2;i<=2;i++){
  const f=add('Tail feather '+(i+3),feather(.83-Math.abs(i)*.06,.19,[369+Math.abs(i)*6,69,32,95],.085),tail,[0,0,i*.087],-.53-Math.abs(i)*.06);
  f.rotation.x=i*.12;f.rotation.y=-i*.20;
 }
 const neckRoot=group('neck',ANATOMY.neckRoot);const neck=createNeck(clay);neckRoot.add(neck.mesh);meshes.push(neck.mesh);painted.push(neck.mesh);
 const head=group('head',ANATOMY.head);
 add('Small rounded skull',ellipsoid([.205,.185,.145],[218,266,12,11]),head);
 add('Cheek',ellipsoid([.14,.12,.15],[218,266,12,11]),head,[.015,-.045,0]);
 const beak=group('beak',[-.145,-.04,0],head);
 const shape=new THREE.Shape();shape.moveTo(0,.065);shape.lineTo(-.17,.015);shape.lineTo(-.13,-.025);shape.lineTo(0,-.035);shape.closePath();
 const bg=new THREE.ExtrudeGeometry(shape,{depth:.075,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.007,bevelThickness:.006});bg.translate(0,0,-.0375);
 const beakMesh=new THREE.Mesh(bg,paper);beakMesh.name='Short pointed beak';beak.add(beakMesh);meshes.push(beakMesh);details.push({mesh:beakMesh,ink:paper});
 // The reference suppresses red; comb and wattles remain small charcoal accents.
 for(let i=0;i<4;i++){
  const comb=add('Small comb lobe '+i,ellipsoid([.044,.052+(i===1?.025:0),.028],[209,264,17,15]),head,[-.11+i*.055,.177,0],i*.07);
 }
 for(const side of [-1,1]){
  add((side===1?'Near':'Far')+' wattle',ellipsoid([.042,.074,.025],[218,270,15,20]),head,[-.08,-.172,side*.045],-.12);
  for(const [name,radius,depth,color,material] of [['eye rim',.035,.009,'#d9caa3',null],['eye',.019,.011,'#161a17',null]]){
   const m=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),new THREE.MeshBasicMaterial({color}));m.geometry.scale(radius,radius,depth);m.position.set(-.075,.036,side*(.137+(name==='eye'?.008:0)));m.name=(side>0?'Near':'Far')+' '+name;head.add(m);meshes.push(m);details.push({mesh:m,ink:m.material});
  }
 }
 // The neutral study and moving hen share the same sculpted leg meshes.
 for(const side of [-1,1]){
  const leg=createLeg(side,{clay,darkClay,dark}),g=group(side>0?'near foot':'far foot',[0,0,0]);g.add(leg.group);meshes.push(...leg.meshes);staticLegs.push(leg);
  const hip=V(.15,HIP_HEIGHT,side*.25),knee=hip.clone().add(V(-Math.cos(.56)*LEG_LENGTHS[0],-Math.sin(.56)*LEG_LENGTHS[0],0)),foot=V(.06,.015,side*.255),hock=bendJoint(knee,foot,LEG_LENGTHS[1],LEG_LENGTHS[2]);leg.update(hip,knee,hock,foot);
 }
 let mode='clay';
 function setMode(value){mode=value;for(const m of painted)m.material=value==='ink'?ink:clay;for(const leg of staticLegs)leg.setMode(value);for(const d of details)d.mesh.material=value==='ink'?d.ink:(d.mesh.name.includes('eye')?d.ink:darkClay);}
 function setNeck(headPosition=V(...ANATOMY.head),pitch=0,yaw=0,base=V(...ANATOMY.neckRoot)){
  neckRoot.position.copy(base);
  head.position.copy(headPosition);head.rotation.set(0,yaw,pitch);
  // Attach behind the skull. The feather collar no longer enters the jaw.
  const atlas=V(.085,-.035,0).applyEuler(head.rotation).add(headPosition);
  const chain=neck.pose(atlas.clone().sub(base),pitch).map(p=>V(...p).add(base).toArray());
  return{base:base.toArray(),end:atlas.toArray(),points:chain,lengths:ANATOMY.neckLengths};
 }
 const rest=new Map(Object.values(parts).map(g=>[g,g.position.clone()]));
 function setExploded(value){for(const [g,p]of rest)g.position.copy(p);if(value){parts.wing.position.z+=.45;parts['far wing'].position.z-=.45;parts.tailFront.position.x+=.35;parts.head.position.y+=.25;parts['near foot'].position.y-=.15;parts['far foot'].position.y-=.15;}}
 setNeck();setMode('clay');return{root,parts,meshes,setMode,setExploded,setNeck,materials:{clay,darkClay,ink,dark},anatomy:ANATOMY};
}
