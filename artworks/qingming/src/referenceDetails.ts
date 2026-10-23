import * as THREE from "three";
import { paintMaterial, createDryInk } from "./paintMaterial";

// Visible evidence in the supplied Chicago crop; the obscured back faces and
// exact headcounts remain modelling interpretations.
type P = [number, number, number];
const timber=paintMaterial(0x987b50), light=paintMaterial(0xc0a87a),
  dark=paintMaterial(0x61533d), cloth=paintMaterial(0xc8bb96), ink=createDryInk(.55);
cloth.side=THREE.DoubleSide;
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
  const w=width*.44,d=depth*.43,stage=height*.52,eave=height*.57,peak=height*.72;
  box(g,[width,.07,depth],[0,.035,0],light);
  // Narrow occupied lower bays remain open between real posts and beams.
  for(const x of [-w,-w*.5,0,w*.5,w])for(const z of [-d,d]){
    rod(g,[x,0,z],[x,eave,z],.035,dark);
    if(Math.abs(x)>w*.9)for(let y=.3;y<stage;y+=.24)rod(g,[x-.035,y,z],[x+.035,y,z],.012,light);
  }
  for(const y of [height*.27,stage])for(const z of [-d,d])rod(g,[-w,y,z],[w,y,z],.028,dark);
  for(const x of [-w,w])for(const y of [height*.27,stage])rod(g,[x,y,-d],[x,y,d],.028,dark);
  for(const side of [-1,1])box(g,[width*.91,.045,depth*.20],[0,stage,side*depth*.34],light);
  // A low swept tile canopy around the stage, with its corners gently lifted.
  const positions:number[]=[];
  const roofY=(x:number,z:number)=>eave+(peak-eave)*(1-1.35*Math.abs(z)/(d+.1)+.35*(Math.abs(z)/(d+.1))**2)+.16*(Math.abs(x)/(w+.1))**5;
  const point=(x:number,z:number):P=>[x,roofY(x,z),z];
  for(let i=0;i<24;i++)for(let j=0;j<20;j++){
    const x0=-(w+.1)+2*(w+.1)*i/24,x1=-(w+.1)+2*(w+.1)*(i+1)/24,z0=-(d+.1)+2*(d+.1)*j/20,z1=-(d+.1)+2*(d+.1)*(j+1)/20;
    positions.push(...point(x0,z0),...point(x1,z0),...point(x1,z1),...point(x0,z0),...point(x1,z1),...point(x0,z1));
  }
  const geo=new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
  const roof=new THREE.Mesh(geo,dark);roof.name="swept-staging-roof";g.add(roof);
  for(let x=-w;x<=w+.01;x+=.12)line(g,Array.from({length:21},(_,i)=>{const z=-(d+.1)+2*(d+.1)*i/20;return [x,roofY(x,z)+.012,z] as P;}));
  for(const z of [-d-.1,d+.1])line(g,Array.from({length:25},(_,i)=>point(-(w+.1)+2*(w+.1)*i/24,z)));
  // Closely lashed verticals and ledgers continue above the roof. They taper
  // into an irregular forest of poles, rather than a single box-shaped tower.
  for(const side of [-1,1])for(let j=0;j<9;j++){
    const x=-w+j*w/4,z=side*d,top=height*(1.60+.32*((j*7)%9)/8);
    rod(g,[x,.03,z],[x+.025*Math.sin(j*2.3),top,z],.016,j%2?timber:dark);
    for(let y=stage;y<top-.03;y+=.22){
      const spread=Math.max(.025,.16*(1-(y-stage)/(top-stage)));
      rod(g,[x-spread,y,z],[x+spread,y,z],.011,timber);
      if(y<height*1.44&&j<8)rod(g,[x,y,z],[x+w/4,y+.015*Math.sin(j),z],.012,timber);
      if(j%2===0)line(g,[[x-.028,y-.018,z-.02],[x+.028,y+.02,z+.02],[x-.025,y+.035,z-.02]]);
    }
    rod(g,[x-.18,height*1.35,z],[x,top-.02,z],.012,timber);
    rod(g,[x+.18,height*1.35,z],[x,top-.02,z],.012,timber);
  }
  for(const side of [-1,1])for(let j=0;j<6;j++){
    const x=side*w,z=-d+j*2*d/5,top=height*(1.43+(j%3)*.09);
    rod(g,[x,.03,z],[x,top,z],.014,light);
    for(let y=stage;y<height*1.39;y+=.22)if(j<5)rod(g,[x,y,z],[x,y+.018,z+2*d/5],.011,timber);
  }
  for(const z of [-d,d])for(let j=0;j<4;j++){
    const x=-w+j*w/2;
    rod(g,[x,stage+.1,z],[x+w/2,height*1.37,z],.011,light);
    rod(g,[x,height*1.37,z],[x+w/2,stage+.1,z],.011,light);
  }
  // Interior ladder and tied supplies occupy the staging, not the street.
  for(const x of [-.16,.16])rod(g,[x,.03,d*.9],[x,stage,d*.45],.018);
  for(let y=.16;y<stage;y+=.2)rod(g,[-.16,y,d*(.9-.45*y/stage)],[.16,y,d*(.9-.45*y/stage)],.012);
  for(let j=0;j<5;j++)rod(g,[-w*.85,.1+j*.025,-d*.15],[w*.7,.1+j*.025,-d*.15],.025);
  g.userData.stagingHeight=stage;g.userData.maximumHeight=height*1.92;
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
  const roofHeight=style==="freight"?1.08:1.115;
  crew.push({x:0,y:roofHeight,z:-length*.11,role:"roof",facing:1.1},
    {x:0,y:roofHeight,z:length*.105,role:"roof",facing:-1.2},
    {x:-width*.2,y:.34,z:-length*.31,role:"haul",facing:Math.PI/2});
  if(style==="freight")crew.push(
    {x:width*.22,y:.34,z:length*.45,role:"haul",facing:Math.PI/2},
    {x:-width*.22,y:.34,z:length*.29,role:"haul",facing:Math.PI/2},
    {x:0,y:roofHeight,z:0,role:"roof",facing:Math.PI/2});
  return crew;
}
export function addCrewEquipment(g:THREE.Object3D,length:number,width:number,style:string){
  if(style==="freight" || style==="cabin"){
    // Narrow roof gangway supports the feet of roof workers on the curved cabin.
    const roofHeight=style==="freight"?1.08:1.115;
    box(g,[width*.28,.035,length*.35],[0,roofHeight-.0175,0],light);
    for(const end of [-1,1])rod(g,[0,.35,end*length*.34],[0,1.02,end*length*.16],.018);
  }
  // Stowed/working poles and hauling lines remain inside the vessel envelope.
  rod(g,[-width*.18,.34,length*.39],[-width*.35,1.04,length*.25],.012);
  line(g,[[-width*.2,.82,-length*.31],[width*.61,1.08,length*.3],[width*.22,.84,length*.45]]);
}

