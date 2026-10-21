import * as THREE from "three";
import {BEND_BUILDINGS,BEND_BOATS,BEND_LANDINGS,BEND_PEOPLE,BEND_TREES,BEND_ZONES} from "./riverBendLayout";
import {GROUND_Y,PERSON_SCALE,shoreDepth} from "./passageLayout";
import {scrollPoint,REFERENCE_AZIMUTH} from "./scrollLayout";
import {buildReferenceBoat,buildReferenceTree} from "./referenceAssets";
import {addCrewEquipment,boatCrewStations,buildLoweringRig,updateLoweringRig} from "./referenceDetails";
import {paintMaterial,createDryInk} from "./paintMaterial";
import {wovenBasket,marketStall} from "./marketModels";
import {createProgressiveScene} from "./progressiveScene";
import type {BuildingKind} from "./passageLife";
import type {DetailLevel} from "../../../packages/scene-kit/lod";

type P=[number,number,number];
interface Builders {
  hall:(parent:THREE.Group,s:number,d:number,w:number,depth:number,h:number,turn?:number,kind?:BuildingKind)=>THREE.Group;
  person:(parent:THREE.Object3D,variant:number,walking?:boolean,detail?:DetailLevel)=>THREE.Group;
  cart:(parent:THREE.Group,index:number,clip?:boolean)=>{group:THREE.Group};
  batch:(parent:THREE.Group)=>void;
}
const wood=paintMaterial(0x9f814f),dark=paintMaterial(0x61533d),plaster=paintMaterial(0xc8b486),
  tiles=paintMaterial(0x786746),cloth=paintMaterial(0xc8bb96),ink=createDryInk(.4);
