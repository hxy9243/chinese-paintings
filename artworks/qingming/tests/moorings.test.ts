import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { MOORED_BOATS, mooredBoatPose } from "../src/moorings";
import { BOATS, shoreDepth } from "../src/passageLayout";
import { boatPose } from "../src/passageLife";
import { bridgeClear } from "../src/passageSpace";
import { createBridgeStudy } from "../src/bridgeStudy";
type Hull = {
  s: number;
  d: number;
  angle: number;
  length: number;
  width: number;
};
function gap(a: Hull, b: Hull) {
  let separation = -Infinity;
  for (const angle of [
    a.angle,
    a.angle + Math.PI / 2,
    b.angle,
    b.angle + Math.PI / 2,
  ]) {
    const radius = (h: Hull) =>
      Math.abs(Math.cos(h.angle - angle)) * h.length * 0.62 +
      Math.abs(Math.sin(h.angle - angle)) * (h.width * 0.7 + 0.06);
    separation = Math.max(
      separation,
      Math.abs((a.s - b.s) * Math.cos(angle) + (a.d - b.d) * Math.sin(angle)) -
        radius(a) -
        radius(b),
    );
  }
  return separation;
}
describe("far-bank moorings", () => {
  it("keeps four fixed berths afloat, outside the arch and separated from passing hulls", () => {
    expect(MOORED_BOATS).toHaveLength(4);
    let trafficGap = Infinity,closest="";
    MOORED_BOATS.forEach((b, i) => {
      expect(bridgeClear(b, b.length * 0.62)).toBe(true);
      expect(b.d - shoreDepth("far", b.s)).toBeLessThan(0.9);
      for (let j = i + 1; j < MOORED_BOATS.length; j++)
        expect(gap(b, MOORED_BOATS[j])).toBeGreaterThan(0.1);
      for (let t = 0; t < 1200; t += 0.73) {
        const p = mooredBoatPose(i, t);
        expect([p.s, p.d, p.angle]).toEqual([b.s, b.d, b.angle]);
        for (let k = 0; k < BOATS.length; k++) {
          const moving=boatPose(k,t),g=gap(p,{...BOATS[k],...moving});
          if(g<trafficGap){trafficGap=g;closest=`berth ${i}, boat ${k}, time ${t}: ${JSON.stringify(moving)}`;}
        }
      }
      for (let j = 0; j <= 32; j++)
        for (const side of [-1, 1]) {
          const u = (j / 32 - 0.5) * b.length * 1.24,
            v = side * (b.width * 0.7 + 0.06);
          const s = b.s + u * Math.cos(b.angle) - v * Math.sin(b.angle),
            d = b.d + u * Math.sin(b.angle) + v * Math.cos(b.angle);
          expect(d - shoreDepth("far", s)).toBeGreaterThan(0.08);
          expect(shoreDepth("near", s) - d).toBeGreaterThan(0.08);
        }
    });
    expect(trafficGap,closest).toBeGreaterThan(0.08);
  });
  it("bobs rendered moored boats and their crews, follows the ropes, and freezes on pause", () => {
    const study = createBridgeStudy(0),
      boats = study.group.children.filter((n) => n.name === "moored-boat"),
      ropes = study.group.children.filter(
        (n) => n.name === "mooring-line",
      ) as THREE.Line[];
    expect(boats).toHaveLength(4);
    expect(ropes).toHaveLength(8);
    study.update(0);
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
