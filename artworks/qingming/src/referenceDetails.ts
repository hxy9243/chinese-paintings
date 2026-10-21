import * as THREE from "three";
import { paintMaterial, createDryInk } from "./paintMaterial";

// Visible evidence in the supplied Chicago crop; the obscured back faces and
// exact headcounts remain modelling interpretations.
type P = [number, number, number];
const timber=paintMaterial(0x987b50), light=paintMaterial(0xc0a87a),
  dark=paintMaterial(0x61533d), cloth=paintMaterial(0xc8bb96), ink=createDryInk(.55);
function box(g:THREE.Object3D,size:P,at:P,m:THREE.Material=timber){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),m);mesh.position.set(...at);g.add(mesh);return mesh;
}
function rod(g:THREE.Object3D,a:P,b:P,r=.016,m:THREE.Material=timber){
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),delta=B.clone().sub(A);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r*.8,r,delta.length(),6),m);
  mesh.position.copy(A.add(B).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());g.add(mesh);return mesh;
}
function line(g:THREE.Object3D,points:P[]){
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),ink));
}

export function buildConstruction(width:number,depth:number,height:number){
  const g=new THREE.Group();g.name="open-timber-construction";
  const w=width*.39,d=depth*.38;
  box(g,[width,.09,depth],[0,.045,0],light);
  // Unfinished timber bays: real open space between posts and roof trusses.
  for(const x of [-w,0,w])for(const z of [-d,d])
    rod(g,[x,0,z],[x,height,z],.045);
  for(const y of [.95,1.9,height]){
    for(const z of [-d,d])rod(g,[-w,y,z],[w,y,z],.04);
    for(const x of [-w,w])rod(g,[x,y,-d],[x,y,d],.04);
  }
  for(const x of [-w,0,w]){
    rod(g,[x,height,-d],[x,height+.52,0],.035);
    rod(g,[x,height+.52,0],[x,height,d],.035);
    rod(g,[x,height,-d],[x,height,d],.028);
  }
  rod(g,[-w,height+.52,0],[w,height+.52,0],.04);
  // Sparse purlins, an incomplete tile patch and exposed rafter ends.
  for(const z of [-d,-d*.5,d*.5,d])rod(g,[-w,height+.52*(1-Math.abs(z/d)),z],[w,height+.52*(1-Math.abs(z/d)),z],.023);
  for(let x=-w;x<=w;x+=.18)for(const side of [-1,1])
    rod(g,[x,height+.52,0],[x,height-.07,side*(d+.08)],.015,light);
  for(let j=0;j<4;j++)for(let k=0;k<4;k++){
    const z=.15+k*.13,y=height+.52*(1-z/d)+.025;
    const tile=box(g,[.15,.028,.16],[-w+.09+j*.15,y,z],dark);
    tile.rotation.x=Math.atan(.52/d);
  }
  // Bamboo staging extends above the frame, with ties and diagonal bracing.
  for(const x of [-width*.49,width*.49])for(const z of [-depth*.49,depth*.49]){
    rod(g,[x,0,z],[x+.025,height+1.05+(x>0?.1:0),z],.022,light);
    for(const y of [.55,1.25,2.05,2.8,3.45]){
      rod(g,[-width*.49,y,z],[width*.49,y,z],.014,light);
      rod(g,[x,y,-depth*.49],[x,y,depth*.49],.014,light);
      for(const dy of [-.018,.018])line(g,[[x-.03,y+dy,z-.03],[x+.03,y+dy,z+.03]]);
    }
  }
  for(const z of [-depth*.49,depth*.49])for(const y of [.1,1.3,2.1])
    rod(g,[-width*.48,y,z],[width*.48,y+1.15,z],.013,light);
  for(const y of [1.25,2.05])for(const side of [-1,1])
    box(g,[width,.045,.29],[0,y,side*depth*.41],light);
  // Ladder is inside the worksite footprint, not across the pedestrian route.
  for(const x of [-.19,.19])rod(g,[x,0,depth*.43],[x,2.07,depth*.12],.021);
  for(let j=1;j<11;j++)rod(g,[-.19,j*.19,depth*.43-j*.028],[.19,j*.19,depth*.43-j*.028],.017);
  for(let j=0;j<5;j++)rod(g,[-w,.11+j*.025,-d*.3],[w*.8,.11+j*.025,-d*.3],.035);
  for(let j=0;j<3;j++){
    const fabric=box(g,[.2,.65+j*.1,.015],[-.4+j*.36,1.65,depth*.49],cloth);
    fabric.rotation.z=(j-1)*.07;
  }
  return g;
}

