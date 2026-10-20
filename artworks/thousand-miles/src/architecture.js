import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {box,pipe,taperedTube} from './geometry.js';
import {terrainHeight,bridgeBanks} from './terrain.js';
function hipProfile(w,d,base,rise,{ridge=.27,curve=1.42,upturn=.22}={}){
 return(x,z)=>{const s=Math.max(Math.max(0,(Math.abs(x)-w*ridge)/(w*(1-ridge))),Math.abs(z)/d);return base+rise*Math.pow(Math.max(0,1-s),curve)+upturn*Math.pow(Math.abs(x/w)*Math.abs(z/d),5);};
}
function roofGeometry(w,d,base,rise,hole=null,options={}){
 const {nx=40,nz=32,heightField=null,include=null}=options,p=[],uv=[],ix=[];
 const height=heightField||hipProfile(w,d,base,rise,options);
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){const x=(i/nx*2-1)*w,z=(j/nz*2-1)*d;p.push(x,height(x,z),z);uv.push(i/nx*8,j/nz*6);}
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const x=((i+.5)/nx*2-1)*w,z=((j+.5)/nz*2-1)*d;if((hole&&Math.abs(x)<hole[0]&&Math.abs(z)<hole[1])||(include&&!include(x,z)))continue;const a=j*(nx+1)+i,b=a+1,c=a+nx+2,q=a+nx+1;ix.push(a,c,b,a,q,c);}
 const n=p.length/3;
 for(let i=0;i<n;i++){p.push(p[i*3],p[i*3+1]-.14,p[i*3+2]);uv.push(uv[i*2],uv[i*2+1]);}
 const top=ix.slice();for(let i=0;i<top.length;i+=3)ix.push(top[i]+n,top[i+2]+n,top[i+1]+n);
 const edges=new Map();for(let i=0;i<top.length;i+=3)for(let j=0;j<3;j++){const a=top[i+j],b=top[i+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}
 for(const [a,b] of edges.values())ix.push(a,b+n,b,a,a+n,b+n);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return {geometry:g,height};
}

