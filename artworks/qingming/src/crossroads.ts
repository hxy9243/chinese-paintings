import * as THREE from "three";
import {scrollPoint} from "./scrollLayout";
import {GROUND_Y} from "./passageLayout";
import {paintMaterial,createDryInk} from "./paintMaterial";

// Two crossing streets are kept open between the observed roof groups. The
// eastern arm bends into the existing bank-side lane rather than ending at a wall.
export const CROSSROADS_ROUTES=[
  [[-46,2.2],[-35.5,2.2],[-27,2.2],[-24,7.9],[-18,7.9]],
  [[-35.5,-20],[-35.5,-8],[-35.5,2.2],[-35.5,20]],
];
export const CROSSROADS_PEOPLE=[
  [-43,3.8,.2],[-41.9,3.1,2.9],[-39.5,3.5,.3],[-38.7,4,3.2],[-37.1,3.1,.1],
  [-33.7,3.8,2.8],[-32.6,3.1,.2],[-31.4,4.1,3],[-29.2,3.6,.2],[-27.7,3.8,2.9],
  [-35.9,-13,1.5],[-35.1,-11,-1.5],[-35.8,-6.9,1.5],[-35.1,-4.8,-1.5],
  [-35.9,7.6,1.5],[-35.1,10.1,-1.5],[-35.8,13,1.5],[-35.1,15.4,-1.5],
  [-31.4,.2,-1.5],[-30.5,.4,1.5],[-40.6,-1.6,-1.5],[-39.7,-1.4,1.5],
  [-25.8,6.5,.4],[-24.5,7.2,3],[-32.6,4.1,-1.4],[-31.9,4.1,1.4],
].map(([s,d,angle])=>({s,d,angle}));

export function createCrossroadsGround(){
  const root=new THREE.Group();root.name="western-crossroads";
  const earth=paintMaterial(0xb7a477,true),stone=paintMaterial(0xa59b80),wood=paintMaterial(0x8d7651),ink=createDryInk(.23);
  const positions:number[]=[],marks:number[]=[];
  for(const route of CROSSROADS_ROUTES)for(let i=1;i<route.length;i++){
    const [as,ad]=route[i-1],[bs,bd]=route[i],ds=bs-as,dd=bd-ad,len=Math.hypot(ds,dd),nx=-dd/len,nz=ds/len;
    const p=(s:number,d:number)=>{const v=scrollPoint(s,d);return [v.x,GROUND_Y+.006,v.z];};
    const w=route===CROSSROADS_ROUTES[0]?1.25:1.05;
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
  const well=new THREE.Group();well.name="crossroads-well";well.position.copy(scrollPoint(-26.8,.7));well.position.y=GROUND_Y;root.add(well);
  for(let row=0;row<3;row++)for(let i=0;i<10;i++){
    const a=(i+row*.5)/10*Math.PI*2;
    const block=new THREE.Mesh(new THREE.BoxGeometry(.22,.11,.12),stone);block.position.set(Math.cos(a)*.31,.055+row*.115,Math.sin(a)*.31);block.rotation.y=-a+Math.PI/2;well.add(block);
  }
  for(const side of [-1,1]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,1.25,6),wood);post.position.set(side*.48,.625,0);well.add(post);}
  const spindle=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,1.1,8),wood);spindle.rotation.z=Math.PI/2;spindle.position.y=1.1;well.add(spindle);
  const rope=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,1.1,0),new THREE.Vector3(0,.16,0)]),ink);well.add(rope);
  const bucket=new THREE.Mesh(new THREE.CylinderGeometry(.095,.07,.17,8,1,true),wood);bucket.position.set(.64,.09,.18);well.add(bucket);
  // Irregular doorstep slabs stop at each frontage; the crossing stays earth.
  for(const [s,d] of [[-30.8,-.85],[-40.1,-2.45],[-30.8,4.55],[-40.1,4.55]])for(let j=-2;j<=2;j++){
    const slab=new THREE.Mesh(new THREE.BoxGeometry(.39,.035,.3),stone),p=scrollPoint(s+j*.41,d);
    slab.position.set(p.x,GROUND_Y+.018,p.z);slab.rotation.y=-Math.PI*50/180;root.add(slab);
  }
  root.userData={routes:CROSSROADS_ROUTES,reference:"uploaded crossroads crop"};
  return root;
}