export interface CrewStation { x:number; y:number; z:number; role:"steer"|"haul"|"roof"|"passenger"; facing:number }
export function boatCrewStations(length:number,width:number,style:string):CrewStation[]{
  const crew:CrewStation[]=[
    {x:0,y:.34,z:-length*.39,role:"steer",facing:Math.PI},
    {x:-width*.17,y:.34,z:length*.39,role:"haul",facing:0},
  ];
  if(style==="skiff")return crew;
  crew.push({x:width*.18,y:.34,z:length*.29,role:"passenger",facing:-.6});
  if(style==="canopy")return crew;
  crew.push({x:0,y:1.025,z:-length*.11,role:"roof",facing:1.1},
    {x:0,y:1.025,z:length*.105,role:"roof",facing:-1.2},
    {x:-width*.2,y:.34,z:-length*.31,role:"haul",facing:Math.PI/2});
  if(style==="freight")crew.push(
    {x:width*.22,y:.34,z:length*.45,role:"haul",facing:Math.PI/2},
    {x:-width*.22,y:.34,z:length*.29,role:"haul",facing:Math.PI/2},
    {x:0,y:1.025,z:0,role:"roof",facing:Math.PI/2});
  return crew;
}
export function addCrewEquipment(g:THREE.Object3D,length:number,width:number,style:string){
  if(style==="freight" || style==="cabin"){
    // Narrow roof gangway supports the feet of roof workers on the curved cabin.
    box(g,[width*.28,.035,length*.35],[0,1.007,0],light);
    for(const end of [-1,1])rod(g,[0,.35,end*length*.34],[0,1.02,end*length*.16],.018);
  }
  // Stowed/working poles and hauling lines remain inside the vessel envelope.
  rod(g,[-width*.18,.34,length*.39],[-width*.35,1.04,length*.25],.012);
  line(g,[[-width*.2,.82,-length*.31],[width*.61,1.08,length*.3],[width*.22,.84,length*.45]]);
}

/** Pivoting, partly furled rig for the crowded freight vessel. */
export function buildLoweringRig(length:number,width:number){
  const g=new THREE.Group();g.name="lowering-sail-rig";
  g.position.set(width*.22,.36,-length*.26);
  const tip:P=[0,2.05,length*.43];
  rod(g,[0,0,0],tip,.035,dark);
  // Slack cloth is folded into uneven hanging panels, not a rigid triangular flag.
  const vertices:number[]=[];
  const point=(u:number,t:number):P => [
    width*(-.48+u*.72),
    .3+t*1.55-.23*Math.sin(u*Math.PI)+.06*Math.cos(u*Math.PI*10),
    length*(.04+t*.37)+.055*Math.sin(u*Math.PI*6),
  ];
  for(let j=0;j<16;j++)for(let k=0;k<12;k++){
    const a=point(j/16,k/12),b=point((j+1)/16,k/12),c=point((j+1)/16,(k+1)/12),d=point(j/16,(k+1)/12);
    vertices.push(...a,...b,...c,...a,...c,...d);
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
  const fabric=new THREE.Mesh(geo,cloth);fabric.name="hanging-folded-sail";g.add(fabric);
  for(let j=0;j<7;j++)line(g,Array.from({length:13},(_,k)=>point(j/6,k/12)));
  for(const t of [.15,.5,.82])rod(g,point(0,t),point(1,t),.011,timber);
  for(const side of [-1,1])line(g,[[side*width*.3,0,length*.1],tip,[side*width*.3,.08,length*.67]]);
  return g;
}
export function loweringRigAngle(distanceFromBridge:number){
  const t=THREE.MathUtils.clamp((distanceFromBridge-3.5)/3,0,1);
  return .55-.5*t*t*(3-2*t);
}
