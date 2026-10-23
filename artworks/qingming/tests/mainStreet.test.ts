import { streetCoordinates } from "./helpers/streetCoordinates";
import { STREET_ROAD_SEGMENTS } from "../src/roadSurface";
import { describe, it, expect } from "vitest";
import {
  BRIDGE,
  BRIDGE_SHOPS,
  HALLS,
  roofFootprint,
  bridgeHeight,
  streetAngle,
} from "../src/passageLayout";
import {
  MAIN_STREET,
  STREET_HALF_WIDTH,
  STATIC_OBSTACLES,
  segmentDistance,
  streetDistance,
} from "../src/passageSpace";
import {
  CARTS,
  cartPose,
  MARKET,
  SHOP_VISITORS,
  shopperPose,
} from "../src/passageLife";

describe("bridge market street", () => {
  it("continues the bridge axis through unobstructed streets on both banks", () => {
    for (const h of HALLS) {
      const corners = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([x, z]) => {
        const u = (x * h.width) / 2,
          v = (z * h.depth) / 2;
        return {
          s: h.s + u * Math.cos(h.angle) - v * Math.sin(h.angle),
          d: h.d + u * Math.sin(h.angle) + v * Math.cos(h.angle),
        };
      });
      const edges = corners.map((a, i) => ({ a, b: corners[(i + 1) % 4] }));
      for (const road of STREET_ROAD_SEGMENTS) {
        let clearance = Infinity;
        for (const wall of edges) {
          const cross = (
            a: typeof wall.a,
            b: typeof wall.a,
            c: typeof wall.a,
          ) => (b.s - a.s) * (c.d - a.d) - (b.d - a.d) * (c.s - a.s);
          const intersects =
            cross(wall.a, wall.b, road.a) * cross(wall.a, wall.b, road.b) <=
              0 &&
            cross(road.a, road.b, wall.a) * cross(road.a, road.b, wall.b) <=
              0 &&
            Math.max(
              Math.min(wall.a.s, wall.b.s),
              Math.min(road.a.s, road.b.s),
            ) <=
              Math.min(
                Math.max(wall.a.s, wall.b.s),
                Math.max(road.a.s, road.b.s),
              ) &&
            Math.max(
              Math.min(wall.a.d, wall.b.d),
              Math.min(road.a.d, road.b.d),
            ) <=
              Math.min(
                Math.max(wall.a.d, wall.b.d),
                Math.max(road.a.d, road.b.d),
              );
          clearance = Math.min(
            clearance,
            intersects
              ? 0
              : Math.min(
                  segmentDistance(wall.a, road),
                  segmentDistance(wall.b, road),
                  segmentDistance(road.a, wall),
                  segmentDistance(road.b, wall),
                ),
          );
        }
        expect(clearance, `hall ${h.s},${h.d}`).toBeGreaterThan(
          road.width + 0.08,
        );
      }
    }
    for (const p of STATIC_OBSTACLES)
      expect(streetDistance(p) - p.radius).toBeGreaterThan(
        (p.kind === "shopper" ? 1.1 : STREET_HALF_WIDTH) + 0.07,
      );
    for (const p of [BRIDGE.near, BRIDGE.far])
      expect(streetDistance(p)).toBeLessThan(0.001);
  });
  it("takes every one-way cart along that street and over the bridge deck", () => {
    for (let i = 0; i < CARTS.length; i++) {
      let near = false,
        far = false,
        bridge = false;
      for (let t = 0; t < 510; t += 0.5) {
        const p = cartPose(i, t);
        expect(streetDistance(p)).toBeLessThan(0.001);
        expect(p.angle).toBeCloseTo(streetAngle(streetCoordinates(p).u), 2);
        const x = streetCoordinates(p).u;
        near ||= x < -BRIDGE.length / 2;
        far ||= x > BRIDGE.length / 2;
        bridge ||= Math.abs(x) < 0.5;
        expect(p.y).toBeGreaterThanOrEqual(bridgeHeight(x));
      }
      expect(near && far && bridge).toBe(true);
    }
  });
  it("adds market clusters beside the street with shoppers who both linger and move", () => {
    expect(MARKET.length + BRIDGE_SHOPS.length).toBeGreaterThanOrEqual(40);
    for (const shop of BRIDGE_SHOPS) {
      expect(Math.abs(shop.lateral) - shop.depth / 2).toBeGreaterThan(1.5);
      expect(Math.abs(shop.x) + shop.width / 2).toBeLessThan(BRIDGE.length / 2);
    }
    expect(SHOP_VISITORS.length).toBeGreaterThanOrEqual(85);
    expect(
      MARKET.filter((p) => streetDistance(p) < 5.5).length,
    ).toBeGreaterThanOrEqual(18);
    expect(
      MARKET.filter(
        (_, shop) => SHOP_VISITORS.filter((p) => p.shop === shop).length >= 3,
      ).length,
    ).toBeGreaterThanOrEqual(10);
    expect(
      SHOP_VISITORS.filter((p) => streetDistance(p) < 5.5).length,
    ).toBeGreaterThanOrEqual(30);
    SHOP_VISITORS.forEach((_, i) => {
      let stopped = false,
        moving = false;
      for (let t = 0; t < 40; t += 0.5) {
        const p = shopperPose(i, t);
        stopped ||= !p.moving;
        moving ||= p.moving;
      }
      expect(stopped && moving).toBe(true);
    });
  });
});
