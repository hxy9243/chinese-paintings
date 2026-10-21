import {expect,it} from "vitest";
import * as THREE from "three";
import {BEND_BUILDINGS,BEND_BOATS,BEND_INTERACTIONS,BEND_LANDINGS,BEND_PEOPLE,BEND_TREES,bendCargoPositions} from "../src/riverBendLayout";
import {createRiverBend} from "../src/riverBend";
import {scrollPoint,REFERENCE_AZIMUTH} from "../src/scrollLayout";
import {GROUND_Y,shoreDepth} from "../src/passageLayout";
function roofGap(a:typeof BEND_BUILDINGS[number],b:typeof BEND_BUILDINGS[number]){
  return Math.max(...[a.angle,a.angle+Math.PI/2,b.angle,b.angle+Math.PI/2].map(angle=>{
    const extent=(h:typeof a)=>(h.width/2+.2)*Math.abs(Math.cos(h.angle-angle))+(h.depth/2+.23)*Math.abs(Math.sin(h.angle-angle));
    return Math.abs((a.s-b.s)*Math.cos(angle)+(a.d-b.d)*Math.sin(angle))-extent(a)-extent(b);
  }));
}
it("clusters roof groups without intersecting roofs or closing the working quay",()=>{
  for(const [i,a] of BEND_BUILDINGS.entries())for(const b of BEND_BUILDINGS.slice(i+1))
    expect(roofGap(a,b),`${a.id}/${b.id}`).toBeGreaterThan(.08);
  const nearest=BEND_BUILDINGS.filter(h=>h.side==="near").map(a=>Math.min(...BEND_BUILDINGS.filter(b=>b!==a&&b.side===a.side).map(b=>roofGap(a,b))));
  expect(nearest.filter(g=>g<1.5).length).toBeGreaterThanOrEqual(6);
});
it("anchors both activities to a real berth, dry landing, and exposed deck edge",()=>{
  expect(BEND_INTERACTIONS.map(a=>a.id)).toEqual(["boarding","loading"]);
  for(const a of BEND_INTERACTIONS){
    const b=BEND_BOATS.find(b=>b.id===a.boatId)!;
    const ds=a.deck.s-b.s,dd=a.deck.d-b.d;
    const u=ds*Math.cos(b.angle)+dd*Math.sin(b.angle),v=-ds*Math.sin(b.angle)+dd*Math.cos(b.angle);
    expect(Math.abs(u)).toBeCloseTo(b.length*.32);
    expect(v).toBeCloseTo(b.width*.43);
    expect(a.bank.d).toBeGreaterThan(shoreDepth("near",a.bank.s));
    expect(BEND_LANDINGS.some(l=>Math.abs(l.s-a.bank.s)<.01)).toBe(true);
    expect(BEND_TREES.some(t=>Math.hypot(t.s-a.bank.s,t.d-a.bank.d)<1)).toBe(false);
    expect(BEND_PEOPLE.some(p=>Math.hypot(p.s-a.bank.s,p.d-a.bank.d)<1.1)).toBe(false);
  }
});
it("renders sloped supported gangplanks and distinct actors in coarse and refined chunks",()=>{
  const root=new THREE.Group();
  const result=createRiverBend(root,{
    hall(parent,s,d,w,depth,h){const g=new THREE.Group();parent.add(g);return g;},
    person(parent){const p=new THREE.Group();for(const name of ["torso","left-arm","right-arm","left-leg","right-leg"]){const n=new THREE.Group();n.name=name;p.add(n);}parent.add(p);return p;},
    cart(parent){const group=new THREE.Group();parent.add(group);return {group};},batch(){},
  });
  const camera=new THREE.OrthographicCamera(-120,120,120,-120,.1,500);
  camera.position.set(0,150,0);camera.lookAt(0,0,0);
  result.update(camera,false,4);
  root.updateMatrixWorld(true);
  for(const a of BEND_INTERACTIONS){
    const planks:THREE.Object3D[]=[];root.traverse(n=>{if(n.name===`${a.id}-gangplank`)planks.push(n);});
    expect(planks).toHaveLength(2);
    const A=scrollPoint(a.bank.s,a.bank.d),B=scrollPoint(a.deck.s,a.deck.d);A.y=GROUND_Y+.035;B.y=.37;
    for(const plank of planks){
      const bounds=new THREE.Box3().setFromObject(plank);
      expect(bounds.min.y).toBeGreaterThan(.30);
      expect(bounds.max.y).toBeLessThan(GROUND_Y+.08);
      const half=A.distanceTo(B)/2;
      expect(plank.localToWorld(new THREE.Vector3(0,0,-half)).distanceTo(A)).toBeLessThan(1e-6);
      expect(plank.localToWorld(new THREE.Vector3(0,0,half)).distanceTo(B)).toBeLessThan(1e-6);
    }
    expect(root.getObjectByName(`${a.id}-${a.id==="loading"?"receiver":"traveler"}`)).toBeDefined();
  }
  for(const h of BEND_BUILDINGS.filter(h=>h.side==="near")){
    const yards:THREE.Object3D[]=[];root.traverse(n=>{if(n.name===`${h.id}-stockyard`)yards.push(n);});
    expect(yards).toHaveLength(2);
    const inverse=new THREE.Matrix4().makeRotationY(REFERENCE_AZIMUTH-h.angle).setPosition(scrollPoint(h.s,h.d)).invert();
    for(const yard of yards)yard.traverse(n=>{
      if(n instanceof THREE.Mesh||n instanceof THREE.Line){
        const positions=n.geometry.getAttribute("position");
        for(let i=0;i<positions.count;i++){
          const p=new THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(n.matrixWorld).applyMatrix4(inverse);
          expect(p.z,`${h.id} stock intrudes into wall`).toBeLessThan(-h.depth/2-.15);
        }
      }
    });
  }
  const rigs:THREE.Object3D[]=[];root.traverse(n=>{if(n.name==="battened-sail")rigs.push(n);});
  expect(rigs.some(r=>r.scale.y>.9)).toBe(true);
  expect(rigs.some(r=>r.scale.y<.1)).toBe(true);
  expect(result.inventory().interactions).toEqual(["boarding","loading"]);
  root.traverse(n=>{if(n instanceof THREE.Mesh||n instanceof THREE.Line)n.geometry.dispose();});
});


