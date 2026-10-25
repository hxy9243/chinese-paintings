import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { streetCoordinates } from "./helpers/streetCoordinates";
import { localClearance } from "./helpers/clearance";
import {
  BRIDGE,
  GROUND_Y,
  HALLS,
  bridgeHeight,
  onBank,
} from "../src/passageLayout";
import {
  CARTS,
  MAIN_STREET_RIDERS,
  STREET_RIDERS,
  cartPose,
  mainRiderPose,
  streetRiderPose,
} from "../src/passageLife";
import {
  ACTOR_COUNT,
  BANK_START,
  WALKER_COUNT,
  WEST_START,
  pedestrianPoses,
} from "../src/pedestrians";
import {
  RIDER_RADIUS,
  RIDER_REACH,
  STREET_OBSTACLES,
  riderDiscs,
  streetRoutes,
} from "../src/streetRoutes";
import {
  CROSSROADS_CARTS,
  CROSSROADS_CART_HALF,
  CROSSROADS_PEOPLE,
  CROSSROADS_WELL,
} from "../src/crossroads";
import {
  STATIC_OBSTACLES,
  WALKER_RADIUS,
  CART_RADIUS,
} from "../src/passageSpace";
import { createBridgeStudy } from "../src/bridgeStudy";

function hallDistance(p: { s: number; d: number }, h: (typeof HALLS)[number]) {
  const s = p.s - h.s,
    d = p.d - h.d;
  return Math.hypot(
    Math.max(0, Math.abs(s * Math.cos(h.angle) + d * Math.sin(h.angle)) - h.width / 2 - 0.2),
    Math.max(0, Math.abs(-s * Math.sin(h.angle) + d * Math.cos(h.angle)) - h.depth / 2 - 0.23),
  );
}
function boxGap(
  p: { s: number; d: number },
  s: number,
  d: number,
  angle: number,
  halfU: number,
  halfV: number,
) {
  const ds = p.s - s,
    dd = p.d - d;
  return Math.hypot(
    Math.max(0, Math.abs(ds * Math.cos(angle) + dd * Math.sin(angle)) - halfU),
    Math.max(0, Math.abs(-ds * Math.sin(angle) + dd * Math.cos(angle)) - halfV),
  );
}
const groups = [
  ["main street", 0, BANK_START],
  ["bank lanes", BANK_START, WEST_START],
  ["western streets", WEST_START, WALKER_COUNT],
  ["street riders", WALKER_COUNT, ACTOR_COUNT],
] as const;