/** Hinged mast with a battened sail: gather the cloth, then lower the spar. */
export function buildLoweringRig(length:number,width:number){
  const g=new THREE.Group();g.name="lowering-sail-rig";
  g.position.set(width*.37,.34,-length*.29);
  const height=Math.min(3.2,length*.55), hinge=.72;
  const base=new THREE.Group();base.name="mast-tabernacle";g.add(base);
  // Two fixed timber cheeks, cross pin and a heel socket make the pivot visible.
  box(base,[.25,.09,.25],[0,.045,0],dark);
  for(const x of [-.085,.085])box(base,[.065,hinge+.12,.13],[x,(hinge+.12)/2,0]);
  rod(base,[-.16,hinge,0],[.16,hinge,0],.033,dark);
  for(const y of [.19,.46])box(base,[.25,.035,.16],[0,y,0],dark);
  const mast=new THREE.Group();mast.name="mast-hinge";mast.position.y=hinge;g.add(mast);
  const spar=new THREE.Group();spar.name="folding-mast-spar";mast.add(spar);
  rod(spar,[0,-.1,0],[0,height,0],.038,dark);
  for(const y of [.1,height-.12])box(spar,[.1,.045,.095],[0,y,0],light);
  const sail=new THREE.Group();sail.name="battened-sail";sail.position.set(0,.28,.055);mast.add(sail);
  const sailHeight=height-.5, breadth=width*1.75;
  // An irregular quadrilateral of stitched cloth, visibly bowed between battens.
  // Furling compresses vertical spacing only; wooden battens retain their length.
  const point=(u:number,t:number):P=>[
    (u-.43)*breadth*(1-.2*t),
    t*sailHeight + u*.11,
    .12*Math.sin(u*Math.PI)*Math.sin(t*Math.PI*5)+.025*Math.sin(u*Math.PI*12),
  ];
  const positions:number[]=[];
  for(let j=0;j<18;j++)for(let k=0;k<25;k++){
    const a=point(j/18,k/25),b=point((j+1)/18,k/25),c=point((j+1)/18,(k+1)/25),d=point(j/18,(k+1)/25);
    positions.push(...a,...b,...c,...a,...c,...d);
  }
  const geo=new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
  const canvas=new THREE.Mesh(geo,cloth);canvas.name="pleated-canvas";sail.add(canvas);
  for(let j=0;j<=6;j++)line(sail,Array.from({length:26},(_,k)=>point(j/6,k/25)));
  for(let k=0;k<=5;k++){
    rod(sail,point(0,k/5),point(1,k/5),k===5?.022:.012,k===5?dark:timber);
    line(sail,Array.from({length:19},(_,j)=>point(j/18,k/5)));
  }
  const ropes=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(new Float32Array(24),3)),ink);
  ropes.name="mast-hauling-ropes";ropes.frustumCulled=false;g.add(ropes);
  g.userData.mastHeight=height;g.userData.boatLength=length;g.userData.boatWidth=width;
  updateLoweringRig(g,0);
  return g;
}
const ease=(x:number)=>{const t=THREE.MathUtils.clamp(x,0,1);return t*t*(3-2*t);};
export function loweringRigAngle(distanceFromBridge:number){
  return Math.PI/2-.035-(Math.PI/2-.065)*ease((distanceFromBridge-4.8)/3.2);
}
export function updateLoweringRig(g:THREE.Object3D,distanceFromBridge:number){
  const mast=g.getObjectByName("mast-hinge")!,sail=g.getObjectByName("battened-sail")!;
  mast.rotation.x=loweringRigAngle(distanceFromBridge);
  sail.scale.y=.075+.925*ease((distanceFromBridge-8)/2.5);
  // Ropes stay anchored to the deck, rather than rotating with the mast.
  const {mastHeight:height,boatLength:length,boatWidth:width}=g.userData;
  const top=new THREE.Vector3(0,height,0).applyEuler(mast.rotation).add(mast.position);
  const head=new THREE.Vector3(0,.28+(height-.5)*sail.scale.y,.055).applyEuler(mast.rotation).add(mast.position);
  const positions:number[]=[];
  for(const [end,anchor] of [[top,[-width*.65,.08,length*.66]],[top,[0,.08,-length*.12]],
    [head,[-width*.65,.08,length*.66]],[head,[width*.12,.08,0]]] as [THREE.Vector3,P][]){
    positions.push(...anchor,...end.toArray());
  }
  const ropes=g.getObjectByName("mast-hauling-ropes") as THREE.LineSegments;
  const attr=ropes.geometry.getAttribute("position") as THREE.BufferAttribute;
  attr.set(positions);attr.needsUpdate=true;
}

