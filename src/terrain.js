import * as THREE from 'three';
import {naturalPalette} from './natural-palette.js';
import {buildRockFields,sampleRock} from './rock-form.js';
export const WATER=0;
import {peaks,referenceToWorld} from './mountain-shapes.js';
import {shoreDistanceExact,shoreDistanceGLSL,shoreRegions,distantRidgeTraces,referenceGround} from './reference-composition.js';
export {shoreDistanceMap} from './reference-composition.js';
import {lowlandRelief,foothills} from './lowlands.js';
export {peaks};
export function smoothstep(a,b,x){let t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
// Retained alignment guides for bridge landings and sparse detail sampling.
// The actual coast is defined by the authored shoreline footprints.
function shoreFringe(z){return smoothstep(72,105,z)*(1.7*Math.sin(z*.085)+.7*Math.sin(z*.27+1.2));}
export function leftEdge(z){return -46+7*Math.sin((z+25)*.027)+6*Math.exp(-(((z-27)/30)**2))+25*Math.exp(-(((z-45)/47)**2))+shoreFringe(z);}
export function rightEdge(z){return 53+10*Math.sin((z+10)*.021)-22*Math.exp(-(((z+90)/55)**2))-8*Math.exp(-(((z-45)/45)**2))-shoreFringe(z+9);}
export function bankDistance(x,z){return shoreDistanceExact(x,z);}
export function riverCenter(z){return (leftEdge(z)+rightEdge(z))/2;}
export function riverWidth(z){return (rightEdge(z)-leftEdge(z))/2;}
export const shoreGLSL=shoreDistanceGLSL;
export const bridgeBanks={left:[leftEdge(45)-1.5,2.30,45],right:[rightEdge(46)+1.5,2.30,46]};
const peakFields=buildRockFields(peaks);
function rawTerrainInfo(x,z){
 const d=bankDistance(x,z),shore=smoothstep(-3.5,3.5,d);
 const fine=.09*Math.sin(x*.83+z*.28)+.08*Math.sin(z*.9-x*.45);
 let h=-1.3+shore*(2.6+fine+.18*Math.sin(x*.14+z*.08)),rel=0,mh=0,runner=0,fold=0,rock=[0,0,0,0];
 const relief=lowlandRelief(x,z)*.52*smoothstep(1,18,d),lowHill=-1.3+shore*(2.6+relief+fine*.5);
 if(lowHill>h){h=lowHill;rel=.08+Math.min(.39,relief*.043);}
 for(const field of peakFields){
  if(Math.abs(x-field.x)>field.wx*2.7||Math.abs(z-field.z)>field.wz*2.7)continue;
  const info=sampleRock(field,x,z),v=info.height;
  if(v>mh){runner=mh;mh=v;rel=field.i===26?.28+.72*info.relative:info.relative;fold=info.kind>0?.35:0;rock=[info.seam,info.cross,info.seed,[0,16].includes(field.i)?-1:info.kind];}else runner=Math.max(runner,v);
 }
 if(mh-1.65>h){h=mh-1.65+fine*.12;rock[0]=Math.max(rock[0],(1-smoothstep(0,3.6,mh-runner))*.85);}else{rel=relief>.12?.08+Math.min(.39,relief*.043):0;rock=[0,0,0,0];}

 // The extended apron finishes underwater, beyond the flight, rather than
 // exposing a vertical rectangular wall at the old foreground boundary.
 const rim=smoothstep(-378,-343+5*Math.sin(z*.043),x)*(1-smoothstep(354+5*Math.sin(z*.039),388,x))*(1-smoothstep(282+9*Math.sin(x*.035),331,z))*smoothstep(-359,-341,z);
 h=THREE.MathUtils.lerp(-5,h,rim);
 return{height:h,relative:rel,shore:Math.max(0,1-Math.abs(d)/10),fold,rock};
}
export const settlementSites=[[-120,-23],[-110,-31],[-102,-19],[-30,18],[-34,5],[100,-13],[112,-20],[115,18],[-46,-14]];
const plateaus=settlementSites.map(([x,z])=>({x,z,y:Math.min(rawTerrainInfo(x,z).height+.10,bankDistance(x,z)<13?5.6:12)}));
function ungradedInfo(x,z){const info=rawTerrainInfo(x,z);for(const p of plateaus){const d=Math.hypot(x-p.x,z-p.z),blend=1-smoothstep(3.2,6.5,d);info.height=THREE.MathUtils.lerp(info.height,p.y,blend);info.relative*=1-blend*.82;info.fold*=1-blend;}return info;}
export const ungradedTerrainHeight=(x,z)=>ungradedInfo(x,z).height;
const roadPoint=p=>{const q=referenceGround(p,2.7);return[q.x,Math.max(2.3,Math.min(5.2,ungradedInfo(q.x,q.y).height)),q.y];};
export const approachRoads=[
 {name:'Left bank wooded road',width:1.8,controls:[bridgeBanks.left,...[[764,704],[744,705],[710,690],[703,677],[692,652],[690,628]].map(roadPoint)]},
 {name:'Right terrace footpath',width:1.8,controls:[bridgeBanks.right,...[[1340,708],[1370,686],[1416,658],[1446,630],[1485,600],[1536,583]].map(roadPoint)]}
].map(road=>{const curve=new THREE.CatmullRomCurve3(road.controls.map(p=>new THREE.Vector3(...p)),false,'centripetal'),count=Math.ceil(curve.getLength()/.7);return{...road,curve,samples:Array.from({length:count+1},(_,j)=>curve.getPointAt(j/count))};});
const roadBins=new Map();
for(const road of approachRoads)for(let i=1;i<road.samples.length;i++){
 const a=road.samples[i-1],b=road.samples[i],record={a,b,road};
 for(let x=Math.floor((Math.min(a.x,b.x)-5)/8);x<=Math.floor((Math.max(a.x,b.x)+5)/8);x++)for(let z=Math.floor((Math.min(a.z,b.z)-5)/8);z<=Math.floor((Math.max(a.z,b.z)+5)/8);z++){const key=x+','+z;if(!roadBins.has(key))roadBins.set(key,[]);roadBins.get(key).push(record);}
}
export function nearestRoad(x,z){
 let distance=Infinity,height=0,road=null;
 for(const s of roadBins.get(Math.floor(x/8)+','+Math.floor(z/8))||[]){const dx=s.b.x-s.a.x,dz=s.b.z-s.a.z,t=THREE.MathUtils.clamp(((x-s.a.x)*dx+(z-s.a.z)*dz)/(dx*dx+dz*dz),0,1),d=Math.hypot(x-s.a.x-dx*t,z-s.a.z-dz*t);if(d<distance){distance=d;height=THREE.MathUtils.lerp(s.a.y,s.b.y,t);road=s.road;}}
 return{distance,height,road};
}
export function terrainInfo(x,z){const info=ungradedInfo(x,z),road=nearestRoad(x,z),blend=1-smoothstep(.95,2.6,road.distance);if(blend>0){info.height=THREE.MathUtils.lerp(info.height,road.height,blend);info.relative*=1-blend;info.fold*=1-blend;}return info;}
// Keep the original core's vertex spacing and sample locations exactly;
// append columns/rows around it so the traced mountain crests stay intact.
export const terrainBounds={nx:580,nz:510,x0:-300-610/460*60,x1:310+610/460*60,z0:-360,z1:-360+490/360*510};
const terrainGrid={...terrainBounds,heights:null},shoalGrids=[];
export function terrainHeight(x,z){
 let height=gridHeight(terrainGrid,x,z);
 for(const g of shoalGrids)height=Math.max(height,gridHeight(g,x,z));
 return Number.isFinite(height)?height:terrainInfo(x,z).height;
}
function gridHeight(g,x,z){
 if(!g.heights||x<g.x0||x>g.x1||z<g.z0||z>g.z1)return -Infinity;
 // Sample the exact two triangles of the existing terrain mesh. Roots,
 // downhill brush ribbons and camera collision then agree with the surface,
 // without rebuilding every mountain field for every tiny brush step.
 const xx=(x-g.x0)/(g.x1-g.x0)*g.nx,zz=(z-g.z0)/(g.z1-g.z0)*g.nz,i=Math.min(g.nx-1,Math.floor(xx)),j=Math.min(g.nz-1,Math.floor(zz)),fx=xx-i,fz=zz-j,a=j*(g.nx+1)+i;
 const h=g.heights,h00=h[a],h10=h[a+1],h01=h[a+g.nx+1],h11=h[a+g.nx+2];
 return fx>=fz?h00+(h10-h00)*fx+(h11-h10)*fz:h00+(h11-h01)*fx+(h01-h00)*fz;
}
function closedGrid(nx,nz,bounds,heightField,material,name,mineral=true){
 const [x0,x1,z0,z1]=bounds,p=[],uv=[],color=[],min=[],strata=[],idx=[];
 const ochre=new THREE.Color(naturalPalette.earth),blue=new THREE.Color(naturalPalette.slate),green=new THREE.Color(naturalPalette.sage);
 for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
  const x=x0+(x1-x0)*i/nx,z=z0+(z1-z0)*j/nz,info=heightField(x,z),h=info.height;
  p.push(x,h,z);uv.push(x*.1,z*.1);min.push(info.relative||0,info.shore||0,info.fold||0);strata.push(...(info.rock||[0,0,0,0]));
  const relative=(info.relative||0)+(info.fold||0)*.24,c=ochre.clone().lerp(green,smoothstep(.18,.50,relative)).lerp(blue,smoothstep(.57,.91,relative));color.push(c.r,c.g,c.b);
 }
 for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+1,c=a+nx+2,d=a+nx+1;idx.push(a,c,b,a,d,c);}
 const edge=[];for(let i=0;i<=nx;i++)edge.push(i);for(let j=1;j<=nz;j++)edge.push(j*(nx+1)+nx);for(let i=nx-1;i>=0;i--)edge.push(nz*(nx+1)+i);for(let j=nz-1;j>0;j--)edge.push(j*(nx+1));
 const low=[];for(const v of edge){low.push(p.length/3);p.push(p[v*3],-36,p[v*3+2]);uv.push(0,0);min.push(0,0,0);strata.push(0,0,0,0);color.push(ochre.r*.55,ochre.g*.55,ochre.b*.55);}
 for(let j=0;j<edge.length;j++){const k=(j+1)%edge.length;idx.push(edge[j],edge[k],low[k],edge[j],low[k],low[j]);}
 const center=p.length/3;p.push((x0+x1)/2,-36,(z0+z1)/2);uv.push(0,0);min.push(0,0,0);strata.push(0,0,0,0);color.push(.1,.09,.04);for(let j=0;j<low.length;j++)idx.push(center,low[j],low[(j+1)%low.length]);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(color,3));g.setAttribute('aMineral',new THREE.Float32BufferAttribute(min,3));g.setAttribute('aRock',new THREE.Float32BufferAttribute(strata,4));g.setIndex(idx);g.computeVertexNormals();
 const mesh=new THREE.Mesh(g,material);mesh.name=name;mesh.receiveShadow=true;mesh.userData={closedVolume:true,referenceProjection:false};return mesh;
}
export function buildTerrain(m){
 shoalGrids.length=0;
 const group=new THREE.Group();group.name='Connected mineral mountains and shores';const mountains=new THREE.Group();mountains.name='Complete mineral terrain, low foothills and distant shores';mountains.userData.lowlandFoothills=foothills;group.add(mountains);
 const land=closedGrid(terrainGrid.nx,terrainGrid.nz,[terrainGrid.x0,terrainGrid.x1,terrainGrid.z0,terrainGrid.z1],terrainInfo,m.terrain,'Blue-green mountain terrain');mountains.add(land);
 const heights=new Float32Array((terrainGrid.nx+1)*(terrainGrid.nz+1));for(let i=0;i<heights.length;i++)heights[i]=land.geometry.attributes.position.getY(i);terrainGrid.heights=heights;
 const water=new THREE.Mesh(new THREE.PlaneGeometry(1800,2200,1,1).rotateX(-Math.PI/2),m.water);water.position.set(0,WATER,-400);water.name='Broad olive lake';water.receiveShadow=true;group.add(water);
 const far=new THREE.Group();far.name='Traced distant ridges and separated jade shoals';const records=[],fields=[];
 for(const [k,spec]of distantRidgeTraces.entries()){
  const nodes=spec.trace.map(p=>referenceToWorld(p,spec.z)),taper=65,x0=nodes[0].x-taper,x1=nodes.at(-1).x+taper;
  const field=(x,z)=>{
   let top=-5;
   for(let j=1;j<nodes.length;j++){const a=nodes[j-1],b=nodes[j];if(x<a.x||x>b.x)continue;const t=(x-a.x)/(b.x-a.x);top=a.y+(b.y-a.y)*t-1.65;break;}
   if(x<nodes[0].x)top=-5+(nodes[0].y-1.65+5)*smoothstep(x0,nodes[0].x,x);
   if(x>nodes.at(-1).x)top=-5+(nodes.at(-1).y-1.65+5)*(1-smoothstep(nodes.at(-1).x,x1,x));
   const u=Math.abs(z-spec.z)/(z>spec.z?spec.front:spec.back),profile=Math.max(0,1-u*u)**2;
   return{height:-5+(top+5)*profile,relative:profile,shore:0};
  };
  fields.push(field);far.add(closedGrid(300,64,[x0,x1,spec.z-spec.back,spec.z+spec.front],field,m[k===2?'rangeMiddle':'rangeFar'],spec.name,false));
  records.push({name:spec.name,centerZ:spec.z,closedVolume:true,trace:spec.trace});
 }
 // Shoals lie beyond the main mesh. Their thin rounded volumes share the
 // authored water-plane footprints and can be explored from every direction.
 for(const region of shoreRegions.slice(2)){
  const [x0,x1,z0,z1]=region.bounds;
  const field=(x,z)=>{if(x<x0-5||x>x1+5||z<z0-5||z>z1+5)return{height:-36};const d=shoreDistanceExact(x,z);return{height:-2.2+smoothstep(-1.2,1.2,d)*(3.1+.8*smoothstep(0,7,d)),relative:.38,shore:1-smoothstep(0,8,Math.abs(d))};};
  fields.push(field);const mesh=closedGrid(240,96,[x0-5,x1+5,z0-5,z1+5],field,m.terrain,region.name);far.add(mesh);
  const heights=new Float32Array(241*97);for(let i=0;i<heights.length;i++)heights[i]=mesh.geometry.attributes.position.getY(i);shoalGrids.push({nx:240,nz:96,x0:x0-5,x1:x1+5,z0:z0-5,z1:z1+5,heights});
 }
 mountains.add(far);return{group,mountains,terrain:land,water,background:{group:far,records,height:(x,z)=>Math.max(...fields.map(f=>f(x,z).height))}};
}