describe("a moving crowd on the streets, the bridge and the western streets", () => {
  it("keeps every group walking at a visible pace, with nobody frozen for long", () => {
    const seed = 3;
    for (const [start, end] of [
      [0, 60],
      [240, 300],
    ]) {
      const path = new Float64Array(ACTOR_COUNT),
        stillFor = new Float64Array(ACTOR_COUNT),
        longestStill = new Float64Array(ACTOR_COUNT);
      let previous = pedestrianPoses(start, seed).map((p) => ({ ...p }));
      for (let t = start + 0.5; t <= end; t += 0.5) {
        const now = pedestrianPoses(t, seed);
        now.forEach((p, i) => {
          const step = Math.hypot(p.s - previous[i].s, p.d - previous[i].d);
          if (step < 1) path[i] += step;
          stillFor[i] = step < 0.02 ? stillFor[i] + 0.5 : 0;
          longestStill[i] = Math.max(longestStill[i], stillFor[i]);
        });
        previous = now.map((p) => ({ ...p }));
      }
      for (const [name, a, b] of groups) {
        let speed = 0;
        for (let i = a; i < b; i++) {
          speed += path[i] / (end - start);
          expect(longestStill[i], `${name} ${i} stands still`).toBeLessThan(30);
        }
        // About 0.4 to 0.6 m/s at painted scale; formerly ~0.05 on the street.
        expect(speed / (b - a), `${name} mean speed`).toBeGreaterThan(0.15);
      }
    }
  }, 60000);

  it("carries walkers up and over the bridge deck in both directions", () => {
    const seed = 5,
      half = BRIDGE.length / 2;
    const first = pedestrianPoses(0, seed).map((p) => streetCoordinates(p).u);
    const minimum = [...first],
      maximum = [...first];
    for (let t = 1; t <= 240; t += 1)
      pedestrianPoses(t, seed).forEach((p, i) => {
        if (i >= BANK_START && i < WEST_START) return;
        const c = streetCoordinates(p);
        if (c.distance > 1.2) return;
        // The deck carries walkers at its own height.
        if (Math.abs(c.u) < half - 0.3) expect(p.y).toBeCloseTo(bridgeHeight(c.u), 3);
        minimum[i] = Math.min(minimum[i], c.u);
        maximum[i] = Math.max(maximum[i], c.u);
      });
    let crossings = 0,
      westCrossings = 0;
    for (let i = 0; i < ACTOR_COUNT; i++) {
      if (i >= BANK_START && i < WEST_START) continue;
      if (minimum[i] < -half && maximum[i] > half) {
        crossings++;
        if (i >= WEST_START) westCrossings++;
      }
    }
    expect(crossings).toBeGreaterThan(30);
    // People from the western shop street also go over the bridge.
    expect(westCrossings).toBeGreaterThan(3);
    // Both directions are on the deck at once.
    const directions = pedestrianPoses(120, seed)
      .slice(0, BANK_START)
      .filter((p) => Math.abs(streetCoordinates(p).u) < half - 0.3)
      .map((p) => Math.sign(Math.cos(p.angle - BRIDGE.angle)));
    expect(directions.filter((d) => d > 0).length).toBeGreaterThan(5);
    expect(directions.filter((d) => d < 0).length).toBeGreaterThan(5);
  }, 60000);

  it("populates the western streets densely, and they stay populated", () => {
    const counts: number[] = [];
    for (const t of [0, 45, 90, 180, 360]) {
      const west = pedestrianPoses(t, 0).filter(
        (p) => p.s > -55 && p.s < -25 && Math.abs(p.d) < 23,
      );
      counts.push(
        west.length +
          CROSSROADS_PEOPLE.filter((p) => p.s > -55 && p.s < -25).length,
      );
    }
    // Formerly 42 people stood still here; now walkers fill both streets.
    for (const n of counts) expect(n).toBeGreaterThanOrEqual(60);
    expect(streetRoutes().map((r) => r.name)).toEqual([
      "west-street-to-bridge",
      "crossroads-north-south",
      "north-to-west",
      "south-to-west",
      "south-to-bridge",
    ]);
  }, 30000);

  it("keeps western walkers and riders out of roofs, trees, parked carts and each other", () => {
    let people = Infinity,
      scenery = Infinity,
      roofs = Infinity;
    for (let t = 0; t < 600; t += 0.73) {
      const poses = pedestrianPoses(t, 0);
      const walkers = poses
        .slice(0, WALKER_COUNT)
        .map((p) => ({ s: p.s, d: p.d, radius: WALKER_RADIUS }));
      const riderShapes = poses
        .slice(WALKER_COUNT)
        .map((p) => riderDiscs({ ...p, track: p.track! }));
      people = Math.min(people, localClearance(walkers));
      // A rider's two discs belong together; compare them with everyone else.
      riderShapes.forEach((own, k) => {
        const others = [...walkers, ...riderShapes.filter((_, j) => j !== k).flat()];
        for (const c of own)
          for (const o of others)
            people = Math.min(people, Math.hypot(c.s - o.s, c.d - o.d) - c.radius - o.radius);
      });
      const shapes = [...walkers, ...riderShapes.flat()];
      for (const c of shapes.slice(WEST_START)) {
        if (!onBank("near", c, 0.05)) continue; // on the main street
        for (const o of [...STATIC_OBSTACLES, ...STREET_OBSTACLES, CROSSROADS_WELL])
          scenery = Math.min(scenery, Math.hypot(c.s - o.s, c.d - o.d) - o.radius - c.radius);
        for (const [s, d, a] of CROSSROADS_CARTS)
          scenery = Math.min(
            scenery,
            boxGap(c, s, d, a, CROSSROADS_CART_HALF.length, CROSSROADS_CART_HALF.width) - c.radius,
          );
        for (const h of HALLS) roofs = Math.min(roofs, hallDistance(c, h) - c.radius);
        expect(poses[0].y).toBeGreaterThanOrEqual(GROUND_Y);
      }
    }
    expect(people, "walkers and riders").toBeGreaterThan(0.015);
    expect(scenery, "trees, stalls, carts and the well").toBeGreaterThan(0.015);
    expect(roofs, "roof envelopes").toBeGreaterThan(0.015);
  }, 60000);

  it("rides horses along the western streets and over the bridge with the cart traffic", () => {
    expect(STREET_RIDERS).toBeGreaterThanOrEqual(3);
    expect(MAIN_STREET_RIDERS).toBeGreaterThanOrEqual(3);
    const half = BRIDGE.length / 2;
    for (let i = 0; i < MAIN_STREET_RIDERS; i++) {
      let onDeck = false,
        beforeDeck = false,
        afterDeck = false;
      for (let t = 0; t < 600; t += 0.5) {
        const r = mainRiderPose(i, t),
          u = streetCoordinates(r).u;
        if (Math.abs(u) < half - 0.5) {
          onDeck = true;
          expect(r.y).toBeGreaterThan(bridgeHeight(u) - 0.01);
        }
        beforeDeck ||= u < -half;
        afterDeck ||= u > half;
        const footprint = riderDiscs({ ...r, track: r.angle });
        // Riders keep clear of every cart on the shared conveyor.
        for (let k = 0; k < CARTS.length; k++)
          expect(
            Math.hypot(r.s - cartPose(k, t).s, r.d - cartPose(k, t).d),
          ).toBeGreaterThan(CART_RADIUS + RIDER_REACH + RIDER_RADIUS);
        // And from the walkers, whose lanes clear the cart envelope.
        if (t % 5 === 0)
          for (const p of pedestrianPoses(t, 0))
            for (const c of footprint)
              expect(Math.hypot(p.s - c.s, p.d - c.d)).toBeGreaterThan(
                c.radius + WALKER_RADIUS,
              );
      }
      expect(onDeck && beforeDeck && afterDeck, `rider ${i} crosses`).toBe(true);
    }
    for (let i = 0; i < STREET_RIDERS; i++) {
      let travelled = 0,
        west = false;
      let previous = streetRiderPose(i, 0, 0);
      for (let t = 0.5; t < 300; t += 0.5) {
        const r = streetRiderPose(i, t, 0),
          step = Math.hypot(r.s - previous.s, r.d - previous.d);
        if (step < 1) travelled += step;
        west ||= r.s < -30 && Math.abs(r.d) < 23;
        expect(r.y).toBe(GROUND_Y);
        previous = { ...r };
      }
      expect(west).toBe(true);
      expect(travelled / 300, `street rider ${i}`).toBeGreaterThan(0.12);
    }
  }, 60000);

  it("renders mounted riders on horses that move with their poses", () => {
    const study = createBridgeStudy(0);
    const horses: THREE.Object3D[] = [],
      riders: THREE.Object3D[] = [];
    study.group.traverse((n) => {
      if (n.name === "riding-horse") horses.push(n);
      if (n.name === "horse-rider") riders.push(n);
    });
    expect(horses).toHaveLength(MAIN_STREET_RIDERS + STREET_RIDERS);
    expect(riders).toHaveLength(horses.length);
    riders.forEach((r) => expect(horses).toContain(r.parent));
    for (const h of horses) expect(h.getObjectByName("horse-leg")).toBeDefined();
    study.update(0);
    const before = horses.map((h) => h.position.clone()),
      furthest = horses.map(() => 0);
    for (let t = 10; t <= 60; t += 10) {
      study.update(t);
      horses.forEach((h, i) => {
        furthest[i] = Math.max(furthest[i], h.position.distanceTo(before[i]));
      });
    }
    furthest.forEach((f, i) => expect(f, `horse ${i}`).toBeGreaterThan(1));
    expect(study.metadata().streetLife.riders).toBe(horses.length);
    study.group.traverse((n) => {
      if (n instanceof THREE.Mesh || n instanceof THREE.Line) n.geometry.dispose();
    });
  }, 30000);
});