/** Tall decorated gateway read from anchor 5 of the supplied composition plan. */
export function buildOrnateGate(width:number,depth:number,height:number){
  const g=new THREE.Group();g.name="ornate-street-gate";
  const w=width*.43;
  // Paired posts leave the passage open; stacked crossbeams carry ornamental
  // bracket work and tall finials. No scaffold decks, ladders or boat rigging.
  for(const x of [-w,w])for(const z of [-depth*.22,depth*.22]){
    box(g,[.23,.18,.25],[x,.09,z],light);
    rod(g,[x,.12,z],[x,height+.8,z],.047,dark);
    for(const y of [height*.59,height*.79,height])
      box(g,[.20,.07,.30],[x,y,z],light);
  }
  for(const z of [-depth*.24,depth*.24]){
    for(const y of [height*.6,height*.8,height]){
      box(g,[width+.25,.12,.13],[0,y,z],dark);
      for(let i=0;i<11;i++){
        const x=-w+i*w/5;
        rod(g,[x,y+.03,z],[x,y+.26,z],.012,light);
        rod(g,[x-.08,y+.05,z],[x+.08,y+.23,z],.009);
      }
      for(const side of [-1,1]){
        rod(g,[side*w*.8,y,z],[side*(w+.3),y+.2,z],.027,dark);
        rod(g,[side*(w+.3),y+.2,z],[side*(w+.43),y+.34,z],.019,dark);
      }
    }
    box(g,[width*.49,.3,.06],[0,height*.71,z+.04],dark);
    for(let i=0;i<3;i++)box(g,[.13,.17,.025],[(i-1)*width*.13,height*.71,z+.08],light);
    for(let i=0;i<5;i++){
      const x=(i-2)*width*.22,top=height+.65+(i%2===0?.28:.6);
      rod(g,[x,height,z],[x,top,z],.021,dark);
      rod(g,[x-.14,height+.05,z],[x,top-.07,z],.014);
      rod(g,[x+.14,height+.05,z],[x,top-.07,z],.014);
      box(g,[.07,.16,.07],[x,top,z],light);
    }
  }
  for(const x of [-w,w])for(const y of [height*.6,height])rod(g,[x,y,-depth*.24],[x,y,depth*.24],.03);
  return g;
}
