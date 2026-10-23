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

// The painting's 彩楼欢门: a pole lattice raised on the flat top of the inn's
// gatehouse, tiered and stepped in, ending in clusters of pointed spires with
// splayed corner poles. It advertises the inn; it is not a building site.
export function buildFestoonGate(width:number,depth:number,eave:number){
  const g=new THREE.Group();g.name="festooned-inn-gateway";
  const w=width/2,d=depth/2,overhang=.36,rise=.42;
  box(g,[width,.07,depth],[0,.035,0],light);
  // Open gatehouse: framed bays, a closed rear wall and the inn's sign board.
  for(const x of [-w*.9,0,w*.9])for(const z of [-d*.9,d*.9])rod(g,[x,0,z],[x,eave,z],.045,dark);
  for(const x of [-w*.9,w*.9])rod(g,[x,0,0],[x,eave,0],.04,dark);
  for(const z of [-d*.9,d*.9])box(g,[width*.94,.09,.07],[0,eave-.06,z],dark);
  for(const x of [-w*.9,w*.9])box(g,[.07,.09,depth*.94],[x,eave-.06,0],dark);
  box(g,[width*.86,eave*.78,.05],[0,eave*.39,-d*.88],light);
  box(g,[.05,eave*.78,depth*.5],[-w*.88,eave*.39,-d*.42],light);
  box(g,[width*.36,eave*.5,.02],[-w*.42,eave*.66,d*.9],cloth);
  const sign=box(g,[.24,.62,.035],[w*.62,eave*.42,d*.96],light);
  line(sign,[[-.1,-.29,.02],[-.1,.29,.02],[.1,.29,.02],[.1,-.29,.02],[-.1,-.29,.02]]);
  // Flat-topped hip roof with a concave sweep and lifted corners.
  const X=w+overhang,Z=d+overhang,X2=w*.78,Z2=d*.78,top=eave+rise;
  const corners:[number,number][]=[[-1,1],[1,1],[1,-1],[-1,-1]];
  const positions:number[]=[];
  const roofPoint=(face:number,a:number,t:number):P=>{
    const [ax,az]=corners[face],[bx,bz]=corners[(face+1)%4];
    const ox=(ax+(bx-ax)*a)*X,oz=(az+(bz-az)*a)*Z,ix=(ax+(bx-ax)*a)*X2,iz=(az+(bz-az)*a)*Z2;
    const lift=.13*(1-t)**2*(2*Math.abs(a-.5))**4;
    return [ox+(ix-ox)*t,eave+rise*t**1.8+lift,oz+(iz-oz)*t];
  };
  for(let face=0;face<4;face++){
    for(let i=0;i<12;i++)for(let j=0;j<6;j++){
      const a0=i/12,a1=(i+1)/12,t0=j/6,t1=(j+1)/6;
      positions.push(...roofPoint(face,a0,t0),...roofPoint(face,a1,t0),...roofPoint(face,a1,t1),
        ...roofPoint(face,a0,t0),...roofPoint(face,a1,t1),...roofPoint(face,a0,t1));
    }
    for(let i=1;i<12;i++)line(g,Array.from({length:7},(_,j)=>{const p=roofPoint(face,i/12,j/6);return [p[0],p[1]+.012,p[2]] as P;}));
    line(g,Array.from({length:13},(_,i)=>roofPoint(face,i/12,0)));
  }
  const geo=new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();
  const roof=new THREE.Mesh(geo,dark);roof.name="gatehouse-roof";g.add(roof);
  box(g,[2*X2,.06,2*Z2],[0,top,0],timber);
  for(let i=0;i<=8;i++)for(const [x,z] of [[-X2+2*X2*i/8,Z2],[-X2+2*X2*i/8,-Z2]] as [number,number][])rod(g,[x,top,z],[x,top+.26,z],.01,dark);
  for(const y of [.13,.26])for(const [a,b] of [[[-X2,Z2],[X2,Z2]],[[X2,Z2],[X2,-Z2]],[[X2,-Z2],[-X2,-Z2]],[[-X2,-Z2],[-X2,Z2]]] as [number,number][][])
    rod(g,[a[0],top+y,a[1]],[b[0],top+y,b[1]],.012,dark);
  // Three stepped tiers of lashed poles and ledgers.
  let base=top+.03,tip=base;
  for(const [k,[sx,sz,h]] of [[.94,.92,1.6],[.74,.68,1.25],[.52,.46,1.0]].entries()){
    const hx=X2*sx,hz=Z2*sz,ring:[number,number][]=[];
    const across=8-2*k,deep=6-2*k;
    for(let i=0;i<=across;i++)ring.push([-hx+2*hx*i/across,hz],[-hx+2*hx*i/across,-hz]);
    for(let i=1;i<deep;i++)ring.push([-hx,-hz+2*hz*i/deep],[hx,-hz+2*hz*i/deep]);
    for(const [n,[x,z]] of ring.entries())rod(g,[x,base,z],[x+.02*Math.sin(n*2.1+k),base+h,z],.017,n%3?dark:timber);
    for(let y=.14;y<h;y+=.16)for(const [a,b] of [[[-hx,hz],[hx,hz]],[[hx,hz],[hx,-hz]],[[hx,-hz],[-hx,-hz]],[[-hx,-hz],[-hx,hz]]] as [number,number][][])
      rod(g,[a[0],base+y,a[1]],[b[0],base+y,b[1]],.012,dark);
    // Cross-bracing makes each tier read as one lashed frame from afar.
    for(const z of [-hz,hz])for(let i=0;i<across;i+=2)rod(g,[-hx+2*hx*i/across,base,z],[-hx+2*hx*(i+1)/across,base+h,z],.009,timber);
    // Corner poles splay outward like the painting's spiky silhouette.
    for(const [cx,cz] of corners)rod(g,[cx*hx,base+h*.2,cz*hz],[cx*(hx+.42),base+h+.5,cz*(hz+.2)],.01,timber);
    base+=h;
    if(k===2)for(const [n,[x,z]] of ring.entries()){
      const spire=.7+.6*((n*5)%7)/6,peak:P=[x*.9,base+spire,z*.9];
      if(n%2)continue;
      rod(g,[x,base,z],peak,.015,dark);
      for(const side of [-1,1])rod(g,[x+side*.1,base,z],peak,.01,dark);
      for(let y=.12;y<spire-.08;y+=.14){const half=.09*(1-y/spire);rod(g,[x*.97-half,base+y,z*.97],[x*.97+half,base+y,z*.97],.006,timber);}
      tip=Math.max(tip,peak[1]);
    }
  }
  // An outrigger carries the striped hanging banner over the street side.
  const arm=top+1.0;
  rod(g,[w*.7,arm,d*.3],[w+1.6,arm+.06,d*.3],.014,dark);
  const banner=new THREE.Group();banner.position.set(w+1.15,arm-.55,d*.3);banner.name="striped-inn-banner";g.add(banner);
  box(banner,[.72,1.0,.015],[0,0,0],cloth);
  for(const x of [-.26,0,.26])box(banner,[.11,.98,.02],[x,0,.003],dark);
  g.userData.maximumHeight=tip;
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
