import * as THREE from 'three';
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
export const LEG_LENGTHS=[.36,.50,.38];
export const LEG_RADII={thigh:.125,drumstick:.115,shank:.043,toe:.019};
export const HIP_HEIGHT=.98;
export function aimBone(mesh,a,b){mesh.position.copy(a);mesh.quaternion.setFromUnitVectors(V(0,1,0),b.clone().sub(a).normalize());}
function shapedBone(length,profile,material,name){
 const g=new THREE.LatheGeometry(profile.map(([t,r])=>new THREE.Vector2(r,t*length)),12),mesh=new THREE.Mesh(g,material);mesh.name=name;return mesh;
}
function tube(points,radius,material,name){const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),12,radius,7,false),material);mesh.name=name;return mesh;}
export function createLeg(side,materials){
 const {clay,darkClay,dark}=materials,group=new THREE.Group(),name=side<0?'Far':'Near',meshes=[];
 const thigh=shapedBone(LEG_LENGTHS[0],[[0,.08],[.18,.13],[.55,.12],[.88,.08],[1,.065]],clay,name+' feathered thigh');
 const drumstick=shapedBone(LEG_LENGTHS[1],[[0,.09],[.2,.12],[.45,.107],[.68,.08],[.86,.055],[1,.045]],clay,name+' feathered drumstick');
 const shank=shapedBone(LEG_LENGTHS[2],[[0,.044],[.10,.047],[.30,.037],[.72,.035],[.90,.046],[1,.045]],darkClay,name+' tapered shank');
 const hock=new THREE.Mesh(new THREE.SphereGeometry(.049,14,10),darkClay);hock.name=name+' rounded hock';
 const foot=new THREE.Group();foot.name=name+' articulated foot';
 group.add(thigh,drumstick,shank,hock,foot);meshes.push(thigh,drumstick,shank,hock);
 const pad=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),darkClay);pad.geometry.scale(.060,.030,.056);pad.position.y=.014;pad.name=name+' foot pad';foot.add(pad);meshes.push(pad);
 const toes=[];
 for(const [i,[x,z]]of [[-.205,-.115],[-.255,0],[-.208,.112],[.105,.035]].entries()){
  const joint=new THREE.Group();joint.name=name+' toe '+(i+1);foot.add(joint);
  const a=V(-.018,.016,(i-1)*.012),b=V(x*.47,.032,z*.52),c=V(x*.88,.004,z*.93);
  if(i===3)a.set(.016,.010,.012);
  const toe=tube([a,b,c],i===3?.014:.018,darkClay,name+' curved toe '+(i+1));joint.add(toe);meshes.push(toe);
  const tip=V(x,-.003,z),claw=tube([c,c.clone().lerp(tip,.55).add(V(0,.004,0)),tip],.009,darkClay,name+' claw '+(i+1));joint.add(claw);meshes.push(claw);toes.push(joint);
 }
 // Raised plates sit on the front of the shank; they are not full metal rings.
 for(let i=1;i<7;i++){
  const m=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),darkClay);m.geometry.scale(.006,.015,.028);m.position.set(-.038,i*LEG_LENGTHS[2]/7,0);m.name=name+' shank scale '+i;shank.add(m);meshes.push(m);
 }
 function setMode(mode){for(const m of meshes)m.material=mode==='ink'?dark:darkClay;thigh.material=mode==='ink'?dark:clay;drumstick.material=mode==='ink'?dark:clay;}
 function update(hip,knee,hockPosition,ankle,yaw=0,lift=0){
  aimBone(thigh,hip,knee);aimBone(drumstick,knee,hockPosition);aimBone(shank,hockPosition,ankle);hock.position.copy(hockPosition);foot.position.copy(ankle);foot.rotation.y=yaw;
  const curl=.35*lift/(lift+.10);for(let i=0;i<toes.length;i++)toes[i].rotation.z=i===3?-curl*.7:curl;
 }
 return{group,meshes,update,setMode};
}
