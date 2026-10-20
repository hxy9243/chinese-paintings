import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  BRIDGE,
  BOATS,
  HALLS,
  bridgeHeight,
  shoreDepth,
} from "../src/passageLayout";
import {
  WALKER_COUNT,
  BRIDGE_OBSERVERS,
  BRIDGE_WALKERS,
  walkPose,
  cartPose,
  boatPose,
  CARTS,
  NATURE,
  FEATURE_TREES,
  MARKET,
  observerPose,
} from "../src/passageLife";
import {
  CART_RADIUS,
  PERSON_RADIUS,
  CART_LANE_RADIUS,
  WALKER_RADIUS,
  STATIC_OBSTACLES,
} from "../src/passageSpace";
import { REFERENCE_AZIMUTH } from "../src/scrollLayout";
import { createBridgeStudy } from "../src/bridgeStudy";

const distance = (a: { s: number; d: number }, b: { s: number; d: number }) =>
  Math.hypot(a.s - b.s, a.d - b.d);
function hallDistance(p: { s: number; d: number }, h: (typeof HALLS)[number]) {
  const s = p.s - h.s,
    d = p.d - h.d;
  return Math.hypot(
    Math.max(
      0,
      Math.abs(s * Math.cos(h.angle) + d * Math.sin(h.angle)) -
        h.width / 2 -
        0.2,
    ),
    Math.max(
      0,
      Math.abs(-s * Math.sin(h.angle) + d * Math.cos(h.angle)) -
        h.depth / 2 -
        0.23,
    ),
  );
}
function cartGap(
  cart: { s: number; d: number; angle: number },
  p: { s: number; d: number },
) {
  const ds = p.s - cart.s,
    dd = p.d - cart.d;
  return Math.hypot(
    Math.max(
      0,
      Math.abs(ds * Math.cos(cart.angle) + dd * Math.sin(cart.angle)) - 1.35,
    ),
    Math.max(
      0,
      Math.abs(-ds * Math.sin(cart.angle) + dd * Math.cos(cart.angle)) - 0.32,
    ),
  );
}
describe("shared space and continuous traffic", () => {
  it("retains eight varied traffic slots, market activity and reference groves", () => {
    expect(CARTS).toHaveLength(8);
    expect(MARKET.length).toBeGreaterThanOrEqual(6);
    expect(
      NATURE.filter((n) => ["bare", "spring", "willow"].includes(n.kind))
        .length + FEATURE_TREES.length,
    ).toBeGreaterThanOrEqual(18);
    for (let i = 0; i < CARTS.length; i++)
      expect(distance(cartPose(i, 0), cartPose(i, 3))).toBeGreaterThan(0.1);
  });
  it("keeps people and horse carts separated from one another and every registered obstacle", () => {
    let minPeople = Infinity,
      minCarts = Infinity,
      minStatic = Infinity,
      minRoof = Infinity;
    for (let time = 0; time < 1200; time += 0.47) {
      const walkers = Array.from({ length: WALKER_COUNT }, (_, i) => ({
        ...walkPose(i, time),
        radius: WALKER_RADIUS,
      }));
      const carts = CARTS.map((_, i) => ({
        ...cartPose(i, time),
        radius: CART_LANE_RADIUS,
      }));
      for (let i = 0; i < walkers.length; i++)
        for (let j = i + 1; j < walkers.length; j++) {
          const a = walkers[i],
            b = walkers[j];
          // Bridge and bank walkers use physically disjoint routes, including their approaches.
          minPeople = Math.min(minPeople, distance(a, b) - a.radius - b.radius);
        }
      for (const walker of walkers.slice(0, BRIDGE_WALKERS))
        for (let i = 0; i < BRIDGE_OBSERVERS; i++) {
          const observer = observerPose(i, time);
          minPeople = Math.min(
            minPeople,
            distance(walker, observer) - WALKER_RADIUS - PERSON_RADIUS,
          );
        }
      for (let i = 0; i < carts.length; i++) {
        for (const person of walkers.filter((p) => Math.abs(p.d) < 14.3))
          minCarts = Math.min(
            minCarts,
            cartGap(carts[i], person) - WALKER_RADIUS,
          );
        for (let j = i + 1; j < carts.length; j++)
          minCarts = Math.min(
            minCarts,
            distance(carts[i], carts[j]) - 2 * CART_RADIUS,
          );
      }
      for (const p of [...walkers.slice(BRIDGE_WALKERS), ...carts]) {
        for (const obstacle of STATIC_OBSTACLES)
          minStatic = Math.min(
            minStatic,
            p.radius === CART_LANE_RADIUS
              ? cartGap(p as (typeof carts)[number], obstacle) - obstacle.radius
              : distance(p, obstacle) - p.radius - obstacle.radius,
          );
        for (const h of HALLS)
          if (p.radius === CART_LANE_RADIUS) {
            for (let x = -1.35; x <= 1.351; x += 0.135)
              for (const d of [-0.32, 0.32])
                minRoof = Math.min(
                  minRoof,
                  hallDistance(
                    {
                      s:
                        p.s +
                        x * Math.cos(BRIDGE.angle) -
                        d * Math.sin(BRIDGE.angle),
                      d:
                        p.d +
                        x * Math.sin(BRIDGE.angle) +
                        d * Math.cos(BRIDGE.angle),
                    },
                    h,
                  ),
                );
          } else minRoof = Math.min(minRoof, hallDistance(p, h) - p.radius);
      }
    }
    expect(minPeople, "walking lanes").toBeGreaterThan(0.015);
    expect(minCarts, "cart and pedestrian routes").toBeGreaterThan(0.015);
    expect(
      minStatic,
      "traffic versus trees, stalls and posed people",
    ).toBeGreaterThan(0.015);
    expect(minRoof, "traffic versus roof envelopes").toBeGreaterThan(0.015);
  }, 40000); // The 20-minute sweep now covers the denser bridge/approach crowd.
  it("keeps placed props separate and out of roofs", () => {
    for (let i = 0; i < STATIC_OBSTACLES.length; i++) {
      const a = STATIC_OBSTACLES[i];
      for (const h of HALLS)
        expect(
          hallDistance(a, h),
          `${a.kind} near hall ${h.s}`,
        ).toBeGreaterThan(a.radius);
      for (let j = i + 1; j < STATIC_OBSTACLES.length; j++) {
        const b = STATIC_OBSTACLES[j];
        expect(distance(a, b), `${a.kind}/${b.kind}`).toBeGreaterThan(
          a.radius + b.radius,
        );
      }
    }
  });
  it("gives full hulls and lowered masts clearance through bends and beneath the arch", () => {
    let bankGap = Infinity,
      boatGap = Infinity,
      archGap = Infinity;
    for (let t = 0; t < 1400; t += 1.37) {
      const poses = BOATS.map((_, i) => boatPose(i, t));
      for (let i = 0; i < BOATS.length; i++) {
        const p = poses[i],
          b = BOATS[i];
        for (let j = i + 1; j < BOATS.length; j++)
          boatGap = Math.min(
            boatGap,
            Math.max(
              Math.abs(p.s - poses[j].s) - 0.62 * (b.length + BOATS[j].length),
              Math.abs(p.d - poses[j].d) -
                0.7 * (b.width + BOATS[j].width) -
                0.08,
            ),
          );
        for (let x = -1; x <= 1.001; x += 0.1)
          for (const side of [-1, 1]) {
            const s = p.s + x * b.length * 0.62,
              d = p.d + side * (b.width * 0.7 + 0.04);
            bankGap = Math.min(
              bankGap,
              d - shoreDepth("far", s),
              shoreDepth("near", s) - d,
            );
            const u =
              (s - BRIDGE.center.s) * Math.cos(BRIDGE.angle) +
              (d - BRIDGE.center.d) * Math.sin(BRIDGE.angle);
            const v =
              -(s - BRIDGE.center.s) * Math.sin(BRIDGE.angle) +
              (d - BRIDGE.center.d) * Math.cos(BRIDGE.angle);
            if (Math.abs(v) < BRIDGE.width / 2 + 0.2)
              archGap = Math.min(archGap, bridgeHeight(u) - 0.48 - 1.15);
          }
      }
    }
    expect(bankGap).toBeGreaterThan(0.02);
    expect(boatGap).toBeGreaterThan(0.05);
    expect(archGap).toBeGreaterThan(0.05);
  });
  it("animates the actual horse legs and wheels, preserves their footprints, and freezes on pause", () => {
    const study = createBridgeStudy();
    const carts = study.group.children.filter((n) => n.name === "horse-cart");
    expect(carts).toHaveLength(8);
    study.update(0);
    const start = carts.map((c) => c.position.clone());
    const leg = carts[0].getObjectByName("horse-leg")!,
      wheel = carts[0].getObjectByName("cart-wheel")!;
    const before = [leg.rotation.z, wheel.rotation.z];
    study.update(3);
    expect(carts.every((c, i) => c.position.distanceTo(start[i]) > 0.1)).toBe(
      true,
    );
    expect(leg.rotation.z).not.toBe(before[0]);
    expect(wheel.rotation.z).not.toBe(before[1]);
    const paused = carts.map((c) => [
      ...c.position.toArray(),
      ...c.quaternion.toArray(),
      c.getObjectByName("horse-leg")?.rotation.z,
      c.getObjectByName("cart-wheel")?.rotation.z,
    ]);
    study.update(3);
    expect(
      carts.map((c) => [
        ...c.position.toArray(),
        ...c.quaternion.toArray(),
        c.getObjectByName("horse-leg")?.rotation.z,
        c.getObjectByName("cart-wheel")?.rotation.z,
      ]),
    ).toEqual(paused);
    let maxRadius = 0,
      minY = Infinity;
    for (let t = 0; t < 36; t += 1.1) {
      study.update(t);
      study.group.updateMatrixWorld(true);
      for (const cart of carts)
        cart.traverse((n) => {
          if (!(n instanceof THREE.Mesh || n instanceof THREE.Line)) return;
          const attr = n.geometry.getAttribute("position"),
            v = new THREE.Vector3();
          for (let i = 0; i < attr.count; i += 7) {
            v.fromBufferAttribute(attr, i).applyMatrix4(n.matrixWorld);
            const s =
                v.x * Math.cos(REFERENCE_AZIMUTH) -
                v.z * Math.sin(REFERENCE_AZIMUTH),
              d =
                v.x * Math.sin(REFERENCE_AZIMUTH) +
                v.z * Math.cos(REFERENCE_AZIMUTH);
            const along =
              (s - BRIDGE.center.s) * Math.cos(BRIDGE.angle) +
              (d - BRIDGE.center.d) * Math.sin(BRIDGE.angle);
            minY = Math.min(minY, v.y - bridgeHeight(along));
            v.sub(cart.position);
            maxRadius = Math.max(maxRadius, Math.hypot(v.x, v.z));
          }
        });
    }
    expect(maxRadius).toBeLessThan(CART_RADIUS);
    expect(minY).toBeGreaterThan(-0.025);
    study.group.traverse((n) => {
      if (n instanceof THREE.Mesh || n instanceof THREE.Line)
        n.geometry.dispose();
    });
  });
});