export function batchGroup(root){
 const buckets=new Map(),counts={};root.updateMatrixWorld(true);
 for(const o of [...root.children]){if(!o.isMesh)continue;o.updateMatrix();const g=o.geometry.clone().applyMatrix4(o.matrix);if(!buckets.has(o.material))buckets.set(o.material,[]);buckets.get(o.material).push(g);counts[o.name]=(counts[o.name]||0)+1;root.remove(o);o.geometry.dispose();}
 for(const [mat,geos]of buckets){const mesh=new THREE.Mesh(mergeGeometries(geos),mat);geos.forEach(g=>g.dispose());mesh.name=mat.name+' · modeled members';mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}root.userData.modeledParts=counts;return root;
}
export function pavilion(m,{width=9,depth=6,height=3.2,attic=true,name='Open waterside pavilion'}={}){
 const g=new THREE.Group();g.name=name;g.add(box(width,.18,depth,m.timber,0,.08,0,'Deck boards'));
 for(const x of [-.42,-.14,.14,.42])for(const z of [-.40,.40]){
  const xx=x*width,zz=z*depth;g.add(pipe([xx,.15,zz],[xx,height,zz],.095,m.timberDark,'Timber column'));
  for(let k=0;k<3;k++)g.add(box(.32+k*.12,.10,.25+k*.09,m.timberDark,xx,height-.35+k*.10,zz,'Layered bracket'));
  const side=x<0?1:-1;g.add(pipe([xx,height-.65,zz],[xx+side*.5,height-.07,zz],.043,m.timberDark,'Knee brace'));
 }
 for(const z of [-depth*.43,depth*.43]){
  g.add(box(width,.18,.16,m.timberDark,0,height,z,'Eave beam'));
  for(const side of [-1,1])g.add(box(width*.38,.11,.09,m.timberDark,side*width*.31,1.0,z,'Handrail'));
  for(let x=-width*.46;x<=width*.46;x+=.40){if(Math.abs(x)<width*.15)continue;g.add(box(.035,.82,.035,m.timberDark,x,.57,z,'Fine baluster'));}
 }
 for(const x of [-width*.44,width*.44])g.add(box(.12,.11,depth,m.timberDark,x,1,0,'Side rail'));
 const roof=roofGeometry(width*.64,depth*.70,height+.11,1.45,attic?[width*.22,depth*.20]:null);
 const roofMesh=new THREE.Mesh(roof.geometry,m.roof);roofMesh.name='Curved tiled hip roof';g.add(roofMesh);
 const tileParts=[];
 for(let x=-width*.61;x<=width*.61;x+=.24)for(const s of [-1,1]){
  const start=attic&&Math.abs(x)<width*.22?depth*.20:0,pts=[];for(let j=0;j<=7;j++){const z=s*(start+(depth*.70-start)*j/7);pts.push([x,roof.height(x,z)+.02,z]);}tileParts.push(taperedTube(pts,.018,.018,4,7));
 }
 const tile=new THREE.Mesh(mergeGeometries(tileParts),m.timberDark);tile.name='Individual tile ridges';g.add(tile);tileParts.forEach(g=>g.dispose());
 if(attic){
  const y=height+1.20,w=width*.42,d=depth*.39;
  for(const x of [-w*.42,w*.42])for(const z of [-d*.42,d*.42])g.add(pipe([x,y-.25,z],[x,y+1.12,z],.07,m.timberDark,'Attic post'));
  const cap=roofGeometry(w*.74,d*.80,y+1.05,.92);const rm=new THREE.Mesh(cap.geometry,m.roof);rm.name='Second pavilion roof';g.add(rm);
  g.add(pipe([-w*.28,y+1.98,0],[w*.28,y+1.98,0],.065,m.timberDark,'Roof ridge'));
  for(const side of [-1,1])g.add(new THREE.Mesh(taperedTube([[side*w*.28,y+1.98,0],[side*w*.36,y+2.04,0],[side*w*.40,y+2.20,0]],.065,.024,5,5),m.timberDark));
 }
 return batchGroup(g);
}
export function house(m,x,z,scale=1,rotation=0){
 const g=pavilion(m,{width:7.2,depth:4.7,height:2.7,attic:false,name:'Shore courtyard house'});
 // Paper screens and their narrow lattice frames are genuine geometry.
 const extra=new THREE.Group();for(const xx of [-2.25,0,2.25]){
  extra.add(box(1.9,1.9,.08,m.plaster,xx,1.35,-1.6,'Ochre paper screen'));
  for(let k=-2;k<=2;k++)extra.add(box(.035,1.94,.09,m.timberDark,xx+k*.36,1.35,-1.53,'Window lattice'));
  for(let k=0;k<5;k++)extra.add(box(1.95,.035,.09,m.timberDark,xx,.42+k*.46,-1.53,'Window rail'));
 }
 batchGroup(extra);g.add(extra);g.position.set(x,terrainHeight(x,z)+.22,z);g.scale.setScalar(scale);g.rotation.y=rotation;g.userData.inferred=true;return g;
}