it("reserves foot clearance around cargo for deck crews and exchange partners",async()=>{
  const {boatCrewStations}=await import("../src/referenceDetails");
  for(const b of BEND_BOATS){
    const feet=boatCrewStations(b.length,b.width,b.style).filter(p=>p.role!=="roof").slice(0,b.crew);
    for(const a of BEND_INTERACTIONS.filter(a=>a.boatId===b.id)){
      const ds=a.deck.s-b.s-(a.id==="boarding"?.24:0),dd=a.deck.d-b.d-(a.id==="boarding"?.17:.16);
      feet.push({x:ds*Math.sin(b.angle)-dd*Math.cos(b.angle),y:.34,z:ds*Math.cos(b.angle)+dd*Math.sin(b.angle),role:"haul",facing:0});
    }
    for(const cargo of bendCargoPositions(b))for(const foot of feet)
      expect(((cargo.x-foot.x)/.25)**2+((cargo.z-foot.z)/.32)**2,`${b.id} crew/cargo clearance`).toBeGreaterThan(1);
    if(b.variant==="open-hold")for(const c of bendCargoPositions(b)){
      expect(c.y-.12).toBeCloseTo(.14);expect(Math.abs(c.z)+.19).toBeLessThan(b.length*.224);
    }
  }
});

it("keeps passing hulls clear of boarding and loading connectors",async()=>{
  const {BOATS}=await import("../src/passageLayout"),{boatPose}=await import("../src/passageLife");
  const gap=(a:{s:number;d:number;angle:number;length:number;width:number},b:typeof a)=>Math.max(...[a.angle,a.angle+Math.PI/2,b.angle,b.angle+Math.PI/2].map(angle=>{
    const radius=(h:typeof a)=>h.length/2*Math.abs(Math.cos(h.angle-angle))+h.width/2*Math.abs(Math.sin(h.angle-angle));
    return Math.abs((a.s-b.s)*Math.cos(angle)+(a.d-b.d)*Math.sin(angle))-radius(a)-radius(b);
  }));
  for(const a of BEND_INTERACTIONS){
    const ds=a.deck.s-a.bank.s,dd=a.deck.d-a.bank.d;
    const connector={s:(a.bank.s+a.deck.s)/2,d:(a.bank.d+a.deck.d)/2,angle:Math.atan2(dd,ds),length:Math.hypot(ds,dd),width:.38};
    for(let t=0;t<400;t+=1.5)for(const [i,hull] of BOATS.entries()){
      const p=boatPose(i,t);if(p.s>-22)continue;
      expect(gap(connector,{...p,length:hull.length*1.24,width:hull.width*1.4+.08}),`${a.id}, moving boat ${i} at ${t}`).toBeGreaterThan(.02);
    }
  }
});
