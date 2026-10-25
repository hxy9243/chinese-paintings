import * as THREE from "three";
import {scrollPoint} from "./scrollLayout";
import {GROUND_Y,type PassagePoint} from "./passageLayout";
import {reserve} from "./passageSpace";
import {wander} from "./peopleMotion";
import {paintMaterial,createDryInk} from "./paintMaterial";
import {CROSSROADS_ROUTES} from "./roadSurface";

// The routes live with the road surface so the ground shader can feather them.
export {CROSSROADS_ROUTES};
// Parked reference ox carts (s, d, heading) and the well. Street walkers and
// riders treat their complete footprints as obstacles.
export const CROSSROADS_CARTS=[[-40.3,6.5,.05],[-37.6,12.4,Math.PI/2]] as const;
export const CROSSROADS_CART_HALF={length:2.1,width:.97} as const;
export const CROSSROADS_WELL={s:-35.0,d:2.9,radius:.72} as const;
export const LOITER_SPACE=.6,LOITER_WANDER=.42;
function routePoint(route:readonly (readonly number[])[], distance:number, lateral:number){
  for(let i=1;i<route.length;i++){
    const [a,b]=[route[i-1],route[i]],ds=b[0]-a[0],dd=b[1]-a[1],length=Math.hypot(ds,dd);
    if(distance<=length)return {s:a[0]+ds*distance/length-dd*lateral/length,d:a[1]+dd*distance/length+ds*lateral/length};
    distance-=length;
  }
  return null;
}
// A few neighbours linger at shop fronts on the street shoulders. Each one
// reserves its whole wandering space, so the moving street crowd and riders
// pass around them instead of through them.
export const CROSSROADS_PEOPLE:PassagePoint[]=[];
for(const [route,start,spacing,shoulder] of [[0,7,3.1,1.75],[1,3,3.4,2.05]] as const)
  for(let k=0;CROSSROADS_PEOPLE.length<(route?18:9)&&k<40;k++){
    const p=routePoint(CROSSROADS_ROUTES[route],start+k*spacing,(k%2?1:-1)*shoulder);
    if(!p)break;
    if(p.s>-26)continue;
    if(CROSSROADS_CARTS.some(([s,d,a])=>{
      const u=(p.s-s)*Math.cos(a)+(p.d-d)*Math.sin(a),v=-(p.s-s)*Math.sin(a)+(p.d-d)*Math.cos(a);
      return Math.hypot(Math.max(0,Math.abs(u)-CROSSROADS_CART_HALF.length),Math.max(0,Math.abs(v)-CROSSROADS_CART_HALF.width))<LOITER_SPACE+1.3;
    }))continue;
    // Keep both streets open: never stand on the other street's carriageway.
    if(CROSSROADS_ROUTES.some(r=>r.some((a,i)=>{
      if(!i)return false;
      const b=r[i-1],ds=a[0]-b[0],dd=a[1]-b[1],t=Math.max(0,Math.min(1,((p.s-b[0])*ds+(p.d-b[1])*dd)/(ds*ds+dd*dd)));
      return Math.hypot(p.s-b[0]-ds*t,p.d-b[1]-dd*t)<1.6;
    })))continue;
    if(Math.hypot(p.s-CROSSROADS_WELL.s,p.d-CROSSROADS_WELL.d)<CROSSROADS_WELL.radius+LOITER_SPACE+.05)continue;
    if(reserve(p,LOITER_SPACE,"person"))CROSSROADS_PEOPLE.push(p);
  }
export function loiterPose(index:number,time:number,seed=0){
  const home=CROSSROADS_PEOPLE[index],p=wander(index+900,time,LOITER_WANDER,seed);
  return {...p,s:home.s+p.s,d:home.d+p.d,y:GROUND_Y};
}

export function createCrossroadsGround(){
  const root=new THREE.Group();root.name="western-crossroads";
  // The street itself is a feathered wash in the ground shader (roadSurface);
  // only sparse, faint wheel marks are drawn on top of it.
  const stone=paintMaterial(0xa59b80),wood=paintMaterial(0x8d7651),ink=createDryInk(.23),wheelInk=createDryInk(.07);
  const marks:number[]=[];
  for(const route of CROSSROADS_ROUTES)for(let i=1;i<route.length;i++){
    const [as,ad]=route[i-1],[bs,bd]=route[i],ds=bs-as,dd=bd-ad,len=Math.hypot(ds,dd),nx=-dd/len,nz=ds/len;
    for(let t=.12;t<len;t+=.17){
      if(Math.sin(t*8+i)+Math.sin(t*2.3+i*1.7)*.8<.35)continue;
      for(const side of [-1,1])for(const end of [0,.12]){
        const s=as+ds/len*(t+end)+nx*side*.27,d=ad+dd/len*(t+end)+nz*side*.27;
        const v=scrollPoint(s,d);marks.push(v.x,GROUND_Y+.012,v.z);
      }
    }
  }
  root.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(marks,3)),wheelInk));
  // A low well with real masonry courses, winding frame, rope and bucket.
  const well=new THREE.Group();well.name="crossroads-well";well.position.copy(scrollPoint(CROSSROADS_WELL.s,CROSSROADS_WELL.d));well.position.y=GROUND_Y;root.add(well);
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
