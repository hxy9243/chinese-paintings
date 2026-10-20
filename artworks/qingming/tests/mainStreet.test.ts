import { describe, it, expect } from "vitest";
import {
  BRIDGE,
  BRIDGE_SHOPS,
  HALLS,
  roofFootprint,
  bridgeHeight,
} from "../src/passageLayout";
import {
  MAIN_STREET,
  STREET_HALF_WIDTH,
  STATIC_OBSTACLES,
  segmentDistance,
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
    for (const h of HALLS)
      for (const p of roofFootprint(h))
        expect(segmentDistance(p, MAIN_STREET)).toBeGreaterThan(
          STREET_HALF_WIDTH + 0.08,
        );
    for (const p of STATIC_OBSTACLES)
      expect(segmentDistance(p, MAIN_STREET) - p.radius).toBeGreaterThan(
        (p.kind === "shopper" ? 1.1 : STREET_HALF_WIDTH) + 0.07,
      );
    for (const p of [BRIDGE.near, BRIDGE.far])
      expect(segmentDistance(p, MAIN_STREET)).toBeLessThan(0.001);
  });
  it("takes every one-way cart along that street and over the bridge deck", () => {
    for (let i = 0; i < CARTS.length; i++) {
      let near = false,
        far = false,
        bridge = false;
      for (let t = 0; t < 300; t += 0.5) {
        const p = cartPose(i, t);
        expect(segmentDistance(p, MAIN_STREET)).toBeLessThan(0.001);
        expect(p.angle).toBe(BRIDGE.angle);
        const x =
          (p.s - BRIDGE.center.s) * Math.cos(BRIDGE.angle) +
          (p.d - BRIDGE.center.d) * Math.sin(BRIDGE.angle);
        near ||= x < -BRIDGE.length / 2;
        far ||= x > BRIDGE.length / 2;
        bridge ||= Math.abs(x) < 0.5;
        expect(p.y).toBeGreaterThanOrEqual(bridgeHeight(x));
      }
      expect(near && far && bridge).toBe(true);
    }
  });
  it("adds market clusters beside the street with shoppers who both linger and move", () => {
    expect(MARKET.length+BRIDGE_SHOPS.length).toBeGreaterThanOrEqual(40);
    for(const shop of BRIDGE_SHOPS) {
      expect(Math.abs(shop.lateral)-shop.depth/2).toBeGreaterThan(1.5);
      expect(Math.abs(shop.x)+shop.width/2).toBeLessThan(BRIDGE.length/2);
    }
    expect(SHOP_VISITORS.length).toBeGreaterThanOrEqual(85);
    expect(
      MARKET.filter((p) => segmentDistance(p, MAIN_STREET) < 5.5).length,
    ).toBeGreaterThanOrEqual(18);
    expect(
      MARKET.filter(
        (_, shop) => SHOP_VISITORS.filter((p) => p.shop === shop).length >= 3,
      ).length,
    ).toBeGreaterThanOrEqual(10);
    expect(
      SHOP_VISITORS.filter((p) => segmentDistance(p, MAIN_STREET) < 5.5).length,
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
