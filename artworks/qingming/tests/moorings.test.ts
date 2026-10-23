import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { MOORED_BOATS, mooredBoatPose, mooringAnchor } from "../src/moorings";
import { BOATS, shoreDepth, SHORELINES, onBank, GROUND_Y } from "../src/passageLayout";
import { boatPose } from "../src/passageLife";
import { bridgeClear, segmentDistance } from "../src/passageSpace";
import { vesselFootprint } from "./helpers/vesselGeometry";
import {scrollPoint} from "../src/scrollLayout";
import { createBridgeStudy } from "../src/bridgeStudy";
type Hull = {
  s: number;
  d: number;
  angle: number;
  length: number;
  width: number;
  cabin: boolean;
};
function footprint(h:Hull){return vesselFootprint(h.length,h.width,h.cabin).map(v=>({s:h.s+v.z*Math.cos(h.angle)+v.x*Math.sin(h.angle),d:h.d+v.z*Math.sin(h.angle)-v.x*Math.cos(h.angle)}));}
function gap(a: Hull, b: Hull) {
  const A=footprint(a),B=footprint(b),axes=new Map<string,[number,number]>();
  for(const poly of [A,B])for(let i=0;i<poly.length;i++){
    const p=poly[i],q=poly[(i+1)%poly.length],dx=q.s-p.s,dy=q.d-p.d,length=Math.hypot(dx,dy);
    if(length<1e-7)continue;
    let x=-dy/length,y=dx/length;if(x<0){x=-x;y=-y;}
    axes.set(`${x.toFixed(5)},${y.toFixed(5)}`,[x,y]);
  }
  let separation=-Infinity;
  for(const [x,y] of axes.values()){
    const pa=A.map(p=>p.s*x+p.d*y),pb=B.map(p=>p.s*x+p.d*y);
    separation=Math.max(separation,Math.min(...pb)-Math.max(...pa),Math.min(...pa)-Math.max(...pb));
  }
  return separation;
}
describe("both-bank moorings", () => {
  it("keeps eight traced berths afloat, outside the arch and separated from passing hulls", () => {
    expect(MOORED_BOATS).toHaveLength(8);
    let trafficGap = Infinity;
    MOORED_BOATS.forEach((b, i) => {
      expect(bridgeClear(b, b.length * 0.62)).toBe(true);
      const shore=SHORELINES[b.side];
      const centerToBank=Math.min(...shore.slice(1).map((p,j)=>segmentDistance(b,{a:shore[j],b:p})));
      for(const side of [-1,1]){
        const anchor=mooringAnchor(i,side),x=(b.side==="far"?1:-1)*b.width*.5,u=side*b.length*.31;
        const start={s:b.s+u*Math.cos(b.angle)+x*Math.sin(b.angle),d:b.d+u*Math.sin(b.angle)-x*Math.cos(b.angle)};
        expect(onBank(b.side,anchor,.20),`boat ${i} anchor on dry bank`).toBe(true);
        expect(Math.hypot(start.s-anchor.s,start.d-anchor.d),`boat ${i} rope ${side}`)
          .toBeLessThan(centerToBank+Math.hypot(b.length*.31,b.width*.5)+.4);
      }
      for (let j = i + 1; j < MOORED_BOATS.length; j++)
        expect(gap(b, MOORED_BOATS[j]),`berths ${i}/${j}`).toBeGreaterThan(0.1);
      for (let t = 0; t <= 1200; t += 40) {
        const p = mooredBoatPose(i, t);
        expect([p.s, p.d, p.angle]).toEqual([b.s, b.d, b.angle]);
        for (let k = 0; k < BOATS.length; k++)
          trafficGap = Math.min(
            trafficGap,
            gap(p, { ...BOATS[k], ...boatPose(k, t) }),
          );
      }
      for(const v of vesselFootprint(b.length,b.width,b.cabin)){
        const s=b.s+v.z*Math.cos(b.angle)+v.x*Math.sin(b.angle),
          d=b.d+v.z*Math.sin(b.angle)-v.x*Math.cos(b.angle);
        expect(d-shoreDepth("far",s),`boat ${i} far-bank hull`).toBeGreaterThan(.04);
        expect(shoreDepth("near",s)-d,`boat ${i} near-bank hull`).toBeGreaterThan(.04);
      }
    });
    expect(trafficGap).toBeGreaterThan(0.08);
  });
  it("bobs rendered moored boats and their crews, follows the ropes, and freezes on pause", () => {
    const study = createBridgeStudy(0),
      boats = study.group.children.filter((n) => n.name === "moored-boat"),
      ropes = study.group.children.filter(
        (n) => n.name === "mooring-line",
      ) as THREE.Line[];
    expect(boats).toHaveLength(8);
    expect(ropes).toHaveLength(16);
    study.update(0);
    boats.forEach((vessel,index)=>{
      const b=MOORED_BOATS[index];vessel.updateWorldMatrix(true,false);
      [-1,1].forEach((side,endIndex)=>{
        const rope=ropes[index*2+endIndex],points=rope.geometry.getAttribute("position");
        const start=vessel.localToWorld(new THREE.Vector3((b.side==="far"?1:-1)*b.width*.5,.3,side*b.length*.31));
        expect(new THREE.Vector3().fromBufferAttribute(points,0).distanceTo(start)).toBeLessThan(1e-5);
        const anchor=mooringAnchor(index,side),end=scrollPoint(anchor.s,anchor.d);end.y=GROUND_Y+.2;
        expect(new THREE.Vector3().fromBufferAttribute(points,points.count-1).distanceTo(end)).toBeLessThan(1e-5);
      });
    });
    const xy = boats.map((b) => [b.position.x, b.position.z]),
      y = boats.map((b) => b.position.y),
      lines = ropes.map((r) =>
        Array.from(r.geometry.getAttribute("position").array),
      );
    study.update(7);
    expect(boats.map((b) => [b.position.x, b.position.z])).toEqual(xy);
    expect(boats.map((b) => b.position.y)).not.toEqual(y);
    expect(
      ropes.map((r) => Array.from(r.geometry.getAttribute("position").array)),
    ).not.toEqual(lines);
    expect(
      boats.every(
        (b) => b.children.filter((n) => n.name === "boat-crew").length === (b.userData.boatStyle === "cabin" ? 6 : b.userData.boatStyle === "skiff" ? 2 : 3),
      ),
    ).toBe(true);
    const paused = boats.map((b) => [
      ...b.position.toArray(),
      ...b.quaternion.toArray(),
    ]);
    study.update(7);
    expect(
      boats.map((b) => [...b.position.toArray(), ...b.quaternion.toArray()]),
    ).toEqual(paused);
    study.group.traverse((n) => {
      if (n instanceof THREE.Mesh || n instanceof THREE.Line)
        n.geometry.dispose();
    });
  });
});