function box(g:THREE.Object3D,size:P,at:P,m=wood){const o=new THREE.Mesh(new THREE.BoxGeometry(...size),m);o.position.set(...at);g.add(o);return o;}
function rod(g:THREE.Object3D,a:P,b:P,r=.018){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),v=B.clone().sub(A),o=new THREE.Mesh(new THREE.CylinderGeometry(r*.8,r,v.length(),5),wood);o.position.copy(A.add(B).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());g.add(o);return o;}
function line(g:THREE.Object3D,points:P[]){g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))),ink));}
function at(g:THREE.Object3D,s:number,d:number,y=GROUND_Y,angle=0){g.position.copy(scrollPoint(s,d));g.position.y=y;g.rotation.y=REFERENCE_AZIMUTH-angle;return g;}
function lowHouse(g:THREE.Group,h:typeof BEND_BUILDINGS[number]){
  const house=new THREE.Group();g.add(house);at(house,h.s,h.d);
  const height=h.height*(h.kind==="upper-storey"?2:1),w=h.width/2+.2,d=h.depth/2+.23;
  if(h.kind==="openhall"||h.kind==="shed")for(const x of [-w*.8,0,w*.8])for(const z of [-d*.8,d*.8])box(house,[.06,height,.06],[x,height/2,z]);
  else box(house,[h.width,height,h.depth],[0,height/2,0],plaster);
  const geo=new THREE.BufferGeometry(),y=height+.08,top=height+Math.min(.64,h.depth*.23);
  geo.setAttribute("position",new THREE.Float32BufferAttribute([-w,y,-d,w,y,-d,w,top,0,-w,y,-d,w,top,0,-w,top,0,-w,top,0,w,top,0,w,y,d,-w,top,0,w,y,d,-w,y,d],3));geo.computeVertexNormals();house.add(new THREE.Mesh(geo,tiles));
}
function landing(g:THREE.Group,l:typeof BEND_LANDINGS[number],detail:DetailLevel){
  const root=new THREE.Group();g.add(root);at(root,l.s,l.d,.02,Math.atan((shoreDepth("near",l.s+.1)-shoreDepth("near",l.s-.1))/.2));
  // Low bank steps and a projecting planked platform, supported by real piles.
  for(let j=0;j<4;j++)box(root,[l.width,.12,.32],[0,.07+j*.105,-.15+j*.29],j%2?dark:wood);
  for(const x of [-l.width*.43,l.width*.43])for(const z of [-.7,.35])rod(root,[x,-.14,z],[x,.42,z],.042);
  box(root,[l.width,.06,1.15],[0,.22,-.3]);
  if(detail)for(let x=-l.width/2;x<l.width/2;x+=.15)line(root,[[x,.255,-.87],[x,.255,.27]]);
  for(const x of [-l.width*.6,l.width*.65])rod(root,[x,.3,.75],[x,1.2,.75],.035);
  // Leaning loading pole, pulley, suspended line and tied cargo.
  if(detail){rod(root,[-.7,.5,1.1],[-.45,2.3,.7],.035);rod(root,[-.45,2.3,.7],[.65,2.65,-.1],.028);line(root,[[.65,2.65,-.1],[.65,.65,-.1]]);wovenBasket(root,.65,.5,-.1,.16,.22);}
  for(let i=0;i<5;i++){
    const sack=new THREE.Mesh(new THREE.SphereGeometry(1,detail?10:5,detail?7:4),cloth);sack.scale.set(.18,.22,.13);sack.position.set((i%3-.8)*.4,.62+Math.floor(i/3)*.24,1.25);root.add(sack);
    if(detail)line(root,[[sack.position.x-.15,sack.position.y,sack.position.z],[sack.position.x+.15,sack.position.y,sack.position.z]]);
  }
}
export function createRiverBend(parent:THREE.Group,build:Builders){
  const root=new THREE.Group();root.name="river-bend-extension";parent.add(root);
  const makeZone=(left:number,right:number,detail:0|2)=>{
    const g=new THREE.Group();g.name=`bend-${left}-detail-${detail}`;
    const inZone=(p:{s:number})=>p.s>=left&&p.s<right;
    for(const h of BEND_BUILDINGS.filter(inZone)){
      if(detail)build.hall(g,h.s,h.d,h.width,h.depth,h.height,REFERENCE_AZIMUTH+(h.side==="near"?Math.PI:0),h.kind);
      else lowHouse(g,h);
    }
    for(const t of BEND_TREES.filter(inZone)){
      const tree=buildReferenceTree(t.form,t.seed,detail,t.size>1.4);g.add(tree);at(tree,t.s,t.d);tree.scale.set(t.size,t.size*1.3,t.size);
    }
    for(const l of BEND_LANDINGS.filter(inZone))landing(g,l,detail);
    for(const [i,b] of BEND_BOATS.entries())if(inZone(b)){
      const boat=buildReferenceBoat(b.length,b.width,b.style,detail);g.add(boat);at(boat,b.s,b.d,0,b.angle-Math.PI/2);
      if(b.style==="cabin"||b.style==="freight"){
        const rig=buildLoweringRig(b.length,b.width);boat.add(rig);updateLoweringRig(rig,i===6?12:0);addCrewEquipment(boat,b.length,b.width,b.style);
      }
      for(let j=0;j<3;j++){
        const sack=new THREE.Mesh(new THREE.SphereGeometry(1,detail?10:5,detail?7:4),cloth);
        sack.scale.set(.12,.12,.19);sack.position.set((j%2-.5)*b.width*.38,.45,-b.length*.32+(j===2?.16:0));boat.add(sack);
      }
      if(detail)for(const side of [-1,1])rod(boat,[side*b.width*.38,.42,-b.length*.16],[side*b.width*.38,.42,b.length*.2],.018);
      const stations=boatCrewStations(b.length,b.width,b.style).slice(0,b.crew);
      for(const [j,station] of stations.entries()){
        const p=build.person(boat,j%3===0?1:3,false,detail?1:0);p.position.set(station.x,station.y,station.z);p.scale.multiplyScalar(PERSON_SCALE);p.rotation.y=station.facing;
        if(station.role==="haul"){const arm=p.getObjectByName("right-arm");if(arm)arm.rotation.x=-1.5;}
      }
      // Mooring ropes run from both hull ends to bank stakes.
      if(b.side!==0){const shore=b.side===1?"near":"far",sign=shore==="near"?1:-1;
        for(const end of [-1,1]){
          const s=b.s+end*b.length*.3*Math.cos(b.angle),d=b.d+end*b.length*.3*Math.sin(b.angle),bankD=shoreDepth(shore,s)+sign*.25,
            A=scrollPoint(s,d),B=scrollPoint(s,bankD);
          line(g,[[A.x,.26,A.z],[(A.x+B.x)/2,.18,(A.z+B.z)/2],[B.x,.65,B.z]]);rod(g,[B.x,GROUND_Y,B.z],[B.x,.73,B.z],.035);
        }
      }
    }
    for(const p of BEND_PEOPLE.filter(inZone)){
      const figure=build.person(g,p.variant,false,detail?1:0);at(figure,p.s,p.d,GROUND_Y,p.angle);figure.scale.multiplyScalar(PERSON_SCALE);
      const torso=figure.getObjectByName("torso");if(torso&&p.variant===9)torso.rotation.x=.18;
    }
    for(const [i,s] of [-26,-36,-48,-57].entries())if(inZone({s})){
      const d=shoreDepth("near",s)+2;
      const stand=marketStall(g,10+i,i%2===0);at(stand,s,d);stand.scale.setScalar(.68);
      if(detail)for(let j=0;j<4;j++)wovenBasket(stand,(j-1.5)*.22,.12,-.7,.13,.21);
    }
    for(const [i,s] of [-31,-43,-51].entries())if(inZone({s})){
      const cart=build.cart(g,[0,4,5][i],false).group;at(cart,s,shoreDepth("near",s)+1.5,GROUND_Y,Math.atan((shoreDepth("near",s+.1)-shoreDepth("near",s-.1))/.2));
    }
    // Stockyard bundles, a timber sign frame and low benches beside open shops.
    for(const h of BEND_BUILDINGS.filter(inZone).filter(h=>h.side==="near")){
      const yard=new THREE.Group();g.add(yard);at(yard,h.s,h.d-h.depth/2-.55);
      box(yard,[.75,.07,.25],[h.width*.28,.31,0]);
      for(const x of [h.width*.28-.27,h.width*.28+.27])box(yard,[.055,.28,.19],[x,.14,0]);
      for(let j=0;j<(detail?7:3);j++)rod(yard,[-h.width*.3+j*.045,.12+(j%2)*.04,-.3],[-h.width*.3+j*.045,.12+(j%2)*.04,.3],.028);
      if(h.kind==="shop"||h.kind==="courtyard"){
        for(const x of [-.45,.45])rod(yard,[x,0,0],[x,1.65,0],.033);
        rod(yard,[-.6,1.55,0],[.6,1.55,0],.033);box(yard,[.55,.28,.025],[0,1.3,0],cloth);
      }
    }
    // Towpath wheel ruts follow the bend rather than cutting across the water.
    for(const side of ["near","far"] as const)for(const offset of [.8,1.05]){
      const points:P[]=[];for(let s=left;s<=right;s+=.2){const p=scrollPoint(s,shoreDepth(side,s)+(side==="near"?offset:-offset));points.push([p.x,GROUND_Y+.008,p.z]);}line(g,points);
    }
    build.batch(g);return g;
  };
  const chunks=BEND_ZONES.map(([left,right])=>{
    const coarse=makeZone(left,right,0);
    const bounds=new THREE.Box3().setFromObject(coarse).expandByScalar(1);
    return {id:`river-bend-${left}`,bounds,coarse,buildFine:()=>makeZone(left,right,2)};
  });
  const buffered=createProgressiveScene(root,chunks);
  return {...buffered,inventory:()=>({buildings:BEND_BUILDINGS.length,boats:BEND_BOATS.length,boatCrew:BEND_BOATS.reduce((n,b)=>n+Math.min(b.crew,boatCrewStations(b.length,b.width,b.style).length),0),people:BEND_PEOPLE.length,trees:BEND_TREES.length,landings:BEND_LANDINGS.length,carts:3,stalls:4})};
}
