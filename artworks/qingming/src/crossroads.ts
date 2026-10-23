import * as THREE from "three";
import {scrollPoint} from "./scrollLayout";
import {GROUND_Y} from "./passageLayout";
import {paintMaterial,createDryInk} from "./paintMaterial";

// The main street is bounded by opposing shop rows, opens at the cart crossing,
// then continues between foreground roof groups to the lower crop boundary.
export const CROSSROADS_ROUTES=[
  [[-60,6.5],[-37.0,6.5],[-34.0,7.25],[-32.8,7.75],[-24.6,7.75],[-20,7.75],[-12,7.6],[-1,8.0],[2.5,8.0],[5.7,6.6]],
  [[-37.7,-30],[-37.7,-12],[-37.5,-6],[-36.7,4.7],[-37.4,9],[-37.8,18],[-38,30]],
];
function streetResident(route:number[][], distance:number, lateral:number){
  for(let i=1;i<route.length;i++){
    const [a,b]=[route[i-1],route[i]],ds=b[0]-a[0],dd=b[1]-a[1],length=Math.hypot(ds,dd);
    if(distance<=length)return {s:a[0]+ds*distance/length-dd*lateral/length,d:a[1]+dd*distance/length+ds*lateral/length,angle:Math.atan2(dd,ds)+(lateral<0?Math.PI:0)};
    distance-=length;
  }
  throw new Error("Crossroads resident exceeds street length");
}
export const CROSSROADS_PEOPLE=[
  ...Array.from({length:20},(_,i)=>streetResident(CROSSROADS_ROUTES[0],5+i*2.8,(i%2?1:-1)*.25)),
  ...Array.from({length:22},(_,i)=>streetResident(CROSSROADS_ROUTES[1],4+i*2.45,(i%2?1:-1)*.42)),
].map(p=>{
  // Leave the two reference ox carts unobstructed, including the complete
  // animal/yoke footprint. Browsers can stand on the earth street shoulders.
  if(p.s>-42.5&&p.s<-38.1&&Math.abs(p.d-6.5)<1)p.d=8.0;
  if(p.d>10.2&&p.d<14.6&&Math.abs(p.s+37.6)<1.3)p.s=-35.9;
  return p;
});

export function createCrossroadsGround(){
  const root=new THREE.Group();root.name="western-crossroads";
  const earth=paintMaterial(0xb7a477,true),stone=paintMaterial(0xa59b80),wood=paintMaterial(0x8d7651),ink=createDryInk(.23);
  const positions:number[]=[],marks:number[]=[];
  for(const route of CROSSROADS_ROUTES)for(let i=1;i<route.length;i++){
    const [as,ad]=route[i-1],[bs,bd]=route[i],ds=bs-as,dd=bd-ad,len=Math.hypot(ds,dd),nx=-dd/len,nz=ds/len;
    const p=(s:number,d:number)=>{const v=scrollPoint(s,d);return [v.x,GROUND_Y+.006,v.z];};
    const w=route===CROSSROADS_ROUTES[0]?1.0:1.25;
    const A=p(as+nx*w,ad+nz*w),B=p(bs+nx*w,bd+nz*w),C=p(bs-nx*w,bd-nz*w),D=p(as-nx*w,ad-nz*w);
    positions.push(...A,...B,...C,...A,...C,...D);
    for(let t=.12;t<len;t+=.17){
      if(Math.sin(t*8+i)<-.2)continue;
      for(const side of [-1,1])for(const end of [0,.12]){
        const s=as+ds/len*(t+end)+nx*side*.27,d=ad+dd/len*(t+end)+nz*side*.27;
        const v=scrollPoint(s,d);marks.push(v.x,GROUND_Y+.012,v.z);
      }
    }
  }
  const geo=new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();earth.side=THREE.DoubleSide;
  root.add(new THREE.Mesh(geo,earth));root.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(marks,3)),ink));
  // A low well with real masonry courses, winding frame, rope and bucket.
  const well=new THREE.Group();well.name="crossroads-well";well.position.copy(scrollPoint(-35.0,2.9));well.position.y=GROUND_Y;root.add(well);
  for(let row=0;row<3;row++)for(let i=0;i<10;i++){
    const a=(i+row*.5)/10*Math.PI*2;
    const block=new THREE.Mesh(new THREE.BoxGeometry(.22,.11,.12),stone);block.position.set(Math.cos(a)*.31,.055+row*.115,Math.sin(a)*.31);block.rotation.y=-a+Math.PI/2;well.add(block);
  }
  for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,1.25,6),wood);post.position.set(side*.48,.625,0);well.add(post);}
  const spindle=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1.1,8),wood);spindle.rotation.z=Math.PI/2;spindle.position.y=1.1;well.add(spindle);
  const rope=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,1.1,0),new THREE.Vector3(0,.16,0)]),ink);well.add(rope);
  const bucket=new THREE.Mesh(new THREE.CylinderGeometry(.095,.07,.17,8,1,true),wood);bucket.position.set(.64,.09,.18);well.add(bucket);
  // Irregular doorstep slabs stop at each frontage; the crossing stays earth.
  for(const [s,d] of [[-42.06,4.10],[-28.23,6.35],[-43.3,8.95],[-30.4,9.45]])for(let j=-2;j<=2;j++){
    const slab=new THREE.Mesh(new THREE.BoxGeometry(.39,.035,.3),stone),p=scrollPoint(s+j*.41,d);
    slab.position.set(p.x,GROUND_Y+.018,p.z);slab.rotation.y=-Math.PI*50/180;root.add(slab);
  }
  root.userData={routes:CROSSROADS_ROUTES,reference:"uploaded crossroads crop"};
  return root;
}
