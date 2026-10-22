import {expect,it} from "vitest";
import * as THREE from "three";
import {CROSSROADS_ROUTES,CROSSROADS_PEOPLE} from "../src/crossroads";
import {roofClear} from "../src/passageSpace";
import {HALLS,BRIDGE} from "../src/passageLayout";
import {BUILDING_KINDS} from "../src/passageLife";
import {buildCrossroadsHouse} from "../src/crossroadsArchitecture";

it("keeps both crossroads and the bank-lane connection clear of building wings",()=>{
  for(const path of CROSSROADS_ROUTES)for(let i=1;i<path.length;i++)for(let t=0;t<=1;t+=.025){
    const [a,b]=[path[i-1],path[i]],p={s:a[0]+(b[0]-a[0])*t,d:a[1]+(b[1]-a[1])*t};
    expect(roofClear(p,.45),`crossroads lane ${p.s},${p.d}`).toBe(true);
  }
  for(const p of CROSSROADS_PEOPLE)expect(roofClear(p,.2),`resident ${p.s},${p.d}`).toBe(true);
  expect(BUILDING_KINDS[26]).toBe("construction");
  expect(Math.hypot(HALLS[26].s-BRIDGE.near.s,HALLS[26].d-BRIDGE.near.d)).toBeLessThan(6);
});

it("builds open joined wings with finite valley surfaces inside their reserved roof envelope",()=>{
  const house=buildCrossroadsHouse(5.8,4.6,1.6);
  const roof=house.getObjectByName("joined-gable-roofs-with-valleys") as THREE.Mesh;
  const box=new THREE.Box3().setFromObject(house);
  expect(house.userData.openFront).toBe(true);
  expect(roof.geometry.attributes.position.count).toBeGreaterThan(1000);
  for(const attribute of [roof.geometry.attributes.position,roof.geometry.attributes.normal])
    expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
  expect(box.min.x).toBeGreaterThanOrEqual(-3.11);expect(box.max.x).toBeLessThanOrEqual(3.11);
  expect(box.min.z).toBeGreaterThanOrEqual(-2.54);expect(box.max.z).toBeLessThanOrEqual(2.54);
  expect(house.getObjectByName("roof-valley-seams")).toBeDefined();
  house.traverse(n=>{if(n instanceof THREE.Mesh||n instanceof THREE.Line)n.geometry.dispose();});
});
