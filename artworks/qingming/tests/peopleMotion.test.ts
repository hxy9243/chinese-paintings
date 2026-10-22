import {localClearance} from "./helpers/clearance";
import { describe, it, expect } from "vitest";
import * as THREE from "three";
import { activityClock } from "../src/peopleMotion";
import { createBridgeStudy } from "../src/bridgeStudy";
import {
  WALKER_COUNT,
  BRIDGE_OBSERVERS,
  CARTS,
  STATIC_PEOPLE,
  SHOP_VISITORS,
  SHOPPER_SPACE,
  MARKET,
  RESIDENT_SPACE,
  residentPose,
  shopperPose,
  observerPose,
  walkPose,
  cartPose,
  boatPose,
} from "../src/passageLife";
import { WALKER_RADIUS, STATIC_OBSTACLES, distance } from "../src/passageSpace";
import { MOORED_BOATS } from "../src/moorings";
import { BOATS, BRIDGE } from "../src/passageLayout";

describe("independent activity and browsing", () => {
  it("gives every walker repeatable pauses followed by movement, without synchronized stops", () => {
    for (const seed of [0, 7, 99]) {
      const states = new Set<string>();
      for (let i = 0; i < WALKER_COUNT; i++) {
        let paused = false,
          resumed = false;
        for (let t = 0; t < 90; t += 0.25) {
          const a = activityClock(i, t, seed),
            b = activityClock(i, t + 0.01, seed);
          if (!a.moving && !b.moving) {
            paused = true;
            expect(b.progress).toBe(a.progress);
          }
          if (paused && a.moving) resumed = true;
          expect(b.progress - a.progress).toBeGreaterThanOrEqual(0);
          expect(b.progress - a.progress).toBeLessThan(0.013);
          expect(a).toEqual(activityClock(i, t, seed));
        }
        expect(paused && resumed).toBe(true);
        states.add(
          Array.from({ length: 18 }, (_, t) =>
            activityClock(i, t, seed).moving ? "1" : "0",
          ).join(""),
        );
      }
      expect(states.size).toBeGreaterThan(20);
    }
  });
  it("adds populated stands and keeps every local wander inside its reserved clear space", () => {
    expect(MARKET.length).toBeGreaterThanOrEqual(16);
    expect(SHOP_VISITORS.length).toBeGreaterThanOrEqual(20);
    expect(STATIC_PEOPLE.length + SHOP_VISITORS.length).toBeGreaterThanOrEqual(
      50,
    );
    for (const [homes, pose] of [
      [STATIC_PEOPLE, residentPose],
      [SHOP_VISITORS, shopperPose],
    ] as const) {
      homes.forEach((home, i) => {
        let paused = false,
          moving = false;
        for (const seed of [0, 7, 99])
          for (let t = 0; t < 200; t += 0.83) {
            const p = pose(i, t, seed);
            paused ||= !p.moving;
            moving ||= p.moving;
            expect(distance(home, p) + WALKER_RADIUS + 0.02).toBeLessThan(
              RESIDENT_SPACE,
            );
          }
        expect(paused && moving).toBe(true);
        const own = STATIC_OBSTACLES.find(
          (o) => o.s === home.s && o.d === home.d,
        )!;
        expect(own.radius).toBe(
          homes === SHOP_VISITORS ? SHOPPER_SPACE : RESIDENT_SPACE,
        );
      });
    }
  });
  it("keeps independently pausing walkers and moving bridge observers apart across schedules", () => {
    let minimum = Infinity;
    for (const seed of [0, 7, 99])
      for (let t = 0; t < 1200; t += 0.71) {
        const people = Array.from({ length: WALKER_COUNT }, (_, i) =>
          walkPose(i, t, seed),
        );
        people.push(
          ...Array.from({ length: BRIDGE_OBSERVERS }, (_, i) => observerPose(i, t, seed)),
        );
        minimum=Math.min(minimum,localClearance(people.map(p=>({...p,radius:WALKER_RADIUS}))));
      }
    expect(minimum).toBeGreaterThan(0.02);
  }, 60000); // Three 20-minute fixed-step crowd simulations.
  it("keeps carts facing forward, wraps offstage, and brings simultaneous opposing boats", () => {
    for (let i = 0; i < 6; i++)
      for (let t = 0; t < 800; t += 0.7) {
        const a = cartPose(i, t),
          b = cartPose(i, t + 0.7);
        expect(a.angle).toBe(BRIDGE.angle);
        expect(a.turning).toBe(false);
        if (b.s < a.s) {
          expect(Math.abs(a.d)).toBeGreaterThan(19);
          expect(Math.abs(b.d)).toBeGreaterThan(19);
        }
      }
    let passes = 0;
    for (let t = 0; t < 500; t += 2) {
      const ships = BOATS.map((_, i) => boatPose(i, t));
      if (
        ships.some((p) => Math.cos(p.angle) > .7 && p.s > -10 && p.s < 20) &&
        ships.some((p) => Math.cos(p.angle) < -.7 && p.s > -10 && p.s < 20)
      )
        passes++;
    }
    expect(passes).toBeGreaterThan(100);
  });
  it("animates every rendered role, shares crowd geometry, and freezes every instance on pause", () => {
    const study = createBridgeStudy(7);
    const names = [
      "walking-person",
      "resident-person",
      "bridge-observer",
      "shop-visitor",
      "boat-crew",
      "cart-driver",
      "market-vendor",
    ];
    const actors: THREE.Object3D[] = [];
    study.group.traverse((n) => {
      if (names.includes(n.name)) actors.push(n);
    });
    expect(new Set(actors.map((a) => a.name)).size).toBe(7);
    expect(actors.length).toBe(
      WALKER_COUNT +
        STATIC_PEOPLE.length +
        BRIDGE_OBSERVERS +
        MARKET.length +
        SHOP_VISITORS.length +
        study.metadata().boatCrews.reduce((n,b)=>n+b.count,0) +
        CARTS.length,
    );
    const snapshots = () =>
      actors.map((a) => [...a.position.toArray(), ...a.quaternion.toArray()]);
    const matrices = () => {
      const data: number[][] = [];
      study.group.traverse((n) => {
        if (n instanceof THREE.Mesh || n instanceof THREE.Line) {
          const a = n.geometry.getAttribute("crowdMatrix");
          if (a && (n.geometry as THREE.InstancedBufferGeometry).instanceCount>0) data.push(Array.from(a.array));
        }
      });
      return data;
    };
    study.update(0);
    const initial = snapshots(),
      before = matrices();
    study.update(12);
    const later = snapshots(),
      after = matrices();
    expect(
      later.every((a, i) => a.some((value, j) => value !== initial[i][j])),
    ).toBe(true);
    expect(after).not.toEqual(before);
    // Twelve types with articulated heads and arms remain instanced.
    expect(after.length).toBeLessThan(360);
    study.update(12);
    expect(snapshots()).toEqual(later);
    expect(matrices()).toEqual(after);
    study.group.traverse((n) => {
      if (n instanceof THREE.Mesh || n instanceof THREE.Line)
        n.geometry.dispose();
    });
  });
});
