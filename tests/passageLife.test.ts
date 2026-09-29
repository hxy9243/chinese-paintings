import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  BOATS,
  BRIDGE,
  HALLS,
  GROUND_Y,
  onBank,
  shoreDepth,
} from "../src/passageLayout";
import {
  BUILDING_KINDS,
  NATURE,
  WALKER_COUNT,
  BRIDGE_WALKERS,
  boatPose,
  walkPose,
  insideRoof,
  riverRipple,
  RIPPLE_COUNT,
} from "../src/passageLife";
import { createBridgeStudy } from "../src/bridgeStudy";

describe("life in the reference passage", () => {
  it("varies architecture and nature while keeping planting clear of roofs", () => {
    expect(BUILDING_KINDS).toHaveLength(HALLS.length);
    expect(new Set(BUILDING_KINDS).size).toBe(5);
    expect(new Set(NATURE.map((n) => n.kind)).size).toBe(5);
    for (const n of NATURE) {
      expect(onBank("near", n) || onBank("far", n)).toBe(true);
      expect(insideRoof(n, 0.1)).toBe(false);
    }
  });
  it("keeps all 36 walkers on the bridge or dry, unobstructed bank lanes", () => {
    expect(WALKER_COUNT).toBe(36);
    for (let t = 0; t <= 400; t += 2.5)
      for (let i = 0; i < WALKER_COUNT; i++) {
        const p = walkPose(i, t);
        expect(insideRoof(p, 0.06), `walker ${i} at ${t}`).toBe(false);
        if (i >= BRIDGE_WALKERS) {
          expect(onBank(i % 2 ? "far" : "near", p, 0.05)).toBe(true);
          expect(p.y).toBe(GROUND_Y);
        } else {
          const s = p.s - BRIDGE.center.s,
            d = p.d - BRIDGE.center.d;
          expect(
            Math.abs(-s * Math.sin(BRIDGE.angle) + d * Math.cos(BRIDGE.angle)),
          ).toBeLessThan(BRIDGE.width / 2 - 0.1);
          expect(p.y).toBeGreaterThanOrEqual(GROUND_Y);
        }
      }
  });
  it("keeps drifting and rocking hulls in the water throughout their cycles", () => {
    for (let t = 0; t <= 360; t += 3)
      for (let i = 0; i < BOATS.length; i++) {
        const b = BOATS[i],
          p = boatPose(i, t);
        for (let j = 0; j <= 12; j++)
          for (const side of [-1, 1]) {
            const u = (j / 12 - 0.5) * b.length,
              v = side * (b.width * 0.66 + 0.03);
            const s = p.s + u * Math.cos(p.angle) - v * Math.sin(p.angle),
              d = p.d + u * Math.sin(p.angle) + v * Math.cos(p.angle);
            expect(d, `boat ${i} at ${t}`).toBeGreaterThan(
              shoreDepth("far", s),
            );
            expect(d, `boat ${i} at ${t}`).toBeLessThan(shoreDepth("near", s));
          }
      }
  });
  it("keeps ripple strokes inside the channel", () => {
    for (let t = 0; t < 30; t += 2)
      for (let i = 0; i < RIPPLE_COUNT; i++) {
        const r = riverRipple(i, t);
        for (const end of [0, 1]) {
          const s = r.s + end * r.length,
            far = shoreDepth("far", s),
            near = shoreDepth("near", s);
          const d = far + (near - far) * r.fraction;
          expect(d - 0.025).toBeGreaterThan(far);
          expect(d + 0.025).toBeLessThan(near);
        }
      }
  });
  it("moves the rendered boats, walking legs and water without rebuilding geometry", () => {
    const study = createBridgeStudy();
    const boats = study.group.children.filter((n) => n.name === "working-boat");
    const people = study.group.children.filter(
      (n) => n.name === "walking-person",
    );
    const ripples = study.group.getObjectByName(
      "river-ripples",
    ) as THREE.LineSegments;
    expect(boats).toHaveLength(5);
    expect(people).toHaveLength(WALKER_COUNT);
    const geometry = ripples.geometry;
    // Boat batches must retain local coordinates; baking the world transform
    // would apply their river position a second time during animation.
    for (const [i, boat] of boats.entries()) {
      for (const child of boat.children) {
        if (!(child instanceof THREE.Mesh || child instanceof THREE.Line))
          continue;
        child.geometry.computeBoundingBox();
        const bounds = child.geometry.boundingBox!;
        expect(
          Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)),
        ).toBeLessThan(BOATS[i].width * 1.3 + 0.1);
        expect(
          Math.max(Math.abs(bounds.min.z), Math.abs(bounds.max.z)),
        ).toBeLessThan(BOATS[i].length * 0.7);
      }
    }
    study.update(0);
    study.group.updateMatrixWorld(true);
    const positions = boats.map((b) => b.position.clone());
    const water = Array.from(geometry.getAttribute("position").array);
    const stride = people[0].getObjectByName("left-leg")!.rotation.x;
    study.update(12);
    expect(
      boats.every((b, i) => b.position.distanceTo(positions[i]) > 0.005),
    ).toBe(true);
    expect(people[0].getObjectByName("left-leg")!.rotation.x).not.toBe(stride);
    expect(Array.from(geometry.getAttribute("position").array)).not.toEqual(
      water,
    );
    expect(ripples.geometry).toBe(geometry);
    // Reusing the same animation time is how Pause and reduced motion freeze life.
    const paused = people.map((p) => p.position.toArray());
    study.update(12);
    expect(people.map((p) => p.position.toArray())).toEqual(paused);
    let draws = 0;
    study.group.traverse((n) => {
      if (n instanceof THREE.Mesh || n instanceof THREE.Line) {
        draws++;
        n.geometry.computeBoundingBox();
        expect(Number.isFinite(n.geometry.boundingBox!.min.x)).toBe(true);
        n.geometry.dispose();
      }
    });
    expect(draws).toBeLessThan(450);
  });
});