// The reference has a low cruciform bridge hall, with lateral roof wings,
// a projecting porch and a small attached central cap. It is not the generic
// open double-roof pavilion used on the shore.
export function bridgePavilion(m,{foundationBottom=-5.3}={}){
 const g=new THREE.Group();g.name='Cruciform bridge hall with central raised cap';
 const eave=2.85,halfWidth=5.8,halfDepth=3.1;
 const mainHeight=hipProfile(7.05,3.85,eave,1.35),porchHeight=hipProfile(2.65,2.18,2.63,1.13,{ridge:.12});
 const lowerFootprint=(x,z)=>(Math.abs(x)<=7.05+1e-8&&Math.abs(z)<=3.85+1e-8)||(Math.abs(x)<=2.65+1e-8&&Math.abs(z)<=5.43+1e-8);
 const lowerHeight=(x,z)=>{
  const heights=[];if(Math.abs(x)<=7.05+1e-8&&Math.abs(z)<=3.85+1e-8)heights.push(mainHeight(x,z));
  for(const side of [-1,1])if(Math.abs(x)<=2.65+1e-8&&Math.abs(z-side*3.25)<=2.18+1e-8)heights.push(porchHeight(x,z-side*3.25));
  return heights.length?Math.max(...heights):eave;
 };
 const member=(a,b,r=.055,name='Carved timber member')=>g.add(pipe(a,b,r,m.timberDark,name));
 function roof(w,d,y,rise,x=0,z=0,options={}){
  const profile=roofGeometry(w,d,y,rise,options.hole||null,options);
  if(options.detailsOnly)profile.geometry.dispose();else{const surface=new THREE.Mesh(profile.geometry,m.roof);surface.position.set(x,0,z);surface.name=options.name||'Curved hip roof volume';g.add(surface);}
  const details=[];
  function detail(points,r0,r1,radial,steps){
   if(!options.detailsOnly){details.push(taperedTube(points,r0,r1,radial,steps));return;}
   let run=[];const flush=()=>{if(run.length>1)details.push(taperedTube(run,r0,r1,radial,Math.max(2,run.length-1)));run=[];};
   for(const p of points){const exposed=p[1]>=lowerHeight(p[0],p[2])-.09&&!(Math.abs(p[0])<1.85&&Math.abs(p[2])<1.5);if(exposed)run.push(p);else flush();}flush();
  }
  const tileCount=Math.ceil((w*2-.24)/.23);
  for(let column=0;column<=tileCount;column++)for(const side of [-1,1]){const xx=(column/tileCount*2-1)*(w-.12);
   const start=options.hole&&Math.abs(xx)<options.hole[0]?options.hole[1]:0,points=[];
   for(let j=0;j<=9;j++){const zz=side*(start+(d-start)*j/9);points.push([x+xx,profile.height(xx,zz)+.025,z+zz]);}
   detail(points,.016,.011,4,9);
  }
  // Tile ends, curved eave edges, diagonal hip ridges and a short ridge beam.
  for(const side of [-1,1]){
   const points=[];for(let j=0;j<=24;j++){const xx=-w+j/24*w*2;points.push([x+xx,profile.height(xx,side*d)-.025,z+side*d]);}
   detail(points,.045,.045,6,24);
   for(const end of [-1,1]){
    const points=[];for(let j=0;j<=12;j++){const t=j/12,xx=end*w*((options.ridge??.27)+(1-(options.ridge??.27))*t),zz=side*d*t;points.push([x+xx,profile.height(xx,zz)+.055,z+zz]);}
    detail(points,.045,.022,6,12);
   }
  }
  const ridge=(options.ridge??.27)*w;detail([[x-ridge,y+rise+.035,z],[x,y+rise+.055,z],[x+ridge,y+rise+.035,z]],.06,.06,6,8);
  const tile=new THREE.Mesh(mergeGeometries(details),m.timberDark);tile.name='Hip ridges, eaves and individual tile rolls';g.add(tile);details.forEach(p=>p.dispose());
 }
 // A widened platform, with its own pilings under the hall and the porches.
 const boards=Math.ceil(halfWidth*2/.31),porchBoards=13;
 for(let i=0;i<boards;i++)g.add(box(halfWidth*2/boards+.008,.17,halfDepth*2+.4,m.timber,((i+.5)/boards*2-1)*halfWidth,.11,0,'Hall floor plank'));
 for(const side of [-1,1])for(let i=0;i<porchBoards;i++)g.add(box(4/porchBoards+.008,.17,2.35,m.timber,((i+.5)/porchBoards*2-1)*2,.11,side*4.1,'Projecting porch floor plank'));
 for(const x of [-5.35,-3.55,-1.8,0,1.8,3.55,5.35])for(const z of [-2.9,2.9])member([x,foundationBottom,z],[x,.16,z],.075,'Separate hall foundation piling');
 for(const side of [-1,1])for(const x of [-1.65,0,1.65])member([x,foundationBottom,side*5.05],[x,.16,side*5.05],.073,'Porch foundation piling');
 for(const z of [-2.9,2.9])g.add(box(11.4,.18,.16,m.timberDark,0,-.06,z,'Hall floor edge beam'));
 for(const x of [-5.25,-3.45,-1.55,1.55,3.45,5.25])for(const z of [-2.65,2.65]){
  member([x,.18,z],[x,eave-.08,z],.082,'Main hall column');
  g.add(box(.24,.14,.24,m.stone,x,.23,z,'Column shoe'));
  for(let k=0;k<3;k++)g.add(box(.26+k*.16,.09,.24+k*.13,m.timberDark,x,eave-.43+k*.11,z,'Interlocking bracket stack'));
  for(const side of [-1,1])member([x,eave-.80,z],[x+side*.48,eave-.18,z],.037,'Curved knee brace');
 }
 for(const z of [-2.68,2.68]){
  g.add(box(11.25,.19,.15,m.timberDark,0,eave-.10,z,'Continuous lintel'));
  for(const x of [-4.32,-2.45,2.45,4.32]){
   g.add(box(1.62,.18,.07,m.plaster,x,eave-.28,z,'Pale eave frieze'));
   for(const xx of [-.62,-.31,0,.31,.62])g.add(box(.026,.20,.09,m.timberDark,x+xx,eave-.28,z,'Frieze lattice division'));
   // Thin side screens retain an open central passage and lake-facing porch.
   g.add(box(1.58,.54,.06,m.timber,x,.62,z,'Timber lower screen'));
   for(let j=-3;j<=3;j++)g.add(box(.025,1.32,.065,m.timberDark,x+j*.21,1.52,z,'Open window lattice stile'));
   for(const y of [.92,1.53,2.15])g.add(box(1.62,.035,.07,m.timberDark,x,y,z,'Open window lattice rail'));
  }
 }
 const joined=roofGeometry(7.05,5.43,eave,1.35,[1.85,1.5],{nx:96,nz:96,heightField:lowerHeight,include:lowerFootprint});const joinedRoof=new THREE.Mesh(joined.geometry,m.roof);joinedRoof.name='Continuous cruciform roof with joined porch valleys';g.add(joinedRoof);
 roof(7.05,3.85,eave,1.35,0,0,{hole:[1.85,1.5],detailsOnly:true});
 // The central lantern is seated in the main roof; there is no floating storey.
 for(const z of [-1.52,1.52]){
  g.add(box(3.72,.19,.12,m.plaster,0,4.13,z,'Central cap pale frieze'));
  for(const x of [-1.78,-1.18,-.59,0,.59,1.18,1.78])g.add(box(.07,.72,.09,m.timberDark,x,3.97,z,'Central clerestory mullion'));
  g.add(box(3.78,.09,.13,m.timberDark,0,4.27,z,'Central cap lintel'));
 }
 for(const x of [-1.8,1.8])g.add(box(.10,.67,3.1,m.timberDark,x,3.97,0,'Clerestory side frame'));
 roof(2.53,2.17,4.24,1.22,0,0,{ridge:.055,curve:1.45,upturn:.19,name:'Compact pyramidal central cap'});
 member([0,5.46,0],[0,5.71,0],.045,'Short central roof finial');
 for(const side of [-1,1]){
  roof(2.65,2.18,2.63,1.13,0,side*3.25,{ridge:.12,detailsOnly:true});
  for(const x of [-1.6,1.6]){
   member([x,.18,side*4.75],[x,2.64,side*4.75],.074,'Porch column');
   member([x,2.13,side*4.75],[x*.63,2.64,side*4.75],.04,'Porch knee brace');
   g.add(box(.38,.12,.32,m.timberDark,x,2.48,side*4.75,'Porch bracket'));
   for(const y of [.46,1.03])member([x,y,side*3.1],[x,y,side*5.1],.035,'Porch side handrail');
   for(let z=3.25;z<5.05;z+=.30)member([x,.30,side*z],[x,1.02,side*z],.023,'Porch baluster');
  }
  // Open center rail frames the view without blocking the camera's passage.
  for(const s of [-1,1]){
   member([s*1.65,1.03,side*5.13],[s*.62,1.03,side*5.13],.04,'Porch front rail');
   for(let x=.75;x<1.65;x+=.25)member([s*x,.28,side*5.13],[s*x,1.03,side*5.13],.022,'Porch front baluster');
  }
 }
 batchGroup(g);g.userData.referenceForm={plan:'cruciform',mainRoofWidth:14.1,mainEaveHeight:eave,centralCapHeight:5.71,porches:2,joinedLowerRoof:true,foundationPilings:20,sourceCrop:'reference/crops/bridge-and-central-pavilion.png'};return g;
}
export function buildBridge(m){
 const start=new THREE.Vector3(...bridgeBanks.left),end=new THREE.Vector3(...bridgeBanks.right),span=start.distanceTo(end),crownFraction=.42;
 class BridgeAxis extends THREE.Curve{getPoint(t,target=new THREE.Vector3()){const distance=Math.abs(t-crownFraction)*span,run=(t<crownFraction?crownFraction:1-crownFraction)*span,v=THREE.MathUtils.smoothstep(distance,7.2,run);return target.copy(start).lerp(end,t).setY(7.90-5.60*v);}}
 const curve=new BridgeAxis();
 const g=new THREE.Group();g.name='Long timber bridge, railings and pilings';const deckWidth=3.2,length=curve.getLength(),steps=Math.ceil(length/.36),supports=[];
 const point=t=>curve.getPoint(t),axes=t=>{const d=curve.getTangent(t);return{angle:Math.atan2(-d.z,d.x),normal:new THREE.Vector3(-d.z,0,d.x).normalize()};};
 for(let i=0;i<steps;i++){
  const t=(i+.5)/steps,p=point(t),f=axes(t),board=box(length/steps+.035,.16,deckWidth,m.timber,p.x,p.y,p.z,'Individual bridge plank');board.rotation.y=f.angle;g.add(board);
 }
 const count=Math.ceil(length/2.25);
 for(let i=0;i<=count;i++){
  const t=i/count,p=point(t),n=axes(t).normal;supports.push(p.toArray());
  const inHall=Math.abs(t-crownFraction)*span<6.2;
  for(const side of [-1,1]){const q=p.clone().addScaledVector(n,side*deckWidth*.43);g.add(pipe([q.x,-1.05,q.z],[q.x,p.y+(inHall?-.10:1.12),q.z],.072,m.timberDark,inHall?'Bridge piling below hall floor':'Continuous timber piling and rail post'));}
  const left=p.clone().addScaledVector(n,deckWidth*.50),right=p.clone().addScaledVector(n,-deckWidth*.50);g.add(pipe([left.x,p.y-.24,left.z],[right.x,p.y-.24,right.z],.09,m.timberDark,'Bridge cross joist'));
  if(i<count){
   const next=point((i+1)/count),nn=axes((i+1)/count).normal;
   const cut=5.80/span;
   for(const [lo,hi]of [[t,Math.min((i+1)/count,crownFraction-cut)],[Math.max(t,crownFraction+cut),(i+1)/count]])if(hi-lo>1e-5)for(const side of [-1,1])for(const lift of [.23,1.02]){const aa=point(lo),bb=point(hi),q=aa.clone().addScaledVector(axes(lo).normal,side*deckWidth*.43),r=bb.clone().addScaledVector(axes(hi).normal,side*deckWidth*.43);g.add(pipe([q.x,aa.y+lift,q.z],[r.x,bb.y+lift,r.z],lift>.5?.045:.031,m.timberDark,'Long bridge handrail meeting hall edge'));}
   for(let j=1;j<4;j++){const tt=(i+j/4)/count;if(Math.abs(tt-crownFraction)*span<6.2)continue;const q=point(tt),normal=axes(tt).normal;for(const s of [-1,1]){const r=q.clone().addScaledVector(normal,s*deckWidth*.43);g.add(pipe([r.x,q.y+.20,r.z],[r.x,q.y+1.03,r.z],.021,m.timberDark,'Slender railing baluster'));}}
   if(i%3===0)for(const side of [-1,1]){const q=p.clone().addScaledVector(n,side*deckWidth*.40),r=next.clone().addScaledVector(nn,side*deckWidth*.40);g.add(pipe([q.x,-.25,q.z],[r.x,next.y-.22,r.z],.045,m.timberDark,'Diagonal sub-deck brace'));}
  }
 }
 batchGroup(g);const central=point(crownFraction);const hall=bridgePavilion(m,{foundationBottom:-1.10-central.y+.115});hall.position.copy(central);hall.position.y-=.115;hall.rotation.y=axes(.5).angle;g.add(hall);
 g.userData={type:'true 3D bridge',deckWidth,length,deckPlanks:steps,pilings:supports.length*2,supportCount:supports.length,supports,pavilion:hall.position.toArray(),pavilionFraction:crownFraction,pavilionFloorMatchesDeck:true,crownHeight:central.y,archRise:central.y-start.y,crownHalfWidth:7.2,pavilionForm:hall.userData.referenceForm,sourceProjection:false};
 return{group:g,curve,hall,deckWidth,point,ground(x,z){let nearest=1e9,height=-100;for(let i=0;i<=100;i++){const p=point(i/100),d=Math.hypot(x-p.x,z-p.z);if(d<nearest){nearest=d;height=p.y+.15;}}return nearest<deckWidth*.53?height:-100;}};
}
