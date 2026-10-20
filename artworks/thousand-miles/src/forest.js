import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {taperedTube,makeLeaf,makeLeafSpray} from './geometry.js';
import {random} from './materials.js';
import {terrainHeight,terrainInfo,peaks,leftEdge,rightEdge,nearestRoad,WATER,settlementSites} from './terrain.js';
import {mountainForms} from './mountain-shapes.js';
import {groveTraces,referenceGround} from './reference-composition.js';
import {woodlandPatches} from './lowlands.js';
export function instances(geo,mat,items,name){
 const mesh=new THREE.InstancedMesh(geo,mat,items.length),d=new THREE.Object3D(),anchors=new Float32Array(items.length*4);
 for(let i=0;i<items.length;i++){const a=items[i];d.position.copy(a.position);d.rotation.set(...(a.rotation||[0,0,0]));d.scale.set(...a.scale);d.updateMatrix();mesh.setMatrixAt(i,d.matrix);if(a.color)mesh.setColorAt(i,a.color);anchors.set(a.anchor||[0,0,0,0],i*4);}
 mesh.geometry.setAttribute('aAnchor',new THREE.InstancedBufferAttribute(anchors,4));mesh.name=name;mesh.frustumCulled=false;return mesh;
}
function anchor(geo,root){const a=new Float32Array(geo.attributes.position.count*4);for(let i=0;i<a.length;i+=4)a.set(root,i);geo.setAttribute('aAnchor',new THREE.Float32BufferAttribute(a,4));return geo;}
export function buildForest(m){
 const r=random(41681),originalRandom=r,group=new THREE.Group();group.name='Slender lakeside groves, wooded foothills and reeds';const parts=[],crowns=[],leaves=[],grass=[],records=[];
 // Three related silhouettes share rooted, branching construction: bare
 // antler-like trees, airy broadleaf crowns, and fine drooping willow sprays.
 const familyCounts={bare:0,broadleaf:0,willow:0};
 const rGrove=random(610219),groves=[],rMountain=random(710155),montane=[],rLowland=random(100715);
 const nearSettlement=(x,z,margin)=>settlementSites.some(([xx,zz])=>Math.hypot(x-xx,z-zz)<margin);
 // Intersect each hand-read root ray with the actual terrain. A ground-plane
 // placement would slide rows downhill when the land rises into a terrace.
 const rootAt=([px,py])=>{
  const ground=referenceGround([px,py]),origin=new THREE.Vector3(0,58,220),direction=new THREE.Vector3(ground.x,-58,ground.y-220).normalize();
  let previous=1;
  for(let t=2;t<1500;t+=2){
   const p=origin.clone().addScaledVector(direction,t),delta=p.y-terrainHeight(p.x,p.z);
   if(delta<=0){let lo=previous,hi=t;for(let k=0;k<12;k++){const mid=(lo+hi)/2,q=origin.clone().addScaledVector(direction,mid);if(q.y>terrainHeight(q.x,q.z))lo=mid;else hi=mid;}
    const q=origin.addScaledVector(direction,(lo+hi)/2);return{x:q.x,y:terrainHeight(q.x,q.z),z:q.z,distance:(lo+hi)/2};}
   previous=t;
  }return null;
 };
 for(const [rowIndex,row]of groveTraces.entries()){
  const curve=new THREE.CatmullRomCurve3(row.points.map(([x,y])=>new THREE.Vector3(x,y,0)),false,'centripetal'),count=Math.max(2,Math.round(curve.getLength()/row.spacing));
  for(let j=0;j<=count;j++){
   if(j>0&&j<count&&rGrove()<.12)continue;
   const p=curve.getPointAt(Math.max(0,Math.min(1,(j+(rGrove()-.5)*.35)/count))),target=[p.x,p.y+(rGrove()-.5)*1.7],root=rootAt(target);
   if(!root||root.y<.2||nearSettlement(root.x,root.z,5.5))continue;
   const h=row.height*(.75+rGrove()*.48)*root.distance/(801/(2*Math.tan(16*Math.PI/180)));
   groves.push({...root,height:h,row:row.name,rowIndex,target,kind:'grove'});
  }
 }
 // A few slope trees support the authored rows; the former random carpet and
 // paired road avenue no longer obscure the small foreground knuckles.
 for(let i=0;i<3500&&montane.length<75;i++){
  const peak=peaks[Math.floor(rMountain()*Math.min(31,peaks.length))],x=peak[0]+(rMountain()-.5)*peak[3]*3,z=peak[1]+(rMountain()-.5)*peak[4]*3,y=terrainHeight(x,z);
  const slope=Math.hypot(terrainHeight(x+.5,z)-terrainHeight(x-.5,z),terrainHeight(x,z+.5)-terrainHeight(x,z-.5));
  if(y<7||y>28||slope>1.05||terrainInfo(x,z).relative>.82||nearestRoad(x,z).distance<3||nearSettlement(x,z,7)||montane.some(p=>Math.hypot(p.x-x,p.z-z)<3))continue;
  montane.push({x,y,z,slope,kind:'mountain'});
 }
 // Sparse, uneven crest planting follows actual traced ridges, including high
 // summits excluded by the old 28-unit mountain-tree cutoff.
 const ridge=[],rRidge=random(918071);
 for(const field of mountainForms){
  if(field.h<10)continue;
  for(let j=1;j<field.nodes.length;j++){
   const a=field.nodes[j-1],b=field.nodes[j],steps=Math.max(1,Math.floor(Math.hypot(b.x-a.x,b.z-a.z)/1.7));
   for(let k=0;k<steps;k++){
    const t=(k+.22+rRidge()*.56)/steps;
    if(rRidge()<.30)continue;
    const x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t+.20,y=terrainHeight(x,z);
    if(y<5||Math.abs(y-(a.y+(b.y-a.y)*t-1.65))>2.4||nearestRoad(x,z).distance<3||nearSettlement(x,z,7))continue;
    if(ridge.some(p=>Math.hypot(p.x-x,p.z-z)<1.25))continue;
    ridge.push({x,y,z,slope:null,field:field.name,kind:'ridge'});
   }
  }
 }
 const points=[...groves,...montane,...ridge];let vergeTrees=0;
 for(let i=0;i<points.length;i++){
  const point=points[i],crest=point.kind==='ridge',mountain=crest||point.kind==='mountain',extra=point.kind==='grove',r=crest?rRidge:extra?rGrove:originalRandom,{x,z}=point,y=terrainHeight(x,z);
  const road=nearestRoad(x,z);if(road.distance<(road.road?.width??1.8)/2+.65||nearSettlement(x,z,5.5)||y<.2)continue;
  const family=crest?(i%3===0?'bare':'broadleaf'):mountain?(i%5===0?'bare':'broadleaf'):point.rowIndex%4===0?'bare':point.rowIndex%5===0?'willow':'broadleaf';
  const h=crest?.65+r()**1.3*1.15:mountain?1.4+r()*2.2:point.height,base=[x,y,z,h],lean=(r()-.5)*h*.12,leanZ=(r()-.5)*h*.07;
  const addBranch=(points,thick,thin,steps=5)=>parts.push(anchor(taperedTube(points,thick,thin,5,steps),base));
  const at=(t)=>new THREE.Vector3(x+lean*t*t+Math.sin(t*5+i)*.07,y+h*t,z+leanZ*t*t);
  addBranch([new THREE.Vector3(x,y,z),at(.33),at(.68),at(1)],h*.016,.006,7);
  // Low forks and alternating heights give a different, readable skeleton
  // to each tree, instead of attaching identical flat disks to straight poles.
  const branches=mountain?3+Math.floor(r()*2):4+Math.floor(r()*3);
  for(let k=0;k<branches;k++){
   const angle=k*2.399+i*.71+(r()-.5)*.65,reach=h*(.16+r()*.16),level=.30+k/branches*.42+r()*.08,start=at(level),tip=at(Math.min(1,level+.25+r()*.21));
   tip.x+=Math.cos(angle)*reach;tip.z+=Math.sin(angle)*reach;
   const elbow=start.clone().lerp(tip,.48);elbow.y-=h*.085;
   addBranch([start,elbow,tip],h*.006,.002,4);
   const twigTips=[];
   for(let j=0;j<3;j++){
    const direction=angle+(j-1)*.66,origin=elbow.clone().lerp(tip,.25+j*.20),end=origin.clone().add(new THREE.Vector3(Math.cos(direction)*reach*.38,h*(.06+r()*.10),Math.sin(direction)*reach*.38));
    const middle=origin.clone().lerp(end,.6);middle.y+=h*.015;
    addBranch([origin,middle,end],.014,.0012,3);twigTips.push(end);
    const split=end.clone().add(new THREE.Vector3(Math.cos(direction+.65)*reach*.16,h*.045,Math.sin(direction+.65)*reach*.16));
    addBranch([middle,end,split],.008,.0005,2);
   }
   if(family==='bare')continue;
   if(family==='willow'){
    // Fine curved branchlets carry separated leaf dashes along the arc.
    for(let j=0;j<3;j++){
     const origin=twigTips[j],fall=h*(.11+r()*.13),end=origin.clone().add(new THREE.Vector3(Math.cos(angle)*.23,-fall,Math.sin(angle)*.23)),mid=origin.clone().lerp(end,.4);mid.x+=Math.cos(angle)*.18;mid.z+=Math.sin(angle)*.18;
     addBranch([origin,mid,end],.009,.002,6);
     for(let n=0;n<9;n++){
      const t=n/9,point=origin.clone().lerp(end,t).add(new THREE.Vector3((r()-.5)*.10,0,(r()-.5)*.10));
      leaves.push({position:point,scale:[.08,.5,.15],rotation:[.45+r()*.7,angle+(n%2?-.6:.6),.4],color:new THREE.Color('#6f9674'),anchor:base});
     }
    }
   }else{
    // Several small, irregular deposits leave visible holes between leaf fans.
    for(const end of twigTips)for(let j=0;j<2;j++){
     const radius=crest?.10+r()*.10:mountain?.14+r()*.14:.18+r()*.21,position=end.clone().add(new THREE.Vector3((r()-.5)*.6,(r()-.5)*.28,(r()-.5)*.6));
     crowns.push({position,scale:[radius*(1.1+r()*.5),radius*(1.4+r()*.7),radius*(.8+r()*.6)],rotation:[r()*.6,r()*6.28,r()*.45],color:new THREE.Color().setHSL(.32+r()*.05,.15+r()*.1,.22+r()*.12),anchor:base});
     for(let n=0;n<3;n++){const aa=r()*6.28,rr=Math.sqrt(r())*radius*1.8;leaves.push({position:position.clone().add(new THREE.Vector3(Math.cos(aa)*rr,(r()-.5)*radius,Math.sin(aa)*rr)),scale:[.12,.65,.16],rotation:[(r()-.5)*1.4,r()*6.28,(r()-.5)],color:new THREE.Color('#7da081'),anchor:base});}
    }
   }
  }
  familyCounts[family]++;if(extra)vergeTrees++;records.push({x,y,z,height:h,family,roadside:extra,mountain,lowland:false,ridge:crest,row:point.row||null,referenceRoot:point.target||null,slope:point.slope??null});
 }
 // Low, broken undergrowth connects the individual trunks into woodland
 // patches. Small open glades and road clearances remain between them.
 let shrubs=0;
 for(const [cx,cz,rx,rz]of woodlandPatches)for(let i=0;i<32;i++){
  const a=rLowland()*Math.PI*2,radius=Math.sqrt(rLowland()),x=cx+Math.cos(a)*radius*rx*1.15,z=cz+Math.sin(a)*radius*rz*1.15,y=terrainHeight(x,z);
  if(y<.8||y>16||nearestRoad(x,z).distance<2.6||nearSettlement(x,z,7))continue;
  const h=.22+rLowland()*.6,base=[x,y,z,h],s=.35+rLowland()*.5;
  crowns.push({position:new THREE.Vector3(x,y+h*.5,z),scale:[s,h,s*(.7+rLowland()*.6)],rotation:[0,rLowland()*6.28,0],color:new THREE.Color('#697e50'),anchor:base});shrubs++;
 }
 const trunk=new THREE.Mesh(mergeGeometries(parts),m.darkBark);parts.forEach(g=>g.dispose());trunk.name='Crooked rooted trunks, forked branches and fine twigs';group.add(trunk);
 group.add(instances(makeLeafSpray(),m.leaves,crowns,'Open pointed branch-tip foliage'));group.add(instances(makeLeaf(),m.leafSmall,leaves,'Separated willow leaves and fine leaf fans'));
 const gp=[],uv=[],idx=[];for(let k=0;k<5;k++){const a=k*2.399,b=gp.length/3;for(let j=0;j<=4;j++){const t=j/4;for(const s of [-1,1]){gp.push(Math.cos(a)*t*t*.24+Math.sin(a)*s*.035*(1-t),t,Math.sin(a)*t*t*.24-Math.cos(a)*s*.035*(1-t));uv.push(s*.5+.5,t);}}for(let j=0;j<4;j++){const q=b+j*2;idx.push(q,q+1,q+3,q,q+3,q+2);}}
 const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(gp,3));gg.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));gg.setIndex(idx);gg.computeVertexNormals();
 for(let i=0;i<4700;i++){
  const z=-245+r()*340,side=r()>.5?1:-1,x=side<0?leftEdge(z)-r()*8:rightEdge(z)+r()*9,y=terrainHeight(x,z);if(nearestRoad(x,z).distance<1.65||y>5.5||y<WATER+.04||settlementSites.some(([xx,zz])=>Math.hypot(x-xx,z-zz)<5))continue;
  const h=.13+r()*.55;grass.push({position:new THREE.Vector3(x,y,z),scale:[.18+r()*.25,h,.2+r()*.2],rotation:[0,r()*6.28,0],color:new THREE.Color('#8fa97f'),anchor:[x,y,z,h]});
 }
 let mountainGrass=0;
 for(let i=0;i<7200;i++){
  const peak=peaks[Math.floor(rMountain()*Math.min(31,peaks.length))],x=peak[0]+(rMountain()-.5)*peak[3]*3.2,z=peak[1]+(rMountain()-.5)*peak[4]*3.2,y=terrainHeight(x,z);
  const slope=Math.hypot(terrainHeight(x+.5,z)-terrainHeight(x-.5,z),terrainHeight(x,z+.5)-terrainHeight(x,z-.5));
  if(y<2.3||y>22||slope>.85||nearestRoad(x,z).distance<2.0||settlementSites.some(([xx,zz])=>Math.hypot(x-xx,z-zz)<5))continue;
  const h=.09+rMountain()*.26;grass.push({position:new THREE.Vector3(x,y,z),scale:[.17+rMountain()*.20,h,.16+rMountain()*.17],rotation:[0,rMountain()*6.28,0],color:new THREE.Color('#77895c'),anchor:[x,y,z,h]});mountainGrass++;
 }
 // Short grasses emphasize the broken ridge line without hiding its profile.
 let ridgeGrass=0;
 for(const field of mountainForms)for(let j=1;j<field.nodes.length;j++){
  const a=field.nodes[j-1],b=field.nodes[j],steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)*2.5);
  for(let k=0;k<steps;k++){
   if(rRidge()<.35)continue;
   const t=(k+rRidge())/steps,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t+(rRidge()-.30)*1.0,y=terrainHeight(x,z);
   if(y<4||Math.abs(y-(a.y+(b.y-a.y)*t-1.65))>2.5||nearestRoad(x,z).distance<2.2||nearSettlement(x,z,6))continue;
   const h=.18+rRidge()*.46;grass.push({position:new THREE.Vector3(x,y,z),scale:[.30+rRidge()*.32,h,.26+rRidge()*.24],rotation:[0,rRidge()*6.28,0],color:new THREE.Color('#626f4f'),anchor:[x,y,z,h]});ridgeGrass++;
  }
 }
 let lowlandGrass=0;
 for(let i=0;i<8500;i++){
  const patch=woodlandPatches[i%woodlandPatches.length],a=rLowland()*Math.PI*2,rad=Math.sqrt(rLowland())*1.4,x=patch[0]+Math.cos(a)*rad*patch[2],z=patch[1]+Math.sin(a)*rad*patch[3],y=terrainHeight(x,z);
  if(y<.12||y>16||nearestRoad(x,z).distance<1.85||nearSettlement(x,z,6))continue;
  const h=.11+rLowland()*.41;grass.push({position:new THREE.Vector3(x,y,z),scale:[.20+rLowland()*.24,h,.18+rLowland()*.20],rotation:[0,rLowland()*6.28,0],color:new THREE.Color('#7c8d5d'),anchor:[x,y,z,h]});lowlandGrass++;
 }
 group.add(instances(gg,m.reed,grass,'Reed banks, woodland groundcover and fine mountain grasses'));return{group,records,windAnchors:true,counts:{trees:records.length,groveRows:groveTraces.length,groveTrees:records.filter(t=>t.row).length,ridgeTrees:ridge.length,ridgeGrass,mountainTrees:records.filter(p=>p.mountain).length,lowlandTrees:records.filter(p=>p.lowland).length,woodlandPatches:woodlandPatches.length,shrubs,lowlandGrass,mountainGrass,roadsideTrees:vergeTrees,treeFamilies:familyCounts,branchGeometries:parts.length,canopyClumps:crowns.length,leaves:leaves.length,reeds:grass.length}};
}
export function buildRocks(m){
 const r=random(18867),items=[],records=[];
 for(let i=0;i<46;i++){
  const z=-160+r()*255,side=r()>.5?1:-1,x=side<0?leftEdge(z)+(r()-.35)*10:rightEdge(z)+(r()-.65)*12,y=terrainHeight(x,z);if(y<-.25||y>5||nearestRoad(x,z).distance<2.0)continue;
  const s=.30+r()**1.5*1.8;items.push({position:new THREE.Vector3(x,Math.max(-.3,y)+s*.28,z),scale:[s,s*(.5+r()*.6),s*(.65+r()*.55)],rotation:[r()*.3,r()*6.28,r()*.3]});records.push({x,z});
 }
 const rLow=random(77106);
 for(let i=0;i<40;i++){
  const z=56+rLow()*202,side=i%2?1:-1,x=side<0?leftEdge(z)-rLow()*7:rightEdge(z)+rLow()*7,y=terrainHeight(x,z);
  if(y<-.3||y>5.5||nearestRoad(x,z).distance<2.3)continue;
  const s=.25+rLow()**1.7*1.25;items.push({position:new THREE.Vector3(x,y+s*.28,z),scale:[s,s*(.42+rLow()*.45),s*(.7+rLow()*.5)],rotation:[rLow()*.3,rLow()*6.28,rLow()*.3]});records.push({x,z,lowland:true});
 }
 const mesh=instances(new THREE.IcosahedronGeometry(1,1),m.rocks,items,'Scattered mineral shoreline boulders');mesh.receiveShadow=true;return{mesh,records};
}
